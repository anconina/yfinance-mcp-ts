/**
 * Extended Helper Tests for Coverage
 */

import {
  convertToList,
  convertToTimestamp,
  formatTimestamp,
  formatDate,
  flattenList,
  chunkArray,
  stringifyBooleans,
  isPlainObject,
  deepClone,
  sleep,
  retry,
  createProgressTracker,
  parseBoolean,
  keysToLowerCase,
  removeNullish,
} from '../src/utils/helpers';

describe('Helpers - Extended Coverage', () => {
  describe('convertToList edge cases', () => {
    test('should handle non-string, non-array input', () => {
      expect(convertToList(null as unknown as string)).toEqual([]);
      expect(convertToList(undefined as unknown as string)).toEqual([]);
    });

    test('should handle object input', () => {
      expect(convertToList({} as unknown as string)).toEqual([]);
    });

    test('should handle number input', () => {
      expect(convertToList(123 as unknown as string)).toEqual([]);
    });
  });

  describe('formatTimestamp edge cases', () => {
    test('should handle very large timestamp', () => {
      const result = formatTimestamp(9999999999);
      expect(typeof result).toBe('string');
    });

    test('should handle negative timestamp', () => {
      const result = formatTimestamp(-1000000);
      expect(typeof result).toBe('string');
    });

    test('should handle zero timestamp', () => {
      const result = formatTimestamp(0);
      expect(result).toContain('1970');
    });
  });

  describe('formatDate edge cases', () => {
    test('should handle very large timestamp', () => {
      const result = formatDate(9999999999);
      expect(typeof result).toBe('string');
    });

    test('should handle negative timestamp', () => {
      const result = formatDate(-1000000);
      expect(typeof result).toBe('string');
    });
  });

  describe('retry function', () => {
    test('should succeed on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retry(fn, { maxRetries: 3, initialDelay: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('success');

      const result = await retry(fn, { maxRetries: 3, initialDelay: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));

      await expect(retry(fn, { maxRetries: 2, initialDelay: 10 })).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should use exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const start = Date.now();
      await retry(fn, { maxRetries: 3, initialDelay: 20, factor: 2 });
      const elapsed = Date.now() - start;

      // Should have waited at least initialDelay + initialDelay*factor
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    test('should respect maxDelay', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      await retry(fn, { maxRetries: 1, initialDelay: 10, maxDelay: 10, factor: 10 });
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('createProgressTracker', () => {
    test('should create tracker', () => {
      const tracker = createProgressTracker(10, 'Test');
      expect(tracker).toBeDefined();
      expect(typeof tracker.increment).toBe('function');
      expect(typeof tracker.complete).toBe('function');
    });

    test('should increment progress', () => {
      const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
      const tracker = createProgressTracker(10, 'Test');

      tracker.increment();
      expect(mockWrite).toHaveBeenCalled();

      mockWrite.mockRestore();
    });

    test('should complete progress', () => {
      const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
      const tracker = createProgressTracker(10, 'Test');

      tracker.complete();
      expect(mockWrite).toHaveBeenCalled();

      mockWrite.mockRestore();
    });

    test('should increment by custom amount', () => {
      const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
      const tracker = createProgressTracker(10, 'Test');

      tracker.increment(5);
      expect(mockWrite).toHaveBeenCalled();

      mockWrite.mockRestore();
    });
  });

  describe('deepClone extended', () => {
    test('should handle undefined', () => {
      expect(deepClone(undefined)).toBe(undefined);
    });

    test('should handle boolean', () => {
      expect(deepClone(true)).toBe(true);
      expect(deepClone(false)).toBe(false);
    });

    test('should handle objects with special properties', () => {
      const obj = { timestamp: 1704067200, name: 'test' };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    test('should handle array of objects', () => {
      const arr = [{ a: 1 }, { b: 2 }];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned[0]).not.toBe(arr[0]);
    });
  });

  describe('isPlainObject extended', () => {
    test('should handle undefined', () => {
      expect(isPlainObject(undefined)).toBe(false);
    });

    test('should handle function', () => {
      expect(isPlainObject(() => {})).toBe(false);
    });

    test('should handle Date', () => {
      expect(isPlainObject(new Date())).toBe(false);
    });

    test('should handle RegExp', () => {
      expect(isPlainObject(/test/)).toBe(false);
    });
  });

  describe('parseBoolean extended', () => {
    test('should handle null', () => {
      expect(parseBoolean(null)).toBe(false);
    });

    test('should handle undefined', () => {
      expect(parseBoolean(undefined)).toBe(false);
    });

    test('should handle object', () => {
      expect(parseBoolean({})).toBe(true);
      expect(parseBoolean({ a: 1 })).toBe(true);
    });
  });

  describe('stringifyBooleans extended', () => {
    test('should handle undefined values', () => {
      const result = stringifyBooleans({ a: undefined, b: true });
      expect(result.a).toBe(undefined);
      expect(result.b).toBe('true');
    });

    test('should handle null values', () => {
      const result = stringifyBooleans({ a: null, b: false });
      expect(result.a).toBe(null);
      expect(result.b).toBe('false');
    });
  });

  describe('chunkArray extended', () => {
    test('should handle size larger than array', () => {
      const result = chunkArray([1, 2], 100);
      expect(result).toEqual([[1, 2]]);
    });

    test('should handle size of 1', () => {
      const result = chunkArray([1, 2, 3], 1);
      expect(result).toEqual([[1], [2], [3]]);
    });
  });

  describe('flattenList extended', () => {
    test('should handle arrays with empty arrays', () => {
      const result = flattenList([[1], [], [2]]);
      expect(result).toEqual([1, 2]);
    });

    test('should handle single nested array', () => {
      const result = flattenList([[1, 2, 3]]);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('keysToLowerCase extended', () => {
    test('should handle mixed case keys', () => {
      const result = keysToLowerCase({ ABC: 1, def: 2, GhI: 3 });
      expect(result).toEqual({ abc: 1, def: 2, ghi: 3 });
    });

    test('should preserve values of different types', () => {
      const result = keysToLowerCase({ KEY: [1, 2], KEY2: { nested: true } });
      expect((result as Record<string, unknown>)['key']).toEqual([1, 2]);
      expect((result as Record<string, unknown>)['key2']).toEqual({ nested: true });
    });
  });

  describe('removeNullish extended', () => {
    test('should handle all nullish object', () => {
      const result = removeNullish({ a: null, b: undefined });
      expect(result).toEqual({});
    });

    test('should preserve nested objects', () => {
      const result = removeNullish({ a: { nested: null }, b: null });
      expect(result.a).toEqual({ nested: null }); // nested nulls are preserved
    });
  });
});
