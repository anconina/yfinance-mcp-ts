import { formatEarningsResponse } from '../../src/mcp/formatters/earnings';

// --- Fixtures ---

/** Full earnings module object matching Yahoo's data shape. */
const EARNINGS_FIXTURE = {
  AAPL: {
    maxAge: 86400,
    earningsChart: {
      quarterly: [
        {
          date: '4Q2023',
          actual: { raw: 2.18, fmt: '2.18' },
          estimate: { raw: 2.10, fmt: '2.10' },
        },
        {
          date: '1Q2024',
          actual: { raw: 1.53, fmt: '1.53' },
          estimate: { raw: 1.50, fmt: '1.50' },
        },
        {
          date: '2Q2024',
          actual: { raw: 1.40, fmt: '1.40' },
          estimate: { raw: 1.35, fmt: '1.35' },
        },
        {
          date: '3Q2024',
          actual: { raw: 1.64, fmt: '1.64' },
          estimate: { raw: 1.58, fmt: '1.58' },
        },
      ],
      currentQuarterEstimate: { raw: 2.35, fmt: '2.35' },
      currentQuarterEstimateDate: '4Q2024',
      currentQuarterEstimateYear: 2024,
      earningsDate: [{ raw: 1738195200, fmt: '2025-01-30' }],
    },
    financialsChart: {
      yearly: [
        { date: 2022, revenue: { raw: 394328000000, fmt: '394.33B' }, earnings: { raw: 99803000000, fmt: '99.8B' } },
        { date: 2023, revenue: { raw: 383285000000, fmt: '383.29B' }, earnings: { raw: 97000000000, fmt: '97B' } },
        { date: 2024, revenue: { raw: 391035000000, fmt: '391.04B' }, earnings: { raw: 100913000000, fmt: '100.91B' } },
      ],
      quarterly: [
        { date: '4Q2023', revenue: { raw: 119575000000, fmt: '119.58B' }, earnings: { raw: 33916000000, fmt: '33.92B' } },
      ],
    },
  },
};

/** Fixture with negative surprise (actual < estimate). */
const NEGATIVE_SURPRISE_FIXTURE = {
  AAPL: {
    earningsChart: {
      quarterly: [
        {
          date: '1Q2024',
          actual: { raw: 1.40, fmt: '1.40' },
          estimate: { raw: 1.60, fmt: '1.60' },
        },
      ],
    },
    financialsChart: {
      yearly: [
        { date: 2023, revenue: { raw: 383285000000, fmt: '383.29B' }, earnings: { raw: 97000000000, fmt: '97B' } },
        { date: 2024, revenue: { raw: 391035000000, fmt: '391.04B' }, earnings: { raw: 100913000000, fmt: '100.91B' } },
      ],
    },
  },
};

/** Missing earningsChart -- only revenue data. */
const MISSING_EARNINGS_CHART_FIXTURE = {
  AAPL: {
    financialsChart: {
      yearly: [
        { date: 2023, revenue: { raw: 383285000000, fmt: '383.29B' }, earnings: { raw: 97000000000, fmt: '97B' } },
        { date: 2024, revenue: { raw: 391035000000, fmt: '391.04B' }, earnings: { raw: 100913000000, fmt: '100.91B' } },
      ],
    },
  },
};

/** Completely empty data. */
const EMPTY_FIXTURE = {
  AAPL: {},
};

// --- Tests ---

describe('formatEarningsResponse', () => {
  it('EPS history table with 4 quarters and correct surprise% computation', () => {
    const result = formatEarningsResponse(EARNINGS_FIXTURE);
    // Table should have Quarter, EPS Est, EPS Act, Surprise headers
    expect(result).toContain('|Quarter|EPS Est|EPS Act|Surprise|');
    // Check all 4 quarters present
    expect(result).toContain('4Q2023');
    expect(result).toContain('1Q2024');
    expect(result).toContain('2Q2024');
    expect(result).toContain('3Q2024');
  });

  it('positive surprise (actual > estimate) formatted with + sign', () => {
    const result = formatEarningsResponse(EARNINGS_FIXTURE);
    // 4Q2023: actual 2.18, est 2.10 -> surprise = (2.18-2.10)/2.10*100 = +3.8%
    expect(result).toContain('+3.8%');
  });

  it('negative surprise (actual < estimate) formatted with - sign', () => {
    const result = formatEarningsResponse(NEGATIVE_SURPRISE_FIXTURE);
    // 1Q2024: actual 1.40, est 1.60 -> surprise = (1.40-1.60)/1.60*100 = -12.5%
    expect(result).toContain('-12.5%');
  });

  it('next quarter estimate line present when data available', () => {
    const result = formatEarningsResponse(EARNINGS_FIXTURE);
    expect(result).toContain('Next: 4Q2024 2024 est. $2.35');
  });

  it('revenue trend with YoY computed from yearly financialsChart', () => {
    const result = formatEarningsResponse(EARNINGS_FIXTURE);
    // Revenue YoY: (391035000000 - 383285000000) / 383285000000 * 100 = +2.0%
    expect(result).toContain('Revenue:');
    expect(result).toContain('YoY');
    expect(result).toContain('+2.0%');
  });

  it('missing earningsChart -- shows just revenue if available', () => {
    const result = formatEarningsResponse(MISSING_EARNINGS_CHART_FIXTURE);
    // Should have revenue line
    expect(result).toContain('Revenue:');
    // Should not have EPS table
    expect(result).not.toContain('|Quarter|');
    // Should not have next quarter
    expect(result).not.toContain('Next:');
  });

  it('format=json returns serialized data', () => {
    const result = formatEarningsResponse(EARNINGS_FIXTURE, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('AAPL');
    // Projection flattens earningsChart/financialsChart into top-level keys
    expect(parsed.AAPL.quarterly).toBeDefined();
    expect(parsed.AAPL.quarterly).toHaveLength(4);
    expect(parsed.AAPL.yearly).toBeDefined();
  });

  it('empty data returns "No earnings data"', () => {
    const result = formatEarningsResponse(EMPTY_FIXTURE);
    expect(result).toContain('No earnings data');
  });

  it('empty object returns wrapped message', () => {
    const result = formatEarningsResponse({});
    expect(result).toContain('No earnings data available');
  });

  it('error string handled gracefully', () => {
    const result = formatEarningsResponse({ INVALID: 'No data found' } as Record<string, unknown>);
    expect(result).toContain('INVALID | Error: No data found');
  });

  it('revenue is formatted with compact notation', () => {
    const result = formatEarningsResponse(EARNINGS_FIXTURE);
    // 391035000000 should be something like 391B
    expect(result).toMatch(/Revenue: \d+(\.\d+)?[BMT]/);
  });
});
