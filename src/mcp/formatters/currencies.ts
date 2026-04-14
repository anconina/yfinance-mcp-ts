/**
 * Currencies domain formatter for get_currencies.
 *
 * Transforms Yahoo's Currency[] into a compact 3-column markdown table
 * (Symbol, Short Name, Long Name). Currency data contains plain strings
 * only -- no {raw, fmt} pairs and no numeric formatting needed.
 *
 * Imports Phase 1 utilities from the barrel index.
 */

import {
  toMarkdownTable,
  wrapResponse,
  guardSize,
  FormatType,
} from './index';

/** Options for currencies response formatting. */
export interface CurrenciesFormatOptions {
  format?: FormatType;
  max_results?: number;
}

/**
 * Format currency pairs as a markdown table.
 *
 * - JSON path: serializes the raw array as compact JSON.
 * - Text path: renders a 3-column table (Symbol, Short Name, Long Name).
 *   Supports max_results to limit output. Shows truncation hint when limited.
 *
 * @param data - Array of Currency objects from Yahoo
 * @param options - Format options (text or json, optional max_results)
 * @returns Formatted response string ready to return to the LLM
 */
export function formatCurrenciesResponse(
  data: unknown[],
  options: CurrenciesFormatOptions = {}
): string {
  // JSON path
  if (options.format === 'json') {
    return guardSize(JSON.stringify(data));
  }

  // Text path
  if (!Array.isArray(data) || data.length === 0) {
    return wrapResponse('No currency data available', { dataType: 'Currencies' });
  }

  const total = data.length;
  const items = options.max_results ? data.slice(0, options.max_results) : data;

  const headers = ['Symbol', 'Short Name', 'Long Name'];
  const align: ('l' | 'l' | 'l')[] = ['l', 'l', 'l'];

  const rows = items.map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    return [
      (obj.symbol as string) || '-',
      (obj.shortName as string) || '-',
      (obj.longName as string) || '-',
    ];
  });

  let body = toMarkdownTable(headers, rows, align);

  if (options.max_results && options.max_results < total) {
    body += `\n\nShowing ${options.max_results} of ${total} currency pairs`;
  }

  return wrapResponse(body, { dataType: 'Currencies' });
}
