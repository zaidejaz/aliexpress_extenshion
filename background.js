// AliExpress Scraper - Background Script with Remote Script Caching

// Local storage for scraped products
let scrapedProducts = [];
let isProcessing = false;
let currentStats = {
  total: 0,
  processed: 0
};

// Script caching configuration
const SCRIPT_URL = "https://scraper-staticfiles.vercel.app/content.js";
const SCRIPT_CACHE_KEY = "cachedContentScript";
const SCRIPT_LAST_FETCH_KEY = "scriptLastFetch";
const FETCH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

// Initialize by loading data from storage
chrome.storage.local.get(['scrapedProducts', 'stats', SCRIPT_CACHE_KEY, SCRIPT_LAST_FETCH_KEY], (result) => {
  if (result.scrapedProducts) {
    scrapedProducts = result.scrapedProducts;
  }
  if (result.stats) {
    currentStats = result.stats;
  }
  
  // Check if we need to fetch a fresh script
  checkAndFetchScript();
});

// Function to check if script is stale and fetch a new one if needed
async function checkAndFetchScript() {
  try {
    chrome.storage.local.get([SCRIPT_CACHE_KEY, SCRIPT_LAST_FETCH_KEY], async (result) => {
      const now = Date.now();
      const lastFetch = result[SCRIPT_LAST_FETCH_KEY] || 0;
      const scriptCache = result[SCRIPT_CACHE_KEY];
      
      // If script isn't cached or is stale, fetch a new one
      if (!scriptCache || (now - lastFetch > FETCH_INTERVAL)) {
        console.log("Fetching fresh content script from server...");
        try {
          const response = await fetch(`${SCRIPT_URL}?t=${now}`);
          
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }
          
          const script = await response.text();
          
          // Cache the script
          chrome.storage.local.set({
            [SCRIPT_CACHE_KEY]: script,
            [SCRIPT_LAST_FETCH_KEY]: now
          });
          
          console.log("Content script updated successfully");
        } catch (error) {
          console.error("Error fetching script:", error);
          
          // If we don't have a cached script and can't fetch one, show an error
          if (!scriptCache) {
            notifyScriptUnavailable();
          }
        }
      } else {
        console.log("Using cached script, last fetched:", new Date(lastFetch).toLocaleString());
      }
    });
  } catch (error) {
    console.error("Error checking script status:", error);
  }
}

// Function to notify tabs that the script is unavailable
function notifyScriptUnavailable() {
  chrome.tabs.query({
    url: [
      "*://*.aliexpress.com/item/*",
      "*://*.aliexpress.us/item/*",
      "*://*.aliexpress.com/product/*",
      "*://*.aliexpress.us/product/*",
      "*://*.aliexpress.com/i/*",
      "*://*.aliexpress.us/i/*"
    ]
  }, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'scriptUnavailable'
      }).catch(() => { /* Ignore if content script isn't loaded */ });
    });
  });
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getContentScript') {
    // Return the cached script if available
    chrome.storage.local.get([SCRIPT_CACHE_KEY, SCRIPT_LAST_FETCH_KEY], (result) => {
      if (result[SCRIPT_CACHE_KEY]) {
        sendResponse({
          success: true,
          script: result[SCRIPT_CACHE_KEY],
          lastFetch: result[SCRIPT_LAST_FETCH_KEY]
        });
      } else {
        sendResponse({
          success: false,
          error: "Script not available"
        });
      }
    });
    return true; // Keep the message channel open for async response
  }
  
  else if (message.action === 'refreshScript') {
    // Force refresh the script
    checkAndFetchScript()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.toString() 
        });
      });
    return true;
  }
  
  else if (message.action === 'scrapeProduct') {
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

// Check for script updates on extension startup and periodically
checkAndFetchScript();
setInterval(checkAndFetchScript, FETCH_INTERVAL);

// Listen for tab updates to inject the loader
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if it's an AliExpress product page
    if ((tab.url.includes('aliexpress.com') || tab.url.includes('aliexpress.us')) &&
        (tab.url.includes('/item/') || tab.url.includes('/product/') || tab.url.includes('/i/'))) {
        
      // Execute the content script loader
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['loader.js']
      }).catch(error => {
        console.error("Error injecting loader:", error);
      });
    }
  }
});