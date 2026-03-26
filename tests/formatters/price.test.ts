import { formatPriceResponse, normalizePriceData } from '../../src/mcp/formatters/price';

// --- Fixtures ---

const EQUITY_FIXTURE = {
  AAPL: {
    maxAge: 1,
    regularMarketPrice: { raw: 178.45, fmt: '178.45' },
    regularMarketChange: { raw: 2.34, fmt: '2.34' },
    regularMarketChangePercent: { raw: 1.33, fmt: '1.33%' },
    marketCap: { raw: 2780000000000, fmt: '2.78T' },
    regularMarketVolume: { raw: 45200000, fmt: '45.2M' },
    regularMarketOpen: { raw: 176.50, fmt: '176.50' },
    regularMarketDayHigh: { raw: 179.80, fmt: '179.80' },
    regularMarketDayLow: { raw: 176.12, fmt: '176.12' },
    regularMarketPreviousClose: { raw: 176.11, fmt: '176.11' },
    shortName: 'Apple Inc.',
    currency: 'USD',
    currencySymbol: '$',
  },
};

const INDEX_FIXTURE = {
  '^GSPC': {
    maxAge: 1,
    regularMarketPrice: { raw: 5234.56, fmt: '5,234.56' },
    regularMarketChange: { raw: -12.34, fmt: '-12.34' },
    regularMarketChangePercent: { raw: -0.24, fmt: '-0.24%' },
    // No marketCap for indices
    regularMarketVolume: { raw: 3200000000, fmt: '3.2B' },
    regularMarketOpen: { raw: 5248.90, fmt: '5,248.90' },
    regularMarketDayHigh: { raw: 5260.00, fmt: '5,260.00' },
    regularMarketDayLow: { raw: 5220.00, fmt: '5,220.00' },
    regularMarketPreviousClose: { raw: 5246.90, fmt: '5,246.90' },
    shortName: 'S&P 500',
    currency: 'USD',
    currencySymbol: '$',
  },
};

const MULTI_SYMBOL_FIXTURE = {
  AAPL: {
    maxAge: 1,
    regularMarketPrice: { raw: 178.45, fmt: '178.45' },
    regularMarketChange: { raw: 2.34, fmt: '2.34' },
    regularMarketChangePercent: { raw: 1.33, fmt: '1.33%' },
    marketCap: { raw: 2780000000000, fmt: '2.78T' },
    regularMarketVolume: { raw: 45200000, fmt: '45.2M' },
    regularMarketOpen: { raw: 176.50, fmt: '176.50' },
    regularMarketDayHigh: { raw: 179.80, fmt: '179.80' },
    regularMarketDayLow: { raw: 176.12, fmt: '176.12' },
    regularMarketPreviousClose: { raw: 176.11, fmt: '176.11' },
    shortName: 'Apple Inc.',
    currency: 'USD',
    currencySymbol: '$',
  },
  MSFT: {
    maxAge: 1,
    regularMarketPrice: { raw: 412.30, fmt: '412.30' },
    regularMarketChange: { raw: 5.67, fmt: '5.67' },
    regularMarketChangePercent: { raw: 1.39, fmt: '1.39%' },
    marketCap: { raw: 3060000000000, fmt: '3.06T' },
    regularMarketVolume: { raw: 23100000, fmt: '23.1M' },
    regularMarketOpen: { raw: 407.20, fmt: '407.20' },
    regularMarketDayHigh: { raw: 413.50, fmt: '413.50' },
    regularMarketDayLow: { raw: 406.85, fmt: '406.85' },
    regularMarketPreviousClose: { raw: 406.63, fmt: '406.63' },
    shortName: 'Microsoft Corporation',
    currency: 'USD',
    currencySymbol: '$',
  },
};

const ERROR_FIXTURE = {
  AAPL: {
    maxAge: 1,
    regularMarketPrice: { raw: 178.45, fmt: '178.45' },
    regularMarketChange: { raw: 2.34, fmt: '2.34' },
    regularMarketChangePercent: { raw: 1.33, fmt: '1.33%' },
    marketCap: { raw: 2780000000000, fmt: '2.78T' },
    regularMarketVolume: { raw: 45200000, fmt: '45.2M' },
    regularMarketOpen: { raw: 176.50, fmt: '176.50' },
    regularMarketDayHigh: { raw: 179.80, fmt: '179.80' },
    regularMarketDayLow: { raw: 176.12, fmt: '176.12' },
    regularMarketPreviousClose: { raw: 176.11, fmt: '176.11' },
    shortName: 'Apple Inc.',
    currency: 'USD',
    currencySymbol: '$',
  },
  INVALID: 'No data found',
  MSFT: {
    maxAge: 1,
    regularMarketPrice: { raw: 412.30, fmt: '412.30' },
    regularMarketChange: { raw: 5.67, fmt: '5.67' },
    regularMarketChangePercent: { raw: 1.39, fmt: '1.39%' },
    marketCap: { raw: 3060000000000, fmt: '3.06T' },
    regularMarketVolume: { raw: 23100000, fmt: '23.1M' },
    regularMarketOpen: { raw: 407.20, fmt: '407.20' },
    regularMarketDayHigh: { raw: 413.50, fmt: '413.50' },
    regularMarketDayLow: { raw: 406.85, fmt: '406.85' },
    regularMarketPreviousClose: { raw: 406.63, fmt: '406.63' },
    shortName: 'Microsoft Corporation',
    currency: 'USD',
    currencySymbol: '$',
  },
};

const NULL_VOLUME_FIXTURE = {
  AAPL: {
    maxAge: 1,
    regularMarketPrice: { raw: 178.45, fmt: '178.45' },
    regularMarketChange: { raw: 2.34, fmt: '2.34' },
    regularMarketChangePercent: { raw: 1.33, fmt: '1.33%' },
    marketCap: { raw: 2780000000000, fmt: '2.78T' },
    regularMarketVolume: null,
    regularMarketOpen: { raw: 176.50, fmt: '176.50' },
    regularMarketDayHigh: { raw: 179.80, fmt: '179.80' },
    regularMarketDayLow: { raw: 176.12, fmt: '176.12' },
    regularMarketPreviousClose: { raw: 176.11, fmt: '176.11' },
    shortName: 'Apple Inc.',
    currency: 'USD',
    currencySymbol: '$',
  },
};

// --- Tests ---

describe('normalizePriceData', () => {
  it('flattens {raw, fmt} pairs to raw values', () => {
    const result = normalizePriceData('AAPL', EQUITY_FIXTURE.AAPL);
    expect(result.price).toBe(178.45);
    expect(result.change).toBe(2.34);
    expect(result.changePct).toBe(1.33);
    expect(result.marketCap).toBe(2780000000000);
    expect(result.volume).toBe(45200000);
  });

  it('maps Yahoo field names to short names', () => {
    const result = normalizePriceData('AAPL', EQUITY_FIXTURE.AAPL);
    // Should have short names, not Yahoo's verbose names
    expect(result).toHaveProperty('price');
    expect(result).toHaveProperty('change');
    expect(result).toHaveProperty('changePct');
    expect(result).toHaveProperty('volume');
    expect(result).toHaveProperty('open');
    expect(result).toHaveProperty('dayHigh');
    expect(result).toHaveProperty('dayLow');
    expect(result).toHaveProperty('prevClose');
    // Should not have Yahoo's long field names
    expect(result).not.toHaveProperty('regularMarketPrice');
    expect(result).not.toHaveProperty('regularMarketChange');
    expect(result).not.toHaveProperty('regularMarketVolume');
  });

  it('strips null values from result', () => {
    const dataWithNull = {
      ...EQUITY_FIXTURE.AAPL,
      regularMarketVolume: null,
    };
    const result = normalizePriceData('AAPL', dataWithNull);
    // volume should be stripped since it maps from null
    expect(result).not.toHaveProperty('volume');
  });

  it('handles missing marketCap (index fixture)', () => {
    const result = normalizePriceData('^GSPC', INDEX_FIXTURE['^GSPC']);
    // Index has no marketCap, so it should not appear in output
    expect(result).not.toHaveProperty('marketCap');
  });
});

describe('formatPriceResponse', () => {
  it('single symbol produces compact text under 500 chars', () => {
    const result = formatPriceResponse(EQUITY_FIXTURE);
    expect(result.length).toBeLessThan(500);
  });

  it('output contains symbol, price, change, changePct, MCap, Vol on line 1', () => {
    const result = formatPriceResponse(EQUITY_FIXTURE);
    const lines = result.split('\n');
    // Find the price data line (not the header)
    const priceLine = lines.find(l => l.includes('AAPL') && l.includes('MCap'));
    expect(priceLine).toBeDefined();
    expect(priceLine).toContain('AAPL');
    expect(priceLine).toContain('$178.45');
    expect(priceLine).toContain('+2.34');
    expect(priceLine).toContain('+1.33%');
    expect(priceLine).toContain('MCap:');
    expect(priceLine).toContain('2.78T');
    expect(priceLine).toContain('Vol:');
    expect(priceLine).toContain('45.2M');
  });

  it('output contains Open, Day range, PrevClose on line 2', () => {
    const result = formatPriceResponse(EQUITY_FIXTURE);
    const lines = result.split('\n');
    const detailLine = lines.find(l => l.includes('Open:') && l.includes('PrevClose'));
    expect(detailLine).toBeDefined();
    expect(detailLine).toContain('Open: $176.50');
    expect(detailLine).toContain('$176.12-$179.80');
    expect(detailLine).toContain('PrevClose: $176.11');
  });

  it('multi-symbol produces separate sections joined by blank lines', () => {
    const result = formatPriceResponse(MULTI_SYMBOL_FIXTURE);
    // Both symbols present
    expect(result).toContain('AAPL');
    expect(result).toContain('MSFT');
    // Sections separated by blank lines (double newline)
    const body = result.split('\n\n');
    expect(body.length).toBeGreaterThanOrEqual(3); // header, AAPL section, MSFT section (possibly hint)
  });

  it('multi-symbol with error shows inline error for bad symbol, formats others normally', () => {
    const result = formatPriceResponse(ERROR_FIXTURE);
    // AAPL and MSFT should be formatted normally
    expect(result).toContain('AAPL');
    expect(result).toContain('$178.45');
    expect(result).toContain('MSFT');
    expect(result).toContain('$412.30');
    // INVALID should show inline error
    expect(result).toContain('INVALID | Error: No data found');
  });

  it('format=json returns valid JSON with flattened values (no {raw, fmt} objects)', () => {
    const result = formatPriceResponse(EQUITY_FIXTURE, { format: 'json' });
    const parsed = JSON.parse(result);
    // Should have AAPL key
    expect(parsed).toHaveProperty('AAPL');
    // Values should be flat numbers, not {raw, fmt} objects
    expect(typeof parsed.AAPL.price).toBe('number');
    expect(parsed.AAPL.price).toBe(178.45);
    expect(typeof parsed.AAPL.change).toBe('number');
    expect(typeof parsed.AAPL.changePct).toBe('number');
    // Should not have raw/fmt nesting
    expect(parsed.AAPL.regularMarketPrice).toBeUndefined();
  });

  it('format=json error symbol has { error: ... } in output', () => {
    const result = formatPriceResponse(ERROR_FIXTURE, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.INVALID).toHaveProperty('error');
    expect(parsed.INVALID.error).toBe('No data found');
    // Other symbols should be formatted normally
    expect(parsed.AAPL.price).toBe(178.45);
    expect(parsed.MSFT.price).toBe(412.30);
  });

  it('null volume renders as dash in output', () => {
    const result = formatPriceResponse(NULL_VOLUME_FIXTURE);
    const lines = result.split('\n');
    const priceLine = lines.find(l => l.includes('AAPL') && l.includes('Vol:'));
    expect(priceLine).toBeDefined();
    expect(priceLine).toContain('Vol: -');
  });

  it('response starts with header line containing symbol and date', () => {
    const result = formatPriceResponse(EQUITY_FIXTURE);
    const firstLine = result.split('\n')[0];
    expect(firstLine).toContain('AAPL');
    expect(firstLine).toContain('Price Summary');
    // Should contain an ISO date (YYYY-MM-DD pattern)
    expect(firstLine).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('multi-symbol response includes hint about get_stock_summary', () => {
    const result = formatPriceResponse(MULTI_SYMBOL_FIXTURE);
    expect(result).toContain('Tip:');
    expect(result).toContain('get_stock_summary');
  });
});
