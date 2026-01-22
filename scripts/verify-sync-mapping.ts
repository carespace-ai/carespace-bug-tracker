#!/usr/bin/env ts-node
/**
 * Quick Sync Mapping Verification Script
 *
 * This script displays all current sync mappings without requiring
 * the development server to be running.
 *
 * Usage:
 *   npx ts-node scripts/verify-sync-mapping.ts
 */

import { getAllMappings } from '../lib/sync-storage';

function displaySyncMappings(): void {
  console.log('\n📊 Sync Mapping Storage Status');
  console.log('='.repeat(60));

  const mappings = getAllMappings();

  if (mappings.length === 0) {
    console.log('\n⚠️  No sync mappings found.');
    console.log('   Mappings are created when bug reports are submitted.\n');
    console.log('To create a mapping:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Submit a bug report via the web form or API');
    console.log('   3. Run this script again\n');
    return;
  }

  console.log(`\n✅ Found ${mappings.length} sync mapping(s):\n`);

  mappings.forEach((mapping, index) => {
    console.log(`${index + 1}. Mapping:`);
    console.log(`   ├─ GitHub Issue: #${mapping.githubIssueId}`);
    console.log(`   ├─ ClickUp Task: ${mapping.clickupTaskId}`);
    console.log(`   ├─ Sync Direction: ${mapping.syncDirection}`);
    console.log(`   └─ Last Synced: ${new Date(mapping.lastSyncedAt).toLocaleString()}`);
    console.log();
  });

  console.log('─'.repeat(60));
  console.log('💡 Tip: Mappings are stored in-memory and cleared on server restart\n');
}

if (require.main === module) {
  displaySyncMappings();
}

export { displaySyncMappings };
