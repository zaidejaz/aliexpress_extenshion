// AliExpress Scraper - Background Script

// Local storage for scraped products
let scrapedProducts = [];
let isProcessing = false;
let currentStats = {
  total: 0,
  processed: 0
};

// Script version tracking
const SCRIPT_VERSION_KEY = 'contentScriptVersion';
let contentScriptVersion = '';

// Initialize by loading products and version from storage
chrome.storage.local.get(['scrapedProducts', 'stats', SCRIPT_VERSION_KEY], (result) => {
  if (result.scrapedProducts) {
    scrapedProducts = result.scrapedProducts;
  }
  if (result.stats) {
    currentStats = result.stats;
  }
  if (result[SCRIPT_VERSION_KEY]) {
    contentScriptVersion = result[SCRIPT_VERSION_KEY];
    console.log("Content script version from storage:", contentScriptVersion);
  }
});

// Check for content script updates
async function checkForScriptUpdates() {
  try {
    // Replace with your actual server endpoint that returns the current version
    const response = await fetch('https://scraper-staticfiles.vercel.app/version.json');
    if (!response.ok) {
      throw new Error('Failed to fetch script version');
    }
    
    const data = await response.json();
    const latestVersion = data.version;
    
    console.log("Current version:", contentScriptVersion, "Latest version:", latestVersion);
    
    if (latestVersion !== contentScriptVersion) {
      console.log("New content script version available:", latestVersion);
      
      // Update stored version
      contentScriptVersion = latestVersion;
      chrome.storage.local.set({ [SCRIPT_VERSION_KEY]: latestVersion });
      
      // Notify all active tabs to reload the script
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.url && (tab.url.includes('aliexpress.com') || tab.url.includes('aliexpress.us'))) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'updateContentScript',
              version: latestVersion
            }).catch(err => {
              // Tab might not have content script loaded, this is not an error
              console.log('Could not send update notification to tab', tab.id, err);
            });
          }
        });
      });
    }
  } catch (error) {
    console.error("Error checking for script updates:", error);
  }
}

// Check for updates periodically (every hour)
setInterval(checkForScriptUpdates, 60 * 60 * 1000);
// Also check on startup
checkForScriptUpdates();

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrapeProduct') {
    // Add product to storage
    const productData = message.data;
    
    // Add timestamp and ID
    const productId = Date.now().toString();
    const timestamp = new Date().toISOString();
    
    // Store product with metadata
    const storedProduct = {
      id: productId,
      timestamp: timestamp,
      url: message.url,
      data: productData
    };
    
    // Add to local storage array
    scrapedProducts.push(storedProduct);
    
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
      productId: productId 
    });
    return true; // Keep the message channel open for async response
  }
  
  else if (message.action === 'contentScriptLoaded') {
    console.log("Content script load status:", message.success ? "Success" : "Failed");
    
    // You can add logging or other processing here if needed
    // For example, track successful loads or capture error information
    
    // No response needed
    return false;
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
    // Send all products data for downloading
    sendResponse({ 
      success: true, 
      products: scrapedProducts 
    });
    return true;
  }
  
  else if (message.action === 'checkForUpdates') {
    // Manually trigger a check for content script updates
    checkForScriptUpdates()
      .then(() => {
        sendResponse({ success: true, version: contentScriptVersion });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for the async response
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