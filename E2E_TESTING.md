# End-to-End Testing: Two-Way Sync

This document provides instructions for testing the bidirectional synchronization between GitHub and ClickUp.

## Table of Contents

1. [GitHub-to-ClickUp Sync](#github-to-clickup-sync)
2. [ClickUp-to-GitHub Sync](#clickup-to-github-sync)
3. [Common Prerequisites](#common-prerequisites)
4. [Troubleshooting](#troubleshooting)

---

# GitHub-to-ClickUp Sync

This section covers testing that changes made in GitHub sync to ClickUp.

## Overview

The E2E test verifies that changes made in GitHub (status updates, comments, labels) are properly synchronized to ClickUp within 1 minute.

## Prerequisites

### 1. Environment Variables

Ensure all required environment variables are set:

```bash
# Existing variables
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
CLICKUP_API_KEY=pk_your_key_here
CLICKUP_LIST_ID=your_list_id
ANTHROPIC_API_KEY=sk-ant-your_key_here

# New webhook secrets
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
CLICKUP_WEBHOOK_SECRET=your_clickup_webhook_secret
```

Generate webhook secrets:
```bash
# Generate a secure random secret
openssl rand -hex 32
```

### 2. Install ngrok

Ngrok is required to expose your local webhook endpoints to the internet:

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### 3. Start Development Server

```bash
npm run dev
```

Server should be running at `http://localhost:3000`

## Step-by-Step Testing Process

### Phase 1: Automated Setup

Run the E2E test script:

```bash
npx ts-node scripts/e2e-test-github-to-clickup.ts
```

This script will:
1. ✅ Submit a test bug report
2. ✅ Verify GitHub issue and ClickUp task are created
3. ✅ Verify sync mapping is stored
4. 📋 Provide instructions for manual webhook testing

### Phase 2: Webhook Configuration

#### Configure ngrok

1. Start ngrok in a new terminal:
```bash
ngrok http 3000
```

2. Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok.io`)

#### Configure GitHub Webhook

1. Go to your GitHub repository
2. Navigate to **Settings → Webhooks → Add webhook**
3. Configure:
   - **Payload URL**: `https://your-ngrok-url.ngrok.io/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Your `GITHUB_WEBHOOK_SECRET` value
   - **Which events**: Select individual events:
     - ✓ Issues
     - ✓ Issue comments
   - **Active**: ✓ Checked
4. Click **Add webhook**
5. Verify webhook is listed with a green checkmark

### Phase 3: Manual Webhook Testing

The automated script creates a test issue. Use it to test the sync flow:

#### Test 1: Status Change (Close Issue)

1. **Action**: Go to the GitHub issue and close it
   - Click "Close issue" button
2. **Expected**: ClickUp task status changes to "complete" within 1 minute
3. **Verification**:
   - Check ClickUp task status
   - Check dev server logs for webhook POST request
   - Verify no errors in logs

#### Test 2: Status Change (Reopen Issue)

1. **Action**: Reopen the GitHub issue
   - Click "Reopen issue" button
2. **Expected**: ClickUp task status changes to "to do" within 1 minute
3. **Verification**:
   - Check ClickUp task status
   - Verify webhook request in logs

#### Test 3: Comment Sync

1. **Action**: Add a comment in GitHub
   - Comment: "Test comment from GitHub - E2E verification"
2. **Expected**: Comment appears in ClickUp within 1 minute
3. **Verification**:
   - Check ClickUp task comments
   - Verify comment text matches
   - Verify author attribution is correct

#### Test 4: Label Sync

1. **Action**: Add labels in GitHub
   - Add labels: "bug", "enhancement", or create custom labels
2. **Expected**: Labels appear as tags in ClickUp within 1 minute
3. **Verification**:
   - Check ClickUp task tags
   - Verify tag names match label names

#### Test 5: Remove Label

1. **Action**: Remove a label from the GitHub issue
2. **Expected**: Corresponding tag is removed from ClickUp within 1 minute
3. **Verification**:
   - Check ClickUp task tags
   - Verify tag is no longer present

## Monitoring and Debugging

### Check Webhook Deliveries

#### GitHub Webhook Monitoring

1. Go to **Settings → Webhooks**
2. Click on your webhook
3. Click **Recent Deliveries** tab
4. Check each delivery:
   - **Response**: Should be `200 OK`
   - **Headers**: Verify `X-Hub-Signature-256` is present
   - **Payload**: Review the event data

### Check Server Logs

Monitor the terminal running `npm run dev`:

```
✓ Compiled /api/webhooks/github/route in 123ms
POST /api/webhooks/github 200 in 456ms
```

Look for:
- ✅ Status `200`: Successful webhook processing
- ❌ Status `401`: Invalid signature
- ❌ Status `400`: Invalid payload
- ❌ Status `500`: Server error

### Common Issues and Solutions

#### Issue: Webhook returns 401 Unauthorized

**Cause**: Invalid webhook signature
**Solution**:
- Verify `GITHUB_WEBHOOK_SECRET` in `.env.local` matches GitHub webhook secret
- Restart dev server after changing environment variables

#### Issue: Webhook returns 500 Internal Server Error

**Cause**: Various server-side errors
**Solution**:
- Check server logs for detailed error message
- Verify all API keys are valid
- Ensure GitHub and ClickUp services are accessible

#### Issue: Sync doesn't happen (200 but no update)

**Cause**: Possible conflict resolution or mapping issue
**Solution**:
- Check if sync mapping exists for the issue
- Verify timestamp-based conflict resolution isn't blocking the update
- Check ClickUp task was created through our system (not manually)

#### Issue: ngrok URL changes after restart

**Cause**: Free ngrok URLs are temporary
**Solution**:
- Update GitHub webhook URL with new ngrok URL
- Consider ngrok paid plan for static URLs
- For production, use permanent deployment URL

## Expected Results

### Success Criteria

After completing all tests, verify:

- ✅ Bug report submission creates both GitHub issue and ClickUp task
- ✅ Sync mapping is stored with correct issue/task IDs
- ✅ Closing GitHub issue changes ClickUp task to "complete"
- ✅ Reopening GitHub issue changes ClickUp task back to "to do"
- ✅ GitHub comments appear in ClickUp with author attribution
- ✅ GitHub labels sync as ClickUp tags
- ✅ Label removals sync to ClickUp
- ✅ All webhook deliveries return 200 status
- ✅ No errors in server logs

### Timing

All sync operations should complete **within 1 minute** of the GitHub action.

Typical timing:
- GitHub webhook → Server: < 1 second
- Server processing → ClickUp API: 1-3 seconds
- Total: Usually completes in 2-5 seconds

## Cleanup

After testing, you may want to:

1. **Close test issues**:
   - Close the E2E test issue in GitHub
   - Mark ClickUp task as complete

2. **Clear sync mappings** (optional):
   - Sync mappings are stored in-memory and clear on server restart
   - Or run cleanup script if needed

3. **Stop ngrok**:
   ```bash
   # Press Ctrl+C in ngrok terminal
   ```

4. **Remove webhook** (optional):
   - GitHub Settings → Webhooks → Delete

## Next Steps

After successful GitHub-to-ClickUp testing:

1. ✅ Mark subtask-7-1 as complete
2. ⏭️ Continue to subtask-7-2: Test ClickUp-to-GitHub sync flow
3. ⏭️ Continue to subtask-7-3: Test label/tag sync (additional scenarios)
4. ⏭️ Continue to subtask-7-4: Document setup instructions

## Troubleshooting Commands

```bash
# Check if server is running
curl http://localhost:3000/api/submit-bug

# Test webhook endpoint (should return 401 without signature)
curl -X POST http://localhost:3000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -d '{"action":"opened","issue":{"number":1}}'

# Check environment variables
env | grep -E 'GITHUB|CLICKUP|ANTHROPIC'

# Verify TypeScript compilation
npx tsc --noEmit

# Run tests
npm test
```

---

# ClickUp-to-GitHub Sync

This section covers testing that changes made in ClickUp sync to GitHub.

## Prerequisites

Same as GitHub-to-ClickUp testing, plus:
- At least one synced task must exist (created via the GitHub-to-ClickUp test)
- ClickUp webhook must be configured

## Step-by-Step Testing Process

### Phase 1: ClickUp Webhook Configuration

#### Configure ngrok

If not already running, start ngrok:
```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok.io`)

#### Configure ClickUp Webhook

1. Go to [ClickUp Settings](https://app.clickup.com/)
2. Navigate to **Settings → Integrations → Webhooks**
3. Click **Create Webhook**
4. Configure:
   - **Endpoint URL**: `https://your-ngrok-url.ngrok.io/api/webhooks/clickup`
   - **Events to trigger**: Select task events:
     - ✓ Task Status Updated
     - ✓ Task Tag Updated
     - ✓ Task Comment Posted
   - **Space**: Select your workspace/space
5. Save the webhook
6. Verify webhook appears in the list as active

### Phase 2: Run E2E Test Script

Run the ClickUp-to-GitHub E2E test script:

```bash
npx ts-node scripts/e2e-test-clickup-to-github.ts
```

This script will:
1. ✅ Display all existing sync mappings
2. 📋 Provide webhook configuration instructions
3. 📋 Provide step-by-step testing instructions
4. 📋 Show task references for easy access

### Phase 3: Manual Testing

#### Test 1: Status Change (Complete Task)

1. **Action**: Open a synced ClickUp task
   - Change task status to "complete"
2. **Expected**: GitHub issue closes (state: closed) within 1 minute
3. **Verification**:
   - Check GitHub issue status
   - Check dev server logs for webhook POST request
   - Verify no errors in logs

#### Test 2: Status Change (Reopen Task)

1. **Action**: Change task status back to "to do"
2. **Expected**: GitHub issue reopens (state: open) within 1 minute
3. **Verification**:
   - Check GitHub issue status
   - Verify webhook request in logs

#### Test 3: Status Change (In Progress)

1. **Action**: Change task status to "in progress"
2. **Expected**: GitHub issue remains open within 1 minute
3. **Verification**:
   - Check GitHub issue status is "open"
   - ClickUp "in progress" maps to GitHub "open"

#### Test 4: Comment Sync

1. **Action**: Add a comment in ClickUp
   - Comment: "Test comment from ClickUp - E2E verification"
2. **Expected**: Comment appears in GitHub within 1 minute
3. **Verification**:
   - Check GitHub issue comments
   - Verify comment text matches
   - Verify author attribution is correct

#### Test 5: Tag Sync (Add Tag)

1. **Action**: Add tags in ClickUp
   - Add tags: "urgent", "needs-review", or custom tags
2. **Expected**: Tags appear as labels in GitHub within 1 minute
3. **Verification**:
   - Check GitHub issue labels
   - Verify label names match tag names

#### Test 6: Tag Sync (Remove Tag)

1. **Action**: Remove a tag from the ClickUp task
2. **Expected**: Corresponding label is removed from GitHub within 1 minute
3. **Verification**:
   - Check GitHub issue labels
   - Verify label is no longer present

## Monitoring and Debugging

### Check ClickUp Webhook Deliveries

1. Go to **ClickUp Settings → Integrations → Webhooks**
2. Click on your webhook
3. View the delivery history
4. Check each delivery:
   - **Response**: Should be `200 OK`
   - **Headers**: Verify `X-Signature` is present
   - **Payload**: Review the event data

### Check Server Logs

Monitor the terminal running `npm run dev`:

```
✓ Compiled /api/webhooks/clickup/route in 123ms
POST /api/webhooks/clickup 200 in 456ms
```

Look for:
- ✅ Status `200`: Successful webhook processing
- ❌ Status `401`: Invalid signature
- ❌ Status `400`: Invalid payload
- ❌ Status `500`: Server error

### ngrok Dashboard

Access ngrok's web interface at `http://localhost:4040`:
- View all incoming webhook requests
- Inspect request headers and payloads
- See response codes and bodies
- Replay requests for debugging

## Expected Results

### Success Criteria

After completing all tests, verify:

- ✅ ClickUp webhook is configured and active
- ✅ Changing ClickUp task to "complete" closes GitHub issue
- ✅ Changing ClickUp task to "to do"/"in progress" opens GitHub issue
- ✅ ClickUp comments appear in GitHub with author attribution
- ✅ ClickUp tags sync to GitHub as labels
- ✅ Tag additions and removals both sync
- ✅ All webhook deliveries return 200 status
- ✅ No errors in server logs

### Timing

All sync operations should complete **within 1 minute** of the ClickUp action.

Typical timing:
- ClickUp webhook → Server: < 1 second
- Server processing → GitHub API: 1-3 seconds
- Total: Usually completes in 2-5 seconds

## Cleanup

After testing:

1. **Keep webhooks** (optional):
   - Leave webhooks active for production use
   - Or disable/delete if only needed for testing

2. **Clear sync mappings** (optional):
   - Sync mappings are stored in-memory and clear on server restart
   - Or keep them for ongoing sync

3. **Stop ngrok** (optional):
   ```bash
   # Press Ctrl+C in ngrok terminal
   ```

## Next Steps

After successful ClickUp-to-GitHub testing:

1. ✅ Mark subtask-7-2 as complete
2. ⏭️ Continue to subtask-7-3: Test label/tag sync (additional edge cases)
3. ⏭️ Continue to subtask-7-4: Document setup instructions

---

# Label/Tag Sync Testing (Detailed)

This section provides comprehensive testing for label/tag synchronization in both directions.

## Overview

While basic label/tag sync testing is included in the GitHub-to-ClickUp and ClickUp-to-GitHub flows above, this section covers additional edge cases and provides a dedicated test script for thorough validation.

## Run Dedicated Label/Tag Test Script

```bash
npx ts-node scripts/e2e-test-label-sync.ts
```

This script provides:
- ✅ Detailed test scenarios for both sync directions
- ✅ Edge case testing (case sensitivity, special characters)
- ✅ Monitoring and debugging instructions
- ✅ Troubleshooting guide
- ✅ Success criteria checklist

## Test Scenarios Covered

### GitHub to ClickUp
1. **Add Single Label**: Verify label appears as tag in ClickUp
2. **Add Multiple Labels**: Verify all labels sync correctly
3. **Remove Label**: Verify tag is removed from ClickUp
4. **Case Sensitivity**: Test mixed-case label names
5. **Special Characters**: Test labels with hyphens, slashes, colons

### ClickUp to GitHub
1. **Add Single Tag**: Verify tag appears as label in GitHub
2. **Add Multiple Tags**: Verify all tags sync correctly
3. **Remove Tag**: Verify label is removed from GitHub
4. **Tag Colors**: Verify tags with different colors sync

## Edge Cases to Test

### Case Sensitivity
- GitHub labels are case-sensitive
- ClickUp tags are case-sensitive
- Verify: "Bug" and "bug" are treated as different labels/tags

### Special Characters
Test labels/tags with:
- Hyphens: `v2.0-beta`, `bug-fix`
- Slashes: `api/endpoint`, `feature/new`
- Colons: `priority:high`, `type:bug`
- Spaces: `good first issue`, `needs review`

### Multiple Operations
1. Add multiple labels simultaneously in GitHub
2. Verify all appear in ClickUp at once
3. Remove multiple labels at once
4. Verify all are removed from ClickUp

### Conflict Resolution
1. Add label "test" in GitHub
2. Before sync completes, add tag "test" in ClickUp
3. Verify: Most recent change wins (timestamp-based)

## Success Criteria

After completing all label/tag tests, verify:

- ✅ All labels added in GitHub appear as tags in ClickUp within 1 minute
- ✅ All labels removed in GitHub are removed from ClickUp within 1 minute
- ✅ All tags added in ClickUp appear as labels in GitHub within 1 minute
- ✅ All tags removed in ClickUp are removed from GitHub within 1 minute
- ✅ Case sensitivity is preserved in both directions
- ✅ Special characters are handled correctly
- ✅ Multiple simultaneous label/tag changes sync correctly
- ✅ No duplicate labels/tags are created
- ✅ Webhook deliveries return 200 status
- ✅ No errors in server logs

## Next Steps

After successful label/tag testing:

1. ✅ Mark subtask-7-3 as complete
2. ⏭️ Continue to subtask-7-4: Document setup instructions

---

# Common Prerequisites

## Environment Variables

Ensure all required environment variables are set:

```bash
# Existing variables
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
CLICKUP_API_KEY=pk_your_key_here
CLICKUP_LIST_ID=your_list_id
ANTHROPIC_API_KEY=sk-ant-your_key_here

# New webhook secrets
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
CLICKUP_WEBHOOK_SECRET=your_clickup_webhook_secret
```

Generate webhook secrets:
```bash
# Generate a secure random secret
openssl rand -hex 32
```

## Install ngrok

Ngrok is required to expose your local webhook endpoints to the internet:

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

## Start Development Server

```bash
npm run dev
```

Server should be running at `http://localhost:3000`

---

# Troubleshooting

## Common Issues and Solutions

### Issue: Webhook returns 401 Unauthorized

**Cause**: Invalid webhook signature
**Solution**:
- Verify webhook secret in `.env.local` matches the one configured in GitHub/ClickUp
- Restart dev server after changing environment variables
- Check that the correct secret environment variable is set (GITHUB_WEBHOOK_SECRET or CLICKUP_WEBHOOK_SECRET)

### Issue: Webhook returns 500 Internal Server Error

**Cause**: Various server-side errors
**Solution**:
- Check server logs for detailed error message
- Verify all API keys are valid (GITHUB_TOKEN, CLICKUP_API_KEY)
- Ensure GitHub and ClickUp services are accessible
- Check that required environment variables are set

### Issue: Sync doesn't happen (200 but no update)

**Cause**: Possible conflict resolution or mapping issue
**Solution**:
- Check if sync mapping exists for the issue/task
- Verify timestamp-based conflict resolution isn't blocking the update
- Check task/issue was created through our system (not manually)
- Run `npx ts-node scripts/verify-sync-mapping.ts` to check mappings

### Issue: ngrok URL changes after restart

**Cause**: Free ngrok URLs are temporary
**Solution**:
- Update webhook URLs with new ngrok URL after each restart
- Consider ngrok paid plan for static URLs
- For production, use permanent deployment URL (Vercel, etc.)

### Issue: ClickUp webhook not triggering

**Cause**: Webhook misconfiguration or ngrok issues
**Solution**:
- Verify ngrok is running and forwarding to port 3000
- Check ClickUp webhook endpoint URL is correct
- Ensure webhook events are properly selected
- Check webhook is active in ClickUp settings
- Test ngrok URL directly: `curl https://your-ngrok-url.ngrok.io/api/webhooks/clickup`

### Issue: GitHub API rate limit exceeded

**Cause**: Too many API requests
**Solution**:
- Wait for rate limit to reset (check X-RateLimit-Reset header)
- Use authenticated requests (ensure GITHUB_TOKEN is set)
- Implement request throttling if needed

## Troubleshooting Commands

```bash
# Check if server is running
curl http://localhost:3000/api/submit-bug

# Test GitHub webhook endpoint (should return 401 without signature)
curl -X POST http://localhost:3000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -d '{"action":"opened","issue":{"number":1}}'

# Test ClickUp webhook endpoint (should return 401 without signature)
curl -X POST http://localhost:3000/api/webhooks/clickup \
  -H "Content-Type: application/json" \
  -d '{"event":"taskStatusUpdated","task_id":"test123"}'

# Check environment variables
env | grep -E 'GITHUB|CLICKUP|ANTHROPIC'

# Verify TypeScript compilation
npx tsc --noEmit

# Run tests
npm test

# Check sync mappings
npx ts-node scripts/verify-sync-mapping.ts
```

## Additional Resources

- [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks)
- [ClickUp Webhooks Documentation](https://clickup.com/api/clickupreference/operation/CreateWebhook/)
- [ClickUp API Documentation](https://clickup.com/api)
- [ngrok Documentation](https://ngrok.com/docs)
