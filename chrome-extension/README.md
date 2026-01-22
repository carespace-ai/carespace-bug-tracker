# Carespace Bug Reporter - Chrome Extension

A Chrome extension that integrates with the Carespace Bug Tracker to allow users to report bugs directly from their browser.

## Features

✨ **Quick Bug Reporting** - Click extension icon or right-click to report bugs
📸 **Auto Screenshot Capture** - Automatically capture the current page
🎯 **Context-Aware** - Pre-fills page URL, title, and selected text
🤖 **AI-Powered** - Uses Claude to enhance bug reports
🔗 **Automatic Integration** - Creates GitHub issues and ClickUp tasks
🎨 **Carespace Branding** - Matches the Carespace design system

## Installation

### Development Mode (Local Testing)

1. **Start the Bug Tracker Backend**
   ```bash
   cd /Users/fusuma/dev/carespace/carespace-bug-tracker
   npm run dev
   ```
   Backend should be running at http://localhost:3000

2. **Load the Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Verify Installation**
   - You should see the Carespace Bug Reporter icon in your extensions toolbar
   - Right-click on any webpage → You should see "Report Bug to Carespace" in the context menu

### Production Mode (Deployed Backend)

1. **Update API URL**
   - Open `popup.js`
   - Change line 2 to your deployed URL:
     ```javascript
     const API_URL = 'https://your-bug-tracker.vercel.app/api/submit-bug';
     ```

2. **Update Host Permissions**
   - Open `manifest.json`
   - Update `host_permissions` to include your domain:
     ```json
     "host_permissions": [
       "https://your-bug-tracker.vercel.app/*"
     ]
     ```

3. **Load Extension** (same as development mode steps 2-3)

## Usage

### Method 1: Extension Icon

1. Click the Carespace Bug Reporter icon in your Chrome toolbar
2. Fill out the bug report form
3. Enable/disable screenshot capture (enabled by default)
4. Click "Submit Bug Report"
5. View the created GitHub issue and ClickUp task via the success links

### Method 2: Context Menu (Right-Click)

**Report bug from anywhere on page:**
1. Right-click anywhere on a webpage
2. Select "Report Bug to Carespace"
3. Click the extension icon to open pre-filled form
4. Complete and submit

**Report bug with selected text:**
1. Highlight text on a webpage (error message, problematic content, etc.)
2. Right-click the selected text
3. Select "Report Bug with Selected Text"
4. Click the extension icon to see the form pre-filled with:
   - Selected text in the description
   - Current page URL and title in steps to reproduce
5. Complete and submit

## Features Explained

### Auto-Captured Information

The extension automatically captures:
- **Browser Info** - Chrome version and OS (e.g., "Chrome 120 on macOS")
- **Page Context** - Current URL, page title
- **Screenshot** - Visible area of the current tab (optional)
- **Selected Text** - Any text you highlighted (if using context menu)

### AI Enhancement

After submission, Claude AI automatically:
- Enhances the bug description with technical context
- Suggests appropriate labels (bug, ui, performance, etc.)
- Assigns priority score (1-5)
- Routes to correct repository (frontend vs backend)
- Generates a Claude Code prompt for developers

### Parallel Creation

The system creates:
- **GitHub Issue** - In carespace-frontend or carespace-backend repo
- **ClickUp Task** - In your configured ClickUp list
- Both are created simultaneously for efficiency

## Configuration

### API Endpoint

Edit `popup.js` line 2:
```javascript
const API_URL = 'http://localhost:3000/api/submit-bug';
```

For production:
```javascript
const API_URL = 'https://your-bug-tracker.vercel.app/api/submit-bug';
```

### Branding

To customize branding:
- **Logo** - Replace `images/logo.svg`
- **Icons** - Replace files in `icons/` folder (16x16, 48x48, 128x128)
- **Colors** - Edit CSS variables in `styles.css` under `:root`

### Permissions

The extension requires these permissions (see `manifest.json`):
- **activeTab** - Capture screenshots of current tab
- **scripting** - Inject scripts (future feature)
- **tabs** - Get current tab URL and title
- **contextMenus** - Add right-click menu items
- **storage** - Store context data between context menu and popup

## File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main form UI
├── popup.js              # Form logic and API integration
├── background.js         # Service worker (context menu)
├── styles.css            # Carespace design system styles
├── icons/                # Extension icons (16, 48, 128)
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── images/
│   └── logo.svg          # Carespace logo
└── README.md             # This file
```

## Backend Requirements

The bug tracker backend must have CORS enabled for the extension to work. The provided `middleware.ts` in the main project enables this.

**Backend file:** `/Users/fusuma/dev/carespace/carespace-bug-tracker/middleware.ts`

This middleware:
- Allows requests from `chrome-extension://` origins
- Handles preflight OPTIONS requests
- Adds CORS headers to all API responses

## Troubleshooting

### "Failed to submit bug" / Network Error

**Cause:** Backend not running or CORS not configured
**Fix:**
1. Ensure bug tracker is running (`npm run dev`)
2. Check `middleware.ts` is present in the main project
3. Verify `API_URL` in `popup.js` is correct
4. Check browser console for detailed error

### Screenshot not captured

**Cause:** Permission denied or inactive tab
**Fix:**
1. Ensure you're on a regular webpage (not chrome:// or extension pages)
2. Try disabling screenshot capture if issue persists
3. Check Chrome DevTools console for errors

### Context menu items not appearing

**Cause:** Extension not loaded or background.js error
**Fix:**
1. Go to `chrome://extensions/` and verify extension is enabled
2. Click "Reload" on the extension
3. Check "Service worker" errors in extension details

### Form doesn't pre-fill from context menu

**Cause:** Popup opened automatically (not supported in all contexts)
**Fix:**
1. After right-clicking, manually click the extension icon
2. The form should be pre-filled with context data

## Publishing to Chrome Web Store

1. **Prepare for production:**
   - Update `API_URL` to production URL
   - Update `manifest.json` version
   - Test thoroughly

2. **Create a ZIP:**
   ```bash
   cd chrome-extension
   zip -r carespace-bug-reporter.zip .
   ```

3. **Upload to Chrome Web Store:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay one-time $5 developer fee (if first time)
   - Upload the ZIP file
   - Fill in store listing details
   - Submit for review

4. **Review Process:**
   - Typically takes 1-3 days
   - May require privacy policy URL
   - Ensure permissions are justified

## Development

### Testing Locally

```bash
# Terminal 1: Start backend
cd /Users/fusuma/dev/carespace/carespace-bug-tracker
npm run dev

# Terminal 2: Watch extension for changes
# (Just reload extension in chrome://extensions/ after making changes)
```

### Making Changes

1. Edit files in `chrome-extension/` folder
2. Go to `chrome://extensions/`
3. Click the reload icon on Carespace Bug Reporter
4. Test changes

## Support

For issues or questions:
- Check backend logs in terminal running `npm run dev`
- Check extension console: Right-click extension icon → "Inspect popup"
- Check service worker logs: `chrome://extensions/` → Extension details → "Service worker"

## License

Part of the Carespace Bug Tracker system.
