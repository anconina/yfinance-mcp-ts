/**
 * Error Handling Tests
 * Tests error classification and retry logic for both axios and impit errors
 */

import {
  isImpitError,
  isRetryableError,
  isRateLimitError,
  isInvalidCrumbError,
  getRetryAfterMs,
} from '../src/utils/helpers';
import {
  classifyImpitError,
  isRetryableImpitError,
  isImpitRateLimitError,
  ImpitErrorType,
} from '../src/types/impit';
import { mockErrors } from './utils/impit-test-helpers';

describe('Error Classification Functions', () => {
  describe('isImpitError', () => {
    test('should identify impit timeout errors', () => {
      expect(isImpitError(mockErrors.impitTimeout)).toBe(true);
    });

    test('should identify impit network errors', () => {
      expect(isImpitError(mockErrors.impitNetwork)).toBe(true);
    });

    test('should identify impit HTTP/2 protocol errors', () => {
      expect(isImpitError(mockErrors.impitHttp2Protocol)).toBe(true);
    });

    test('should identify hyper_util errors', () => {
      expect(isImpitError(mockErrors.impitHyperUtil)).toBe(true);
    });

    test('should not identify axios errors as impit errors', () => {
      expect(isImpitError(mockErrors.axiosRateLimit)).toBe(false);
      expect(isImpitError(mockErrors.axiosTimeout)).toBe(false);
      expect(isImpitError(mockErrors.axiosNetworkError)).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(isImpitError(null)).toBe(false);
      expect(isImpitError(undefined)).toBe(false);
    });

    test('should handle non-object values', () => {
      expect(isImpitError('string')).toBe(false);
      expect(isImpitError(123)).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    test('should identify HTTP 429 errors', () => {
      expect(isRateLimitError(mockErrors.axiosRateLimit)).toBe(true);
      expect(isRateLimitError(mockErrors.rateLimitWithRetryAfter)).toBe(true);
    });

    test('should not identify other errors as rate limits', () => {
      expect(isRateLimitError(mockErrors.axiosServerError)).toBe(false);
      expect(isRateLimitError(mockErrors.axiosTimeout)).toBe(false);
      expect(isRateLimitError(mockErrors.impitTimeout)).toBe(false);
      expect(isRateLimitError(mockErrors.notFound)).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    describe('axios errors', () => {
      test('should retry rate limit errors', () => {
        expect(isRetryableError(mockErrors.axiosRateLimit)).toBe(true);
      });

      test('should retry server errors (5xx)', () => {
        expect(isRetryableError(mockErrors.axiosServerError)).toBe(true);
      });

      test('should retry timeout errors', () => {
        expect(isRetryableError(mockErrors.axiosTimeout)).toBe(true);
      });

      test('should retry network errors', () => {
        expect(isRetryableError(mockErrors.axiosNetworkError)).toBe(true);
      });

      test('should not retry 404 errors', () => {
        expect(isRetryableError(mockErrors.notFound)).toBe(false);
      });

      test('should not retry 400 errors', () => {
        expect(isRetryableError(mockErrors.badRequest)).toBe(false);
      });
    });

    describe('impit errors', () => {
      test('should retry impit timeout errors', () => {
        expect(isRetryableError(mockErrors.impitTimeout)).toBe(true);
      });

      test('should retry impit network errors', () => {
        expect(isRetryableError(mockErrors.impitNetwork)).toBe(true);
      });

      test('should retry impit HTTP/2 protocol errors', () => {
        expect(isRetryableError(mockErrors.impitHttp2Protocol)).toBe(true);
      });
    });

    test('should handle null/undefined', () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });
  });

  describe('isInvalidCrumbError', () => {
    test('should identify invalid crumb errors', () => {
      expect(isInvalidCrumbError(mockErrors.invalidCrumb)).toBe(true);
    });

    test('should not identify other errors as invalid crumb', () => {
      expect(isInvalidCrumbError(mockErrors.axiosRateLimit)).toBe(false);
      expect(isInvalidCrumbError(mockErrors.notFound)).toBe(false);
      expect(isInvalidCrumbError(mockErrors.impitTimeout)).toBe(false);
    });
  });

  describe('getRetryAfterMs', () => {
    test('should extract Retry-After header value in seconds', () => {
      expect(getRetryAfterMs(mockErrors.rateLimitWithRetryAfter)).toBe(60000);
    });

    test('should return null when no Retry-After header', () => {
      expect(getRetryAfterMs(mockErrors.axiosRateLimit)).toBeNull();
      expect(getRetryAfterMs(mockErrors.axiosTimeout)).toBeNull();
    });

    test('should handle null/undefined', () => {
      expect(getRetryAfterMs(null)).toBeNull();
      expect(getRetryAfterMs(undefined)).toBeNull();
    });
  });
});

describe('Impit-specific Error Classification', () => {
  describe('classifyImpitError', () => {
    test('should classify timeout errors', () => {
      const error = new Error('impit error: timeout exceeded');
      expect(classifyImpitError(error)).toBe(ImpitErrorType.TIMEOUT);
    });

    test('should classify TLS errors', () => {
      const error = new Error('impit error: tls handshake failed');
      expect(classifyImpitError(error)).toBe(ImpitErrorType.TLS);

      const sslError = new Error('impit error: ssl certificate verification failed');
      expect(classifyImpitError(sslError)).toBe(ImpitErrorType.TLS);
    });

    test('should classify proxy errors', () => {
      const error = new Error('impit error: proxy connection refused');
      expect(classifyImpitError(error)).toBe(ImpitErrorType.PROXY);
    });

    test('should classify network errors', () => {
      const error = new Error('impit error: network connect failed');
      expect(classifyImpitError(error)).toBe(ImpitErrorType.NETWORK);
    });

    test('should classify rate limit errors', () => {
      const error429 = new Error('Request failed with status 429');
      expect(classifyImpitError(error429)).toBe(ImpitErrorType.RATE_LIMITED);

      const rateLimitError = new Error('rate limit exceeded');
      expect(classifyImpitError(rateLimitError)).toBe(ImpitErrorType.RATE_LIMITED);
    });

    test('should classify HTTP errors', () => {
      const error500 = new Error('Request failed with status 500');
      expect(classifyImpitError(error500)).toBe(ImpitErrorType.HTTP_ERROR);

      const error404 = new Error('status 404 not found');
      expect(classifyImpitError(error404)).toBe(ImpitErrorType.HTTP_ERROR);
    });

    test('should classify unknown errors', () => {
      const error = new Error('some random error');
      expect(classifyImpitError(error)).toBe(ImpitErrorType.UNKNOWN);
    });
  });

  describe('isRetryableImpitError', () => {
    test('should return true for timeout errors', () => {
      const error = new Error('impit error: timeout exceeded');
      expect(isRetryableImpitError(error)).toBe(true);
    });

    test('should return true for network errors', () => {
      const error = new Error('impit error: network connect failed');
      expect(isRetryableImpitError(error)).toBe(true);
    });

    test('should return true for rate limit errors', () => {
      const error = new Error('Request failed with status 429');
      expect(isRetryableImpitError(error)).toBe(true);
    });

    test('should return false for TLS errors', () => {
      const error = new Error('impit error: tls certificate verification failed');
      expect(isRetryableImpitError(error)).toBe(false);
    });

    test('should return false for proxy errors', () => {
      const error = new Error('impit error: proxy authentication failed');
      expect(isRetryableImpitError(error)).toBe(false);
    });

    test('should return false for unknown errors', () => {
      const error = new Error('some random error');
      expect(isRetryableImpitError(error)).toBe(false);
    });
  });

  describe('isImpitRateLimitError', () => {
    test('should identify rate limit errors', () => {
      const error429 = new Error('Request failed with status 429');
      expect(isImpitRateLimitError(error429)).toBe(true);

      const tooManyRequests = new Error('too many requests');
      expect(isImpitRateLimitError(tooManyRequests)).toBe(true);

      const rateLimitError = new Error('rate limit exceeded');
      expect(isImpitRateLimitError(rateLimitError)).toBe(true);
    });

    test('should not identify other errors as rate limits', () => {
      const timeoutError = new Error('timeout exceeded');
      expect(isImpitRateLimitError(timeoutError)).toBe(false);

      const networkError = new Error('network error');
      expect(isImpitRateLimitError(networkError)).toBe(false);
    });
  });
});

describe('Error Type Integration', () => {
  test('impit error classification should be consistent with general retry logic', () => {
    // Errors that are retryable in impit classification should also be retryable generally
    const timeoutError = { message: 'impit error: timeout exceeded' };
    const networkError = { message: 'impit error: reqwest::Error { kind: Connect }' };

    expect(isRetryableError(timeoutError)).toBe(true);
    expect(isRetryableError(networkError)).toBe(true);

    // Non-retryable in impit should generally be non-retryable
    const unknownError = { message: 'some validation error' };
    expect(isRetryableError(unknownError)).toBe(false);
  });
});
