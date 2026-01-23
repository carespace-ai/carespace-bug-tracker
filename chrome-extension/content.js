/**
 * Content script for Carespace Bug Reporter
 * Runs on *.carespace.ai domains to enable extension functionality
 * and check authentication status
 */

/**
 * Check if user is authenticated on carespace.ai
 * This function checks for common authentication indicators
 *
 * CUSTOMIZE THIS based on your authentication system:
 * - Option 1: Check for specific cookie name
 * - Option 2: Check localStorage for auth token
 * - Option 3: Check sessionStorage
 * - Option 4: Make API call to verify session
 */
function checkAuthentication() {
  // Option 1: Check for authentication cookie
  // Customize 'auth_token' to match your actual cookie name
  const authCookie = document.cookie.split('; ').find(row => row.startsWith('auth_token='));
  if (authCookie) {
    const token = authCookie.split('=')[1];
    return { authenticated: true, token: token };
  }

  // Option 2: Check localStorage for auth token
  // Customize 'authToken' to match your actual key
  const localStorageToken = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (localStorageToken) {
    return { authenticated: true, token: localStorageToken };
  }

  // Option 3: Check sessionStorage
  const sessionToken = sessionStorage.getItem('authToken') || sessionStorage.getItem('token');
  if (sessionToken) {
    return { authenticated: true, token: sessionToken };
  }

  // Option 4: Check for common auth indicators (session cookies, JWT, etc.)
  const hasSessionCookie = document.cookie.includes('session=') ||
                          document.cookie.includes('connect.sid=') ||
                          document.cookie.includes('JSESSIONID=');

  if (hasSessionCookie) {
    return { authenticated: true, token: 'session-based' };
  }

  // Not authenticated
  return { authenticated: false, token: null };
}

/**
 * Get user information if available
 * This can be used to pre-fill the email field
 */
function getUserInfo() {
  // Try to get user info from common sources
  // Customize based on where your app stores user data

  // Check localStorage
  const userDataStr = localStorage.getItem('user') || localStorage.getItem('userData');
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      return {
        email: userData.email || userData.userEmail,
        name: userData.name || userData.userName,
        userId: userData.id || userData.userId
      };
    } catch (e) {
      console.warn('[Carespace Bug Reporter] Failed to parse user data', e);
    }
  }

  return null;
}

// Check authentication and send to background/popup
const authStatus = checkAuthentication();
const userInfo = getUserInfo();

// Send auth status to extension
chrome.runtime.sendMessage({
  type: 'authStatus',
  authenticated: authStatus.authenticated,
  token: authStatus.token,
  userInfo: userInfo,
  domain: window.location.hostname
});

console.log('[Carespace Bug Reporter] Extension active on', window.location.hostname);
console.log('[Carespace Bug Reporter] Auth status:', authStatus.authenticated ? 'Authenticated' : 'Not authenticated');

// Listen for auth check requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'checkAuth') {
    const currentAuthStatus = checkAuthentication();
    const currentUserInfo = getUserInfo();
    sendResponse({
      authenticated: currentAuthStatus.authenticated,
      token: currentAuthStatus.token,
      userInfo: currentUserInfo
    });
  }
  return true; // Keep message channel open for async response
});
