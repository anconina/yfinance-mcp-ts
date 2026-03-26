/**
 * History domain formatter for get_stock_history.
 *
 * Transforms raw Yahoo history data (arrays of OHLCV objects per symbol) into
 * auto-aggregated markdown tables with pre-computed statistics. The pipeline:
 * convert -> stats (on raw) -> aggregate -> slice -> render.
 *
 * Stats are always computed from raw daily data BEFORE aggregation to ensure
 * correct annualized volatility (sqrt(252) scaling assumes daily returns).
 *
 * Imports Phase 1 utilities from the barrel index.
 */

import {
  formatCompact,
  toMarkdownTable,
  wrapResponse,
  serializeResponse,
  formatHint,
  FormatType,
  DEFAULT_MAX_ROWS,
  OHLCVRow,
  PriceStats,
  aggregateOHLCV,
  computeStats,
  autoSelectInterval,
} from './index';

/** Options for history response formatting. */
export interface HistoryFormatOptions {
  period?: string;
  aggregate?: 'daily' | 'weekly' | 'monthly' | 'auto';
  max_rows?: number;
  include_stats?: boolean;
  format?: FormatType;
}

/**
 * Convert raw Yahoo history rows into typed OHLCVRow[].
 *
 * - Filters out rows where `close` is null/undefined (gap rows from Yahoo)
 * - Handles `date` as string, Date object, or numeric timestamp
 * - Coerces OHLCV fields to Number() with fallback to 0
 *
 * @param rawRows - Array of raw history objects from Yahoo
 * @returns Typed OHLCVRow array
 */
export function toOHLCVRows(rawRows: Array<Record<string, unknown>>): OHLCVRow[] {
  const result: OHLCVRow[] = [];

  for (const row of rawRows) {
    // Filter out gap rows (null/undefined close)
    if (row.close === null || row.close === undefined) continue;

    // Handle date field: string, Date object, or numeric timestamp
    let dateStr: string;
    const d = row.date;
    if (typeof d === 'string') {
      dateStr = d;
    } else if (d instanceof Date) {
      dateStr = d.toISOString().slice(0, 10);
    } else if (typeof d === 'number') {
      dateStr = new Date(d * 1000).toISOString().slice(0, 10);
    } else {
      // Fallback: convert to string
      dateStr = String(d);
    }

    result.push({
      date: dateStr,
      open: Number(row.open) || 0,
      high: Number(row.high) || 0,
      low: Number(row.low) || 0,
      close: Number(row.close) || 0,
      volume: Number(row.volume) || 0,
    });
  }

  return result;
}

/**
 * Render a stats header line from computed price statistics.
 *
 * Format: Stats: Return: +5.23% | Vol: 18.45% | MaxDD: -12.34% | AvgVol: 45.2M
 */
function renderStatsHeader(stats: PriceStats): string {
  const returnPct = formatCompact(stats.returnPct, 'percent');
  const vol = stats.annualizedVol.toFixed(2) + '%';
  const maxDD = formatCompact(stats.maxDrawdown, 'percent');
  const avgVol = formatCompact(stats.avgVolume, 'compact');

  return `Stats: Return: ${returnPct} | Vol: ${vol} | MaxDD: ${maxDD} | AvgVol: ${avgVol}`;
}

/**
 * Render OHLCV rows as a markdown table.
 *
 * Headers: Date | Open | High | Low | Close | Vol
 * Alignment: left for Date, right for all numeric columns
 */
function renderHistoryTable(rows: OHLCVRow[]): string {
  const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Vol'];
  const align: ('l' | 'r')[] = ['l', 'r', 'r', 'r', 'r', 'r'];

  const formattedRows = rows.map((row) => [
    row.date,
    formatCompact(row.open, 'price'),
    formatCompact(row.high, 'price'),
    formatCompact(row.low, 'price'),
    formatCompact(row.close, 'price'),
    formatCompact(row.volume, 'compact'),
  ]);

  return toMarkdownTable(headers, formattedRows, align);
}

/**
 * Format history data for a single symbol.
 *
 * Pipeline (critical ordering):
 * 1. Convert raw rows to OHLCVRow[]
 * 2. Compute stats on RAW rows (before aggregation)
 * 3. Determine aggregation level (auto or explicit)
 * 4. Aggregate if not daily
 * 5. Slice to max_rows (from end, keeping most recent)
 * 6. Render subheader, stats, table
 *
 * @returns Object with body string and hints array
 */
function formatSingleHistory(
  symbol: string,
  rawRows: Array<Record<string, unknown>>,
  options: HistoryFormatOptions
): { body: string; hints: string[] } {
  // a. Convert
  const ohlcvRows = toOHLCVRows(rawRows);

  if (ohlcvRows.length === 0) {
    return { body: `${symbol} | No history data available`, hints: [] };
  }

  // b. Stats on RAW rows BEFORE aggregation
  const stats = options.include_stats !== false ? computeStats(ohlcvRows) : null;

  // c. Determine aggregation level
  let level: 'daily' | 'weekly' | 'monthly';
  const userExplicit = options.aggregate && options.aggregate !== 'auto';
  if (userExplicit) {
    level = options.aggregate as 'daily' | 'weekly' | 'monthly';
  } else {
    level = autoSelectInterval(options.period || '1y');
  }

  // d. Aggregate
  let displayRows: OHLCVRow[];
  if (level !== 'daily') {
    displayRows = aggregateOHLCV(ohlcvRows, level);
  } else {
    displayRows = ohlcvRows;
  }

  // e. Slice (from end, keeping most recent)
  const maxRows = options.max_rows || DEFAULT_MAX_ROWS;
  const totalRows = displayRows.length;
  const truncated = totalRows > maxRows;
  if (truncated) {
    displayRows = displayRows.slice(-maxRows);
  }

  // f. Build body parts
  const unitLabel = level === 'weekly' ? 'weeks' : level === 'monthly' ? 'months' : 'days';
  const firstDate = displayRows[0].date;
  const lastDate = displayRows[displayRows.length - 1].date;
  const count = displayRows.length;

  const subheader = `${symbol} | ${level} OHLCV | ${firstDate} to ${lastDate} | ${count} ${unitLabel}`;

  const bodyParts: string[] = [subheader];
  if (stats) {
    bodyParts.push(renderStatsHeader(stats));
  }
  bodyParts.push(renderHistoryTable(displayRows));

  const body = bodyParts.join('\n\n');

  // g. Build hints
  const hints: string[] = [];
  if (truncated) {
    hints.push(`Use max_rows=${totalRows} for all data or narrow the period`);
  }
  if (!userExplicit && level !== 'daily') {
    hints.push(`Aggregated to ${level}. Use aggregate="daily" for raw data`);
  }

  return { body, hints };
}

/**
 * Top-level format function for get_stock_history.
 *
 * Handles single and multi-symbol queries, error entries (string values),
 * format routing (text vs JSON), and response envelope wrapping.
 *
 * @param data - Raw Yahoo history data keyed by symbol (values are arrays or error strings)
 * @param options - Format options controlling aggregation, stats, max rows, format
 * @returns Formatted response string ready to return to the LLM
 */
export function formatHistoryResponse(
  data: Record<string, unknown>,
  options: HistoryFormatOptions = {}
): string {
  const symbols = Object.keys(data);

  if (symbols.length === 0) {
    return wrapResponse('No history data available', { dataType: 'History' });
  }

  // JSON path
  if (options.format === 'json') {
    const result: Record<string, unknown> = {};

    for (const sym of symbols) {
      const symData = data[sym];
      if (typeof symData === 'string') {
        result[sym] = { error: symData };
        continue;
      }
      if (!Array.isArray(symData)) {
        result[sym] = { error: 'Invalid data format' };
        continue;
      }

      const ohlcvRows = toOHLCVRows(symData);
      const stats = options.include_stats !== false ? computeStats(ohlcvRows) : null;

      // Determine aggregation
      let level: 'daily' | 'weekly' | 'monthly';
      const userExplicit = options.aggregate && options.aggregate !== 'auto';
      if (userExplicit) {
        level = options.aggregate as 'daily' | 'weekly' | 'monthly';
      } else {
        level = autoSelectInterval(options.period || '1y');
      }

      let displayRows: OHLCVRow[];
      if (level !== 'daily') {
        displayRows = aggregateOHLCV(ohlcvRows, level);
      } else {
        displayRows = ohlcvRows;
      }

      // Slice
      const maxRows = options.max_rows || DEFAULT_MAX_ROWS;
      if (displayRows.length > maxRows) {
        displayRows = displayRows.slice(-maxRows);
      }

      const entry: Record<string, unknown> = {
        symbol: sym,
        period: options.period || '1y',
        aggregation: level,
        rows: displayRows,
      };
      if (stats) {
        entry.stats = stats;
      }
      result[sym] = entry;
    }

    return serializeResponse(result, 'json');
  }

  // Text path
  const sections: string[] = [];
  const allHints: string[] = [];
  let lastLevel = 'daily';

  for (const sym of symbols) {
    const symData = data[sym];
    if (typeof symData === 'string') {
      sections.push(`${sym} | Error: ${symData}`);
      continue;
    }
    if (!Array.isArray(symData)) {
      sections.push(`${sym} | Error: Invalid data format`);
      continue;
    }

    const { body, hints } = formatSingleHistory(sym, symData, options);
    sections.push(body);
    allHints.push(...hints);

    // Track the aggregation level for dataType in wrapResponse
    const userExplicit = options.aggregate && options.aggregate !== 'auto';
    if (userExplicit) {
      lastLevel = options.aggregate as string;
    } else {
      lastLevel = autoSelectInterval(options.period || '1y');
    }
  }

  const body = sections.join('\n\n');
  const hint = formatHint(allHints);

  if (symbols.length === 1) {
    return wrapResponse(body, {
      symbol: symbols[0],
      dataType: lastLevel + ' OHLCV',
      hint: hint || undefined,
    });
  }

  return wrapResponse(body, {
    dataType: 'History',
    hint: hint || undefined,
  });
}
