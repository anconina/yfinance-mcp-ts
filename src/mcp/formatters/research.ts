/**
 * Research domain formatters for earnings calendar, IPOs, and stock splits.
 *
 * All three research tools return Array<Record<string, unknown>> -- flat arrays
 * with lowercase field names from Yahoo API. Each formatter selects relevant
 * columns, renders a markdown table, and supports max_results limiting to
 * prevent context window bloat.
 *
 * Imports Phase 1 utilities from the barrel index.
 */

import {
  formatCompact,
  toMarkdownTable,
  wrapResponse,
  FormatType,
} from './index';

/** Options for research response formatting. */
export interface ResearchFormatOptions {
  format?: FormatType;
  max_results?: number;
}

/** Default maximum results before truncation. */
const DEFAULT_MAX_RESULTS = 25;

/**
 * Extract a date string from a value that may be an ISO datetime, date string, or null.
 *
 * - ISO datetime (e.g., '2024-01-25T16:00:00Z'): takes first 10 chars
 * - Plain date string (e.g., '2024-01-25'): returns as-is
 * - null/undefined/non-string: returns '-'
 *
 * @param value - The raw date value
 * @returns Date string in YYYY-MM-DD format or '-'
 */
function extractDate(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value !== 'string') return '-';
  if (value.length === 0) return '-';
  // Take first 10 chars to handle ISO datetime strings
  return value.slice(0, 10);
}

/**
 * Apply max_results slicing and return the sliced array plus optional truncation hint.
 *
 * @param data - Input array
 * @param maxResults - Maximum number of results to show
 * @returns Tuple of [sliced array, truncation hint or empty string]
 */
function applyMaxResults<T>(data: T[], maxResults: number): [T[], string] {
  if (data.length <= maxResults) {
    return [data, ''];
  }
  return [
    data.slice(0, maxResults),
    `Showing ${maxResults} of ${data.length} results | Increase with max_results parameter`,
  ];
}

/**
 * Format earnings calendar data as a 7-column markdown table.
 *
 * Columns: Ticker, Company, Date, Time, EPS Est, EPS Act, Surprise%
 *
 * @param data - Flat array of earnings calendar records from Yahoo Research API
 * @param options - Format and max_results options
 * @returns Formatted response string
 */
export function formatEarningsCalendarResponse(
  data: unknown[],
  options: ResearchFormatOptions = {}
): string {
  // JSON path
  if (options.format === 'json') {
    return JSON.stringify(data);
  }

  // Text path
  const records = data as Record<string, unknown>[];

  if (records.length === 0) {
    return wrapResponse('No earnings calendar data available', { dataType: 'Earnings Calendar' });
  }

  const maxResults = options.max_results ?? DEFAULT_MAX_RESULTS;
  const [sliced, hint] = applyMaxResults(records, maxResults);

  const headers = ['Ticker', 'Company', 'Date', 'Time', 'EPS Est', 'EPS Act', 'Surprise%'];
  const align: ('l' | 'r')[] = ['l', 'l', 'l', 'l', 'r', 'r', 'r'];

  const rows = sliced.map((r) => [
    (r.ticker as string) || '-',
    (r.companyshortname as string) || '-',
    extractDate(r.startdatetime),
    (r.startdatetimetype as string) || '-',
    typeof r.epsestimate === 'number' ? formatCompact(r.epsestimate, 'eps') : '-',
    typeof r.epsactual === 'number' ? formatCompact(r.epsactual, 'eps') : '-',
    typeof r.epssurprisepct === 'number' ? formatCompact(r.epssurprisepct, 'percent') : '-',
  ]);

  const body = toMarkdownTable(headers, rows, align);

  return wrapResponse(body, {
    dataType: 'Earnings Calendar',
    hint: hint || undefined,
  });
}

/**
 * Format IPO data as an 8-column markdown table.
 *
 * Columns: Ticker, Company, Exchange, Date, Price Range, Offer Price, Shares, Deal Type
 *
 * @param data - Flat array of IPO records from Yahoo Research API
 * @param options - Format and max_results options
 * @returns Formatted response string
 */
export function formatIPOsResponse(
  data: unknown[],
  options: ResearchFormatOptions = {}
): string {
  // JSON path
  if (options.format === 'json') {
    return JSON.stringify(data);
  }

  // Text path
  const records = data as Record<string, unknown>[];

  if (records.length === 0) {
    return wrapResponse('No IPO data available', { dataType: 'IPOs' });
  }

  const maxResults = options.max_results ?? DEFAULT_MAX_RESULTS;
  const [sliced, hint] = applyMaxResults(records, maxResults);

  const headers = ['Ticker', 'Company', 'Exchange', 'Date', 'Price Range', 'Offer Price', 'Shares', 'Deal Type'];
  const align: ('l' | 'r')[] = ['l', 'l', 'l', 'l', 'l', 'r', 'r', 'l'];

  const rows = sliced.map((r) => {
    // Price range: show $X-$Y when both exist, single value if only one, '-' if neither
    let priceRange = '-';
    const pricefrom = r.pricefrom;
    const priceto = r.priceto;
    if (typeof pricefrom === 'number' && typeof priceto === 'number') {
      priceRange = `$${pricefrom}-$${priceto}`;
    } else if (typeof pricefrom === 'number') {
      priceRange = `$${pricefrom}`;
    } else if (typeof priceto === 'number') {
      priceRange = `$${priceto}`;
    }

    return [
      (r.ticker as string) || '-',
      (r.companyshortname as string) || '-',
      (r.exchange_short_name as string) || '-',
      extractDate(r.startdatetime),
      priceRange,
      typeof r.offerprice === 'number' ? formatCompact(r.offerprice, 'price') : '-',
      typeof r.shares === 'number' ? formatCompact(r.shares, 'compact') : '-',
      (r.dealtype as string) || '-',
    ];
  });

  const body = toMarkdownTable(headers, rows, align);

  return wrapResponse(body, {
    dataType: 'IPOs',
    hint: hint || undefined,
  });
}

/**
 * Format stock split data as a 4-column markdown table.
 *
 * Columns: Ticker, Company, Date, Ratio
 * Ratio is computed from old_share_worth:share_worth (e.g., "1:10" for 10-for-1).
 *
 * @param data - Flat array of split records from Yahoo Research API
 * @param options - Format and max_results options
 * @returns Formatted response string
 */
export function formatSplitsResponse(
  data: unknown[],
  options: ResearchFormatOptions = {}
): string {
  // JSON path
  if (options.format === 'json') {
    return JSON.stringify(data);
  }

  // Text path
  const records = data as Record<string, unknown>[];

  if (records.length === 0) {
    return wrapResponse('No stock split data available', { dataType: 'Stock Splits' });
  }

  const maxResults = options.max_results ?? DEFAULT_MAX_RESULTS;
  const [sliced, hint] = applyMaxResults(records, maxResults);

  const headers = ['Ticker', 'Company', 'Date', 'Ratio'];
  const align: ('l' | 'r')[] = ['l', 'l', 'l', 'l'];

  const rows = sliced.map((r) => {
    // Ratio: old_share_worth:share_worth (e.g., "1:10" for 10-for-1 split)
    let ratio = '-';
    if (typeof r.old_share_worth === 'number' && typeof r.share_worth === 'number') {
      ratio = `${r.old_share_worth}:${r.share_worth}`;
    }

    return [
      (r.ticker as string) || '-',
      (r.companyshortname as string) || '-',
      extractDate(r.startdatetime),
      ratio,
    ];
  });

  const body = toMarkdownTable(headers, rows, align);

  return wrapResponse(body, {
    dataType: 'Stock Splits',
    hint: hint || undefined,
  });
}
