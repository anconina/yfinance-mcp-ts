/**
 * Key statistics domain formatter for get_key_stats.
 *
 * Transforms Yahoo's defaultKeyStatistics module response (with nested {raw, fmt} pairs)
 * into grouped, labeled key-value output organized by analytical category.
 * Groups with no available data are omitted entirely.
 *
 * Pattern: Grouped Key-Value Output (Pattern 2 from research).
 *
 * Self-contained: does NOT import from summary.ts. Each formatter defines its own
 * GroupDef and renderGroups to allow independent evolution.
 */

import { NumberContext, DEFAULT_KEYSTATS_FIELDS } from './constants';
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

/** Options for key stats response formatting. */
export interface KeyStatsFormatOptions {
  format?: FormatType;
}

/**
 * Key statistics groups based on the defaultKeyStatistics Yahoo module.
 *
 * Six analytical categories: Valuation, Profitability, Growth, Financial, Per Share, Shares.
 */
const KEY_STATS_GROUPS: GroupDef[] = [
  {
    label: 'Valuation',
    fields: [
      { key: 'forwardPE', display: 'Fwd P/E', context: 'price' },
      { key: 'pegRatio', display: 'PEG', context: 'price' },
      { key: 'enterpriseToRevenue', display: 'EV/Rev', context: 'price' },
      { key: 'enterpriseToEbitda', display: 'EV/EBITDA', context: 'price' },
      { key: 'priceToBook', display: 'P/B', context: 'price' },
    ],
  },
  {
    label: 'Profitability',
    fields: [
      { key: 'profitMargins', display: 'Margin', context: 'percent' },
      { key: 'operatingMargins', display: 'Op Margin', context: 'percent' },
      { key: 'returnOnEquity', display: 'ROE', context: 'percent' },
      { key: 'returnOnAssets', display: 'ROA', context: 'percent' },
    ],
  },
  {
    label: 'Growth',
    fields: [
      { key: 'revenueGrowth', display: 'Revenue YoY', context: 'percent' },
      { key: 'earningsGrowth', display: 'Earnings YoY', context: 'percent' },
      { key: 'earningsQuarterlyGrowth', display: 'EPS QoQ', context: 'percent' },
    ],
  },
  {
    label: 'Financial',
    fields: [
      { key: 'beta', display: 'Beta', context: 'price' },
      { key: 'debtToEquity', display: 'D/E', context: 'price' },
      { key: 'currentRatio', display: 'Current', context: 'price' },
      { key: 'enterpriseValue', display: 'EV', context: 'compact' },
    ],
  },
  {
    label: 'Per Share',
    fields: [
      { key: 'trailingEps', display: 'EPS TTM', context: 'eps' },
      { key: 'forwardEps', display: 'EPS Fwd', context: 'eps' },
      { key: 'bookValue', display: 'Book', context: 'eps' },
      { key: 'revenuePerShare', display: 'Revenue', context: 'eps' },
    ],
  },
  {
    label: 'Shares',
    fields: [
      { key: 'sharesOutstanding', display: 'Outstanding', context: 'compact' },
      { key: 'floatShares', display: 'Float', context: 'compact' },
      { key: 'shortPercentOfFloat', display: 'Short%', context: 'percent' },
      { key: 'shortRatio', display: 'Short Ratio', context: 'price' },
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
function renderGroups(
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
 * Top-level format function for get_key_stats.
 *
 * Handles single and multi-symbol queries, error entries (string values),
 * format routing (text vs JSON), and response envelope wrapping.
 *
 * @param data - Raw Yahoo defaultKeyStatistics data keyed by symbol
 * @param options - Format options (text or json)
 * @returns Formatted response string ready to return to the LLM
 */
export function formatKeyStatsResponse(
  data: Record<string, unknown>,
  options: KeyStatsFormatOptions = {}
): string {
  const symbols = Object.keys(data);

  if (symbols.length === 0) {
    return 'No key stats data available';
  }

  // Step 1: Normalize all symbols
  const normalized: Record<string, unknown> = {};
  for (const sym of symbols) {
    const symData = data[sym];
    if (typeof symData === 'string') {
      normalized[sym] = { error: symData };
    } else {
      normalized[sym] = flattenYahooObject(symData as Record<string, unknown>);
    }
  }

  // Step 2: JSON path -- project to curated field set
  if (options.format === 'json') {
    const fieldSet = new Set<string>(DEFAULT_KEYSTATS_FIELDS);
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
      const body = renderGroups(entry, KEY_STATS_GROUPS);
      if (body.length === 0) {
        sections.push(`${sym} | No key stats data available`);
      } else {
        sections.push(body);
      }
    }
  }

  const body = sections.join('\n\n');

  // Step 4: Wrap with envelope
  const wrapOptions = symbols.length === 1
    ? { symbol: symbols[0], dataType: 'Key Statistics' }
    : { dataType: 'Key Statistics' };

  return wrapResponse(body, wrapOptions);
}
