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
  const currentUrl = window.location.origin;

  // FusionAuth authentication check
  // Check for Carespace FusionAuth tokens in localStorage
  const token = localStorage.getItem('_auth_carespace_token');
  const userDataStr = localStorage.getItem('_auth_carespace_user');

  if (token && userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);

      // Verify the user is authenticated on THIS specific subdomain
      // FusionAuth stores client.domain which must match current domain
      const clientDomain = userData.client?.domain;

      if (clientDomain === currentUrl || clientDomain === `https://${currentDomain}`) {
        console.log('[Carespace Bug Reporter] Authenticated on', currentDomain);
        return {
          authenticated: true,
          token: token,
          subdomain: currentDomain
        };
      } else {
        console.warn('[Carespace Bug Reporter] User authenticated on different subdomain:', clientDomain);
        return {
          authenticated: false,
          token: null,
          subdomain: currentDomain,
          message: `You are logged in to ${clientDomain}, not ${currentUrl}`
        };
      }
    } catch (error) {
      console.error('[Carespace Bug Reporter] Failed to parse user data:', error);
    }
  }

  // Not authenticated on current subdomain
  console.log('[Carespace Bug Reporter] No FusionAuth token found for', currentDomain);
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
  // Get user info from FusionAuth localStorage
  const userDataStr = localStorage.getItem('_auth_carespace_user');
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      return {
        email: userData.profile?.email,
        name: userData.profile?.fullName || `${userData.profile?.firstName} ${userData.profile?.lastName}`,
        userId: userData.id
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
