/**
 * Options domain formatter for get_options.
 *
 * Transforms the flattened option chain data from processOptionData into
 * compact, LLM-friendly markdown tables. Reduces 50-150K token responses
 * to under 3,000 characters via ATM-anchored strike windows, expiration
 * selection, and progressive disclosure hints.
 *
 * Pipeline: extract metadata -> find ATM -> select expirations -> group
 * contracts -> filter strike window -> render tables -> wrap envelope.
 *
 * Imports all Phase 1 utilities from the barrel index.
 */

import {
  extractValue,
  formatCompact,
  toMarkdownTable,
  wrapResponse,
  serializeResponse,
  formatHint,
  FormatType,
  DEFAULT_STRIKE_RANGE,
  DEFAULT_MAX_EXPIRATIONS,
} from './index';

/** Options for options response formatting. */
export interface OptionsFormatOptions {
  /** Filter to a single expiration date (YYYY-MM-DD). */
  expiration?: string;
  /** Number of strikes above/below ATM to show (default: 5). */
  strike_range?: number;
  /** Filter option type: calls, puts, or both (default: both). */
  type?: 'calls' | 'puts' | 'both';
  /** Detail level: summary shows nearest expirations, full shows all. */
  detail?: 'summary' | 'full';
  /** Output format: text (markdown) or json. */
  format?: FormatType;
}

/** Normalized option contract with extracted numeric values. */
export interface NormalizedContract {
  strike: number | null;
  last: number | null;
  bid: number | null;
  ask: number | null;
  volume: number | null;
  openInterest: number | null;
  /** Implied volatility as decimal (e.g., 0.3215). */
  iv: number | null;
  /** In the money flag. */
  itm: boolean;
}

/**
 * Normalize a raw option contract into a NormalizedContract.
 *
 * Uses extractValue() on every numeric field to handle both {raw, fmt}
 * pairs and plain numbers. Missing/null fields become null.
 *
 * @param raw - Raw contract object from processOptionData
 * @returns Normalized contract with extracted values
 */
export function normalizeContract(raw: Record<string, unknown>): NormalizedContract {
  return {
    strike: extractValue(raw.strike) as number | null,
    last: extractValue(raw.lastPrice) as number | null,
    bid: extractValue(raw.bid) as number | null,
    ask: extractValue(raw.ask) as number | null,
    volume: extractValue(raw.volume) as number | null,
    openInterest: extractValue(raw.openInterest) as number | null,
    iv: extractValue(raw.impliedVolatility) as number | null,
    itm: raw.inTheMoney === true,
  };
}

/**
 * Find the at-the-money (ATM) strike closest to the underlying price.
 *
 * @param strikes - Array of available strike prices (may be unsorted)
 * @param underlyingPrice - Current underlying price
 * @returns Closest strike, or lower one if equidistant. Returns 0 for empty array.
 */
export function findATMStrike(strikes: number[], underlyingPrice: number): number {
  if (strikes.length === 0) return 0;

  let closest = strikes[0];
  let minDist = Math.abs(strikes[0] - underlyingPrice);

  for (const strike of strikes) {
    const dist = Math.abs(strike - underlyingPrice);
    if (dist < minDist || (dist === minDist && strike < closest)) {
      minDist = dist;
      closest = strike;
    }
  }

  return closest;
}

/**
 * Group contracts by expiration date.
 *
 * Handles expiration as Date object, Unix timestamp (seconds), or string.
 * Returns Map ordered by insertion (contracts arrive chronologically).
 *
 * @param contracts - Array of raw contract objects with expiration field
 * @returns Map from ISO date string to array of contracts
 */
export function groupByExpiration(
  contracts: Array<Record<string, unknown>>
): Map<string, Array<Record<string, unknown>>> {
  const groups = new Map<string, Array<Record<string, unknown>>>();

  for (const contract of contracts) {
    const exp = contract.expiration;
    let dateStr: string;

    if (exp instanceof Date) {
      dateStr = exp.toISOString().slice(0, 10);
    } else if (typeof exp === 'number') {
      dateStr = new Date(exp * 1000).toISOString().slice(0, 10);
    } else if (typeof exp === 'string') {
      dateStr = exp.slice(0, 10);
    } else {
      continue; // Skip contracts with no valid expiration
    }

    if (!groups.has(dateStr)) {
      groups.set(dateStr, []);
    }
    groups.get(dateStr)!.push(contract);
  }

  return groups;
}

/**
 * Select the nearest N future expirations from a list of date strings.
 *
 * Filters to dates >= today, sorts chronologically, returns first `count`.
 */
function selectNearestExpirations(dates: string[], count: number): string[] {
  const today = new Date().toISOString().slice(0, 10);
  return dates
    .filter((d) => d >= today)
    .sort()
    .slice(0, count);
}

/**
 * Calculate days to expiration (DTE).
 *
 * @param expirationDate - ISO date string YYYY-MM-DD
 * @returns DTE as integer, minimum 0
 */
function calcDTE(expirationDate: string): number {
  const now = new Date();
  const exp = new Date(expirationDate + 'T23:59:59Z');
  const msPerDay = 86_400_000;
  return Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / msPerDay));
}

/**
 * Filter contracts to a strike window around ATM.
 *
 * The window is defined by INDEX positions in the sorted strikes array,
 * not by dollar amount. This handles varying strike increments correctly.
 *
 * @param contracts - Normalized contracts for one expiration/type
 * @param allStrikes - Sorted array of all available strikes
 * @param atmStrike - The ATM strike price
 * @param range - Number of strikes above/below ATM to include
 * @returns Filtered contracts sorted by strike ascending
 */
function filterByStrikeWindow(
  contracts: NormalizedContract[],
  allStrikes: number[],
  atmStrike: number,
  range: number
): NormalizedContract[] {
  const sorted = [...allStrikes].sort((a, b) => a - b);
  const atmIdx = sorted.indexOf(atmStrike);

  if (atmIdx === -1) {
    // ATM not in strikes array -- find nearest index
    let bestIdx = 0;
    let bestDist = Math.abs(sorted[0] - atmStrike);
    for (let i = 1; i < sorted.length; i++) {
      const dist = Math.abs(sorted[i] - atmStrike);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const low = sorted[Math.max(0, bestIdx - range)];
    const high = sorted[Math.min(sorted.length - 1, bestIdx + range)];
    return contracts
      .filter((c) => c.strike !== null && c.strike >= low && c.strike <= high)
      .sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
  }

  const lowIdx = Math.max(0, atmIdx - range);
  const highIdx = Math.min(sorted.length - 1, atmIdx + range);
  const low = sorted[lowIdx];
  const high = sorted[highIdx];

  return contracts
    .filter((c) => c.strike !== null && c.strike >= low && c.strike <= high)
    .sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
}

/**
 * Format IV as percentage string. Strip the + sign from formatCompact percent.
 *
 * @param iv - Implied volatility as decimal (e.g., 0.3215)
 * @returns Formatted string like "32.15%" or "-" for null
 */
function formatIV(iv: number | null): string {
  if (iv === null || iv === undefined || isNaN(iv)) return '-';
  const pct = iv * 100;
  return pct.toFixed(2) + '%';
}

/**
 * Render a section of contracts (calls or puts) as a markdown table.
 *
 * @param contracts - Filtered, sorted normalized contracts
 * @param atmStrike - ATM strike for marking with * prefix
 * @param label - Section label (e.g., "Calls" or "Puts")
 * @returns Markdown string with label and table
 */
function renderContractTable(
  contracts: NormalizedContract[],
  atmStrike: number,
  label: string
): string {
  if (contracts.length === 0) return '';

  const headers = ['Strike', 'Last', 'Bid', 'Ask', 'Vol', 'OI', 'IV', 'ITM'];
  const align: ('l' | 'r')[] = ['r', 'r', 'r', 'r', 'r', 'r', 'r', 'l'];

  const rows = contracts.map((c) => {
    const strikeVal = c.strike !== null ? formatCompact(c.strike, 'price') : '-';
    const strikeDisplay =
      c.strike !== null && c.strike === atmStrike ? '*' + strikeVal : strikeVal;

    return [
      strikeDisplay,
      formatCompact(c.last, 'price'),
      formatCompact(c.bid, 'price'),
      formatCompact(c.ask, 'price'),
      formatCompact(c.volume, 'compact'),
      formatCompact(c.openInterest, 'compact'),
      formatIV(c.iv),
      c.itm ? 'Y' : 'N',
    ];
  });

  return label + ':\n' + toMarkdownTable(headers, rows, align);
}

/**
 * Top-level format function for get_options.
 *
 * Handles single-symbol option chain data with progressive disclosure:
 * summary (default) shows nearest 3 expirations with ATM+-5 strikes;
 * parameters drill deeper into specific expirations, wider strike ranges,
 * or full data.
 *
 * @param data - Raw option chain data keyed by symbol
 * @param options - Format options controlling disclosure level
 * @returns Formatted response string ready to return to the LLM
 */
export function formatOptionsResponse(
  data: Record<string, unknown>,
  options: OptionsFormatOptions = {}
): string {
  const {
    expiration: expirationParam,
    strike_range: strikeRange = DEFAULT_STRIKE_RANGE,
    type: typeFilter = 'both',
    detail = 'summary',
    format = 'text',
  } = options;

  // Extract symbol key (first key in data)
  const symbols = Object.keys(data);
  if (symbols.length === 0) {
    return wrapResponse('No options data available', { dataType: 'Options Chain' });
  }

  const symbol = symbols[0];
  const symbolData = data[symbol];

  // Error case: Yahoo returned an error string
  if (typeof symbolData === 'string') {
    return wrapResponse(`Error: ${symbolData}`, {
      symbol,
      dataType: 'Options Chain',
    });
  }

  const symObj = symbolData as Record<string, unknown>;
  const calls = (symObj.calls as Array<Record<string, unknown>>) || [];
  const puts = (symObj.puts as Array<Record<string, unknown>>) || [];

  // Empty case
  if (calls.length === 0 && puts.length === 0) {
    return wrapResponse('No options data available', {
      symbol,
      dataType: 'Options Chain',
    });
  }

  // Step 1: Extract metadata
  const underlyingPrice =
    typeof symObj.underlyingPrice === 'number' ? symObj.underlyingPrice : null;
  const rawExpirationDates = (symObj.expirationDates as number[]) || [];
  const allExpirations = rawExpirationDates
    .map((ts) => new Date(ts * 1000).toISOString().slice(0, 10))
    .sort();
  const strikes = ((symObj.strikes as number[]) || []).slice().sort((a, b) => a - b);

  // Step 2: Find ATM strike
  let atmStrike: number;
  if (underlyingPrice !== null && strikes.length > 0) {
    atmStrike = findATMStrike(strikes, underlyingPrice);
  } else if (strikes.length > 0) {
    // Fallback: midpoint strike
    atmStrike = strikes[Math.floor(strikes.length / 2)];
  } else {
    atmStrike = 0;
  }

  // Step 3: Determine which expirations to show
  let selectedExpirations: string[];
  if (expirationParam) {
    // User wants a specific expiration
    if (!allExpirations.includes(expirationParam)) {
      const body =
        `Expiration ${expirationParam} not found.\n` +
        `Available: ${allExpirations.join(', ')}`;
      return wrapResponse(body, { symbol, dataType: 'Options Chain' });
    }
    selectedExpirations = [expirationParam];
  } else if (detail === 'full') {
    selectedExpirations = allExpirations;
  } else {
    // Summary: nearest N future expirations
    selectedExpirations = selectNearestExpirations(allExpirations, DEFAULT_MAX_EXPIRATIONS);
    // If no future expirations, show all (may be past data in test fixtures)
    if (selectedExpirations.length === 0) {
      selectedExpirations = allExpirations.slice(0, DEFAULT_MAX_EXPIRATIONS);
    }
  }

  // Step 4: Group contracts by expiration
  const callGroups = groupByExpiration(calls);
  const putGroups = groupByExpiration(puts);

  // JSON path
  if (format === 'json') {
    const jsonData: Record<string, unknown> = {
      expirations: allExpirations,
      underlyingPrice,
      atmStrike,
      data: {} as Record<
        string,
        { calls: NormalizedContract[]; puts: NormalizedContract[] }
      >,
    };

    const dataMap = jsonData.data as Record<
      string,
      { calls: NormalizedContract[]; puts: NormalizedContract[] }
    >;

    for (const exp of selectedExpirations) {
      const expCalls = (callGroups.get(exp) || []).map(normalizeContract);
      const expPuts = (putGroups.get(exp) || []).map(normalizeContract);

      // Apply strike window filter
      const filteredCalls =
        typeFilter !== 'puts'
          ? filterByStrikeWindow(expCalls, strikes, atmStrike, strikeRange)
          : [];
      const filteredPuts =
        typeFilter !== 'calls'
          ? filterByStrikeWindow(expPuts, strikes, atmStrike, strikeRange)
          : [];

      dataMap[exp] = { calls: filteredCalls, puts: filteredPuts };
    }

    return serializeResponse(jsonData, 'json');
  }

  // Text path
  // Step 5: Build per-expiration sections
  const sections: string[] = [];

  for (const exp of selectedExpirations) {
    const dte = calcDTE(exp);
    const sectionHeader = `--- ${exp} (${dte} DTE) ---`;

    const sectionParts: string[] = [sectionHeader];

    // Calls
    if (typeFilter !== 'puts') {
      const rawCalls = callGroups.get(exp) || [];
      const normalized = rawCalls.map(normalizeContract);
      const filtered = filterByStrikeWindow(normalized, strikes, atmStrike, strikeRange);
      const table = renderContractTable(filtered, atmStrike, 'Calls');
      if (table) sectionParts.push(table);
    }

    // Puts
    if (typeFilter !== 'calls') {
      const rawPuts = putGroups.get(exp) || [];
      const normalized = rawPuts.map(normalizeContract);
      const filtered = filterByStrikeWindow(normalized, strikes, atmStrike, strikeRange);
      const table = renderContractTable(filtered, atmStrike, 'Puts');
      if (table) sectionParts.push(table);
    }

    sections.push(sectionParts.join('\n'));
  }

  // Step 6: Build full response body
  const metaParts: string[] = [];
  if (underlyingPrice !== null) {
    metaParts.push(
      `Underlying: $${formatCompact(underlyingPrice, 'price')} | ATM Strike: $${formatCompact(atmStrike, 'price')}`
    );
  } else {
    metaParts.push(`ATM Strike: estimated $${formatCompact(atmStrike, 'price')}`);
  }
  metaParts.push(`Expirations: ${allExpirations.join(', ')}`);

  const body = metaParts.join('\n') + '\n\n' + sections.join('\n\n');

  // Step 7: Build hints
  const hints: string[] = [];
  if (
    detail === 'summary' &&
    !expirationParam &&
    allExpirations.length > selectedExpirations.length
  ) {
    hints.push('Use expiration="YYYY-MM-DD" for a specific date');
  }
  if (strikeRange === DEFAULT_STRIKE_RANGE) {
    hints.push('Use strike_range=N for more strikes');
  }
  if (typeFilter === 'both') {
    hints.push('Use type="calls" or type="puts" to filter');
  }
  if (detail === 'summary' && !expirationParam) {
    hints.push('Use detail="full" for all data');
  }

  const hint = formatHint(hints);

  // Step 8: Wrap with envelope
  return wrapResponse(body, {
    symbol,
    dataType: 'Options Chain',
    hint: hint || undefined,
  });
}
