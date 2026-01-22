/**
 * Rate Limiting Module - PII Protection & GDPR Compliance
 *
 * This module implements sliding window rate limiting to prevent abuse while
 * handling IP addresses as Personally Identifiable Information (PII) in compliance
 * with GDPR and privacy regulations.
 *
 * PII HANDLING & PRIVACY PROTECTION:
 * ==================================
 * IP addresses are considered PII under GDPR Article 4(1). This module implements
 * several safeguards to protect user privacy:
 *
 * 1. MINIMAL DATA RETENTION:
 *    - IP addresses are stored ONLY in-memory (never persisted to disk/database)
 *    - Automatic cleanup removes IP data after 15-minute window expires
 *    - No long-term storage or tracking of user IP addresses
 *
 * 2. NO LOGGING OF IP ADDRESSES:
 *    - IP addresses MUST NEVER be logged to console, files, or monitoring systems
 *    - Functions accept IP as parameter but never output it in logs or responses
 *    - All debugging/error messages must redact IP information
 *
 * 3. DATA MINIMIZATION:
 *    - Only stores timestamps (not request content or other identifying data)
 *    - Automatic cleanup purges old entries to minimize data retention
 *    - No cross-session or long-term IP tracking
 *
 * 4. SECURITY BEST PRACTICES:
 *    - In-memory storage prevents data leaks from database breaches
 *    - Automatic expiration ensures compliance with data retention policies
 *    - No IP addresses included in API responses or error messages
 *
 * GDPR COMPLIANCE REQUIREMENTS:
 * =============================
 * - IP addresses processed for legitimate interest (abuse prevention)
 * - Data retention limited to 15 minutes (minimum necessary)
 * - No consent required (legitimate interest under GDPR Article 6(1)(f))
 * - Users have right to request IP deletion (restart server to clear in-memory data)
 *
 * WARNING: When modifying this module, ensure IP addresses are NEVER:
 * - Logged to console.log, console.error, or any logging system
 * - Included in error messages or API responses
 * - Stored in persistent databases or files
 * - Transmitted to third-party services
 *
 * @module lib/rate-limiter
 * @see {@link lib/utils/redact-email.ts} for email PII redaction patterns
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

interface RequestLog {
  timestamps: number[];
  lastCleanup: number;
}

// Configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;
const CLEANUP_INTERVAL_MS = 60 * 1000; // Clean up every minute

// In-memory storage (PII: IP addresses stored temporarily, auto-deleted after window expires)
const requestLogs = new Map<string, RequestLog>();
let lastGlobalCleanup = Date.now();

/**
 * Cleans up expired entries from the request log for a specific IP
 *
 * PII Protection: Removes outdated timestamp data to minimize retention of
 * IP-associated information, supporting GDPR data minimization principles.
 *
 * @param log - The request log containing timestamps to clean
 * @param now - Current timestamp in milliseconds
 * @returns Filtered array containing only timestamps within the rate limit window
 */
function cleanupExpiredRequests(log: RequestLog, now: number): number[] {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  return log.timestamps.filter(timestamp => timestamp > cutoff);
}

/**
 * Performs global cleanup of old entries to prevent memory leaks
 *
 * PII Protection & GDPR Compliance: Automatically purges IP address data from
 * memory after the rate limit window expires. This ensures:
 * - Minimal data retention (15-minute maximum)
 * - No long-term tracking of user IP addresses
 * - Compliance with GDPR data minimization requirements
 * - Automatic fulfillment of data retention policies
 *
 * Runs every 60 seconds to balance memory efficiency with privacy protection.
 */
function performGlobalCleanup(): void {
  const now = Date.now();

  // Only run global cleanup every CLEANUP_INTERVAL_MS
  if (now - lastGlobalCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  for (const [ip, log] of requestLogs.entries()) {
    // Remove entries with no recent requests
    if (log.timestamps.length === 0 || Math.max(...log.timestamps) < cutoff) {
      requestLogs.delete(ip);
    }
  }

  lastGlobalCleanup = now;
}

/**
 * Checks if a request from the given IP address should be allowed
 * Uses sliding window rate limiting algorithm
 *
 * PII HANDLING WARNING: This function processes IP addresses (PII under GDPR).
 * - IP addresses are stored ONLY in-memory, never logged or persisted
 * - Data is automatically deleted after 15-minute window expires
 * - Never log the ipAddress parameter or include it in error messages
 * - Complies with GDPR Article 6(1)(f) - legitimate interest for abuse prevention
 *
 * @param ipAddress - The IP address of the client (PII - handle with care)
 * @returns RateLimitResult indicating if request is allowed and remaining quota
 *
 * @example
 * ```typescript
 * const result = getRateLimitResult('192.168.1.1');
 * if (!result.allowed) {
 *   // Rate limit exceeded - DO NOT log the IP address
 *   console.error('Rate limit exceeded'); // ✓ Correct - no PII
 *   // console.error(`Rate limit exceeded for ${ipAddress}`); // ✗ WRONG - exposes PII
 * }
 * ```
 */
export function getRateLimitResult(ipAddress: string): RateLimitResult {
  const now = Date.now();

  // Perform global cleanup periodically
  performGlobalCleanup();

  // Get or create log for this IP
  let log = requestLogs.get(ipAddress);

  if (!log) {
    log = {
      timestamps: [],
      lastCleanup: now
    };
    requestLogs.set(ipAddress, log);
  }

  // Clean up expired requests for this IP
  log.timestamps = cleanupExpiredRequests(log, now);
  log.lastCleanup = now;

  // Check if under limit
  const requestCount = log.timestamps.length;

  if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    const oldestTimestamp = Math.min(...log.timestamps);
    const resetTime = oldestTimestamp + RATE_LIMIT_WINDOW_MS;
    return {
      allowed: false,
      remaining: 0,
      resetTime
    };
  }

  // Allow request and record timestamp
  log.timestamps.push(now);

  const resetTime = now + RATE_LIMIT_WINDOW_MS;

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - log.timestamps.length,
    resetTime
  };
}

/**
 * Gets the current rate limit status for an IP without consuming a request
 * Useful for checking status without incrementing the counter
 *
 * PII HANDLING WARNING: This function processes IP addresses (PII under GDPR).
 * - IP addresses are stored ONLY in-memory, never logged or persisted
 * - Data is automatically deleted after 15-minute window expires
 * - Never log the ipAddress parameter or include it in error messages
 * - Read-only operation that doesn't modify rate limit state
 *
 * @param ipAddress - The IP address to check (PII - handle with care)
 * @returns Current rate limit status without consuming a request
 *
 * @example
 * ```typescript
 * const status = getRateLimitStatus('192.168.1.1');
 * console.log(`Remaining requests: ${status.remaining}`); // ✓ Correct - no PII
 * // console.log(`Status for ${ipAddress}: ${status.remaining}`); // ✗ WRONG - exposes PII
 * ```
 */
export function getRateLimitStatus(ipAddress: string): RateLimitResult {
  const now = Date.now();
  const log = requestLogs.get(ipAddress);

  if (!log) {
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    };
  }

  // Clean up expired requests
  const activeTimestamps = cleanupExpiredRequests(log, now);
  const requestCount = activeTimestamps.length;

  if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestTimestamp = Math.min(...activeTimestamps);
    const resetTime = oldestTimestamp + RATE_LIMIT_WINDOW_MS;

    return {
      allowed: false,
      remaining: 0,
      resetTime
    };
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - requestCount,
    resetTime: now + RATE_LIMIT_WINDOW_MS
  };
}
