/**
 * Migration utilities for transitioning from axios to impit HTTP client.
 *
 * This module provides helpers for:
 * - Checking if impit is available and working
 * - Determining the recommended HTTP client for the environment
 * - Graceful fallback to axios when impit is unavailable
 */

import { HttpClientType } from '../types/impit';

/**
 * Check if the impit library is available and functioning.
 *
 * This performs a lightweight check to verify that:
 * 1. The impit native module can be loaded
 * 2. An Impit instance can be created
 *
 * @returns Promise resolving to true if impit is available, false otherwise
 *
 * @example
 * ```typescript
 * if (await isImpitAvailable()) {
 *   console.log('Using impit for browser impersonation');
 * } else {
 *   console.log('Falling back to axios');
 * }
 * ```
 */
export async function isImpitAvailable(): Promise<boolean> {
  try {
    // Dynamically import impit to check availability
    const { Impit } = await import('impit');

    // Try to create an instance (this verifies the native module works)
    const client = new Impit({ browser: 'chrome' });

    // Verify the client has expected methods
    if (typeof client.fetch !== 'function') {
      return false;
    }

    return true;
  } catch (error) {
    // Log at debug level - this is expected on some platforms
    if (process.env.DEBUG || process.env.YFINANCE_DEBUG) {
      console.debug('Impit availability check failed:', (error as Error).message);
    }
    return false;
  }
}

/**
 * Get the recommended HTTP client based on environment and availability.
 *
 * Priority order:
 * 1. Environment variable YFINANCE_HTTP_CLIENT if set
 * 2. impit if available (recommended for rate limit bypass)
 * 3. axios as fallback
 *
 * @returns Promise resolving to the recommended HTTP client type
 *
 * @example
 * ```typescript
 * const httpClient = await getRecommendedHttpClient();
 * const session = new SessionManager({ httpClient });
 * ```
 */
export async function getRecommendedHttpClient(): Promise<HttpClientType> {
  // Check environment variable first
  const envClient = process.env.YFINANCE_HTTP_CLIENT?.toLowerCase();
  if (envClient === 'axios') {
    return 'axios';
  }
  if (envClient === 'impit') {
    // Verify impit is actually available
    if (await isImpitAvailable()) {
      return 'impit';
    }
    console.warn(
      'YFINANCE_HTTP_CLIENT=impit but impit is not available. Falling back to axios.'
    );
    return 'axios';
  }

  // Default: prefer impit if available
  if (await isImpitAvailable()) {
    return 'impit';
  }

  return 'axios';
}

/**
 * Get HTTP client configuration from environment variables.
 *
 * Supported environment variables:
 * - YFINANCE_HTTP_CLIENT: 'impit' or 'axios'
 * - YFINANCE_HTTP3: 'true' to enable HTTP/3 (impit only)
 * - YFINANCE_IGNORE_TLS_ERRORS: 'true' to ignore TLS errors
 * - YFINANCE_REQUEST_TIMEOUT: timeout in milliseconds
 *
 * @returns Configuration object for SessionManager
 */
export function getHttpClientConfigFromEnv(): {
  httpClient?: HttpClientType;
  http3?: boolean;
  ignoreTlsErrors?: boolean;
  timeout?: number;
} {
  const config: {
    httpClient?: HttpClientType;
    http3?: boolean;
    ignoreTlsErrors?: boolean;
    timeout?: number;
  } = {};

  // HTTP client type
  const httpClient = process.env.YFINANCE_HTTP_CLIENT?.toLowerCase();
  if (httpClient === 'impit' || httpClient === 'axios') {
    config.httpClient = httpClient;
  }

  // HTTP/3 support (impit only)
  if (process.env.YFINANCE_HTTP3?.toLowerCase() === 'true') {
    config.http3 = true;
  }

  // TLS error handling
  if (process.env.YFINANCE_IGNORE_TLS_ERRORS?.toLowerCase() === 'true') {
    config.ignoreTlsErrors = true;
  }

  // Request timeout
  const timeout = parseInt(process.env.YFINANCE_REQUEST_TIMEOUT || '', 10);
  if (!isNaN(timeout) && timeout > 0) {
    config.timeout = timeout;
  }

  return config;
}

/**
 * Log migration status and recommendations.
 *
 * Useful for debugging and understanding which HTTP client is being used.
 *
 * @param verbose - If true, log additional details
 */
export async function logMigrationStatus(verbose = false): Promise<void> {
  const impitAvailable = await isImpitAvailable();
  const recommended = await getRecommendedHttpClient();
  const envConfig = getHttpClientConfigFromEnv();

  console.log('=== yfinance-mcp-ts HTTP Client Status ===');
  console.log(`Impit available: ${impitAvailable ? 'Yes' : 'No'}`);
  console.log(`Recommended client: ${recommended}`);

  if (envConfig.httpClient) {
    console.log(`Environment override: ${envConfig.httpClient}`);
  }

  if (verbose) {
    console.log('\nEnvironment configuration:');
    console.log(`  YFINANCE_HTTP_CLIENT: ${process.env.YFINANCE_HTTP_CLIENT || '(not set)'}`);
    console.log(`  YFINANCE_HTTP3: ${process.env.YFINANCE_HTTP3 || '(not set)'}`);
    console.log(
      `  YFINANCE_IGNORE_TLS_ERRORS: ${process.env.YFINANCE_IGNORE_TLS_ERRORS || '(not set)'}`
    );
    console.log(
      `  YFINANCE_REQUEST_TIMEOUT: ${process.env.YFINANCE_REQUEST_TIMEOUT || '(not set)'}`
    );

    if (!impitAvailable) {
      console.log('\nNote: impit requires Node.js 20+ and may not be available on all platforms.');
      console.log('The axios fallback will be used automatically when impit is unavailable.');
    }
  }

  console.log('==========================================');
}

/**
 * Create a SessionManager with automatically detected HTTP client.
 *
 * This is a convenience function that:
 * 1. Detects the best available HTTP client
 * 2. Applies environment variable configuration
 * 3. Creates and returns a configured SessionManager
 *
 * @param options - Additional SessionManager options (merged with auto-detected config)
 * @returns Promise resolving to initialized SessionManager
 *
 * @example
 * ```typescript
 * const session = await createAutoConfiguredSession({
 *   retry: { maxRetries: 5 }
 * });
 * ```
 */
export async function createAutoConfiguredSession(
  options: Record<string, unknown> = {}
): Promise<unknown> {
  // Dynamically import to avoid circular dependencies
  const { SessionManager } = await import('../core/SessionManager');

  const envConfig = getHttpClientConfigFromEnv();
  const httpClient = envConfig.httpClient || (await getRecommendedHttpClient());

  const mergedOptions = {
    ...envConfig,
    httpClient,
    ...options,
  };

  const session = new SessionManager(mergedOptions);
  await session.initialize();

  return session;
}
