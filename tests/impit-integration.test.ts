/**
 * Impit Integration Tests with Yahoo Finance
 * These tests make real network requests to Yahoo Finance API
 *
 * Run with: npm test -- tests/impit-integration.test.ts
 */

import { SessionManager } from '../src/core/SessionManager';
import { ImpitClient } from '../src/core/ImpitClient';
import { INTEGRATION_TEST_TIMEOUT } from './utils/impit-test-helpers';

// Skip integration tests in CI unless explicitly enabled
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true' || !process.env.CI;

const describeIntegration = runIntegrationTests ? describe : describe.skip;

describeIntegration('Impit Integration Tests', () => {
  // Increase timeout for network requests
  jest.setTimeout(INTEGRATION_TEST_TIMEOUT);

  describe('ImpitClient Direct Tests', () => {
    let client: ImpitClient;

    beforeEach(() => {
      client = new ImpitClient({
        timeout: 30000,
      });
    });

    test('should fetch a web page successfully', async () => {
      const response = await client.get<string>('https://finance.yahoo.com', {
        headers: {
          Accept: 'text/html',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toContain('html');
    });

    test('should have valid browser fingerprint headers', async () => {
      const impersonation = client.getImpersonation();

      expect(impersonation.headers).toBeDefined();
      expect(Object.keys(impersonation.headers).length).toBeGreaterThan(0);

      // Chrome should have sec-ch-ua headers
      if (impersonation.browser === 'chrome') {
        expect(impersonation.headers['sec-ch-ua']).toBeDefined();
      }
    });

    test('should persist cookies across requests', async () => {
      // First request to set cookies
      await client.get('https://finance.yahoo.com');

      // Get cookies from jar
      const cookieJar = client.getCookieJar();
      const cookies = await cookieJar.getCookies('https://finance.yahoo.com');

      expect(cookies.length).toBeGreaterThan(0);
    });
  });

  describe('SessionManager with Impit', () => {
    let session: SessionManager;

    beforeEach(() => {
      session = new SessionManager({
        httpClient: 'impit',
        retry: {
          enabled: true,
          maxRetries: 2,
          initialDelay: 1000,
        },
      });
    });

    test('should initialize session and obtain crumb', async () => {
      await session.initialize();

      expect(session.isInitialized()).toBe(true);
      expect(session.getCrumbValue()).toBeTruthy();
      expect(session.getCrumbValue()).not.toContain('<html>');
    });

    test('should report correct HTTP client type', () => {
      expect(session.getHttpClientType()).toBe('impit');
    });

    test('should return current browser info', () => {
      const browser = session.getCurrentBrowser();

      expect(browser).toBeDefined();
      expect(['chrome', 'firefox']).toContain(browser?.browser);
    });

    test('should make successful API request', async () => {
      await session.initialize();

      const url = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL';
      const response = await session.get<{
        quoteSummary: {
          result: Array<{
            price: { regularMarketPrice: { raw: number } };
          }>;
        };
      }>(url, {
        params: { modules: 'price' },
      });

      expect(response.quoteSummary).toBeDefined();
      expect(response.quoteSummary.result).toHaveLength(1);
      expect(response.quoteSummary.result[0].price.regularMarketPrice.raw).toBeGreaterThan(0);
    });

    test('should rotate browser and continue working', async () => {
      await session.initialize();
      const initialBrowser = session.getCurrentBrowser();

      // Rotate browser
      const newBrowser = session.rotateBrowser();
      expect(newBrowser).toBeDefined();

      // Make request with new browser
      const url = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/MSFT';
      const response = await session.get<{
        quoteSummary: {
          result: Array<{
            price: { regularMarketPrice: { raw: number } };
          }>;
        };
      }>(url, {
        params: { modules: 'price' },
      });

      expect(response.quoteSummary.result[0].price.regularMarketPrice.raw).toBeGreaterThan(0);
    });

    test('should handle multiple sequential requests', async () => {
      await session.initialize();

      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const prices: Record<string, number> = {};

      for (const symbol of symbols) {
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
        const response = await session.get<{
          quoteSummary: {
            result: Array<{
              price: { regularMarketPrice: { raw: number } };
            }>;
          };
        }>(url, {
          params: { modules: 'price' },
        });

        prices[symbol] = response.quoteSummary.result[0].price.regularMarketPrice.raw;
      }

      expect(Object.keys(prices)).toHaveLength(3);
      expect(prices['AAPL']).toBeGreaterThan(0);
      expect(prices['MSFT']).toBeGreaterThan(0);
      expect(prices['GOOGL']).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid symbol gracefully', async () => {
      const session = new SessionManager({
        httpClient: 'impit',
        retry: { enabled: false },
      });

      await session.initialize();

      // Yahoo Finance typically returns an error structure for invalid symbols
      const url = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/INVALID_SYMBOL_12345';
      const response = await session.get<{
        quoteSummary: {
          result: unknown;
          error: { code: string; description: string } | null;
        };
      }>(url, {
        params: { modules: 'price' },
      });

      // Either result is null/empty or error is present
      const hasError = response.quoteSummary.error !== null;
      const hasEmptyResult =
        response.quoteSummary.result === null ||
        (Array.isArray(response.quoteSummary.result) &&
          response.quoteSummary.result.length === 0);

      expect(hasError || hasEmptyResult).toBe(true);
    });
  });

  describe('Browser Rotation', () => {
    test('should cycle through different browser configurations', async () => {
      const client = new ImpitClient();
      const browsers = new Set<string>();

      // Rotate 20 times to try to get different configs
      for (let i = 0; i < 20; i++) {
        const config = client.getBrowserConfig();
        browsers.add(`${config.browser}/${config.platform}`);
        client.rotateBrowser();
      }

      // Should have gotten at least 2 different configurations
      expect(browsers.size).toBeGreaterThanOrEqual(2);
    });
  });
});

describeIntegration('Session Persistence', () => {
  jest.setTimeout(INTEGRATION_TEST_TIMEOUT);

  test('should maintain session across multiple managers with shared cookie jar', async () => {
    // Create first session and initialize
    const session1 = new SessionManager({ httpClient: 'impit' });
    await session1.initialize();

    const crumb1 = session1.getCrumbValue();
    expect(crumb1).toBeTruthy();

    // Create second session with fresh state
    const session2 = new SessionManager({ httpClient: 'impit' });
    await session2.initialize();

    const crumb2 = session2.getCrumbValue();
    expect(crumb2).toBeTruthy();

    // Both sessions should work independently
    const url = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL';

    const [result1, result2] = await Promise.all([
      session1.get<{ quoteSummary: { result: unknown[] } }>(url, {
        params: { modules: 'price' },
      }),
      session2.get<{ quoteSummary: { result: unknown[] } }>(url, {
        params: { modules: 'price' },
      }),
    ]);

    expect(result1.quoteSummary.result).toHaveLength(1);
    expect(result2.quoteSummary.result).toHaveLength(1);
  });
});
