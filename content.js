// AliExpress Scraper - Content Script with Dynamic Variant Scraping

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
  scrapeButton.addEventListener('click', async () => {
    // Change button state
    scrapeButton.textContent = 'Scraping...';
    scrapeButton.style.backgroundColor = '#FFA500';
    scrapeButton.disabled = true;
    statusDiv.style.display = 'block';
    statusDiv.textContent = 'Scraping product...';

    try {
      // Extract product data directly
      const productData = await scrapeProductData();
      console.log("Scraped basic product data:", productData);

      // Update status
      statusDiv.textContent = 'Scraping variants (this may take a moment)...';

      // Scrape all variant combinations
      const variantData = await scrapeAllVariantCombinations();
      console.log("Scraped variant data:", variantData);

      // Upload all product images and videos
      statusDiv.textContent = 'Uploading media to CDN...';
      const uploadStatus = await uploadAllProductImages(productData);
      console.log("Media upload status:", uploadStatus);

      // Update product data with CDN URLs
      const updatedProductWithCdnUrls = updateProductImagesWithCdnUrls(productData, uploadStatus);
      console.log("Updated product data with CDN URLs:", updatedProductWithCdnUrls);

      // Format data for CSV with updated URLs
      statusDiv.textContent = 'Processing variant data...';
      let formattedData = formatDataForCSV(updatedProductWithCdnUrls);
      
      // If we have variant data, update the product with it
      if (variantData && variantData.length > 0) {
        statusDiv.textContent = 'Applying variant-specific prices and quantities...';
        
        // We need to create a wrapper object that has the structure updateProductWithVariantData expects
        const dataWrapper = { data: formattedData };
        
        // Now update the variants with their specific data
        const variantProductData = updateProductWithVariantData(dataWrapper, variantData);
        
        // Extract the updated data
        if (variantProductData && variantProductData.data) {
          formattedData = variantProductData.data;
        }
      }

      // Store the formatted data (with CDN URLs and variant data)
      scrapedData = formattedData;
      console.log("Final formatted CSV data with CDN URLs and variant data:", scrapedData);

      // Show success message
      scrapeButton.textContent = 'DONE';
      scrapeButton.style.backgroundColor = '#4CAF50';
      statusDiv.textContent = 'Product and variants scraped successfully!';

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

// Enhanced function to extract the current variant details
function extractVariantDetails() {
  // Extract current price
  const priceElement = document.querySelector('.price--currentPriceText--V8_y_b5') ||
    document.querySelector('.product-price-value') ||
    document.querySelector('.uniform-banner-box-price') ||
    document.querySelector('[data-pl="product-price"]');

  let price = '';
  if (priceElement) {
    const priceText = priceElement.textContent.trim();
    const match = priceText.match(/[\d,.]+/);
    if (match) {
      price = match[0].replace(/,/g, '');
    }
  }

  // Extract current shipping cost
  let shipping = extractShippingCost();

  // Extract current quantity
  let quantity = '999'; // Default
  try {
    // First check for "Max. 1 pcs/shopper" pattern in entire document
    const pageContent = document.body.textContent;
    if (pageContent.includes("Max. 1 pcs/shopper")) {
      console.log("Found 'Max. 1 pcs/shopper' pattern in variant, setting quantity to 1");
      quantity = '1';
    } else {
      const qtyElements = [
        document.querySelector('.quantity--availText--EdCcDZ9'),
        document.querySelector('[data-spm-anchor-id*="available"]'),
        ...document.querySelectorAll('[data-spm-anchor-id*="quantity"]')
      ];

      for (const el of qtyElements) {
        if (el) {
          // Check for "Max. 1 pcs/shopper" in the element text
          if (el.textContent.includes("Max. 1 pcs/shopper")) {
            console.log("Found 'Max. 1 pcs/shopper' in quantity element for variant");
            quantity = '1';
            break;
          }
          
          const match = el.textContent.match(/(\d+)/);
          if (match && match[1]) {
            quantity = match[1];
            break;
          }
        }
      }

      // More general quantity search in text nodes
      if (quantity === '999') {
        const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let currentNode;
        while (currentNode = textNodes.nextNode()) {
          // Check for "Max. 1 pcs/shopper" pattern in text node
          if (currentNode.textContent.includes("Max. 1 pcs/shopper")) {
            console.log("Found 'Max. 1 pcs/shopper' in text node for variant");
            quantity = '1';
            break;
          }
          
          if (currentNode.textContent.match(/\b\d+\s+available\b/i)) {
            const match = currentNode.textContent.match(/(\d+)\s+available/i);
            if (match && match[1]) {
              quantity = match[1];
              break;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error extracting quantity for variant:", error);
  }

  // Check if the variant is available
  const isAvailable = !document.body.textContent.includes("Out of stock") &&
    !document.body.textContent.includes("Sold out");

  return {
    price,
    shipping,
    quantity,
    isAvailable
  };
}

// Function to scrape all variant combinations
async function scrapeAllVariantCombinations() {
  console.log("Starting to scrape all variant combinations...");

  // Store all variant combinations with their specific data
  const variantData = [];

  // Get all variation groups
  const variationGroups = document.querySelectorAll('.sku-item--property--HuasaIz, .sku-property-wrapper, [data-pl="sku-selector"]');

  if (variationGroups.length === 0) {
    console.log("No variation groups found");
    return null;
  }

  // Get all options for all variation groups
  const allGroupOptions = [];

  for (let i = 0; i < variationGroups.length; i++) {
    const group = variationGroups[i];

    // Get group name
    const groupTitleElement = group.querySelector('.sku-item--title--Z0HLO87, .sku-title, [data-pl="sku-title"]');
    if (!groupTitleElement) continue;

    let groupName = groupTitleElement.textContent.trim();
    groupName = groupName.replace(/\s*:\s*.*$/, '');

    // Find all available options for this group
    const options = [];

    // For image-based options
    const imageOptions = group.querySelectorAll('.sku-item--image--jMUnnGA:not(.sku-item--soldOut--YJfuCGq), .sku-property-item:not(.disabled):not(.soldout), [data-pl="sku-item"]:not(.disabled):not(.soldout)');

    imageOptions.forEach(optionElement => {
      const img = optionElement.querySelector('img');
      if (!img) return;

      const optionValue = img.getAttribute('alt') || '';
      if (optionValue) {
        options.push({
          element: optionElement,
          value: optionValue,
          type: 'image',
          groupName: groupName // Add group name to the option
        });
      }
    });

    // For text-based options
    const textOptions = group.querySelectorAll('.sku-item--text--hYfAukP:not(.sku-item--soldOut--YJfuCGq), .sku-property-text:not(.disabled):not(.soldout), [data-pl="sku-text"]:not(.disabled):not(.soldout)');

    textOptions.forEach(optionElement => {
      const optionValue = optionElement.getAttribute('title') || optionElement.textContent.trim();
      if (optionValue) {
        options.push({
          element: optionElement,
          value: optionValue,
          type: 'text',
          groupName: groupName // Add group name to the option
        });
      }
    });

    if (options.length > 0) {
      allGroupOptions.push({
        name: groupName,
        options: options
      });
    }
  }

  // If no options found, return
  if (allGroupOptions.length === 0) {
    console.log("No variation options found");
    return null;
  }

  console.log("Found variation groups:", allGroupOptions.length);
  allGroupOptions.forEach(group => {
    console.log(`Group: ${group.name}, Options: ${group.options.length}`);
  });

  // Function to recursively select all combinations of options
  async function selectCombination(groupIndex, selectedOptions = []) {
    // If we've selected an option for each group, capture the data
    if (groupIndex >= allGroupOptions.length) {
      // Wait for price and quantity to update after selection
      await new Promise(resolve => setTimeout(resolve, 700));

      // Get the variant-specific data
      const variantDetails = extractVariantDetails();

      // Create a record for this combination
      const record = {
        combination: selectedOptions.map(option => ({
          group: option.groupName,
          value: option.value,
          price: variantDetails.price,
          shipping: variantDetails.shipping,
          quantity: variantDetails.quantity,
          isAvailable: variantDetails.isAvailable
        })),
        price: variantDetails.price,
        shipping: variantDetails.shipping,
        quantity: variantDetails.quantity,
        isAvailable: variantDetails.isAvailable
      };

      console.log("Captured variant data:", record);
      variantData.push(record);

      // Wait a bit before moving to next combination
      await new Promise(resolve => setTimeout(resolve, 200));

      return;
    }

    // Try each option in the current group
    const currentGroup = allGroupOptions[groupIndex];

    for (const option of currentGroup.options) {
      try {
        // Select this option by clicking on it
        console.log(`Selecting ${currentGroup.name} = ${option.value}`);
        option.element.click();

        // Wait for the UI to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Continue to the next group
        await selectCombination(groupIndex + 1, [...selectedOptions, option]);
      } catch (error) {
        console.error(`Error selecting option ${option.value}:`, error);
      }
    }
  }

  // Start the recursive selection process
  await selectCombination(0);
  console.log("Completed variant data collection");

  return variantData;
}

// Function to update the variation data in the product structure
function updateProductWithVariantData(productData, variantData) {
  // Safety check
  if (!productData || !variantData || !Array.isArray(variantData) || variantData.length === 0) {
    console.log("No variant data to update");
    return productData;
  }

  // Clone the product data to avoid modifying the original
  const updatedProduct = JSON.parse(JSON.stringify(productData));

  // Process each variant combination
  variantData.forEach(variant => {
    try {
      // Create the variant details string (e.g., "Color=Red|Size=Small")
      let variantDetails = '';
      
      variant.combination.forEach((item, index) => {
        variantDetails += `${item.group}=${item.value}`;
        if (index < variant.combination.length - 1) {
          variantDetails += '|';
        }
      });

      console.log(`Looking for variant with details: ${variantDetails}`);

      // Find the matching variation in the product data
      if (updatedProduct.data && Array.isArray(updatedProduct.data)) {
        for (let i = 0; i < updatedProduct.data.length; i++) {
          const row = updatedProduct.data[i];

          // Log the current row for debugging
          console.log(`Checking row ${i}:`, row['Relationship'], row['Relationship details']);

          // Look for the variant row that matches this combination
          if (row['Relationship'] === 'Variation' &&
              row['Relationship details'] === variantDetails) {

            console.log(`Found matching variant row for: ${variantDetails}`);

            // Update the row with the variant-specific data
            if (variant.price) {
              row['ALI Price'] = variant.price;
              console.log(`Updated price to ${variant.price}`);
            }
            
            if (variant.shipping) {
              row['SHIP'] = variant.shipping;
              console.log(`Updated shipping to ${variant.shipping}`);
            }
            
            if (variant.quantity) {
              row['ALI Quantity'] = variant.quantity;
              console.log(`Updated quantity to ${variant.quantity}`);
            }
            
            // Make sure Ship to is preserved and not empty
            if (!row['Ship to'] && updatedProduct.data[0]['Ship to']) {
              row['Ship to'] = updatedProduct.data[0]['Ship to'];
              console.log(`Set Ship to from parent data: ${row['Ship to']}`);
            }

            // If the variant is not available, indicate that
            if (!variant.isAvailable) {
              row['ALI Quantity'] = '0';
              console.log('Set quantity to 0 as variant is not available');
            }

            // Calculate TOTAL if we have both price and shipping
            if (variant.price && variant.shipping) {
              const price = parseFloat(variant.price);
              const shipping = parseFloat(variant.shipping);
              if (!isNaN(price) && !isNaN(shipping)) {
                row['TOTAL'] = (price + shipping).toFixed(2);
                console.log(`Calculated TOTAL: ${row['TOTAL']}`);
              }
            }

            console.log(`Updated variant: ${variantDetails}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Error processing variant:`, error);
    }
  });

  return updatedProduct;
}

function extractWarningsAndDisclaimers() {
  try {
    // Target only the exact element with the specific class
    const warningElement = document.querySelector('.remind--msg--bmjMqyw');

    if (warningElement) {
      const warningText = warningElement.textContent.trim();
      console.log("Found warning element with class 'remind--msg--bmjMqyw':", warningText);
      return warningText;
    }

    // If not found, return empty string
    return '';
  } catch (error) {
    console.error("Error extracting warning:", error);
    return '';
  }
}

// Function to extract product sell points
function extractProductSellPoints() {
  const sellPoints = [];

  try {
    // Target the specific sell points container
    const sellPointContainers = document.querySelectorAll('.seo-sellpoints--sellerPoint--RcmFO_y, [class*="sellpoints"], [class*="sell-point"], [data-spm-anchor-id*="sellpoint"]');

    sellPointContainers.forEach(container => {
      const points = container.querySelectorAll('li');
      points.forEach(point => {
        // Check for pre tag first
        const preElement = point.querySelector('pre');
        const pointText = preElement ? preElement.textContent.trim() : point.textContent.trim();

        if (pointText) {
          sellPoints.push(pointText);
        }
      });
    });

    // If no specific sell points found, try to find feature lists
    if (sellPoints.length === 0) {
      const featureLists = document.querySelectorAll('.product-features, .feature-list, .product-highlights');

      featureLists.forEach(list => {
        const items = list.querySelectorAll('li');
        items.forEach(item => {
          const text = item.textContent.trim();
          if (text) {
            sellPoints.push(text);
          }
        });
      });
    }
  } catch (error) {
    console.error("Error extracting sell points:", error);
  }

  return sellPoints.join('\n');
}

// Function to extract video URLs
function extractVideoUrls() {
  const videos = [];

  try {
    // Look for video elements
    const videoElements = document.querySelectorAll('video');

    videoElements.forEach(video => {
      const sourceElements = video.querySelectorAll('source');

      if (sourceElements.length > 0) {
        // Get sources
        sourceElements.forEach(source => {
          const videoUrl = source.getAttribute('src');
          if (videoUrl && !videos.includes(videoUrl)) {
            videos.push(videoUrl);
          }
        });
      } else {
        // Check if video has src directly
        const videoSrc = video.getAttribute('src');
        if (videoSrc && !videos.includes(videoSrc)) {
          videos.push(videoSrc);
        }
      }

      // Get poster image as fallback
      const posterUrl = video.getAttribute('poster');
      if (posterUrl && videos.length === 0) {
        videos.push(`Poster: ${posterUrl}`);
      }
    });

    // Look for iframe videos (like YouTube)
    const iframeVideos = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]');
    iframeVideos.forEach(iframe => {
      const iframeSrc = iframe.getAttribute('src');
      if (iframeSrc && !videos.includes(iframeSrc)) {
        videos.push(iframeSrc);
      }
    });
  } catch (error) {
    console.error("Error extracting video URLs:", error);
  }

  return videos.join('\n');
}

// Complete rewrite of the specifications extractor
async function extractSpecifications() {
  console.log("Starting specifications extraction...");
  const specifications = {};

  try {
    // Step 1: Find the specifications container
    const specsContainer = document.getElementById('nav-specification') ||
      document.querySelector('.specification--wrap--lxVQ2tj') ||
      document.querySelector('[data-pl="product-specs"]');

    if (!specsContainer) {
      console.log("Specifications container not found");
      return specifications;
    }

    console.log("Found specifications container:", specsContainer);

    // Step 2: Try to find the View more button
    const viewMoreButton = specsContainer.querySelector('button');

    if (viewMoreButton && viewMoreButton.textContent.includes('View more')) {
      console.log("Found View more button, clicking it...");
      try {
        viewMoreButton.click();
        // Wait for expanded content to load
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log("Clicked View more button, waited for content to load");
      } catch (clickError) {
        console.error("Error clicking View more button:", clickError);
      }
    }

    // Step 3: Extract specification items
    // Try different selectors based on the HTML structure you provided
    const specRows = specsContainer.querySelectorAll('.specification--line--IXeRJI7') ||
      specsContainer.querySelectorAll('li');

    console.log(`Found ${specRows.length} specification rows`);

    for (const row of specRows) {
      const propContainers = row.querySelectorAll('.specification--prop--Jh28bKu');

      for (const propContainer of propContainers) {
        const titleElement = propContainer.querySelector('.specification--title--SfH3sA8');
        const valueElement = propContainer.querySelector('.specification--desc--Dxx6W0W');

        if (titleElement && valueElement) {
          const title = titleElement.textContent.trim();
          const value = valueElement.textContent.trim();

          specifications[title] = value;
          console.log(`Extracted specification: ${title} = ${value}`);
        }
      }
    }
    // Format the specifications as text
    if (Object.keys(specifications).length === 0) {
      return "";
    }

    // Convert to key-value pair text format
    let formattedSpecs = "";
    for (const [key, value] of Object.entries(specifications)) {
      formattedSpecs += `${key}: ${value}\n`;
    }

    return formattedSpecs;
  } catch (error) {
    console.error("Error extracting specifications:", error);
    return "";
  }
}

// Updated function to extract description with more robust approach and waiting for content to load
async function extractProductDescription() {
  console.log("Starting to extract product description...");
  
  try {
    // Focus on nav-description element and product-description ID
    const descContainer = document.getElementById('nav-description');
    
    if (descContainer) {
      console.log("Found nav-description container");
      
      // Try to find and click the "View more" button if it exists
      const viewMoreBtn = descContainer.querySelector('.extend--btn--TWsP5SV') || 
                          descContainer.querySelector('button:contains("View more")') ||
                          descContainer.querySelector('button[data-spm-anchor-id*="View more"]');
      
      if (viewMoreBtn) {
        console.log("Found View more button, clicking it");
        viewMoreBtn.click();
        
        // Wait for expanded content to load
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log("Waited for expanded content to load");
      }
      
      // Get the product-description element
      const descTextContainer = descContainer.querySelector('#product-description');
      
      if (descTextContainer) {
        console.log("Found product-description element");
        
        // Remove any script tags
        const scriptTags = descTextContainer.querySelectorAll('script');
        scriptTags.forEach(script => script.remove());
        
        const descText = descTextContainer.textContent.trim();
        if (descText && descText.length > 0) {
          console.log("Extracted description from product-description element:", descText.substring(0, 100) + "...");
          return descText;
        }
      }
    }
    
    console.log("Could not find product-description element");
    return "";
  } catch (error) {
    console.error("Error extracting product description:", error);
    return "";
  }
}

// Main function to scrape product data
async function scrapeProductData() {
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

  // Extract quantity information
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

    // First check for "Max. 1 pcs/shopper" pattern
    if (pageContent.includes("Max. 1 pcs/shopper")) {
      console.log("Found 'Max. 1 pcs/shopper' pattern, setting quantity to 1");
      quantity = '1';
    }
    
    // If quantity still not found, try all regular patterns
    if (!quantity) {
      // Try all patterns
      for (const pattern of qtyPatterns) {
        const regex = new RegExp(pattern, 'i');
        const match = pageContent.match(regex);
        if (match && match[1]) {
          quantity = match[1];
          break;
        }
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
          // Check for "Max. 1 pcs/shopper" in the element text
          if (el.textContent.includes("Max. 1 pcs/shopper")) {
            quantity = '1';
            break;
          }
          
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
        // Check for "Max. 1 pcs/shopper" pattern
        if (currentNode.textContent.includes("Max. 1 pcs/shopper")) {
          quantity = '1';
          break;
        }
        
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

  // Extract description using the enhanced method
  data.description = await extractProductDescription();
  console.log("Final extracted description length:", data.description ? data.description.length : 0);

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

  // Extract ship to country
  try {
    console.log("Attempting to extract ship to information");
    
    // Check for the specific structure first
    const deliveryContainer = document.querySelector('.delivery-v2--wrap--Z0JqOXJ');
    if (deliveryContainer) {
      console.log("Found delivery container with class delivery-v2--wrap--Z0JqOXJ");
      
      const shipToElement = deliveryContainer.querySelector('.delivery-v2--to--Mtweg7y');
      if (shipToElement) {
        const shipToText = shipToElement.textContent.trim();
        console.log("Found ship to element in container:", shipToText);
        
        // Try to extract just the country name if it's a full address
        const addressParts = shipToText.split(',');
        if (addressParts.length > 0) {
          // Get the last part which should be the country
          data.shipTo = addressParts[addressParts.length - 1].trim();
          console.log("Extracted country from address:", data.shipTo);
        } else {
          data.shipTo = shipToText;
        }
      }
    } else {
      // Try alternative selectors if the specific container is not found
      const shipToElement = document.querySelector('.delivery-v2--to--Mtweg7y') || 
        document.querySelector('[data-spm-anchor-id*="ship to"] span') || 
        document.querySelector('[data-spm-anchor-id*="ship-to"] span');
      
      if (shipToElement) {
        const shipToText = shipToElement.textContent.trim();
        console.log("Found ship to element with alternative selector:", shipToText);
        
        // Try to extract just the country name if it's a full address
        const addressParts = shipToText.split(',');
        if (addressParts.length > 0) {
          // Get the last part which should be the country
          data.shipTo = addressParts[addressParts.length - 1].trim();
          console.log("Extracted country from address:", data.shipTo);
        } else {
          data.shipTo = shipToText;
        }
      } else {
        // Try to find in text
        const shipToText = document.evaluate('//text()[contains(., "Ship to")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (shipToText) {
          const shipToLine = shipToText.textContent.trim();
          console.log("Found ship to text using XPath:", shipToLine);
          
          const shipToMatch = shipToLine.match(/Ship to\s*:\s*([A-Za-z]+)/i);
          if (shipToMatch && shipToMatch[1]) {
            data.shipTo = shipToMatch[1];
            console.log("Extracted country from text match:", data.shipTo);
          }
        }
      }
    }
    
    // If still not found, try one more generic approach
    if (!data.shipTo) {
      console.log("Ship to information not found with specific selectors, trying a more generic approach");
      // Look for any element that contains both "Ship to" and a country name
      const allElements = document.querySelectorAll('div, span');
      for (const el of allElements) {
        const text = el.textContent.trim();
        if (text.toLowerCase().includes('ship to') || text.toLowerCase().includes('shipping to')) {
          console.log("Found element with text containing 'ship to':", text);
          
          // Try to extract a country name using regex for common patterns
          const countryMatch = text.match(/(?:to|to:)\s*(?:[^,]*,\s*)*([A-Za-z\s]+)$/i);
          if (countryMatch && countryMatch[1]) {
            data.shipTo = countryMatch[1].trim();
            console.log("Extracted country using regex:", data.shipTo);
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error extracting ship to information:", error);
  }

  // NEW ADDITIONS: Extract additional data fields

  // 1. Extract warnings and disclaimers
  data.warnings = extractWarningsAndDisclaimers();
  console.log("Extracted warnings:", data.warnings);

  // 2. Extract product sell points
  data.productSellpoints = extractProductSellPoints();
  console.log("Extracted sell points:", data.productSellpoints);

  // 3. Extract video URLs
  data.videoUrls = extractVideoUrls();
  console.log("Extracted video URLs:", data.videoUrls);

  // 4. Extract detailed specifications - use await here
  data.detailedSpecifications = await extractSpecifications();
  console.log("Extracted detailed specifications:", data.detailedSpecifications);

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

// Function to extract shipping cost
function extractShippingCost() {
  let shippingCost = '0'; // Default to free shipping

  try {
    console.log("Starting to extract shipping cost...");
    
    // First, look specifically for the dynamic-shipping structure with the exact shipping price
    const shippingItems = document.querySelectorAll('.shipping--item--F04J6q9');
    console.log(`Found ${shippingItems.length} shipping items`);
    
    for (const item of shippingItems) {
      // Check for the dynamic shipping structure
      const dynamicShipping = item.querySelector('.dynamic-shipping');
      if (dynamicShipping) {
        console.log("Found dynamic-shipping container");
        
        // Look for the title layout that contains the shipping price
        const titleLayout = dynamicShipping.querySelector('.dynamic-shipping-line.dynamic-shipping-titleLayout');
        if (titleLayout) {
          console.log("Found dynamic-shipping-titleLayout");
          
          // Extract text and look for shipping price
          const titleText = titleLayout.textContent.trim();
          console.log("Shipping title text:", titleText);
          
          // Look for the specific "Shipping: $X.XX" pattern
          const shippingMatch = titleText.match(/Shipping:\s*\$(\d+\.\d+)/i);
          if (shippingMatch && shippingMatch[1]) {
            shippingCost = shippingMatch[1];
            console.log(`Extracted shipping cost from dynamic layout: $${shippingCost}`);
            return shippingCost;
          }
          
          // If no match with dollar sign, look for just numbers
          const numberMatch = titleText.match(/(\d+\.\d+)/);
          if (numberMatch && numberMatch[1]) {
            shippingCost = numberMatch[1];
            console.log(`Extracted shipping cost from numbers: $${shippingCost}`);
            return shippingCost;
          }
          
          if (titleText.toLowerCase().includes('free shipping')) {
            console.log("Found 'Free Shipping' text");
            if (titleText.toLowerCase().includes('free shipping over')) {
              console.log("Found 'Free Shipping over' text");
              return '1.99';
            }
            return '0.00';
          }
          
          // Check for free shipping text
          
          
        }
      }
    }
    
    // If we didn't find shipping cost in the specific structure, try alternative methods
    // Check if there's text about free shipping over $10
    const freeShippingOver10Text = document.body.textContent.match(/Free shipping over /i);
    if (freeShippingOver10Text) {
      console.log("Found 'Free shipping over $10.00' text");
      return '1.99'; // Default shipping cost for this case
    }

    // Get the current price
    const priceElement = document.querySelector('.price--currentPriceText--V8_y_b5') ||
      document.querySelector('.product-price-value') ||
      document.querySelector('.uniform-banner-box-price') ||
      document.querySelector('[data-pl="product-price"]');

    let currentPrice = 0;
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      const match = priceText.match(/[\d,.]+/);
      if (match) {
        currentPrice = parseFloat(match[0].replace(/,/g, ''));
      }
    }

    // General approach for any shipping text
    const shippingTexts = document.evaluate('//text()[contains(., "Shipping:")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < shippingTexts.snapshotLength; i++) {
      const text = shippingTexts.snapshotItem(i).textContent.trim();
      console.log("Found shipping text:", text);
      
      const shippingMatch = text.match(/Shipping:\s*\$?(\d+\.\d+)/i);
      if (shippingMatch && shippingMatch[1]) {
        shippingCost = shippingMatch[1];
        console.log(`Extracted shipping cost from text: $${shippingCost}`);
        return shippingCost;
      }
    }
    
    // Default logic based on price if we still don't have shipping cost
    if (currentPrice > 10) {
      console.log("Price over $10, setting shipping to $9");
      return '9.00';
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
          image: imageSrc,
          groupName: groupTitle // Store the group name with each option
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
          image: '', // No specific image for text-based variations
          groupName: groupTitle // Store the group name with each option
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
  let result = variationGroups[0].options.map(option => [{
    groupName: variationGroups[0].groupName,
    value: option.value,
    image: option.image || ''
  }]);

  // For each additional group, combine with existing results
  for (let i = 1; i < variationGroups.length; i++) {
    const currentGroup = variationGroups[i];
    const newResult = [];

    // For each existing combination
    for (let j = 0; j < result.length; j++) {
      const existingCombo = result[j];

      // Add each option from current group to create new combinations
      for (let k = 0; k < currentGroup.options.length; k++) {
        const option = currentGroup.options[k];
        newResult.push([...existingCombo, {
          groupName: currentGroup.groupName,
          value: option.value,
          image: option.image || ''
        }]);
      }
    }

    result = newResult;
  }

  return result;
}

// Updated function to format data for CSV based on the provided template
function formatDataForCSV(productData, startRowNumber = 1) {
  console.log("Starting formatDataForCSV with data:", JSON.stringify(productData, null, 2));
  const rows = [];
  let currentRowNumber = startRowNumber;

  // If there are no variations, just create a single row
  if (!productData.variations || productData.variations.length === 0) {
    console.log("No variations found, creating single row");
    const row = {
      '#': currentRowNumber,
      'SKU2': productData.customLabel || '',
      'Ebay#': '',
      'Person': '',
      'List Date': '',
      'Keywords': '',
      'URL': productData.url || '',
      'Store Name': productData.storeName || '',
      'Store no': productData.storeNo || '',
      'ALI Price': productData.price || '',
      'ALI Quantity': productData.quantity || '999',
      'SHIP': productData.shipping || '',
      'Ship to': productData.shipTo || 'US',
      'TOTAL': productData.total || '',
      'multiplier': '',
      'ALI Title': productData.title || '',
      'ALI Description': productData.description || '',
      'Specifications': productData.detailedSpecifications || '',
      'Warning/Disclaimer': productData.warnings || '',
      'Product sellpoints': productData.productSellpoints || '',
      'Scan Date': productData.scanDate || '',
      'Action': 'Add',
      'SKU': '',
      'Category ID': productData.categoryId || '',
      'Category Name': productData.categoryName || '',
      'Title': '',
      'Relationship': '',
      'Relationship details': '',
      'Schedule Time': '',
      'P:UPC': productData.upc || '',
      'P:EPID': productData.epid || '',
      'Start Price': '',
      'Quantity': '',
      'Item photo URL': productData.photos || '',
      'VideoID': productData.videoUrls || ''
    };

    console.log("Created single row:", JSON.stringify(row, null, 2));
    rows.push(row);
    return rows;
  }

  // Format variation options in the correct way for the parent row
  let relationshipDetails = '';

  // Format: Color=Red;Blue|Size=Small;Medium
  if (productData.variations && productData.variations.length > 0) {
    productData.variations.forEach((group, index) => {
      if (group.options && group.options.length > 0) {
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
  }

  console.log("Created relationship details:", relationshipDetails);

  // Parent row - if variations exist, leave price and quantity fields empty
  const parentRow = {
    '#': startRowNumber,
    'SKU2': productData.customLabel || '',
    'Ebay#': '',
    'Person': '',
    'List Date': '',
    'Keywords': '',
    'URL': productData.url || '',
    'Store Name': productData.storeName || (productData.store ? productData.store.name : ''),
    'Store no': productData.storeNo || (productData.store ? productData.store.id : ''),
    'ALI Price': '', // Empty for parent rows with variations
    'ALI Quantity': '', // Empty for parent rows with variations
    'SHIP': '', // Empty for parent rows with variations
    'Ship to': '', // Empty for parent rows with variations
    'TOTAL': '0', // Should be 0 for parent rows with variations
    'multiplier': '',
    'ALI Title': productData.title || '',
    'ALI Description': productData.description || '',
    'Specifications': productData.detailedSpecifications || '',
    'Warning/Disclaimer': productData.warnings || '',
    'Product sellpoints': productData.productSellpoints || '',
    'Scan Date': productData.scanDate || '',
    'Action': 'Add',
    'SKU': '',
    'Category ID': productData.categoryId || '',
    'Category Name': productData.categoryName || '',
    'Title': '',
    'Relationship': '',
    'Relationship details': relationshipDetails,
    'Schedule Time': '',
    'P:UPC': productData.upc || '',
    'P:EPID': productData.epid || '',
    'Start Price': '',
    'Quantity': '',
    'Item photo URL': productData.photos || '',
    'VideoID': productData.videoUrls || ''
  };

  console.log("Created parent row:", JSON.stringify(parentRow, null, 2));
  rows.push(parentRow);

  // Generate all possible combinations of variations
  if (productData.variations && productData.variations.length > 0) {
    // Create all combinations
    const allCombinations = generateAllCombinations(productData.variations);
    console.log("Generated combinations:", allCombinations.length);

    // For each combination, create a variation row
    allCombinations.forEach((combination, index) => {
      // Build the relationship details string (e.g., "Color=Red|Size=Small")
      let variantDetails = '';
      let skuSuffix = '';
      let variantPhotoStr = '';

      // Find the variant with image (typically the color variant)
      const imageVariant = combination.find(option => option.image && option.image.trim() !== '');
      
      // If we found a variant with an image
      if (imageVariant) {
        // Format as "GroupName=ImageURL"
        variantPhotoStr = `${imageVariant.groupName}=${imageVariant.image}`;
      }

      // Build relationship details
      combination.forEach((option, i) => {
        // Add to relationship details
        if (i > 0) {
          variantDetails += '|';
        }
        variantDetails += `${option.groupName}=${option.value}`;

        // Add to SKU suffix
        const safeValue = option.value.substring(0, 10).replace(/\s+/g, '').toUpperCase();
        skuSuffix += `-${safeValue}`;
      });
      
      // Build a custom label for this variation
      let variantCustomLabel = productData.customLabel;
      if (variantCustomLabel && skuSuffix) {
        variantCustomLabel += skuSuffix;
      }
      
      // Create a variation row
      const variantRow = {
        '#': startRowNumber + index + 1,
        'SKU2': variantCustomLabel || '',
        'Ebay#': '',
        'Person': '',
        'List Date': '',
        'Keywords': '',
        'URL': '', // Remove URL from variation rows
        'Store Name': '', // Remove Store Name from variation rows
        'Store no': '', // Remove Store no from variation rows
        'ALI Price': '', // Will be populated by updateProductWithVariantData
        'ALI Quantity': '', // Will be populated by updateProductWithVariantData
        'SHIP': '', // Will be populated by updateProductWithVariantData
        'Ship to': productData.shipTo || 'US', // Include ship to for variants
        'TOTAL': '',
        'multiplier': '',
        'ALI Title': '',
        'ALI Description': '',
        'Specifications': '',
        'Warning/Disclaimer': '',
        'Product sellpoints': '',
        'Scan Date': '',
        'Action': '', // Should be empty for variant rows
        'SKU': '',
        'Category ID': '',
        'Category Name': '',
        'Title': '',
        'Relationship': 'Variation',
        'Relationship details': variantDetails,
        'Schedule Time': '',
        'P:UPC': '',
        'P:EPID': '',
        'Start Price': '', // Empty Start Price for variations
        'Quantity': '', // Empty Quantity for variations
        'Item photo URL': variantPhotoStr || '',
        'VideoID': ''
      };

      console.log("Created variant row:", JSON.stringify(variantRow, null, 2));
      rows.push(variantRow);
    });
  }

  return rows;
}

// Helper function to convert to CSV
function convertToCSV(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return '';

  try {
    console.log("Starting CSV conversion with data:", JSON.stringify(data, null, 2));

    // Define the exact order of headers without duplicates
    const headers = [
      '#', 'SKU2', 'Ebay#', 'Person', 'List Date', 'Keywords', 'URL', 'Store Name', 'Store no', 'ALI Price', 'ALI Quantity', 'SHIP', 'Ship to', 'TOTAL', 'multiplier',
      'ALI Title', 'ALI Description', 'Specifications', 'Warning/Disclaimer', 'Product sellpoints', 'Scan Date',
      'Action', 'SKU', 'Category ID', 'Category Name', 'Title', 'Relationship', 'Relationship details', 'Schedule Time',
      'P:UPC', 'P:EPID', 'Start Price', 'Quantity', 'Item photo URL', 'VideoID'
    ];

    // Create CSV content with headers
    let csvContent = headers.map(header => {
      // Escape headers that contain commas or quotes
      if (header.includes(',') || header.includes('"')) {
        return `"${header.replace(/"/g, '""')}"`;
      }
      return header;
    }).join(',') + '\n';

    console.log("CSV headers:", csvContent);

    // Add data rows with row numbers
    data.forEach((row, index) => {
      const rowContent = headers.map(header => {
        let value = row[header] !== undefined ? row[header] : '';

        // Convert value to string if it's not already
        value = String(value);

        // Handle special cases that need escaping
        if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
          // Escape quotes by doubling them and wrap in quotes
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      }).join(',');

      csvContent += rowContent + '\n';
      console.log(`Row ${index + 1} CSV content:`, rowContent);
    });

    console.log("Final CSV content:", csvContent);
    return csvContent;
  } catch (error) {
    console.error("Error converting to CSV:", error);
    return '';
  }
}

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
      }

      resolve(isExpired);
    });
  });
}

// Initial setup when content script loads
checkExpiration().then(isExpired => {
  if (isExpired) {
    console.log("Extension has expired");
    return;
  }

  if (isProductPage()) {
    console.log("Initial page load - checking for product elements");
    waitForProductElements();
  }
});

// Setup navigation observer for dynamic page changes
checkExpiration().then(isExpired => {
  if (!isExpired) {
    setupNavigationObserver();
  }
});

// BunnyCDN Storage Configuration
const REGION = 'ny'; // If German region, set this to an empty string: ''
const BASE_HOSTNAME = 'storage.bunnycdn.com';
const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;
const STORAGE_ZONE_NAME = '';
const ACCESS_KEY = '';

// Function to upload an image to BunnyCDN
async function uploadImageToBunny(imageUrl, fileName) {
  try {
    console.log(`Uploading image: ${imageUrl} as ${fileName}`);
    
    // Fetch the image data
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const imageBlob = await response.blob();
    
    // Upload to BunnyCDN
    const uploadResponse = await fetch(`https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${fileName}`, {
      method: 'PUT',
      headers: {
        'AccessKey': ACCESS_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBlob
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to BunnyCDN: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    const cdnUrl = `https://${STORAGE_ZONE_NAME}.b-cdn.net/${fileName}`;
    console.log(`Image uploaded successfully: ${cdnUrl}`);
    return cdnUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

// Helper function to generate a unique filename for the image
function generateImageFilename(productId, index, variation = '') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const safeName = variation ? `-${variation.replace(/[^a-z0-9]/gi, '-')}` : '';
  return `product-${productId}-${index}${safeName}-${timestamp}-${random}.jpg`;
}

// Function to upload all product images and videos
async function uploadAllProductImages(productData) {
  const uploadStatus = {
    total: 0,
    completed: 0,
    failed: 0,
    urls: {}
  };
  
  // Create a container for upload status if it doesn't exist
  let uploadStatusDiv = document.getElementById('aliexpress-upload-status');
  if (!uploadStatusDiv) {
    uploadStatusDiv = document.createElement('div');
    uploadStatusDiv.id = 'aliexpress-upload-status';
    uploadStatusDiv.style.cssText = 'margin-top: 10px; background-color: #f5f5f5; padding: 8px; border-radius: 4px; font-size: 12px;';
    
    // Find scraper container and add the status div
    const scraperContainer = document.getElementById('aliexpress-scraper-container');
    if (scraperContainer) {
      scraperContainer.appendChild(uploadStatusDiv);
    }
  }
  
  uploadStatusDiv.innerHTML = 'Preparing to upload media...';
  
  // Get product ID from URL or use a fallback
  const urlMatch = productData.url.match(/\/(\d+)\.html/);
  const productId = urlMatch ? urlMatch[1] : Date.now().toString();
  
  // Upload main product images
  if (productData.imageData && productData.imageData.allImages) {
    const allImages = productData.imageData.allImages;
    uploadStatus.total += allImages.length;
    
    uploadStatusDiv.innerHTML = `Uploading product images: 0/${allImages.length}`;
    
    // Upload each image
    const uploadPromises = [];
    
    for (let i = 0; i < allImages.length; i++) {
      const imgUrl = allImages[i];
      const filename = generateImageFilename(productId, i);
      
      const uploadPromise = uploadImageToBunny(imgUrl, filename).then(cdnUrl => {
        if (cdnUrl) {
          uploadStatus.completed++;
          uploadStatus.urls[imgUrl] = cdnUrl;
        } else {
          uploadStatus.failed++;
        }
        
        uploadStatusDiv.innerHTML = `Uploading product images: ${uploadStatus.completed}/${allImages.length} (${uploadStatus.failed} failed)`;
        return cdnUrl;
      });
      
      uploadPromises.push(uploadPromise);
    }
    
    // Wait for all uploads to complete
    await Promise.all(uploadPromises);
  }
  
  // Upload variant images
  if (productData.imageData && productData.imageData.variantImages) {
    const variantImages = Array.from(productData.imageData.variantImages.entries());
    uploadStatus.total += variantImages.length;
    
    uploadStatusDiv.innerHTML = `Uploading variant images: 0/${variantImages.length}`;
    
    // Upload each variant image
    const variantUploadPromises = [];
    
    for (let i = 0; i < variantImages.length; i++) {
      const [variantName, imgUrl] = variantImages[i];
      const filename = generateImageFilename(productId, i, variantName);
      
      const uploadPromise = uploadImageToBunny(imgUrl, filename).then(cdnUrl => {
        if (cdnUrl) {
          uploadStatus.completed++;
          uploadStatus.urls[imgUrl] = cdnUrl;
        } else {
          uploadStatus.failed++;
        }
        
        uploadStatusDiv.innerHTML = `Uploading variant images: ${uploadStatus.completed - (uploadStatus.total - variantImages.length)}/${variantImages.length} (${uploadStatus.failed} failed)`;
        return cdnUrl;
      });
      
      variantUploadPromises.push(uploadPromise);
    }
    
    // Wait for all variant uploads to complete
    await Promise.all(variantUploadPromises);
  }
  
  // Upload videos if available
  const videoUrls = [];
  if (productData.videoUrls) {
    // Split by newline if it's a string with multiple URLs
    if (typeof productData.videoUrls === 'string') {
      const videoUrlList = productData.videoUrls.split('\n').filter(url => url.trim() !== '' && !url.startsWith('Poster:'));
      videoUrls.push(...videoUrlList);
    } else if (Array.isArray(productData.videoUrls)) {
      videoUrls.push(...productData.videoUrls.filter(url => !url.startsWith('Poster:')));
    }
  }
  
  if (videoUrls.length > 0) {
    uploadStatus.total += videoUrls.length;
    
    uploadStatusDiv.innerHTML = `Uploading videos: 0/${videoUrls.length}`;
    
    // Upload each video
    const videoUploadPromises = [];
    
    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i];
      // Skip if not a URL
      if (!videoUrl.startsWith('http')) {
        uploadStatus.completed++;
        continue;
      }
      
      const filename = generateVideoFilename(productId, i);
      
      const uploadPromise = uploadVideoToBunny(videoUrl, filename).then(cdnUrl => {
        if (cdnUrl) {
          uploadStatus.completed++;
          uploadStatus.urls[videoUrl] = cdnUrl;
        } else {
          uploadStatus.failed++;
        }
        
        uploadStatusDiv.innerHTML = `Uploading videos: ${uploadStatus.completed - (uploadStatus.total - videoUrls.length)}/${videoUrls.length} (${uploadStatus.failed} failed)`;
        return cdnUrl;
      });
      
      videoUploadPromises.push(uploadPromise);
    }
    
    // Wait for all video uploads to complete
    await Promise.all(videoUploadPromises);
  }
  
  // Update final status
  uploadStatusDiv.innerHTML = `All media uploads completed: ${uploadStatus.completed} successful, ${uploadStatus.failed} failed`;
  
  return uploadStatus;
}

// Function to replace original image URLs with CDN URLs in the product data
function updateProductImagesWithCdnUrls(productData, uploadStatus) {
  const urls = uploadStatus.urls;
  
  // Replace main product photos URL
  if (productData.photos) {
    const photoUrls = productData.photos.split('|');
    const updatedPhotoUrls = photoUrls.map(url => urls[url] || url);
    productData.photos = updatedPhotoUrls.join('|');
  }
  
  // Replace video URLs
  if (productData.videoUrls) {
    // Handle as string with newlines
    if (typeof productData.videoUrls === 'string') {
      const videoUrlList = productData.videoUrls.split('\n');
      const updatedVideoUrlList = videoUrlList.map(url => {
        // Skip poster images or empty lines
        if (url.trim() === '' || url.startsWith('Poster:')) {
          return url;
        }
        return urls[url] || url;
      });
      productData.videoUrls = updatedVideoUrlList.join('\n');
    } 
    // Handle as array
    else if (Array.isArray(productData.videoUrls)) {
      productData.videoUrls = productData.videoUrls.map(url => {
        if (url.startsWith('Poster:')) {
          return url;
        }
        return urls[url] || url;
      });
    }
  }
  
  // Replace URLs in variant photos
  if (productData.variations) {
    productData.variations.forEach(variation => {
      variation.options.forEach(option => {
        if (option.image && urls[option.image]) {
          option.image = urls[option.image];
        }
      });
    });
  }
  
  return productData;
}

// Function to upload a video to BunnyCDN
async function uploadVideoToBunny(videoUrl, fileName) {
  try {
    console.log(`Uploading video: ${videoUrl} as ${fileName}`);
    
    // Fetch the video data
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }
    
    const videoBlob = await response.blob();
    
    // Upload to BunnyCDN
    const uploadResponse = await fetch(`https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${fileName}`, {
      method: 'PUT',
      headers: {
        'AccessKey': ACCESS_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: videoBlob
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to BunnyCDN: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    const cdnUrl = `https://${STORAGE_ZONE_NAME}.b-cdn.net/${fileName}`;
    console.log(`Video uploaded successfully: ${cdnUrl}`);
    return cdnUrl;
  } catch (error) {
    console.error('Error uploading video:', error);
    return null;
  }
}

// Helper function to generate a unique filename for the video
function generateVideoFilename(productId, index) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `video-${productId}-${index}-${timestamp}-${random}.mp4`;
}