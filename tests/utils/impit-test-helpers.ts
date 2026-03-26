/**
 * Test utilities for impit integration tests
 */

import { CookieJar } from 'tough-cookie';

/**
 * Mock impit response for testing
 */
export interface MockImpitResponse {
  status: number;
  statusText: string;
  headers: Map<string, string>;
  url: string;
  ok: boolean;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

/**
 * Create a mock impit response
 */
export function createMockImpitResponse<T>(
  data: T,
  options: {
    status?: number;
    statusText?: string;
    contentType?: string;
    url?: string;
  } = {}
): MockImpitResponse {
  const {
    status = 200,
    statusText = 'OK',
    contentType = 'application/json',
    url = 'https://example.com',
  } = options;

  const headers = new Map<string, string>();
  headers.set('content-type', contentType);

  return {
    status,
    statusText,
    headers,
    url,
    ok: status >= 200 && status < 300,
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
  };
}

/**
 * Create mock error objects for testing error handling
 */
export const mockErrors = {
  // Impit-specific errors
  impitTimeout: {
    message: 'impit error: timeout exceeded while connecting',
    name: 'Error',
  },
  impitNetwork: {
    message: 'impit error: reqwest::Error { kind: Connect, url: "https://example.com" }',
    name: 'Error',
  },
  impitHttp2Protocol: {
    message: 'impit error: hyper::Error(Http2, Error { kind: Reset(StreamId(3), PROTOCOL_ERROR) })',
    name: 'Error',
  },
  impitHyperUtil: {
    message: 'hyper_util::client::legacy::Error(SendRequest, timeout)',
    name: 'Error',
  },
  impitProxy: {
    message: 'impit error: proxy connection refused',
    name: 'Error',
  },
  impitTls: {
    message: 'impit error: tls handshake failed - certificate verification error',
    name: 'Error',
  },

  // Axios-style errors
  axiosRateLimit: {
    message: 'Request failed with status code 429',
    response: { status: 429 },
    name: 'AxiosError',
  },
  axiosServerError: {
    message: 'Request failed with status code 500',
    response: { status: 500 },
    name: 'AxiosError',
  },
  axiosTimeout: {
    message: 'timeout of 30000ms exceeded',
    code: 'ETIMEDOUT',
    name: 'AxiosError',
  },
  axiosNetworkError: {
    message: 'Network Error',
    code: 'ERR_NETWORK',
    name: 'AxiosError',
  },

  // Rate limit with Retry-After header
  rateLimitWithRetryAfter: {
    message: 'Request failed with status code 429',
    response: {
      status: 429,
      headers: {
        'retry-after': '60',
      },
    },
    name: 'Error',
  },

  // Invalid crumb
  invalidCrumb: {
    message: 'Invalid crumb',
    response: {
      status: 401,
      data: {
        finance: {
          error: {
            code: 'Unauthorized',
            description: 'Invalid crumb',
          },
        },
      },
    },
    name: 'Error',
  },

  // Non-retryable errors
  notFound: {
    message: 'Request failed with status code 404',
    response: { status: 404 },
    name: 'Error',
  },
  badRequest: {
    message: 'Request failed with status code 400',
    response: { status: 400 },
    name: 'Error',
  },
};

/**
 * Create a mock Yahoo Finance quote response
 */
export function createMockQuoteResponse(symbol: string, price: number) {
  return {
    quoteSummary: {
      result: [
        {
          price: {
            symbol,
            regularMarketPrice: { raw: price, fmt: `$${price.toFixed(2)}` },
            regularMarketChange: { raw: 1.5, fmt: '1.50' },
            regularMarketChangePercent: { raw: 0.01, fmt: '1.00%' },
            currency: 'USD',
            exchange: 'NMS',
            exchangeName: 'NasdaqGS',
            marketState: 'REGULAR',
          },
        },
      ],
      error: null,
    },
  };
}

/**
 * Create a mock crumb response
 */
export function createMockCrumbResponse(): string {
  return 'mock_crumb_' + Math.random().toString(36).substring(7);
}

/**
 * Create a fresh cookie jar for testing
 */
export function createTestCookieJar(): CookieJar {
  return new CookieJar();
}

/**
 * Wait for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test timeout wrapper for long-running tests
 */
export const INTEGRATION_TEST_TIMEOUT = 60000; // 60 seconds
export const UNIT_TEST_TIMEOUT = 10000; // 10 seconds
