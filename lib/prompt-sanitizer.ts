import { BugReport } from './types';

/**
 * Maximum length for each field to prevent excessive input
 */
const MAX_FIELD_LENGTH = {
  title: 200,
  description: 2000,
  stepsToReproduce: 1500,
  expectedBehavior: 1000,
  actualBehavior: 1000,
  environment: 500,
  browserInfo: 300,
  userEmail: 100,
};

/**
 * Common prompt injection patterns that should be neutralized
 * These patterns attempt to manipulate the LLM's behavior
 */
const INJECTION_PATTERNS = [
  // Direct instruction overrides
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,

  // System/role manipulation
  /system\s*:/gi,
  /assistant\s*:/gi,
  /human\s*:/gi,
  /user\s*:/gi,

  // Role-playing attempts
  /you\s+are\s+now\s+(a|an)\s+/gi,
  /act\s+as\s+(a|an)\s+/gi,
  /pretend\s+(to\s+be|you\s+are)\s+/gi,
  /simulate\s+(a|an)\s+/gi,

  // New context injection
  /new\s+instructions?/gi,
  /updated\s+instructions?/gi,
  /override\s+instructions?/gi,

  // Prompt termination attempts
  /\n\n(human|assistant|system)\s*:/gi,
  /\[\/?(system|human|assistant|user)\]/gi,
];

/**
 * Sanitizes a single string field to prevent prompt injection attacks
 *
 * @param value - The string value to sanitize
 * @param maxLength - Maximum allowed length for this field
 * @returns Sanitized string value
 */
function sanitizeString(value: string | undefined, maxLength: number): string {
  if (!value) {
    return '';
  }

  // Trim whitespace
  let sanitized = value.trim();

  // Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  // Remove null bytes that could cause parsing issues
  sanitized = sanitized.replace(/\0/g, '');

  // Neutralize common injection patterns by inserting zero-width spaces
  // This breaks the pattern while preserving the content for human review
  INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, (match) => {
      // Insert zero-width space to break the injection pattern
      return match.split('').join('\u200B');
    });
  });

  // Escape special characters that could break prompt structure
  // We use a gentle approach that preserves readability while preventing injection

  // Normalize multiple newlines to prevent prompt structure manipulation
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Escape sequences that could be interpreted as prompt boundaries
  sanitized = sanitized.replace(/```/g, '` ` `');

  // Remove or escape control characters (except common whitespace)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize Unicode characters that might be used for obfuscation
  sanitized = sanitized.normalize('NFKC');

  return sanitized;
}

/**
 * Sanitizes a bug report for safe use in LLM prompts
 *
 * This function prevents prompt injection attacks by:
 * 1. Enforcing length limits on all fields
 * 2. Neutralizing common injection patterns
 * 3. Escaping special characters that could break prompt structure
 * 4. Removing control characters and null bytes
 * 5. Normalizing Unicode to prevent obfuscation
 *
 * The sanitization preserves legitimate content while making injection
 * attempts ineffective. This is a defense-in-depth approach to security.
 *
 * @param bugReport - The bug report to sanitize
 * @returns A new bug report object with all fields sanitized
 */
export function sanitizeBugReportForPrompt(bugReport: BugReport): BugReport {
  return {
    title: sanitizeString(bugReport.title, MAX_FIELD_LENGTH.title),
    description: sanitizeString(bugReport.description, MAX_FIELD_LENGTH.description),
    stepsToReproduce: sanitizeString(bugReport.stepsToReproduce, MAX_FIELD_LENGTH.stepsToReproduce),
    expectedBehavior: sanitizeString(bugReport.expectedBehavior, MAX_FIELD_LENGTH.expectedBehavior),
    actualBehavior: sanitizeString(bugReport.actualBehavior, MAX_FIELD_LENGTH.actualBehavior),
    severity: bugReport.severity,
    category: bugReport.category,
    userEmail: sanitizeString(bugReport.userEmail, MAX_FIELD_LENGTH.userEmail),
    environment: sanitizeString(bugReport.environment, MAX_FIELD_LENGTH.environment),
    browserInfo: sanitizeString(bugReport.browserInfo, MAX_FIELD_LENGTH.browserInfo),
  };
}

/**
 * Checks if a string contains potential injection attempts
 * This can be used for logging/monitoring purposes
 *
 * @param value - The string to check
 * @returns true if injection patterns are detected
 */
export function containsInjectionAttempt(value: string): boolean {
  if (!value) {
    return false;
  }

  return INJECTION_PATTERNS.some(pattern => {
    // Reset lastIndex to avoid stateful regex issues with global flag
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}
