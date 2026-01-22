/**
 * Retry handler with exponential backoff
 * Retries failed operations with increasing delays between attempts
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number; // in milliseconds
  maxDelay?: number; // maximum delay cap
  shouldRetry?: (error: unknown) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: unknown;
  attempts: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds max
  shouldRetry: (error: unknown) => {
    // Default retry logic: retry on network errors, 5xx errors, and timeouts
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const name = error.name.toLowerCase();

      // Timeout errors
      if (name === 'timeouterror' || message.includes('timeout') || message.includes('timed out')) {
        return true;
      }

      // Network errors
      if (
        message.includes('network') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('econnreset') ||
        name === 'networkerror'
      ) {
        return true;
      }

      // HTTP 5xx errors
      if (message.includes('status code 5') || message.includes('server error')) {
        return true;
      }
    }

    // Check for HTTP response status
    if (typeof error === 'object' && error !== null) {
      const err = error as any;
      if (err.status >= 500 && err.status < 600) {
        return true;
      }
      if (err.response?.status >= 500 && err.response?.status < 600) {
        return true;
      }
    }

    return false;
  }
};

/**
 * Calculate delay with exponential backoff
 * Formula: baseDelay * (2 ^ attempt)
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn The async function to retry
 * @param options Retry configuration options
 * @returns Promise resolving to the function result
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!config.shouldRetry(error)) {
        throw error;
      }

      // Don't delay after the last attempt
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config.baseDelay, config.maxDelay);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Retry a function and return a result object instead of throwing
 * Useful when you want to handle failures gracefully without try/catch
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let attempts = 0;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    attempts++;
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts
      };
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!config.shouldRetry(error)) {
        return {
          success: false,
          error,
          attempts
        };
      }

      // Don't delay after the last attempt
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config.baseDelay, config.maxDelay);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError,
    attempts
  };
}
