/**
 * Tests for MCP configuration
 */

import { getSessionOptionsFromEnv, getMcpSessionOptions, ENV_VARS } from '../src/mcp/config';

describe('MCP Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset cached options by clearing the module cache
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getSessionOptionsFromEnv', () => {
    test('should return empty options when no env vars set', async () => {
      delete process.env[ENV_VARS.PROXY_LIST];
      delete process.env[ENV_VARS.RETRY_ENABLED];
      delete process.env[ENV_VARS.TIMEOUT];

      const { getSessionOptionsFromEnv: freshFn } = await import('../src/mcp/config');
      const options = freshFn();
      expect(options).toEqual({});
    });

    test('should parse proxy configuration', async () => {
      process.env[ENV_VARS.PROXY_LIST] = 'http://proxy1.com:8080\nhttp://proxy2.com:8080';
      process.env[ENV_VARS.PROXY_MAX_FAILURES] = '5';
      process.env[ENV_VARS.PROXY_COOLDOWN_MS] = '60000';

      const { getSessionOptionsFromEnv: freshFn } = await import('../src/mcp/config');
      const options = freshFn();

      expect(options.proxyRotation).toBeDefined();
      expect(options.proxyRotation?.proxyList).toBe('http://proxy1.com:8080\nhttp://proxy2.com:8080');
      expect(options.proxyRotation?.maxFailures).toBe(5);
      expect(options.proxyRotation?.cooldownMs).toBe(60000);
    });

    test('should use default values for proxy config when not specified', async () => {
      process.env[ENV_VARS.PROXY_LIST] = 'http://proxy.com:8080';
      delete process.env[ENV_VARS.PROXY_MAX_FAILURES];
      delete process.env[ENV_VARS.PROXY_COOLDOWN_MS];

      const { getSessionOptionsFromEnv: freshFn } = await import('../src/mcp/config');
      const options = freshFn();

      expect(options.proxyRotation?.maxFailures).toBe(3);
      expect(options.proxyRotation?.cooldownMs).toBe(300000);
    });

    test('should parse retry configuration when enabled', async () => {
      process.env[ENV_VARS.RETRY_ENABLED] = 'true';
      process.env[ENV_VARS.RETRY_MAX_RETRIES] = '5';
      process.env[ENV_VARS.RETRY_INITIAL_DELAY] = '2000';
      process.env[ENV_VARS.RETRY_MAX_DELAY] = '60000';

      const { getSessionOptionsFromEnv: freshFn } = await import('../src/mcp/config');
      const options = freshFn();

      expect(options.retry).toBeDefined();
      expect(options.retry?.enabled).toBe(true);
      expect(options.retry?.maxRetries).toBe(5);
      expect(options.retry?.initialDelay).toBe(2000);
      expect(options.retry?.maxDelay).toBe(60000);
    });

    test('should parse retry configuration when disabled', async () => {
      process.env[ENV_VARS.RETRY_ENABLED] = 'false';

      const { getSessionOptionsFromEnv: freshFn } = await import('../src/mcp/config');
      const options = freshFn();

      expect(options.retry?.enabled).toBe(false);
    });

    test('should enable retry config when only max retries is set', async () => {
      delete process.env[ENV_VARS.RETRY_ENABLED];
      process.env[ENV_VARS.RETRY_MAX_RETRIES] = '2';

      const { getSessionOptionsFromEnv: freshFn } = await import('../src/mcp/config');
      const options = freshFn();

      expect(options.retry).toBeDefined();
      expect(options.retry?.enabled).toBe(true);
      expect(options.retry?.maxRetries).toBe(2);
    });

    test('should parse timeout configuration', async () => {
      process.env[ENV_VARS.TIMEOUT] = '5000';

      const { getSessionOptionsFromEnv: freshFn } = await import('../src/mcp/config');
      const options = freshFn();

      expect(options.timeout).toBe(5000);
    });

    test('should handle invalid integer values', async () => {
      process.env[ENV_VARS.PROXY_LIST] = 'http://proxy.com:8080';
      process.env[ENV_VARS.PROXY_MAX_FAILURES] = 'not-a-number';

      const { getSessionOptionsFromEnv: freshFn } = await import('../src/mcp/config');
      const options = freshFn();

      expect(options.proxyRotation?.maxFailures).toBe(3); // default value
    });

    test('should handle boolean env vars with different formats', async () => {
      // Test '1' as true
      process.env[ENV_VARS.RETRY_ENABLED] = '1';
      let { getSessionOptionsFromEnv: freshFn1 } = await import('../src/mcp/config');
      let options = freshFn1();
      expect(options.retry?.enabled).toBe(true);

      // Reset module
      jest.resetModules();

      // Test 'yes' as true
      process.env[ENV_VARS.RETRY_ENABLED] = 'yes';
      const { getSessionOptionsFromEnv: freshFn2 } = await import('../src/mcp/config');
      options = freshFn2();
      expect(options.retry?.enabled).toBe(true);

      // Reset module
      jest.resetModules();

      // Test 'no' as false
      process.env[ENV_VARS.RETRY_ENABLED] = 'no';
      const { getSessionOptionsFromEnv: freshFn3 } = await import('../src/mcp/config');
      options = freshFn3();
      expect(options.retry?.enabled).toBe(false);
    });
  });

  describe('getMcpSessionOptions', () => {
    test('should cache options', async () => {
      process.env[ENV_VARS.PROXY_LIST] = 'http://proxy.com:8080';
      const mockStderr = jest.spyOn(console, 'error').mockImplementation();

      const { getMcpSessionOptions: freshFn } = await import('../src/mcp/config');

      const options1 = freshFn();
      const options2 = freshFn();

      expect(options1).toBe(options2); // Same reference (cached)
      expect(mockStderr).toHaveBeenCalledTimes(1); // Only logged once

      mockStderr.mockRestore();
    });

    test('should log proxy count on first call', async () => {
      process.env[ENV_VARS.PROXY_LIST] = 'http://proxy1.com:8080\nhttp://proxy2.com:8080\n# comment';
      const mockStderr = jest.spyOn(console, 'error').mockImplementation();

      const { getMcpSessionOptions: freshFn } = await import('../src/mcp/config');
      freshFn();

      expect(mockStderr).toHaveBeenCalledWith(expect.stringContaining('2 proxies'));

      mockStderr.mockRestore();
    });

    test('should not log when no proxies configured', async () => {
      delete process.env[ENV_VARS.PROXY_LIST];
      const mockStderr = jest.spyOn(console, 'error').mockImplementation();

      const { getMcpSessionOptions: freshFn } = await import('../src/mcp/config');
      freshFn();

      expect(mockStderr).not.toHaveBeenCalled();

      mockStderr.mockRestore();
    });
  });

  describe('ENV_VARS', () => {
    test('should have all expected env var names', () => {
      expect(ENV_VARS.PROXY_LIST).toBe('YFINANCE_PROXY_LIST');
      expect(ENV_VARS.PROXY_MAX_FAILURES).toBe('YFINANCE_PROXY_MAX_FAILURES');
      expect(ENV_VARS.PROXY_COOLDOWN_MS).toBe('YFINANCE_PROXY_COOLDOWN_MS');
      expect(ENV_VARS.RETRY_ENABLED).toBe('YFINANCE_RETRY_ENABLED');
      expect(ENV_VARS.RETRY_MAX_RETRIES).toBe('YFINANCE_RETRY_MAX_RETRIES');
      expect(ENV_VARS.RETRY_INITIAL_DELAY).toBe('YFINANCE_RETRY_INITIAL_DELAY');
      expect(ENV_VARS.RETRY_MAX_DELAY).toBe('YFINANCE_RETRY_MAX_DELAY');
      expect(ENV_VARS.TIMEOUT).toBe('YFINANCE_TIMEOUT');
    });
  });
});
