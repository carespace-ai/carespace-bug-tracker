/**
 * Configuration for Carespace Bug Reporter Chrome Extension
 *
 * This file auto-detects the environment and uses the appropriate API endpoint.
 * To override, set localStorage.bugTrackerApiUrl in the browser console.
 */

const CONFIG = {
  // Production API URL (deployed on Vercel)
  PRODUCTION_API_URL: 'https://carespace-bug-tracker.vercel.app/api/submit-bug',

  // Development API URL (local)
  DEVELOPMENT_API_URL: 'http://localhost:3000/api/submit-bug',

  // Feature flags
  FEATURES: {
    autoScreenshot: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'text/plain',
      'application/pdf',
      'application/json'
    ]
  },

  /**
   * Get the appropriate API URL based on environment
   * Priority:
   * 1. localStorage override (for testing)
   * 2. Production URL (default)
   */
  getApiUrl: async function() {
    // Check for localStorage override
    const override = localStorage.getItem('bugTrackerApiUrl');
    if (override) {
      console.log('[Config] Using localStorage override:', override);
      return override;
    }

    // Use production URL by default
    console.log('[Config] Using production API:', this.PRODUCTION_API_URL);
    return this.PRODUCTION_API_URL;
  },

  /**
   * Set custom API URL (useful for testing)
   * Usage in browser console: CONFIG.setApiUrl('http://localhost:3000/api/submit-bug')
   */
  setApiUrl: function(url) {
    localStorage.setItem('bugTrackerApiUrl', url);
    console.log('[Config] API URL set to:', url);
    console.log('[Config] Reload extension popup to apply changes');
  },

  /**
   * Clear custom API URL and use default
   */
  clearApiUrl: function() {
    localStorage.removeItem('bugTrackerApiUrl');
    console.log('[Config] API URL cleared, using production default');
  }
};

// Make config available globally
window.CONFIG = CONFIG;
