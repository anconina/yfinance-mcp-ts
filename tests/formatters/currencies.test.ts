import { formatCurrenciesResponse } from '../../src/mcp/formatters/currencies';

// --- Fixtures ---

const mockCurrencies = [
  { symbol: 'EURUSD=X', shortName: 'EUR/USD', longName: 'Euro to US Dollar' },
  { symbol: 'GBPUSD=X', shortName: 'GBP/USD', longName: 'British Pound to US Dollar' },
  { symbol: 'USDJPY=X', shortName: 'USD/JPY', longName: 'US Dollar to Japanese Yen' },
  { symbol: 'AUDUSD=X', shortName: 'AUD/USD', longName: 'Australian Dollar to US Dollar' },
  { symbol: 'USDCAD=X', shortName: 'USD/CAD', longName: 'US Dollar to Canadian Dollar' },
];

/** Item with missing shortName to test fallback. */
const mockMissingFields = [
  { symbol: 'TESTX=X' },
  { symbol: 'TESTY=X', shortName: 'TST/Y' },
];

// --- Tests ---

describe('formatCurrenciesResponse', () => {
  it('renders a 3-column markdown table with pipes', () => {
    const result = formatCurrenciesResponse(mockCurrencies);
    expect(result).toContain('|Symbol|Short Name|Long Name|');
    expect(result).toContain('|---|---|---|');
  });

  it('empty array returns "No currency data available"', () => {
    const result = formatCurrenciesResponse([]);
    expect(result).toContain('No currency data available');
  });

  it('format=json returns JSON-parseable output', () => {
    const result = formatCurrenciesResponse(mockCurrencies, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(5);
    expect(parsed[0].symbol).toBe('EURUSD=X');
    expect(parsed[0].shortName).toBe('EUR/USD');
  });

  it('max_results limits output to specified count', () => {
    const result = formatCurrenciesResponse(mockCurrencies, { max_results: 2 });
    // Should contain the first 2 currencies
    expect(result).toContain('EURUSD=X');
    expect(result).toContain('GBPUSD=X');
    // Should NOT contain the 3rd currency
    expect(result).not.toContain('USDJPY=X');
    // Should show truncation hint
    expect(result).toContain('Showing 2 of 5 currency pairs');
  });

  it('handles missing fields gracefully (undefined shortName renders as -)', () => {
    const result = formatCurrenciesResponse(mockMissingFields);
    // First item has no shortName or longName
    expect(result).toContain('TESTX=X');
    // Missing fields should render as '-'
    const lines = result.split('\n');
    const testxRow = lines.find(l => l.includes('TESTX=X'));
    expect(testxRow).toBeDefined();
    expect(testxRow).toContain('-');
  });

  it('wraps response with Currencies data type header', () => {
    const result = formatCurrenciesResponse(mockCurrencies);
    expect(result).toContain('Currencies');
  });

  it('renders all currency pairs when max_results is not specified', () => {
    const result = formatCurrenciesResponse(mockCurrencies);
    expect(result).toContain('EURUSD=X');
    expect(result).toContain('GBPUSD=X');
    expect(result).toContain('USDJPY=X');
    expect(result).toContain('AUDUSD=X');
    expect(result).toContain('USDCAD=X');
    // No truncation hint
    expect(result).not.toContain('Showing');
  });
});
