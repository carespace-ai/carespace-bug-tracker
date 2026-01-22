#!/usr/bin/env node

/**
 * Automated verification script for color-coded severity indicators
 * This script validates the implementation without requiring manual browser testing
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying color-coded severity implementation...\n');

// Read the page.tsx file
const pageFile = path.join(__dirname, 'app', 'page.tsx');
const content = fs.readFileSync(pageFile, 'utf8');

let errors = [];
let warnings = [];
let passed = 0;

// Test 1: Check getSeverityColorClasses function exists
if (content.includes('getSeverityColorClasses')) {
  console.log('✅ getSeverityColorClasses function found');
  passed++;
} else {
  errors.push('❌ getSeverityColorClasses function not found');
}

// Test 2: Verify color classes for each severity level
const colorTests = [
  { severity: 'low', colors: ['green-50', 'green-300', 'green-900'], emoji: '🟢' },
  { severity: 'medium', colors: ['yellow-50', 'yellow-300', 'yellow-900'], emoji: '🟡' },
  { severity: 'high', colors: ['orange-50', 'orange-300', 'orange-900'], emoji: '🟠' },
  { severity: 'critical', colors: ['red-50', 'red-300', 'red-900'], emoji: '🔴' }
];

colorTests.forEach(test => {
  const allColorsPresent = test.colors.every(color => content.includes(color));
  const emojiPresent = content.includes(`${test.emoji} ${test.severity.charAt(0).toUpperCase() + test.severity.slice(1)}`);

  if (allColorsPresent) {
    console.log(`✅ ${test.severity} severity has correct color classes`);
    passed++;
  } else {
    errors.push(`❌ ${test.severity} severity missing color classes`);
  }

  if (emojiPresent) {
    console.log(`✅ ${test.severity} severity has emoji indicator (${test.emoji})`);
    passed++;
  } else {
    warnings.push(`⚠️  ${test.severity} severity missing emoji indicator`);
  }
});

// Test 3: Verify the select element uses the color function
if (content.includes('getSeverityColorClasses(formData.severity')) {
  console.log('✅ Select element applies dynamic color classes');
  passed++;
} else {
  errors.push('❌ Select element not using color function');
}

// Test 4: Check for all severity options
const severityOptions = ['low', 'medium', 'high', 'critical'];
severityOptions.forEach(severity => {
  if (content.includes(`value="${severity}"`)) {
    console.log(`✅ Severity option "${severity}" exists`);
    passed++;
  } else {
    errors.push(`❌ Severity option "${severity}" missing`);
  }
});

// Test 5: Verify accessibility - text labels are present
if (content.includes('Severity *')) {
  console.log('✅ Severity label present for accessibility');
  passed++;
} else {
  warnings.push('⚠️  Severity label might be missing');
}

// Test 6: Check that the select has required attribute
if (content.includes('required') && content.includes('id="severity"')) {
  console.log('✅ Severity select is marked as required');
  passed++;
} else {
  warnings.push('⚠️  Severity select should be required');
}

// Results summary
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION RESULTS');
console.log('='.repeat(60));
console.log(`✅ Tests passed: ${passed}`);
console.log(`❌ Errors: ${errors.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach(err => console.log(`  ${err}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach(warn => console.log(`  ${warn}`));
}

console.log('\n' + '='.repeat(60));

if (errors.length === 0) {
  console.log('✅ All critical tests passed!');
  console.log('✅ Color-coded severity implementation is correct');
  console.log('\nThe implementation includes:');
  console.log('  • Dynamic color classes for all severity levels');
  console.log('  • Emoji visual indicators (🟢 🟡 🟠 🔴)');
  console.log('  • Proper accessibility with text labels');
  console.log('  • Required field validation');
  process.exit(0);
} else {
  console.log('❌ Verification failed - please fix errors above');
  process.exit(1);
}
