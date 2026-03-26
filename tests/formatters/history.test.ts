/**
 * Tests for the history domain formatter.
 *
 * Covers: toOHLCVRows conversion, formatHistoryResponse with auto-aggregation,
 * stats header, max_rows truncation, explicit aggregate override, format=json,
 * multi-symbol, error handling, hints, and wrapResponse envelope.
 */

import { toOHLCVRows, formatHistoryResponse } from '../../src/mcp/formatters/history';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Generate N days of deterministic OHLCV data.
 * Uses sin() for predictable price movement.
 */
function generateDailyRows(n: number, startPrice = 150): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  let price = startPrice;
  for (let i = 0; i < n; i++) {
    const date = new Date(2025, 2, 14 + i); // Starting 2025-03-14
    const change = Math.sin(i * 0.1) * 2; // Deterministic movement
    price += change;
    rows.push({
      date: date.toISOString().split('T')[0],
      open: price - 1,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 40000000 + i * 100000,
    });
  }
  return rows;
}

/** Rows with some null close values (gap rows from Yahoo). */
const GAP_FIXTURE: Record<string, unknown>[] = [
  { date: '2025-03-14', open: 150, high: 152, low: 148, close: 151, volume: 40000000 },
  { date: '2025-03-15', open: 151, high: 153, low: 149, close: null, volume: 0 },
  { date: '2025-03-16', open: null, high: null, low: null, close: undefined, volume: 0 },
  { date: '2025-03-17', open: 152, high: 154, low: 150, close: 153, volume: 42000000 },
];

/** Rows where date is a Date object (intraday scenario). Use UTC dates to avoid timezone issues. */
const DATE_OBJECT_FIXTURE: Record<string, unknown>[] = [
  { date: new Date(Date.UTC(2025, 2, 14, 12)), open: 150, high: 152, low: 148, close: 151, volume: 40000000 },
  { date: new Date(Date.UTC(2025, 2, 15, 12)), open: 151, high: 153, low: 149, close: 152, volume: 41000000 },
];

/** Single row fixture. */
const SINGLE_ROW: Record<string, unknown>[] = [
  { date: '2025-03-14', open: 150, high: 152, low: 148, close: 151, volume: 40000000 },
];

// ---------------------------------------------------------------------------
// toOHLCVRows
// ---------------------------------------------------------------------------

describe('toOHLCVRows', () => {
  it('converts standard daily rows to OHLCVRow[]', () => {
    const rows = generateDailyRows(5);
    const result = toOHLCVRows(rows);
    expect(result).toHaveLength(5);
    expect(result[0]).toHaveProperty('date');
    expect(result[0]).toHaveProperty('open');
    expect(result[0]).toHaveProperty('high');
    expect(result[0]).toHaveProperty('low');
    expect(result[0]).toHaveProperty('close');
    expect(result[0]).toHaveProperty('volume');
    // All values should be numbers
    expect(typeof result[0].open).toBe('number');
    expect(typeof result[0].close).toBe('number');
    expect(typeof result[0].volume).toBe('number');
  });

  it('filters out rows where close is null', () => {
    const result = toOHLCVRows(GAP_FIXTURE);
    // 2 rows with valid close, 2 with null/undefined
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2025-03-14');
    expect(result[1].date).toBe('2025-03-17');
  });

  it('handles Date objects in date field', () => {
    const result = toOHLCVRows(DATE_OBJECT_FIXTURE);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2025-03-14');
    expect(result[1].date).toBe('2025-03-15');
  });

  it('coerces string numbers to Number', () => {
    const rows = [
      { date: '2025-03-14', open: '150.5', high: '152.3', low: '148.1', close: '151.2', volume: '40000000' },
    ];
    const result = toOHLCVRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].open).toBe(150.5);
    expect(result[0].close).toBe(151.2);
    expect(result[0].volume).toBe(40000000);
  });

  it('returns empty array for empty input', () => {
    expect(toOHLCVRows([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// formatHistoryResponse
// ---------------------------------------------------------------------------

describe('formatHistoryResponse', () => {
  it('1y period auto-aggregates to weekly table (~52 rows)', () => {
    const data = { AAPL: generateDailyRows(252) };
    const result = formatHistoryResponse(data, { period: '1y' });

    // Should contain a table
    expect(result).toContain('|Date|');
    expect(result).toContain('weekly OHLCV');

    // Count data rows (lines starting with |, excluding header and separator)
    const lines = result.split('\n');
    const tableRows = lines.filter(
      (l) => l.startsWith('|') && !l.startsWith('|Date|') && !l.includes('---')
    );
    // Weekly aggregation of 252 days should give roughly 36-52 rows
    expect(tableRows.length).toBeGreaterThanOrEqual(30);
    expect(tableRows.length).toBeLessThanOrEqual(55);
  });

  it('5d period stays daily', () => {
    const data = { AAPL: generateDailyRows(5) };
    const result = formatHistoryResponse(data, { period: '5d' });

    expect(result).toContain('daily OHLCV');

    const lines = result.split('\n');
    const tableRows = lines.filter(
      (l) => l.startsWith('|') && !l.startsWith('|Date|') && !l.includes('---')
    );
    expect(tableRows).toHaveLength(5);
  });

  it('max_rows=20 limits output to 20 data rows', () => {
    const data = { AAPL: generateDailyRows(252) };
    const result = formatHistoryResponse(data, { period: '1y', max_rows: 20 });

    const lines = result.split('\n');
    const tableRows = lines.filter(
      (l) => l.startsWith('|') && !l.startsWith('|Date|') && !l.includes('---')
    );
    expect(tableRows).toHaveLength(20);
  });

  it('max_rows slices from end (keeps recent data)', () => {
    const rawRows = generateDailyRows(100);
    const lastDate = rawRows[rawRows.length - 1].date as string;
    const data = { AAPL: rawRows };
    const result = formatHistoryResponse(data, {
      period: '3mo',
      aggregate: 'daily',
      max_rows: 10,
    });

    // The last date in the table should be the last date in the raw data
    expect(result).toContain(lastDate);
  });

  it('include_stats=true (default) shows stats header', () => {
    const data = { AAPL: generateDailyRows(30) };
    const result = formatHistoryResponse(data, { period: '1mo' });

    expect(result).toContain('Stats:');
    expect(result).toContain('Return:');
    expect(result).toContain('Vol:');
    expect(result).toContain('MaxDD:');
    expect(result).toContain('AvgVol:');
  });

  it('include_stats=false omits stats header', () => {
    const data = { AAPL: generateDailyRows(30) };
    const result = formatHistoryResponse(data, { period: '1mo', include_stats: false });

    expect(result).not.toContain('Stats:');
  });

  it('stats computed from raw data not aggregated', () => {
    // With 252 daily rows auto-aggregated to weekly, the annualized vol should
    // be computed from daily returns (sqrt(252) scaling). If incorrectly computed
    // from weekly data, it would be much lower.
    const data = { AAPL: generateDailyRows(252) };
    const result = formatHistoryResponse(data, { period: '1y', format: 'json' });
    const parsed = JSON.parse(result);
    const stats = parsed.AAPL.stats;

    // Annualized vol should be in reasonable range for daily data
    expect(stats.annualizedVol).toBeGreaterThan(1);
    expect(stats.annualizedVol).toBeLessThan(100);
  });

  it("explicit aggregate='monthly' overrides auto for 1y period", () => {
    const data = { AAPL: generateDailyRows(252) };
    const result = formatHistoryResponse(data, { period: '1y', aggregate: 'monthly' });

    expect(result).toContain('monthly OHLCV');
  });

  it("explicit aggregate='daily' prevents aggregation", () => {
    const data = { AAPL: generateDailyRows(60) };
    const result = formatHistoryResponse(data, {
      period: '1y',
      aggregate: 'daily',
      max_rows: 100, // Raise limit to see all rows
    });

    expect(result).toContain('daily OHLCV');

    const lines = result.split('\n');
    const tableRows = lines.filter(
      (l) => l.startsWith('|') && !l.startsWith('|Date|') && !l.includes('---')
    );
    expect(tableRows).toHaveLength(60);
  });

  it('format=json returns valid JSON with expected fields', () => {
    const data = { AAPL: generateDailyRows(30) };
    const result = formatHistoryResponse(data, { period: '1mo', format: 'json' });

    const parsed = JSON.parse(result);
    expect(parsed.AAPL).toBeDefined();
    expect(parsed.AAPL.symbol).toBe('AAPL');
    expect(parsed.AAPL.period).toBe('1mo');
    expect(parsed.AAPL.aggregation).toBeDefined();
    expect(Array.isArray(parsed.AAPL.rows)).toBe(true);
    expect(parsed.AAPL.stats).toBeDefined();
  });

  it('format=json rows are OHLCVRow objects (no raw/fmt nesting)', () => {
    const data = { AAPL: generateDailyRows(5) };
    const result = formatHistoryResponse(data, {
      period: '5d',
      format: 'json',
      aggregate: 'daily',
    });

    const parsed = JSON.parse(result);
    const row = parsed.AAPL.rows[0];
    expect(typeof row.date).toBe('string');
    expect(typeof row.open).toBe('number');
    expect(typeof row.high).toBe('number');
    expect(typeof row.low).toBe('number');
    expect(typeof row.close).toBe('number');
    expect(typeof row.volume).toBe('number');
    // No nesting
    expect(row.open).not.toHaveProperty('raw');
  });

  it('empty data produces graceful response', () => {
    const data = { AAPL: [] as Record<string, unknown>[] };
    const result = formatHistoryResponse(data, { period: '1y' });

    // Should not crash, should mention no data
    expect(result).toBeTruthy();
    expect(result.toLowerCase()).toMatch(/no.*data|no.*history/i);
  });

  it('single row produces single-row table', () => {
    const data = { AAPL: SINGLE_ROW };
    const result = formatHistoryResponse(data, { period: '1d', aggregate: 'daily' });

    const lines = result.split('\n');
    const tableRows = lines.filter(
      (l) => l.startsWith('|') && !l.startsWith('|Date|') && !l.includes('---')
    );
    expect(tableRows).toHaveLength(1);
  });

  it('hint when truncated by max_rows', () => {
    const data = { AAPL: generateDailyRows(100) };
    const result = formatHistoryResponse(data, {
      period: '3mo',
      aggregate: 'daily',
      max_rows: 10,
    });

    expect(result).toContain('max_rows=');
  });

  it('hint when auto-aggregated', () => {
    const data = { AAPL: generateDailyRows(252) };
    const result = formatHistoryResponse(data, { period: '1y' });

    expect(result).toContain('Aggregated to');
  });

  it('wrapResponse applied: output contains date header', () => {
    const data = { AAPL: generateDailyRows(10) };
    const result = formatHistoryResponse(data, { period: '5d' });

    // wrapResponse adds ISO date to header
    const today = new Date().toISOString().slice(0, 10);
    expect(result).toContain(today);
  });

  it('multi-symbol produces separate sections', () => {
    const data = {
      AAPL: generateDailyRows(30),
      MSFT: generateDailyRows(30, 300),
    };
    const result = formatHistoryResponse(data, { period: '1mo' });

    expect(result).toContain('AAPL');
    expect(result).toContain('MSFT');
    // Both should have table headers
    const dateHeaders = result.split('|Date|');
    expect(dateHeaders.length).toBeGreaterThanOrEqual(3); // 2 tables + 1 initial split
  });

  it('multi-symbol with error shows inline error', () => {
    const data = {
      AAPL: generateDailyRows(30),
      INVALID: 'Symbol not found',
    };
    const result = formatHistoryResponse(data, { period: '1mo' });

    expect(result).toContain('AAPL');
    expect(result).toContain('INVALID | Error: Symbol not found');
  });
});
