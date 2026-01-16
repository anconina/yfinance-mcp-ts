/**
 * Tests for error helper functions
 */

import {
  isRateLimitError,
  isRetryableError,
  isInvalidCrumbError,
  retry,
  addJitter,
  getRetryAfterMs,
} from '../src/utils/helpers';

describe('Error Helper Functions', () => {
  describe('isRateLimitError', () => {
    test('should return false for null/undefined', () => {
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
    });

    test('should return false for non-object', () => {
      expect(isRateLimitError('error')).toBe(false);
      expect(isRateLimitError(123)).toBe(false);
    });

    test('should detect 429 status in response', () => {
      const error = {
        response: {
          status: 429,
        },
      };
      expect(isRateLimitError(error)).toBe(true);
    });

    test('should return false for non-429 status', () => {
      const error = {
        response: {
          status: 500,
        },
      };
      expect(isRateLimitError(error)).toBe(false);
    });

    test('should detect rate limit in error message', () => {
      expect(isRateLimitError({ message: 'Error 429: Too Many Requests' })).toBe(true);
      expect(isRateLimitError({ message: 'too many requests' })).toBe(true);
      expect(isRateLimitError({ message: 'Rate limit exceeded' })).toBe(true);
    });

    test('should return false for unrelated error messages', () => {
      expect(isRateLimitError({ message: 'Network error' })).toBe(false);
      expect(isRateLimitError({ message: 'Internal server error' })).toBe(false);
    });

    test('should detect ERR_TOO_MANY_REQUESTS code', () => {
      expect(isRateLimitError({ code: 'ERR_TOO_MANY_REQUESTS' })).toBe(true);
    });

    test('should detect status 429 at top level', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
    });

    test('should handle response that is not an object', () => {
      expect(isRateLimitError({ response: 'string response' })).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    test('should return false for null/undefined', () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });

    test('should return false for non-object', () => {
      expect(isRetryableError('error')).toBe(false);
      expect(isRetryableError(123)).toBe(false);
    });

    test('should return true for rate limit errors', () => {
      expect(isRetryableError({ response: { status: 429 } })).toBe(true);
    });

    test('should return true for 5xx server errors', () => {
      expect(isRetryableError({ response: { status: 500 } })).toBe(true);
      expect(isRetryableError({ response: { status: 502 } })).toBe(true);
      expect(isRetryableError({ response: { status: 503 } })).toBe(true);
      expect(isRetryableError({ response: { status: 504 } })).toBe(true);
    });

    test('should return true for 408 Request Timeout', () => {
      expect(isRetryableError({ response: { status: 408 } })).toBe(true);
    });

    test('should return false for 4xx client errors', () => {
      expect(isRetryableError({ response: { status: 400 } })).toBe(false);
      expect(isRetryableError({ response: { status: 401 } })).toBe(false);
      expect(isRetryableError({ response: { status: 403 } })).toBe(false);
      expect(isRetryableError({ response: { status: 404 } })).toBe(false);
    });

    test('should return true for network error codes', () => {
      expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
      expect(isRetryableError({ code: 'ECONNREFUSED' })).toBe(true);
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryableError({ code: 'ENOTFOUND' })).toBe(true);
      expect(isRetryableError({ code: 'ENETUNREACH' })).toBe(true);
      expect(isRetryableError({ code: 'EAI_AGAIN' })).toBe(true);
      expect(isRetryableError({ code: 'EPIPE' })).toBe(true);
      expect(isRetryableError({ code: 'ERR_NETWORK' })).toBe(true);
    });

    test('should return false for non-retryable error codes', () => {
      expect(isRetryableError({ code: 'ERR_INVALID_URL' })).toBe(false);
      expect(isRetryableError({ code: 'ERR_BAD_REQUEST' })).toBe(false);
    });

    test('should return true for transient error messages', () => {
      expect(isRetryableError({ message: 'network error occurred' })).toBe(true);
      expect(isRetryableError({ message: 'Request timeout' })).toBe(true);
      expect(isRetryableError({ message: 'socket hang up' })).toBe(true);
      expect(isRetryableError({ message: 'ECONNRESET' })).toBe(true);
      expect(isRetryableError({ message: 'connection refused ECONNREFUSED' })).toBe(true);
    });

    test('should return false for non-transient error messages', () => {
      expect(isRetryableError({ message: 'Invalid input' })).toBe(false);
      expect(isRetryableError({ message: 'Authentication failed' })).toBe(false);
    });

    test('should handle response that is not an object', () => {
      expect(isRetryableError({ response: 'string response' })).toBe(false);
    });

    test('should handle code that is not a string', () => {
      expect(isRetryableError({ code: 123 })).toBe(false);
    });
  });

  describe('isInvalidCrumbError', () => {
    test('should return false for null/undefined', () => {
      expect(isInvalidCrumbError(null)).toBe(false);
      expect(isInvalidCrumbError(undefined)).toBe(false);
    });

    test('should return false for non-object', () => {
      expect(isInvalidCrumbError('error')).toBe(false);
      expect(isInvalidCrumbError(123)).toBe(false);
    });

    test('should detect invalid crumb in message', () => {
      expect(isInvalidCrumbError({ message: 'Invalid crumb error' })).toBe(true);
      expect(isInvalidCrumbError({ message: 'Request unauthorized' })).toBe(true);
    });

    test('should return false for unrelated messages', () => {
      expect(isInvalidCrumbError({ message: 'Network error' })).toBe(false);
      expect(isInvalidCrumbError({ message: 'Rate limit exceeded' })).toBe(false);
    });

    test('should detect Yahoo Finance unauthorized error in response', () => {
      const error = {
        response: {
          data: {
            finance: {
              error: {
                code: 'Unauthorized',
              },
            },
          },
        },
      };
      expect(isInvalidCrumbError(error)).toBe(true);
    });

    test('should detect crumb error in Yahoo Finance response', () => {
      const error = {
        response: {
          data: {
            finance: {
              error: {
                code: 'SomeError',
                description: 'Invalid crumb provided',
              },
            },
          },
        },
      };
      expect(isInvalidCrumbError(error)).toBe(true);
    });

    test('should return false for other Yahoo Finance errors', () => {
      const error = {
        response: {
          data: {
            finance: {
              error: {
                code: 'NotFound',
                description: 'Symbol not found',
              },
            },
          },
        },
      };
      expect(isInvalidCrumbError(error)).toBe(false);
    });

    test('should handle response.data that is not an object', () => {
      expect(isInvalidCrumbError({ response: { data: 'string data' } })).toBe(false);
    });

    test('should handle response without data', () => {
      expect(isInvalidCrumbError({ response: {} })).toBe(false);
    });

    test('should handle finance without error', () => {
      const error = {
        response: {
          data: {
            finance: {
              result: 'success',
            },
          },
        },
      };
      expect(isInvalidCrumbError(error)).toBe(false);
    });

    test('should handle finance.error that is not an object', () => {
      const error = {
        response: {
          data: {
            finance: {
              error: 'string error',
            },
          },
        },
      };
      expect(isInvalidCrumbError(error)).toBe(false);
    });
  });

  describe('addJitter', () => {
    test('should return a number', () => {
      const result = addJitter(1000);
      expect(typeof result).toBe('number');
    });

    test('should stay within jitter bounds', () => {
      // Run multiple times to test randomness
      for (let i = 0; i < 100; i++) {
        const result = addJitter(1000, 0.3);
        expect(result).toBeGreaterThanOrEqual(700);
        expect(result).toBeLessThanOrEqual(1300);
      }
    });

    test('should never return negative', () => {
      for (let i = 0; i < 100; i++) {
        const result = addJitter(100, 1.5); // Large jitter factor
        expect(result).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('retry with onRetry callback', () => {
    test('should call onRetry callback on retry', async () => {
      const onRetry = jest.fn();
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      await retry(fn, {
        maxRetries: 2,
        initialDelay: 10,
        jitter: false,
        isRetryable: () => true,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        10
      );
    });

    test('should not call onRetry on success', async () => {
      const onRetry = jest.fn();
      const fn = jest.fn().mockResolvedValue('success');

      await retry(fn, {
        maxRetries: 2,
        initialDelay: 10,
        onRetry,
      });

      expect(onRetry).not.toHaveBeenCalled();
    });

    test('should throw immediately for non-retryable error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('non-retryable'));

      await expect(
        retry(fn, {
          maxRetries: 3,
          initialDelay: 10,
          isRetryable: () => false,
        })
      ).rejects.toThrow('non-retryable');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRetryAfterMs', () => {
    test('should return null for null/undefined', () => {
      expect(getRetryAfterMs(null)).toBeNull();
      expect(getRetryAfterMs(undefined)).toBeNull();
    });

    test('should return null for non-object', () => {
      expect(getRetryAfterMs('error')).toBeNull();
      expect(getRetryAfterMs(123)).toBeNull();
    });

    test('should return null when no response', () => {
      expect(getRetryAfterMs({})).toBeNull();
      expect(getRetryAfterMs({ message: 'error' })).toBeNull();
    });

    test('should return null when no headers', () => {
      expect(getRetryAfterMs({ response: {} })).toBeNull();
      expect(getRetryAfterMs({ response: { status: 429 } })).toBeNull();
    });

    test('should return null when no Retry-After header', () => {
      const error = {
        response: {
          headers: {
            'content-type': 'application/json',
          },
        },
      };
      expect(getRetryAfterMs(error)).toBeNull();
    });

    test('should parse Retry-After as seconds (lowercase header)', () => {
      const error = {
        response: {
          headers: {
            'retry-after': '60',
          },
        },
      };
      expect(getRetryAfterMs(error)).toBe(60000); // 60 seconds in ms
    });

    test('should parse Retry-After as seconds (mixed case header)', () => {
      const error = {
        response: {
          headers: {
            'Retry-After': '120',
          },
        },
      };
      expect(getRetryAfterMs(error)).toBe(120000); // 120 seconds in ms
    });

    test('should parse Retry-After as seconds (uppercase header)', () => {
      const error = {
        response: {
          headers: {
            'RETRY-AFTER': '30',
          },
        },
      };
      expect(getRetryAfterMs(error)).toBe(30000); // 30 seconds in ms
    });

    test('should handle array header values', () => {
      const error = {
        response: {
          headers: {
            'retry-after': ['45'],
          },
        },
      };
      expect(getRetryAfterMs(error)).toBe(45000); // 45 seconds in ms
    });

    test('should parse Retry-After as HTTP date', () => {
      const futureDate = new Date(Date.now() + 30000); // 30 seconds from now
      const error = {
        response: {
          headers: {
            'retry-after': futureDate.toUTCString(),
          },
        },
      };
      const result = getRetryAfterMs(error);
      expect(result).not.toBeNull();
      // Allow 1 second tolerance for timing
      expect(result).toBeGreaterThanOrEqual(29000);
      expect(result).toBeLessThanOrEqual(31000);
    });

    test('should return 0 for past HTTP date', () => {
      const pastDate = new Date(Date.now() - 30000); // 30 seconds ago
      const error = {
        response: {
          headers: {
            'retry-after': pastDate.toUTCString(),
          },
        },
      };
      expect(getRetryAfterMs(error)).toBe(0);
    });

    test('should return null for invalid Retry-After value', () => {
      const error = {
        response: {
          headers: {
            'retry-after': 'invalid-value',
          },
        },
      };
      expect(getRetryAfterMs(error)).toBeNull();
    });

    test('should handle 0 seconds', () => {
      const error = {
        response: {
          headers: {
            'retry-after': '0',
          },
        },
      };
      expect(getRetryAfterMs(error)).toBe(0);
    });

    test('should handle empty array header', () => {
      const error = {
        response: {
          headers: {
            'retry-after': [],
          },
        },
      };
      expect(getRetryAfterMs(error)).toBeNull();
    });
  });

  describe('retry with getDelayFromError', () => {
    test('should use delay from getDelayFromError when provided', async () => {
      const startTime = Date.now();
      const fn = jest.fn()
        .mockRejectedValueOnce({ retryAfter: 100 })
        .mockResolvedValue('success');

      await retry(fn, {
        maxRetries: 2,
        initialDelay: 1000, // Would normally wait 1000ms
        jitter: false,
        isRetryable: () => true,
        getDelayFromError: (error: unknown) => (error as { retryAfter: number }).retryAfter,
      });

      const elapsed = Date.now() - startTime;
      // Should use 100ms from getDelayFromError, not 1000ms initialDelay
      expect(elapsed).toBeLessThan(500);
    });

    test('should use exponential backoff when getDelayFromError returns null', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      await retry(fn, {
        maxRetries: 2,
        initialDelay: 50,
        jitter: false,
        isRetryable: () => true,
        getDelayFromError: () => null,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 50);
    });

    test('should cap delay from getDelayFromError at maxDelay', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce({ retryAfter: 10000 })
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      await retry(fn, {
        maxRetries: 2,
        initialDelay: 10,
        maxDelay: 100, // Cap at 100ms
        jitter: false,
        isRetryable: () => true,
        getDelayFromError: (error: unknown) => (error as { retryAfter: number }).retryAfter,
        onRetry,
      });

      // Should be capped at 100ms
      expect(onRetry).toHaveBeenCalledWith(expect.any(Object), 1, 100);
    });

    test('should ignore negative delay from getDelayFromError', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce({ retryAfter: -100 })
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      await retry(fn, {
        maxRetries: 2,
        initialDelay: 50,
        jitter: false,
        isRetryable: () => true,
        getDelayFromError: (error: unknown) => (error as { retryAfter: number }).retryAfter,
        onRetry,
      });

      // Should use initialDelay since getDelayFromError returned negative
      expect(onRetry).toHaveBeenCalledWith(expect.any(Object), 1, 50);
    });

    test('should work with getRetryAfterMs helper', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce({
          response: {
            headers: {
              'retry-after': '1', // 1 second
            },
          },
        })
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      await retry(fn, {
        maxRetries: 2,
        initialDelay: 100,
        maxDelay: 5000,
        jitter: false,
        isRetryable: () => true,
        getDelayFromError: getRetryAfterMs,
        onRetry,
      });

      // Should use 1000ms from Retry-After header
      expect(onRetry).toHaveBeenCalledWith(expect.any(Object), 1, 1000);
    });
  });
});
