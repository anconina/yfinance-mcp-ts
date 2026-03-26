/**
 * Performance optimization utilities for yfinance-mcp-ts
 *
 * Features:
 * - Singleton ImpitClient for connection reuse
 * - Request batching with concurrency control
 * - Request throttling to prevent rate limits
 * - Response caching for repeated requests
 */

import { ImpitClient } from '../core/ImpitClient';
import { YFinanceImpitOptions } from '../types/impit';
import { sleep, addJitter } from './helpers';

/**
 * Singleton ImpitClient instance for connection reuse.
 * impit handles HTTP/2 connection pooling internally,
 * but using a singleton ensures we reuse the same pool.
 */
let globalImpitClient: ImpitClient | null = null;
let globalClientOptions: YFinanceImpitOptions | null = null;

/**
 * Get or create a global ImpitClient instance.
 * This ensures connection reuse across requests for better performance.
 *
 * @param options - Client options (only used on first call)
 * @returns The singleton ImpitClient instance
 *
 * @example
 * ```typescript
 * const client = getGlobalImpitClient({ timeout: 30000 });
 * const response = await client.get('https://example.com');
 * ```
 */
export function getGlobalImpitClient(options?: YFinanceImpitOptions): ImpitClient {
  if (!globalImpitClient) {
    globalClientOptions = options || {};
    globalImpitClient = new ImpitClient(globalClientOptions);
  }
  return globalImpitClient;
}

/**
 * Reset the global ImpitClient instance.
 * Useful for testing or when you need to change client options.
 */
export function resetGlobalImpitClient(): void {
  globalImpitClient = null;
  globalClientOptions = null;
}

/**
 * Check if a global ImpitClient exists.
 */
export function hasGlobalImpitClient(): boolean {
  return globalImpitClient !== null;
}

/**
 * Options for batch request execution
 */
export interface BatchRequestOptions {
  /** Maximum concurrent requests (default: 5) */
  concurrency?: number;
  /** Delay between batches in milliseconds (default: 100) */
  batchDelay?: number;
  /** Add jitter to delays to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number) => void;
  /** Callback when a single request fails */
  onError?: (error: Error, index: number) => void;
}

/**
 * Execute multiple async operations with controlled concurrency.
 * Useful for batch API requests to avoid overwhelming the server.
 *
 * @param tasks - Array of async functions to execute
 * @param options - Batch execution options
 * @returns Array of results (or errors if individual tasks fail)
 *
 * @example
 * ```typescript
 * const symbols = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'META'];
 * const tasks = symbols.map(symbol => () => fetchQuote(symbol));
 * const results = await batchExecute(tasks, { concurrency: 3 });
 * ```
 */
export async function batchExecute<T>(
  tasks: Array<() => Promise<T>>,
  options: BatchRequestOptions = {}
): Promise<Array<T | Error>> {
  const {
    concurrency = 5,
    batchDelay = 100,
    jitter = true,
    onProgress,
    onError,
  } = options;

  const results: Array<T | Error> = new Array(tasks.length);
  let completed = 0;

  // Process tasks in batches
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchStartIndex = i;

    // Execute batch concurrently
    const batchPromises = batch.map(async (task, batchIndex) => {
      const taskIndex = batchStartIndex + batchIndex;
      try {
        const result = await task();
        results[taskIndex] = result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results[taskIndex] = err;
        if (onError) {
          onError(err, taskIndex);
        }
      }
      completed++;
      if (onProgress) {
        onProgress(completed, tasks.length);
      }
    });

    await Promise.all(batchPromises);

    // Delay between batches (except for last batch)
    if (i + concurrency < tasks.length) {
      const delay = jitter ? addJitter(batchDelay) : batchDelay;
      await sleep(delay);
    }
  }

  return results;
}

/**
 * Request throttler for rate limit prevention.
 * Ensures minimum delay between consecutive requests.
 */
export class RequestThrottler {
  private lastRequestTime: number = 0;
  private readonly minDelay: number;
  private readonly jitter: boolean;

  /**
   * Create a new RequestThrottler.
   *
   * @param minDelay - Minimum delay between requests in milliseconds
   * @param jitter - Add random jitter to delays (default: true)
   */
  constructor(minDelay: number = 100, jitter: boolean = true) {
    this.minDelay = minDelay;
    this.jitter = jitter;
  }

  /**
   * Wait until it's safe to make the next request.
   * Call this before each API request.
   */
  async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const targetDelay = this.jitter ? addJitter(this.minDelay) : this.minDelay;

    if (elapsed < targetDelay) {
      await sleep(targetDelay - elapsed);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Reset the throttler state.
   */
  reset(): void {
    this.lastRequestTime = 0;
  }

  /**
   * Get the minimum delay setting.
   */
  getMinDelay(): number {
    return this.minDelay;
  }
}

/**
 * Simple in-memory cache with TTL support.
 * Useful for caching API responses to reduce redundant requests.
 */
export class ResponseCache<T> {
  private cache: Map<string, { value: T; expires: number }> = new Map();
  private readonly defaultTtl: number;

  /**
   * Create a new ResponseCache.
   *
   * @param defaultTtl - Default time-to-live in milliseconds (default: 60000 = 1 minute)
   */
  constructor(defaultTtl: number = 60000) {
    this.defaultTtl = defaultTtl;
  }

  /**
   * Get a cached value if it exists and hasn't expired.
   *
   * @param key - Cache key
   * @returns The cached value, or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time-to-live in milliseconds (optional, uses default if not specified)
   */
  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl ?? this.defaultTtl);
    this.cache.set(key, { value, expires });
  }

  /**
   * Check if a key exists and hasn't expired.
   *
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key from the cache.
   *
   * @param key - Cache key
   * @returns True if the key was deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache (including expired).
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Remove all expired entries from the cache.
   * Call periodically to prevent memory leaks.
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get or set a cached value using a factory function.
   * If the key exists and hasn't expired, returns the cached value.
   * Otherwise, calls the factory function and caches the result.
   *
   * @param key - Cache key
   * @param factory - Async function to generate the value if not cached
   * @param ttl - Time-to-live in milliseconds (optional)
   * @returns The cached or newly generated value
   *
   * @example
   * ```typescript
   * const cache = new ResponseCache<QuoteData>(60000);
   * const quote = await cache.getOrSet('AAPL', () => fetchQuote('AAPL'));
   * ```
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

/**
 * Create a cache key from request parameters.
 * Useful for generating consistent cache keys for API requests.
 *
 * @param url - Request URL
 * @param params - Request parameters
 * @returns A unique cache key string
 */
export function createCacheKey(
  url: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const sortedParams = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
    : '';

  return sortedParams ? `${url}?${sortedParams}` : url;
}
