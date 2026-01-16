/**
 * Tests for error helper functions
 */

import {
  isRateLimitError,
  isRetryableError,
  isInvalidCrumbError,
  retry,
  addJitter,
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
});
