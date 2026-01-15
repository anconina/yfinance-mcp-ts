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
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 30000, factor = 2 } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * factor, maxDelay);
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
