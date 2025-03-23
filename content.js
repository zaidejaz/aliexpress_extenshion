// AliExpress Scraper - Content Script

function waitForProductElements(maxAttempts = 20) {
  let attempts = 0;
  
  function checkAndCreate() {
    console.log(`Attempt ${attempts + 1} to check for product elements`);
    
    // Check if product elements are present
    const productElements = [
      document.querySelector('h1[data-pl="product-title"]'),
      document.querySelector('.product-title-text'),
      document.querySelector('.price--currentPriceText--V8_y_b5'),
      document.querySelector('.product-price-value')
    ];
    
    if (productElements.some(el => el !== null)) {
      console.log("Product elements found, creating button");
      createScrapeButton();
      return true;
    }
    
    // Check attempts limit
    attempts++;
    if (attempts >= maxAttempts) {
      console.log("Maximum attempts reached, giving up");
      return false;
    }
    
    // Try again after a delay
    console.log("No product elements found yet, trying again in 1 second");
    setTimeout(checkAndCreate, 1000);
    return false;
  }
  
  return checkAndCreate();
}

// Create and inject the Scrape button
function createScrapeButton() {
  console.log("Creating scrape button...");
  
  // Check if button already exists
  if (document.getElementById('aliexpress-scraper-container')) {
    console.log("Scrape button already exists");
    return;
  }

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'aliexpress-scraper-container';
  buttonContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999999; display: flex; flex-direction: column; gap: 10px;';

  // Create scrape button
  const scrapeButton = document.createElement('button');
  scrapeButton.id = 'aliexpress-scrape-button';
  scrapeButton.textContent = 'Scrape';
  scrapeButton.style.cssText = 'padding: 10px 20px; background-color: #FF4747; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;';

  // Button hover effect
  scrapeButton.addEventListener('mouseover', () => {
    scrapeButton.style.backgroundColor = '#E60000';
  });

  scrapeButton.addEventListener('mouseout', () => {
    scrapeButton.style.backgroundColor = '#FF4747';
  });

  // Create download button (initially hidden)
  const downloadButton = document.createElement('button');
  downloadButton.id = 'aliexpress-download-button';
  downloadButton.textContent = 'Download CSV';
  downloadButton.style.cssText = 'padding: 8px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; display: none;';

  // Button hover effect
  downloadButton.addEventListener('mouseover', () => {
    downloadButton.style.backgroundColor = '#45a049';
  });

  downloadButton.addEventListener('mouseout', () => {
    downloadButton.style.backgroundColor = '#4CAF50';
  });

  // Create copy button (initially hidden)
  const copyButton = document.createElement('button');
  copyButton.id = 'aliexpress-copy-button';
  copyButton.textContent = 'Copy CSV';
  copyButton.style.cssText = 'padding: 8px 15px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; display: none;';

  // Button hover effect
  copyButton.addEventListener('mouseover', () => {
    copyButton.style.backgroundColor = '#0b7dda';
  });

  copyButton.addEventListener('mouseout', () => {
    copyButton.style.backgroundColor = '#2196F3';
  });

  // Create save button (initially hidden)
  const saveButton = document.createElement('button');
  saveButton.id = 'aliexpress-save-button';
  saveButton.textContent = 'Save Product';
  saveButton.style.cssText = 'padding: 8px 15px; background-color: #673AB7; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; display: none;';

  // Button hover effect
  saveButton.addEventListener('mouseover', () => {
    saveButton.style.backgroundColor = '#5E35B1';
  });

  saveButton.addEventListener('mouseout', () => {
    saveButton.style.backgroundColor = '#673AB7';
  });

  // Create a status div
  const statusDiv = document.createElement('div');
  statusDiv.id = 'aliexpress-status';
  statusDiv.style.cssText = 'margin-top: 5px; color: #666; font-size: 12px; display: none;';

  // Store the scraped data
  let scrapedData = null;

  // Add click event to scrape button
  scrapeButton.addEventListener('click', () => {
    // Change button state
    scrapeButton.textContent = 'Scraping...';
    scrapeButton.style.backgroundColor = '#FFA500';
    scrapeButton.disabled = true;
    statusDiv.style.display = 'block';
    statusDiv.textContent = 'Scraping product...';

    try {
      // Extract product data directly
      const productData = scrapeProductData();
      console.log("Scraped product data:", productData);

      // Format data for CSV
      scrapedData = formatDataForCSV(productData);
      console.log("Formatted CSV data:", scrapedData);

      // Show success message
      scrapeButton.textContent = 'DONE';
      scrapeButton.style.backgroundColor = '#4CAF50';
      statusDiv.textContent = 'Product scraped successfully!';

      // Show download, copy, and save buttons
      downloadButton.style.display = 'block';
      copyButton.style.display = 'block';
      saveButton.style.display = 'block';

      // Reset scrape button after 3 seconds
      setTimeout(() => {
        scrapeButton.textContent = 'Scrape';
        scrapeButton.style.backgroundColor = '#FF4747';
        scrapeButton.disabled = false;
      }, 3000);
    } catch (error) {
      console.error("Error scraping product:", error);

      scrapeButton.textContent = 'Error';
      scrapeButton.style.backgroundColor = '#F44336';
      statusDiv.textContent = 'Error: ' + error.message;

      // Reset scrape button after 3 seconds
      setTimeout(() => {
        scrapeButton.textContent = 'Scrape';
        scrapeButton.style.backgroundColor = '#FF4747';
        scrapeButton.disabled = false;
      }, 3000);
    }
  });

  // Add click event to download button
  downloadButton.addEventListener('click', () => {
    if (!scrapedData) {
      statusDiv.textContent = 'No data to download!';
      return;
    }

    try {
      // Convert data to CSV
      const csv = convertToCSV(scrapedData);

      // Create a download link
      const link = document.createElement('a');
      link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      link.download = 'aliexpress-product.csv';

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      statusDiv.textContent = 'CSV downloaded successfully!';
    } catch (error) {
      statusDiv.textContent = 'Error downloading CSV: ' + error.message;
      console.error("Error downloading CSV:", error);
    }
  });

  // Add click event to copy button
  copyButton.addEventListener('click', () => {
    if (!scrapedData) {
      statusDiv.textContent = 'No data to copy!';
      return;
    }

    try {
      // Convert data to CSV
      const csv = convertToCSV(scrapedData);

      // Copy to clipboard
      navigator.clipboard.writeText(csv).then(() => {
        statusDiv.textContent = 'CSV copied to clipboard!';
      }).catch(err => {
        statusDiv.textContent = 'Failed to copy: ' + err.message;
        console.error("Failed to copy:", err);
      });
    } catch (error) {
      statusDiv.textContent = 'Error copying CSV: ' + error.message;
      console.error("Error copying CSV:", error);
    }
  });

  // Add click event to save button
  saveButton.addEventListener('click', () => {
    if (!scrapedData) {
      statusDiv.textContent = 'No data to save!';
      return;
    }

    try {
      // Change button state
      saveButton.textContent = 'Saving...';
      saveButton.style.backgroundColor = '#FFA500';
      saveButton.disabled = true;
      statusDiv.textContent = 'Saving product data...';

      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'scrapeProduct',
        url: window.location.href,
        data: scrapedData
      }, (response) => {
        if (response && response.success) {
          statusDiv.textContent = 'Product saved successfully!';
          saveButton.textContent = 'Saved';
          saveButton.style.backgroundColor = '#4CAF50';
          
          setTimeout(() => {
            saveButton.textContent = 'Save Product';
            saveButton.style.backgroundColor = '#673AB7';
            saveButton.disabled = false;
          }, 2000);
        } else {
          statusDiv.textContent = 'Error saving data: ' + (response ? response.message : 'Unknown error');
          saveButton.textContent = 'Save Product';
          saveButton.style.backgroundColor = '#673AB7';
          saveButton.disabled = false;
        }
      });
    } catch (error) {
      statusDiv.textContent = 'Error saving product: ' + error.message;
      console.error("Error saving product:", error);
      
      saveButton.textContent = 'Save Product';
      saveButton.style.backgroundColor = '#673AB7';
      saveButton.disabled = false;
    }
  });

  // Add buttons to container
  buttonContainer.appendChild(scrapeButton);
  buttonContainer.appendChild(downloadButton);
  buttonContainer.appendChild(copyButton);
  buttonContainer.appendChild(saveButton);
  buttonContainer.appendChild(statusDiv);

  // Add container to page
  document.body.appendChild(buttonContainer);
  console.log("Scrape button created and added to page");
}

// Improved function to check if we're on a product page
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
      console.log("Detected product page:", currentUrl);
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
    console.log("Detected product page elements");
    return true;
  }
  
  console.log("Not a product page:", currentUrl);
  return false;
}

// Handle navigation events for single-page applications
function setupNavigationObserver() {
  let lastUrl = window.location.href;
  console.log("Setting up navigation observer, initial URL:", lastUrl);
  
  // Create a more robust observer
  const bodyObserver = new MutationObserver(() => {
    // Check if URL changed
    if (lastUrl !== window.location.href) {
      console.log("URL changed from", lastUrl, "to", window.location.href);
      lastUrl = window.location.href;

      // Remove existing button if it exists
      const existingContainer = document.getElementById('aliexpress-scraper-container');
      if (existingContainer) {
        console.log("Removing existing scrape button");
        existingContainer.remove();
      }

      // Add new button if on a product page
      if (isProductPage()) {
        console.log("Navigated to product page, creating button");
        waitForProductElements();
      }
    }
    
    // Also periodically check for product page without URL change
    // (handles cases where content loads dynamically)
    if (isProductPage() && !document.getElementById('aliexpress-scraper-container')) {
      console.log("Product page detected without URL change, creating button");
      waitForProductElements();
    }
  });

  // Observe changes to the body element
  bodyObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also set a timer as a fallback
  setTimeout(() => {
    if (isProductPage() && !document.getElementById('aliexpress-scraper-container')) {
      console.log("Delayed detection of product page, creating button");
      waitForProductElements();
    }
  }, 2000);
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'clearData') {
    // Reset UI if any
    const statusDiv = document.getElementById('aliexpress-status');
    if (statusDiv) {
      statusDiv.textContent = 'All saved data cleared.';
    }
    sendResponse({ success: true });
  } else if (message.action === 'updateStats') {
    // Update any UI elements that display stats
    const statusDiv = document.getElementById('aliexpress-status');
    if (statusDiv && statusDiv.style.display === 'block') {
      statusDiv.textContent = `Saved products: ${message.stats.total}`;
    }
    sendResponse({ success: true });
  } else if (message.action === 'forceCreateButton') {
    // Force create the button on demand
    waitForProductElements();
    sendResponse({ success: true });
  }
  
  return true; // Keep the message channel open for async response
});

// Main function to scrape product data
function scrapeProductData() {
  // Check for product issues
  const pageContent = document.body.textContent;
  if (pageContent.includes("This product can't be shipped to your address") ||
    pageContent.includes("Sorry, this item is no longer available") ||
    pageContent.includes("Item unavailable")) {
    throw new Error("Product unavailable or cannot be shipped");
  }

  // Extract product data
  const data = {};

  // Basic product information
  const fullUrl = window.location.href;
  const productUrlMatch = fullUrl.match(/(https?:\/\/[^\/]+\/item\/\d+\.html)/);
  data.url = productUrlMatch ? productUrlMatch[1] : fullUrl.split('?')[0];

  // Extract title
  data.title = document.querySelector('h1[data-pl="product-title"]')?.textContent.trim() ||
    document.querySelector('.product-title-text')?.textContent.trim() ||
    document.querySelector('h1.title')?.textContent.trim() || '';

  console.log("Extracted title:", data.title);

  // Extract price
  const priceElement = document.querySelector('.price--currentPriceText--V8_y_b5') ||
    document.querySelector('.product-price-value') ||
    document.querySelector('.uniform-banner-box-price') ||
    document.querySelector('[data-pl="product-price"]');
  if (priceElement) {
    const priceText = priceElement.textContent.trim();
    console.log("Raw price text:", priceText);

    const match = priceText.match(/[\d,.]+/);
    if (match) {
      data.price = match[0].replace(/,/g, '');
      console.log("Extracted price:", data.price);
    }
  }

  // Extract quantity information - improved to handle all formats
  try {
    // Look for the quantity text
    const qtyPatterns = [
      '(\\d+)\\s+available',
      '(\\d+)\\s+pieces\\s+available',
      'available\\s*:\\s*(\\d+)',
      'quantity\\s*:\\s*(\\d+)',
      'in\\s+stock\\s*:\\s*(\\d+)'
    ];

    let quantity = null;

    // Try all patterns
    for (const pattern of qtyPatterns) {
      const regex = new RegExp(pattern, 'i');
      const match = pageContent.match(regex);
      if (match && match[1]) {
        quantity = match[1];
        break;
      }
    }

    // Direct DOM elements
    if (!quantity) {
      const qtyElements = [
        document.querySelector('.quantity--availText--EdCcDZ9'),
        document.querySelector('[data-spm-anchor-id*="available"]'),
        ...document.querySelectorAll('[data-spm-anchor-id*="quantity"]')
      ];

      for (const el of qtyElements) {
        if (el) {
          const match = el.textContent.match(/(\d+)/);
          if (match && match[1]) {
            quantity = match[1];
            break;
          }
        }
      }
    }

    // If still not found, perform a broad text search
    if (!quantity) {
      const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let currentNode;
      while (currentNode = textNodes.nextNode()) {
        if (currentNode.textContent.match(/\b\d+\s+available\b/i)) {
          const match = currentNode.textContent.match(/(\d+)\s+available/i);
          if (match && match[1]) {
            quantity = match[1];
            break;
          }
        }
      }
    }

    data.quantity = quantity || '999'; // Default to 999 if no quantity found
    console.log("Extracted quantity:", data.quantity);
  } catch (error) {
    console.error("Error extracting quantity:", error);
    data.quantity = '999'; // Default value
  }

  // Improve category extraction - search both breadcrumbs and category links
  try {
    // First look for structured breadcrumbs
    const breadcrumbContainers = [
      document.querySelector('.breadcrumb--breadcrumb--rXwrl9G'),
      document.querySelector('.breadcrumb'),
      document.querySelector('[data-spm-anchor-id*="breadcrumb"]')
    ].filter(Boolean);

    if (breadcrumbContainers.length > 0) {
      const container = breadcrumbContainers[0];
      const items = container.querySelectorAll('a');

      if (items.length > 0) {
        // Get the last category (most specific)
        const lastCategory = items[items.length - 1];
        data.categoryName = lastCategory.textContent.trim();

        // Try to extract category ID from URL
        const href = lastCategory.getAttribute('href');
        if (href) {
          const categoryIdMatch = href.match(/category\/(\d+)/) || href.match(/(\d+)\.html/);
          if (categoryIdMatch && categoryIdMatch[1]) {
            data.categoryId = categoryIdMatch[1];
          }
        }
      }
    }

    // If no category found, try to find category info in product meta
    if (!data.categoryName) {
      // Look for category information in the URL or page content
      const metaTags = document.querySelectorAll('meta[property^="product:"]');
      metaTags.forEach(tag => {
        const property = tag.getAttribute('property');
        const content = tag.getAttribute('content');

        if (property === 'product:category' && content) {
          data.categoryName = content;
        }
      });
    }

    // Still no category? Try finding mentions of category in text
    if (!data.categoryName) {
      const categoryTexts = document.evaluate('//text()[contains(., "Category:")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < categoryTexts.snapshotLength; i++) {
        const text = categoryTexts.snapshotItem(i).textContent;
        const match = text.match(/Category\s*:\s*([\w\s&]+)/i);
        if (match && match[1]) {
          data.categoryName = match[1].trim();
          break;
        }
      }
    }

    console.log("Extracted category name:", data.categoryName);
    console.log("Extracted category ID:", data.categoryId);
  } catch (error) {
    console.error("Error extracting category:", error);
  }

  // Extract description
  const descriptionElements = [
    document.querySelector('.detail--richtext--1CEb0'),
    document.querySelector('.product-description'),
    document.querySelector('.detail-desc-decorate-richtext'),
    document.querySelector('[data-pl="product-description"]'),
    document.querySelector('.product-description-container'),
    document.querySelector('.description--origin-part--rWy05pE')
  ].filter(Boolean);

  if (descriptionElements.length > 0) {
    data.description = descriptionElements[0].textContent.trim();
  }

  // Extract store information
  const storeInfo = extractStoreInfo();
  data.storeName = storeInfo.storeName;
  data.storeNo = storeInfo.storeNo;
  data.openSince = storeInfo.openSince;

  // Extract scan date (current date)
  data.scanDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Extract shipping information
  data.shipping = extractShippingCost();

  // Calculate total
  if (data.price && data.shipping) {
    data.total = (parseFloat(data.price) + parseFloat(data.shipping || 0)).toFixed(2);
  }

  // Extract product specifications
  const specElements = document.querySelectorAll('.specification--specItem--2cWUE, .spec-item, [data-pl="specification-item"]');
  const specs = [];
  specElements.forEach(spec => {
    const titleElement = spec.querySelector('.specification--specName--3T3Xu, .spec-name, [data-pl="specification-name"]');
    const valueElement = spec.querySelector('.specification--specValue--1Nvyi, .spec-value, [data-pl="specification-value"]');

    if (titleElement && valueElement) {
      const title = titleElement.textContent.trim();
      const value = valueElement.textContent.trim();

      specs.push({ title, value });

      // Look for UPC, EAN, EPID
      const titleLower = title.toLowerCase();
      if (titleLower.includes('upc') || titleLower.includes('universal product code')) {
        data.upc = value;
      } else if (titleLower.includes('ean') || titleLower.includes('european article number')) {
        data.ean = value;
      } else if (titleLower.includes('epid') || titleLower.includes('ebay product id')) {
        data.epid = value;
      }

      // Look for warnings or important specifications
      if (titleLower.includes('warning') || titleLower.includes('caution') || titleLower.includes('important')) {
        data.specificationsWarning = (data.specificationsWarning || '') + `${title}: ${value}\n`;
      }
    }
  });

  // Extract custom label (SKU)
  const urlMatch = window.location.href.match(/\/(\d+)\.html/);
  if (urlMatch && urlMatch[1]) {
    data.customLabel = 'P' + urlMatch[1];
  }

  // Extract all images including variant-specific images
  const imageData = extractAllImages();
  data.imageData = imageData; // Store the complete image data for later use

  // For the parent product row, use only non-variant images
  if (imageData.parentImages.length > 0) {
    data.photos = imageData.parentImages.join('|');
  } else if (imageData.allImages.length > 0) {
    // Fallback to all images if we couldn't filter out variant images
    data.photos = imageData.allImages.join('|');
  }

  // Extract all variations with improved image handling
  data.variations = extractAllVariations(imageData.variantImages);

  // Extract sell points (product highlights)
  const sellPointElements = document.querySelectorAll('.product-feature, .product-highlight, .feature-item, li[data-pl="product-feature"]');
  const sellPoints = [];
  sellPointElements.forEach(point => {
    const text = point.textContent.trim();
    if (text) {
      sellPoints.push(text);
    }
  });
  if (sellPoints.length > 0) {
    data.productSellpoints = sellPoints.join('\n');
  }

  // Extract ship to country
  const shipToElement = document.querySelector('[data-spm-anchor-id*="ship to"] span') || document.querySelector('[data-spm-anchor-id*="ship-to"] span');
  if (shipToElement) {
    data.shipTo = shipToElement.textContent.trim();
  } else {
    // Try to find in text
    const shipToText = document.evaluate('//text()[contains(., "Ship to")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (shipToText) {
      const shipToLine = shipToText.textContent.trim();
      const shipToMatch = shipToLine.match(/Ship to\s*:\s*([A-Za-z]+)/i);
      if (shipToMatch && shipToMatch[1]) {
        data.shipTo = shipToMatch[1];
      }
    }
  }

  return data;
}

// Extract store information
function extractStoreInfo() {
  const storeInfo = {
    storeName: '',
    storeNo: '',
    openSince: ''
  };
  
  try {
    // Direct approach targeting the specific table rows
    const storeInfoTable = document.querySelector('.store-detail--storeInfo--BMDFsTB table');
    if (storeInfoTable) {
      const rows = storeInfoTable.querySelectorAll('tr');
      console.log(rows);
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const label = cells[0].textContent.trim();
          const value = cells[1].textContent.trim();
          
          if (label.includes('Name:')) {
            storeInfo.storeName = value;
            console.log("Found store name:", value);
          } else if (label.includes('Store no.:')) {
            storeInfo.storeNo = value;
            console.log("Found store number:", value);
          } else if (label.includes('Open since:')) {
            storeInfo.openSince = value;
            console.log("Found open since:", value);
          }
        }
      });
    }
    
    // If store info is still missing, try alternative methods
    if (!storeInfo.storeName) {
      const storeNameElement = document.querySelector('.shop-name, .store-name, [data-pl="store-name"]');
      if (storeNameElement) {
        storeInfo.storeName = storeNameElement.textContent.trim();
      }
    }
    
    if (!storeInfo.storeNo) {
      // Look for store number in links
      const storeLinks = document.querySelectorAll('a[href*="store"]');
      for (const link of storeLinks) {
        const href = link.getAttribute('href');
        const storeMatch = href.match(/store\/(\d+)/);
        if (storeMatch && storeMatch[1]) {
          storeInfo.storeNo = storeMatch[1];
          break;
        }
      }
    }
    
    // If we still don't have the open since date, search more broadly
    if (!storeInfo.openSince) {
      // Use XPath to find elements containing text
      const openSinceTds = document.evaluate('//td[contains(text(), "Open since:")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < openSinceTds.snapshotLength; i++) {
        const td = openSinceTds.snapshotItem(i);
        if (td.nextElementSibling) {
          storeInfo.openSince = td.nextElementSibling.textContent.trim();
          console.log("Found open since via XPath:", storeInfo.openSince);
          break;
        }
      }
    }
    
    // Last resort: look for text pattern in all text nodes
    if (!storeInfo.openSince) {
      const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let textNode;
      while (textNode = textWalker.nextNode()) {
        if (textNode.textContent.includes('Open since:')) {
          // Try to find the date in the parent or sibling elements
          const parentEl = textNode.parentElement;
          
          // Check if the next sibling has the date
          if (parentEl.nextElementSibling) {
            storeInfo.openSince = parentEl.nextElementSibling.textContent.trim();
            console.log("Found open since from next sibling:", storeInfo.openSince);
            break;
          }
          
          // Otherwise, check if it's in the same element after the text
          const text = parentEl.textContent;
          const match = text.match(/Open since:\s*([A-Za-z0-9,\s]+)/i);
          if (match && match[1]) {
            storeInfo.openSince = match[1].trim();
            console.log("Found open since from text pattern:", storeInfo.openSince);
            break;
          }
        }
      }
    }
    
    return storeInfo;
  } catch (error) {
    console.error("Error extracting store info:", error);
    return storeInfo;
  }
}

// Function to extract shipping cost (continued)
function extractShippingCost() {
  let shippingCost = '0'; // Default to free shipping

  try {
    // Direct approach for the dynamic shipping structure
    const dynamicShippingLines = document.querySelectorAll('.dynamic-shipping-line');
    for (const line of dynamicShippingLines) {
      const text = line.textContent.trim();
      if (text.includes('Shipping:')) {
        // Look for price with currency symbol
        const match = text.match(/Shipping:\s*(\$|PKR|US\s*\$|€)?\s*([\d,.]+)/i);
        if (match && match[2]) {
          shippingCost = match[2].replace(/,/g, '');
          console.log("Found shipping cost in dynamic shipping:", shippingCost);
          return shippingCost;
        }
      }
    }

    // Look specifically for the strong tag with shipping info
    const shippingStrongs = document.querySelectorAll('.dynamic-shipping strong');
    for (const strong of shippingStrongs) {
      const text = strong.textContent.trim();
      if (text.includes('Shipping:') || text.match(/\$\d+/)) {
        const match = text.match(/(\$|PKR|US\s*\$|€)?\s*([\d,.]+)/);
        if (match && match[2]) {
          shippingCost = match[2].replace(/,/g, '');
          console.log("Found shipping cost in strong tag:", shippingCost);
          return shippingCost;
        }
      }
    }

    // Try the shipping div itself
    const shippingContent = document.querySelector('.shipping--content--ulA3urO');
    if (shippingContent) {
      const text = shippingContent.textContent.trim();
      if (text.includes('Shipping:')) {
        const match = text.match(/Shipping:\s*(\$|PKR|US\s*\$|€)?\s*([\d,.]+)/i);
        if (match && match[2]) {
          shippingCost = match[2].replace(/,/g, '');
          console.log("Found shipping cost in shipping content:", shippingCost);
          return shippingCost;
        }
      }
    }

    // Check for free shipping
    const freeShippingTexts = ['Free Shipping', 'Free shipping', 'free shipping'];
    for (const text of freeShippingTexts) {
      if (document.body.textContent.includes(text)) {
        console.log("Found free shipping text");
        return '0';
      }
    }

    // Try other shipping elements
    const shippingElements = [
      document.querySelector('.shipping--deliveryInfoRow--3fmGP'),
      document.querySelector('.product-shipping-price'),
      document.querySelector('.shipping-link'),
      document.querySelector('[data-pl="shipping-info"]'),
      document.querySelector('[data-spm-anchor-id*="shipping"]')
    ].filter(Boolean);

    for (const el of shippingElements) {
      const text = el.textContent.trim();

      if (text.toLowerCase().includes('free')) {
        return '0';
      }

      const match = text.match(/(\$|PKR|US\s*\$|€)?\s*([\d,.]+)/);
      if (match && match[2]) {
        shippingCost = match[2].replace(/,/g, '');
        console.log("Found shipping cost in general shipping element:", shippingCost);
        return shippingCost;
      }
    }

    return shippingCost;
  } catch (error) {
    console.error("Error extracting shipping cost:", error);
    return shippingCost;
  }
}

// Function to extract all product photos (improved version)
function extractAllImages() {
  const allImages = [];
  const variantImages = new Map(); // Map to track variant-specific images by their alt text

  // First collect all variant-specific images to filter them out later
  try {
    // Collect variant-specific images from the color selection area
    const variantImageElements = document.querySelectorAll('.sku-item--image--jMUnnGA img, .sku-property-item img, [data-pl="sku-item"] img');

    variantImageElements.forEach(img => {
      const altText = img.getAttribute('alt');
      if (altText) {
        let fullSizeSrc = img.getAttribute('src') || '';

        // Clean up to get full-size version
        fullSizeSrc = fullSizeSrc.replace(/_\d+x\d+(\.[a-zA-Z]+)$/, '_960x960$1');
        fullSizeSrc = fullSizeSrc.replace(/\.jpg_.*\.avif/, '.jpg');
        fullSizeSrc = fullSizeSrc.replace(/\.avif$/, '');
        fullSizeSrc = fullSizeSrc.replace(/_\d+x\d+q\d+/, '_960x960q95');

        // Store in the map with alt text as key
        variantImages.set(altText, fullSizeSrc);
      }
    });

    console.log("Found variant images:", variantImages.size);
  } catch (error) {
    console.error("Error collecting variant images:", error);
  }

  // Now collect all images from the slider elements
  try {
    // Look directly for the slider image divs
    const sliderDivs = document.querySelectorAll('.slider--img--K0YbWW2');
    console.log(`Found ${sliderDivs.length} slider divs`);

    // Process each slider div
    sliderDivs.forEach(sliderDiv => {
      // Find the nested img element
      const imgElement = sliderDiv.querySelector('img');
      if (!imgElement) {
        console.log("No img element found in slider div:", sliderDiv.outerHTML);
        return;
      }

      let src = imgElement.getAttribute('src');
      if (!src) {
        console.log("No src attribute on img element:", imgElement.outerHTML);
        return;
      }

      // Clean up to get full-size version
      src = src.replace(/_\d+x\d+(\.[a-zA-Z]+)$/, '_960x960$1');
      src = src.replace(/\.jpg_.*\.avif/, '.jpg');
      src = src.replace(/\.avif$/, '');
      src = src.replace(/_\d+x\d+q\d+/, '_960x960q95');

      // Add to the list if not already included
      if (!allImages.includes(src)) {
        allImages.push(src);
        console.log("Added image:", src);
      }
    });

    // If no images found or less than expected, try other methods
    if (allImages.length < sliderDivs.length) {
      console.log("Warning: Found fewer images than slider divs, trying alternative methods");

      // Try general gallery selectors
      const gallerySelectors = [
        '.image-view--previewBox--_oNCSe7 img',
        '.image-view--image--hmM5o7L',
        '.magnifier--image--EYYoSlr',
        '.images--gallery--19J1o img',
        '[data-pl="product-image"] img',
        '.image-gallery img',
        '.product-gallery img',
        '.product-image img'
      ];

      const gallerySelector = gallerySelectors.join(', ');
      const galleryImages = document.querySelectorAll(gallerySelector);

      galleryImages.forEach(img => {
        let src = img.getAttribute('src');
        if (!src) return;

        src = src.replace(/_\d+x\d+(\.[a-zA-Z]+)$/, '_960x960$1');
        src = src.replace(/\.jpg_.*\.avif/, '.jpg');
        src = src.replace(/\.avif$/, '');
        src = src.replace(/_\d+x\d+q\d+/, '_960x960q95');

        if (!allImages.includes(src)) {
          allImages.push(src);
        }
      });
    }

    console.log("Found all images:", allImages.length);
  } catch (error) {
    console.error("Error collecting slider images:", error);
  }

  // If we didn't find any images, try one more approach - the main product image
  if (allImages.length === 0) {
    try {
      const mainImage = document.querySelector('.magnifier--image--EYYoSlr, .magnifier-image, .main-image');
      if (mainImage) {
        let src = mainImage.getAttribute('src');
        if (src) {
          src = src.replace(/_\d+x\d+(\.[a-zA-Z]+)$/, '_960x960$1');
          src = src.replace(/\.jpg_.*\.avif/, '.jpg');
          src = src.replace(/\.avif$/, '');
          src = src.replace(/_\d+x\d+q\d+/, '_960x960q95');

          allImages.push(src);
        }
      }
    } catch (error) {
      console.error("Error getting main image:", error);
    }
  }

  // Filter out variant-specific images for the parent
  const parentImages = allImages.filter(src => {
    // Check if this image is in our variant images map (by comparing URLs)
    for (const variantSrc of variantImages.values()) {
      // Simple check - if the URLs contain similar patterns
      const srcBase = src.split('/').pop().split('_')[0]; // Get the base filename
      const varSrcBase = variantSrc.split('/').pop().split('_')[0]; // Get the base filename

      if (srcBase === varSrcBase || src.includes(variantSrc) || variantSrc.includes(src)) {
        return false;
      }
    }
    return true;
  });

  console.log("Parent images (excluding variants):", parentImages.length);

  // Return all the collected data
  return {
    allImages,           // All images found
    parentImages,        // Images for the parent (excluding variant-specific)
    variantImages        // Map of variant-specific images
  };
}

// Function to extract all variations with improved handling for different types and sold-out items
function extractAllVariations(variantImagesMap) {
  const variations = [];

  // Find all variation groups (color, size, etc.)
  const variationGroups = document.querySelectorAll('.sku-item--property--HuasaIz, .sku-property-wrapper, [data-pl="sku-selector"]');

  variationGroups.forEach(group => {
    const groupTitleElement = group.querySelector('.sku-item--title--Z0HLO87, .sku-title, [data-pl="sku-title"]');
    if (!groupTitleElement) return;

    let groupTitle = groupTitleElement.textContent.trim();

    // Remove the colon and anything after it in the title
    groupTitle = groupTitle.replace(/\s*:\s*.*$/, '');

    // Find all options for this variation group
    const options = [];

    // For image-based variations (like colors)
    const imageOptions = group.querySelectorAll('.sku-item--image--jMUnnGA:not(.sku-item--soldOut--YJfuCGq) img, .sku-property-item:not(.disabled):not(.soldout) img, [data-pl="sku-item"]:not(.disabled):not(.soldout) img');

    imageOptions.forEach(img => {
      const optionValue = img.getAttribute('alt') || '';

      // Get image from the map if available, otherwise extract from current element
      let imageSrc = '';
      if (variantImagesMap && variantImagesMap.has(optionValue)) {
        imageSrc = variantImagesMap.get(optionValue);
      } else {
        imageSrc = img.getAttribute('src') || '';
        if (imageSrc) {
          // Clean up image URL to get a larger version
          imageSrc = imageSrc.replace(/_\d+x\d+(\.[a-zA-Z]+)$/, '_960x960$1');
          imageSrc = imageSrc.replace(/\.jpg_.*\.avif/, '.jpg');
          imageSrc = imageSrc.replace(/\.avif$/, '');

          // Replace thumbnail parameters in URL
          imageSrc = imageSrc.replace(/_\d+x\d+q\d+/, '_960x960q95');
        }
      }

      if (optionValue) {
        options.push({
          value: optionValue,
          image: imageSrc
        });
      }
    });

    // For text-based variations (like sizes)
    const textOptions = group.querySelectorAll('.sku-item--text--hYfAukP:not(.sku-item--soldOut--YJfuCGq), .sku-property-text:not(.disabled):not(.soldout), [data-pl="sku-text"]:not(.disabled):not(.soldout)');

    textOptions.forEach(option => {
      // Get from title attribute first, then from content
      const optionValue = option.getAttribute('title') || option.textContent.trim();
      const optionSpan = option.querySelector('span');
      const finalValue = optionValue || (optionSpan ? optionSpan.textContent.trim() : '');

      if (finalValue) {
        options.push({
          value: finalValue,
          image: '' // No specific image for text-based variations
        });
      }
    });

    if (options.length > 0) {
      variations.push({
        groupName: groupTitle,
        options: options
      });
    }
  });

  console.log("Extracted variation groups:", variations.length);
  variations.forEach(group => {
    console.log(`Group: ${group.groupName}, Options: ${group.options.length}`);
    console.log("Options:", group.options.map(o => o.value).join(", "));
  });

  return variations;
}

// Function to generate all possible combinations of variations
function generateAllCombinations(variationGroups) {
  if (!variationGroups || variationGroups.length === 0) {
    return [];
  }

  // Start with the first group's options
  let result = variationGroups[0].options.map(option => [option]);

  // For each additional group, combine with existing results
  for (let i = 1; i < variationGroups.length; i++) {
    const currentGroup = variationGroups[i];
    const newResult = [];

    // For each existing combination
    for (let j = 0; j < result.length; j++) {
      const existingCombo = result[j];

      // Add each option from current group to create new combinations
      for (let k = 0; k < currentGroup.options.length; k++) {
        newResult.push([...existingCombo, currentGroup.options[k]]);
      }
    }

    result = newResult;
  }

  return result;
}

// Format the scraped data for CSV export
function formatDataForCSV(productData) {
  const rows = [];

  // If there are no variations, just create a single row
  if (!productData.variations || productData.variations.length === 0) {
    const row = {
      '#': 1,
      'URL': productData.url || '',
      'Action': '',
      'Custom Label (SKU)': productData.customLabel || '',
      'Category ID': productData.categoryId || '',
      'Category Name': productData.categoryName || '',
      'Title': productData.title || '',
      'Relationship': '',
      'Relationship details': '',
      'P:Schedule Time': '',
      'P:UPC': productData.upc || '',
      'P:EPID': productData.epid || '',
      'Price': productData.price || '',
      'Quantity': productData.quantity || '999', // Use scraped quantity or default
      'Item photo URL': productData.photos || '',
      'VideoID': '',
      'Condition ID': '',
      'Description': productData.description || '',
      'SHIP': productData.shipping || '',
      'TOTAL': productData.total || '',
      'P:EAN': productData.ean || '',
      'Specifications Warning': productData.specificationsWarning || '',
      'Product sellpoints': productData.productSellpoints || '',
      'multiplier': '',
      'Buy It Now price': '',
      'Ship to': productData.shipTo || 'US', // Use scraped ship to or default
      'Store Name': productData.storeName || '',
      'Store no': productData.storeNo || '',
      'Open since': productData.openSince || '',
      'Scan date': productData.scanDate || ''
    };

    rows.push(row);
    return rows;
  }

  // Format variation options in the correct way for the parent row
  let relationshipDetails = '';

  // Format: Color=Red;Blue|Size=Small;Medium
  productData.variations.forEach((group, index) => {
    if (group.options.length > 0) {
      // Add group name and equals sign
      relationshipDetails += `${group.groupName}=`;

      // Add all options separated by semicolons
      relationshipDetails += group.options.map(o => o.value).join(';');

      // Add vertical bar between groups if not the last group
      if (index < productData.variations.length - 1) {
        relationshipDetails += '|';
      }
    }
  });

  // Parent row (first row)
  const parentRow = {
    '#': 1,
    'URL': productData.url || '',
    'Action': '',
    'Custom Label (SKU)': productData.customLabel || '',
    'Category ID': productData.categoryId || '',
    'Category Name': productData.categoryName || '',
    'Title': productData.title || '',
    'Relationship': '',
    'Relationship details': relationshipDetails,
    'P:Schedule Time': '',
    'P:UPC': productData.upc || '',
    'P:EPID': productData.epid || '',
    'Price': productData.price || '',
    'Quantity': productData.quantity || '999',
    'Item photo URL': productData.photos || '',
    'VideoID': '',
    'Condition ID': '',
    'Description': productData.description || '',
    'SHIP': productData.shipping || '',
    'TOTAL': productData.total || '',
    'P:EAN': productData.ean || '',
    'Specifications Warning': productData.specificationsWarning || '',
    'Product sellpoints': productData.productSellpoints || '',
    'multiplier': '',
    'Buy It Now price': '',
    'Ship to': productData.shipTo || 'US',
    'Store Name': productData.storeName || '',
    'Store no': productData.storeNo || '',
    'Open since': productData.openSince || '',
    'Scan date': productData.scanDate || ''
  };

  rows.push(parentRow);

  // Generate all possible combinations of variations
  let rowIndex = 2; // Start from 2 for variations

  // If we have multiple variation groups (e.g., Color AND Size)
  if (productData.variations.length > 1) {
    // Create all combinations
    const allCombinations = generateAllCombinations(productData.variations);

    // For each combination, create a variation row
    allCombinations.forEach(combination => {
      // Build the relationship details string (e.g., "Color=Red|Size=Small")
      let variantDetails = '';
      let skuSuffix = '';
      let colorImage = ''; // To store color-specific image if available

      combination.forEach((option, i) => {
        // Add to relationship details
        variantDetails += `${productData.variations[i].groupName}=${option.value}`;
        if (i < combination.length - 1) {
          variantDetails += '|';
        }

        // Add to SKU suffix
        const safeValue = option.value.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        skuSuffix += (i > 0 ? '-' : '') + safeValue;

        // If this is a color variation and has an image, save it
        if (productData.variations[i].groupName.toLowerCase().includes('color') && option.image) {
          colorImage = option.image;
        }
      });

      // Use color image if available, otherwise use the first parent image
      let itemPhotoURL = colorImage;
      if (!itemPhotoURL && productData.imageData && productData.imageData.parentImages && productData.imageData.parentImages.length > 0) {
        itemPhotoURL = productData.imageData.parentImages[0];
      }

      // Create the variation row
      const variationRow = {
        '#': rowIndex++,
        'URL': '',
        'Action': '',
        'Custom Label (SKU)': `${productData.customLabel}-${skuSuffix}`,
        'Category ID': '',
        'Category Name': '',
        'Title': '',
        'Relationship': 'Variation',
        'Relationship details': variantDetails,
        'P:Schedule Time': '',
        'P:UPC': productData.upc || '',
        'P:EPID': productData.epid || '',
        'Price': productData.price || '',
        'Quantity': productData.quantity || '999',
        'Item photo URL': itemPhotoURL || '',
        'VideoID': '',
        'Condition ID': '',
        'Description': '',
        'SHIP': productData.shipping || '',
        'TOTAL': productData.total || '',
        'P:EAN': productData.ean || '',
        'Specifications Warning': '',
        'Product sellpoints': '',
        'multiplier': '',
        'Buy It Now price': '',
        'Ship to': productData.shipTo || 'US',
        'Store Name': '',
        'Store no': '',
        'Open since': '',
        'Scan date': ''
      };

      rows.push(variationRow);
    });
  }
  // If we only have one variation group (e.g., just Color)
  else if (productData.variations.length === 1) {
    const group = productData.variations[0];

    group.options.forEach(option => {
      const safeValue = option.value.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

      const variationRow = {
        '#': rowIndex++,
        'URL': '',
        'Action': '',
        'Custom Label (SKU)': `${productData.customLabel}-${safeValue}`,
        'Category ID': '',
        'Category Name': '',
        'Title': '',
        'Relationship': 'Variation',
        'Relationship details': `${group.groupName}=${option.value}`,
        'P:Schedule Time': '',
        'P:UPC': productData.upc || '',
        'P:EPID': productData.epid || '',
        'Price': productData.price || '',
        'Quantity': productData.quantity || '999',
        'Item photo URL': option.image || '',
        'VideoID': '',
        'Condition ID': '',
        'Description': '',
        'SHIP': productData.shipping || '',
        'TOTAL': productData.total || '',
        'P:EAN': productData.ean || '',
        'Specifications Warning': '',
        'Product sellpoints': '',
        'multiplier': '',
        'Buy It Now price': '',
        'Ship to': productData.shipTo || 'US',
        'Store Name': '',
        'Store no': '',
        'Open since': '',
        'Scan date': ''
      };

      rows.push(variationRow);
    });
  }

  return rows;
}

// Helper function to convert data to CSV
function convertToCSV(data) {
  // Define headers based on the data structure
  const headers = [
    '#', 'URL', 'Action', 'Custom Label (SKU)', 'Category ID',
    'Category Name', 'Title', 'Relationship', 'Relationship details',
    'P:Schedule Time', 'P:UPC', 'P:EPID', 'Price', 'Quantity',
    'Item photo URL', 'VideoID', 'Condition ID', 'Description',
    'SHIP', 'TOTAL', 'P:EAN', 'Specifications Warning',
    'Product sellpoints', 'multiplier', 'Buy It Now price',
    'Ship to', 'Store Name', 'Store no', 'Open since', 'Scan date'
  ];

  // Create CSV content
  let csvContent = headers.join(',') + '\n';

  // Add data rows
  data.forEach(row => {
    // Create row content
    const rowContent = headers.map(header => {
      // Handle special cases like Description that might contain commas or quotes
      let value = row[header] || '';

      // Escape quotes and wrap in quotes if the value contains commas, quotes, or newlines
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }

      return value;
    }).join(',');

    csvContent += rowContent + '\n';
  });

  return csvContent;
}

// Initialize with improved strategy for detecting product pages
console.log("AliExpress Scraper content script loaded");

// Initial check
if (isProductPage()) {
  console.log("Product page detected on initial load");
  waitForProductElements();
} else {
  console.log("Not a product page on initial load");
}

// Continue monitoring for navigation
setupNavigationObserver();

// Also add an additional window.load event for good measure
window.addEventListener('load', () => {
  console.log("Window load event fired");
  setTimeout(() => {
    if (isProductPage() && !document.getElementById('aliexpress-scraper-container')) {
      console.log("Trying after window load event");
      waitForProductElements();
    }
  }, 1000);
});