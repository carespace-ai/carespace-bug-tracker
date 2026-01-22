#!/usr/bin/env ts-node
/**
 * E2E Test Script: ClickUp to GitHub Sync Flow
 *
 * This script helps verify the ClickUp-to-GitHub sync functionality.
 * It performs the following steps:
 * 1. Displays existing sync mappings
 * 2. Provides instructions for ClickUp webhook configuration
 * 3. Provides instructions for manual testing (status, comments, tags)
 * 4. Helps verify changes appear in GitHub
 *
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - Environment variables must be configured
 * - Ngrok must be set up for webhook testing
 * - At least one synced task must exist (from GitHub-to-ClickUp test)
 *
 * Usage:
 *   npx ts-node scripts/e2e-test-clickup-to-github.ts
 */

import { getAllMappings } from '../lib/sync-storage';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Display current sync mappings
 */
function displayAllMappings(): void {
  console.log('\n📊 Current Sync Mappings:');
  console.log('─'.repeat(60));

  const mappings = getAllMappings();
  if (mappings.length === 0) {
    console.log('❌ No sync mappings found.');
    console.log('\n⚠️  You need to create a synced task first!');
    console.log('   Run: npx ts-node scripts/e2e-test-github-to-clickup.ts\n');
    return;
  }

  console.log(`✅ Found ${mappings.length} sync mapping(s)\n`);
  mappings.forEach((mapping, index) => {
    console.log(`${index + 1}. GitHub Issue #${mapping.githubIssueId} ↔ ClickUp Task ${mapping.clickupTaskId}`);
    console.log(`   Direction: ${mapping.syncDirection}`);
    console.log(`   Last Synced: ${new Date(mapping.lastSyncedAt).toISOString()}\n`);
  });
}

/**
 * Print ClickUp webhook configuration instructions
 */
function printClickUpWebhookSetup(): void {
  console.log('\n🔧 Step 1: Configure ClickUp Webhook');
  console.log('─'.repeat(60));
  console.log('\nBefore testing, you need to set up the ClickUp webhook:\n');

  console.log('1️⃣  Make sure ngrok is running:');
  console.log('   ngrok http 3000');
  console.log('   Copy the HTTPS forwarding URL (e.g., https://abc123.ngrok.io)\n');

  console.log('2️⃣  Configure ClickUp webhook:');
  console.log('   • Go to https://app.clickup.com/');
  console.log('   • Navigate to Settings → Integrations → Webhooks');
  console.log('   • Click "Create Webhook"');
  console.log('   • Configure:');
  console.log('     - Endpoint URL: https://your-ngrok-url.ngrok.io/api/webhooks/clickup');
  console.log('     - Events to trigger: Select all task events');
  console.log('       ✓ Task Status Updated');
  console.log('       ✓ Task Tag Updated');
  console.log('       ✓ Task Comment Posted');
  console.log('     - Space: Select your workspace/space');
  console.log('   • Save the webhook\n');

  console.log('3️⃣  Verify webhook secret:');
  console.log('   • Make sure CLICKUP_WEBHOOK_SECRET is set in your .env.local');
  console.log('   • This should match the secret configured in ClickUp webhook settings');
  console.log('   • Restart your dev server if you changed environment variables\n');
}

/**
 * Print status change testing instructions
 */
function printStatusChangeInstructions(): void {
  console.log('\n📝 Step 2: Test Status Change Sync');
  console.log('─'.repeat(60));
  console.log('\nTest that changing ClickUp task status updates GitHub issue:\n');

  console.log('1️⃣  Change to "In Progress":');
  console.log('   • Open any synced ClickUp task from the list above');
  console.log('   • Change task status to "in progress"');
  console.log('   • Wait up to 1 minute');
  console.log('   • Verify GitHub issue is still "open" (in progress → open)\n');

  console.log('2️⃣  Change to "Complete":');
  console.log('   • Change task status to "complete"');
  console.log('   • Wait up to 1 minute');
  console.log('   • Verify GitHub issue is now "closed"\n');

  console.log('3️⃣  Change to "To Do":');
  console.log('   • Change task status back to "to do"');
  console.log('   • Wait up to 1 minute');
  console.log('   • Verify GitHub issue is reopened (status: open)\n');

  console.log('✅ Expected Results:');
  console.log('   • ClickUp "to do" / "in progress" → GitHub "open"');
  console.log('   • ClickUp "complete" → GitHub "closed"');
  console.log('   • Changes should appear within 1 minute\n');
}

/**
 * Print comment sync testing instructions
 */
function printCommentSyncInstructions(): void {
  console.log('\n💬 Step 3: Test Comment Sync');
  console.log('─'.repeat(60));
  console.log('\nTest that ClickUp comments appear in GitHub:\n');

  console.log('1️⃣  Add a comment in ClickUp:');
  console.log('   • Open any synced ClickUp task');
  console.log('   • Add a comment: "Test comment from ClickUp - E2E verification"');
  console.log('   • Post the comment\n');

  console.log('2️⃣  Verify in GitHub:');
  console.log('   • Wait up to 1 minute');
  console.log('   • Open the corresponding GitHub issue');
  console.log('   • Check for the comment');
  console.log('   • Verify comment text matches');
  console.log('   • Verify author attribution is correct\n');

  console.log('✅ Expected Results:');
  console.log('   • Comment appears in GitHub within 1 minute');
  console.log('   • Comment text is preserved');
  console.log('   • Author name is included in comment\n');
}

/**
 * Print tag/label sync testing instructions
 */
function printTagSyncInstructions(): void {
  console.log('\n🏷️  Step 4: Test Tag Sync');
  console.log('─'.repeat(60));
  console.log('\nTest that ClickUp tags sync to GitHub labels:\n');

  console.log('1️⃣  Add a tag in ClickUp:');
  console.log('   • Open any synced ClickUp task');
  console.log('   • Add a tag (e.g., "urgent", "needs-review")');
  console.log('   • Save the change\n');

  console.log('2️⃣  Verify in GitHub:');
  console.log('   • Wait up to 1 minute');
  console.log('   • Open the corresponding GitHub issue');
  console.log('   • Check the labels section');
  console.log('   • Verify the tag appears as a label\n');

  console.log('3️⃣  Remove a tag in ClickUp:');
  console.log('   • Remove the tag from the ClickUp task');
  console.log('   • Wait up to 1 minute');
  console.log('   • Verify the label is removed from GitHub issue\n');

  console.log('✅ Expected Results:');
  console.log('   • Tags sync to GitHub as labels within 1 minute');
  console.log('   • Tag names match label names');
  console.log('   • Tag additions and removals both sync\n');
}

/**
 * Print monitoring and debugging instructions
 */
function printMonitoringInstructions(): void {
  console.log('\n🔍 Step 5: Monitor and Debug');
  console.log('─'.repeat(60));
  console.log('\nHow to verify webhooks are working:\n');

  console.log('1️⃣  Check server logs (terminal running npm run dev):');
  console.log('   • Look for "POST /api/webhooks/clickup" requests');
  console.log('   • Verify status 200 responses');
  console.log('   • Check for any error messages\n');

  console.log('2️⃣  Check ClickUp webhook deliveries:');
  console.log('   • Go to ClickUp Settings → Integrations → Webhooks');
  console.log('   • Click on your webhook');
  console.log('   • Check the delivery history');
  console.log('   • Verify successful deliveries (200 status)\n');

  console.log('3️⃣  Check ngrok logs:');
  console.log('   • Ngrok dashboard: http://localhost:4040');
  console.log('   • View incoming webhook requests');
  console.log('   • Inspect request/response details\n');

  console.log('❌ Common Issues:');
  console.log('   • 401 Unauthorized: Check CLICKUP_WEBHOOK_SECRET matches');
  console.log('   • 500 Server Error: Check server logs for details');
  console.log('   • No webhook delivery: Verify ngrok URL is correct');
  console.log('   • Changes not syncing: Check sync mapping exists\n');
}

/**
 * Print success criteria
 */
function printSuccessCriteria(): void {
  console.log('\n✅ Success Criteria');
  console.log('─'.repeat(60));
  console.log('\nAfter completing all tests, verify:\n');

  console.log('  ✓ ClickUp webhook is configured and active');
  console.log('  ✓ Changing ClickUp task to "complete" closes GitHub issue');
  console.log('  ✓ Changing ClickUp task to "to do" reopens GitHub issue');
  console.log('  ✓ ClickUp comments appear in GitHub with author attribution');
  console.log('  ✓ Adding ClickUp tags creates GitHub labels');
  console.log('  ✓ Removing ClickUp tags removes GitHub labels');
  console.log('  ✓ All webhook deliveries return 200 status');
  console.log('  ✓ All syncs complete within 1 minute');
  console.log('  ✓ No errors in server logs\n');

  console.log('⏱️  Timing:');
  console.log('   • ClickUp webhook → Server: < 1 second');
  console.log('   • Server processing → GitHub API: 1-3 seconds');
  console.log('   • Total: Usually completes in 2-5 seconds\n');
}

/**
 * Get GitHub issue URL from mapping
 */
function getGitHubIssueUrl(githubIssueId: string): string {
  const owner = process.env.GITHUB_OWNER || 'YOUR_GITHUB_OWNER';
  const repo = process.env.GITHUB_REPO || 'YOUR_GITHUB_REPO';
  return `https://github.com/${owner}/${repo}/issues/${githubIssueId}`;
}

/**
 * Print task reference for easy access
 */
function printTaskReferences(): void {
  console.log('\n📋 Quick Reference: Synced Tasks');
  console.log('─'.repeat(60));

  const mappings = getAllMappings();
  if (mappings.length === 0) {
    return;
  }

  console.log('\nUse these tasks for testing:\n');
  mappings.forEach((mapping, index) => {
    console.log(`${index + 1}. GitHub Issue #${mapping.githubIssueId}`);
    console.log(`   URL: ${getGitHubIssueUrl(mapping.githubIssueId)}`);
    console.log(`   ClickUp Task ID: ${mapping.clickupTaskId}`);
    console.log('');
  });
}

/**
 * Main test flow
 */
async function runE2ETest(): Promise<void> {
  console.log('\n🚀 ClickUp-to-GitHub Sync E2E Test');
  console.log('='.repeat(60));
  console.log('This script will guide you through testing the ClickUp→GitHub sync.\n');

  // Display current sync mappings
  displayAllMappings();

  const mappings = getAllMappings();
  if (mappings.length === 0) {
    console.log('❌ Cannot proceed without synced tasks.');
    console.log('   Please run the GitHub-to-ClickUp test first to create a synced task.\n');
    process.exit(1);
  }

  // Print all testing instructions
  printClickUpWebhookSetup();
  printTaskReferences();
  printStatusChangeInstructions();
  printCommentSyncInstructions();
  printTagSyncInstructions();
  printMonitoringInstructions();
  printSuccessCriteria();

  console.log('📋 Ready to Test!');
  console.log('─'.repeat(60));
  console.log('\nFollow the steps above to verify ClickUp-to-GitHub sync.');
  console.log('Make sure to check each verification step as you go.\n');
}

// Run the test
if (require.main === module) {
  runE2ETest().catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { runE2ETest, printClickUpWebhookSetup, printTaskReferences };
