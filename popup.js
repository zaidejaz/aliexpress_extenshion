// AliExpress Scraper - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const productCountElement = document.getElementById('productCount');
  const lastScrapeDateElement = document.getElementById('lastScrapeDate');
  const productsListElement = document.getElementById('productsList');
  const noProductsElement = document.getElementById('noProducts');
  const searchBarElement = document.getElementById('searchBar');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const forceButtonBtn = document.getElementById('forceButtonBtn'); // New button to force create the scrape button
  
  // Modal elements
  const confirmModal = document.getElementById('confirmModal');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmModalBtn = document.getElementById('confirmModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  
  // Toast element
  const toastElement = document.getElementById('toast');
  
  // Store the current products data
  let products = [];
  
  // Keep track of current modal action
  let currentModalAction = null;
  let currentActionData = null;
  
  // Load and display products
  loadProducts();
  
  // Event listeners
  searchBarElement.addEventListener('input', filterProducts);
  downloadAllBtn.addEventListener('click', downloadAllProducts);
  clearAllBtn.addEventListener('click', () => showConfirmModal('clearAll'));
  cancelModalBtn.addEventListener('click', hideConfirmModal);
  confirmModalBtn.addEventListener('click', handleConfirmAction);
  
  // Force create button in active tab
  if (forceButtonBtn) {
    forceButtonBtn.addEventListener('click', forceCreateButton);
  }
  
  // Functions
  function loadProducts() {
    console.log("Loading products...");
    chrome.runtime.sendMessage({ action: 'getScrapedProducts' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading products:", chrome.runtime.lastError);
        showToast('Error loading products. Please try again.');
        return;
      }
      
      if (response && response.products) {
        products = response.products || [];
        console.log(`Loaded ${products.length} products`);
        updateProductStats();
        renderProducts(products);
      } else {
        console.warn("No products returned or invalid response", response);
        products = [];
        updateProductStats();
        renderProducts([]);
      }
    });
  }
  
  function updateProductStats() {
    productCountElement.textContent = products.length;
    
    // Find the latest scrape date
    if (products.length > 0) {
      try {
        const latestProduct = products.reduce((latest, current) => {
          return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
        }, products[0]);
        
        const date = new Date(latestProduct.timestamp);
        lastScrapeDateElement.textContent = formatDate(date);
      } catch (error) {
        console.error("Error updating product stats:", error);
        lastScrapeDateElement.textContent = '-';
      }
    } else {
      lastScrapeDateElement.textContent = '-';
    }
  }
  
  function formatDate(date) {
    try {
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return '-';
    }
  }
  
  function renderProducts(productsToRender) {
    console.log("Rendering products list...");
    
    // Safety check for the products list element
    if (!productsListElement) {
      console.error("Products list element not found");
      return;
    }
    
    // Clear the list first
    while (productsListElement.firstChild) {
      productsListElement.removeChild(productsListElement.firstChild);
    }
    
    // Show "no products" message if empty
    if (!productsToRender || productsToRender.length === 0) {
      if (noProductsElement) {
        noProductsElement.style.display = 'block';
      }
      return;
    }
    
    // Hide "no products" message
    if (noProductsElement) {
      noProductsElement.style.display = 'none';
    }
    
    // Sort products by date (newest first)
    let sortedProducts = [];
    try {
      sortedProducts = [...productsToRender].sort((a, b) => {
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });
    } catch (error) {
      console.error("Error sorting products:", error);
      sortedProducts = productsToRender;
    }
    
    // Create product items
    sortedProducts.forEach(product => {
      if (!product) return; // Skip undefined/null products
      
      try {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        
        // Get the first item's title (parent variation)
        let title = 'Untitled Product';
        let price = '';
        
        if (product.data && product.data.length > 0) {
          const firstItem = product.data[0];
          if (firstItem) {
            // Try to get title
            if (firstItem.Title) {
              title = firstItem.Title;
            } else if (firstItem.title) {
              title = firstItem.title;
            }
            
            // Try to get price
            if (firstItem.Price) {
              price = firstItem.Price;
            } else if (firstItem.price) {
              price = firstItem.price;
            }
          }
        }
        
        // Format date
        let formattedDate = '-';
        if (product.timestamp) {
          try {
            const date = new Date(product.timestamp);
            formattedDate = formatDate(date);
          } catch (error) {
            console.error("Error formatting product date:", error);
          }
        }
        
        // Extract variations count
        const variationsCount = product.data ? Math.max(0, product.data.length - 1) : 0;
        
        // Use HTML entities for icons that work across all browsers
        productItem.innerHTML = `
          <div class="product-info">
            <div class="product-title">${escapeHtml(title)}</div>
            <div class="product-meta">
              <span>${formattedDate}</span>
              ${price ? `<span>$${price}</span>` : ''}
              ${variationsCount > 0 ? `<span>${variationsCount} variations</span>` : ''}
            </div>
          </div>
          <div class="product-actions">
            <button class="action-btn download-btn" title="Download as CSV">Download</button>
            <button class="action-btn view-btn" title="View Details">View</button>
            <button class="action-btn delete-btn" title="Delete">Delete</button>
          </div>
        `;
        
        // Add event listeners
        const downloadBtn = productItem.querySelector('.download-btn');
        const viewBtn = productItem.querySelector('.view-btn');
        const deleteBtn = productItem.querySelector('.delete-btn');
        
        if (downloadBtn) downloadBtn.addEventListener('click', () => downloadProduct(product));
        if (viewBtn) viewBtn.addEventListener('click', () => viewProduct(product));
        if (deleteBtn) deleteBtn.addEventListener('click', () => showConfirmModal('deleteProduct', product));
        
        // Add to the list
        productsListElement.appendChild(productItem);
      } catch (error) {
        console.error("Error rendering product:", error, product);
      }
    });
    
    console.log("Products rendered successfully");
  }
  
  // Helper function to escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  function filterProducts() {
    const searchTerm = searchBarElement.value.toLowerCase().trim();
    
    if (searchTerm === '') {
      renderProducts(products);
      return;
    }
    
    try {
      const filteredProducts = products.filter(product => {
        if (!product || !product.data || !Array.isArray(product.data) || !product.data.length) {
          return false;
        }
        
        // Search in product title
        const firstItem = product.data[0];
        if (firstItem) {
          if ((firstItem.Title && firstItem.Title.toLowerCase().includes(searchTerm)) ||
              (firstItem.title && firstItem.title.toLowerCase().includes(searchTerm))) {
            return true;
          }
          
          // Search in product URL
          if (product.url && product.url.toLowerCase().includes(searchTerm)) {
            return true;
          }
          
          // Search in store name
          if ((firstItem['Store Name'] && firstItem['Store Name'].toLowerCase().includes(searchTerm)) ||
              (firstItem.storeName && firstItem.storeName.toLowerCase().includes(searchTerm))) {
            return true;
          }
        }
        
        return false;
      });
      
      renderProducts(filteredProducts);
    } catch (error) {
      console.error("Error filtering products:", error);
      renderProducts(products); // Fallback to showing all products
    }
  }
  
  function downloadProduct(product) {
    try {
      if (!product || !product.data || !Array.isArray(product.data)) {
        showToast('Invalid product data');
        return;
      }
      
      // Convert to CSV
      const csv = convertToCSV(product.data);
      
      // Create filename based on product info
      let filename = 'aliexpress-product-';
      if (product.data && product.data.length > 0) {
        const firstItem = product.data[0];
        if (firstItem['Custom Label (SKU)']) {
          filename += firstItem['Custom Label (SKU)'];
        } else if (firstItem.customLabel) {
          filename += firstItem.customLabel;
        } else {
          // Use date as fallback
          filename += formatDateFilename(new Date(product.timestamp || Date.now()));
        }
      } else {
        filename += Date.now();
      }
      filename += '.csv';
      
      // Download
      downloadCSV(csv, filename);
      showToast('Product downloaded as CSV');
    } catch (error) {
      console.error("Error downloading product:", error);
      showToast('Error downloading product');
    }
  }
  
  function viewProduct(product) {
    try {
      // Open the product URL in a new tab
      if (product && product.url) {
        chrome.tabs.create({ url: product.url });
      } else {
        showToast('Product URL not available');
      }
    } catch (error) {
      console.error("Error opening product URL:", error);
      showToast('Error opening product URL');
    }
  }
  
  function downloadAllProducts() {
    if (!products || products.length === 0) {
      showToast('No products to download');
      return;
    }
    
    try {
      // Combine all product data
      let allData = [];
      products.forEach(product => {
        if (product && product.data && Array.isArray(product.data)) {
          allData = allData.concat(product.data);
        }
      });
      
      if (allData.length === 0) {
        showToast('No valid product data to download');
        return;
      }
      
      // Convert to CSV
      const csv = convertToCSV(allData);
      
      // Create filename with date
      const filename = 'aliexpress-all-products-' + formatDateFilename(new Date()) + '.csv';
      
      // Download
      downloadCSV(csv, filename);
      showToast('All products downloaded as CSV');
    } catch (error) {
      console.error("Error downloading all products:", error);
      showToast('Error downloading all products');
    }
  }
  
  // Helper function to download CSV
  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  function convertToCSV(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return '';
    
    try {
      // Get all possible headers
      const headers = new Set();
      data.forEach(item => {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(key => {
            headers.add(key);
          });
        }
      });
      
      const headerArray = Array.from(headers);
      if (headerArray.length === 0) return '';
      
      // Create CSV content
      let csvContent = headerArray.join(',') + '\n';
      
      // Add data rows
      data.forEach(row => {
        if (!row || typeof row !== 'object') return;
        
        const rowContent = headerArray.map(header => {
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
    } catch (error) {
      console.error("Error converting to CSV:", error);
      throw error;
    }
  }
  
  function formatDateFilename(date) {
    try {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch (error) {
      console.error("Error formatting date for filename:", error);
      return new Date().toISOString().split('T')[0]; // Fallback to current date
    }
  }
  
  function deleteProduct(productId) {
    if (!productId) {
      showToast('Invalid product ID');
      return;
    }
    
    chrome.runtime.sendMessage({ 
      action: 'deleteProduct', 
      productId: productId 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error deleting product:", chrome.runtime.lastError);
        showToast('Error deleting product');
        return;
      }
      
      if (response && response.success) {
        // Remove from local array
        products = products.filter(p => p.id !== productId);
        
        // Update UI
        updateProductStats();
        renderProducts(products);
        
        showToast('Product deleted successfully');
      } else {
        showToast('Error deleting product');
      }
    });
  }
  
  function clearAllData() {
    chrome.runtime.sendMessage({ action: 'clearData' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error clearing data:", chrome.runtime.lastError);
        showToast('Error clearing data');
        return;
      }
      
      if (response && response.success) {
        // Clear local array
        products = [];
        
        // Update UI
        updateProductStats();
        renderProducts(products);
        
        showToast('All data cleared successfully');
      } else {
        showToast('Error clearing data');
      }
    });
  }
  
  function forceCreateButton() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting active tab:", chrome.runtime.lastError);
        showToast('Error getting active tab');
        return;
      }
      
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'forceCreateButton'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error forcing button creation:", chrome.runtime.lastError);
            showToast('Error: Make sure you are on an AliExpress product page');
            return;
          }
          
          showToast('Scrape button should now appear on the page');
        });
      } else {
        showToast('No active tab found');
      }
    });
  }
  
  function showConfirmModal(action, data = null) {
    currentModalAction = action;
    currentActionData = data;
    
    if (action === 'deleteProduct') {
      confirmTitle.textContent = 'Delete Product?';
      confirmMessage.textContent = 'Are you sure you want to delete this product? This action cannot be undone.';
    } else if (action === 'clearAll') {
      confirmTitle.textContent = 'Clear All Data?';
      confirmMessage.textContent = 'Are you sure you want to delete ALL saved products? This action cannot be undone.';
    }
    
    confirmModal.style.display = 'flex';
  }
  
  function hideConfirmModal() {
    confirmModal.style.display = 'none';
    currentModalAction = null;
    currentActionData = null;
  }
  
  function handleConfirmAction() {
    try {
      if (currentModalAction === 'deleteProduct' && currentActionData) {
        deleteProduct(currentActionData.id);
      } else if (currentModalAction === 'clearAll') {
        clearAllData();
      }
    } catch (error) {
      console.error("Error handling confirm action:", error);
      showToast('An error occurred');
    }
    
    hideConfirmModal();
  }
  
  function showToast(message) {
    if (!toastElement) {
      console.error("Toast element not found");
      return;
    }
    
    toastElement.textContent = message;
    toastElement.classList.add('show');
    
    setTimeout(() => {
      toastElement.classList.remove('show');
    }, 3000);
  }
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateStats') {
      loadProducts(); // Reload products when stats are updated
    }
  });

  // Add refresh button functionality
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadProducts();
      showToast('Products refreshed');
    });
  }
});