/**
 * Redacts an email address to protect user privacy (PII protection).
 *
 * Redaction strategy:
 * - Shows first character of the username
 * - Replaces remaining username characters with asterisks (***)
 * - Preserves the full domain for context
 *
 * Example: 'john.doe@example.com' → 'j***@example.com'
 *
 * @param email - The email address to redact
 * @returns The redacted email string, or an empty string if input is invalid
 *
 * @example
 * ```typescript
 * redactEmail('user@example.com')  // Returns: 'u***@example.com'
 * redactEmail('a@test.co')         // Returns: 'a***@test.co'
 * redactEmail('')                  // Returns: ''
 * redactEmail(undefined)           // Returns: ''
 * redactEmail('invalid-email')     // Returns: ''
 * ```
 */
export function redactEmail(email: string | undefined | null): string {
  // Handle null, undefined, or empty string
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return '';
  }

  // Validate basic email format (must contain @ and have parts before and after)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.trim())) {
    return '';
  }

  const trimmedEmail = email.trim();
  const atIndex = trimmedEmail.indexOf('@');

  // Split email into username and domain parts
  const username = trimmedEmail.substring(0, atIndex);
  const domain = trimmedEmail.substring(atIndex); // Includes the '@'

  // If username is empty (shouldn't happen due to validation, but safe guard)
  if (username.length === 0) {
    return '';
  }

  // Redact: first character + *** + domain
  const redactedEmail = `${username.charAt(0)}***${domain}`;

  return redactedEmail;
}

/**
 * Test cases for the redactEmail function
 *
 * Since the project doesn't have a test framework configured yet,
 * these test cases serve as documentation and can be manually verified.
 *
 * Test Case 1: Standard email
 * Input: 'john.doe@example.com'
 * Expected: 'j***@example.com'
 *
 * Test Case 2: Single character username
 * Input: 'a@test.co'
 * Expected: 'a***@test.co'
 *
 * Test Case 3: Long username
 * Input: 'verylongusername@domain.org'
 * Expected: 'v***@domain.org'
 *
 * Test Case 4: Email with subdomain
 * Input: 'user@mail.example.com'
 * Expected: 'u***@mail.example.com'
 *
 * Test Case 5: Empty string
 * Input: ''
 * Expected: ''
 *
 * Test Case 6: Undefined
 * Input: undefined
 * Expected: ''
 *
 * Test Case 7: Null
 * Input: null
 * Expected: ''
 *
 * Test Case 8: Invalid email (no @)
 * Input: 'notanemail'
 * Expected: ''
 *
 * Test Case 9: Invalid email (no domain)
 * Input: 'user@'
 * Expected: ''
 *
 * Test Case 10: Invalid email (no username)
 * Input: '@example.com'
 * Expected: ''
 *
 * Test Case 11: Email with spaces
 * Input: '  user@example.com  '
 * Expected: 'u***@example.com'
 *
 * Test Case 12: Invalid type
 * Input: 123 (would need type coercion, but function expects string)
 * Expected: '' (handled by type checking)
 */
