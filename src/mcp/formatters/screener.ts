/**
 * Screener domain formatters for list_screeners and get_screener.
 *
 * Transforms the flat list of 383 screener keys into categorized text
 * with smart display (small categories inline, large categories count-only).
 * Transforms screener quote results into compact 7-column markdown tables.
 *
 * Imports Phase 1 utilities from the barrel index.
 */

import {
  formatCompact,
  formatChange,
  toMarkdownTable,
  wrapResponse,
  serializeResponse,
  FormatType,
} from './index';

/** Options for list_screeners response formatting. */
export interface ListScreenersFormatOptions {
  format?: FormatType;
  category?: string;
}

/** Options for get_screener response formatting. */
export interface ScreenerFormatOptions {
  format?: FormatType;
}

/**
 * Hardcoded set of popular/strategy screener keys that map to 'Market Movers'.
 */
const MARKET_MOVERS_KEYS = new Set([
  'day_gainers',
  'day_losers',
  'most_actives',
  'most_shorted_stocks',
  'bearish_stocks_right_now',
  'bullish_stocks_right_now',
  'small_cap_gainers',
  '52_wk_high',
  '52_wk_low',
]);

/**
 * Preferred display order for categories.
 * Small actionable categories first, then large reference categories.
 */
const CATEGORY_ORDER = [
  'Market Movers',
  'Value',
  'Growth',
  'Analyst Picks',
  'Dividends & Income',
  'Strategies',
  'Crypto',
  'ETFs',
  'Mutual Funds',
  'Sectors',
];

/** Threshold: categories with more than this many items show count-only. */
const LARGE_CATEGORY_THRESHOLD = 15;

/**
 * Categorize a screener key into a named category using keyword matching.
 *
 * Priority order ensures explicit matches win over substring matches.
 *
 * @param key - Screener key (e.g., 'day_gainers', 'undervalued_growth_stocks')
 * @returns Category name
 */
export function categorizeScreener(key: string): string {
  // 1. Explicit popular/strategy screeners
  if (MARKET_MOVERS_KEYS.has(key)) return 'Market Movers';

  // 2. Value keywords
  if (key.includes('undervalued') || key === 'strong_undervalued_stocks') return 'Value';

  // 3. Growth keywords
  if (key.includes('growth')) return 'Growth';

  // 4. Dividends & Income
  if (key.includes('yield') || key.includes('dividend') || key === 'portfolio_anchors') return 'Dividends & Income';

  // 5. Analyst Picks
  if (key.includes('analyst') || key.includes('strong_buy')) return 'Analyst Picks';

  // 6. Crypto
  if (key.includes('crypto')) return 'Crypto';

  // 7. ETFs
  if (key.includes('etf')) return 'ETFs';

  // 8. Mutual Funds
  if (key.includes('mutual_fund')) return 'Mutual Funds';

  // 9. Strategies
  if (key === 'aggressive_small_caps' || key === 'conservative_foreign_funds') return 'Strategies';

  // 10. Default fallback
  return 'Sectors';
}

/**
 * Group screener keys by category.
 *
 * @param keys - Array of screener key strings
 * @returns Map of category name to array of keys
 */
function groupByCategory(keys: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const key of keys) {
    const cat = categorizeScreener(key);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(key);
  }
  return groups;
}

/**
 * Sort categories in preferred display order.
 * Unknown categories are appended at the end.
 *
 * @param categories - Array of category names
 * @returns Sorted array
 */
function sortCategories(categories: string[]): string[] {
  return categories.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    const aIdx = ai === -1 ? CATEGORY_ORDER.length : ai;
    const bIdx = bi === -1 ? CATEGORY_ORDER.length : bi;
    return aIdx - bIdx;
  });
}

/**
 * Format the list_screeners response.
 *
 * Groups all screener keys by category. Small categories list keys inline;
 * large categories show count only with a filter hint. Optional category
 * filter expands a single category to show all its keys.
 *
 * @param screenerKeys - Array of all available screener key strings
 * @param options - Format and category filter options
 * @returns Formatted response string
 */
export function formatListScreenersResponse(
  screenerKeys: string[],
  options: ListScreenersFormatOptions = {}
): string {
  if (screenerKeys.length === 0) {
    return wrapResponse('No screeners available', { dataType: 'Screeners' });
  }

  const groups = groupByCategory(screenerKeys);

  // JSON path
  if (options.format === 'json') {
    return serializeResponse(groups as Record<string, unknown>, 'json');
  }

  // Text path with category filter
  if (options.category) {
    const cat = options.category;
    const keys = groups[cat];
    if (!keys) {
      const available = sortCategories(Object.keys(groups)).join(', ');
      return wrapResponse(
        `Category "${cat}" not found.\n\nAvailable categories: ${available}`,
        { dataType: 'Screeners' }
      );
    }
    const lines: string[] = [];
    lines.push(`${cat} (${keys.length}):`);
    for (const k of keys) {
      lines.push(`  ${k}`);
    }
    lines.push('');
    lines.push(`Total: ${screenerKeys.length} screeners`);
    lines.push('Tip: Use get_screener to run a screener');
    return wrapResponse(lines.join('\n'), { dataType: 'Screeners' });
  }

  // Text path: all categories
  const lines: string[] = [];
  const sortedCats = sortCategories(Object.keys(groups));

  for (const cat of sortedCats) {
    const keys = groups[cat];
    if (keys.length > LARGE_CATEGORY_THRESHOLD) {
      lines.push(`${cat} (${keys.length}): (use category="${cat}" to list)`);
    } else {
      lines.push(`${cat} (${keys.length}): ${keys.join(', ')}`);
    }
  }

  lines.push('');
  lines.push(`Total: ${screenerKeys.length} screeners`);
  lines.push('Tip: Use category parameter to filter | Use get_screener to run a screener');

  return wrapResponse(lines.join('\n'), { dataType: 'Screeners' });
}

/**
 * Title-case a screener key by replacing underscores with spaces
 * and capitalizing each word.
 *
 * @param key - Screener key (e.g., 'day_gainers')
 * @returns Title-cased string (e.g., 'Day Gainers')
 */
function titleCase(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Format the get_screener response as a markdown table.
 *
 * Renders screener quotes with 7 columns: Symbol, Name, Price, Change,
 * Chg%, Volume, MCap. Values are plain numbers (not {raw, fmt} pairs).
 *
 * @param data - Raw screener data keyed by screener name
 * @param options - Format options
 * @returns Formatted response string
 */
export function formatScreenerResponse(
  data: Record<string, unknown>,
  options: ScreenerFormatOptions = {}
): string {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return wrapResponse('No screener data available', { dataType: 'Screener Results' });
  }

  // JSON path
  if (options.format === 'json') {
    return serializeResponse(data, 'json');
  }

  // Text path
  const sections: string[] = [];

  for (const key of keys) {
    const result = data[key] as Record<string, unknown> | undefined;
    const quotes = (result?.quotes ?? result) as Record<string, unknown>[] | undefined;

    if (!Array.isArray(quotes) || quotes.length === 0) {
      sections.push(`No results found for screener: ${key}`);
      continue;
    }

    const screenerTitle = titleCase(key);
    const headers = ['Symbol', 'Name', 'Price', 'Change', 'Chg%', 'Volume', 'MCap'];
    const align: ('l' | 'r')[] = ['l', 'l', 'r', 'r', 'r', 'r', 'r'];

    const rows = quotes.map((q) => [
      (q.symbol as string) || '-',
      (q.shortName as string) || (q.longName as string) || '-',
      formatCompact(q.regularMarketPrice as number | null, 'price'),
      formatChange(q.regularMarketChange as number | null),
      formatCompact(q.regularMarketChangePercent as number | null, 'percent'),
      formatCompact(q.regularMarketVolume as number | null, 'compact'),
      formatCompact(q.marketCap as number | null, 'compact'),
    ]);

    sections.push(`${screenerTitle}\n\n${toMarkdownTable(headers, rows, align)}`);
  }

  const body = sections.join('\n\n');
  return wrapResponse(body, { dataType: 'Screener Results' });
}
