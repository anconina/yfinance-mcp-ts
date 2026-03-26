import {
  formatRecommendationsResponse,
  getConsensusLabel,
} from '../../src/mcp/formatters/recommendations';

// --- Fixtures ---

/** Full module object shape: { trend: [...], maxAge: ... } */
const TREND_OBJECT_FIXTURE = {
  AAPL: {
    trend: [
      { period: '0m', strongBuy: 12, buy: 18, hold: 8, sell: 2, strongSell: 0 },
      { period: '-1m', strongBuy: 11, buy: 19, hold: 7, sell: 3, strongSell: 0 },
      { period: '-2m', strongBuy: 10, buy: 20, hold: 8, sell: 2, strongSell: 0 },
      { period: '-3m', strongBuy: 10, buy: 18, hold: 9, sell: 3, strongSell: 0 },
    ],
    maxAge: 86400,
  },
};

/** Bare array shape (defensive handling). */
const TREND_ARRAY_FIXTURE = {
  AAPL: [
    { period: '0m', strongBuy: 12, buy: 18, hold: 8, sell: 2, strongSell: 0 },
    { period: '-1m', strongBuy: 11, buy: 19, hold: 7, sell: 3, strongSell: 0 },
  ],
};

/** Single period (no trend table). */
const SINGLE_PERIOD_FIXTURE = {
  AAPL: {
    trend: [
      { period: '0m', strongBuy: 5, buy: 10, hold: 12, sell: 3, strongSell: 1 },
    ],
    maxAge: 86400,
  },
};

/** Empty trend data. */
const EMPTY_TREND_FIXTURE = {
  AAPL: { trend: [], maxAge: 86400 },
};

const NULL_TREND_FIXTURE = {
  AAPL: { trend: null, maxAge: 86400 },
};

/** Bearish recommendations where (sell + strongSell) > 40% of total. */
const BEARISH_FIXTURE = {
  AAPL: {
    trend: [
      { period: '0m', strongBuy: 1, buy: 2, hold: 3, sell: 6, strongSell: 8 },
    ],
    maxAge: 86400,
  },
};

// --- Tests ---

describe('getConsensusLabel', () => {
  it('returns Buy when bullish > 60%', () => {
    // 12 + 18 = 30 out of 40 = 75% > 60%
    expect(getConsensusLabel(12, 18, 8, 2, 0)).toBe('Buy');
  });

  it('returns Hold for mixed', () => {
    // 5 + 10 = 15 out of 31 = 48% < 60%, sell side = 4 out of 31 = 13% < 40%
    expect(getConsensusLabel(5, 10, 12, 3, 1)).toBe('Hold');
  });

  it('returns Sell when bearish > 40%', () => {
    // 6 + 8 = 14 out of 20 = 70% > 40%
    expect(getConsensusLabel(1, 2, 3, 6, 8)).toBe('Sell');
  });

  it('returns N/A for zero total', () => {
    expect(getConsensusLabel(0, 0, 0, 0, 0)).toBe('N/A');
  });
});

describe('formatRecommendationsResponse', () => {
  it('current consensus line with correct counts', () => {
    const result = formatRecommendationsResponse(TREND_OBJECT_FIXTURE);
    expect(result).toContain('Current: Strong Buy: 12 | Buy: 18 | Hold: 8 | Sell: 2 | Strong Sell: 0');
    expect(result).toContain('Consensus: Buy');
    expect(result).toContain('40 analysts');
  });

  it('trend table rendered with 4 periods', () => {
    const result = formatRecommendationsResponse(TREND_OBJECT_FIXTURE);
    expect(result).toContain('|Period|StrongBuy|Buy|Hold|Sell|StrongSell|');
    expect(result).toContain('|0m|12|18|8|2|0|');
    expect(result).toContain('|-1m|11|19|7|3|0|');
    expect(result).toContain('|-2m|10|20|8|2|0|');
    expect(result).toContain('|-3m|10|18|9|3|0|');
  });

  it('data as { trend: [...] } object (not array) handled', () => {
    const result = formatRecommendationsResponse(TREND_OBJECT_FIXTURE);
    expect(result).toContain('Strong Buy: 12');
    expect(result).toContain('Consensus: Buy');
  });

  it('data as bare array handled defensively', () => {
    const result = formatRecommendationsResponse(TREND_ARRAY_FIXTURE);
    expect(result).toContain('Strong Buy: 12');
    expect(result).toContain('|Period|StrongBuy|Buy|Hold|Sell|StrongSell|');
  });

  it('single-period data (no trend table)', () => {
    const result = formatRecommendationsResponse(SINGLE_PERIOD_FIXTURE);
    expect(result).toContain('Current: Strong Buy: 5');
    // Should NOT contain the markdown table header
    expect(result).not.toContain('|Period|');
  });

  it('format=json returns serialized data', () => {
    const result = formatRecommendationsResponse(TREND_OBJECT_FIXTURE, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('AAPL');
    expect(Array.isArray(parsed.AAPL)).toBe(true);
    expect(parsed.AAPL[0].period).toBe('0m');
    expect(parsed.AAPL[0].strongBuy).toBe(12);
  });

  it('empty trend array returns "No recommendation data"', () => {
    const result = formatRecommendationsResponse(EMPTY_TREND_FIXTURE);
    expect(result).toContain('No recommendation data');
  });

  it('null trend returns "No recommendation data"', () => {
    const result = formatRecommendationsResponse(NULL_TREND_FIXTURE);
    expect(result).toContain('No recommendation data');
  });

  it('bearish consensus shows Sell label', () => {
    const result = formatRecommendationsResponse(BEARISH_FIXTURE);
    expect(result).toContain('Consensus: Sell');
  });

  it('consensus score computed correctly', () => {
    // For AAPL fixture: (12*1 + 18*2 + 8*3 + 2*4 + 0*5) / 40 = (12+36+24+8+0)/40 = 80/40 = 2.0
    const result = formatRecommendationsResponse(TREND_OBJECT_FIXTURE);
    expect(result).toContain('2.0/5');
  });

  it('empty data returns wrapped message', () => {
    const result = formatRecommendationsResponse({});
    expect(result).toContain('No recommendation data available');
  });
});
