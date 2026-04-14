/**
 * Stock summary domain formatter for get_stock_summary.
 *
 * Transforms Yahoo's summaryDetail module response (with nested {raw, fmt} pairs)
 * into grouped, labeled key-value output organized by analytical category.
 * Groups with no available data are omitted entirely.
 *
 * Pattern: Grouped Key-Value Output (Pattern 2 from research).
 */

import { NumberContext, DEFAULT_SUMMARY_FIELDS } from './constants';
import {
  flattenYahooObject,
  formatCompact,
  wrapResponse,
  guardSize,
  FormatType,
} from './index';

/** A single field within a group definition. */
interface FieldDef {
  key: string;
  display: string;
  context: NumberContext;
}

/** A named group of related fields. */
interface GroupDef {
  label: string;
  fields: FieldDef[];
}

/** Options for summary response formatting. */
export interface SummaryFormatOptions {
  format?: FormatType;
}

/**
 * Summary detail groups based on the summaryDetail Yahoo module.
 *
 * Six analytical categories: Valuation, Yield, Trading, Range, Volume, Averages.
 * exDividendDate uses 'price' context as a placeholder -- it receives special
 * string handling before reaching renderGroups.
 */
const SUMMARY_GROUPS: GroupDef[] = [
  {
    label: 'Valuation',
    fields: [
      { key: 'trailingPE', display: 'P/E', context: 'price' },
      { key: 'forwardPE', display: 'Fwd P/E', context: 'price' },
      { key: 'priceToSalesTrailing12Months', display: 'P/S', context: 'price' },
      { key: 'marketCap', display: 'Mkt Cap', context: 'compact' },
    ],
  },
  {
    label: 'Yield',
    fields: [
      { key: 'dividendRate', display: 'Div', context: 'price' },
      { key: 'dividendYield', display: 'Yield', context: 'percent' },
      { key: 'payoutRatio', display: 'Payout', context: 'percent' },
      { key: 'exDividendDate', display: 'Ex-Date', context: 'price' },
    ],
  },
  {
    label: 'Trading',
    fields: [
      { key: 'bid', display: 'Bid', context: 'price' },
      { key: 'bidSize', display: 'x', context: 'compact' },
      { key: 'ask', display: 'Ask', context: 'price' },
      { key: 'askSize', display: 'x', context: 'compact' },
    ],
  },
  {
    label: 'Range',
    fields: [
      { key: 'dayLow', display: 'Day Low', context: 'price' },
      { key: 'dayHigh', display: 'Day High', context: 'price' },
      { key: 'fiftyTwoWeekLow', display: '52W Low', context: 'price' },
      { key: 'fiftyTwoWeekHigh', display: '52W High', context: 'price' },
    ],
  },
  {
    label: 'Volume',
    fields: [
      { key: 'volume', display: 'Today', context: 'compact' },
      { key: 'averageVolume10days', display: 'Avg(10d)', context: 'compact' },
      { key: 'averageVolume', display: 'Avg(3mo)', context: 'compact' },
    ],
  },
  {
    label: 'Averages',
    fields: [
      { key: 'fiftyDayAverage', display: '50-Day', context: 'price' },
      { key: 'twoHundredDayAverage', display: '200-Day', context: 'price' },
    ],
  },
];

/**
 * Render grouped key-value output from flattened data.
 *
 * For each group, iterates fields, looks up the key in flattened data,
 * formats values with formatCompact, and joins with pipe separator.
 * Groups where ALL fields are null/undefined are omitted entirely.
 *
 * @param data - Flattened Yahoo data (keys to raw values)
 * @param groups - Group definitions controlling output structure
 * @returns Multi-line string with one line per non-empty group
 */
export function renderGroups(
  data: Record<string, number | string | null>,
  groups: GroupDef[]
): string {
  const lines: string[] = [];

  for (const group of groups) {
    const parts: string[] = [];

    for (const field of group.fields) {
      const val = data[field.key];
      if (val === null || val === undefined) continue;

      if (typeof val === 'string') {
        parts.push(`${field.display}: ${val}`);
      } else {
        parts.push(`${field.display}: ${formatCompact(val, field.context)}`);
      }
    }

    if (parts.length > 0) {
      lines.push(`${group.label}: ${parts.join(' | ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Top-level format function for get_stock_summary.
 *
 * Handles single and multi-symbol queries, error entries (string values),
 * format routing (text vs JSON), and response envelope wrapping.
 *
 * @param data - Raw Yahoo summaryDetail data keyed by symbol
 * @param options - Format options (text or json)
 * @returns Formatted response string ready to return to the LLM
 */
export function formatSummaryResponse(
  data: Record<string, unknown>,
  options: SummaryFormatOptions = {}
): string {
  const symbols = Object.keys(data);

  if (symbols.length === 0) {
    return 'No summary data available';
  }

  // Step 1: Normalize all symbols
  const normalized: Record<string, unknown> = {};
  for (const sym of symbols) {
    const symData = data[sym];
    if (typeof symData === 'string') {
      normalized[sym] = { error: symData };
    } else {
      const flat = flattenYahooObject(symData as Record<string, unknown>);

      // exDividendDate special case: convert Unix epoch to ISO date string
      if (flat.exDividendDate !== null && flat.exDividendDate !== undefined) {
        if (typeof flat.exDividendDate === 'number') {
          flat.exDividendDate = new Date(flat.exDividendDate * 1000)
            .toISOString()
            .slice(0, 10);
        }
        // If already a string, keep as-is
      }

      normalized[sym] = flat;
    }
  }

  // Step 2: JSON path -- project to curated field set
  if (options.format === 'json') {
    const fieldSet = new Set<string>(DEFAULT_SUMMARY_FIELDS);
    const projected: Record<string, unknown> = {};
    for (const [sym, val] of Object.entries(normalized)) {
      const obj = val as Record<string, unknown>;
      if (obj.error) { projected[sym] = obj; continue; }
      const p: Record<string, unknown> = {};
      for (const f of fieldSet) { if (f in obj) p[f] = obj[f]; }
      projected[sym] = p;
    }
    return guardSize(JSON.stringify(projected));
  }

  // Step 3: Text path
  const sections: string[] = [];
  for (const sym of symbols) {
    const entry = normalized[sym] as Record<string, number | string | null>;
    if ((entry as Record<string, unknown>).error) {
      sections.push(`${sym} | Error: ${(entry as Record<string, unknown>).error}`);
    } else {
      const body = renderGroups(entry, SUMMARY_GROUPS);
      if (body.length === 0) {
        sections.push(`${sym} | No summary data available`);
      } else {
        sections.push(body);
      }
    }
  }

  const body = sections.join('\n\n');

  // Step 4: Wrap with envelope
  const wrapOptions = symbols.length === 1
    ? { symbol: symbols[0], dataType: 'Summary Detail' }
    : { dataType: 'Summary Detail' };

  return wrapResponse(body, wrapOptions);
}
