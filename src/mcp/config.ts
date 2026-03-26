/**
 * MCP Server Configuration
 *
 * Reads configuration from environment variables for HTTP client,
 * proxy rotation, retry settings, and other options.
 */

import { SessionOptions, HttpClientType } from '../types';

/**
 * Environment variable names for MCP configuration
 */
export const ENV_VARS = {
  // HTTP client configuration
  HTTP_CLIENT: 'YFINANCE_HTTP_CLIENT',
  HTTP3: 'YFINANCE_HTTP3',
  IGNORE_TLS_ERRORS: 'YFINANCE_IGNORE_TLS_ERRORS',

  // Proxy configuration
  PROXY_LIST: 'YFINANCE_PROXY_LIST',
  PROXY_MAX_FAILURES: 'YFINANCE_PROXY_MAX_FAILURES',
  PROXY_COOLDOWN_MS: 'YFINANCE_PROXY_COOLDOWN_MS',

  // Retry configuration
  RETRY_ENABLED: 'YFINANCE_RETRY_ENABLED',
  RETRY_MAX_RETRIES: 'YFINANCE_RETRY_MAX_RETRIES',
  RETRY_INITIAL_DELAY: 'YFINANCE_RETRY_INITIAL_DELAY',
  RETRY_MAX_DELAY: 'YFINANCE_RETRY_MAX_DELAY',

  // Session configuration
  TIMEOUT: 'YFINANCE_TIMEOUT',
} as const;

/**
 * Get session options from environment variables
 */
export function getSessionOptionsFromEnv(): SessionOptions {
  const options: SessionOptions = {};

  // HTTP client configuration
  const httpClient = process.env[ENV_VARS.HTTP_CLIENT]?.toLowerCase();
  if (httpClient === 'impit' || httpClient === 'axios') {
    options.httpClient = httpClient as HttpClientType;
  }

  // HTTP/3 support (impit only)
  if (parseBoolEnv(ENV_VARS.HTTP3, false)) {
    options.http3 = true;
  }

  // TLS error handling
  if (parseBoolEnv(ENV_VARS.IGNORE_TLS_ERRORS, false)) {
    options.ignoreTlsErrors = true;
  }

  // Proxy rotation configuration
  const proxyList = process.env[ENV_VARS.PROXY_LIST];
  if (proxyList) {
    options.proxyRotation = {
      proxyList,
      maxFailures: parseIntEnv(ENV_VARS.PROXY_MAX_FAILURES, 3),
      cooldownMs: parseIntEnv(ENV_VARS.PROXY_COOLDOWN_MS, 300000),
    };
  }

  // Retry configuration - use more aggressive defaults for MCP server
  const retryEnabled = process.env[ENV_VARS.RETRY_ENABLED];
  if (retryEnabled !== undefined || process.env[ENV_VARS.RETRY_MAX_RETRIES]) {
    options.retry = {
      enabled: parseBoolEnv(ENV_VARS.RETRY_ENABLED, true),
      maxRetries: parseIntEnv(ENV_VARS.RETRY_MAX_RETRIES, 5),
      initialDelay: parseIntEnv(ENV_VARS.RETRY_INITIAL_DELAY, 2000),
      maxDelay: parseIntEnv(ENV_VARS.RETRY_MAX_DELAY, 60000),
    };
  } else {
    // Default retry config for MCP server (more aggressive than library defaults)
    options.retry = {
      enabled: true,
      maxRetries: 5,
      initialDelay: 2000,
      maxDelay: 60000,
    };
  }

  // Timeout configuration
  const timeout = parseIntEnv(ENV_VARS.TIMEOUT);
  if (timeout) {
    options.timeout = timeout;
  }

  return options;
}

/**
 * Parse integer from environment variable
 */
function parseIntEnv(key: string, defaultValue?: number): number | undefined {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean from environment variable
 */
function parseBoolEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]?.toLowerCase();
  if (value === undefined) {
    return defaultValue;
  }
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Cached session options (computed once at startup)
 */
let cachedOptions: SessionOptions | null = null;

/**
 * Get cached session options (singleton pattern for MCP server)
 */
export function getMcpSessionOptions(): SessionOptions {
  if (cachedOptions === null) {
    cachedOptions = getSessionOptionsFromEnv();

    // Log configuration at startup (to stderr to not interfere with MCP protocol)
    const httpClient = cachedOptions.httpClient || 'impit';
    console.error(`[yfinance-mcp] HTTP client: ${httpClient}`);

    if (cachedOptions.http3) {
      console.error(`[yfinance-mcp] HTTP/3 enabled`);
    }

    if (cachedOptions.proxyRotation?.proxyList) {
      const proxyCount = cachedOptions.proxyRotation.proxyList
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#')).length;
      console.error(`[yfinance-mcp] Proxy rotation enabled with ${proxyCount} proxies`);
    }

    console.error(
      `[yfinance-mcp] Retry config: ${cachedOptions.retry?.maxRetries || 5} retries, ` +
        `${cachedOptions.retry?.initialDelay || 2000}ms initial delay`
    );
  }
  return cachedOptions;
}
