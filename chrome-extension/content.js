/**
 * Content script for Carespace Bug Reporter
 * Runs on *.carespace.ai domains to enable extension functionality
 */

// Signal that the extension is active on this page
chrome.runtime.sendMessage({ type: 'pageLoaded', domain: window.location.hostname });

console.log('[Carespace Bug Reporter] Extension active on', window.location.hostname);
