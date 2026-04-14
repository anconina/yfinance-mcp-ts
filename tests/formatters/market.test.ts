import { formatMarketSummaryResponse } from '../../src/mcp/formatters/market';

// --- Fixtures ---

/** Market indices with nested {raw, fmt} pairs (Yahoo MarketSummaryItem shape). */
const mockMarketData = [
  {
    symbol: '^GSPC',
    shortName: 'S&P 500',
    regularMarketPrice: { raw: 4800.50, fmt: '4,800.50' },
    regularMarketChange: { raw: 25.30, fmt: '+25.30' },
    regularMarketChangePercent: { raw: 0.53, fmt: '+0.53%' },
  },
  {
    symbol: '^DJI',
    shortName: 'Dow 30',
    regularMarketPrice: { raw: 37500.00, fmt: '37,500.00' },
    regularMarketChange: { raw: -120.50, fmt: '-120.50' },
    regularMarketChangePercent: { raw: -0.32, fmt: '-0.32%' },
  },
  {
    symbol: '^IXIC',
    shortName: 'Nasdaq',
    regularMarketPrice: { raw: 15200.75, fmt: '15,200.75' },
    regularMarketChange: { raw: 85.40, fmt: '+85.40' },
    regularMarketChangePercent: { raw: 0.56, fmt: '+0.56%' },
  },
];

/** Item with missing shortName to test symbol fallback. */
const mockNoShortName = [
  {
    symbol: '^RUT',
    regularMarketPrice: { raw: 2050.25, fmt: '2,050.25' },
    regularMarketChange: { raw: 10.50, fmt: '+10.50' },
    regularMarketChangePercent: { raw: 0.51, fmt: '+0.51%' },
  },
];

// --- Tests ---

describe('formatMarketSummaryResponse', () => {
  it('renders a 4-column markdown table with pipes and header separator', () => {
    const result = formatMarketSummaryResponse(mockMarketData);
    expect(result).toContain('|Index|Price|Change|Chg%|');
    expect(result).toContain('|---|---:|---:|---:|');
  });

  it('uses extractValue to get display strings for prices', () => {
    const result = formatMarketSummaryResponse(mockMarketData);
    // extractValue with 'display' returns the fmt string from Yahoo
    expect(result).toContain('4,800.50');
    expect(result).toContain('37,500.00');
    expect(result).toContain('15,200.75');
  });

  it('handles negative change correctly with formatChange prefix', () => {
    const result = formatMarketSummaryResponse(mockMarketData);
    // Dow 30 has negative change
    expect(result).toContain('-120.50');
    expect(result).toContain('-0.32%');
    // S&P 500 has positive change
    expect(result).toContain('+25.30');
    expect(result).toContain('+0.53%');
  });

  it('empty array returns "No market summary data available"', () => {
    const result = formatMarketSummaryResponse([]);
    expect(result).toContain('No market summary data available');
  });

  it('format=json returns JSON-parseable output', () => {
    const result = formatMarketSummaryResponse(mockMarketData, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].symbol).toBe('^GSPC');
    // Projection extracts raw value from {raw, fmt} pairs
    expect(parsed[0].regularMarketPrice).toBe(4800.5);
  });

  it('items with missing shortName fall back to symbol', () => {
    const result = formatMarketSummaryResponse(mockNoShortName);
    expect(result).toContain('^RUT');
    expect(result).toContain('2,050.25');
  });

  it('wraps response with Market Summary data type header', () => {
    const result = formatMarketSummaryResponse(mockMarketData);
    expect(result).toContain('Market Summary');
  });

  it('renders all three indices as table rows', () => {
    const result = formatMarketSummaryResponse(mockMarketData);
    expect(result).toContain('S&P 500');
    expect(result).toContain('Dow 30');
    expect(result).toContain('Nasdaq');
  });
});
