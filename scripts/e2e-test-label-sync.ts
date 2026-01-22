#!/usr/bin/env ts-node
/**
 * E2E Test Script: Label/Tag Sync (Bidirectional)
 *
 * This script provides comprehensive instructions for testing label/tag
 * synchronization between GitHub and ClickUp in both directions.
 *
 * Test Scenarios:
 * 1. Add label in GitHub → Verify tag appears in ClickUp
 * 2. Remove label in GitHub → Verify tag removed in ClickUp
 * 3. Add tag in ClickUp → Verify label appears in GitHub
 * 4. Remove tag in ClickUp → Verify label removed in GitHub
 * 5. Test case-insensitive mapping
 * 6. Test special characters in labels/tags
 *
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - At least one synced issue/task pair must exist
 * - Both GitHub and ClickUp webhooks must be configured
 * - Ngrok must be running to expose local endpoints
 *
 * Usage:
 *   npx ts-node scripts/e2e-test-label-sync.ts
 */

import { getAllMappings } from '../lib/sync-storage';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: string = COLORS.reset): void {
  console.log(`${color}${message}${COLORS.reset}`);
}

function printHeader(title: string): void {
  console.log('\n' + '='.repeat(70));
  log(title, COLORS.bright);
  console.log('='.repeat(70));
}

function printSection(title: string): void {
  console.log('\n' + '─'.repeat(70));
  log(title, COLORS.cyan);
  console.log('─'.repeat(70));
}

/**
 * Display current sync mappings
 */
function displaySyncMappings(): { hasMapping: boolean; mappings: any[] } {
  printSection('📊 Current Sync Mappings');

  const mappings = getAllMappings();
  if (mappings.length === 0) {
    log('❌ No sync mappings found.', COLORS.red);
    log('\n💡 You need to create at least one synced issue/task pair first:', COLORS.yellow);
    log('   Run: npx ts-node scripts/e2e-test-github-to-clickup.ts', COLORS.yellow);
    return { hasMapping: false, mappings: [] };
  }

  log(`✅ Found ${mappings.length} sync mapping(s):\n`, COLORS.green);
  mappings.forEach((mapping, index) => {
    console.log(`${index + 1}. GitHub Issue #${mapping.githubIssueId} ↔ ClickUp Task ${mapping.clickupTaskId}`);
    console.log(`   Direction: ${mapping.syncDirection}`);
    console.log(`   Last Synced: ${new Date(mapping.lastSyncedAt).toISOString()}\n`);
  });

  return { hasMapping: true, mappings };
}

/**
 * Print prerequisites checklist
 */
function printPrerequisites(): void {
  printSection('✅ Prerequisites Checklist');

  console.log('\nBefore starting the tests, ensure the following:\n');
  console.log('  ☐ Development server is running (npm run dev)');
  console.log('  ☐ Ngrok is running and forwarding to port 3000');
  console.log('  ☐ GitHub webhook is configured with ngrok URL');
  console.log('  ☐ ClickUp webhook is configured with ngrok URL');
  console.log('  ☐ At least one synced issue/task pair exists');
  console.log('  ☐ You have the GitHub issue URL and ClickUp task URL ready\n');
}

/**
 * Print GitHub to ClickUp test instructions
 */
function printGitHubToClickUpTests(mappings: any[]): void {
  printSection('🔵 Test 1: GitHub Labels → ClickUp Tags');

  console.log('\nThis test verifies that labels added in GitHub appear as tags in ClickUp.\n');

  console.log('📝 Test Scenario 1A: Add Single Label\n');
  console.log('  1. Open one of the GitHub issues listed above');
  console.log('  2. Click on "Labels" in the right sidebar');
  console.log('  3. Add a label (e.g., "bug", "enhancement", "documentation")');
  console.log('     💡 If the label doesn\'t exist, create it first');
  console.log('  4. Wait up to 1 minute (typically 2-5 seconds)');
  console.log('  5. Open the corresponding ClickUp task');
  console.log('  6. Check the task tags in ClickUp');
  console.log('  7. ✅ Verify: The label name appears as a tag in ClickUp\n');

  console.log('📝 Test Scenario 1B: Add Multiple Labels\n');
  console.log('  1. In the same GitHub issue, add multiple labels');
  console.log('     Example: "priority:high", "needs-review", "good-first-issue"');
  console.log('  2. Wait up to 1 minute');
  console.log('  3. Check the ClickUp task');
  console.log('  4. ✅ Verify: All labels appear as tags in ClickUp\n');

  console.log('📝 Test Scenario 1C: Remove Label\n');
  console.log('  1. In GitHub, remove one of the labels you just added');
  console.log('  2. Wait up to 1 minute');
  console.log('  3. Check the ClickUp task');
  console.log('  4. ✅ Verify: The corresponding tag is removed from ClickUp\n');

  console.log('📝 Test Scenario 1D: Case Sensitivity Test\n');
  console.log('  1. Add a label with mixed case in GitHub (e.g., "BugFix")');
  console.log('  2. Wait up to 1 minute');
  console.log('  3. Check the ClickUp task');
  console.log('  4. ✅ Verify: Tag appears with the same case as the label\n');

  console.log('📝 Test Scenario 1E: Special Characters\n');
  console.log('  1. Add a label with special characters (e.g., "v2.0-beta", "api/endpoint")');
  console.log('  2. Wait up to 1 minute');
  console.log('  3. Check the ClickUp task');
  console.log('  4. ✅ Verify: Tag appears with special characters preserved\n');
}

/**
 * Print ClickUp to GitHub test instructions
 */
function printClickUpToGitHubTests(mappings: any[]): void {
  printSection('🟠 Test 2: ClickUp Tags → GitHub Labels');

  console.log('\nThis test verifies that tags added in ClickUp appear as labels in GitHub.\n');

  console.log('📝 Test Scenario 2A: Add Single Tag\n');
  console.log('  1. Open one of the ClickUp tasks listed above');
  console.log('  2. Click on the task to open the detail view');
  console.log('  3. Find the "Tags" section (usually in the right sidebar)');
  console.log('  4. Add a tag (e.g., "urgent", "backend", "frontend")');
  console.log('     💡 You can create a new tag or use an existing one');
  console.log('  5. Wait up to 1 minute (typically 2-5 seconds)');
  console.log('  6. Open the corresponding GitHub issue');
  console.log('  7. Check the labels on the issue');
  console.log('  8. ✅ Verify: The tag name appears as a label in GitHub\n');

  console.log('📝 Test Scenario 2B: Add Multiple Tags\n');
  console.log('  1. In the same ClickUp task, add multiple tags');
  console.log('     Example: "feature", "testing-required", "blocked"');
  console.log('  2. Wait up to 1 minute');
  console.log('  3. Check the GitHub issue');
  console.log('  4. ✅ Verify: All tags appear as labels in GitHub\n');

  console.log('📝 Test Scenario 2C: Remove Tag\n');
  console.log('  1. In ClickUp, remove one of the tags you just added');
  console.log('  2. Wait up to 1 minute');
  console.log('  3. Check the GitHub issue');
  console.log('  4. ✅ Verify: The corresponding label is removed from GitHub\n');

  console.log('📝 Test Scenario 2D: Tag Color Preservation\n');
  console.log('  1. Add a tag in ClickUp with a specific color');
  console.log('  2. Wait up to 1 minute');
  console.log('  3. Check the GitHub issue');
  console.log('  4. ✅ Verify: Label appears in GitHub (color may differ based on GitHub\'s label system)\n');
}

/**
 * Print monitoring instructions
 */
function printMonitoringInstructions(): void {
  printSection('📊 Monitoring & Debugging');

  console.log('\n🔍 Where to Check for Sync Activity:\n');

  console.log('1️⃣  Server Logs (Terminal running npm run dev):');
  console.log('   • Look for webhook POST requests:');
  console.log('     - POST /api/webhooks/github 200 (for GitHub → ClickUp)');
  console.log('     - POST /api/webhooks/clickup 200 (for ClickUp → GitHub)');
  console.log('   • Check for any error messages or stack traces');
  console.log('   • Verify HTTP 200 status codes (success)\n');

  console.log('2️⃣  GitHub Webhook Deliveries:');
  console.log('   • Go to GitHub repo → Settings → Webhooks');
  console.log('   • Click on your webhook');
  console.log('   • Click "Recent Deliveries" tab');
  console.log('   • Look for events with "issues" and "labeled"/"unlabeled" actions');
  console.log('   • Verify Response: 200 OK');
  console.log('   • Check payload to see which label was added/removed\n');

  console.log('3️⃣  ClickUp Webhook Logs:');
  console.log('   • Go to ClickUp → Settings → Integrations → Webhooks');
  console.log('   • Click on your webhook to view delivery history');
  console.log('   • Look for "taskTagsUpdated" events');
  console.log('   • Verify successful delivery (200 response)\n');

  console.log('4️⃣  ngrok Web Interface (http://localhost:4040):');
  console.log('   • View all incoming webhook requests in real-time');
  console.log('   • Inspect request/response headers and bodies');
  console.log('   • Replay requests for debugging');
  console.log('   • Check timing and response codes\n');
}

/**
 * Print troubleshooting guide
 */
function printTroubleshooting(): void {
  printSection('🔧 Troubleshooting Common Issues');

  console.log('\n❌ Issue: Label added in GitHub but tag doesn\'t appear in ClickUp\n');
  console.log('   Possible Causes & Solutions:');
  console.log('   • Check server logs for errors');
  console.log('   • Verify GitHub webhook is configured correctly');
  console.log('   • Ensure GITHUB_WEBHOOK_SECRET matches in both places');
  console.log('   • Check that the issue was created through your system (has sync mapping)');
  console.log('   • Verify GitHub webhook includes "issues" events');
  console.log('   • Check GitHub webhook Recent Deliveries for errors\n');

  console.log('❌ Issue: Tag added in ClickUp but label doesn\'t appear in GitHub\n');
  console.log('   Possible Causes & Solutions:');
  console.log('   • Check server logs for errors');
  console.log('   • Verify ClickUp webhook is configured correctly');
  console.log('   • Ensure CLICKUP_WEBHOOK_SECRET is set (if using signature verification)');
  console.log('   • Check that the task was created through your system (has sync mapping)');
  console.log('   • Verify ClickUp webhook includes "taskTagsUpdated" event');
  console.log('   • Check ClickUp webhook delivery history for errors\n');

  console.log('❌ Issue: Webhook returns 401 Unauthorized\n');
  console.log('   • Verify webhook secrets match in .env.local and webhook configuration');
  console.log('   • Restart dev server after changing environment variables');
  console.log('   • Check that secrets are not accidentally committed to git\n');

  console.log('❌ Issue: Webhook returns 500 Internal Server Error\n');
  console.log('   • Check server logs for detailed error message');
  console.log('   • Verify GITHUB_TOKEN and CLICKUP_API_KEY are valid');
  console.log('   • Ensure sync mapping exists for the issue/task pair');
  console.log('   • Check that all required environment variables are set\n');

  console.log('❌ Issue: Sync works in one direction but not the other\n');
  console.log('   • Verify both webhooks are configured and active');
  console.log('   • Check that both webhooks use the correct ngrok URL');
  console.log('   • Test each webhook endpoint independently');
  console.log('   • Review server logs for direction-specific errors\n');
}

/**
 * Print success criteria
 */
function printSuccessCriteria(): void {
  printSection('✅ Success Criteria');

  console.log('\nAfter completing all test scenarios, verify the following:\n');
  console.log('  ✓ Adding a label in GitHub creates a tag in ClickUp within 1 minute');
  console.log('  ✓ Removing a label in GitHub removes the tag from ClickUp within 1 minute');
  console.log('  ✓ Adding a tag in ClickUp creates a label in GitHub within 1 minute');
  console.log('  ✓ Removing a tag in ClickUp removes the label from GitHub within 1 minute');
  console.log('  ✓ Multiple labels/tags sync correctly in both directions');
  console.log('  ✓ Label/tag names match exactly (case-sensitive)');
  console.log('  ✓ Special characters in labels/tags are preserved');
  console.log('  ✓ All webhook deliveries return HTTP 200 status');
  console.log('  ✓ No errors appear in server logs');
  console.log('  ✓ Sync completes within 1 minute (typically 2-5 seconds)\n');
}

/**
 * Print verification commands
 */
function printVerificationCommands(): void {
  printSection('🛠️  Verification Commands');

  console.log('\n# Check current sync mappings:');
  console.log('npx ts-node scripts/verify-sync-mapping.ts\n');

  console.log('# Test GitHub webhook endpoint:');
  console.log('curl -X POST http://localhost:3000/api/webhooks/github \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"action":"labeled","issue":{"number":1},"label":{"name":"test"}}\'\n');

  console.log('# Test ClickUp webhook endpoint:');
  console.log('curl -X POST http://localhost:3000/api/webhooks/clickup \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"event":"taskTagsUpdated","task_id":"test123"}\'\n');

  console.log('# Check if server is running:');
  console.log('curl http://localhost:3000/\n');

  console.log('# View ngrok dashboard:');
  console.log('open http://localhost:4040\n');
}

/**
 * Main function
 */
function main(): void {
  printHeader('🏷️  Label/Tag Sync - End-to-End Testing Guide');

  console.log('\nThis guide will help you test bidirectional label/tag synchronization');
  console.log('between GitHub issues and ClickUp tasks.\n');

  // Check prerequisites
  printPrerequisites();

  // Display sync mappings
  const { hasMapping, mappings } = displaySyncMappings();

  if (!hasMapping) {
    log('\n❌ Cannot proceed without sync mappings. Please create a synced issue/task first.', COLORS.red);
    process.exit(1);
  }

  // Print test instructions
  printGitHubToClickUpTests(mappings);
  printClickUpToGitHubTests(mappings);

  // Print monitoring and troubleshooting
  printMonitoringInstructions();
  printTroubleshooting();

  // Print success criteria
  printSuccessCriteria();

  // Print verification commands
  printVerificationCommands();

  // Final message
  printHeader('📋 Next Steps');
  console.log('\n1. Follow the test scenarios above in order');
  console.log('2. Monitor server logs and webhook deliveries');
  console.log('3. Verify all success criteria are met');
  console.log('4. Document any issues encountered');
  console.log('5. Mark subtask-7-3 as complete if all tests pass\n');

  log('✅ Test guide generated successfully!', COLORS.green);
  log('💡 Tip: Keep this terminal open for reference while testing\n', COLORS.yellow);
}

// Run the script
if (require.main === module) {
  main();
}

export { main };
