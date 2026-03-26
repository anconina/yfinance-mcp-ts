import {
  formatEarningsCalendarResponse,
  formatIPOsResponse,
  formatSplitsResponse,
} from '../../src/mcp/formatters/research';

// --- Fixtures ---

/** Earnings calendar records with lowercase field names (Yahoo Research API shape). */
const mockEarnings = [
  {
    ticker: 'AAPL',
    companyshortname: 'Apple Inc.',
    startdatetime: '2024-01-25T16:00:00Z',
    startdatetimetype: 'AMC',
    epsestimate: 2.10,
    epsactual: 2.18,
    epssurprisepct: 3.81,
  },
  {
    ticker: 'MSFT',
    companyshortname: 'Microsoft Corp',
    startdatetime: '2024-01-25T21:00:00Z',
    startdatetimetype: 'AMC',
    epsestimate: 2.78,
    epsactual: 2.93,
    epssurprisepct: 5.40,
  },
  {
    ticker: 'GOOGL',
    companyshortname: 'Alphabet Inc.',
    startdatetime: '2024-01-30',
    startdatetimetype: 'BMO',
    epsestimate: 1.59,
    epsactual: null,
    epssurprisepct: null,
  },
];

/** IPO records with lowercase field names. */
const mockIPOs = [
  {
    ticker: 'NEWCO',
    companyshortname: 'New Company Inc',
    exchange_short_name: 'NYSE',
    startdatetime: '2024-02-15',
    pricefrom: 18,
    priceto: 22,
    offerprice: 20,
    shares: 5000000,
    dealtype: 'IPO',
    currencyname: 'USD',
  },
  {
    ticker: 'TECHX',
    companyshortname: 'TechX Corp',
    exchange_short_name: 'NASDAQ',
    startdatetime: '2024-03-01T09:30:00Z',
    pricefrom: 12,
    priceto: 15,
    offerprice: 14,
    shares: 3000000,
    dealtype: 'IPO',
    currencyname: 'USD',
  },
];

/** Stock split records with lowercase field names. */
const mockSplits = [
  {
    ticker: 'NVDA',
    companyshortname: 'NVIDIA Corp',
    startdatetime: '2024-06-10',
    optionable: 'Y',
    old_share_worth: 1,
    share_worth: 10,
  },
  {
    ticker: 'AMZN',
    companyshortname: 'Amazon.com Inc',
    startdatetime: '2024-07-15T00:00:00Z',
    optionable: 'Y',
    old_share_worth: 1,
    share_worth: 20,
  },
];

// --- Tests ---

describe('formatEarningsCalendarResponse', () => {
  it('renders 7-column markdown table with pipe characters', () => {
    const result = formatEarningsCalendarResponse(mockEarnings);
    // Check all 7 column headers
    expect(result).toContain('|Ticker|Company|Date|Time|EPS Est|EPS Act|Surprise%|');
    // Check separator row with alignment
    expect(result).toContain('|---|---|---|---|---:|---:|---:|');
    // Check data rows
    expect(result).toContain('|AAPL|Apple Inc.|2024-01-25|AMC|');
    expect(result).toContain('|MSFT|Microsoft Corp|2024-01-25|AMC|');
    expect(result).toContain('|GOOGL|Alphabet Inc.|2024-01-30|BMO|');
  });

  it('extracts date from ISO datetime string (takes first 10 chars)', () => {
    const result = formatEarningsCalendarResponse(mockEarnings);
    // '2024-01-25T16:00:00Z' should become '2024-01-25'
    expect(result).toContain('|2024-01-25|');
    // '2024-01-30' (already plain date) should stay '2024-01-30'
    expect(result).toContain('|2024-01-30|');
  });

  it('handles null epsactual and epssurprisepct (renders dash)', () => {
    const result = formatEarningsCalendarResponse(mockEarnings);
    // GOOGL has null epsactual and epssurprisepct
    // Row should end with dashes for EPS Act and Surprise%
    const lines = result.split('\n');
    const googlLine = lines.find((l) => l.includes('GOOGL'));
    expect(googlLine).toBeDefined();
    // Should contain the estimate but dashes for actual and surprise
    expect(googlLine).toContain('1.59');
    // The last two columns should be dashes
    const cells = googlLine!.split('|').filter(Boolean);
    expect(cells[5]).toBe('-'); // EPS Act
    expect(cells[6]).toBe('-'); // Surprise%
  });

  it('empty array returns "No earnings calendar data available"', () => {
    const result = formatEarningsCalendarResponse([]);
    expect(result).toContain('No earnings calendar data available');
  });

  it('format=json returns JSON-parseable output', () => {
    const result = formatEarningsCalendarResponse(mockEarnings, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].ticker).toBe('AAPL');
    expect(parsed[0].epsestimate).toBe(2.10);
  });
});

describe('formatIPOsResponse', () => {
  it('renders 8-column markdown table', () => {
    const result = formatIPOsResponse(mockIPOs);
    expect(result).toContain('|Ticker|Company|Exchange|Date|Price Range|Offer Price|Shares|Deal Type|');
    expect(result).toContain('|NEWCO|New Company Inc|NYSE|');
    expect(result).toContain('|TECHX|TechX Corp|NASDAQ|');
  });

  it('price range formatted as $X-$Y when both pricefrom and priceto exist', () => {
    const result = formatIPOsResponse(mockIPOs);
    expect(result).toContain('$18-$22');
    expect(result).toContain('$12-$15');
  });

  it('empty array returns "No IPO data available"', () => {
    const result = formatIPOsResponse([]);
    expect(result).toContain('No IPO data available');
  });

  it('format=json returns JSON-parseable output', () => {
    const result = formatIPOsResponse(mockIPOs, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].ticker).toBe('NEWCO');
    expect(parsed[0].pricefrom).toBe(18);
  });
});

describe('formatSplitsResponse', () => {
  it('renders 4-column markdown table', () => {
    const result = formatSplitsResponse(mockSplits);
    expect(result).toContain('|Ticker|Company|Date|Ratio|');
    expect(result).toContain('|NVDA|NVIDIA Corp|2024-06-10|');
    expect(result).toContain('|AMZN|Amazon.com Inc|2024-07-15|');
  });

  it('ratio formatted as old:new (e.g., "1:10" for 10-for-1 split)', () => {
    const result = formatSplitsResponse(mockSplits);
    expect(result).toContain('|1:10|');
    expect(result).toContain('|1:20|');
  });

  it('empty array returns "No stock split data available"', () => {
    const result = formatSplitsResponse([]);
    expect(result).toContain('No stock split data available');
  });
});

describe('shared behavior', () => {
  it('max_results limits output rows and adds truncation hint', () => {
    // Use earnings with max_results=2 (3 records, so 1 truncated)
    const result = formatEarningsCalendarResponse(mockEarnings, { max_results: 2 });
    // Should show AAPL and MSFT but not GOOGL
    expect(result).toContain('AAPL');
    expect(result).toContain('MSFT');
    expect(result).not.toContain('GOOGL');
    // Should show truncation hint
    expect(result).toContain('Showing 2 of 3 results');
    expect(result).toContain('Increase with max_results parameter');
  });

  it('max_results not specified shows all results (no truncation hint)', () => {
    const result = formatEarningsCalendarResponse(mockEarnings);
    // All 3 records should be present
    expect(result).toContain('AAPL');
    expect(result).toContain('MSFT');
    expect(result).toContain('GOOGL');
    // No truncation hint
    expect(result).not.toContain('Showing');
    expect(result).not.toContain('Increase with max_results parameter');
  });
});
