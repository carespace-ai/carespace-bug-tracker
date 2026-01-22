export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

interface RequestLog {
  timestamps: number[];
  lastCleanup: number;
}

// Configuration from environment variables with defaults
const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS
  ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)
  : 15 * 60 * 1000; // 15 minutes

const RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS
  ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
  : 5;

const CLEANUP_INTERVAL_MS = process.env.CLEANUP_INTERVAL_MS
  ? parseInt(process.env.CLEANUP_INTERVAL_MS, 10)
  : 60 * 1000; // Clean up every minute

// In-memory storage
const requestLogs = new Map<string, RequestLog>();
let lastGlobalCleanup = Date.now();

/**
 * Cleans up expired entries from the request log for a specific IP
 */
function cleanupExpiredRequests(log: RequestLog, now: number): number[] {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  return log.timestamps.filter(timestamp => timestamp > cutoff);
}

/**
 * Performs global cleanup of old entries to prevent memory leaks
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
 * @param ipAddress - The IP address of the client
 * @returns RateLimitResult indicating if request is allowed and remaining quota
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
    const resetDate = new Date(resetTime);
    const secondsUntilReset = Math.ceil((resetTime - now) / 1000);

    console.error(
      `Rate limit exceeded for IP ${ipAddress}. ` +
      `Current requests: ${requestCount}/${RATE_LIMIT_MAX_REQUESTS}. ` +
      `Reset at ${resetDate.toISOString()} (in ${secondsUntilReset} seconds).`
    );

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
 * @param ipAddress - The IP address to check
 * @returns Current rate limit status
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
