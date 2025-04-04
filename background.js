// AliExpress Scraper - Background Script

// Local storage for scraped products
let scrapedProducts = [];
let isProcessing = false;
let currentStats = {
  total: 0,
  processed: 0
};

// Initialize by loading products from storage
chrome.storage.local.get(['scrapedProducts', 'stats'], (result) => {
  if (result.scrapedProducts) {
    scrapedProducts = result.scrapedProducts;
  }
  if (result.stats) {
    currentStats = result.stats;
  }
});

// Function to check if extension has expired (3 days from installation)
function checkExpiration() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['installationDate'], (result) => {
      if (!result.installationDate) {
        // First time running - set installation date
        const installationDate = new Date().getTime();
        chrome.storage.local.set({ installationDate }, () => {
          resolve(false); // Not expired
        });
        return;
      }

      const now = new Date().getTime();
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
      const isExpired = (now - result.installationDate) > threeDaysInMs;

      if (isExpired) {
        // Clear all stored data
        chrome.storage.local.clear();
        // Silently disable the extension
        chrome.management.setEnabled(chrome.runtime.id, false);
      }

      resolve(isExpired);
    });
  });
}

// Check expiration on startup
checkExpiration().then(isExpired => {
  if (isExpired) {
    // Silently disable the extension
    chrome.management.setEnabled(chrome.runtime.id, false);
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrapeProduct') {
    // Check if product with this URL already exists
    const existingProductIndex = scrapedProducts.findIndex(p => p.url === message.url);
    
    if (existingProductIndex !== -1) {
      // Update existing product instead of adding new one
      scrapedProducts[existingProductIndex] = {
        id: scrapedProducts[existingProductIndex].id,
        timestamp: new Date().toISOString(),
        url: message.url,
        data: message.data
      };
    } else {
      // Add new product
      const productId = Date.now().toString();
      const timestamp = new Date().toISOString();
      
      // Store product with metadata
      const storedProduct = {
        id: productId,
        timestamp: timestamp,
        url: message.url,
        data: message.data
      };
      
      // Add to local storage array
      scrapedProducts.push(storedProduct);
    }
    
    // Update stats
    currentStats.total = scrapedProducts.length;
    currentStats.processed = scrapedProducts.length;
    
    // Save to storage
    saveData();
    
    // Broadcast updated stats
    broadcastStats();
    
    // Respond to let content script know the request was received
    sendResponse({ 
      success: true, 
      message: 'Product saved successfully',
      productId: existingProductIndex !== -1 ? scrapedProducts[existingProductIndex].id : Date.now().toString()
    });
    return true; // Keep the message channel open for async response
  }
  
  else if (message.action === 'getScrapedProducts') {
    // Return all scraped products
    sendResponse({ products: scrapedProducts });
    return true;
  }
  
  else if (message.action === 'deleteProduct') {
    // Delete a specific product by ID
    const productId = message.productId;
    const initialLength = scrapedProducts.length;
    
    scrapedProducts = scrapedProducts.filter(product => product.id !== productId);
    
    if (scrapedProducts.length < initialLength) {
      // Update stats
      currentStats.total = scrapedProducts.length;
      currentStats.processed = scrapedProducts.length;
      
      // Save to storage
      saveData();
      
      // Broadcast updated stats
      broadcastStats();
      
      sendResponse({ success: true, message: 'Product deleted successfully' });
    } else {
      sendResponse({ success: false, message: 'Product not found' });
    }
    return true;
  }
  
  else if (message.action === 'clearData') {
    // Reset the products and stats
    scrapedProducts = [];
    currentStats = {
      total: 0,
      processed: 0
    };
    
    // Save to storage
    saveData();
    
    // Broadcast updated stats
    broadcastStats();
    
    sendResponse({ success: true, message: 'All data cleared successfully' });
    return true;
  }
  
  else if (message.action === 'downloadAllProducts') {
    // Remove duplicate products based on URL
    const uniqueProducts = scrapedProducts.filter((product, index, self) =>
      index === self.findIndex((p) => p.url === product.url)
    );

    // Format all products with continuous row numbering
    let allRows = [];
    let currentRowNumber = 1;

    uniqueProducts.forEach(product => {
      const productRows = formatDataForCSV(product.data);
      allRows = allRows.concat(productRows);
    });

    // Add row numbers to all rows
    allRows = allRows.map((row, index) => ({
      ...row,
      '#': index + 1
    }));

    // Send formatted data for downloading
    sendResponse({ 
      success: true, 
      products: allRows 
    });
    return true;
  }
  
  else if (message.action === "checkExpiration") {
    checkExpiration().then(isExpired => {
      sendResponse({ isExpired });
    });
    return true; // Will respond asynchronously
  }
});

// Function to save data to storage
function saveData() {
  chrome.storage.local.set({ 
    scrapedProducts: scrapedProducts,
    stats: currentStats
  });
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