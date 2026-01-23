# Production Deployment Guide

Complete guide for deploying the Carespace Bug Reporter Chrome Extension to production.

## 🎯 Pre-Deployment Checklist

### 1. Deploy Backend to Vercel

```bash
# From main project directory
cd /Users/fusuma/dev/carespace/carespace-bug-tracker

# Deploy to Vercel
vercel --prod

# Note the production URL (e.g., https://carespace-bug-tracker.vercel.app)
```

### 2. Verify Backend Configuration

Ensure these environment variables are set in Vercel:
- `ANTHROPIC_API_KEY`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO_FRONTEND`
- `GITHUB_REPO_BACKEND`
- `GITHUB_REPO`
- `CLICKUP_API_KEY`
- `CLICKUP_LIST_ID`

**Important:** The `middleware.ts` enables CORS for chrome-extension:// origins. This is required for the extension to work.

### 3. Update Extension Configuration

The extension automatically uses production by default:
- Production URL is set in `config.js`: `https://carespace-bug-tracker.vercel.app/api/submit-bug`
- For local testing, use browser console: `CONFIG.setApiUrl('http://localhost:3000/api/submit-bug')`

### 4. Test Production Backend

```bash
# Test API endpoint
curl -X POST https://carespace-bug-tracker.vercel.app/api/submit-bug \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test bug",
    "description": "Testing production API",
    "severity": "low",
    "category": "other"
  }'

# Expected: Should return success with GitHub and ClickUp URLs
```

## 📦 Building for Production

### Build the Extension Package

```bash
cd chrome-extension
./build.sh
```

This creates:
- `build/carespace-bug-reporter-v1.0.0.zip` - Ready for Chrome Web Store upload
- `build/carespace-bug-reporter-v1.0.0/` - Unpacked extension for testing

### Test the Production Build Locally

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `build/carespace-bug-reporter-v1.0.0/` folder
5. Test the extension thoroughly:
   - Click extension icon → Submit a test bug
   - Right-click on page → "Report Bug to Carespace"
   - Select text → Right-click → "Report Bug with Selected Text"
   - Verify screenshot capture works
   - Check that bugs are created in GitHub and ClickUp

## 🌐 Publishing to Chrome Web Store

### First-Time Setup

1. **Create Developer Account**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Sign in with Google account
   - Pay one-time $5 developer registration fee

2. **Prepare Store Assets**

You'll need:
- **Icon**: 128x128 PNG (already in `icons/icon-128.png`)
- **Screenshots**: 1280x800 or 640x400 PNG/JPG
  - Take screenshots of the extension in use
  - Show the popup form
  - Show context menu
  - Show success message
- **Promotional images** (optional but recommended):
  - Small tile: 440x280 PNG
  - Large tile: 920x680 PNG
  - Marquee: 1400x560 PNG

### Upload Extension

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item"
3. Upload `build/carespace-bug-reporter-v1.0.0.zip`
4. Fill in the store listing:

**Product Details:**
```
Title: Carespace Bug Reporter
Summary: Report bugs directly from your browser to Carespace's automated bug tracking system

Description:
🐛 Carespace Bug Reporter - Streamline Your Bug Reporting

Report bugs instantly from any webpage with AI-powered enhancement and automatic issue creation.

✨ KEY FEATURES
• One-click bug reporting from browser toolbar or context menu
• Automatic screenshot capture of the current page
• Pre-fills page context (URL, title, selected text)
• AI enhancement with Claude for better bug reports
• Automatic creation of GitHub issues and ClickUp tasks
• Smart repository routing (frontend vs backend)
• Priority scoring and label suggestions

🚀 HOW IT WORKS
1. Click the extension icon or right-click anywhere
2. Fill out the bug report form
3. Claude AI enhances your report automatically
4. GitHub issue + ClickUp task created instantly
5. Track progress in your development workflow

🎯 PERFECT FOR
• Development teams using GitHub and ClickUp
• QA testers reporting bugs
• Product managers tracking issues
• Anyone who wants efficient bug reporting

🔒 PRIVACY & SECURITY
• Only captures screenshots when you enable it
• Secure API communication
• No data stored in the extension
• Optional email for follow-up

💡 PRO TIP
Select error text or problematic content, right-click, and choose "Report Bug with Selected Text" to auto-populate the description.

Built with AI-powered intelligence by Carespace.

Category: Productivity
Language: English
```

**Privacy Practices:**
```
Data Usage: Screenshots and page metadata are sent to Carespace servers for bug tracking
Data Handling: Data is processed and stored in GitHub issues and ClickUp tasks
```

**Permissions Justification:**
```
• activeTab: Capture screenshots of the current page
• tabs: Get page URL and title for bug context
• scripting: Future feature for enhanced bug detection
• contextMenus: Add right-click menu options
• storage: Store context between context menu and popup
```

5. Upload screenshots (take these before submitting)
6. Set privacy policy URL (if you have one)
7. Choose categories: `Productivity` and `Developer Tools`
8. Set regions: `All regions` or specific countries

### Review Process

- **Review time**: Usually 1-3 business days
- **Common rejection reasons**:
  - Unclear permissions justification
  - Missing privacy policy (required if collecting user data)
  - Misleading screenshots or description
  - Code obfuscation or minification issues

### After Approval

- Extension will be live at: `https://chrome.google.com/webstore/detail/[your-extension-id]`
- Users can install with one click
- You'll receive analytics in the dashboard

## 🔄 Updating the Extension

### Version Updates

1. **Update version in manifest.json**:
   ```json
   {
     "version": "1.1.0"
   }
   ```

2. **Build new package**:
   ```bash
   ./build.sh
   ```

3. **Upload to Chrome Web Store**:
   - Go to your extension in the dashboard
   - Click "Package" → "Upload new package"
   - Upload the new ZIP file
   - Update release notes

4. **Review and publish**:
   - New version goes through review again
   - Existing users auto-update within a few hours

### Semantic Versioning

- **Major (1.0.0 → 2.0.0)**: Breaking changes, major features
- **Minor (1.0.0 → 1.1.0)**: New features, backward compatible
- **Patch (1.0.0 → 1.0.1)**: Bug fixes, small improvements

## 🛠️ Configuration Management

### Default Configuration

The extension uses production by default (`config.js`):
```javascript
PRODUCTION_API_URL: 'https://carespace-bug-tracker.vercel.app/api/submit-bug'
```

### Testing Against Different Environments

Users can override the API URL in browser console:

```javascript
// Switch to staging
CONFIG.setApiUrl('https://staging.example.com/api/submit-bug')

// Switch to local
CONFIG.setApiUrl('http://localhost:3000/api/submit-bug')

// Reset to default (production)
CONFIG.clearApiUrl()
```

After changing the URL, reload the extension popup.

### Internal Testing Version

For team testing before public release:

1. Build with `./build.sh`
2. Share ZIP file internally via Google Drive or similar
3. Team members install via "Load unpacked" in developer mode
4. Collect feedback
5. Fix issues and rebuild
6. Submit final version to Chrome Web Store

## 📊 Monitoring & Analytics

### Chrome Web Store Analytics

Available in the developer dashboard:
- **Installs**: Daily/weekly/total installs
- **Uninstalls**: Uninstall rate and reasons
- **Impressions**: How many users saw your extension
- **Ratings**: User ratings and reviews

### Backend Monitoring

Monitor your Vercel deployment:
- Check API logs for extension requests
- Monitor rate limiting (5 requests per 15 min per IP)
- Track GitHub/ClickUp API usage
- Monitor Anthropic API costs

### Error Tracking

Add error tracking to `popup.js` (optional):

```javascript
// Example: Send errors to your logging service
window.addEventListener('error', (event) => {
  console.error('Extension error:', event.error);
  // Send to your error tracking service
  // fetch('https://your-logging-service.com/log', ...)
});
```

## 🔐 Security Best Practices

### API Key Management

- ✅ API keys are stored in Vercel environment variables (server-side)
- ✅ Extension never contains API keys
- ✅ All sensitive operations happen on the backend

### CORS Configuration

The `middleware.ts` allows `chrome-extension://` origins. This is necessary but safe because:
- Extension validates all inputs
- Backend has rate limiting
- Backend validates all requests with Zod schemas
- Only creates GitHub issues and ClickUp tasks (no destructive operations)

### Content Security Policy

The extension manifest enforces:
- No inline scripts (all JS is in separate files)
- No eval() or similar unsafe patterns
- All resources loaded from extension package

## 🆘 Troubleshooting

### Extension Not Working After Deployment

1. **Check CORS**: Verify `middleware.ts` is deployed
   ```bash
   curl -I https://carespace-bug-tracker.vercel.app/api/submit-bug
   # Should include: Access-Control-Allow-Origin: *
   ```

2. **Check Environment Variables**: Ensure all env vars are set in Vercel

3. **Check API URL**: Open extension popup console:
   ```javascript
   await CONFIG.getApiUrl()
   // Should show production URL
   ```

4. **Check Permissions**: Verify manifest host_permissions includes your domain

### Users Reporting Issues

1. **Check reviews** in Chrome Web Store dashboard
2. **Monitor backend logs** in Vercel
3. **Test in incognito mode** to rule out conflicts
4. **Check Chrome version compatibility** (extension requires Chrome 88+)

## 📝 Release Checklist

Before each release:

- [ ] All features tested locally
- [ ] Backend deployed to Vercel production
- [ ] Environment variables configured
- [ ] Version number updated in manifest.json
- [ ] Build script executed successfully
- [ ] Extension tested with production build
- [ ] Screenshots updated (if UI changed)
- [ ] Changelog documented
- [ ] Privacy policy updated (if needed)
- [ ] Store listing reviewed
- [ ] ZIP file uploaded to Chrome Web Store
- [ ] Team notified of new release

## 🎉 Success!

Your extension is now live and users can install it from the Chrome Web Store. Monitor the dashboard for analytics and user feedback.

For support or questions, check:
- Chrome Web Store Developer Documentation
- Vercel Deployment Logs
- GitHub Issues in the bug tracker repo
