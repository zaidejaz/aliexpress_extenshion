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