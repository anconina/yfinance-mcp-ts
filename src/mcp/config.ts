/**
 * MCP Server Configuration
 *
 * Reads configuration from environment variables for proxy rotation,
 * retry settings, and other options.
 */

import { SessionOptions } from '../types';

/**
 * Environment variable names for MCP configuration
 */
export const ENV_VARS = {
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

  // Proxy rotation configuration
  const proxyList = process.env[ENV_VARS.PROXY_LIST];
  if (proxyList) {
    options.proxyRotation = {
      proxyList,
      maxFailures: parseIntEnv(ENV_VARS.PROXY_MAX_FAILURES, 3),
      cooldownMs: parseIntEnv(ENV_VARS.PROXY_COOLDOWN_MS, 300000),
    };
  }

  // Retry configuration
  const retryEnabled = process.env[ENV_VARS.RETRY_ENABLED];
  if (retryEnabled !== undefined || process.env[ENV_VARS.RETRY_MAX_RETRIES]) {
    options.retry = {
      enabled: parseBoolEnv(ENV_VARS.RETRY_ENABLED, true),
      maxRetries: parseIntEnv(ENV_VARS.RETRY_MAX_RETRIES, 3),
      initialDelay: parseIntEnv(ENV_VARS.RETRY_INITIAL_DELAY, 1000),
      maxDelay: parseIntEnv(ENV_VARS.RETRY_MAX_DELAY, 30000),
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
    if (cachedOptions.proxyRotation?.proxyList) {
      const proxyCount = cachedOptions.proxyRotation.proxyList
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#')).length;
      console.error(`[yfinance-mcp] Proxy rotation enabled with ${proxyCount} proxies`);
    }
  }
  return cachedOptions;
}
