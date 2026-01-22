import { getRateLimitResult, getRateLimitStatus } from './rate-limiter';

// Mock environment variables for consistent testing
const originalEnv = process.env;

describe('rate-limiter', () => {
  beforeEach(() => {
    // Reset environment to defaults for each test
    jest.resetModules();
    process.env = {
      ...originalEnv,
      RATE_LIMIT_WINDOW_MS: '900000', // 15 minutes
      RATE_LIMIT_MAX_REQUESTS: '5',
      CLEANUP_INTERVAL_MS: '60000', // 1 minute
    };

    // Clear any rate limit data between tests
    // Since the module uses internal state, we need to reimport it
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getRateLimitResult', () => {
    describe('basic rate limiting', () => {
      it('should allow first request from new IP', () => {
        const result = getRateLimitResult('192.168.1.1');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4); // Started with 5, used 1
        expect(result.resetTime).toBeGreaterThan(Date.now());
      });

      it('should allow up to max requests within window', () => {
        const ip = '192.168.1.2';

        // Make 5 requests (the limit)
        for (let i = 0; i < 5; i++) {
          const result = getRateLimitResult(ip);
          expect(result.allowed).toBe(true);
          expect(result.remaining).toBe(4 - i);
        }
      });

      it('should block request after exceeding limit', () => {
        const ip = '192.168.1.3';

        // Make 5 allowed requests
        for (let i = 0; i < 5; i++) {
          getRateLimitResult(ip);
        }

        // 6th request should be blocked
        const result = getRateLimitResult(ip);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.resetTime).toBeGreaterThan(Date.now());
      });

      it('should track remaining requests correctly', () => {
        const ip = '192.168.1.4';

        const result1 = getRateLimitResult(ip);
        expect(result1.remaining).toBe(4);

        const result2 = getRateLimitResult(ip);
        expect(result2.remaining).toBe(3);

        const result3 = getRateLimitResult(ip);
        expect(result3.remaining).toBe(2);
      });

      it('should return consistent resetTime when blocked', () => {
        const ip = '192.168.1.5';

        // Exhaust the limit
        for (let i = 0; i < 5; i++) {
          getRateLimitResult(ip);
        }

        const result1 = getRateLimitResult(ip);
        const result2 = getRateLimitResult(ip);

        // Reset times should be similar (within a few ms)
        expect(Math.abs(result1.resetTime - result2.resetTime)).toBeLessThan(1000);
      });
    });

    describe('multiple IP addresses', () => {
      it('should track different IPs independently', () => {
        const ip1 = '192.168.1.10';
        const ip2 = '192.168.1.11';

        // Exhaust limit for IP1
        for (let i = 0; i < 5; i++) {
          getRateLimitResult(ip1);
        }

        const result1 = getRateLimitResult(ip1);
        expect(result1.allowed).toBe(false);

        // IP2 should still be allowed
        const result2 = getRateLimitResult(ip2);
        expect(result2.allowed).toBe(true);
        expect(result2.remaining).toBe(4);
      });

      it('should handle many different IPs', () => {
        // Force fresh module state to avoid test isolation issues
        jest.resetModules();
        const { getRateLimitResult: freshGetResult } = require('./rate-limiter');

        const ips = Array.from({ length: 100 }, (_, i) => `192.168.1.${i}`);

        ips.forEach(ip => {
          const result = freshGetResult(ip);
          expect(result.allowed).toBe(true);
          expect(result.remaining).toBe(4);
        });
      });
    });

    describe('sliding window behavior', () => {
      it('should allow requests after window expires', (done) => {
        // Use shorter window for faster test
        jest.resetModules();
        process.env.RATE_LIMIT_WINDOW_MS = '100'; // 100ms window

        // Re-import to pick up new env vars
        const { getRateLimitResult: getResult } = require('./rate-limiter');

        const ip = '192.168.1.20';

        // Exhaust limit
        for (let i = 0; i < 5; i++) {
          getResult(ip);
        }

        // Should be blocked
        expect(getResult(ip).allowed).toBe(false);

        // Wait for window to expire
        setTimeout(() => {
          const result = getResult(ip);
          expect(result.allowed).toBe(true);
          done();
        }, 150); // Wait longer than the 100ms window
      }, 1000);

      it('should calculate correct resetTime based on oldest request', () => {
        const ip = '192.168.1.21';
        const firstRequestTime = Date.now();

        // Make requests
        for (let i = 0; i < 5; i++) {
          getRateLimitResult(ip);
        }

        const blockedResult = getRateLimitResult(ip);

        // Reset time should be approximately firstRequestTime + window
        const expectedReset = firstRequestTime + 900000; // 15 min window
        const timeDiff = Math.abs(blockedResult.resetTime - expectedReset);

        // Should be within a few seconds (accounting for test execution time)
        expect(timeDiff).toBeLessThan(5000);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string IP', () => {
        const result = getRateLimitResult('');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
      });

      it('should handle IPv6 addresses', () => {
        const result = getRateLimitResult('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
      });

      it('should handle localhost addresses', () => {
        const result1 = getRateLimitResult('127.0.0.1');
        expect(result1.allowed).toBe(true);

        const result2 = getRateLimitResult('::1');
        expect(result2.allowed).toBe(true);
      });

      it('should handle exactly at limit boundary', () => {
        const ip = '192.168.1.30';

        // Make exactly 5 requests (the limit)
        let lastResult;
        for (let i = 0; i < 5; i++) {
          lastResult = getRateLimitResult(ip);
        }

        // 5th request should be allowed with 0 remaining
        expect(lastResult!.allowed).toBe(true);
        expect(lastResult!.remaining).toBe(0);

        // 6th request should be blocked
        const blockedResult = getRateLimitResult(ip);
        expect(blockedResult.allowed).toBe(false);
      });
    });
  });

  describe('getRateLimitStatus', () => {
    describe('status checking without consuming requests', () => {
      it('should return status for new IP without consuming request', () => {
        const ip = '192.168.2.1';

        const status = getRateLimitStatus(ip);
        expect(status.allowed).toBe(true);
        expect(status.remaining).toBe(5); // Full quota still available

        // Now make an actual request
        const result = getRateLimitResult(ip);
        expect(result.remaining).toBe(4); // Only now is it consumed
      });

      it('should not increment request count', () => {
        const ip = '192.168.2.2';

        // Check status multiple times
        getRateLimitStatus(ip);
        getRateLimitStatus(ip);
        getRateLimitStatus(ip);

        // Make actual request
        const result = getRateLimitResult(ip);
        expect(result.remaining).toBe(4); // Only 1 request consumed
      });

      it('should reflect current state after requests', () => {
        const ip = '192.168.2.3';

        // Make 3 requests
        getRateLimitResult(ip);
        getRateLimitResult(ip);
        getRateLimitResult(ip);

        // Check status
        const status = getRateLimitStatus(ip);
        expect(status.allowed).toBe(true);
        expect(status.remaining).toBe(2);
      });

      it('should show blocked status when limit exceeded', () => {
        const ip = '192.168.2.4';

        // Exhaust limit
        for (let i = 0; i < 5; i++) {
          getRateLimitResult(ip);
        }

        // Check status
        const status = getRateLimitStatus(ip);
        expect(status.allowed).toBe(false);
        expect(status.remaining).toBe(0);
      });

      it('should return correct resetTime', () => {
        const ip = '192.168.2.5';

        // Exhaust limit
        for (let i = 0; i < 5; i++) {
          getRateLimitResult(ip);
        }

        const status = getRateLimitStatus(ip);
        const blockedResult = getRateLimitResult(ip);

        // Reset times should be very similar
        expect(Math.abs(status.resetTime - blockedResult.resetTime)).toBeLessThan(1000);
      });
    });

    describe('interaction with getRateLimitResult', () => {
      it('should show accurate status between requests', () => {
        const ip = '192.168.2.10';

        getRateLimitResult(ip); // 1st request
        const status1 = getRateLimitStatus(ip);
        expect(status1.remaining).toBe(4);

        getRateLimitResult(ip); // 2nd request
        const status2 = getRateLimitStatus(ip);
        expect(status2.remaining).toBe(3);

        getRateLimitResult(ip); // 3rd request
        const status3 = getRateLimitStatus(ip);
        expect(status3.remaining).toBe(2);
      });
    });
  });

  describe('cleanup functionality', () => {
    describe('expired request cleanup', () => {
      it('should clean up requests outside the time window', (done) => {
        // Use shorter window for faster test
        jest.resetModules();
        process.env.RATE_LIMIT_WINDOW_MS = '100'; // 100ms window

        const { getRateLimitResult: getResult, getRateLimitStatus: getStatus } = require('./rate-limiter');

        const ip = '192.168.3.1';

        // Make 3 requests
        getResult(ip);
        getResult(ip);
        getResult(ip);

        // Wait for window to expire
        setTimeout(() => {
          // These old requests should be cleaned up
          const status = getStatus(ip);
          expect(status.remaining).toBe(5); // Back to full quota
          done();
        }, 150);
      }, 1000);

      it('should only count requests within the window', (done) => {
        jest.resetModules();
        process.env.RATE_LIMIT_WINDOW_MS = '200'; // 200ms window

        const { getRateLimitResult: getResult } = require('./rate-limiter');

        const ip = '192.168.3.2';

        // Make 2 requests
        getResult(ip);
        getResult(ip);

        // Wait for first requests to expire
        setTimeout(() => {
          // These should not count toward limit
          for (let i = 0; i < 5; i++) {
            const result = getResult(ip);
            expect(result.allowed).toBe(true);
          }
          done();
        }, 250);
      }, 1000);
    });

    describe('memory management', () => {
      it('should handle cleanup for many IPs', () => {
        // Create many IP entries
        for (let i = 0; i < 1000; i++) {
          getRateLimitResult(`192.168.${Math.floor(i / 256)}.${i % 256}`);
        }

        // Should not crash or run out of memory
        const result = getRateLimitResult('192.168.1.1');
        expect(result).toBeDefined();
      });
    });
  });

  describe('configuration', () => {
    describe('custom rate limit settings', () => {
      it('should respect custom max requests', () => {
        jest.resetModules();
        process.env.RATE_LIMIT_MAX_REQUESTS = '3';

        const { getRateLimitResult: getResult } = require('./rate-limiter');

        const ip = '192.168.4.1';

        // Should allow 3 requests
        expect(getResult(ip).allowed).toBe(true);
        expect(getResult(ip).allowed).toBe(true);
        expect(getResult(ip).allowed).toBe(true);

        // 4th should be blocked
        expect(getResult(ip).allowed).toBe(false);
      });

      it('should respect custom window size', (done) => {
        jest.resetModules();
        process.env.RATE_LIMIT_WINDOW_MS = '50'; // 50ms window
        process.env.RATE_LIMIT_MAX_REQUESTS = '2';

        const { getRateLimitResult: getResult } = require('./rate-limiter');

        const ip = '192.168.4.2';

        // Exhaust limit
        getResult(ip);
        getResult(ip);
        expect(getResult(ip).allowed).toBe(false);

        // Wait for window to expire
        setTimeout(() => {
          expect(getResult(ip).allowed).toBe(true);
          done();
        }, 100);
      }, 500);
    });
  });

  describe('error scenarios', () => {
    it('should handle rapid successive requests', () => {
      const ip = '192.168.5.1';

      // Make many rapid requests
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(getRateLimitResult(ip));
      }

      // First 5 should be allowed
      for (let i = 0; i < 5; i++) {
        expect(results[i].allowed).toBe(true);
      }

      // Rest should be blocked
      for (let i = 5; i < 10; i++) {
        expect(results[i].allowed).toBe(false);
      }
    });

    it('should handle concurrent requests from different IPs', () => {
      const ips = ['192.168.5.10', '192.168.5.11', '192.168.5.12'];

      // Simulate concurrent requests
      const results = ips.map(ip => getRateLimitResult(ip));

      // All should be allowed (different IPs)
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('logging behavior', () => {
    it('should log when rate limit is exceeded', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const ip = '192.168.6.1';

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        getRateLimitResult(ip);
      }

      // This should trigger logging
      getRateLimitResult(ip);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain('Rate limit exceeded');
      expect(consoleSpy.mock.calls[0][0]).toContain(ip);

      consoleSpy.mockRestore();
    });

    it('should include reset time in log message', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const ip = '192.168.6.2';

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        getRateLimitResult(ip);
      }

      getRateLimitResult(ip);

      const logMessage = consoleSpy.mock.calls[0][0];
      expect(logMessage).toContain('Reset at');
      expect(logMessage).toMatch(/\d+ seconds/);

      consoleSpy.mockRestore();
    });
  });
});
