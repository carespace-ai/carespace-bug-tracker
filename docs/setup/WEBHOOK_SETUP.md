# Webhook Setup Guide

This guide explains how to configure webhooks to enable two-way synchronization between GitHub and ClickUp.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Local Development Setup](#local-development-setup)
5. [GitHub Webhook Configuration](#github-webhook-configuration)
6. [ClickUp Webhook Configuration](#clickup-webhook-configuration)
7. [Outgoing Webhook Configuration](#outgoing-webhook-configuration)
8. [Production Deployment](#production-deployment)
9. [Testing Webhooks](#testing-webhooks)
10. [Troubleshooting](#troubleshooting)

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

## Outgoing Webhook Configuration

In addition to receiving webhooks from GitHub and ClickUp, the bug tracker can send webhooks to external services (Slack, custom dashboards, monitoring tools, etc.) when bug-related events occur.

### Overview

Outgoing webhooks enable real-time notifications to your systems when:
- **bug.submitted** - A new bug report is submitted
- **bug.status_changed** - A bug's status changes (open → in progress → closed)
- **bug.resolved** - A bug is marked as resolved (closed)

External services subscribe to these events via the bug tracker's API, and the system delivers webhook payloads with signature verification for security.

---

### Subscription Management

#### Subscribing to Webhooks

External services can subscribe to webhook events using the subscription API endpoint.

**Endpoint:** `POST /api/webhooks/subscribe`

**Request Body:**
```json
{
  "url": "https://your-service.com/webhooks/bugs",
  "events": ["bug.submitted", "bug.status_changed", "bug.resolved"],
  "secret": "your-secure-webhook-secret-min-16-chars"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | HTTPS URL where webhooks will be sent (HTTP allowed for localhost) |
| `events` | string[] | Yes | Array of event types to subscribe to |
| `secret` | string | Yes | Secret key for signature verification (minimum 16 characters) |

**Available Events:**
- `bug.submitted` - Triggered when a new bug is submitted
- `bug.status_changed` - Triggered when bug status changes
- `bug.resolved` - Triggered when a bug is resolved (closed)

**Example using cURL:**
```bash
curl -X POST https://your-bug-tracker.com/api/webhooks/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-service.com/webhooks/bugs",
    "events": ["bug.submitted", "bug.resolved"],
    "secret": "super-secret-webhook-key-123456"
  }'
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "subscription": {
    "id": "abc123def456",
    "url": "https://your-service.com/webhooks/bugs",
    "events": ["bug.submitted", "bug.resolved"],
    "createdAt": 1705320000000
  },
  "message": "Webhook subscription created successfully"
}
```

**Error Responses:**

| Status | Error | Reason |
|--------|-------|--------|
| `400` | Invalid URL format | URL must be HTTPS (or HTTP for localhost) |
| `400` | Invalid events | Events must be from allowed list |
| `400` | Secret too short | Secret must be at least 16 characters |
| `500` | Internal server error | Server-side issue |

---

#### Unsubscribing from Webhooks

Remove a webhook subscription when you no longer need notifications.

**Endpoint:** `DELETE /api/webhooks/unsubscribe`

**Request Body:**
```json
{
  "url": "https://your-service.com/webhooks/bugs"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | The webhook URL to unsubscribe |

**Example using cURL:**
```bash
curl -X DELETE https://your-bug-tracker.com/api/webhooks/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-service.com/webhooks/bugs"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook unsubscribed successfully"
}
```

**Error Responses:**

| Status | Error | Reason |
|--------|-------|--------|
| `404` | Webhook not found | No subscription exists for this URL |
| `400` | Invalid request | Missing or invalid URL |
| `500` | Internal server error | Server-side issue |

---

### Webhook Delivery

#### How Delivery Works

When a subscribed event occurs:

1. **Event Triggered** - Bug submission, status change, or resolution occurs
2. **Payload Created** - System creates a JSON payload with bug details
3. **Signature Generated** - HMAC SHA-256 signature created using your secret
4. **HTTP POST Sent** - Webhook delivered to your URL with signature header
5. **Retry on Failure** - Up to 3 retry attempts with exponential backoff if delivery fails

#### Delivery Headers

All outgoing webhook requests include these headers:

```
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac-signature>
X-Webhook-Event: <event-type>
X-Webhook-Delivery: <unique-delivery-id>
User-Agent: Carespace-Bug-Tracker/1.0
```

#### Retry Logic

The system implements automatic retry with exponential backoff:

| Attempt | Delay | Timeout |
|---------|-------|---------|
| 1 (initial) | 0s | 10s |
| 2 (retry) | 1s | 10s |
| 3 (retry) | 2s | 10s |
| 4 (retry) | 4s | 10s |

**Total retry window:** Up to 3 retries over ~7 seconds

**Retry triggers:**
- Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
- HTTP 5xx status codes (500, 502, 503, 504)
- Request timeout (>10 seconds)

**No retry for:**
- HTTP 4xx status codes (400, 401, 404, etc.)
- Invalid URL or DNS resolution failures
- SSL/TLS certificate errors

**Best Practice:** Your webhook endpoint should respond with `200 OK` within 10 seconds to avoid timeouts.

---

### Signature Verification

**CRITICAL:** Always verify webhook signatures to ensure requests are authentic and come from your bug tracker instance.

#### How Signatures Work

The bug tracker signs each webhook request using HMAC SHA-256:

1. Takes the raw JSON payload (request body)
2. Creates HMAC hash using your webhook secret
3. Sends signature in `X-Webhook-Signature` header as `sha256=<hex-digest>`

#### Verification Implementation

**Node.js / Express:**
```javascript
const crypto = require('crypto');

app.post('/webhooks/bugs', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET; // Your secret from subscription

  // Compute expected signature
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(req.body) // Raw body buffer
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse and process webhook
  const payload = JSON.parse(req.body);
  console.log('Received event:', payload.event);
  console.log('Bug data:', payload.data);

  res.status(200).json({ success: true });
});
```

**Python / Flask:**
```python
import hmac
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/bugs', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    secret = os.environ['WEBHOOK_SECRET']  # Your secret from subscription

    # Compute expected signature
    payload = request.get_data()
    expected_signature = 'sha256=' + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    # Timing-safe comparison
    if not hmac.compare_digest(signature, expected_signature):
        return jsonify({'error': 'Invalid signature'}), 401

    # Parse and process webhook
    data = request.get_json()
    print(f"Received event: {data['event']}")
    print(f"Bug data: {data['data']}")

    return jsonify({'success': True}), 200
```

**Go:**
```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "io/ioutil"
    "net/http"
)

func handleWebhook(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-Webhook-Signature")
    secret := os.Getenv("WEBHOOK_SECRET") // Your secret from subscription

    // Read raw body
    body, _ := ioutil.ReadAll(r.Body)

    // Compute expected signature
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(body)
    expectedSignature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

    // Timing-safe comparison
    if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Parse and process webhook
    var payload map[string]interface{}
    json.Unmarshal(body, &payload)

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
```

#### Security Best Practices

1. ✅ **Always verify signatures** - Never skip signature verification in production
2. ✅ **Use timing-safe comparison** - Prevents timing attack vulnerabilities
3. ✅ **Keep secrets secure** - Store webhook secrets in environment variables, never in code
4. ✅ **Use HTTPS endpoints** - Protect webhook payloads in transit
5. ✅ **Validate payload structure** - Check required fields before processing
6. ✅ **Check delivery IDs** - Store `X-Webhook-Delivery` to detect duplicates
7. ✅ **Respond quickly** - Return 200 OK within 10 seconds to avoid retries
8. ✅ **Process asynchronously** - Queue long-running tasks, don't block the response

---

### Webhook Payload Reference

For complete payload schemas and examples, see [Webhook Payload Schemas](../webhooks/PAYLOAD_SCHEMAS.md).

#### Quick Reference

**bug.submitted:**
```json
{
  "event": "bug.submitted",
  "timestamp": 1705320000000,
  "data": {
    "bugReport": { /* Complete enhanced bug report */ },
    "githubIssueUrl": "https://github.com/...",
    "clickupTaskUrl": "https://app.clickup.com/..."
  }
}
```

**bug.status_changed:**
```json
{
  "event": "bug.status_changed",
  "timestamp": 1705327200000,
  "data": {
    "bugReport": { /* Bug report details */ },
    "githubIssueUrl": "https://github.com/...",
    "clickupTaskUrl": "https://app.clickup.com/...",
    "previousStatus": "open",
    "newStatus": "in progress"
  }
}
```

**bug.resolved:**
```json
{
  "event": "bug.resolved",
  "timestamp": 1705330800000,
  "data": {
    "bugReport": { /* Bug report details */ },
    "githubIssueUrl": "https://github.com/...",
    "clickupTaskUrl": "https://app.clickup.com/...",
    "previousStatus": "in progress",
    "newStatus": "closed"
  }
}
```

---

### Testing Outgoing Webhooks

#### Using webhook.site

Quick testing without writing code:

1. Go to [https://webhook.site](https://webhook.site)
2. Copy your unique URL
3. Subscribe to webhooks:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/subscribe \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://webhook.site/your-unique-id",
       "events": ["bug.submitted"],
       "secret": "test-secret-key-12345"
     }'
   ```
4. Submit a test bug via the web form
5. View the received payload on webhook.site
6. Verify the `X-Webhook-Signature` header is present

#### Using a Local Test Server

Create a simple test receiver:

**test-webhook-receiver.js:**
```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
const SECRET = 'test-secret-key-12345';

// Use express.raw to get raw body for signature verification
app.use(express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  console.log('\n--- Webhook Received ---');
  console.log('Event:', req.headers['x-webhook-event']);
  console.log('Delivery ID:', req.headers['x-webhook-delivery']);

  // Verify signature
  const signature = req.headers['x-webhook-signature'];
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(req.body)
    .digest('hex');

  console.log('Signature valid:', signature === expectedSignature);

  // Parse and display payload
  const payload = JSON.parse(req.body);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  res.status(200).json({ success: true });
});

app.listen(4000, () => {
  console.log('Test webhook receiver running on http://localhost:4000');
  console.log('Webhook secret:', SECRET);
});
```

**Run the test receiver:**
```bash
# Install Express
npm install express

# Start the receiver
node test-webhook-receiver.js
```

**Expose with ngrok (for external testing):**
```bash
ngrok http 4000
```

**Subscribe to your test endpoint:**
```bash
# For local testing (same machine)
curl -X POST http://localhost:3000/api/webhooks/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:4000/webhook",
    "events": ["bug.submitted", "bug.status_changed", "bug.resolved"],
    "secret": "test-secret-key-12345"
  }'

# For external testing (with ngrok)
curl -X POST http://localhost:3000/api/webhooks/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-ngrok-url.ngrok.io/webhook",
    "events": ["bug.submitted", "bug.status_changed", "bug.resolved"],
    "secret": "test-secret-key-12345"
  }'
```

**Trigger a test webhook:**
1. Submit a bug via the web form at http://localhost:3000
2. Check the test receiver console for webhook delivery
3. Verify signature validation passes
4. Inspect the complete payload structure

---

### Integration Examples

#### Slack Notifications

Send bug notifications to Slack using incoming webhooks:

```javascript
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

app.use(express.raw({ type: 'application/json' }));

app.post('/webhooks/bugs', async (req, res) => {
  // Verify signature
  const signature = req.headers['x-webhook-signature'];
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(req.body);

  // Format Slack message
  let message;
  if (payload.event === 'bug.submitted') {
    message = {
      text: ':bug: New Bug Reported',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${payload.data.bugReport.title}*\n${payload.data.bugReport.description.substring(0, 200)}...`
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Severity:* ${payload.data.bugReport.severity}` },
            { type: 'mrkdwn', text: `*Category:* ${payload.data.bugReport.category}` }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View in GitHub' },
              url: payload.data.githubIssueUrl
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View in ClickUp' },
              url: payload.data.clickupTaskUrl
            }
          ]
        }
      ]
    };
  }

  // Send to Slack
  await axios.post(SLACK_WEBHOOK_URL, message);

  res.status(200).json({ success: true });
});

app.listen(3001, () => console.log('Slack webhook bridge running on port 3001'));
```

#### Custom Dashboard Updates

Update a custom dashboard with real-time bug metrics:

```javascript
app.post('/webhooks/bugs', async (req, res) => {
  // ... signature verification ...

  const payload = JSON.parse(req.body);

  // Update dashboard metrics
  if (payload.event === 'bug.submitted') {
    await db.metrics.increment('bugs_total');
    await db.metrics.increment(`bugs_severity_${payload.data.bugReport.severity}`);

    // Trigger real-time dashboard update via WebSocket
    io.emit('bug:new', {
      title: payload.data.bugReport.title,
      severity: payload.data.bugReport.severity,
      timestamp: payload.timestamp
    });
  }

  if (payload.event === 'bug.resolved') {
    await db.metrics.increment('bugs_resolved');
    const timeToResolve = payload.timestamp - payload.data.bugReport.submittedAt;
    await db.metrics.record('resolution_time', timeToResolve);
  }

  res.status(200).json({ success: true });
});
```

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

### Outgoing Webhooks Not Being Delivered

**Cause:** No active subscriptions or delivery failures

**Solutions:**
1. Verify subscription exists:
   ```bash
   # Check if webhook is subscribed
   curl http://localhost:3000/api/webhooks/subscribe \
     -H "Content-Type: application/json" \
     -d '{"url":"https://your-endpoint.com/webhook","events":["bug.submitted"],"secret":"test"}'
   ```
2. Check server logs for delivery attempts and errors
3. Verify your webhook endpoint is accessible (HTTPS required, or HTTP for localhost)
4. Test endpoint directly with curl to ensure it responds with 200 OK
5. Check that endpoint responds within 10 seconds (timeout)
6. Verify endpoint URL is correct (no typos)

### Outgoing Webhook Signature Verification Fails

**Cause:** Incorrect signature verification implementation

**Solutions:**
1. Ensure you're using the same secret provided during subscription
2. Verify you're reading the raw request body (not parsed JSON) for signature calculation
3. Check header name is `X-Webhook-Signature` (case-sensitive)
4. Verify signature format includes `sha256=` prefix
5. Use timing-safe comparison (e.g., `crypto.timingSafeEqual()` in Node.js)
6. Test with the example code provided in [Signature Verification](#signature-verification)

**Debug signature calculation:**
```javascript
// Log expected vs actual signatures for debugging
console.log('Received signature:', req.headers['x-webhook-signature']);
console.log('Expected signature:', 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
```

### Webhook Subscription Returns 400 Invalid URL

**Cause:** URL format validation failure

**Solutions:**
1. Ensure URL uses HTTPS protocol (HTTP only allowed for localhost)
   - ✅ `https://example.com/webhook`
   - ✅ `http://localhost:4000/webhook`
   - ❌ `http://example.com/webhook`
2. Verify URL is properly formatted (no spaces, valid domain)
3. Check that URL is accessible from the bug tracker server
4. For local testing, use ngrok to expose localhost with HTTPS

### Webhook Subscription Returns 400 Secret Too Short

**Cause:** Webhook secret doesn't meet minimum length requirement

**Solutions:**
1. Use a secret with at least 16 characters
2. Generate a secure random secret:
   ```bash
   openssl rand -hex 32
   ```
3. Avoid simple or predictable secrets

### Outgoing Webhooks Triggering Multiple Times

**Cause:** Retry logic activated due to slow or failed responses

**Solutions:**
1. Ensure your webhook endpoint responds with 200 OK quickly (within 10 seconds)
2. Implement idempotency using the `X-Webhook-Delivery` header:
   ```javascript
   const deliveryId = req.headers['x-webhook-delivery'];

   // Check if already processed
   if (await isAlreadyProcessed(deliveryId)) {
     return res.status(200).json({ success: true, duplicate: true });
   }

   // Process webhook
   await processWebhook(req.body);

   // Mark as processed
   await markAsProcessed(deliveryId);

   res.status(200).json({ success: true });
   ```
3. Process webhooks asynchronously (queue the work, respond immediately)
4. Check server logs to see if initial delivery succeeded
5. Don't return 5xx errors unless truly necessary (triggers retries)

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

- [Webhook Payload Schemas](../webhooks/PAYLOAD_SCHEMAS.md) - Complete JSON schemas for all webhook payloads
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
