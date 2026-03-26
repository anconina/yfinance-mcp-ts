/**
 * Price domain formatter for get_stock_price.
 *
 * Transforms Yahoo's price module response (with nested {raw, fmt} pairs)
 * into compact 2-line text blocks or flattened JSON. Each symbol produces
 * ~200-300 characters of text, well under the 500-char target.
 *
 * Imports all Phase 1 utilities from the barrel index.
 */

import {
  flattenYahooObject,
  stripNulls,
  formatCompact,
  formatChange,
  formatCurrency,
  wrapResponse,
  serializeResponse,
  formatHint,
  FormatType,
} from './index';

/** Options for price response formatting. */
export interface PriceFormatOptions {
  format?: FormatType;
}

/**
 * Normalize raw Yahoo price data for a single symbol into a flat map
 * with short, human-readable field names.
 *
 * Flattens {raw, fmt} pairs via flattenYahooObject, selects key fields,
 * renames Yahoo's verbose keys (regularMarketPrice -> price), and strips nulls.
 *
 * @param symbol - The ticker symbol (passed through, not extracted from data)
 * @param raw - Raw Yahoo price module data for one symbol
 * @returns Normalized flat object with short field names
 */
export function normalizePriceData(
  symbol: string,
  raw: Record<string, unknown>
): Record<string, unknown> {
  const flat = flattenYahooObject(raw);
  return stripNulls({
    symbol,
    shortName: flat.shortName,
    price: flat.regularMarketPrice,
    change: flat.regularMarketChange,
    changePct: flat.regularMarketChangePercent,
    marketCap: flat.marketCap,
    volume: flat.regularMarketVolume,
    open: flat.regularMarketOpen,
    dayHigh: flat.regularMarketDayHigh,
    dayLow: flat.regularMarketDayLow,
    prevClose: flat.regularMarketPreviousClose,
    currency: flat.currency,
    currencySymbol: flat.currencySymbol,
  });
}

/**
 * Render a single symbol's normalized price data as a compact 2-line text block.
 *
 * Line 1: SYM | price change (changePct) | MCap: mcap | Vol: vol
 * Line 2:   Open: open | Day: low-high | PrevClose: prevClose
 *
 * @param data - Normalized price data from normalizePriceData
 * @returns 2-line text block
 */
function renderSinglePriceText(data: Record<string, unknown>): string {
  const sym = data.symbol as string;
  const cs = (data.currencySymbol as string) || '$';
  const price = formatCurrency(data.price as number | null, cs);
  const change = formatChange(data.change as number | null);
  const changePct = formatCompact(data.changePct as number | null, 'percent');
  const mcap = formatCompact(data.marketCap as number | null, 'compact');
  const vol = formatCompact(data.volume as number | null, 'compact');

  const line1 = `${sym} | ${price} ${change} (${changePct}) | MCap: ${mcap} | Vol: ${vol}`;

  const open = formatCurrency(data.open as number | null, cs);
  const dayLow = formatCurrency(data.dayLow as number | null, cs);
  const dayHigh = formatCurrency(data.dayHigh as number | null, cs);
  const prevClose = formatCurrency(data.prevClose as number | null, cs);

  const line2 = `  Open: ${open} | Day: ${dayLow}-${dayHigh} | PrevClose: ${prevClose}`;

  return line1 + '\n' + line2;
}

/**
 * Top-level format function for get_stock_price.
 *
 * Handles single and multi-symbol queries, error entries (string values),
 * format routing (text vs JSON), and response envelope wrapping.
 *
 * Pattern: normalize all symbols first, then route to format.
 *
 * @param data - Raw Yahoo price data keyed by symbol (values are objects or error strings)
 * @param options - Format options (text or json)
 * @returns Formatted response string ready to return to the LLM
 */
export function formatPriceResponse(
  data: Record<string, unknown>,
  options: PriceFormatOptions = {}
): string {
  const symbols = Object.keys(data);

  // Step 1: Normalize all symbols (Pattern 3: normalize before format routing)
  const normalized: Record<string, unknown> = {};
  for (const sym of symbols) {
    const symData = data[sym];
    if (typeof symData === 'string') {
      // Error case: Yahoo returned an error string for this symbol
      normalized[sym] = { error: symData };
    } else {
      normalized[sym] = normalizePriceData(sym, symData as Record<string, unknown>);
    }
  }

  // Step 2: JSON path -- serialize normalized data
  if (options.format === 'json') {
    return serializeResponse(normalized, 'json');
  }

  // Step 3: Text path -- render each symbol section
  const sections: string[] = [];
  for (const sym of symbols) {
    const entry = normalized[sym] as Record<string, unknown>;
    if (entry.error) {
      sections.push(`${sym} | Error: ${entry.error}`);
    } else {
      sections.push(renderSinglePriceText(entry));
    }
  }

  const body = sections.join('\n\n');

  // Step 4: Wrap with envelope
  const wrapOptions = symbols.length === 1
    ? { symbol: symbols[0], dataType: 'Price Summary' }
    : { dataType: 'Price Summary' };

  const hint = symbols.length > 1
    ? formatHint(['Use get_stock_summary for valuation metrics'])
    : undefined;

  return wrapResponse(body, { ...wrapOptions, hint });
}
