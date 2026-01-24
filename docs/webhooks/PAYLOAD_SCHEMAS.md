# Webhook Payload Schemas

This document provides complete JSON schema documentation for all webhook payloads used in the Carespace Bug Tracker, including both incoming webhooks (from GitHub and ClickUp) and outgoing webhooks (to external services).

## Table of Contents

1. [Overview](#overview)
2. [Incoming Webhooks](#incoming-webhooks)
   - [GitHub Webhooks](#github-webhooks)
   - [ClickUp Webhooks](#clickup-webhooks)
3. [Outgoing Webhooks](#outgoing-webhooks)
   - [bug.submitted](#bugsubmitted)
   - [bug.status_changed](#bugstatus_changed)
   - [bug.resolved](#bugresolved)
4. [Security](#security)
5. [Testing Payloads](#testing-payloads)

---

## Overview

The bug tracker uses webhooks for two-way synchronization and integration with external services:

- **Incoming Webhooks**: Receive events from GitHub and ClickUp to sync changes
- **Outgoing Webhooks**: Send events to external services (Slack, custom dashboards, etc.)

All webhook payloads use **JSON format** with **UTF-8 encoding**.

### Common Headers

All webhook requests include standard HTTP headers:

```
Content-Type: application/json
User-Agent: Carespace-Bug-Tracker/1.0 (or GitHub-Hookshot/xxx, ClickUp-Webhook/xxx)
X-Request-ID: unique-request-identifier
```

---

## Incoming Webhooks

Incoming webhooks allow GitHub and ClickUp to notify the bug tracker when issues or tasks are updated, enabling real-time synchronization.

### GitHub Webhooks

GitHub sends webhook events to: `https://your-domain.com/api/webhooks/github`

#### Verification Headers

```
X-Hub-Signature-256: sha256=<hmac-signature>
X-GitHub-Event: <event-type>
X-GitHub-Delivery: <unique-delivery-id>
```

#### Supported Events

The bug tracker handles the following GitHub webhook events:

| Event Type | Action | Description |
|------------|--------|-------------|
| `issues` | `opened` | New issue created |
| `issues` | `closed` | Issue closed |
| `issues` | `reopened` | Issue reopened |
| `issues` | `labeled` | Label added to issue |
| `issues` | `unlabeled` | Label removed from issue |
| `issue_comment` | `created` | Comment added to issue |

---

#### Issue Opened Event

Triggered when a new issue is created.

**Headers:**
```
X-GitHub-Event: issues
```

**Payload:**
```json
{
  "action": "opened",
  "issue": {
    "id": 1234567890,
    "number": 42,
    "state": "open",
    "title": "Bug: Login button not working",
    "body": "## Description\nThe login button doesn't respond to clicks...",
    "user": {
      "login": "octocat",
      "id": 1,
      "avatar_url": "https://github.com/images/error/octocat_happy.gif"
    },
    "labels": [
      {
        "id": 208045946,
        "name": "bug",
        "color": "d73a4a"
      },
      {
        "id": 208045947,
        "name": "high-priority",
        "color": "ff0000"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "html_url": "https://github.com/carespace-ai/carespace-bug-tracker/issues/42"
  },
  "repository": {
    "id": 123456789,
    "name": "carespace-bug-tracker",
    "full_name": "carespace-ai/carespace-bug-tracker",
    "owner": {
      "login": "carespace-ai"
    }
  },
  "sender": {
    "login": "octocat",
    "id": 1
  }
}
```

**Key Fields:**
- `action`: Always `"opened"` for this event
- `issue.number`: The issue number (used for sync mapping)
- `issue.state`: Current state (`"open"` or `"closed"`)
- `issue.labels`: Array of label objects with name and color

---

#### Issue Closed Event

Triggered when an issue is closed.

**Headers:**
```
X-GitHub-Event: issues
```

**Payload:**
```json
{
  "action": "closed",
  "issue": {
    "id": 1234567890,
    "number": 42,
    "state": "closed",
    "title": "Bug: Login button not working",
    "body": "## Description\nThe login button doesn't respond to clicks...",
    "closed_at": "2024-01-15T14:45:00Z",
    "user": {
      "login": "octocat"
    },
    "labels": [
      {
        "name": "bug"
      },
      {
        "name": "resolved"
      }
    ],
    "html_url": "https://github.com/carespace-ai/carespace-bug-tracker/issues/42"
  },
  "repository": {
    "name": "carespace-bug-tracker",
    "full_name": "carespace-ai/carespace-bug-tracker"
  }
}
```

**Key Fields:**
- `action`: Always `"closed"` for this event
- `issue.state`: Always `"closed"`
- `issue.closed_at`: ISO 8601 timestamp when issue was closed

**Processing:**
The webhook handler syncs the closed status to ClickUp, marking the corresponding task as "complete".

---

#### Issue Reopened Event

Triggered when a closed issue is reopened.

**Headers:**
```
X-GitHub-Event: issues
```

**Payload:**
```json
{
  "action": "reopened",
  "issue": {
    "id": 1234567890,
    "number": 42,
    "state": "open",
    "title": "Bug: Login button not working",
    "body": "## Description\nThe login button doesn't respond to clicks...",
    "user": {
      "login": "octocat"
    },
    "labels": [
      {
        "name": "bug"
      },
      {
        "name": "reopened"
      }
    ],
    "html_url": "https://github.com/carespace-ai/carespace-bug-tracker/issues/42"
  },
  "repository": {
    "name": "carespace-bug-tracker",
    "full_name": "carespace-ai/carespace-bug-tracker"
  }
}
```

**Key Fields:**
- `action`: Always `"reopened"` for this event
- `issue.state`: Always `"open"`

**Processing:**
The webhook handler syncs the reopened status to ClickUp, marking the corresponding task as "to do".

---

#### Issue Labeled Event

Triggered when a label is added to an issue.

**Headers:**
```
X-GitHub-Event: issues
```

**Payload:**
```json
{
  "action": "labeled",
  "issue": {
    "id": 1234567890,
    "number": 42,
    "state": "open",
    "title": "Bug: Login button not working",
    "labels": [
      {
        "id": 208045946,
        "name": "bug",
        "color": "d73a4a"
      },
      {
        "id": 208045947,
        "name": "high-priority",
        "color": "ff0000"
      },
      {
        "id": 208045948,
        "name": "frontend",
        "color": "0052cc"
      }
    ],
    "html_url": "https://github.com/carespace-ai/carespace-bug-tracker/issues/42"
  },
  "label": {
    "id": 208045948,
    "name": "frontend",
    "color": "0052cc"
  },
  "repository": {
    "name": "carespace-bug-tracker",
    "full_name": "carespace-ai/carespace-bug-tracker"
  }
}
```

**Key Fields:**
- `action`: Always `"labeled"` for this event
- `label`: The specific label that was added
- `issue.labels`: Complete array of all current labels

**Processing:**
The webhook handler fetches the current issue state to get all labels, then syncs them to ClickUp as tags.

---

#### Issue Unlabeled Event

Triggered when a label is removed from an issue.

**Headers:**
```
X-GitHub-Event: issues
```

**Payload:**
```json
{
  "action": "unlabeled",
  "issue": {
    "id": 1234567890,
    "number": 42,
    "state": "open",
    "title": "Bug: Login button not working",
    "labels": [
      {
        "id": 208045946,
        "name": "bug",
        "color": "d73a4a"
      },
      {
        "id": 208045947,
        "name": "high-priority",
        "color": "ff0000"
      }
    ],
    "html_url": "https://github.com/carespace-ai/carespace-bug-tracker/issues/42"
  },
  "label": {
    "id": 208045948,
    "name": "frontend",
    "color": "0052cc"
  },
  "repository": {
    "name": "carespace-bug-tracker",
    "full_name": "carespace-ai/carespace-bug-tracker"
  }
}
```

**Key Fields:**
- `action`: Always `"unlabeled"` for this event
- `label`: The specific label that was removed
- `issue.labels`: Complete array of remaining labels

**Processing:**
The webhook handler fetches the current issue state to get all labels, then syncs the updated label list to ClickUp as tags.

---

#### Issue Comment Created Event

Triggered when a comment is added to an issue.

**Headers:**
```
X-GitHub-Event: issue_comment
```

**Payload:**
```json
{
  "action": "created",
  "issue": {
    "id": 1234567890,
    "number": 42,
    "state": "open",
    "title": "Bug: Login button not working",
    "html_url": "https://github.com/carespace-ai/carespace-bug-tracker/issues/42"
  },
  "comment": {
    "id": 987654321,
    "body": "I've investigated this issue and found the root cause in the authentication module.",
    "user": {
      "login": "developer123",
      "id": 456,
      "avatar_url": "https://avatars.githubusercontent.com/u/456"
    },
    "created_at": "2024-01-15T11:30:00Z",
    "updated_at": "2024-01-15T11:30:00Z",
    "html_url": "https://github.com/carespace-ai/carespace-bug-tracker/issues/42#issuecomment-987654321"
  },
  "repository": {
    "name": "carespace-bug-tracker",
    "full_name": "carespace-ai/carespace-bug-tracker"
  }
}
```

**Key Fields:**
- `action`: Always `"created"` for this event
- `comment.body`: The comment text content
- `comment.user.login`: The GitHub username of the commenter

**Processing:**
The webhook handler syncs the comment to ClickUp, creating a new comment on the corresponding task with the format: `[GitHub - username]: comment body`

---

### ClickUp Webhooks

ClickUp sends webhook events to: `https://your-domain.com/api/webhooks/clickup`

#### Verification Headers

```
X-Signature: <hmac-signature>
Content-Type: application/json
```

#### Supported Events

The bug tracker handles the following ClickUp webhook events:

| Event Type | Description |
|------------|-------------|
| `taskStatusUpdated` | Task status changed |
| `taskTagsUpdated` | Tags added or removed from task |
| `taskCommentPosted` | Comment added to task |

---

#### Task Status Updated Event

Triggered when a task's status changes.

**Headers:**
```
X-Signature: <hmac-signature>
Content-Type: application/json
```

**Payload:**
```json
{
  "event": "taskStatusUpdated",
  "webhook_id": "abc123-webhook-id",
  "task_id": "86a1gqq42",
  "history_items": [
    {
      "id": "history-item-123",
      "type": 1,
      "date": "1705320000000",
      "field": "status",
      "parent_id": "86a1gqq42",
      "before": {
        "status": "to do",
        "color": "#d3d3d3",
        "orderindex": 0,
        "type": "open"
      },
      "after": {
        "status": "in progress",
        "color": "#4194f6",
        "orderindex": 1,
        "type": "open"
      },
      "user": {
        "id": 12345,
        "username": "johndoe",
        "email": "john@example.com"
      }
    }
  ]
}
```

**Key Fields:**
- `event`: Always `"taskStatusUpdated"` for this event
- `task_id`: ClickUp task ID (used for sync mapping)
- `history_items[0].field`: Always `"status"` for status changes
- `history_items[0].after`: The new status value

**Status Mapping:**
- `"to do"` → GitHub: `open`
- `"in progress"` → GitHub: `open`
- `"complete"` → GitHub: `closed`

**Processing:**
The webhook handler extracts the new status from `history_items` and syncs it to GitHub, opening or closing the corresponding issue.

---

#### Task Tags Updated Event

Triggered when tags are added to or removed from a task.

**Headers:**
```
X-Signature: <hmac-signature>
Content-Type: application/json
```

**Payload:**
```json
{
  "event": "taskTagsUpdated",
  "webhook_id": "abc123-webhook-id",
  "task_id": "86a1gqq42",
  "history_items": [
    {
      "id": "history-item-456",
      "type": 1,
      "date": "1705320000000",
      "field": "tag",
      "parent_id": "86a1gqq42",
      "before": null,
      "after": {
        "name": "frontend",
        "tag_fg": "#ffffff",
        "tag_bg": "#0052cc"
      },
      "user": {
        "id": 12345,
        "username": "johndoe"
      }
    }
  ]
}
```

**Key Fields:**
- `event`: Always `"taskTagsUpdated"` for this event
- `task_id`: ClickUp task ID (used for sync mapping)
- `history_items`: Array of tag changes (added or removed)

**Processing:**
The webhook handler fetches the current task state to get all tags, then syncs the complete tag list to GitHub as labels.

---

#### Task Comment Posted Event

Triggered when a comment is added to a task.

**Headers:**
```
X-Signature: <hmac-signature>
Content-Type: application/json
```

**Payload:**
```json
{
  "event": "taskCommentPosted",
  "webhook_id": "abc123-webhook-id",
  "task_id": "86a1gqq42",
  "comment": {
    "id": "comment-789",
    "comment_text": "I've tested the fix and it works perfectly!",
    "user": {
      "id": 12345,
      "username": "johndoe",
      "email": "john@example.com",
      "profilePicture": "https://attachments.clickup.com/profilePictures/12345.jpg"
    },
    "date": "1705320000000"
  },
  "history_items": [
    {
      "id": "history-item-789",
      "type": 1,
      "date": "1705320000000",
      "field": "comment",
      "parent_id": "86a1gqq42",
      "comment": {
        "id": "comment-789",
        "comment_text": "I've tested the fix and it works perfectly!"
      },
      "user": {
        "id": 12345,
        "username": "johndoe"
      }
    }
  ]
}
```

**Key Fields:**
- `event`: Always `"taskCommentPosted"` for this event
- `task_id`: ClickUp task ID (used for sync mapping)
- `comment.comment_text`: The comment text content
- `comment.user.username`: The ClickUp username of the commenter

**Processing:**
The webhook handler syncs the comment to GitHub, creating a new comment on the corresponding issue with the format: `[ClickUp - username]: comment text`

---

## Outgoing Webhooks

Outgoing webhooks allow external services to receive notifications when bugs are submitted, status changes, or bugs are resolved.

### Configuration

External services can subscribe to webhook events by registering a webhook URL with the bug tracker. Each subscription includes:

- **URL**: The endpoint to receive webhook POST requests
- **Events**: Array of event types to subscribe to (`bug.submitted`, `bug.status_changed`, `bug.resolved`)
- **Secret**: Shared secret for HMAC signature verification

### Common Payload Structure

All outgoing webhooks follow this base structure:

```typescript
{
  "event": "bug.submitted" | "bug.status_changed" | "bug.resolved",
  "timestamp": 1705320000000,
  "data": {
    "bugReport": { /* BugReport or EnhancedBugReport object */ },
    "githubIssueUrl": "https://github.com/...",
    "clickupTaskUrl": "https://app.clickup.com/...",
    "previousStatus": "open",      // Only for status_changed
    "newStatus": "closed"           // Only for status_changed
  }
}
```

### Security Headers

All outgoing webhook requests include:

```
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac-signature>
X-Webhook-Event: <event-type>
X-Webhook-Delivery: <unique-delivery-id>
User-Agent: Carespace-Bug-Tracker/1.0
```

**Signature Verification:**
The `X-Webhook-Signature` header contains an HMAC SHA-256 signature of the request body using the webhook's secret. Verify it to ensure the request is authentic.

**Example verification (Node.js):**
```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

### bug.submitted

Triggered when a new bug report is submitted through the web form or Chrome extension.

**Event:** `bug.submitted`

**Payload Example:**
```json
{
  "event": "bug.submitted",
  "timestamp": 1705320000000,
  "data": {
    "bugReport": {
      "title": "Login button not responding to clicks",
      "description": "The login button on the homepage doesn't respond when clicked. No error messages appear.",
      "stepsToReproduce": "1. Navigate to homepage\n2. Click login button\n3. Nothing happens",
      "expectedBehavior": "Login modal should appear",
      "actualBehavior": "No response, button appears inactive",
      "severity": "high",
      "category": "functionality",
      "userEmail": "user@example.com",
      "environment": "Production",
      "browserInfo": "Chrome 120.0.0 on macOS 14.2",
      "attachments": [
        {
          "name": "screenshot.png",
          "size": 245678,
          "type": "image/png",
          "url": "https://github.com/carespace-ai/carespace-bug-tracker/raw/main/bug-attachments/1705320000-screenshot.png"
        }
      ],
      "enhancedDescription": "User reports that the login button on the homepage is unresponsive. This appears to be a critical UI interaction issue affecting user authentication flow.",
      "rootCauseHypothesis": "Likely event handler not properly attached or JavaScript error preventing event propagation.",
      "codebaseContext": "Check LoginButton.tsx component, useAuth hook, and event handler bindings in HomePage.tsx",
      "enhancedExpectedBehavior": "When user clicks the login button, it should trigger the authentication modal overlay with email/password input fields.",
      "enhancedActualBehavior": "The button click produces no visible response - no modal appears, no console errors, and the button doesn't show active/focus states.",
      "gapAnalysis": "The authentication flow is completely blocked due to the unresponsive login entry point, preventing all users from accessing protected features.",
      "suggestedLabels": ["bug", "high-priority", "authentication", "frontend"],
      "technicalContext": "Frontend UI component issue in the authentication flow. Affects user authentication capability.",
      "claudePrompt": "Fix the unresponsive login button on the homepage. The button should trigger the authentication modal when clicked. Check event handlers in LoginButton.tsx and ensure proper integration with the authentication system.",
      "priority": 8,
      "targetRepo": "frontend"
    },
    "githubIssueUrl": "https://github.com/carespace-ai/carespace-frontend/issues/42",
    "clickupTaskUrl": "https://app.clickup.com/t/86a1gqq42"
  }
}
```

**Key Fields:**
- `event`: Always `"bug.submitted"`
- `timestamp`: Unix timestamp in milliseconds when the bug was submitted
- `data.bugReport`: The complete enhanced bug report object
- `data.githubIssueUrl`: Direct link to the created GitHub issue
- `data.clickupTaskUrl`: Direct link to the created ClickUp task

**Use Cases:**
- Send Slack notifications when new bugs are submitted
- Update custom dashboards with real-time bug metrics
- Trigger automated testing pipelines
- Notify on-call engineers of critical bugs

---

### bug.status_changed

Triggered when a bug's status changes in either GitHub or ClickUp.

**Event:** `bug.status_changed`

**Payload Example:**
```json
{
  "event": "bug.status_changed",
  "timestamp": 1705327200000,
  "data": {
    "bugReport": {
      "title": "Login button not responding to clicks",
      "description": "The login button on the homepage doesn't respond when clicked...",
      "severity": "high",
      "category": "functionality",
      "userEmail": "user@example.com",
      "environment": "Production",
      "browserInfo": "Chrome 120.0.0 on macOS 14.2"
    },
    "githubIssueUrl": "https://github.com/carespace-ai/carespace-frontend/issues/42",
    "clickupTaskUrl": "https://app.clickup.com/t/86a1gqq42",
    "previousStatus": "open",
    "newStatus": "closed"
  }
}
```

**Key Fields:**
- `event`: Always `"bug.status_changed"`
- `timestamp`: Unix timestamp in milliseconds when the status changed
- `data.previousStatus`: The status before the change (`"open"`, `"in progress"`, `"closed"`)
- `data.newStatus`: The status after the change (`"open"`, `"in progress"`, `"closed"`)

**Status Values:**
- `"open"` - Bug is reported and not yet being worked on
- `"in progress"` - Bug is actively being investigated or fixed
- `"closed"` - Bug has been resolved or closed

**Use Cases:**
- Track bug resolution time metrics
- Send notifications when high-priority bugs are being worked on
- Update project management dashboards
- Trigger post-resolution workflows (e.g., request user verification)

---

### bug.resolved

Triggered when a bug is marked as resolved (status changes to `"closed"`).

**Event:** `bug.resolved`

**Payload Example:**
```json
{
  "event": "bug.resolved",
  "timestamp": 1705330800000,
  "data": {
    "bugReport": {
      "title": "Login button not responding to clicks",
      "description": "The login button on the homepage doesn't respond when clicked...",
      "severity": "high",
      "category": "functionality",
      "userEmail": "user@example.com",
      "environment": "Production",
      "browserInfo": "Chrome 120.0.0 on macOS 14.2",
      "enhancedDescription": "User reports that the login button on the homepage is unresponsive...",
      "rootCauseHypothesis": "Event handler not properly attached or JavaScript error preventing event propagation.",
      "suggestedLabels": ["bug", "high-priority", "authentication", "frontend", "resolved"],
      "priority": 8,
      "targetRepo": "frontend"
    },
    "githubIssueUrl": "https://github.com/carespace-ai/carespace-frontend/issues/42",
    "clickupTaskUrl": "https://app.clickup.com/t/86a1gqq42",
    "previousStatus": "in progress",
    "newStatus": "closed"
  }
}
```

**Key Fields:**
- `event`: Always `"bug.resolved"`
- `timestamp`: Unix timestamp in milliseconds when the bug was resolved
- `data.previousStatus`: The status before resolution (typically `"in progress"` or `"open"`)
- `data.newStatus`: Always `"closed"` for resolved bugs

**Use Cases:**
- Send resolution notifications to the original bug reporter
- Update SLA tracking systems
- Trigger deployment notifications
- Generate resolution metrics and reports
- Request user feedback on the fix

---

## Security

### Webhook Signature Verification

All webhooks (incoming and outgoing) use HMAC SHA-256 signatures for authentication.

#### Verifying Incoming Webhooks

**GitHub:**
```javascript
const crypto = require('crypto');

function verifyGitHubSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage
const signature = request.headers['x-hub-signature-256'];
const isValid = verifyGitHubSignature(requestBody, signature, process.env.GITHUB_WEBHOOK_SECRET);
```

**ClickUp:**
```javascript
const crypto = require('crypto');

function verifyClickUpSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage
const signature = request.headers['x-signature'];
const isValid = verifyClickUpSignature(requestBody, signature, process.env.CLICKUP_WEBHOOK_SECRET);
```

#### Verifying Outgoing Webhooks

External services receiving outgoing webhooks should verify the `X-Webhook-Signature` header:

```javascript
const crypto = require('crypto');

function verifyOutgoingWebhook(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in Express.js
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyOutgoingWebhook(payload, signature, YOUR_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook...
  res.status(200).json({ success: true });
});
```

### Best Practices

1. ✅ **Always verify signatures** - Never skip signature verification
2. ✅ **Use timing-safe comparison** - Prevents timing attacks
3. ✅ **Use HTTPS** - All webhook URLs must use HTTPS in production
4. ✅ **Validate payload structure** - Check required fields before processing
5. ✅ **Handle duplicates** - Use delivery IDs to prevent duplicate processing
6. ✅ **Respond quickly** - Return 200 OK within 10 seconds to prevent timeouts
7. ✅ **Process asynchronously** - Queue webhook processing for long-running tasks

---

## Testing Payloads

### Testing Incoming Webhooks

#### GitHub Test Payloads

Use these cURL commands to test GitHub webhook handling locally (with ngrok):

**Test Issue Closed:**
```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: issues" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{"action":"closed","issue":{"number":42,"state":"closed"}}' | openssl dgst -sha256 -hmac 'your-webhook-secret' | cut -d' ' -f2)" \
  -d '{
    "action": "closed",
    "issue": {
      "number": 42,
      "state": "closed",
      "title": "Test Issue",
      "labels": [{"name": "bug"}]
    }
  }'
```

**Test Issue Comment:**
```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: issue_comment" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{"action":"created","issue":{"number":42},"comment":{"body":"Test comment","user":{"login":"testuser"}}}' | openssl dgst -sha256 -hmac 'your-webhook-secret' | cut -d' ' -f2)" \
  -d '{
    "action": "created",
    "issue": {
      "number": 42
    },
    "comment": {
      "body": "Test comment",
      "user": {
        "login": "testuser"
      }
    }
  }'
```

#### ClickUp Test Payloads

**Test Status Update:**
```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/webhooks/clickup \
  -H "Content-Type: application/json" \
  -H "X-Signature: $(echo -n '{"event":"taskStatusUpdated","task_id":"86a1gqq42","history_items":[{"field":"status","after":"complete"}]}' | openssl dgst -sha256 -hmac 'your-webhook-secret' | cut -d' ' -f2)" \
  -d '{
    "event": "taskStatusUpdated",
    "task_id": "86a1gqq42",
    "history_items": [
      {
        "field": "status",
        "after": "complete"
      }
    ]
  }'
```

### Testing Outgoing Webhooks

Set up a test endpoint to receive outgoing webhooks:

**Using webhook.site:**
1. Go to https://webhook.site
2. Copy your unique URL
3. Register it as a webhook subscription in the bug tracker
4. Submit a test bug to trigger the webhook
5. View the received payload on webhook.site

**Using a local test server:**
```javascript
// test-webhook-receiver.js
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('Received webhook:');
  console.log('Event:', req.headers['x-webhook-event']);
  console.log('Delivery ID:', req.headers['x-webhook-delivery']);
  console.log('Payload:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ success: true });
});

app.listen(4000, () => {
  console.log('Test webhook receiver listening on port 4000');
});
```

Run with: `node test-webhook-receiver.js`

Then use ngrok to expose it: `ngrok http 4000`

---

## Additional Resources

- [GitHub Webhooks API Documentation](https://docs.github.com/en/webhooks)
- [ClickUp Webhooks API Documentation](https://clickup.com/api/clickupreference/operation/CreateWebhook/)
- [Webhook Setup Guide](../setup/WEBHOOK_SETUP.md)
- [HMAC Authentication Best Practices](https://www.okta.com/identity-101/hmac/)

---

## Support

If you have questions about webhook payloads:

1. Check the [Webhook Setup Guide](../setup/WEBHOOK_SETUP.md) for configuration help
2. Review server logs for detailed error messages
3. Use webhook delivery history in GitHub/ClickUp to inspect actual payloads
4. Test with the cURL examples provided above
5. Verify signature verification is working correctly
