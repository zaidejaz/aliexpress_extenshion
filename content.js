// AliExpress Scraper - Content Script with Dynamic Variant Scraping
// This version is designed to be loaded dynamically from a server

(function () {
  // Set a flag to prevent multiple instances
  if (window.aliexpressScraperInitialized) {
    console.log("AliExpress Scraper already initialized, skipping");
    return;
  }
  window.aliexpressScraperInitialized = true;

  console.log("AliExpress Scraper: Content script loaded from server");

  // Main initialization
  initializeScraper();

  // Main initialization function
  function initializeScraper() {
    console.log("Initializing scraper...");
    // Add a small delay to ensure the page has rendered properly
    setTimeout(() => {
      waitForProductElements();
    }, 1000);
  }

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
        const productData = scrapeProductData();
        console.log("Scraped basic product data:", productData);

        // Update status
        statusDiv.textContent = 'Scraping variants (this may take a moment)...';

        // Scrape all variant combinations
        const variantData = await scrapeAllVariantCombinations();
        console.log("Scraped variant data:", variantData);

        // Show progress update
        statusDiv.textContent = 'Processing variant data...';

        // Format data for CSV
        let formattedData = formatDataForCSV(productData);

        // If we have variant data, update the product with it
        if (variantData && variantData.length > 0) {
          const updatedProductData = updateProductWithVariantData({ data: formattedData }, variantData);
          formattedData = updatedProductData.data;
        }

        // Store the formatted data
        scrapedData = formattedData;
        console.log("Formatted CSV data:", scrapedData);

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

    console.log("Not a product page:", currentUrl);
    return false;
  }

  // Listen for commands from the loader script
  document.addEventListener('aliexpressScraper:createButton', () => {
    console.log("Received createButton command from loader");
    waitForProductElements();
  });

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
      console.log("Received force create button command via chrome messaging");
      waitForProductElements();
      sendResponse({ success: true });
    } else if (message.action === 'updateContentScript') {
      // Script update notification received - reload the page to get the new version
      console.log("Content script update notification received, version:", message.version);

      // Show an update notification
      const notificationDiv = document.createElement('div');
      notificationDiv.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background-color: #4CAF50; color: white; padding: 15px; border-radius: 4px; z-index: 9999999; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-family: Arial, sans-serif;';
      notificationDiv.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold;">AliExpress Scraper Updated</div>
        <div>The scraper has been updated to version ${message.version}.</div>
        <button id="aliexpress-reload-btn" style="background-color: white; color: #4CAF50; border: none; padding: 5px 10px; margin-top: 10px; border-radius: 3px; cursor: pointer;">Reload Now</button>
      `;

      document.body.appendChild(notificationDiv);

      // Add reload button handler
      document.getElementById('aliexpress-reload-btn').addEventListener('click', function () {
        window.location.reload();
      });

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

      // More general quantity search in text nodes
      if (quantity === '999') {
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
    } catch (error) {
      console.error("Error extracting quantity:", error);
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
            type: 'image'
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
            type: 'text'
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
          combination: selectedOptions.map((option, index) => ({
            group: allGroupOptions[index].name,
            value: option.value
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
      // Create the variant details string (e.g., "Color=Red|Size=Small")
      let variantDetails = '';
      const skuParts = [];

      variant.combination.forEach((item, index) => {
        variantDetails += `${item.group}=${item.value}`;
        if (index < variant.combination.length - 1) {
          variantDetails += '|';
        }

        // Create SKU part
        const safeValue = item.value.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        skuParts.push(safeValue);
      });

      // Find the matching variation in the product data
      if (updatedProduct.data && Array.isArray(updatedProduct.data)) {
        for (let i = 0; i < updatedProduct.data.length; i++) {
          const row = updatedProduct.data[i];

          // Look for the variant row that matches this combination
          if (row['Relationship'] === 'Variation' &&
            row['Relationship details'] === variantDetails) {

            // Update the row with the variant-specific data
            if (variant.price) row['Price'] = variant.price;
            if (variant.shipping) row['SHIP'] = variant.shipping;
            if (variant.quantity) row['Quantity'] = variant.quantity;

            // Also update the total if we have both price and shipping
            if (variant.price && variant.shipping) {
              row['TOTAL'] = (parseFloat(variant.price) + parseFloat(variant.shipping)).toFixed(2);
            }

            // If the variant is not available, set quantity to 0
            if (!variant.isAvailable) {
              row['Quantity'] = '0';
            }

            console.log(`Updated variant: ${variantDetails}`);
            break;
          }
        }
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

    // 4. Extract detailed specifications
    extractSpecifications().then(specs => {
      data.detailedSpecifications = specs;
      console.log("Extracted detailed specifications:", data.detailedSpecifications);
    });

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

  // Updated function to format data for CSV based on the provided template
  function formatDataForCSV(productData) {
    const rows = [];

    // If there are no variations, just create a single row
    if (!productData.variations || productData.variations.length === 0) {
      const row = {
        '#': 1,
        'SKU': productData.customLabel || '',
        'Ebay#': '',
        'Person': '',
        'List date': '',
        'Keyword': '',
        'URL': productData.url || '',
        'Store Name': productData.storeName || '',
        'Store no': productData.storeNo || '',
        'Price': productData.price || '',
        'Quantity': productData.quantity || '999',
        'SHIP': productData.shipping || '',
        'Ship to': productData.shipTo || 'US',
        'TOTAL': productData.total || '',
        'multiplier': '',
        'Title': productData.title || '',
        'Description': productData.description || '',
        'Specifications': productData.detailedSpecifications || '',
        'Warning/Disclaimer': productData.warnings || '',
        'Product sellpoints': productData.productSellpoints || '',
        'Scan Date': productData.scanDate || '',
        'Action': 'Add',
        'SKU': productData.customLabel || '',
        'Category ID': productData.categoryId || '',
        'Category Name': productData.categoryName || '',
        'Title': '',
        'Relationship': '',
        'Relationship details': '',
        'Schedule Time': '',
        'P:UPC': productData.upc || '',
        'P:EPID': productData.epid || '',
        'Start price': '',
        'Quantity': '',
        'Item photo URL': productData.photos || '',
        'VideoID': productData.videoUrls || '',
        'Condition ID': '',
        'Description.1': productData.description || '',
        'Format': '',
        'Duration': '',
        'Buy It Now price': '',
        'Best Offer Enabled': '',
        'Best Offer Auto Accept Price': '',
        'Minimum Best Offer Price': '',
        'Immediate pay required': '',
        'Location': '',
        'Shipping service 1 option': '',
        'Shipping service 1 cost': '',
        'Shipping service 1 priority': '',
        'Shipping service 2 option': '',
        'Shipping service 2 cost': '',
        'Shipping service 2 priority': '',
        'Max dispatch time': '',
        'Returns accepted option': '',
        'Returns within option': '',
        'Refund option': '',
        'Return shipping cost paid by': '',
        'Shipping profile name': '',
        'Return profile name': '',
        'Payment profile name': ''
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
      'SKU': productData.customLabel || '',
      'Ebay#': '',
      'Person': '',
      'List date': '',
      'Keyword': '',
      'URL': productData.url || '',
      'Store Name': productData.storeName || '',
      'Store no': productData.storeNo || '',
      'Price': productData.price || '',
      'Quantity': productData.quantity || '999',
      'SHIP': productData.shipping || '',
      'Ship to': productData.shipTo || 'US',
      'TOTAL': productData.total || '',
      'multiplier': '',
      'Title': productData.title || '',
      'Description': productData.description || '',
      'Specifications': productData.detailedSpecifications || '',
      'Warning/Disclaimer': productData.warnings || '',
      'Product sellpoints': productData.productSellpoints || '',
      'Scan Date': productData.scanDate || '',
      'Action': 'Add',
      'SKU': productData.customLabel || '',
      'Category ID': productData.categoryId || '',
      'Category Name': productData.categoryName || '',
      'Title': '',
      'Relationship': '',
      'Relationship details': relationshipDetails,
      'Schedule Time': '',
      'P:UPC': productData.upc || '',
      'P:EPID': productData.epid || '',
      'Start price': '',
      'Quantity.1': '',
      'Item photo URL': productData.photos || '',
      'VideoID': productData.videoUrls || '',
      'Condition ID': '',
      'Description.1': productData.description || '',
      'Format': '',
      'Duration': '',
      'Buy It Now price': '',
      'Best Offer Enabled': '',
      'Best Offer Auto Accept Price': '',
      'Minimum Best Offer Price': '',
      'Immediate pay required': '',
      'Location': '',
      'Shipping service 1 option': '',
      'Shipping service 1 cost': '',
      'Shipping service 1 priority': '',
      'Shipping service 2 option': '',
      'Shipping service 2 cost': '',
      'Shipping service 2 priority': '',
      'Max dispatch time': '',
      'Returns accepted option': '',
      'Returns within option': '',
      'Refund option': '',
      'Return shipping cost paid by': '',
      'Shipping profile name': '',
      'Return profile name': '',
      'Payment profile name': ''
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
          'SKU': `${productData.customLabel}-${skuSuffix}`,
          'Ebay#': '',
          'Person': '',
          'List date': '',
          'Keyword': '',
          'URL': '',
          'Store Name': '',
          'Store no': '',
          'Price': productData.price || '',
          'Quantity': productData.quantity || '999',
          'SHIP': productData.shipping || '',
          'Ship to': productData.shipTo || 'US',
          'TOTAL': productData.total || '',
          'multiplier': '',
          'Title': '',
          'Description': '',
          'Specifications': '',
          'Warning/Disclaimer': '',
          'Product sellpoints': '',
          'Scan Date': '',
          'Action': '',
          'SKU': `${productData.customLabel}-${skuSuffix}`,
          'Category ID': '',
          'Category Name': '',
          'Title': '',
          'Relationship': 'Variation',
          'Relationship details': variantDetails,
          'Schedule Time': '',
          'P:UPC': productData.upc || '',
          'P:EPID': productData.epid || '',
          'Start price': '',
          'Quantity': '',
          'Item photo URL': itemPhotoURL || '',
          'VideoID': '',
          'Condition ID': '',
          'Description.1': '',
          'Format': '',
          'Duration': '',
          'Buy It Now price': '',
          'Best Offer Enabled': '',
          'Best Offer Auto Accept Price': '',
          'Minimum Best Offer Price': '',
          'Immediate pay required': '',
          'Location': '',
          'Shipping service 1 option': '',
          'Shipping service 1 cost': '',
          'Shipping service 1 priority': '',
          'Shipping service 2 option': '',
          'Shipping service 2 cost': '',
          'Shipping service 2 priority': '',
          'Max dispatch time': '',
          'Returns accepted option': '',
          'Returns within option': '',
          'Refund option': '',
          'Return shipping cost paid by': '',
          'Shipping profile name': '',
          'Return profile name': '',
          'Payment profile name': ''
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
          'SKU': `${productData.customLabel}-${safeValue}`,
          'Ebay#': '',
          'Person': '',
          'List date': '',
          'Keyword': '',
          'URL': '',
          'Store Name': '',
          'Store no': '',
          'Price': productData.price || '',
          'Quantity': productData.quantity || '999',
          'SHIP': productData.shipping || '',
          'Ship to': productData.shipTo || 'US',
          'TOTAL': productData.total || '',
          'multiplier': '',
          'Title': '',
          'Description': '',
          'Specifications': '',
          'Warning/Disclaimer': '',
          'Product sellpoints': '',
          'Scan Date': '',
          'Action': '',
          'SKU': `${productData.customLabel}-${safeValue}`,
          'Category ID': '',
          'Category Name': '',
          'Title': '',
          'Relationship': 'Variation',
          'Relationship details': `${group.groupName}=${option.value}`,
          'Schedule Time': '',
          'P:UPC': productData.upc || '',
          'P:EPID': productData.epid || '',
          'Start price': '',
          'Quantity': '',
          'Item photo URL': option.image || '',
          'VideoID': '',
          'Condition ID': '',
          'Description.1': '',
          'Format': '',
          'Duration': '',
          'Buy It Now price': '',
          'Best Offer Enabled': '',
          'Best Offer Auto Accept Price': '',
          'Minimum Best Offer Price': '',
          'Immediate pay required': '',
          'Location': '',
          'Shipping service 1 option': '',
          'Shipping service 1 cost': '',
          'Shipping service 1 priority': '',
          'Shipping service 2 option': '',
          'Shipping service 2 cost': '',
          'Shipping service 2 priority': '',
          'Max dispatch time': '',
          'Returns accepted option': '',
          'Returns within option': '',
          'Refund option': '',
          'Return shipping cost paid by': '',
          'Shipping profile name': '',
          'Return profile name': '',
          'Payment profile name': ''
        };

        rows.push(variationRow);
      });
    }

    return rows;
  }

  // Helper function to convert to CSV
  function convertToCSV(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return '';

    try {
      // Get all column headers
      const headers = [
        '#', 'SKU', 'Ebay#', 'Person', 'List date', 'Keyword', 'URL', 'Store Name', 'Store no',
        'Price', 'Quantity', 'SHIP', 'Ship to', 'TOTAL', 'multiplier', 'Title', 'Description',
        'Specifications', 'Warning/Disclaimer', 'Product sellpoints', 'Scan Date', 'Action',
        'SKU', 'Category ID', 'Category Name', 'Title', 'Relationship', 'Relationship details',
        'Schedule Time', 'P:UPC', 'P:EPID', 'Start price', 'Quantity', 'Item photo URL',
        'VideoID'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      // Add data rows
      data.forEach(row => {
        const rowContent = headers.map(header => {
          let value = row[header] !== undefined ? row[header] : '';

          // Handle special cases like Description that might contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }

          return value;
        }).join(',');

        csvContent += rowContent + '\n';
      });

      return csvContent;
    } catch (error) {
      console.error("Error converting to CSV:", error);
      return '';
    }
  }
})();