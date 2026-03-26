/**
 * Context-aware number formatting utilities.
 *
 * Every financial number has a context that determines its precision:
 * market caps use compact notation (2.78T), prices use 2dp, Greeks use 4dp.
 * Applying a single formatting rule globally destroys analytical value.
 */

import { NumberContext } from './constants';

/**
 * Cached Intl.NumberFormat instance for compact notation.
 * Created at module level (not inside the function) for performance.
 */
const COMPACT_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

/**
 * Format a number according to its financial context.
 *
 * @param value - The number to format, or null/undefined/NaN
 * @param context - The formatting context controlling precision rules
 * @returns Formatted string, or `'-'` for null/undefined/NaN
 */
export function formatCompact(
  value: number | null | undefined,
  context: NumberContext = 'compact'
): string {
  if (value === null || value === undefined || isNaN(value)) return '-';

  switch (context) {
    case 'compact':
      return COMPACT_FORMATTER.format(value);
    case 'price':
    case 'eps':
      return value.toFixed(2);
    case 'greeks':
      return value.toFixed(4);
    case 'percent':
      return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
    case 'currency_pair':
      return value.toFixed(4);
    default:
      return String(value);
  }
}

/**
 * Format a price change value with sign prefix and 2 decimal places.
 *
 * @param value - The change amount, or null/undefined
 * @returns Formatted string like `'+1.23'` or `'-0.45'`, or `'-'` for null
 */
export function formatChange(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return (value >= 0 ? '+' : '') + value.toFixed(2);
}

/**
 * Format a currency value with symbol prefix.
 *
 * @param value - The currency amount, or null/undefined
 * @param symbol - The currency symbol (default: `'$'`)
 * @returns Formatted string like `'$150.46'`, or `'-'` for null
 */
export function formatCurrency(
  value: number | null | undefined,
  symbol: string = '$'
): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return symbol + value.toFixed(2);
}
