// AliExpress Scraper - Loader Script
// This script will dynamically load the content script from your server

(function() {
    console.log("AliExpress Scraper: Loader initialized");
    
    // Configuration - Change this to your actual server URL
    const SERVER_URL = "https://scraper-staticfiles.vercel.app/content.js";
    const FALLBACK_RETRY_DELAY = 5000; // 5 seconds
    const MAX_RETRIES = 3;
    
    // Track loading attempts
    let loadAttempts = 0;
    
    // Function to load the script from the server
    function loadContentScript() {
      console.log(`AliExpress Scraper: Attempting to load content script (Attempt ${loadAttempts + 1})`);
      
      // Create script element
      const scriptElement = document.createElement('script');
      scriptElement.src = `${SERVER_URL}?v=${Date.now()}`; // Add timestamp to prevent caching
      scriptElement.id = 'aliexpress-scraper-content-script';
      scriptElement.async = true;
      
      // Handle successful load
      scriptElement.onload = function() {
        console.log("AliExpress Scraper: Content script loaded successfully");
        // Notify the background script that the content script was loaded
        chrome.runtime.sendMessage({ action: 'contentScriptLoaded', success: true });
      };
      
      // Handle load errors
      scriptElement.onerror = function(error) {
        console.error("AliExpress Scraper: Failed to load content script", error);
        
        // Notify the background script of the failure
        chrome.runtime.sendMessage({ 
          action: 'contentScriptLoaded', 
          success: false,
          error: "Failed to load the content script" 
        });
        
        // Try again if we haven't exceeded max retries
        loadAttempts++;
        if (loadAttempts < MAX_RETRIES) {
          console.log(`AliExpress Scraper: Will retry in ${FALLBACK_RETRY_DELAY/1000} seconds`);
          setTimeout(loadContentScript, FALLBACK_RETRY_DELAY);
        } else {
          console.error("AliExpress Scraper: Maximum retry attempts reached");
          displayLoadError();
        }
      };
      
      // Add script to the page
      document.head.appendChild(scriptElement);
    }
    
    // Display error message if script fails to load
    function displayLoadError() {
      // Only create the error notification if it doesn't already exist
      if (!document.getElementById('aliexpress-scraper-error')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'aliexpress-scraper-error';
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999999; background-color: #f44336; color: white; padding: 15px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-family: Arial, sans-serif; max-width: 300px;';
        
        errorDiv.innerHTML = `
          <div style="margin-bottom: 10px; font-weight: bold;">AliExpress Scraper Error</div>
          <div>Failed to load the scraper script. Please check your internet connection or try again later.</div>
          <button id="aliexpress-scraper-retry" style="background-color: white; color: #f44336; border: none; padding: 5px 10px; margin-top: 10px; border-radius: 3px; cursor: pointer;">Retry</button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Add retry button event listener
        document.getElementById('aliexpress-scraper-retry').addEventListener('click', function() {
          document.getElementById('aliexpress-scraper-error').remove();
          loadAttempts = 0; // Reset attempts
          loadContentScript();
        });
      }
    }
    
    // Check if we're on a product page before loading the script
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
          console.log("AliExpress Scraper: Detected product page via URL pattern:", currentUrl);
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
        console.log("AliExpress Scraper: Detected product page via element check");
        return true;
      }
      
      console.log("AliExpress Scraper: Not on a product page:", currentUrl);
      return false;
    }
    
    // Initialize - Check if on product page and load script
    if (isProductPage()) {
      // Wait for the page to be fully loaded
      if (document.readyState === 'complete') {
        loadContentScript();
      } else {
        window.addEventListener('load', loadContentScript);
      }
    } else {
      console.log("AliExpress Scraper: Not loading content script - not a product page");
      
      // Set up observer for SPA navigation
      let lastUrl = window.location.href;
      const observer = new MutationObserver(() => {
        // Check if URL changed
        if (lastUrl !== window.location.href) {
          console.log("AliExpress Scraper: URL changed from", lastUrl, "to", window.location.href);
          lastUrl = window.location.href;
          
          // If we're now on a product page, load the content script
          if (isProductPage() && !document.getElementById('aliexpress-scraper-content-script')) {
            loadContentScript();
          }
        }
      });
      
      // Start observing
      observer.observe(document, { subtree: true, childList: true });
    }
    
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'forceCreateButton') {
        console.log("AliExpress Scraper: Received force create button command");
        
        // Check if content script is already loaded
        if (document.getElementById('aliexpress-scraper-content-script')) {
          console.log("AliExpress Scraper: Content script already loaded, triggering scrape button creation");
          // The content script is already loaded, just need to tell it to create the button
          // We'll dispatch a custom event for this
          document.dispatchEvent(new CustomEvent('aliexpressScraper:createButton'));
          sendResponse({ success: true });
        } else {
          // Content script not loaded, try to load it
          if (isProductPage()) {
            loadAttempts = 0; // Reset attempts
            loadContentScript();
            sendResponse({ success: true, message: "Loading content script" });
          } else {
            console.log("AliExpress Scraper: Not on a product page, can't create button");
            sendResponse({ success: false, message: "Not on a product page" });
          }
        }
      }
      
      return true; // Keep the message channel open for async response
    });
  })();