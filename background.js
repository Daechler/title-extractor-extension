// Background script for Title Extractor extension

// Ensure browser API compatibility
if (typeof browser === "undefined") {
  var browser = chrome;
}

// Store for saved titles
let savedTitles = [];

// Load saved titles from storage on startup
browser.storage.local.get(['savedTitles']).then((result) => {
  if (result.savedTitles) {
    savedTitles = result.savedTitles;
  }
});

// Function to save title with timestamp and URL
function saveTitle(title, url, tabId) {
  // Skip empty titles, loading states, and internal pages
  if (!title || 
      title === 'Loading...' || 
      title === 'New Tab' ||
      url.startsWith('moz-extension:') ||
      url.startsWith('about:') ||
      url.startsWith('chrome:') ||
      url.startsWith('chrome-extension:')) {
    return;
  }

  const titleEntry = {
    title: title,
    url: url,
    timestamp: new Date().toISOString(),
    tabId: tabId
  };

  // Check if we already have this exact title and URL combination
  const duplicate = savedTitles.find(entry => 
    entry.title === title && entry.url === url
  );

  if (!duplicate) {
    savedTitles.unshift(titleEntry); // Add to beginning of array
    
    // Keep only the last 1000 entries to prevent unlimited growth
    if (savedTitles.length > 1000) {
      savedTitles = savedTitles.slice(0, 1000);
    }
    
    // Save to storage
    browser.storage.local.set({ savedTitles: savedTitles });
    
    console.log('Title saved:', title, 'from', url);
  }
}

// Listen for tab creation
browser.tabs.onCreated.addListener((tab) => {
  if (tab.title && tab.url) {
    saveTitle(tab.title, tab.url, tab.id);
  }
});

// Listen for tab updates (when page loads, title changes, etc.)
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process when the title or URL changes and the tab is loading or complete
  if ((changeInfo.title || changeInfo.url) && tab.title && tab.url) {
    // Wait a moment for the title to fully load
    setTimeout(() => {
      browser.tabs.get(tabId).then((updatedTab) => {
        if (updatedTab.title && updatedTab.url) {
          saveTitle(updatedTab.title, updatedTab.url, tabId);
        }
      }).catch((error) => {
        // Tab might have been closed, ignore error
        console.log('Tab no longer exists:', error);
      });
    }, 500);
  }
});

// Listen for tab activation (when switching between tabs)
browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.get(activeInfo.tabId).then((tab) => {
    if (tab.title && tab.url) {
      saveTitle(tab.title, tab.url, tab.id);
    }
  }).catch((error) => {
    console.log('Could not get active tab:', error);
  });
});

// Function to clear all saved titles (can be called from popup)
function clearAllTitles() {
  savedTitles = [];
  browser.storage.local.set({ savedTitles: savedTitles });
}

// Function to export titles as JSON
function exportTitles() {
  return savedTitles;
}

// Make functions available to popup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clearAllTitles, exportTitles };
}