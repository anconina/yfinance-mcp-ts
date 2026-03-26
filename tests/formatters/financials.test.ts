import {
  computeYoY,
  extractMetrics,
  formatFinancialsResponse,
} from '../../src/mcp/formatters/financials';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Build a single timeseries result object matching the Yahoo fundamentals
 * API response shape.
 *
 * @param symbol - Ticker symbol
 * @param metricName - Full prefixed metric name (e.g., 'annualTotalRevenue')
 * @param dataPoints - Array of { date, periodType, value } objects
 */
function makeTimeseriesEntry(
  symbol: string,
  metricName: string,
  dataPoints: Array<{ date: string; periodType: string; value: number }>
): Record<string, unknown> {
  return {
    meta: { symbol: [symbol], type: [metricName] },
    timestamp: dataPoints.map(() => 0),
    [metricName]: dataPoints.map((dp) => ({
      asOfDate: dp.date,
      periodType: dp.periodType,
      reportedValue: { raw: dp.value, fmt: String(dp.value) },
    })),
  };
}

// ---------------------------------------------------------------------------
// Realistic AAPL-like income statement fixtures (3 years)
// ---------------------------------------------------------------------------

const INCOME_TIMESERIES = [
  makeTimeseriesEntry('AAPL', 'annualTotalRevenue', [
    { date: '2022-09-24', periodType: '12M', value: 394328000000 },
    { date: '2023-09-30', periodType: '12M', value: 383285000000 },
    { date: '2024-09-28', periodType: '12M', value: 391035000000 },
  ]),
  makeTimeseriesEntry('AAPL', 'annualCostOfRevenue', [
    { date: '2022-09-24', periodType: '12M', value: 223546000000 },
    { date: '2023-09-30', periodType: '12M', value: 214137000000 },
    { date: '2024-09-28', periodType: '12M', value: 210352000000 },
  ]),
  makeTimeseriesEntry('AAPL', 'annualGrossProfit', [
    { date: '2022-09-24', periodType: '12M', value: 170782000000 },
    { date: '2023-09-30', periodType: '12M', value: 169148000000 },
    { date: '2024-09-28', periodType: '12M', value: 180683000000 },
  ]),
  makeTimeseriesEntry('AAPL', 'annualOperatingIncome', [
    { date: '2022-09-24', periodType: '12M', value: 119437000000 },
    { date: '2023-09-30', periodType: '12M', value: 114301000000 },
    { date: '2024-09-28', periodType: '12M', value: 123216000000 },
  ]),
  makeTimeseriesEntry('AAPL', 'annualNetIncome', [
    { date: '2022-09-24', periodType: '12M', value: 99803000000 },
    { date: '2023-09-30', periodType: '12M', value: 96995000000 },
    { date: '2024-09-28', periodType: '12M', value: 93736000000 },
  ]),
  makeTimeseriesEntry('AAPL', 'annualDilutedEPS', [
    { date: '2022-09-24', periodType: '12M', value: 6.15 },
    { date: '2023-09-30', periodType: '12M', value: 6.13 },
    { date: '2024-09-28', periodType: '12M', value: 6.08 },
  ]),
  makeTimeseriesEntry('AAPL', 'annualEBITDA', [
    { date: '2022-09-24', periodType: '12M', value: 130541000000 },
    { date: '2023-09-30', periodType: '12M', value: 125820000000 },
    { date: '2024-09-28', periodType: '12M', value: 133500000000 },
  ]),
  makeTimeseriesEntry('AAPL', 'annualOperatingExpense', [
    { date: '2022-09-24', periodType: '12M', value: 51345000000 },
    { date: '2023-09-30', periodType: '12M', value: 54847000000 },
    { date: '2024-09-28', periodType: '12M', value: 57467000000 },
  ]),
];

// Balance sheet entries (subset)
const BALANCE_TIMESERIES = [
  makeTimeseriesEntry('AAPL', 'annualTotalAssets', [
    { date: '2022-09-24', periodType: '12M', value: 352755000000 },
    { date: '2023-09-30', periodType: '12M', value: 352583000000 },
    { date: '2024-09-28', periodType: '12M', value: 364980000000 },
  ]),
  makeTimeseriesEntry('AAPL', 'annualStockholdersEquity', [
    { date: '2022-09-24', periodType: '12M', value: 50672000000 },
    { date: '2023-09-30', periodType: '12M', value: 62146000000 },
    { date: '2024-09-28', periodType: '12M', value: 56950000000 },
  ]),
];

// Cash flow entries (subset)
const CASHFLOW_TIMESERIES = [
  makeTimeseriesEntry('AAPL', 'annualOperatingCashFlow', [
    { date: '2022-09-24', periodType: '12M', value: 122151000000 },
    { date: '2023-09-30', periodType: '12M', value: 110543000000 },
    { date: '2024-09-28', periodType: '12M', value: 118254000000 },
  ]),
  makeTimeseriesEntry('AAPL', 'annualFreeCashFlow', [
    { date: '2022-09-24', periodType: '12M', value: 111443000000 },
    { date: '2023-09-30', periodType: '12M', value: 99584000000 },
    { date: '2024-09-28', periodType: '12M', value: 108807000000 },
  ]),
];

// Quarterly data
const QUARTERLY_TIMESERIES = [
  makeTimeseriesEntry('AAPL', 'quarterlyTotalRevenue', [
    { date: '2024-03-30', periodType: '3M', value: 90753000000 },
    { date: '2024-06-29', periodType: '3M', value: 85777000000 },
    { date: '2024-09-28', periodType: '3M', value: 94930000000 },
  ]),
  makeTimeseriesEntry('AAPL', 'quarterlyNetIncome', [
    { date: '2024-03-30', periodType: '3M', value: 23636000000 },
    { date: '2024-06-29', periodType: '3M', value: 21448000000 },
    { date: '2024-09-28', periodType: '3M', value: 14736000000 },
  ]),
];

// Full combined fixture
const FULL_FIXTURE = {
  AAPL: [
    ...INCOME_TIMESERIES,
    ...BALANCE_TIMESERIES,
    ...CASHFLOW_TIMESERIES,
  ],
};

// Metric defs for testing extractMetrics
const TEST_METRIC_DEFS = [
  { name: 'Revenue', metric: 'TotalRevenue', context: 'compact' as const },
  { name: 'Net Income', metric: 'NetIncome', context: 'compact' as const },
  { name: 'Diluted EPS', metric: 'DilutedEPS', context: 'eps' as const },
];

// ---------------------------------------------------------------------------
// Tests: computeYoY
// ---------------------------------------------------------------------------

describe('computeYoY', () => {
  it('returns positive growth percentage', () => {
    const result = computeYoY(110, 100);
    expect(result).toBe('+10.0%');
  });

  it('returns negative decline percentage', () => {
    const result = computeYoY(90, 100);
    expect(result).toBe('-10.0%');
  });

  it('returns dash for null current', () => {
    expect(computeYoY(null, 100)).toBe('-');
  });

  it('returns dash for null prior', () => {
    expect(computeYoY(100, null)).toBe('-');
  });

  it('returns dash for zero prior', () => {
    expect(computeYoY(100, 0)).toBe('-');
  });

  it('handles negative prior correctly (uses absolute value)', () => {
    // From -100 to -50 is a +50% improvement
    const result = computeYoY(-50, -100);
    expect(result).toBe('+50.0%');
  });
});

// ---------------------------------------------------------------------------
// Tests: extractMetrics
// ---------------------------------------------------------------------------

describe('extractMetrics', () => {
  it('extracts correct values from timeseries array and maps to display names', () => {
    const metrics = extractMetrics(INCOME_TIMESERIES, TEST_METRIC_DEFS, '12M');

    expect(metrics.has('Revenue')).toBe(true);
    expect(metrics.has('Net Income')).toBe(true);
    expect(metrics.has('Diluted EPS')).toBe(true);

    const revenue = metrics.get('Revenue')!;
    expect(revenue.values.get('2024-09-28')).toBe(391035000000);
    expect(revenue.values.get('2023-09-30')).toBe(383285000000);
    expect(revenue.values.get('2022-09-24')).toBe(394328000000);
  });

  it('strips annual/quarterly/trailing prefix correctly', () => {
    // The fixture uses 'annualTotalRevenue' but metric def says 'TotalRevenue'
    const metrics = extractMetrics(INCOME_TIMESERIES, TEST_METRIC_DEFS, '12M');
    expect(metrics.has('Revenue')).toBe(true);

    // Quarterly prefix
    const qMetrics = extractMetrics(
      QUARTERLY_TIMESERIES,
      [{ name: 'Revenue', metric: 'TotalRevenue', context: 'compact' as const }],
      '3M'
    );
    expect(qMetrics.has('Revenue')).toBe(true);
    expect(qMetrics.get('Revenue')!.values.size).toBe(3);
  });

  it('skips metrics with no matching timeseries object', () => {
    const defsWithMissing = [
      ...TEST_METRIC_DEFS,
      { name: 'Nonexistent', metric: 'NonexistentMetric', context: 'compact' as const },
    ];
    const metrics = extractMetrics(INCOME_TIMESERIES, defsWithMissing, '12M');
    expect(metrics.has('Nonexistent')).toBe(false);
    expect(metrics.size).toBe(3); // Only the 3 real metrics
  });

  it('filters by periodType correctly', () => {
    // Ask for quarterly (3M) from annual (12M) data -> should find nothing
    const metrics = extractMetrics(INCOME_TIMESERIES, TEST_METRIC_DEFS, '3M');
    expect(metrics.size).toBe(0);
  });

  it('preserves NumberContext from metric definition', () => {
    const metrics = extractMetrics(INCOME_TIMESERIES, TEST_METRIC_DEFS, '12M');
    expect(metrics.get('Revenue')!.context).toBe('compact');
    expect(metrics.get('Diluted EPS')!.context).toBe('eps');
  });
});

// ---------------------------------------------------------------------------
// Tests: formatFinancialsResponse
// ---------------------------------------------------------------------------

describe('formatFinancialsResponse', () => {
  it('income statement summary renders markdown table with YoY% column and 3 date columns newest-first', () => {
    const result = formatFinancialsResponse(
      { AAPL: INCOME_TIMESERIES },
      { type: 'income' }
    );

    // Should contain Income Statement header
    expect(result).toContain('Income Statement:');
    // Should contain markdown table separator
    expect(result).toContain('|---|');
    // Should have YoY% column
    expect(result).toContain('YoY%');
    // Dates should be newest-first (2024 before 2023 before 2022)
    const tableStart = result.indexOf('|Metric|');
    const headerLine = result.slice(tableStart).split('\n')[0];
    const columns = headerLine.split('|').filter(Boolean);
    // Columns: Metric, 2024, 2023, 2022, YoY%
    expect(columns[0]).toBe('Metric');
    expect(columns[1]).toBe('2024');
    expect(columns[2]).toBe('2023');
    expect(columns[3]).toBe('2022');
    expect(columns[4]).toBe('YoY%');
    // Should contain Revenue metric
    expect(result).toContain('Revenue');
    // Should contain Net Income metric
    expect(result).toContain('Net Income');
  });

  it('type="balance" filters to only balance sheet metrics', () => {
    const result = formatFinancialsResponse(FULL_FIXTURE, { type: 'balance' });

    expect(result).toContain('Balance Sheet:');
    expect(result).toContain('Total Assets');
    expect(result).toContain('Stockholders Equity');
    // Should NOT contain income or cashflow specific metrics
    expect(result).not.toContain('Income Statement:');
    expect(result).not.toContain('Cash Flow Statement:');
  });

  it('detail=full renders all available metrics from timeseries (not just curated)', () => {
    // Create a mix of income and balance data
    const result = formatFinancialsResponse(FULL_FIXTURE, { detail: 'full' });

    // Full mode renders "All Metrics:" header
    expect(result).toContain('All Metrics:');
    // Should contain metrics from multiple statement types
    expect(result).toContain('Total Revenue');
    expect(result).toContain('Net Income');
    expect(result).toContain('Total Assets');
    expect(result).toContain('Operating Cash Flow');
  });

  it('quarterly frequency extracts 3M periodType data', () => {
    const result = formatFinancialsResponse(
      { AAPL: QUARTERLY_TIMESERIES },
      { frequency: 'quarterly', type: 'income' }
    );

    // Should contain revenue data from quarterly fixture
    expect(result).toContain('Revenue');
    // Dates should reflect quarterly dates (2024 year columns)
    expect(result).toContain('2024');
  });

  it('missing metric data produces no row (not a row of dashes)', () => {
    // Only income data -- balance metrics should not appear as dash rows
    const result = formatFinancialsResponse(
      { AAPL: INCOME_TIMESERIES },
      { type: 'balance' }
    );

    // Balance Sheet section should not appear at all since no matching data
    expect(result).not.toContain('Balance Sheet:');
    // But should still have valid response envelope
    expect(result).toContain('Financials');
  });

  it('error string per symbol handled gracefully', () => {
    const data = {
      AAPL: INCOME_TIMESERIES,
      INVALID: 'No data found for symbol',
    };
    const result = formatFinancialsResponse(data, { type: 'income' });

    // Should contain AAPL's data
    expect(result).toContain('Income Statement:');
    // Should contain error message for INVALID
    expect(result).toContain('INVALID: Error - No data found for symbol');
  });

  it('format=json returns serialized normalized data', () => {
    const result = formatFinancialsResponse(FULL_FIXTURE, {
      format: 'json',
      type: 'income',
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('AAPL');
    expect(parsed.AAPL).toHaveProperty('Income Statement');
    // Should have Revenue with date-keyed values
    const incomeStmt = parsed.AAPL['Income Statement'];
    expect(incomeStmt).toHaveProperty('Revenue');
    expect(typeof incomeStmt.Revenue['2024-09-28']).toBe('number');
  });

  it('empty data array returns "No financials data available"', () => {
    const result = formatFinancialsResponse({ AAPL: [] });
    expect(result).toContain('No financials data available');
  });

  it('empty symbols object returns "No financials data available"', () => {
    const result = formatFinancialsResponse({});
    expect(result).toContain('No financials data available');
  });

  it('response includes envelope header with symbol and date', () => {
    const result = formatFinancialsResponse(
      { AAPL: INCOME_TIMESERIES },
      { type: 'income' }
    );
    const firstLine = result.split('\n')[0];
    expect(firstLine).toContain('AAPL');
    expect(firstLine).toContain('Financials');
    expect(firstLine).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('summary mode includes progressive disclosure hints', () => {
    const result = formatFinancialsResponse(
      { AAPL: INCOME_TIMESERIES },
      { type: 'income' }
    );
    expect(result).toContain('Tip:');
    expect(result).toContain('detail="full"');
    expect(result).toContain('frequency="quarterly"');
  });

  it('multi-symbol renders separate sections with symbol headers', () => {
    const data = {
      AAPL: INCOME_TIMESERIES,
      MSFT: INCOME_TIMESERIES, // Reuse AAPL data for simplicity
    };
    const result = formatFinancialsResponse(data, { type: 'income' });

    expect(result).toContain('--- AAPL ---');
    expect(result).toContain('--- MSFT ---');
  });

  it('type=all renders all three statement sections', () => {
    const result = formatFinancialsResponse(FULL_FIXTURE, { type: 'all' });

    expect(result).toContain('Income Statement:');
    expect(result).toContain('Balance Sheet:');
    expect(result).toContain('Cash Flow Statement:');
  });

  it('format=json with error symbol includes error object', () => {
    const data = {
      AAPL: INCOME_TIMESERIES,
      BAD: 'Symbol not found',
    };
    const result = formatFinancialsResponse(data, { format: 'json', type: 'income' });
    const parsed = JSON.parse(result);
    expect(parsed.BAD).toEqual({ error: 'Symbol not found' });
    expect(parsed.AAPL).toHaveProperty('Income Statement');
  });
});
