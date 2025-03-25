// AliExpress Scraper - Loader Script
// This script loads the content script from the extension's cache

(function() {
    console.log("AliExpress Scraper: Loader initialized");
    
    // Check if we're on a product page
    if (isProductPage()) {
      loadContentScript();
    } else {
      console.log("Not on a product page, no need to load scraper");
    }
    
    // Function to check if we're on a product page
    function isProductPage() {
      // Check URL patterns
      const urlPatterns = [
        /\/item\/\d+\.html/,  // Standard pattern
        /\/product\/\d+/,      // Alternative pattern
        /\/i\/\d+/             // Short pattern
      ];
      
      const currentUrl = window.location.href;
      
      // Check each pattern
      for (const pattern of urlPatterns) {
        if (pattern.test(currentUrl)) {
          console.log("Detected product page via URL pattern:", currentUrl);
          return true;
        }
      }
      
      // Additional checks for product page elements
      const productElements = [
        document.querySelector('h1[data-pl="product-title"]'),
        document.querySelector('.product-title-text'),
        document.querySelector('.price--currentPriceText--V8_y_b5'),
        document.querySelector('.product-price-value')
      ];
      
      if (productElements.some(el => el !== null)) {
        console.log("Detected product page via element check");
        return true;
      }
      
      return false;
    }
    
    // Function to load the content script from cache
    function loadContentScript() {
      console.log("Requesting content script from background script");
      
      chrome.runtime.sendMessage({ action: 'getContentScript' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error requesting content script:", chrome.runtime.lastError);
          showError("Failed to load the scraper. Please try refreshing the page.");
          return;
        }
        
        if (!response || !response.success) {
          console.error("Content script not available:", response ? response.error : "Unknown error");
          showError("Scraper is unavailable. The service may be temporarily down.");
          return;
        }
        
        // We have the script, now execute it
        try {
          console.log("Executing cached content script, last fetched:", new Date(response.lastFetch).toLocaleString());
          
          // Create script element and execute
          const scriptElement = document.createElement('script');
          scriptElement.textContent = response.script;
          scriptElement.id = 'aliexpress-scraper-content-script';
          document.head.appendChild(scriptElement);
          
          console.log("Content script executed successfully");
        } catch (error) {
          console.error("Error executing content script:", error);
          showError(`Error executing script: ${error.message}`);
        }
      });
    }
    
    // Function to show error message
    function showError(message) {
      // Only create if it doesn't exist
      if (!document.getElementById('aliexpress-scraper-error')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'aliexpress-scraper-error';
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999999; background-color: #f44336; color: white; padding: 15px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-family: Arial, sans-serif; max-width: 300px;';
        
        errorDiv.innerHTML = `
          <div style="margin-bottom: 10px; font-weight: bold;">AliExpress Scraper Error</div>
          <div id="aliexpress-scraper-error-message">${message}</div>
          <button id="aliexpress-scraper-retry" style="background-color: white; color: #f44336; border: none; padding: 5px 10px; margin-top: 10px; border-radius: 3px; cursor: pointer;">Retry</button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Add retry button event listener
        document.getElementById('aliexpress-scraper-retry').addEventListener('click', function() {
          // Remove error message
          errorDiv.remove();
          
          // Try to refresh the script and load again
          chrome.runtime.sendMessage({ action: 'refreshScript' }, () => {
            loadContentScript();
          });
        });
      } else {
        // Just update the message if the error div already exists
        document.getElementById('aliexpress-scraper-error-message').textContent = message;
      }
    }
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'scriptUnavailable') {
        showError("The scraper service is currently unavailable. Please try again later.");
      }
    });
  })();