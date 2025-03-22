// AliExpress Scraper - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const sheetIdInput = document.getElementById('sheetId');
  const sheetNameInput = document.getElementById('sheetName');
  const functionTypeSelect = document.getElementById('functionType');
  const startRowInput = document.getElementById('startRow');
  const endRowInput = document.getElementById('endRow');
  const rowRangeContainer = document.getElementById('rowRangeContainer');
  
  const setDataBtn = document.getElementById('setDataBtn');
  const stopBtn = document.getElementById('stopBtn');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const setupAuthBtn = document.getElementById('setupAuthBtn');
  
  const totalUrlsElement = document.getElementById('totalUrls');
  const processedUrlsElement = document.getElementById('processedUrls');
  const remainingUrlsElement = document.getElementById('remainingUrls');
  const authStatusElement = document.getElementById('authStatus');
  
  // Check if user is authenticated with Google
  checkGoogleAuth();
  
  // Load saved settings from storage
  chrome.storage.sync.get([
    'googleSheetId', 
    'googleSheetName', 
    'functionType', 
    'startRow', 
    'endRow',
    'stats'
  ], (result) => {
    if (result.googleSheetId) sheetIdInput.value = result.googleSheetId;
    if (result.googleSheetName) sheetNameInput.value = result.googleSheetName;
    if (result.functionType) functionTypeSelect.value = result.functionType;
    if (result.startRow) startRowInput.value = result.startRow;
    if (result.endRow) endRowInput.value = result.endRow;
    
    // Update stats display
    if (result.stats) {
      totalUrlsElement.textContent = result.stats.total || 0;
      processedUrlsElement.textContent = result.stats.processed || 0;
      remainingUrlsElement.textContent = result.stats.remaining || 0;
    }
    
    // Toggle row range visibility based on function type
    toggleRowRangeVisibility(functionTypeSelect.value);
  });
  
  // Toggle row range inputs visibility based on function type
  functionTypeSelect.addEventListener('change', () => {
    toggleRowRangeVisibility(functionTypeSelect.value);
  });
  
  function toggleRowRangeVisibility(functionType) {
    if (functionType === 'Scrape') {
      rowRangeContainer.style.display = 'none';
    } else {
      rowRangeContainer.style.display = 'flex';
    }
  }
  
  // Setup Auth button click handler
  setupAuthBtn.addEventListener('click', () => {
    authenticateWithGoogle();
  });
  
  // Set Data button click handler
  setDataBtn.addEventListener('click', () => {
    // Validate inputs
    if (!sheetIdInput.value) {
      alert('Please enter a Google Sheet ID');
      return;
    }
    
    if (!sheetNameInput.value) {
      alert('Please enter a Sheet Name');
      return;
    }
    
    // For URL and Part data, validate row range
    if (functionTypeSelect.value !== 'Scrape') {
      if (!startRowInput.value || !endRowInput.value) {
        alert('Please enter Start Row and End Row');
        return;
      }
      
      if (parseInt(startRowInput.value) > parseInt(endRowInput.value)) {
        alert('Start Row cannot be greater than End Row');
        return;
      }
    }
    
    // Save settings to storage
    const settings = {
      googleSheetId: sheetIdInput.value,
      googleSheetName: sheetNameInput.value,
      functionType: functionTypeSelect.value,
      startRow: startRowInput.value,
      endRow: endRowInput.value
    };
    
    chrome.storage.sync.set(settings, () => {
      // Send message to content script with updated settings
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            settings: settings
          }).catch(err => {
            console.log('Could not send message to tab', err);
            // Still show success even if the tab doesn't have the content script loaded
            showSaveSuccess();
          });
        }
      });
      
      // Show success message
      showSaveSuccess();
    });
  });
  
  function showSaveSuccess() {
    setDataBtn.textContent = 'Saved!';
    setTimeout(() => {
      setDataBtn.textContent = 'Set Data';
    }, 2000);
  }
  
  // Stop button click handler
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopScraping' });
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopScraping' })
          .catch(err => console.log('Could not send message to tab', err));
      }
    });
    
    stopBtn.textContent = 'Stopped!';
    setTimeout(() => {
      stopBtn.textContent = 'Stop';
    }, 2000);
  });
  
  // Clear Data button click handler
  clearDataBtn.addEventListener('click', () => {
    // Reset stats
    const stats = {
      total: 0,
      processed: 0,
      remaining: 0
    };
    
    chrome.storage.sync.set({ stats }, () => {
      // Update display
      totalUrlsElement.textContent = '0';
      processedUrlsElement.textContent = '0';
      remainingUrlsElement.textContent = '0';
      
      // Send message to background script
      chrome.runtime.sendMessage({ 
        action: 'clearData',
        stats: stats
      });
      
      // Send message to content script
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'clearData',
            stats: stats
          }).catch(err => console.log('Could not send message to tab', err));
        }
      });
      
      // Show success message
      clearDataBtn.textContent = 'Cleared!';
      setTimeout(() => {
        clearDataBtn.textContent = 'Clear Data';
      }, 2000);
    });
  });
  
  // Listen for stats updates from content script or background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateStats' && message.stats) {
      totalUrlsElement.textContent = message.stats.total || 0;
      processedUrlsElement.textContent = message.stats.processed || 0;
      remainingUrlsElement.textContent = message.stats.remaining || 0;
    }
  });
  
  // Functions to handle Google authentication
  function checkGoogleAuth() {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError || !token) {
        authStatusElement.textContent = 'Not authenticated';
        authStatusElement.style.color = '#F44336';
        setupAuthBtn.style.display = 'block';
      } else {
        authStatusElement.textContent = 'Authenticated';
        authStatusElement.style.color = '#4CAF50';
        setupAuthBtn.style.display = 'none';
      }
    });
  }
  
  function authenticateWithGoogle() {
    setupAuthBtn.textContent = 'Authenticating...';
    setupAuthBtn.disabled = true;
    
    chrome.identity.getAuthToken({ 
      interactive: true 
    }, (token) => {
      if (chrome.runtime.lastError || !token) {
        // Handle error
        console.error(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'No token received');
      } else {
        // Authentication successful
        console.log('Authentication successful');
      }
    });
  }
});