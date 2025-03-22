// AliExpress Scraper - Background Script

// Queue for processing multiple products
let scrapingQueue = [];
let isProcessing = false;
let currentStats = {
  total: 0,
  processed: 0,
  remaining: 0
};

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrapeProduct') {
    // Add product to queue
    scrapingQueue.push({
      tabId: sender.tab.id,
      url: message.url,
      data: message.data
    });
    
    // Update stats
    currentStats.total = scrapingQueue.length + currentStats.processed;
    currentStats.remaining = scrapingQueue.length;
    
    // Broadcast updated stats
    broadcastStats();
    
    // Start processing queue if not already running
    if (!isProcessing) {
      processQueue();
    }
    
    // Respond to let content script know the request was received
    sendResponse({ success: true, message: 'Product added to queue' });
    return true; // Keep the message channel open for async response
  }
  
  else if (message.action === 'getSettings') {
    // Retrieve settings from storage and send to content script
    chrome.storage.sync.get([
      'googleSheetId', 
      'googleSheetName', 
      'functionType', 
      'startRow', 
      'endRow'
    ], (result) => {
      sendResponse({ settings: result });
    });
    return true; // Keep the message channel open for async response
  }
  
  else if (message.action === 'stopScraping') {
    // Clear the queue
    scrapingQueue = [];
    isProcessing = false;
    
    // Update stats
    currentStats.remaining = 0;
    broadcastStats();
    
    // Notify all tabs that scraping has stopped
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.includes('aliexpress.com') || tab.url.includes('aliexpress.us'))) {
          chrome.tabs.sendMessage(tab.id, { action: 'scrapingStopped' })
            .catch(err => console.log('Could not send message to tab', tab.id, err));
        }
      });
    });
  }
  
  else if (message.action === 'clearData') {
    // Reset the queue and stats
    scrapingQueue = [];
    isProcessing = false;
    currentStats = {
      total: 0,
      processed: 0,
      remaining: 0
    };
    
    // Save stats to storage
    chrome.storage.sync.set({ stats: currentStats });
    
    // Broadcast updated stats
    broadcastStats();
  }
});

// Function to process the scraping queue
async function processQueue() {
  if (scrapingQueue.length === 0 || isProcessing) {
    return;
  }
  
  isProcessing = true;
  
  // Get the next item in the queue
  const item = scrapingQueue.shift();
  
  try {
    // Get settings from storage
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get([
        'googleSheetId', 
        'googleSheetName'
      ], resolve);
    });
    
    if (!settings.googleSheetId || !settings.googleSheetName) {
      throw new Error('Google Sheet ID or Sheet Name not set');
    }
    
    // Attempt to get Google auth token
    const token = await getGoogleAuthToken();
    
    // Send data to Google Sheets
    const result = await sendToGoogleSheets(token, settings.googleSheetId, settings.googleSheetName, item.data);
    
    // Update tab status to "DONE"
    try {
      await chrome.tabs.sendMessage(item.tabId, { 
        action: 'updateStatus', 
        status: 'DONE',
        result: result
      });
    } catch (error) {
      console.log('Tab may be closed or unreachable', error);
    }
    
    // Update stats
    currentStats.processed++;
    currentStats.remaining = scrapingQueue.length;
    
    // Save stats to storage
    chrome.storage.sync.set({ stats: currentStats });
    
    // Broadcast updated stats
    broadcastStats();
    
  } catch (error) {
    console.error('Error processing queue item:', error);
    
    // Try to update tab status to "ERROR"
    try {
      await chrome.tabs.sendMessage(item.tabId, { 
        action: 'updateStatus', 
        status: 'ERROR',
        error: error.message
      });
    } catch (tabError) {
      console.log('Tab may be closed or unreachable', tabError);
    }
  }
  
  // Mark as no longer processing
  isProcessing = false;
  
  // Process next item if any
  if (scrapingQueue.length > 0) {
    processQueue();
  }
}

// Function to broadcast stats to all relevant tabs
function broadcastStats() {
  // Send to popup if open
  chrome.runtime.sendMessage({
    action: 'updateStats',
    stats: currentStats
  }).catch(err => {
    // Popup might not be open, this is not an error
    console.log('Could not send stats to popup', err);
  });
  
  // Send to all AliExpress tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && (tab.url.includes('aliexpress.com') || tab.url.includes('aliexpress.us'))) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateStats',
          stats: currentStats
        }).catch(err => {
          // Tab might not have content script loaded, this is not an error
          console.log('Could not send stats to tab', tab.id, err);
        });
      }
    });
  });
}

// Function to get Google Auth token
async function getGoogleAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

// Function to send data to Google Sheets
async function sendToGoogleSheets(token, sheetId, sheetName, data) {
  try {
    // Find the next available row in the sheet
    const nextRow = await findNextAvailableRow(token, sheetId, sheetName);
    
    // Prepare the data for Google Sheets
    const values = data.map(row => {
      // Convert object to array maintaining column order
      return [
        row['#'],
        row['URL'],
        row['Action'],
        row['Custom Label (SKU)'],
        row['Category ID'],
        row['Category Name'],
        row['Title'],
        row['Relationship'],
        row['Relationship details'],
        row['P:Schedule Time'],
        row['P:UPC'],
        row['P:EPID'],
        row['Price'],
        row['Quantity'],
        row['Item photo URL'],
        row['VideoID'],
        row['Condition ID'],
        row['Description'],
        row['SHIP'],
        row['TOTAL'],
        row['P:EAN'],
        row['Specifications Warning'],
        row['Product sellpoints'],
        row['multiplier'],
        row['Buy It Now price'],
        row['Ship to'],
        row['Store Name'],
        row['Store no'],
        row['Open since'],
        row['Scan date']
      ];
    });
    
    // Send the data to Google Sheets
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A${nextRow}:AD${nextRow + values.length - 1}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `${sheetName}!A${nextRow}:AD${nextRow + values.length - 1}`,
        majorDimension: 'ROWS',
        values: values
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update Google Sheet: ${errorData.error.message}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error in sendToGoogleSheets:', error);
    throw error;
  }
}

// Function to find the next available row in a Google Sheet
async function findNextAvailableRow(token, sheetId, sheetName) {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A:A`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to read Google Sheet: ${errorData.error.message}`);
    }
    
    const data = await response.json();
    const values = data.values || [];
    
    // Find the last non-empty row and return the next row number
    return values.length + 1;
  } catch (error) {
    console.error('Error finding next available row:', error);
    // Default to row 2 (assuming row 1 is headers)
    return 2;
  }
}