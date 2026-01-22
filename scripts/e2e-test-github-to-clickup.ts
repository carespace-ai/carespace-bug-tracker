#!/usr/bin/env ts-node
/**
 * E2E Test Script: GitHub to ClickUp Sync Flow
 *
 * This script helps verify the GitHub-to-ClickUp sync functionality.
 * It performs the following steps:
 * 1. Submits a bug report via the API
 * 2. Verifies GitHub issue and ClickUp task were created
 * 3. Provides instructions for manual webhook testing
 * 4. Verifies sync mappings are stored correctly
 *
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - Environment variables must be configured
 * - Ngrok must be set up for webhook testing
 *
 * Usage:
 *   npx ts-node scripts/e2e-test-github-to-clickup.ts
 */

import * as http from 'http';
import { getAllMappings, getMapping } from '../lib/sync-storage';

interface BugReportPayload {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'ui' | 'functionality' | 'performance' | 'security' | 'other';
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
}

interface BugReportResponse {
  success: boolean;
  message: string;
  data?: {
    githubIssue: string;
    clickupTask: string;
    enhancedReport: {
      title: string;
      priority: string;
      labels: string[];
    };
  };
  error?: string;
  details?: string;
}

const API_BASE_URL = 'http://localhost:3000';
const TEST_BUG_TITLE = `[E2E Test] GitHub to ClickUp Sync - ${new Date().toISOString()}`;

/**
 * Make HTTP POST request
 */
function makePostRequest(path: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const postData = JSON.stringify(data);

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Step 1: Submit bug report
 */
async function submitBugReport(): Promise<BugReportResponse | null> {
  console.log('\n📝 Step 1: Submitting bug report...');
  console.log('─'.repeat(60));

  const bugReport: BugReportPayload = {
    title: TEST_BUG_TITLE,
    description: 'This is an E2E test to verify GitHub-to-ClickUp sync functionality.',
    severity: 'medium',
    category: 'other',
    stepsToReproduce: '1. Run E2E test script\n2. Verify sync works',
    expectedBehavior: 'Changes in GitHub should sync to ClickUp',
    actualBehavior: 'Testing to verify this works correctly',
  };

  try {
    const response = await makePostRequest('/api/submit-bug', bugReport);

    if (response.status === 200 && response.data.success) {
      console.log('✅ Bug report submitted successfully!');
      console.log(`   GitHub Issue: ${response.data.data.githubIssue}`);
      console.log(`   ClickUp Task: ${response.data.data.clickupTask}`);
      console.log(`   Enhanced Title: ${response.data.data.enhancedReport.title}`);
      console.log(`   Priority: ${response.data.data.enhancedReport.priority}`);
      console.log(`   Labels: ${response.data.data.enhancedReport.labels.join(', ')}`);
      return response.data;
    } else {
      console.error('❌ Bug report submission failed:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error submitting bug report:', error);
    console.error('   Make sure the server is running: npm run dev');
    return null;
  }
}

/**
 * Step 2: Verify sync mapping
 */
async function verifySyncMapping(githubUrl: string): Promise<string | null> {
  console.log('\n🔍 Step 2: Verifying sync mapping...');
  console.log('─'.repeat(60));

  try {
    // Extract issue number from GitHub URL
    const issueMatch = githubUrl.match(/\/issues\/(\d+)/);
    if (!issueMatch) {
      console.error('❌ Could not extract issue number from URL:', githubUrl);
      return null;
    }

    const issueNumber = issueMatch[1];
    const mapping = getMapping(issueNumber);

    if (mapping) {
      console.log('✅ Sync mapping found!');
      console.log(`   GitHub Issue ID: ${mapping.githubIssueId}`);
      console.log(`   ClickUp Task ID: ${mapping.clickupTaskId}`);
      console.log(`   Sync Direction: ${mapping.syncDirection}`);
      console.log(`   Last Synced: ${new Date(mapping.lastSyncedAt).toISOString()}`);
      return issueNumber;
    } else {
      console.error('❌ Sync mapping not found for issue:', issueNumber);
      return null;
    }
  } catch (error) {
    console.error('❌ Error verifying sync mapping:', error);
    return null;
  }
}

/**
 * Step 3: Instructions for manual webhook testing
 */
function printWebhookInstructions(githubUrl: string, clickupUrl: string, issueNumber: string): void {
  console.log('\n🔗 Step 3: Manual Webhook Testing');
  console.log('─'.repeat(60));
  console.log('\nTo test the GitHub-to-ClickUp sync flow, follow these steps:\n');

  console.log('1️⃣  Make sure ngrok is running:');
  console.log('   ngrok http 3000\n');

  console.log('2️⃣  Configure GitHub webhook (if not already done):');
  console.log('   • Go to your GitHub repository settings → Webhooks → Add webhook');
  console.log('   • Payload URL: https://your-ngrok-url.ngrok.io/api/webhooks/github');
  console.log('   • Content type: application/json');
  console.log('   • Secret: <your GITHUB_WEBHOOK_SECRET>');
  console.log('   • Events: Issues, Issue comments');
  console.log('   • Active: ✓\n');

  console.log('3️⃣  Test Status Change Sync:');
  console.log(`   • Open the GitHub issue: ${githubUrl}`);
  console.log('   • Close the issue (Status: closed)');
  console.log('   • Wait up to 1 minute');
  console.log(`   • Check ClickUp task: ${clickupUrl}`);
  console.log('   • Verify status changed to "complete"\n');

  console.log('4️⃣  Test Reopen:');
  console.log('   • Reopen the GitHub issue');
  console.log('   • Wait up to 1 minute');
  console.log('   • Check ClickUp task');
  console.log('   • Verify status changed back to "to do"\n');

  console.log('5️⃣  Test Comment Sync:');
  console.log('   • Add a comment in GitHub: "Test comment from GitHub"');
  console.log('   • Wait up to 1 minute');
  console.log('   • Check ClickUp task comments');
  console.log('   • Verify comment appears with author attribution\n');

  console.log('6️⃣  Test Label Sync:');
  console.log('   • Add a label in GitHub (e.g., "bug", "enhancement")');
  console.log('   • Wait up to 1 minute');
  console.log('   • Check ClickUp task tags');
  console.log('   • Verify tag appears in ClickUp\n');

  console.log('7️⃣  Check webhook logs (in terminal running npm run dev):');
  console.log('   • Look for "POST /api/webhooks/github" requests');
  console.log('   • Verify status 200 responses');
  console.log('   • Check for any error messages\n');
}

/**
 * Display current sync mappings
 */
function displayAllMappings(): void {
  console.log('\n📊 Current Sync Mappings:');
  console.log('─'.repeat(60));

  const mappings = getAllMappings();
  if (mappings.length === 0) {
    console.log('No sync mappings found.');
  } else {
    console.log(`Total mappings: ${mappings.length}\n`);
    mappings.forEach((mapping, index) => {
      console.log(`${index + 1}. GitHub Issue ${mapping.githubIssueId} ↔ ClickUp Task ${mapping.clickupTaskId}`);
      console.log(`   Direction: ${mapping.syncDirection}`);
      console.log(`   Last Synced: ${new Date(mapping.lastSyncedAt).toISOString()}\n`);
    });
  }
}

/**
 * Main test flow
 */
async function runE2ETest(): Promise<void> {
  console.log('\n🚀 GitHub-to-ClickUp Sync E2E Test');
  console.log('='.repeat(60));
  console.log('This script will guide you through testing the sync flow.\n');

  // Check if server is running
  try {
    const response = await makePostRequest('/api/submit-bug', {
      title: 'Health Check',
      description: 'test',
      severity: 'low',
      category: 'other',
    }).catch(() => null);

    if (!response) {
      console.error('❌ Server is not responding at http://localhost:3000');
      console.error('   Please start the server: npm run dev\n');
      process.exit(1);
    }
  } catch (error) {
    // Server check failed, continue anyway
  }

  // Step 1: Submit bug report
  const result = await submitBugReport();
  if (!result || !result.data) {
    console.error('\n❌ Test failed at Step 1: Could not submit bug report');
    process.exit(1);
  }

  // Step 2: Verify sync mapping
  const issueNumber = await verifySyncMapping(result.data.githubIssue);
  if (!issueNumber) {
    console.error('\n❌ Test failed at Step 2: Could not verify sync mapping');
    process.exit(1);
  }

  // Step 3: Print webhook testing instructions
  printWebhookInstructions(result.data.githubIssue, result.data.clickupTask, issueNumber);

  // Display all mappings
  displayAllMappings();

  console.log('✅ Automated steps completed successfully!');
  console.log('📋 Please follow the manual webhook testing instructions above.\n');
}

// Run the test
if (require.main === module) {
  runE2ETest().catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { runE2ETest, submitBugReport, verifySyncMapping };
