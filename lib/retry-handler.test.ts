import { retryWithBackoff, retryWithResult, RetryOptions } from './retry-handler';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on timeout errors', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Request timeout'))
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should retry on network errors', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Network error occurred'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should retry on 5xx server errors', async () => {
    const error500 = new Error('Server error');
    (error500 as any).status = 500;

    const error503 = new Error('Service unavailable');
    (error503 as any).status = 503;

    const mockFn = jest.fn()
      .mockRejectedValueOnce(error500)
      .mockRejectedValueOnce(error503)
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on 4xx client errors by default', async () => {
    const error400 = new Error('Bad request');
    (error400 as any).status = 400;

    const mockFn = jest.fn().mockRejectedValueOnce(error400);

    await expect(retryWithBackoff(mockFn)).rejects.toThrow('Bad request');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxRetries option', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Network error'));

    const options: RetryOptions = {
      maxRetries: 2,
      baseDelay: 10 // Use short delay for testing
    };

    await expect(retryWithBackoff(mockFn, options)).rejects.toThrow('Network error');
    expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const startTime = Date.now();
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('success');

    const options: RetryOptions = {
      maxRetries: 3,
      baseDelay: 100 // 100ms base delay
    };

    await retryWithBackoff(mockFn, options);
    const duration = Date.now() - startTime;

    // Should have delays: 100ms (2^0 * 100) + 200ms (2^1 * 100) = 300ms minimum
    expect(duration).toBeGreaterThanOrEqual(290); // Allow small margin
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should respect maxDelay cap', async () => {
    const startTime = Date.now();
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('success');

    const options: RetryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 500 // Cap at 500ms
    };

    await retryWithBackoff(mockFn, options);
    const duration = Date.now() - startTime;

    // First retry would be 1000ms, but capped at 500ms
    expect(duration).toBeGreaterThanOrEqual(490);
    expect(duration).toBeLessThan(700); // Should not exceed cap significantly
  });

  it('should use custom shouldRetry function', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('CUSTOM_ERROR'))
      .mockResolvedValueOnce('success');

    const options: RetryOptions = {
      baseDelay: 10,
      shouldRetry: (error) => {
        return error instanceof Error && error.message === 'CUSTOM_ERROR';
      }
    };

    const result = await retryWithBackoff(mockFn, options);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should not retry when custom shouldRetry returns false', async () => {
    const mockFn = jest.fn().mockRejectedValueOnce(new Error('DO_NOT_RETRY'));

    const options: RetryOptions = {
      shouldRetry: (error) => {
        return error instanceof Error && error.message !== 'DO_NOT_RETRY';
      }
    };

    await expect(retryWithBackoff(mockFn, options)).rejects.toThrow('DO_NOT_RETRY');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle TimeoutError by name', async () => {
    const timeoutError = new Error('Request failed');
    timeoutError.name = 'TimeoutError';

    const mockFn = jest.fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn, { baseDelay: 10 });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should handle errors with response.status property', async () => {
    const axiosStyleError = {
      message: 'Request failed',
      response: { status: 502 }
    };

    const mockFn = jest.fn()
      .mockRejectedValueOnce(axiosStyleError)
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn, { baseDelay: 10 });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe('retryWithResult', () => {
  it('should return success result on first attempt', async () => {
    const mockFn = jest.fn().mockResolvedValue('data');

    const result = await retryWithResult(mockFn);

    expect(result).toEqual({
      success: true,
      result: 'data',
      attempts: 1
    });
  });

  it('should return success result after retries', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('data');

    const result = await retryWithResult(mockFn, { baseDelay: 10 });

    expect(result).toEqual({
      success: true,
      result: 'data',
      attempts: 3
    });
  });

  it('should return failure result after max retries', async () => {
    const error = new Error('Network error');
    const mockFn = jest.fn().mockRejectedValue(error);

    const result = await retryWithResult(mockFn, {
      maxRetries: 2,
      baseDelay: 10
    });

    expect(result).toEqual({
      success: false,
      error,
      attempts: 3 // initial + 2 retries
    });
  });

  it('should return failure result for non-retryable errors', async () => {
    const error = new Error('Bad request');
    (error as any).status = 400;
    const mockFn = jest.fn().mockRejectedValue(error);

    const result = await retryWithResult(mockFn);

    expect(result).toEqual({
      success: false,
      error,
      attempts: 1
    });
  });

  it('should track correct attempt count', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('success');

    const result = await retryWithResult(mockFn, {
      maxRetries: 3,
      baseDelay: 10
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(4);
  });
});

describe('Default retry conditions', () => {
  it('should retry on various timeout error messages', async () => {
    const errors = [
      new Error('Request timeout'),
      new Error('Operation timed out'),
      new Error('Connection timeout'),
      Object.assign(new Error('Timeout'), { name: 'TimeoutError' })
    ];

    for (const error of errors) {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(mockFn, { baseDelay: 10 });
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
      jest.clearAllMocks();
    }
  });

  it('should retry on various network error messages', async () => {
    const errors = [
      new Error('Network error'),
      new Error('ECONNREFUSED: Connection refused'),
      new Error('ENOTFOUND: DNS lookup failed'),
      new Error('ECONNRESET: Connection reset'),
      Object.assign(new Error('Failed'), { name: 'NetworkError' })
    ];

    for (const error of errors) {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(mockFn, { baseDelay: 10 });
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
      jest.clearAllMocks();
    }
  });

  it('should retry on server error status messages', async () => {
    const errors = [
      new Error('Server error: status code 500'),
      new Error('Received status code 503'),
      new Error('HTTP 502 server error')
    ];

    for (const error of errors) {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(mockFn, { baseDelay: 10 });
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
      jest.clearAllMocks();
    }
  });
});
