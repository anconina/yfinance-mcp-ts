/**
 * Type exports
 */

export * from './api-responses';

// Common types used throughout the library

export interface QueryParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface RequestOptions {
  method?: 'get' | 'post';
  params?: QueryParams;
  data?: unknown;
  headers?: Record<string, string>;
}

export interface RetryConfig {
  /** Enable automatic retry with exponential backoff (default: true) */
  enabled?: boolean;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  factor?: number;
  /** Add random jitter to delays to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Callback fired before each retry attempt */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

/**
 * Proxy configuration for rotating proxies
 */
export interface ProxyRotationConfig {
  /**
   * Newline-separated list of proxy URLs
   * Format: protocol://user:pass@host:port or protocol://host:port
   * Example:
   * http://user:pass@proxy1.example.com:8080
   * socks5://proxy2.example.com:1080
   */
  proxyList?: string;
  /** Maximum consecutive failures before marking proxy as unhealthy (default: 3) */
  maxFailures?: number;
  /** Cooldown period in ms before retrying a failed proxy (default: 300000 = 5 min) */
  cooldownMs?: number;
}

export interface SessionOptions {
  timeout?: number;
  maxWorkers?: number;
  asynchronous?: boolean;
  verify?: boolean;
  /** @deprecated Use proxyRotation for rotating proxies */
  proxies?: Record<string, string>;
  username?: string;
  password?: string;
  /** Retry configuration for handling rate limits and transient errors */
  retry?: RetryConfig;
  /** Proxy rotation configuration for distributing requests across multiple IPs */
  proxyRotation?: ProxyRotationConfig;
}

export interface BaseFinanceOptions extends SessionOptions {
  country?: string;
  formatted?: boolean;
  progress?: boolean;
  username?: string;
  password?: string;
}

export interface TickerOptions extends BaseFinanceOptions {
  validate?: boolean;
}

export interface HistoryOptions {
  period?: string;
  interval?: string;
  start?: string | Date;
  end?: string | Date;
  adjTimezone?: boolean;
  adjOhlc?: boolean;
}

export interface HistoryParams {
  period?: string | null;
  interval?: string;
  start?: string | Date;
  end?: string | Date;
  adjTimezone?: boolean;
  adjOhlc?: boolean;
}

export interface FinancialStatementOptions {
  frequency?: 'a' | 'q' | 'm';
  trailing?: boolean;
}

// Data types returned from API
export type HistoryData = Record<string, unknown>;
export type FinancialsData = Record<string, unknown>;
export type OptionChainData = Record<string, unknown>;
