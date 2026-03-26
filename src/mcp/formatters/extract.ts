/**
 * Yahoo Finance value extraction and null stripping utilities.
 *
 * Yahoo responses contain `{raw, fmt}` pairs for most numeric values.
 * These utilities extract usable values, strip nulls from nested objects,
 * and flatten Yahoo objects into simple key-value maps.
 *
 * Zero imports -- this module has no dependencies.
 */

/**
 * Extract a usable value from Yahoo's `{raw, fmt}` pair or a plain value.
 *
 * @param val - A Yahoo `{raw, fmt}` pair, plain number, string, null, or undefined
 * @param purpose - `'compute'` returns raw numeric values; `'display'` returns formatted strings
 * @returns The extracted value, or `null` if the input is null/undefined or unrecognized
 */
export function extractValue(
  val: unknown,
  purpose: 'display' | 'compute' = 'compute'
): number | string | null {
  if (val === null || val === undefined) return null;

  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if ('raw' in obj) {
      if (purpose === 'display') {
        return 'fmt' in obj && obj.fmt != null
          ? String(obj.fmt)
          : String(obj.raw);
      }
      return obj.raw as number;
    }
    // Object without raw key -- not a Yahoo pair
    return null;
  }

  if (typeof val === 'number') return val;
  if (typeof val === 'string') return val;

  return null;
}

/**
 * Recursively remove null and undefined values from objects and arrays.
 *
 * - For objects: omit keys where the value is null or undefined, recurse into remaining values
 * - For arrays: filter out null/undefined elements, recurse into remaining elements
 * - Primitives pass through unchanged
 *
 * @param obj - The value to strip nulls from
 * @returns A copy with null/undefined values removed at all nesting levels
 */
export function stripNulls<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== null && item !== undefined)
      .map((item) => stripNulls(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== null && value !== undefined) {
        result[key] = stripNulls(value);
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Flatten a Yahoo object where values may be `{raw, fmt}` pairs into a
 * flat key-to-extracted-value map.
 *
 * @param obj - An object with values that are either `{raw, fmt}` pairs or plain values
 * @returns A flat map of keys to extracted values (using `'compute'` purpose)
 */
export function flattenYahooObject(
  obj: Record<string, unknown>
): Record<string, number | string | null> {
  const result: Record<string, number | string | null> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = extractValue(value);
  }
  return result;
}
