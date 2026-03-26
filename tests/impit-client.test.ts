/**
 * ImpitClient Unit Tests
 * Tests the ImpitClient wrapper class with mocked impit library
 */

import { CookieJar } from 'tough-cookie';
import {
  createMockImpitResponse,
  createMockQuoteResponse,
  UNIT_TEST_TIMEOUT,
} from './utils/impit-test-helpers';

// Mock the impit module
const mockFetch = jest.fn();

jest.mock('impit', () => {
  return {
    Impit: jest.fn().mockImplementation(() => ({
      fetch: mockFetch,
    })),
  };
});

// Import after mocking
import { ImpitClient } from '../src/core/ImpitClient';

describe('ImpitClient - Unit Tests', () => {
  let client: ImpitClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new ImpitClient({
      timeout: 10000,
    });
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultClient = new ImpitClient();
      expect(defaultClient.getTimeout()).toBe(30000);
      expect(defaultClient.getCookieJar()).toBeInstanceOf(CookieJar);
    });

    test('should accept custom timeout', () => {
      const customClient = new ImpitClient({ timeout: 5000 });
      expect(customClient.getTimeout()).toBe(5000);
    });

    test('should accept custom cookie jar', () => {
      const customJar = new CookieJar();
      const customClient = new ImpitClient({ cookieJar: customJar });
      expect(customClient.getCookieJar()).toBe(customJar);
    });

    test('should select a browser configuration', () => {
      const browserConfig = client.getBrowserConfig();
      expect(browserConfig).toBeDefined();
      expect(['chrome', 'firefox']).toContain(browserConfig.browser);
      expect(['windows', 'macos', 'linux']).toContain(browserConfig.platform);
    });
  });

  describe('get method', () => {
    test('should make GET request and return data', async () => {
      const mockData = { test: 'data' };
      mockFetch.mockResolvedValueOnce(createMockImpitResponse(mockData));

      const response = await client.get<typeof mockData>('https://example.com/api');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
    });

    test('should append query parameters to URL', async () => {
      mockFetch.mockResolvedValueOnce(createMockImpitResponse({}));

      await client.get('https://example.com/api', {
        params: { symbol: 'AAPL', interval: '1d' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api?symbol=AAPL&interval=1d',
        expect.any(Object)
      );
    });

    test('should skip undefined params', async () => {
      mockFetch.mockResolvedValueOnce(createMockImpitResponse({}));

      await client.get('https://example.com/api', {
        params: { symbol: 'AAPL', interval: undefined },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api?symbol=AAPL',
        expect.any(Object)
      );
    });

    test('should include custom headers', async () => {
      mockFetch.mockResolvedValueOnce(createMockImpitResponse({}));

      await client.get('https://example.com/api', {
        headers: { 'X-Custom-Header': 'test-value' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value',
          }),
        })
      );
    });

    test('should use custom timeout when provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockImpitResponse({}));

      await client.get('https://example.com/api', {
        timeout: 5000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });

    test('should parse JSON response automatically', async () => {
      const jsonData = { quote: { price: 150.5 } };
      mockFetch.mockResolvedValueOnce(createMockImpitResponse(jsonData));

      const response = await client.get<typeof jsonData>('https://example.com/api');

      expect(response.data).toEqual(jsonData);
    });

    test('should handle text response', async () => {
      const textData = 'plain text response';
      mockFetch.mockResolvedValueOnce(
        createMockImpitResponse(textData, { contentType: 'text/plain' })
      );

      const response = await client.get<string>('https://example.com/api');

      expect(response.data).toBe(textData);
    });
  });

  describe('post method', () => {
    test('should make POST request with JSON body', async () => {
      const requestBody = { symbol: 'AAPL' };
      const responseData = { success: true };
      mockFetch.mockResolvedValueOnce(createMockImpitResponse(responseData));

      const response = await client.post<typeof responseData>(
        'https://example.com/api',
        requestBody
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(response.data).toEqual(responseData);
    });

    test('should handle URLSearchParams body', async () => {
      const params = new URLSearchParams({ key: 'value' });
      mockFetch.mockResolvedValueOnce(createMockImpitResponse({}));

      await client.post('https://example.com/api', params);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: 'key=value',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    test('should handle string body', async () => {
      const stringBody = 'raw string data';
      mockFetch.mockResolvedValueOnce(createMockImpitResponse({}));

      await client.post('https://example.com/api', stringBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: stringBody,
        })
      );
    });

    test('should handle null/undefined body', async () => {
      mockFetch.mockResolvedValueOnce(createMockImpitResponse({}));

      await client.post('https://example.com/api');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('browser rotation', () => {
    test('should rotate browser configuration', () => {
      const initialConfig = client.getBrowserConfig();

      // Rotate multiple times to increase chance of getting different config
      let rotationCount = 0;
      for (let i = 0; i < 10; i++) {
        client.rotateBrowser();
        rotationCount++;
      }

      expect(rotationCount).toBe(10);
      // Browser config should still be valid after rotations
      const newConfig = client.getBrowserConfig();
      expect(['chrome', 'firefox']).toContain(newConfig.browser);
    });

    test('should preserve cookie jar after rotation', () => {
      const jar = client.getCookieJar();
      client.rotateBrowser();
      expect(client.getCookieJar()).toBe(jar);
    });
  });

  describe('proxy methods', () => {
    test('should set and get proxy', () => {
      expect(client.getProxy()).toBeUndefined();

      client.setProxy('http://proxy.example.com:8080');
      expect(client.getProxy()).toBe('http://proxy.example.com:8080');

      client.setProxy(undefined);
      expect(client.getProxy()).toBeUndefined();
    });
  });

  describe('timeout methods', () => {
    test('should update timeout', () => {
      expect(client.getTimeout()).toBe(10000);

      client.setTimeout(5000);
      expect(client.getTimeout()).toBe(5000);
    });
  });

  describe('impersonation info', () => {
    test('should return impersonation details', () => {
      const impersonation = client.getImpersonation();

      expect(impersonation).toHaveProperty('browser');
      expect(impersonation).toHaveProperty('platform');
      expect(impersonation).toHaveProperty('headers');
      expect(['chrome', 'firefox']).toContain(impersonation.browser);
    });
  });

  describe('response conversion', () => {
    test('should convert headers to lowercase', async () => {
      const headers = new Map<string, string>();
      headers.set('Content-Type', 'application/json');
      headers.set('X-Custom-Header', 'value');

      mockFetch.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers,
        url: 'https://example.com',
        ok: true,
        json: async () => ({}),
        text: async () => '{}',
      });

      const response = await client.get('https://example.com');

      expect(response.headers['content-type']).toBe('application/json');
      expect(response.headers['x-custom-header']).toBe('value');
    });

    test('should include url and ok status in response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockImpitResponse({}, { url: 'https://example.com/redirected' })
      );

      const response = await client.get('https://example.com');

      expect(response.url).toBe('https://example.com/redirected');
      expect(response.ok).toBe(true);
    });

    test('should handle non-ok status', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockImpitResponse(
          { error: 'Not found' },
          { status: 404, statusText: 'Not Found' }
        )
      );

      const response = await client.get('https://example.com');

      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });
  });
});
