// Popup script for Title Extractor extension

// Ensure browser API compatibility
if (typeof browser === "undefined") {
  var browser = chrome;
}

let allTitles = [];
let filteredTitles = [];

// DOM elements
const titlesList = document.getElementById('titlesList');
const titleCount = document.getElementById('titleCount');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const noTitles = document.getElementById('noTitles');

// Load and display titles when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadTitles();
  
  // Set up event listeners
  searchInput.addEventListener('input', handleSearch);
  exportBtn.addEventListener('click', exportTitles);
  clearBtn.addEventListener('click', clearAllTitles);
});

// Load titles from storage
function loadTitles() {
  browser.storage.local.get(['savedTitles']).then((result) => {
    allTitles = result.savedTitles || [];
    filteredTitles = [...allTitles];
    displayTitles();
    updateStats();
  });
}

// Display titles in the popup
function displayTitles() {
  if (filteredTitles.length === 0) {
    titlesList.style.display = 'none';
    noTitles.style.display = 'block';
    return;
  }
  
  titlesList.style.display = 'block';
  noTitles.style.display = 'none';
  
  titlesList.innerHTML = '';
  
  filteredTitles.forEach((entry, index) => {
    const titleElement = createTitleElement(entry, index);
    titlesList.appendChild(titleElement);
  });
}

// Create a title element
function createTitleElement(entry, index) {
  const div = document.createElement('div');
  div.className = 'title-entry';
  
  const timestamp = new Date(entry.timestamp).toLocaleString();
  const domain = getDomain(entry.url);
  
  div.innerHTML = `
    <div class="title-main">
      <div class="title-text" title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</div>
      <div class="title-actions">
        <button class="copy-btn" data-index="${index}" title="Copy title">📋</button>
        <button class="open-btn" data-url="${escapeHtml(entry.url)}" title="Open URL">🔗</button>
        <button class="delete-btn" data-index="${index}" title="Delete entry">❌</button>
      </div>
    </div>
    <div class="title-meta">
      <span class="domain">${escapeHtml(domain)}</span>
      <span class="timestamp">${timestamp}</span>
    </div>
  `;
  
  // Add event listeners for buttons
  div.querySelector('.copy-btn').addEventListener('click', (e) => {
    copyTitle(filteredTitles[e.target.dataset.index].title);
  });
  
  div.querySelector('.open-btn').addEventListener('click', (e) => {
    openUrl(e.target.dataset.url);
  });
  
  div.querySelector('.delete-btn').addEventListener('click', (e) => {
    deleteTitle(e.target.dataset.index);
  });
  
  return div;
}

// Handle search functionality
function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  
  if (searchTerm === '') {
    filteredTitles = [...allTitles];
  } else {
    filteredTitles = allTitles.filter(entry => 
      entry.title.toLowerCase().includes(searchTerm) ||
      entry.url.toLowerCase().includes(searchTerm)
    );
  }
  
  displayTitles();
  updateStats();
}

// Update statistics
function updateStats() {
  const count = filteredTitles.length;
  const total = allTitles.length;
  
  if (searchInput.value) {
    titleCount.textContent = `${count} of ${total} titles`;
  } else {
    titleCount.textContent = `${total} titles saved`;
  }
}

// Copy title to clipboard
function copyTitle(title) {
  navigator.clipboard.writeText(title).then(() => {
    // Visual feedback
    showToast('Title copied!');
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = title;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('Title copied!');
  });
}

// Open URL in new tab
function openUrl(url) {
  browser.tabs.create({ url: url });
}

// Delete a title entry
function deleteTitle(index) {
  const actualIndex = allTitles.findIndex(entry => entry === filteredTitles[index]);
  if (actualIndex !== -1) {
    allTitles.splice(actualIndex, 1);
    browser.storage.local.set({ savedTitles: allTitles });
    loadTitles(); // Refresh display
  }
}

// Export titles as JSON
function exportTitles() {
  const dataStr = JSON.stringify(allTitles, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  
  const url = URL.createObjectURL(dataBlob);
  const timestamp = new Date().toISOString().split('T')[0];
  
  browser.downloads.download({
    url: url,
    filename: `title-extractor-export-${timestamp}.json`
  }).then(() => {
    showToast('Export downloaded!');
  }).catch(() => {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(dataStr).then(() => {
      showToast('Exported to clipboard!');
    });
  });
}

// Clear all titles
function clearAllTitles() {
  if (confirm('Are you sure you want to delete all saved titles? This cannot be undone.')) {
    allTitles = [];
    filteredTitles = [];
    browser.storage.local.set({ savedTitles: allTitles });
    displayTitles();
    updateStats();
    showToast('All titles cleared!');
  }
}

// Utility functions
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}