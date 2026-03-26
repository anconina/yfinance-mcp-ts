import {
  aggregateOHLCV,
  computeStats,
  autoSelectInterval,
  OHLCVRow,
  PriceStats,
} from '@/mcp/formatters/aggregation';

// ============================================================================
// Test Data Factories
// ============================================================================

function makeRow(
  date: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): OHLCVRow {
  return { date, open, high, low, close, volume };
}

// 10 daily rows spanning 2 ISO weeks (Mon 2026-03-02 to Fri 2026-03-13)
// Week 1: Mon 2026-03-02 through Fri 2026-03-06
// Week 2: Mon 2026-03-09 through Fri 2026-03-13
const TWO_WEEK_DAILY: OHLCVRow[] = [
  // Week 1
  makeRow('2026-03-02', 100, 105, 99, 103, 1000),
  makeRow('2026-03-03', 103, 108, 101, 106, 1200),
  makeRow('2026-03-04', 106, 110, 104, 107, 1100),
  makeRow('2026-03-05', 107, 112, 106, 111, 1300),
  makeRow('2026-03-06', 111, 115, 109, 113, 1400),
  // Week 2
  makeRow('2026-03-09', 113, 118, 112, 116, 1500),
  makeRow('2026-03-10', 116, 120, 114, 118, 1600),
  makeRow('2026-03-11', 118, 122, 115, 119, 1700),
  makeRow('2026-03-12', 119, 121, 117, 120, 1800),
  makeRow('2026-03-13', 120, 125, 118, 123, 1900),
];

// 3 months of sparse daily data for monthly aggregation
// Jan 2026: 3 rows, Feb 2026: 3 rows, Mar 2026: 3 rows
const THREE_MONTH_DAILY: OHLCVRow[] = [
  // January
  makeRow('2026-01-05', 100, 105, 98, 103, 5000),
  makeRow('2026-01-15', 103, 110, 101, 108, 6000),
  makeRow('2026-01-30', 108, 112, 106, 110, 5500),
  // February
  makeRow('2026-02-03', 110, 115, 109, 113, 7000),
  makeRow('2026-02-14', 113, 118, 111, 116, 7500),
  makeRow('2026-02-27', 116, 120, 114, 118, 6500),
  // March
  makeRow('2026-03-02', 118, 123, 117, 121, 8000),
  makeRow('2026-03-10', 121, 126, 119, 124, 8500),
  makeRow('2026-03-13', 124, 128, 122, 126, 9000),
];

// Holiday week: 4 trading days (no Monday due to holiday)
// ISO week of 2026-01-19 (Mon) - only Tue-Fri trade
const HOLIDAY_WEEK: OHLCVRow[] = [
  makeRow('2026-01-20', 200, 210, 198, 205, 3000), // Tuesday
  makeRow('2026-01-21', 205, 212, 203, 208, 3200),
  makeRow('2026-01-22', 208, 215, 206, 213, 3100),
  makeRow('2026-01-23', 213, 218, 211, 216, 3300), // Friday
];

// Known 5-day dataset for hand-calculated stats
// Closes: [100, 102, 98, 105, 103]
// Daily returns: [0.02, -0.0392157, 0.0714286, -0.0190476]
const STATS_DATASET: OHLCVRow[] = [
  makeRow('2026-03-09', 99, 101, 98, 100, 10000),
  makeRow('2026-03-10', 100, 103, 99, 102, 12000),
  makeRow('2026-03-11', 102, 102, 96, 98, 15000),
  makeRow('2026-03-12', 98, 106, 97, 105, 11000),
  makeRow('2026-03-13', 105, 106, 102, 103, 13000),
];

// Monotonically increasing series (no drawdown)
const INCREASING_SERIES: OHLCVRow[] = [
  makeRow('2026-03-09', 100, 101, 99, 101, 5000),
  makeRow('2026-03-10', 101, 103, 100, 103, 5500),
  makeRow('2026-03-11', 103, 106, 102, 106, 6000),
  makeRow('2026-03-12', 106, 110, 105, 110, 6500),
  makeRow('2026-03-13', 110, 115, 109, 115, 7000),
];

// ============================================================================
// aggregateOHLCV Tests
// ============================================================================

describe('aggregateOHLCV', () => {
  describe('weekly aggregation', () => {
    it('groups 10 daily rows into 2 weekly rows', () => {
      const result = aggregateOHLCV(TWO_WEEK_DAILY, 'weekly');
      expect(result).toHaveLength(2);
    });

    it('assigns correct date (ISO week start = Monday) to each bucket', () => {
      const result = aggregateOHLCV(TWO_WEEK_DAILY, 'weekly');
      expect(result[0].date).toBe('2026-03-02');
      expect(result[1].date).toBe('2026-03-09');
    });

    it('open = first candle open in bucket', () => {
      const result = aggregateOHLCV(TWO_WEEK_DAILY, 'weekly');
      // Week 1: first row open = 100
      expect(result[0].open).toBe(100);
      // Week 2: first row open = 113
      expect(result[1].open).toBe(113);
    });

    it('high = max of all highs in bucket', () => {
      const result = aggregateOHLCV(TWO_WEEK_DAILY, 'weekly');
      // Week 1: max high = 115 (from 2026-03-06)
      expect(result[0].high).toBe(115);
      // Week 2: max high = 125 (from 2026-03-13)
      expect(result[1].high).toBe(125);
    });

    it('low = min of all lows in bucket', () => {
      const result = aggregateOHLCV(TWO_WEEK_DAILY, 'weekly');
      // Week 1: min low = 99 (from 2026-03-02)
      expect(result[0].low).toBe(99);
      // Week 2: min low = 112 (from 2026-03-09)
      expect(result[1].low).toBe(112);
    });

    it('close = last candle close in bucket', () => {
      const result = aggregateOHLCV(TWO_WEEK_DAILY, 'weekly');
      // Week 1: last row close = 113
      expect(result[0].close).toBe(113);
      // Week 2: last row close = 123
      expect(result[1].close).toBe(123);
    });

    it('volume = sum of all volumes in bucket', () => {
      const result = aggregateOHLCV(TWO_WEEK_DAILY, 'weekly');
      // Week 1: 1000+1200+1100+1300+1400 = 6000
      expect(result[0].volume).toBe(6000);
      // Week 2: 1500+1600+1700+1800+1900 = 8500
      expect(result[1].volume).toBe(8500);
    });

    it('holiday week with 4 trading days produces single bucket', () => {
      const result = aggregateOHLCV(HOLIDAY_WEEK, 'weekly');
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-01-19'); // Monday, ISO week start
      expect(result[0].open).toBe(200);  // First candle (Tuesday)
      expect(result[0].high).toBe(218);  // Max high
      expect(result[0].low).toBe(198);   // Min low
      expect(result[0].close).toBe(216); // Last candle (Friday)
      expect(result[0].volume).toBe(12600); // Sum: 3000+3200+3100+3300
    });
  });

  describe('monthly aggregation', () => {
    it('groups daily rows into correct monthly buckets', () => {
      const result = aggregateOHLCV(THREE_MONTH_DAILY, 'monthly');
      expect(result).toHaveLength(3);
    });

    it('assigns month start date to each bucket', () => {
      const result = aggregateOHLCV(THREE_MONTH_DAILY, 'monthly');
      expect(result[0].date).toBe('2026-01-01');
      expect(result[1].date).toBe('2026-02-01');
      expect(result[2].date).toBe('2026-03-01');
    });

    it('applies correct OHLCV rules for monthly buckets', () => {
      const result = aggregateOHLCV(THREE_MONTH_DAILY, 'monthly');
      // January: open=100, high=max(105,110,112)=112, low=min(98,101,106)=98, close=110, vol=16500
      expect(result[0].open).toBe(100);
      expect(result[0].high).toBe(112);
      expect(result[0].low).toBe(98);
      expect(result[0].close).toBe(110);
      expect(result[0].volume).toBe(16500);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      const result = aggregateOHLCV([], 'weekly');
      expect(result).toEqual([]);
    });

    it('returns single row unchanged for single-row input', () => {
      const single = [makeRow('2026-03-13', 100, 105, 99, 103, 5000)];
      const result = aggregateOHLCV(single, 'weekly');
      expect(result).toHaveLength(1);
      expect(result[0].open).toBe(100);
      expect(result[0].high).toBe(105);
      expect(result[0].low).toBe(99);
      expect(result[0].close).toBe(103);
      expect(result[0].volume).toBe(5000);
    });

    it('returns empty array for empty input (monthly)', () => {
      const result = aggregateOHLCV([], 'monthly');
      expect(result).toEqual([]);
    });
  });
});

// ============================================================================
// computeStats Tests
// ============================================================================

describe('computeStats', () => {
  it('computes returnPct correctly for known dataset', () => {
    // Closes: [100, 102, 98, 105, 103]
    // returnPct = ((103 - 100) / 100) * 100 = 3%
    const stats = computeStats(STATS_DATASET);
    expect(stats.returnPct).toBeCloseTo(3, 1);
  });

  it('computes annualizedVol correctly for known dataset', () => {
    // Daily returns: [0.02, -0.039216, 0.071429, -0.019048]
    // Mean: 0.008291
    // Variance (population): sum((r-mean)^2)/4
    // StdDev * sqrt(252)
    const stats = computeStats(STATS_DATASET);
    // Hand-calculated: daily returns stddev ~0.04376, annualized ~69.5%
    // Allow tolerance for floating point
    expect(stats.annualizedVol).toBeGreaterThan(50);
    expect(stats.annualizedVol).toBeLessThan(100);
  });

  it('computes maxDrawdown correctly for known dataset', () => {
    // Closes: [100, 102, 98, 105, 103]
    // Peak at 102, trough at 98 -> drawdown = (98-102)/102 = -3.922%
    // Peak at 105, trough at 103 -> drawdown = (103-105)/105 = -1.905%
    // Max drawdown = -3.922%
    const stats = computeStats(STATS_DATASET);
    expect(stats.maxDrawdown).toBeCloseTo(-3.922, 1);
  });

  it('computes avgVolume correctly for known dataset', () => {
    // Volumes: [10000, 12000, 15000, 11000, 13000] -> avg = 12200
    const stats = computeStats(STATS_DATASET);
    expect(stats.avgVolume).toBe(12200);
  });

  it('returns all zeros for empty input', () => {
    const stats = computeStats([]);
    expect(stats.returnPct).toBe(0);
    expect(stats.annualizedVol).toBe(0);
    expect(stats.maxDrawdown).toBe(0);
    expect(stats.avgVolume).toBe(0);
  });

  it('returns zero return, vol, drawdown for single row', () => {
    const single = [makeRow('2026-03-13', 100, 105, 99, 103, 5000)];
    const stats = computeStats(single);
    expect(stats.returnPct).toBe(0);
    expect(stats.annualizedVol).toBe(0);
    expect(stats.maxDrawdown).toBe(0);
    expect(stats.avgVolume).toBe(5000);
  });

  it('returns maxDrawdown=0 for monotonically increasing series', () => {
    const stats = computeStats(INCREASING_SERIES);
    expect(stats.maxDrawdown).toBe(0);
  });

  it('returns positive returnPct for increasing series', () => {
    // Closes: [101, 103, 106, 110, 115]
    // returnPct = ((115 - 101) / 101) * 100 = 13.861%
    const stats = computeStats(INCREASING_SERIES);
    expect(stats.returnPct).toBeCloseTo(13.861, 1);
  });
});

// ============================================================================
// autoSelectInterval Tests
// ============================================================================

describe('autoSelectInterval', () => {
  it('returns daily for 5d period', () => {
    expect(autoSelectInterval('5d')).toBe('daily');
  });

  it('returns daily for 1mo period', () => {
    expect(autoSelectInterval('1mo')).toBe('daily');
  });

  it('returns daily for 3mo period', () => {
    expect(autoSelectInterval('3mo')).toBe('daily');
  });

  it('returns weekly for 6mo period', () => {
    expect(autoSelectInterval('6mo')).toBe('weekly');
  });

  it('returns weekly for 1y period', () => {
    expect(autoSelectInterval('1y')).toBe('weekly');
  });

  it('returns monthly for 2y period', () => {
    expect(autoSelectInterval('2y')).toBe('monthly');
  });

  it('returns monthly for 5y period', () => {
    expect(autoSelectInterval('5y')).toBe('monthly');
  });

  it('returns monthly for max period', () => {
    expect(autoSelectInterval('max')).toBe('monthly');
  });

  it('returns monthly for 10y period', () => {
    expect(autoSelectInterval('10y')).toBe('monthly');
  });

  it('returns daily for 1d period', () => {
    expect(autoSelectInterval('1d')).toBe('daily');
  });
});
