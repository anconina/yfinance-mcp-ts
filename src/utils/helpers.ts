/**
 * Utility helper functions for yfinance-mcp-ts
 */

/**
 * Flatten nested arrays into a single array
 */
export function flattenList<T>(lists: T[][]): T[] {
  return lists.flat();
}

/**
 * Convert string or array to array of symbols
 * Handles space-separated, comma-separated, and array inputs
 */
export function convertToList(symbols: string | string[], commaSplit = false): string[] {
  if (Array.isArray(symbols)) {
    return symbols;
  }

  if (typeof symbols === 'string') {
    if (commaSplit) {
      return symbols.split(',').map((s) => s.trim()).filter(Boolean);
    }
    // Match word characters, dots, hyphens, equals, carets, ampersands
    const matches = symbols.match(/[\w\-.=^&]+/g);
    return matches ?? [];
  }

  return [];
}

/**
 * Convert date to Unix timestamp (seconds)
 * @param date - Date string, Date object, or null
 * @param start - If true and date is null, returns earliest date (1942); otherwise returns now
 */
export function convertToTimestamp(date?: string | Date | null, start = true): number {
  if (date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return Math.floor(d.getTime() / 1000);
  }

  if (start) {
    // Default start date: January 1, 1942
    return Math.floor(new Date('1942-01-01').getTime() / 1000);
  }

  // Default end date: now
  return Math.floor(Date.now() / 1000);
}

/**
 * Format Unix timestamp to datetime string (YYYY-MM-DD HH:MM:SS)
 */
export function formatTimestamp(timestamp: number): string {
  try {
    const date = new Date(timestamp * 1000);
    return date.toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return String(timestamp);
  }
}

/**
 * Format Unix timestamp to date string (YYYY-MM-DD)
 */
export function formatDate(timestamp: number): string {
  try {
    const date = new Date(timestamp * 1000);
    return date.toISOString().slice(0, 10);
  } catch {
    return String(timestamp);
  }
}

/**
 * Check if a value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  const cloned: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }
  return cloned as T;
}

/**
 * Chunk an array into smaller arrays of specified size
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Add random jitter to a delay value to prevent thundering herd
 * @param delay - Base delay in milliseconds
 * @param jitterFactor - Factor for jitter (0-1), default 0.3 means ±30%
 */
export function addJitter(delay: number, jitterFactor = 0.3): number {
  const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(delay + jitter));
}

/**
 * Options for retry with exponential backoff
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  factor?: number;
  /** Add random jitter to delays to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Jitter factor 0-1 (default: 0.3 means ±30%) */
  jitterFactor?: number;
  /** Function to determine if an error is retryable (default: all errors) */
  isRetryable?: (error: unknown) => boolean;
  /** Callback fired before each retry attempt */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  /**
   * Function to get a custom delay for a specific error (e.g., from Retry-After header)
   * If this returns a non-null value, it overrides the calculated exponential backoff delay
   * The returned value is still subject to maxDelay capping
   */
  getDelayFromError?: (error: unknown) => number | null;
}

/**
 * Extract the Retry-After value from an error response in milliseconds
 * The Retry-After header can be either a number of seconds or an HTTP date
 * @param error - The error object (typically an Axios error)
 * @returns The retry delay in milliseconds, or null if not found
 */
export function getRetryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;

  const err = error as {
    response?: {
      headers?: Record<string, string | string[] | undefined>;
    };
  };

  // Try to get Retry-After header (case-insensitive)
  const headers = err.response?.headers;
  if (!headers) return null;

  // Headers might be lowercase or mixed case depending on the HTTP library
  const retryAfter =
    headers['retry-after'] ??
    headers['Retry-After'] ??
    headers['RETRY-AFTER'];

  if (!retryAfter) return null;

  // Handle array format (some HTTP libraries return headers as arrays)
  const value = Array.isArray(retryAfter) ? retryAfter[0] : retryAfter;
  if (!value) return null;

  // Try to parse as number of seconds
  const seconds = parseInt(value, 10);
  if (!isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  // Try to parse as HTTP date (e.g., "Wed, 21 Oct 2025 07:28:00 GMT")
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    const delay = date.getTime() - Date.now();
    return Math.max(0, delay);
  }

  return null;
}

/**
 * Check if an error is a rate limit error (HTTP 429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as Record<string, unknown>;

  // Check axios error response
  if (err.response && typeof err.response === 'object') {
    const response = err.response as Record<string, unknown>;
    if (response.status === 429) return true;
  }

  // Check error message
  if (typeof err.message === 'string') {
    const message = err.message.toLowerCase();
    if (message.includes('429') || message.includes('too many requests') || message.includes('rate limit')) {
      return true;
    }
  }

  // Check error code
  if (err.code === 'ERR_TOO_MANY_REQUESTS' || err.status === 429) {
    return true;
  }

  return false;
}

/**
 * Check if an error is a retryable network/transient error
 */
export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as Record<string, unknown>;

  // Rate limit errors are retryable
  if (isRateLimitError(error)) return true;

  // Check axios error response status codes
  if (err.response && typeof err.response === 'object') {
    const response = err.response as Record<string, unknown>;
    const status = response.status as number;

    // Retry on 5xx server errors and specific 4xx errors
    if (status >= 500 && status < 600) return true;
    if (status === 408) return true; // Request Timeout
    if (status === 429) return true; // Too Many Requests
  }

  // Check for network errors
  if (typeof err.code === 'string') {
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
      'EPIPE',
      'ERR_NETWORK',
    ];
    if (retryableCodes.includes(err.code)) return true;
  }

  // Check error message for transient issues
  if (typeof err.message === 'string') {
    const message = err.message.toLowerCase();
    const retryableMessages = [
      'network error',
      'timeout',
      'socket hang up',
      'econnreset',
      'econnrefused',
    ];
    if (retryableMessages.some((m) => message.includes(m))) return true;
  }

  return false;
}

/**
 * Check if an error is an invalid crumb error
 */
export function isInvalidCrumbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as Record<string, unknown>;

  // Check error message
  if (typeof err.message === 'string') {
    const message = err.message.toLowerCase();
    if (message.includes('invalid crumb') || message.includes('unauthorized')) {
      return true;
    }
  }

  // Check axios response data for Yahoo-specific error
  if (err.response && typeof err.response === 'object') {
    const response = err.response as Record<string, unknown>;
    if (response.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>;
      const finance = data.finance as Record<string, unknown> | undefined;
      if (finance?.error && typeof finance.error === 'object') {
        const financeError = finance.error as Record<string, unknown>;
        if (financeError.code === 'Unauthorized' || financeError.description?.toString().includes('crumb')) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the function if successful
 * @throws The last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetchData(),
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     isRetryable: isRateLimitError,
 *     onRetry: (err, attempt, delay) => console.log(`Retry ${attempt} in ${delay}ms`)
 *   }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    jitter = true,
    jitterFactor = 0.3,
    isRetryable = isRetryableError,
    onRetry,
    getDelayFromError,
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry this error
      if (attempt < maxRetries && isRetryable(error)) {
        // Check if we have a custom delay from the error (e.g., Retry-After header)
        let baseDelay = delay;
        const errorDelay = getDelayFromError?.(error);
        if (errorDelay !== null && errorDelay !== undefined && errorDelay > 0) {
          // Use the error-specified delay, but cap it at maxDelay
          baseDelay = Math.min(errorDelay, maxDelay);
        }

        // Calculate final delay with optional jitter
        const actualDelay = jitter ? addJitter(baseDelay, jitterFactor) : baseDelay;

        // Fire onRetry callback if provided
        if (onRetry) {
          onRetry(error, attempt + 1, actualDelay);
        }

        await sleep(actualDelay);

        // Exponential backoff for next iteration (only if we didn't use error-specified delay)
        if (errorDelay === null || errorDelay === undefined) {
          delay = Math.min(delay * factor, maxDelay);
        } else {
          // If we used error-specified delay, still increase for next attempt
          // in case the server sends another 429 without Retry-After
          delay = Math.min(baseDelay * factor, maxDelay);
        }
      } else if (attempt < maxRetries && !isRetryable(error)) {
        // Non-retryable error, throw immediately
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Create a progress tracker (simple console-based)
 */
export function createProgressTracker(total: number, label = 'Progress') {
  let current = 0;

  return {
    increment(amount = 1): void {
      current += amount;
      const percent = Math.round((current / total) * 100);
      process.stdout.write(`\r${label}: ${current}/${total} (${percent}%)`);
    },
    complete(): void {
      process.stdout.write(`\r${label}: ${total}/${total} (100%)\n`);
    },
  };
}

/**
 * Parse a boolean string value
 */
export function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

/**
 * Convert object keys to lowercase
 */
export function keysToLowerCase<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key.toLowerCase()] = obj[key];
    }
  }
  return result as T;
}

/**
 * Remove null and undefined values from an object
 */
export function removeNullish<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== null &&
      obj[key] !== undefined
    ) {
      result[key as keyof T] = obj[key] as T[keyof T];
    }
  }
  return result;
}

/**
 * Convert boolean values to lowercase strings in an object
 * (Yahoo Finance API expects 'true'/'false' instead of true/false)
 */
export function stringifyBooleans<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      result[key] = typeof value === 'boolean' ? String(value).toLowerCase() : value;
    }
  }
  return result as T;
}
