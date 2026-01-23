# Quick Start Guide - Carespace Bug Reporter

Get the extension running in production in 5 minutes.

## 🚀 Option 1: Quick Deploy (Recommended)

### Step 1: Deploy Backend (2 minutes)

```bash
# 1. Navigate to project
cd /Users/fusuma/dev/carespace/carespace-bug-tracker

# 2. Deploy to Vercel (if not already deployed)
vercel --prod

# 3. Note your production URL
# Example: https://carespace-bug-tracker.vercel.app
```

### Step 2: Verify Backend (30 seconds)

Open in browser: `https://carespace-bug-tracker.vercel.app`

You should see the bug tracker form. ✅

### Step 3: Build Extension (30 seconds)

```bash
cd chrome-extension
./build.sh
```

Output: `build/carespace-bug-reporter-v1.0.0.zip` ✅

### Step 4: Test Production Build (2 minutes)

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select: `build/carespace-bug-reporter-v1.0.0/`
5. Click the extension icon
6. Submit a test bug
7. Verify GitHub issue + ClickUp task created ✅

### Step 5: Publish to Chrome Web Store (Optional)

See [PRODUCTION.md](./PRODUCTION.md) for full publishing guide.

---

## 🛠️ Option 2: Development Mode

### For Local Testing

```bash
# 1. Start backend locally
npm run dev

# 2. Open popup.js in your editor
# 3. Open browser console in extension popup
# 4. Run this command:
CONFIG.setApiUrl('http://localhost:3000/api/submit-bug')

# 5. Reload extension popup
# 6. Submit test bug → should hit localhost
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Extension icon appears in Chrome toolbar
- [ ] Clicking icon opens bug report form
- [ ] Right-click → "Report Bug to Carespace" shows in menu
- [ ] Form submits successfully
- [ ] GitHub issue created in correct repo
- [ ] ClickUp task created
- [ ] Screenshot attached (if enabled)
- [ ] Success message shows GitHub + ClickUp links

---

## 🎯 Quick Commands Reference

```bash
# Build production package
./build.sh

# Check config
# Open extension popup console:
await CONFIG.getApiUrl()

# Override API URL (temporary)
CONFIG.setApiUrl('https://staging.example.com/api/submit-bug')

# Reset to production
CONFIG.clearApiUrl()
```

---

## 🆘 Quick Troubleshooting

### Issue: "Network error"
**Fix**: Check backend is deployed and accessible
```bash
curl https://carespace-bug-tracker.vercel.app/api/submit-bug
```

### Issue: CORS error
**Fix**: Verify middleware.ts is deployed
```bash
curl -I https://carespace-bug-tracker.vercel.app/api/submit-bug
# Look for: Access-Control-Allow-Origin: *
```

### Issue: Extension doesn't load
**Fix**:
1. Check manifest.json for syntax errors
2. Reload extension: `chrome://extensions/` → Click reload icon
3. Check service worker errors in extension details

---

## 📖 Full Documentation

- [README.md](./README.md) - Complete feature documentation
- [PRODUCTION.md](./PRODUCTION.md) - Publishing guide
- [PRIVACY.md](./PRIVACY.md) - Privacy policy template

---

**You're all set! 🎉**

The extension is now ready for production use.
