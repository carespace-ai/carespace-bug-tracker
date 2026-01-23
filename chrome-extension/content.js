/**
 * Content script for Carespace Bug Reporter
 * Runs on *.carespace.ai domains to enable extension functionality
 * and check authentication status
 */

/**
 * Check if user is authenticated on the CURRENT subdomain
 * This ensures users are logged in specifically on the subdomain they're reporting from
 * (e.g., logged in on moi.carespace.ai, not just app.carespace.ai)
 *
 * CUSTOMIZE THIS based on your authentication system:
 * - Option 1: Make API call to current subdomain to verify session
 * - Option 2: Check for subdomain-specific indicators in DOM
 * - Option 3: Check localStorage with subdomain-specific key
 */
async function checkAuthentication() {
  const currentDomain = window.location.hostname;

  // Option 1: API call to verify session on current subdomain (RECOMMENDED)
  // This is the most reliable way to check auth on the specific subdomain
  try {
    // Customize this endpoint to match your auth verification endpoint
    // Examples:
    // - /api/auth/me
    // - /api/user/profile
    // - /api/auth/verify
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include', // Include cookies for this subdomain
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const userData = await response.json();
      // Customize based on your API response structure
      const token = userData.token || userData.accessToken || 'verified';
      return {
        authenticated: true,
        token: token,
        subdomain: currentDomain
      };
    }
  } catch (error) {
    console.warn('[Carespace Bug Reporter] API auth check failed:', error);
  }

  // Option 2: Check for subdomain-specific auth indicators in DOM
  // Look for elements that only appear when user is logged in
  const userMenuElement = document.querySelector('[data-user-authenticated]') ||
                         document.querySelector('.user-profile') ||
                         document.querySelector('[data-user-id]') ||
                         document.querySelector('.auth-user');

  if (userMenuElement) {
    const userId = userMenuElement.dataset.userId ||
                  userMenuElement.getAttribute('data-user-id');
    return {
      authenticated: true,
      token: 'dom-verified',
      subdomain: currentDomain
    };
  }

  // Option 3: Check localStorage with subdomain-specific key
  // Some apps store auth per subdomain with keys like 'auth:moi.carespace.ai'
  const subdomainAuthKey = `auth:${currentDomain}`;
  const subdomainToken = localStorage.getItem(subdomainAuthKey);
  if (subdomainToken) {
    return {
      authenticated: true,
      token: subdomainToken,
      subdomain: currentDomain
    };
  }

  // Option 4: Check for global auth but verify it's valid for this subdomain
  // Only use this as fallback - not recommended as primary check
  const globalToken = localStorage.getItem('authToken') ||
                     localStorage.getItem('token');

  if (globalToken) {
    // Try to verify the token is valid for this subdomain
    // by checking if there's a user object in localStorage
    try {
      const userDataStr = localStorage.getItem('user') ||
                         localStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        // Check if user data has current subdomain info
        if (userData.currentSubdomain === currentDomain ||
            userData.lastSeenAt === currentDomain) {
          return {
            authenticated: true,
            token: globalToken,
            subdomain: currentDomain
          };
        }
      }
    } catch (e) {
      // Invalid user data, not authenticated
    }
  }

  // Not authenticated on current subdomain
  return {
    authenticated: false,
    token: null,
    subdomain: currentDomain
  };
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
(async function initializeAuth() {
  const authStatus = await checkAuthentication();
  const userInfo = getUserInfo();

  // Send auth status to extension
  chrome.runtime.sendMessage({
    type: 'authStatus',
    authenticated: authStatus.authenticated,
    token: authStatus.token,
    userInfo: userInfo,
    domain: window.location.hostname,
    subdomain: authStatus.subdomain
  });

  console.log('[Carespace Bug Reporter] Extension active on', window.location.hostname);
  console.log('[Carespace Bug Reporter] Auth status:', authStatus.authenticated ? `Authenticated on ${authStatus.subdomain}` : `Not authenticated on ${authStatus.subdomain}`);
})();

// Listen for auth check requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'checkAuth') {
    // Handle async auth check
    (async () => {
      const currentAuthStatus = await checkAuthentication();
      const currentUserInfo = getUserInfo();
      sendResponse({
        authenticated: currentAuthStatus.authenticated,
        token: currentAuthStatus.token,
        userInfo: currentUserInfo,
        subdomain: currentAuthStatus.subdomain
      });
    })();
  }
  return true; // Keep message channel open for async response
});
