# E2E Testing Scripts

This directory contains scripts for end-to-end testing of the GitHub-ClickUp sync functionality.

## Available Scripts

### 1. `e2e-test-github-to-clickup.ts`

Comprehensive E2E test script for GitHub-to-ClickUp sync flow.

**Purpose**: Automates test issue creation and guides manual webhook testing.

**Usage**:
```bash
npx ts-node scripts/e2e-test-github-to-clickup.ts
```

**Prerequisites**:
- Server running (`npm run dev`)
- Environment variables configured
- ngrok setup for webhook testing

**What it does**:
1. Submits a test bug report via API
2. Verifies GitHub issue and ClickUp task creation
3. Verifies sync mapping is stored
4. Provides step-by-step webhook testing instructions

### 2. `e2e-test-clickup-to-github.ts`

Comprehensive E2E test script for ClickUp-to-GitHub sync flow (reverse direction).

**Purpose**: Guides manual testing of ClickUp webhook integration and GitHub sync.

**Usage**:
```bash
npx ts-node scripts/e2e-test-clickup-to-github.ts
```

**Prerequisites**:
- Server running (`npm run dev`)
- Environment variables configured
- ngrok setup for webhook testing
- At least one synced task exists (from GitHub-to-ClickUp test)

**What it does**:
1. Displays all existing sync mappings
2. Provides ClickUp webhook configuration instructions
3. Provides step-by-step manual testing instructions
4. Shows task references for easy access during testing

### 3. `e2e-test-label-sync.ts`

Comprehensive E2E test guide for label/tag sync (bidirectional).

**Purpose**: Provides detailed testing instructions and edge case coverage for label/tag synchronization.

**Usage**:
```bash
npx ts-node scripts/e2e-test-label-sync.ts
```

**Prerequisites**:
- Server running (`npm run dev`)
- At least one synced issue/task pair exists
- Both GitHub and ClickUp webhooks configured
- ngrok running and forwarding to port 3000

**What it does**:
1. Displays all existing sync mappings
2. Provides detailed test scenarios for both directions:
   - GitHub labels → ClickUp tags (add, remove, multiple, case sensitivity)
   - ClickUp tags → GitHub labels (add, remove, colors)
3. Covers edge cases (special characters, case sensitivity)
4. Includes monitoring and debugging instructions
5. Provides comprehensive troubleshooting guide
6. Shows success criteria checklist

**Test Scenarios**:
- Add/remove single and multiple labels/tags
- Case sensitivity testing
- Special characters in label/tag names
- Tag color preservation
- Conflict resolution

### 4. `verify-sync-mapping.ts`

Quick utility to check current sync mappings.

**Purpose**: Display all stored sync mappings without needing server.

**Usage**:
```bash
npx ts-node scripts/verify-sync-mapping.ts
```

**Prerequisites**:
- None (can run anytime)

**What it displays**:
- All current sync mappings
- GitHub issue IDs
- ClickUp task IDs
- Sync direction
- Last sync timestamps

## Testing Workflow

### Quick Start

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test GitHub-to-ClickUp sync**:
   ```bash
   npx ts-node scripts/e2e-test-github-to-clickup.ts
   ```
   Follow the instructions for webhook testing.

3. **Test ClickUp-to-GitHub sync**:
   ```bash
   npx ts-node scripts/e2e-test-clickup-to-github.ts
   ```
   Follow the instructions for reverse sync testing.

4. **Verify mappings** (anytime):
   ```bash
   npx ts-node scripts/verify-sync-mapping.ts
   ```

### Complete Testing Flow

For bidirectional sync testing:

1. **Phase 1: GitHub → ClickUp**
   - Run `e2e-test-github-to-clickup.ts`
   - Creates test issue and task
   - Test status, comment, and label sync from GitHub to ClickUp

2. **Phase 2: ClickUp → GitHub**
   - Run `e2e-test-clickup-to-github.ts`
   - Uses existing synced tasks
   - Test status, comment, and tag sync from ClickUp to GitHub

3. **Phase 3: Label/Tag Sync (Detailed)**
   - Run `e2e-test-label-sync.ts`
   - Comprehensive label/tag testing
   - Edge cases and special scenarios
   - Bidirectional validation

4. **Verification**
   - Run `verify-sync-mapping.ts` to check all mappings
   - Verify webhook deliveries in GitHub/ClickUp settings
   - Check server logs for any errors

### Full Testing Guide

See [E2E_TESTING.md](../E2E_TESTING.md) in the root directory for complete testing instructions including:
- Prerequisites and environment setup
- ngrok setup and configuration
- GitHub webhook configuration
- ClickUp webhook configuration
- Manual testing steps for both sync directions
- Monitoring and debugging techniques
- Comprehensive troubleshooting guide

## Example Output

### e2e-test-github-to-clickup.ts (GitHub → ClickUp)

```
🚀 GitHub-to-ClickUp Sync E2E Test
============================================================

📝 Step 1: Submitting bug report...
────────────────────────────────────────────────────────────
✅ Bug report submitted successfully!
   GitHub Issue: https://github.com/user/repo/issues/123
   ClickUp Task: https://app.clickup.com/t/abc123
   Enhanced Title: [Enhanced] Test Issue
   Priority: P2
   Labels: test, e2e

🔍 Step 2: Verifying sync mapping...
────────────────────────────────────────────────────────────
✅ Sync mapping found!
   GitHub Issue ID: 123
   ClickUp Task ID: abc123
   Sync Direction: bidirectional
   Last Synced: 2026-01-22T12:00:00.000Z

🔗 Step 3: Manual Webhook Testing
────────────────────────────────────────────────────────────
[Instructions for webhook testing...]
```

### e2e-test-clickup-to-github.ts (ClickUp → GitHub)

```
🚀 ClickUp-to-GitHub Sync E2E Test
============================================================

📊 Current Sync Mappings:
────────────────────────────────────────────────────────────
✅ Found 1 sync mapping(s)

1. GitHub Issue #123 ↔ ClickUp Task abc123
   Direction: bidirectional
   Last Synced: 2026-01-22T12:00:00.000Z

🔧 Step 1: Configure ClickUp Webhook
────────────────────────────────────────────────────────────
[ClickUp webhook configuration instructions...]

📋 Quick Reference: Synced Tasks
────────────────────────────────────────────────────────────
1. GitHub Issue #123
   URL: https://github.com/user/repo/issues/123
   ClickUp Task ID: abc123

📝 Step 2: Test Status Change Sync
────────────────────────────────────────────────────────────
[Status change testing instructions...]

💬 Step 3: Test Comment Sync
────────────────────────────────────────────────────────────
[Comment sync testing instructions...]

🏷️  Step 4: Test Tag Sync
────────────────────────────────────────────────────────────
[Tag sync testing instructions...]
```

### verify-sync-mapping.ts

```
📊 Sync Mapping Storage Status
============================================================

✅ Found 2 sync mapping(s):

1. Mapping:
   ├─ GitHub Issue: #123
   ├─ ClickUp Task: abc123
   ├─ Sync Direction: bidirectional
   └─ Last Synced: 1/22/2026, 12:00:00 PM

2. Mapping:
   ├─ GitHub Issue: #124
   ├─ ClickUp Task: def456
   ├─ Sync Direction: bidirectional
   └─ Last Synced: 1/22/2026, 12:05:00 PM

────────────────────────────────────────────────────────────
💡 Tip: Mappings are stored in-memory and cleared on server restart
```

## Development Notes

### In-Memory Storage

The sync mappings are stored in-memory using a Map. This means:
- ✅ Fast access for MVP
- ⚠️  Cleared on server restart
- ⚠️  Not shared across multiple server instances

For production, migrate to Vercel KV or Redis (see `lib/sync-storage.ts`).

### Testing Best Practices

1. **Use test data**: Scripts create issues with `[E2E Test]` prefix
2. **Clean up**: Close test issues after testing
3. **Check logs**: Monitor server logs during webhook testing
4. **Verify timing**: Ensure syncs complete within 1 minute

## Troubleshooting

### Script Fails: "Server is not responding"

**Solution**: Start the development server
```bash
npm run dev
```

### No Mappings Found

**Cause**: No bug reports have been submitted yet
**Solution**: Submit a bug report via the web form or run the E2E test script

### TypeScript Errors

**Solution**: Ensure TypeScript is properly configured
```bash
npx tsc --noEmit
```

## Related Documentation

- [E2E_TESTING.md](../E2E_TESTING.md) - Complete testing guide
- [WEBHOOK_SETUP.md](../WEBHOOK_SETUP.md) - Webhook configuration (to be created)
- [lib/sync-storage.ts](../lib/sync-storage.ts) - Storage implementation
- [lib/sync-service.ts](../lib/sync-service.ts) - Sync logic

## Future Enhancements

Potential improvements for these scripts:

- [ ] Add automated webhook simulation (without ngrok)
- [ ] Add cleanup script to delete test issues
- [ ] Add performance timing measurements
- [ ] Add support for batch testing multiple issues
- [ ] Add webhook event replay capability
- [ ] Integrate with CI/CD pipeline
