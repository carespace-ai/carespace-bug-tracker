# Webhook Setup Guide

This guide explains how to configure webhooks to enable two-way synchronization between GitHub and ClickUp.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Local Development Setup](#local-development-setup)
5. [GitHub Webhook Configuration](#github-webhook-configuration)
6. [ClickUp Webhook Configuration](#clickup-webhook-configuration)
7. [Production Deployment](#production-deployment)
8. [Testing Webhooks](#testing-webhooks)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The two-way sync feature enables automatic synchronization between GitHub and ClickUp:

- **GitHub → ClickUp**: Status changes, comments, and labels in GitHub sync to ClickUp
- **ClickUp → GitHub**: Status changes, comments, and tags in ClickUp sync to GitHub

This is accomplished using webhooks - HTTP callbacks triggered when specific events occur.

### What Gets Synced

| Feature | GitHub → ClickUp | ClickUp → GitHub |
|---------|-----------------|------------------|
| **Status** | `open` / `closed` → `to do` / `complete` | `to do` / `in progress` / `complete` → `open` / `closed` |
| **Comments** | Issue comments → Task comments | Task comments → Issue comments |
| **Labels/Tags** | Labels → Tags | Tags → Labels |

### Sync Timing

All synchronization operations complete **within 1 minute** (typically 2-5 seconds).

---

## Prerequisites

Before setting up webhooks, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Bug tracker application deployed or running locally
- ✅ GitHub repository with admin access
- ✅ ClickUp workspace with admin access
- ✅ Valid API keys configured (see [Environment Configuration](#environment-configuration))

---

## Environment Configuration

### Required Environment Variables

Add these to your `.env.local` file (local development) or your deployment platform's environment settings (production):

```bash
# Existing API Keys (required for bug submission)
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_OWNER=your-github-username-or-org
GITHUB_REPO=your-repository-name
CLICKUP_API_KEY=pk_your_clickup_api_key
CLICKUP_LIST_ID=your_clickup_list_id
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key

# Webhook Secrets (required for two-way sync)
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
CLICKUP_WEBHOOK_SECRET=your_clickup_webhook_secret
```

### Generating Webhook Secrets

Webhook secrets are used to verify that webhook requests are authentic and come from GitHub/ClickUp.

Generate secure random secrets using OpenSSL:

```bash
# Generate GitHub webhook secret
openssl rand -hex 32

# Generate ClickUp webhook secret
openssl rand -hex 32
```

Save these values - you'll need them when configuring webhooks in GitHub and ClickUp.

### Security Best Practices

- ✅ Use different secrets for GitHub and ClickUp
- ✅ Use cryptographically secure random strings (at least 32 characters)
- ✅ Never commit secrets to version control
- ✅ Rotate secrets periodically (every 3-6 months)
- ✅ Store secrets securely in your deployment platform

---

## Local Development Setup

For local testing, you'll need to expose your localhost to the internet so GitHub and ClickUp can send webhook requests.

### Install ngrok

**macOS (via Homebrew):**
```bash
brew install ngrok
```

**Other platforms:**
Download from [https://ngrok.com/download](https://ngrok.com/download)

### Start ngrok

With your development server running (`npm run dev`), start ngrok in a separate terminal:

```bash
ngrok http 3000
```

You'll see output like:

```
Forwarding  https://abc123def456.ngrok.io -> http://localhost:3000
```

Copy the HTTPS forwarding URL (e.g., `https://abc123def456.ngrok.io`) - this is your webhook base URL.

### ngrok Web Interface

Access ngrok's dashboard at [http://localhost:4040](http://localhost:4040) to:
- View all incoming webhook requests
- Inspect request headers and payloads
- See response codes and bodies
- Replay requests for debugging

### Important ngrok Notes

- ⚠️ Free ngrok URLs change every time you restart ngrok
- ⚠️ You'll need to update webhook URLs in GitHub/ClickUp after each restart
- 💡 Consider ngrok's paid plan for static URLs during extended development
- 💡 For production, use your permanent deployment URL (no ngrok needed)

---

## GitHub Webhook Configuration

### Step 1: Navigate to Webhook Settings

1. Go to your GitHub repository
2. Click **Settings** (in the repository, not your personal settings)
3. Click **Webhooks** in the left sidebar
4. Click **Add webhook**

### Step 2: Configure Webhook

Fill in the webhook form:

| Field | Value |
|-------|-------|
| **Payload URL** | `https://your-domain.com/api/webhooks/github` |
| **Content type** | `application/json` |
| **Secret** | Your `GITHUB_WEBHOOK_SECRET` value |
| **SSL verification** | Enable SSL verification (recommended) |

**Payload URL Examples:**
- Local (ngrok): `https://abc123def456.ngrok.io/api/webhooks/github`
- Production (Vercel): `https://your-app.vercel.app/api/webhooks/github`

### Step 3: Select Events

Choose **Let me select individual events** and select:

- ✅ **Issues** - Triggers on issue status changes and label changes
- ✅ **Issue comments** - Triggers when comments are added to issues

Uncheck all other events unless you need them for other purposes.

### Step 4: Activate Webhook

- ✅ Ensure **Active** checkbox is checked
- Click **Add webhook**

### Step 5: Verify Setup

After creating the webhook:

1. You should see a green checkmark next to your webhook
2. Click on the webhook to view details
3. Check the **Recent Deliveries** tab to see webhook events
4. GitHub will send a `ping` event immediately - verify it shows `200 OK`

---

## ClickUp Webhook Configuration

### Step 1: Navigate to Webhook Settings

1. Log in to [ClickUp](https://app.clickup.com/)
2. Click your profile icon (bottom left)
3. Select **Settings**
4. Navigate to **Integrations** section
5. Click **Webhooks**
6. Click **Create Webhook**

### Step 2: Configure Webhook

Fill in the webhook form:

| Field | Value |
|-------|-------|
| **Endpoint URL** | `https://your-domain.com/api/webhooks/clickup` |
| **Events to trigger** | Select task events (see below) |
| **Space** | Select the workspace/space where your tasks are located |

**Endpoint URL Examples:**
- Local (ngrok): `https://abc123def456.ngrok.io/api/webhooks/clickup`
- Production (Vercel): `https://your-app.vercel.app/api/webhooks/clickup`

### Step 3: Select Events

Select these task events:

- ✅ **Task Status Updated** - Triggers when task status changes
- ✅ **Task Tag Updated** - Triggers when tags are added/removed
- ✅ **Task Comment Posted** - Triggers when comments are added

### Step 4: Configure Webhook Secret

ClickUp doesn't have a built-in secret field in the UI. You'll pass the secret via headers:

1. After creating the webhook, note the webhook ID
2. The secret verification happens on your server using the `CLICKUP_WEBHOOK_SECRET` environment variable
3. ClickUp will send a signature in the `X-Signature` header

### Step 5: Verify Setup

After creating the webhook:

1. The webhook should appear in your webhooks list as **Active**
2. Test by making a change to a synced task (status, tag, comment)
3. Check the webhook delivery history in ClickUp settings
4. Verify deliveries show `200 OK` response

---

## Production Deployment

### Vercel Deployment

#### Via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New** → **Project**
4. Import your GitHub repository
5. Add environment variables:
   - Navigate to **Settings** → **Environment Variables**
   - Add all required variables (including webhook secrets)
6. Deploy!

#### Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add GITHUB_WEBHOOK_SECRET
vercel env add CLICKUP_WEBHOOK_SECRET
# ... add all other required variables
```

### Configure Webhooks with Production URLs

After deployment:

1. Note your production URL (e.g., `https://your-app.vercel.app`)
2. Update GitHub webhook:
   - Payload URL: `https://your-app.vercel.app/api/webhooks/github`
3. Update ClickUp webhook:
   - Endpoint URL: `https://your-app.vercel.app/api/webhooks/clickup`

### Vercel Environment Variables

Ensure all environment variables are set in Vercel:

```bash
# Check current environment variables
vercel env ls

# Add missing variables
vercel env add VARIABLE_NAME
```

---

## Testing Webhooks

### Manual Testing

After configuring webhooks, test the sync functionality:

#### GitHub → ClickUp Sync

1. Submit a bug report via the web form
2. Verify GitHub issue and ClickUp task are created
3. In GitHub:
   - Close the issue → ClickUp task should mark as "complete"
   - Reopen the issue → ClickUp task should mark as "to do"
   - Add a comment → Comment appears in ClickUp
   - Add labels → Labels appear as tags in ClickUp

#### ClickUp → GitHub Sync

1. Use an existing synced task
2. In ClickUp:
   - Change status to "complete" → GitHub issue closes
   - Change status to "to do" → GitHub issue opens
   - Add a comment → Comment appears in GitHub
   - Add tags → Tags appear as labels in GitHub

### Automated Testing

Run the E2E test scripts (local development):

```bash
# Test GitHub to ClickUp sync
npx ts-node scripts/e2e-test-github-to-clickup.ts

# Test ClickUp to GitHub sync
npx ts-node scripts/e2e-test-clickup-to-github.ts

# Test label/tag sync
npx ts-node scripts/e2e-test-label-sync.ts
```

See [E2E_TESTING.md](./E2E_TESTING.md) for detailed testing instructions.

### Monitoring Webhook Deliveries

#### GitHub

1. Go to **Settings** → **Webhooks**
2. Click on your webhook
3. Click **Recent Deliveries** tab
4. Check each delivery:
   - Response code: `200 OK` = success
   - Response body: Check for errors
   - Request payload: Review event data

#### ClickUp

1. Go to **Settings** → **Integrations** → **Webhooks**
2. Click on your webhook
3. View delivery history
4. Check response codes and timing

### Server Logs

Monitor your application logs:

**Local development:**
```bash
# Terminal running npm run dev shows:
POST /api/webhooks/github 200 in 345ms
POST /api/webhooks/clickup 200 in 456ms
```

**Vercel production:**
```bash
# View logs via CLI
vercel logs

# Or view in Vercel Dashboard → Your Project → Deployments → Logs
```

---

## Troubleshooting

### Webhook Returns 401 Unauthorized

**Cause:** Invalid webhook signature

**Solutions:**
1. Verify webhook secret in `.env.local` matches the secret configured in GitHub/ClickUp
2. Check environment variable name:
   - GitHub: `GITHUB_WEBHOOK_SECRET`
   - ClickUp: `CLICKUP_WEBHOOK_SECRET`
3. Restart dev server after changing environment variables
4. For production, redeploy after updating environment variables

**Verify secrets:**
```bash
# Local
cat .env.local | grep WEBHOOK_SECRET

# Vercel
vercel env ls
```

### Webhook Returns 400 Bad Request

**Cause:** Invalid payload format

**Solutions:**
1. Check webhook content type is `application/json`
2. Verify webhook events are properly selected
3. Check server logs for detailed error message
4. Test with a minimal payload

### Webhook Returns 500 Internal Server Error

**Cause:** Server-side error

**Solutions:**
1. Check server logs for detailed error message
2. Verify all API keys are valid (GITHUB_TOKEN, CLICKUP_API_KEY)
3. Ensure GitHub and ClickUp APIs are accessible
4. Check rate limits on GitHub/ClickUp APIs
5. Verify environment variables are properly set

### Sync Doesn't Happen (200 but No Update)

**Cause:** Conflict resolution or mapping issue

**Solutions:**
1. Verify sync mapping exists:
   ```bash
   npx ts-node scripts/verify-sync-mapping.ts
   ```
2. Ensure issue/task was created through the bug submission form (not manually)
3. Check timestamp-based conflict resolution isn't blocking updates
4. Verify API keys have proper permissions

### ngrok URL Changes After Restart

**Cause:** Free ngrok URLs are temporary

**Solutions:**
1. Update webhook URLs in GitHub/ClickUp with new ngrok URL
2. Use ngrok paid plan for static URLs
3. For production, use permanent deployment URL (Vercel, etc.)

### ClickUp Webhook Not Triggering

**Cause:** Webhook misconfiguration

**Solutions:**
1. Verify ngrok is running and forwarding to port 3000
2. Check ClickUp webhook endpoint URL is correct and accessible
3. Ensure correct events are selected
4. Verify webhook is **Active** in ClickUp settings
5. Test ngrok URL directly:
   ```bash
   curl https://your-ngrok-url.ngrok.io/api/webhooks/clickup
   ```

### GitHub API Rate Limit Exceeded

**Cause:** Too many API requests

**Solutions:**
1. Wait for rate limit to reset (check `X-RateLimit-Reset` header)
2. Verify `GITHUB_TOKEN` is set (authenticated requests have higher limits)
3. Check rate limit status:
   ```bash
   curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit
   ```
4. Implement request throttling if needed

### Webhook Signature Validation Fails

**Cause:** Mismatched secrets or signature format

**Solutions:**
1. Verify secret matches exactly (no extra spaces or quotes)
2. For GitHub: Check signature header is `X-Hub-Signature-256`
3. For ClickUp: Check signature header is `X-Signature`
4. Ensure secret is stored in correct environment variable
5. Test signature verification:
   ```bash
   npm test -- webhook-validator
   ```

---

## Security Considerations

### Best Practices

1. **Use HTTPS**: Always use HTTPS URLs for webhooks (required in production)
2. **Verify Signatures**: Never skip signature verification
3. **Rotate Secrets**: Change webhook secrets periodically
4. **Limit Permissions**: Use API tokens with minimum required permissions
5. **Monitor Logs**: Regularly check webhook delivery logs for suspicious activity
6. **Rate Limiting**: Built-in rate limiting protects against abuse

### API Token Permissions

**GitHub Token** needs:
- `repo` scope - Full control of private repositories
  - Read/write access to issues
  - Read/write access to issue comments
  - Read/write access to labels

**ClickUp API Key** needs:
- Task permissions: Read, write, update
- Comment permissions: Read, write
- Tag permissions: Read, write

---

## Additional Resources

- [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks)
- [ClickUp Webhooks Documentation](https://clickup.com/api/clickupreference/operation/CreateWebhook/)
- [ClickUp API Documentation](https://clickup.com/api)
- [ngrok Documentation](https://ngrok.com/docs)
- [E2E Testing Guide](./E2E_TESTING.md)

---

## Next Steps

After configuring webhooks:

1. ✅ Test webhook functionality with manual changes
2. ✅ Run automated E2E tests (see [E2E_TESTING.md](./E2E_TESTING.md))
3. ✅ Monitor webhook deliveries for a few days
4. ✅ Document any custom configuration for your team
5. ✅ Set up monitoring/alerting for webhook failures (optional)

---

## Support

If you encounter issues not covered in this guide:

1. Check [E2E_TESTING.md](./E2E_TESTING.md) for detailed testing and troubleshooting
2. Review server logs for error messages
3. Test webhook endpoints directly with curl
4. Verify all environment variables are set correctly
5. Ensure API keys have proper permissions
