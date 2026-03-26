/**
 * TypeScript types for impit library integration.
 *
 * These types extend and complement the types from the impit package
 * to provide better integration with yfinance-mcp-ts.
 */

import type { CookieJar } from 'tough-cookie';
import type { ImpitOptions as BaseImpitOptions, Browser, RequestInit as ImpitRequestInit } from 'impit';

/**
 * HTTP client type selection
 */
export type HttpClientType = 'impit' | 'axios';

/**
 * Extended options for impit integration with yfinance-mcp-ts.
 * Extends the base ImpitOptions with additional configuration.
 */
export interface YFinanceImpitOptions {
  /** Browser to impersonate: 'chrome' (recommended) or 'firefox' */
  browser?: Browser;

  /** Cookie jar for session persistence (tough-cookie compatible) */
  cookieJar?: CookieJar;

  /** Proxy URL (HTTP, HTTPS, SOCKS4, SOCKS5) */
  proxyUrl?: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Enable HTTP/3 support - experimental (default: false) */
  http3?: boolean;

  /** Ignore TLS certificate errors - use with caution (default: false) */
  ignoreTlsErrors?: boolean;

  /** Follow HTTP redirects (default: true) */
  followRedirects?: boolean;

  /** Maximum redirects to follow (default: 10) */
  maxRedirects?: number;

  /** Default headers to include in all requests */
  headers?: Record<string, string>;

  /** Local address to bind to (IP address) */
  localAddress?: string;

  /** Fallback to vanilla (non-impersonated) mode on error (default: false) */
  vanillaFallback?: boolean;
}

/**
 * Request configuration compatible with existing axios patterns.
 * Used for GET requests.
 */
export interface ImpitRequestConfig {
  /** Query parameters to append to URL */
  params?: Record<string, string | number | boolean | undefined>;

  /** Additional headers for this request */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds (overrides default) */
  timeout?: number;

  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
}

/**
 * POST request configuration.
 * Extends ImpitRequestConfig with body data options.
 */
export interface ImpitPostConfig extends ImpitRequestConfig {
  /** Request body data (will be JSON serialized if object) */
  data?: unknown;
}

/**
 * Response wrapper that provides axios-like interface.
 * This allows seamless switching between axios and impit.
 */
export interface ImpitAxiosLikeResponse<T = unknown> {
  /** Response data (parsed JSON or text) */
  data: T;

  /** HTTP status code */
  status: number;

  /** HTTP status text */
  statusText: string;

  /** Response headers as plain object */
  headers: Record<string, string>;

  /** Final URL after redirects */
  url?: string;

  /** Whether response was successful (2xx status) */
  ok?: boolean;
}

/**
 * Error types for impit error classification.
 * Used for retry logic and error handling.
 */
export enum ImpitErrorType {
  /** Request timed out */
  TIMEOUT = 'TIMEOUT',

  /** Network connectivity error */
  NETWORK = 'NETWORK',

  /** TLS/SSL certificate error */
  TLS = 'TLS',

  /** Proxy connection error */
  PROXY = 'PROXY',

  /** HTTP error response (4xx/5xx) */
  HTTP_ERROR = 'HTTP_ERROR',

  /** Rate limited (429) */
  RATE_LIMITED = 'RATE_LIMITED',

  /** Too many redirects */
  TOO_MANY_REDIRECTS = 'TOO_MANY_REDIRECTS',

  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Classify an error from impit into a known error type.
 *
 * @param error - The error to classify
 * @returns The classified error type
 */
export function classifyImpitError(error: Error): ImpitErrorType {
  const message = error.message.toLowerCase();

  if (message.includes('timeout')) {
    return ImpitErrorType.TIMEOUT;
  }
  if (message.includes('tls') || message.includes('ssl') || message.includes('certificate')) {
    return ImpitErrorType.TLS;
  }
  if (message.includes('proxy')) {
    return ImpitErrorType.PROXY;
  }
  if (message.includes('network') || message.includes('connect') || message.includes('econnrefused') || message.includes('econnreset')) {
    return ImpitErrorType.NETWORK;
  }
  if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
    return ImpitErrorType.RATE_LIMITED;
  }
  if (message.includes('redirect')) {
    return ImpitErrorType.TOO_MANY_REDIRECTS;
  }
  if (message.includes('status') || /\b[45]\d{2}\b/.test(message)) {
    return ImpitErrorType.HTTP_ERROR;
  }

  return ImpitErrorType.UNKNOWN;
}

/**
 * Check if an error from impit is retryable.
 *
 * @param error - The error to check
 * @returns True if the error is retryable
 */
export function isRetryableImpitError(error: Error): boolean {
  const errorType = classifyImpitError(error);

  // Retryable error types
  const retryable: ImpitErrorType[] = [
    ImpitErrorType.TIMEOUT,
    ImpitErrorType.NETWORK,
    ImpitErrorType.RATE_LIMITED,
  ];

  return retryable.includes(errorType);
}

/**
 * Check if an impit error is a rate limit error (429).
 *
 * @param error - The error to check
 * @returns True if the error indicates rate limiting
 */
export function isImpitRateLimitError(error: Error): boolean {
  return classifyImpitError(error) === ImpitErrorType.RATE_LIMITED;
}

/**
 * Extract status code from an impit error if available.
 *
 * @param error - The error to extract status from
 * @returns The status code or undefined
 */
export function extractStatusCode(error: Error): number | undefined {
  const match = error.message.match(/\b([45]\d{2})\b/);
  return match ? parseInt(match[1], 10) : undefined;
}
