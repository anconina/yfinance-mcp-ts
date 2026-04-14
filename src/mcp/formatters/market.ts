/**
 * Market summary domain formatter for get_market_summary.
 *
 * Transforms Yahoo's MarketSummaryItem[] into a compact 4-column markdown
 * table (Index, Price, Change, Chg%). Market summary values contain nested
 * {raw, fmt} pairs that must be flattened via extractValue.
 *
 * Imports Phase 1 utilities from the barrel index.
 */

import { DEFAULT_MARKET_FIELDS } from './constants';
import {
  extractValue,
  toMarkdownTable,
  formatCompact,
  formatChange,
  wrapResponse,
  guardSize,
  FormatType,
} from './index';

/** Options for market summary response formatting. */
export interface MarketSummaryFormatOptions {
  format?: FormatType;
}

/**
 * Format market summary items as a markdown table.
 *
 * - JSON path: serializes the raw array as compact JSON.
 * - Text path: renders a 4-column table (Index, Price, Change, Chg%).
 *   Uses extractValue to flatten {raw, fmt} pairs from MarketSummaryItem fields.
 *
 * @param data - Array of MarketSummaryItem objects from Yahoo
 * @param options - Format options (text or json)
 * @returns Formatted response string ready to return to the LLM
 */
export function formatMarketSummaryResponse(
  data: unknown[],
  options: MarketSummaryFormatOptions = {}
): string {
  // JSON path -- project to curated field set, extract raw from {raw, fmt} pairs
  if (options.format === 'json') {
    const fieldSet = new Set<string>(DEFAULT_MARKET_FIELDS);
    const projected = (data as Record<string, unknown>[]).map(item => {
      const obj = item as Record<string, unknown>;
      const p: Record<string, unknown> = {};
      for (const f of fieldSet) {
        const val = obj[f];
        if (val !== undefined) {
          // extractValue handles {raw, fmt} pairs
          p[f] = typeof val === 'object' && val !== null && 'raw' in (val as Record<string, unknown>)
            ? (val as Record<string, unknown>).raw
            : val;
        }
      }
      return p;
    });
    return guardSize(JSON.stringify(projected));
  }

  // Text path
  if (!Array.isArray(data) || data.length === 0) {
    return wrapResponse('No market summary data available', { dataType: 'Market Summary' });
  }

  const headers = ['Index', 'Price', 'Change', 'Chg%'];
  const align: ('l' | 'r')[] = ['l', 'r', 'r', 'r'];

  const rows = data.map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    const name = (obj.shortName as string) || (obj.symbol as string) || '-';
    const price = extractValue(obj.regularMarketPrice, 'display');
    const change = extractValue(obj.regularMarketChange, 'compute') as number | null;
    const changePct = extractValue(obj.regularMarketChangePercent, 'compute') as number | null;

    return [
      name,
      price,
      formatChange(change),
      formatCompact(changePct, 'percent'),
    ];
  });

  const body = toMarkdownTable(headers, rows, align);
  return wrapResponse(body, { dataType: 'Market Summary' });
}
