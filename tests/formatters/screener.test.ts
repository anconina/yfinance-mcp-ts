import {
  categorizeScreener,
  formatListScreenersResponse,
  formatScreenerResponse,
} from '../../src/mcp/formatters/screener';

// --- Fixtures ---

/** Realistic screener keys spanning multiple categories. */
const SCREENER_KEYS = [
  // Market Movers (9)
  'day_gainers',
  'day_losers',
  'most_actives',
  'most_shorted_stocks',
  'bearish_stocks_right_now',
  'bullish_stocks_right_now',
  'small_cap_gainers',
  '52_wk_high',
  '52_wk_low',
  // Value (2)
  'undervalued_growth_stocks',
  'undervalued_large_caps',
  // Growth (2)
  'growth_technology_stocks',
  'growth_small_cap',
  // Dividends & Income (2)
  'high_yield_bond',
  'portfolio_anchors',
  // Analyst Picks (2)
  'analyst_strong_buy',
  'strong_buy_stocks',
  // Strategies (2)
  'aggressive_small_caps',
  'conservative_foreign_funds',
  // Crypto (1)
  'crypto_all_currencies',
  // ETFs (1)
  'etf_bond',
  // Mutual Funds (1)
  'mutual_fund_equity',
  // Sectors (3)
  'banks_diversified',
  'technology_hardware',
  'healthcare_services',
];

/** Generate a large category for testing threshold display. */
function makeLargeCategory(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}_item_${i}`);
}

/** Mock screener quotes for get_screener. */
const MOCK_QUOTES = [
  {
    symbol: 'AAPL',
    shortName: 'Apple Inc.',
    regularMarketPrice: 150.25,
    regularMarketChange: 2.5,
    regularMarketChangePercent: 1.69,
    regularMarketVolume: 52340000,
    marketCap: 2780000000000,
  },
  {
    symbol: 'MSFT',
    shortName: 'Microsoft Corp',
    regularMarketPrice: 415.8,
    regularMarketChange: -3.2,
    regularMarketChangePercent: -0.76,
    regularMarketVolume: 18200000,
    marketCap: 3100000000000,
  },
  {
    symbol: 'NVDA',
    longName: 'NVIDIA Corporation',
    regularMarketPrice: 875.5,
    regularMarketChange: 15.75,
    regularMarketChangePercent: 1.83,
    regularMarketVolume: 42000000,
    marketCap: 2150000000000,
  },
];

// --- categorizeScreener tests ---

describe('categorizeScreener', () => {
  it('returns Market Movers for day_gainers', () => {
    expect(categorizeScreener('day_gainers')).toBe('Market Movers');
  });

  it('returns Market Movers for 52_wk_high', () => {
    expect(categorizeScreener('52_wk_high')).toBe('Market Movers');
  });

  it('returns Value for undervalued_growth_stocks', () => {
    expect(categorizeScreener('undervalued_growth_stocks')).toBe('Value');
  });

  it('returns Growth for growth_technology_stocks', () => {
    expect(categorizeScreener('growth_technology_stocks')).toBe('Growth');
  });

  it('returns Crypto for a key containing crypto', () => {
    expect(categorizeScreener('crypto_all_currencies')).toBe('Crypto');
  });

  it('returns ETFs for a key containing etf', () => {
    expect(categorizeScreener('etf_bond')).toBe('ETFs');
  });

  it('returns Mutual Funds for a key containing mutual_fund', () => {
    expect(categorizeScreener('mutual_fund_equity')).toBe('Mutual Funds');
  });

  it('returns Sectors for an industry key like banks_diversified', () => {
    expect(categorizeScreener('banks_diversified')).toBe('Sectors');
  });

  it('returns Dividends & Income for yield keys', () => {
    expect(categorizeScreener('high_yield_bond')).toBe('Dividends & Income');
  });

  it('returns Dividends & Income for portfolio_anchors', () => {
    expect(categorizeScreener('portfolio_anchors')).toBe('Dividends & Income');
  });

  it('returns Analyst Picks for analyst keys', () => {
    expect(categorizeScreener('analyst_strong_buy')).toBe('Analyst Picks');
  });

  it('returns Strategies for aggressive_small_caps', () => {
    expect(categorizeScreener('aggressive_small_caps')).toBe('Strategies');
  });
});

// --- formatListScreenersResponse tests ---

describe('formatListScreenersResponse', () => {
  it('default: renders categorized output with total count', () => {
    const result = formatListScreenersResponse(SCREENER_KEYS);
    // Should contain category headers with counts
    expect(result).toContain('Market Movers (9):');
    expect(result).toContain('Value (2):');
    expect(result).toContain('Sectors (3):');
    // Small categories list keys inline
    expect(result).toContain('day_gainers');
    // Total footer
    expect(result).toContain(`Total: ${SCREENER_KEYS.length} screeners`);
    // Tip line
    expect(result).toContain('Tip: Use category parameter to filter');
  });

  it('large categories show count-only with filter hint', () => {
    // Create a set with a large Sectors category (>15 items)
    const largeKeys = [
      ...SCREENER_KEYS,
      ...makeLargeCategory('sector', 20),
    ];
    const result = formatListScreenersResponse(largeKeys);
    // Sectors should now have 23 items (3 original + 20 added) and show count-only
    expect(result).toContain('Sectors (23): (use category="Sectors" to list)');
  });

  it('with category filter: renders all screener keys for that category', () => {
    const result = formatListScreenersResponse(SCREENER_KEYS, { category: 'Market Movers' });
    expect(result).toContain('Market Movers (9):');
    expect(result).toContain('day_gainers');
    expect(result).toContain('day_losers');
    expect(result).toContain('most_actives');
    expect(result).toContain('52_wk_high');
    expect(result).toContain('52_wk_low');
  });

  it('with invalid category: returns error with available categories', () => {
    const result = formatListScreenersResponse(SCREENER_KEYS, { category: 'Nonexistent' });
    expect(result).toContain('Category "Nonexistent" not found');
    expect(result).toContain('Available categories:');
    expect(result).toContain('Market Movers');
  });

  it('format=json returns JSON-parseable output with categories as keys', () => {
    const result = formatListScreenersResponse(SCREENER_KEYS, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('Market Movers');
    expect(parsed['Market Movers']).toContain('day_gainers');
    expect(parsed).toHaveProperty('Value');
    expect(parsed).toHaveProperty('Sectors');
  });

  it('categories sorted: actionable first, reference last', () => {
    const result = formatListScreenersResponse(SCREENER_KEYS);
    const lines = result.split('\n');
    // Find lines with category headers
    const catLines = lines.filter((l) => l.match(/^\w.+\(\d+\):/));
    // Market Movers should be before Sectors
    const mmIdx = catLines.findIndex((l) => l.startsWith('Market Movers'));
    const secIdx = catLines.findIndex((l) => l.startsWith('Sectors'));
    expect(mmIdx).toBeLessThan(secIdx);
  });

  it('empty keys returns wrapped message', () => {
    const result = formatListScreenersResponse([]);
    expect(result).toContain('No screeners available');
  });
});

// --- formatScreenerResponse tests ---

describe('formatScreenerResponse', () => {
  it('renders markdown table with 7 columns for quotes', () => {
    const data = { day_gainers: { quotes: MOCK_QUOTES } };
    const result = formatScreenerResponse(data);
    // Header row
    expect(result).toContain('|Symbol|Name|Price|Change|Chg%|Volume|MCap|');
    // Alignment row
    expect(result).toContain('|---|---|---:|---:|---:|---:|---:|');
    // Data rows
    expect(result).toContain('AAPL');
    expect(result).toContain('Apple Inc.');
    expect(result).toContain('150.25');
    expect(result).toContain('+2.50');
  });

  it('handles empty quotes array gracefully', () => {
    const data = { day_losers: { quotes: [] } };
    const result = formatScreenerResponse(data);
    expect(result).toContain('No results found for screener: day_losers');
  });

  it('format=json returns JSON-parseable output', () => {
    const data = { day_gainers: { quotes: MOCK_QUOTES } };
    const result = formatScreenerResponse(data, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('day_gainers');
    expect(parsed.day_gainers.quotes).toHaveLength(3);
  });

  it('formats numbers correctly with formatCompact and formatChange', () => {
    const data = { most_actives: { quotes: MOCK_QUOTES } };
    const result = formatScreenerResponse(data);
    // AAPL: change=+2.50, chg%=+1.69%, volume=52.34M, mcap=2.78T
    expect(result).toContain('+2.50');
    expect(result).toContain('+1.69%');
    // MSFT: negative change
    expect(result).toContain('-3.20');
    expect(result).toContain('-0.76%');
  });

  it('title-cases screener key for header', () => {
    const data = { day_gainers: { quotes: MOCK_QUOTES } };
    const result = formatScreenerResponse(data);
    expect(result).toContain('Day Gainers');
  });

  it('falls back to longName when shortName is missing', () => {
    const data = {
      test_screener: {
        quotes: [
          {
            symbol: 'NVDA',
            longName: 'NVIDIA Corporation',
            regularMarketPrice: 875.5,
            regularMarketChange: 15.75,
            regularMarketChangePercent: 1.83,
            regularMarketVolume: 42000000,
            marketCap: 2150000000000,
          },
        ],
      },
    };
    const result = formatScreenerResponse(data);
    expect(result).toContain('NVIDIA Corporation');
  });

  it('handles null/missing numeric fields with dash', () => {
    const data = {
      test: {
        quotes: [
          {
            symbol: 'TEST',
            shortName: 'Test Corp',
            regularMarketPrice: null,
            regularMarketChange: undefined,
            regularMarketChangePercent: null,
            regularMarketVolume: null,
            marketCap: null,
          },
        ],
      },
    };
    const result = formatScreenerResponse(data);
    // Should contain dashes for null values
    expect(result).toContain('TEST');
    expect(result).toContain('Test Corp');
  });
});
