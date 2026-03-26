import {
  formatSummaryResponse,
  renderGroups,
} from '../../src/mcp/formatters/summary';

// --- Fixtures ---

/**
 * Complete AAPL-like summaryDetail fixture with all fields.
 * All numeric values use Yahoo's {raw, fmt} pair format.
 */
const COMPLETE_FIXTURE = {
  AAPL: {
    maxAge: 1,
    // Valuation
    trailingPE: { raw: 28.5, fmt: '28.50' },
    forwardPE: { raw: 26.2, fmt: '26.20' },
    priceToSalesTrailing12Months: { raw: 7.1, fmt: '7.10' },
    marketCap: { raw: 2780000000000, fmt: '2.78T' },
    // Yield
    dividendRate: { raw: 0.96, fmt: '0.96' },
    dividendYield: { raw: 0.0054, fmt: '0.54%' },
    payoutRatio: { raw: 0.1533, fmt: '15.33%' },
    exDividendDate: { raw: 1699574400, fmt: '2023-11-10' },
    // Trading
    bid: { raw: 178.40, fmt: '178.40' },
    bidSize: { raw: 800, fmt: '800' },
    ask: { raw: 178.50, fmt: '178.50' },
    askSize: { raw: 1200, fmt: '1,200' },
    // Range
    dayLow: { raw: 176.12, fmt: '176.12' },
    dayHigh: { raw: 179.80, fmt: '179.80' },
    fiftyTwoWeekLow: { raw: 124.17, fmt: '124.17' },
    fiftyTwoWeekHigh: { raw: 198.23, fmt: '198.23' },
    // Volume
    volume: { raw: 45200000, fmt: '45.2M' },
    averageVolume10days: { raw: 52300000, fmt: '52.3M' },
    averageVolume: { raw: 58400000, fmt: '58.4M' },
    // Averages
    fiftyDayAverage: { raw: 175.32, fmt: '175.32' },
    twoHundredDayAverage: { raw: 168.45, fmt: '168.45' },
  },
};

/** Growth stock fixture with NO dividend fields (like AMZN). */
const NO_DIVIDEND_FIXTURE = {
  AMZN: {
    maxAge: 1,
    trailingPE: { raw: 62.3, fmt: '62.30' },
    forwardPE: { raw: 45.1, fmt: '45.10' },
    priceToSalesTrailing12Months: { raw: 3.2, fmt: '3.20' },
    marketCap: { raw: 1850000000000, fmt: '1.85T' },
    // No dividendRate, dividendYield, payoutRatio, exDividendDate
    bid: { raw: 185.20, fmt: '185.20' },
    bidSize: { raw: 500, fmt: '500' },
    ask: { raw: 185.30, fmt: '185.30' },
    askSize: { raw: 600, fmt: '600' },
    dayLow: { raw: 183.50, fmt: '183.50' },
    dayHigh: { raw: 186.40, fmt: '186.40' },
    fiftyTwoWeekLow: { raw: 118.35, fmt: '118.35' },
    fiftyTwoWeekHigh: { raw: 189.77, fmt: '189.77' },
    volume: { raw: 32100000, fmt: '32.1M' },
    averageVolume10days: { raw: 41200000, fmt: '41.2M' },
    averageVolume: { raw: 47500000, fmt: '47.5M' },
    fiftyDayAverage: { raw: 181.42, fmt: '181.42' },
    twoHundredDayAverage: { raw: 165.89, fmt: '165.89' },
  },
};

/** Multi-symbol fixture. */
const MULTI_FIXTURE = {
  AAPL: COMPLETE_FIXTURE.AAPL,
  MSFT: {
    maxAge: 1,
    trailingPE: { raw: 35.2, fmt: '35.20' },
    forwardPE: { raw: 30.1, fmt: '30.10' },
    priceToSalesTrailing12Months: { raw: 12.8, fmt: '12.80' },
    marketCap: { raw: 3060000000000, fmt: '3.06T' },
    dayLow: { raw: 406.85, fmt: '406.85' },
    dayHigh: { raw: 413.50, fmt: '413.50' },
    fiftyTwoWeekLow: { raw: 309.45, fmt: '309.45' },
    fiftyTwoWeekHigh: { raw: 420.82, fmt: '420.82' },
    volume: { raw: 23100000, fmt: '23.1M' },
    averageVolume: { raw: 28900000, fmt: '28.9M' },
    fiftyDayAverage: { raw: 405.12, fmt: '405.12' },
    twoHundredDayAverage: { raw: 385.67, fmt: '385.67' },
  },
};

/** Error fixture. */
const ERROR_FIXTURE = {
  AAPL: COMPLETE_FIXTURE.AAPL,
  INVALID: 'No data found for symbol',
};

/** exDividendDate as Unix epoch number (not {raw,fmt} pair) */
const EPOCH_DATE_FIXTURE = {
  TEST: {
    exDividendDate: { raw: 1699574400, fmt: '2023-11-10' },
    dividendRate: { raw: 0.96, fmt: '0.96' },
    dividendYield: { raw: 0.0054, fmt: '0.54%' },
  },
};

// --- Tests ---

describe('renderGroups', () => {
  it('renders all 6 groups from complete AAPL-like data', () => {
    // Simulate what formatSummaryResponse does: flatten the Yahoo object
    const { flattenYahooObject } = require('../../src/mcp/formatters/extract');
    const flat = flattenYahooObject(COMPLETE_FIXTURE.AAPL);
    // Handle exDividendDate epoch conversion
    if (typeof flat.exDividendDate === 'number') {
      flat.exDividendDate = new Date(flat.exDividendDate * 1000).toISOString().slice(0, 10);
    }

    const result = renderGroups(flat, [
      {
        label: 'Valuation',
        fields: [
          { key: 'trailingPE', display: 'P/E', context: 'price' as const },
          { key: 'forwardPE', display: 'Fwd P/E', context: 'price' as const },
          { key: 'priceToSalesTrailing12Months', display: 'P/S', context: 'price' as const },
          { key: 'marketCap', display: 'Mkt Cap', context: 'compact' as const },
        ],
      },
      {
        label: 'Yield',
        fields: [
          { key: 'dividendRate', display: 'Div', context: 'price' as const },
          { key: 'dividendYield', display: 'Yield', context: 'percent' as const },
          { key: 'payoutRatio', display: 'Payout', context: 'percent' as const },
          { key: 'exDividendDate', display: 'Ex-Date', context: 'price' as const },
        ],
      },
      {
        label: 'Trading',
        fields: [
          { key: 'bid', display: 'Bid', context: 'price' as const },
          { key: 'bidSize', display: 'x', context: 'compact' as const },
          { key: 'ask', display: 'Ask', context: 'price' as const },
          { key: 'askSize', display: 'x', context: 'compact' as const },
        ],
      },
      {
        label: 'Range',
        fields: [
          { key: 'dayLow', display: 'Day Low', context: 'price' as const },
          { key: 'dayHigh', display: 'Day High', context: 'price' as const },
          { key: 'fiftyTwoWeekLow', display: '52W Low', context: 'price' as const },
          { key: 'fiftyTwoWeekHigh', display: '52W High', context: 'price' as const },
        ],
      },
      {
        label: 'Volume',
        fields: [
          { key: 'volume', display: 'Today', context: 'compact' as const },
          { key: 'averageVolume10days', display: 'Avg(10d)', context: 'compact' as const },
          { key: 'averageVolume', display: 'Avg(3mo)', context: 'compact' as const },
        ],
      },
      {
        label: 'Averages',
        fields: [
          { key: 'fiftyDayAverage', display: '50-Day', context: 'price' as const },
          { key: 'twoHundredDayAverage', display: '200-Day', context: 'price' as const },
        ],
      },
    ]);

    const lines = result.split('\n');
    expect(lines).toHaveLength(6);
    expect(lines[0]).toMatch(/^Valuation:/);
    expect(lines[1]).toMatch(/^Yield:/);
    expect(lines[2]).toMatch(/^Trading:/);
    expect(lines[3]).toMatch(/^Range:/);
    expect(lines[4]).toMatch(/^Volume:/);
    expect(lines[5]).toMatch(/^Averages:/);
  });

  it('omits Yield group when no dividend fields present', () => {
    const { flattenYahooObject } = require('../../src/mcp/formatters/extract');
    const flat = flattenYahooObject(NO_DIVIDEND_FIXTURE.AMZN);

    const result = renderGroups(flat, [
      {
        label: 'Yield',
        fields: [
          { key: 'dividendRate', display: 'Div', context: 'price' as const },
          { key: 'dividendYield', display: 'Yield', context: 'percent' as const },
          { key: 'payoutRatio', display: 'Payout', context: 'percent' as const },
          { key: 'exDividendDate', display: 'Ex-Date', context: 'price' as const },
        ],
      },
      {
        label: 'Valuation',
        fields: [
          { key: 'trailingPE', display: 'P/E', context: 'price' as const },
        ],
      },
    ]);

    expect(result).not.toContain('Yield:');
    expect(result).toContain('Valuation:');
  });
});

describe('formatSummaryResponse', () => {
  it('text output contains group labels', () => {
    const result = formatSummaryResponse(COMPLETE_FIXTURE);
    expect(result).toContain('Valuation:');
    expect(result).toContain('Yield:');
    expect(result).toContain('Trading:');
    expect(result).toContain('Range:');
    expect(result).toContain('Volume:');
    expect(result).toContain('Averages:');
  });

  it('text output contains formatted values', () => {
    const result = formatSummaryResponse(COMPLETE_FIXTURE);
    expect(result).toContain('P/E: 28.50');
    expect(result).toContain('Fwd P/E: 26.20');
    expect(result).toContain('Mkt Cap:');
    expect(result).toContain('2.78T');
    expect(result).toContain('Day Low: 176.12');
    expect(result).toContain('Day High: 179.80');
  });

  it('multi-symbol produces separate sections', () => {
    const result = formatSummaryResponse(MULTI_FIXTURE);
    // Both symbols' data should be present
    expect(result).toContain('P/E: 28.50'); // AAPL
    expect(result).toContain('P/E: 35.20'); // MSFT
    // Sections separated by blank lines
    const parts = result.split('\n\n');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it('format=json returns serialized data', () => {
    const result = formatSummaryResponse(COMPLETE_FIXTURE, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('AAPL');
    expect(typeof parsed.AAPL.trailingPE).toBe('number');
    expect(parsed.AAPL.trailingPE).toBe(28.5);
    expect(typeof parsed.AAPL.marketCap).toBe('number');
    expect(parsed.AAPL.marketCap).toBe(2780000000000);
  });

  it('error string per symbol handled gracefully', () => {
    const result = formatSummaryResponse(ERROR_FIXTURE);
    expect(result).toContain('INVALID | Error: No data found for symbol');
    // AAPL should still render normally
    expect(result).toContain('Valuation:');
    expect(result).toContain('P/E: 28.50');
  });

  it('empty data returns "No summary data available"', () => {
    const result = formatSummaryResponse({});
    expect(result).toBe('No summary data available');
  });

  it('exDividendDate rendered as date string, not Unix epoch number', () => {
    const result = formatSummaryResponse(EPOCH_DATE_FIXTURE);
    // Should show ISO date, not the raw epoch number
    expect(result).toContain('Ex-Date: 2023-11-10');
    expect(result).not.toContain('1699574400');
  });

  it('response starts with header containing symbol and data type', () => {
    const result = formatSummaryResponse(COMPLETE_FIXTURE);
    const firstLine = result.split('\n')[0];
    expect(firstLine).toContain('AAPL');
    expect(firstLine).toContain('Summary Detail');
    expect(firstLine).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('format=json exDividendDate is ISO date string, not epoch', () => {
    const result = formatSummaryResponse(EPOCH_DATE_FIXTURE, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.TEST.exDividendDate).toBe('2023-11-10');
  });
});
