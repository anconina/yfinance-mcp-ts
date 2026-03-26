import { formatKeyStatsResponse } from '../../src/mcp/formatters/keystats';

// --- Fixtures ---

/**
 * Complete AAPL-like defaultKeyStatistics fixture with all fields.
 * All numeric values use Yahoo's {raw, fmt} pair format.
 */
const COMPLETE_FIXTURE = {
  AAPL: {
    maxAge: 1,
    // Valuation
    forwardPE: { raw: 26.2, fmt: '26.20' },
    pegRatio: { raw: 2.15, fmt: '2.15' },
    enterpriseToRevenue: { raw: 7.32, fmt: '7.32' },
    enterpriseToEbitda: { raw: 21.45, fmt: '21.45' },
    priceToBook: { raw: 45.8, fmt: '45.80' },
    // Profitability
    profitMargins: { raw: 0.2531, fmt: '25.31%' },
    operatingMargins: { raw: 0.3029, fmt: '30.29%' },
    returnOnEquity: { raw: 1.6085, fmt: '160.85%' },
    returnOnAssets: { raw: 0.2888, fmt: '28.88%' },
    // Growth
    revenueGrowth: { raw: 0.0816, fmt: '8.16%' },
    earningsGrowth: { raw: 0.134, fmt: '13.40%' },
    earningsQuarterlyGrowth: { raw: 0.1078, fmt: '10.78%' },
    // Financial
    beta: { raw: 1.24, fmt: '1.24' },
    debtToEquity: { raw: 176.3, fmt: '176.30' },
    currentRatio: { raw: 0.99, fmt: '0.99' },
    enterpriseValue: { raw: 2850000000000, fmt: '2.85T' },
    // Per Share
    trailingEps: { raw: 6.42, fmt: '6.42' },
    forwardEps: { raw: 6.85, fmt: '6.85' },
    bookValue: { raw: 3.85, fmt: '3.85' },
    revenuePerShare: { raw: 24.89, fmt: '24.89' },
    // Shares
    sharesOutstanding: { raw: 15460000000, fmt: '15.46B' },
    floatShares: { raw: 15380000000, fmt: '15.38B' },
    shortPercentOfFloat: { raw: 0.0078, fmt: '0.78%' },
    shortRatio: { raw: 1.84, fmt: '1.84' },
  },
};

/** Fixture with only some groups populated (simulate equity with missing growth data). */
const PARTIAL_FIXTURE = {
  TEST: {
    maxAge: 1,
    // Only Valuation and Per Share -- no profitability, growth, financial, shares
    forwardPE: { raw: 15.2, fmt: '15.20' },
    pegRatio: { raw: 1.05, fmt: '1.05' },
    trailingEps: { raw: 4.20, fmt: '4.20' },
    forwardEps: { raw: 4.85, fmt: '4.85' },
  },
};

/** Multi-symbol fixture. */
const MULTI_FIXTURE = {
  AAPL: COMPLETE_FIXTURE.AAPL,
  MSFT: {
    maxAge: 1,
    forwardPE: { raw: 30.1, fmt: '30.10' },
    pegRatio: { raw: 1.95, fmt: '1.95' },
    profitMargins: { raw: 0.3612, fmt: '36.12%' },
    beta: { raw: 0.89, fmt: '0.89' },
    trailingEps: { raw: 11.52, fmt: '11.52' },
    sharesOutstanding: { raw: 7430000000, fmt: '7.43B' },
  },
};

/** Error fixture. */
const ERROR_FIXTURE = {
  AAPL: COMPLETE_FIXTURE.AAPL,
  INVALID: 'Symbol not found',
};

// --- Tests ---

describe('formatKeyStatsResponse', () => {
  it('renders all 6 groups from complete AAPL-like data', () => {
    const result = formatKeyStatsResponse(COMPLETE_FIXTURE);
    expect(result).toContain('Valuation:');
    expect(result).toContain('Profitability:');
    expect(result).toContain('Growth:');
    expect(result).toContain('Financial:');
    expect(result).toContain('Per Share:');
    expect(result).toContain('Shares:');
  });

  it('omits groups with all null fields', () => {
    const result = formatKeyStatsResponse(PARTIAL_FIXTURE);
    // Only Valuation and Per Share should appear
    expect(result).toContain('Valuation:');
    expect(result).toContain('Per Share:');
    // Missing groups should NOT appear
    expect(result).not.toContain('Profitability:');
    expect(result).not.toContain('Growth:');
    expect(result).not.toContain('Financial:');
    expect(result).not.toContain('Shares:');
  });

  it('text output contains group labels and formatted values', () => {
    const result = formatKeyStatsResponse(COMPLETE_FIXTURE);
    // Valuation values
    expect(result).toContain('Fwd P/E: 26.20');
    expect(result).toContain('PEG: 2.15');
    expect(result).toContain('P/B: 45.80');
    // Profitability (percent context)
    expect(result).toContain('Margin:');
    expect(result).toContain('ROE:');
    // Per Share (eps context = 2dp)
    expect(result).toContain('EPS TTM: 6.42');
    expect(result).toContain('EPS Fwd: 6.85');
    // Financial (compact context for EV)
    expect(result).toContain('EV:');
    expect(result).toContain('2.85T');
  });

  it('multi-symbol produces separate sections', () => {
    const result = formatKeyStatsResponse(MULTI_FIXTURE);
    // Both symbols' data present
    expect(result).toContain('Fwd P/E: 26.20'); // AAPL
    expect(result).toContain('Fwd P/E: 30.10'); // MSFT
    // Multiple sections separated by blank lines
    const parts = result.split('\n\n');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it('format=json returns serialized data', () => {
    const result = formatKeyStatsResponse(COMPLETE_FIXTURE, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('AAPL');
    expect(typeof parsed.AAPL.forwardPE).toBe('number');
    expect(parsed.AAPL.forwardPE).toBe(26.2);
    expect(typeof parsed.AAPL.beta).toBe('number');
    expect(parsed.AAPL.beta).toBe(1.24);
    expect(typeof parsed.AAPL.profitMargins).toBe('number');
    expect(parsed.AAPL.profitMargins).toBe(0.2531);
  });

  it('error string per symbol handled gracefully', () => {
    const result = formatKeyStatsResponse(ERROR_FIXTURE);
    expect(result).toContain('INVALID | Error: Symbol not found');
    // AAPL should still render normally
    expect(result).toContain('Valuation:');
    expect(result).toContain('Fwd P/E: 26.20');
  });

  it('empty data returns "No key stats data available"', () => {
    const result = formatKeyStatsResponse({});
    expect(result).toBe('No key stats data available');
  });

  it('response starts with header containing symbol and data type', () => {
    const result = formatKeyStatsResponse(COMPLETE_FIXTURE);
    const firstLine = result.split('\n')[0];
    expect(firstLine).toContain('AAPL');
    expect(firstLine).toContain('Key Statistics');
    expect(firstLine).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('pipe-separated values within each group', () => {
    const result = formatKeyStatsResponse(COMPLETE_FIXTURE);
    // Valuation line should have pipe-separated fields
    const valuationLine = result.split('\n').find(l => l.startsWith('Valuation:'));
    expect(valuationLine).toBeDefined();
    expect(valuationLine!.split(' | ').length).toBeGreaterThanOrEqual(3);
  });
});
