// Context menu IDs
const CONTEXT_MENU_ID = 'carespace-report-bug';
const CONTEXT_MENU_ID_SELECTION = 'carespace-report-bug-selection';

// Helper: Check if URL is on carespace.ai domain
function isCarespaceAiDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith('.carespace.ai') || hostname === 'carespace.ai' || hostname === 'localhost';
  } catch (e) {
    return false;
  }
}

// Create context menus on extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Carespace Bug Reporter extension installed');

  // Context menu for general page reporting (only on carespace.ai domains)
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Report Bug to Carespace',
    contexts: ['page', 'frame', 'link', 'image', 'video'],
    documentUrlPatterns: ['https://*.carespace.ai/*', 'http://localhost/*']
  });

  // Context menu for selected text reporting (only on carespace.ai domains)
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID_SELECTION,
    title: 'Report Bug with Selected Text',
    contexts: ['selection'],
    documentUrlPatterns: ['https://*.carespace.ai/*', 'http://localhost/*']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);

  // Store context information for popup to use
  const contextData = {
    pageUrl: tab.url,
    pageTitle: tab.title
  };

  // Add selected text if available
  if (info.selectionText) {
    contextData.selectedText = info.selectionText;
  }

  // Add clicked element context if available
  if (info.linkUrl) {
    contextData.clickedLink = info.linkUrl;
  }

  if (info.srcUrl) {
    contextData.clickedMedia = info.srcUrl;
  }

  // Store context data in chrome.storage
  await chrome.storage.local.set(contextData);

  // Open extension popup
  // Note: chrome.action.openPopup() only works in certain contexts
  // Fallback: user must click the extension icon to see pre-filled form
  try {
    await chrome.action.openPopup();
  } catch (error) {
    console.log('Could not open popup automatically:', error.message);
    console.log('Context data saved. User should click extension icon to submit bug.');

    // Show notification to user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Carespace Bug Reporter',
      message: 'Click the extension icon to submit your bug report',
      priority: 1
    });
  }
});

// Handle extension icon click (optional - can add badge or other functionality)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
  // Popup will open automatically - no action needed here
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  if (message.type === 'authStatus') {
    // Store auth status from content script
    console.log('Auth status received:', message.authenticated ? 'Authenticated' : 'Not authenticated');
    chrome.storage.local.set({
      authStatus: {
        authenticated: message.authenticated,
        token: message.token,
        userInfo: message.userInfo,
        domain: message.domain,
        timestamp: Date.now()
      }
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'getBugContext') {
    // Return any stored context
    chrome.storage.local.get(null, (data) => {
      sendResponse(data);
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'clearBugContext') {
    // Clear stored context
    chrome.storage.local.clear(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle browser action badge (show notification count, etc.)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.selectedText) {
    // Set badge when context data is available
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#9f30ed' });

    // Clear badge after 10 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 10000);
  }
});

console.log('Carespace Bug Reporter background service worker loaded');
