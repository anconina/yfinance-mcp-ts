/**
 * Tests for the options domain formatter.
 *
 * Covers: normalizeContract extraction, findATMStrike edge cases,
 * groupByExpiration bucketing, formatOptionsResponse with progressive
 * disclosure (summary/full/filtered), JSON format, error/empty handling,
 * IV formatting, ATM marking, hints, and envelope wrapping.
 */

import {
  normalizeContract,
  findATMStrike,
  groupByExpiration,
  formatOptionsResponse,
  NormalizedContract,
} from '../../src/mcp/formatters/options';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Build a contract object matching processOptionData output shape.
 * Numeric fields use {raw, fmt} pairs (Yahoo format). Expiration is a Date.
 */
function makeContract(opts: {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  iv: number;
  itm: boolean;
  expiration: Date;
  optionType: 'call' | 'put';
}): Record<string, unknown> {
  return {
    strike: { raw: opts.strike, fmt: opts.strike.toFixed(2) },
    lastPrice: { raw: opts.lastPrice, fmt: opts.lastPrice.toFixed(2) },
    bid: { raw: opts.bid, fmt: opts.bid.toFixed(2) },
    ask: { raw: opts.ask, fmt: opts.ask.toFixed(2) },
    volume: { raw: opts.volume, fmt: String(opts.volume) },
    openInterest: { raw: opts.openInterest, fmt: String(opts.openInterest) },
    impliedVolatility: { raw: opts.iv, fmt: (opts.iv * 100).toFixed(2) + '%' },
    inTheMoney: opts.itm,
    expiration: opts.expiration,
    optionType: opts.optionType,
  };
}

/**
 * Generate a set of contracts across multiple expirations for a liquid stock.
 * AAPL-like: underlyingPrice 178.45, strikes 160-200 step 2 (21 strikes).
 * The ATM+-5 window filters to 11 strikes per expiration, testing real filtering.
 */
function buildLiquidOptions() {
  const now = new Date();
  const exp1 = new Date(now.getTime() + 7 * 86_400_000); // 7 DTE
  const exp2 = new Date(now.getTime() + 14 * 86_400_000); // 14 DTE
  const exp3 = new Date(now.getTime() + 30 * 86_400_000); // 30 DTE

  // $5 strike spacing: realistic for a ~$180 stock
  const strikes: number[] = [];
  for (let s = 150; s <= 210; s += 5) strikes.push(s);
  const expirations = [exp1, exp2, exp3];

  const calls: Record<string, unknown>[] = [];
  const puts: Record<string, unknown>[] = [];

  for (const exp of expirations) {
    for (const strike of strikes) {
      const itm = strike <= 178;
      const distance = Math.abs(strike - 178.45);
      const iv = 0.25 + distance * 0.005; // IV smile
      const callPrice = Math.max(0.05, 178.45 - strike + iv * 10);
      const putPrice = Math.max(0.05, strike - 178.45 + iv * 10);

      calls.push(
        makeContract({
          strike,
          lastPrice: Math.round(callPrice * 100) / 100,
          bid: Math.round((callPrice - 0.05) * 100) / 100,
          ask: Math.round((callPrice + 0.05) * 100) / 100,
          volume: 1500,
          openInterest: 3000,
          iv,
          itm,
          expiration: exp,
          optionType: 'call',
        })
      );

      puts.push(
        makeContract({
          strike,
          lastPrice: Math.round(putPrice * 100) / 100,
          bid: Math.round((putPrice - 0.05) * 100) / 100,
          ask: Math.round((putPrice + 0.05) * 100) / 100,
          volume: 1200,
          openInterest: 2500,
          iv: iv + 0.02,
          itm: !itm,
          expiration: exp,
          optionType: 'put',
        })
      );
    }
  }

  const expirationDates = expirations.map(
    (e) => Math.floor(e.getTime() / 1000)
  );

  return {
    AAPL: {
      calls,
      puts,
      underlyingSymbol: 'AAPL',
      underlyingPrice: 178.45,
      expirationDates,
      strikes,
    },
  };
}

/** Sparse options: thinly-traded with null bid/ask on some contracts. */
function buildSparseOptions() {
  const now = new Date();
  const exp1 = new Date(now.getTime() + 14 * 86_400_000);
  const strikes = [22, 23, 24, 25, 26];

  const calls: Record<string, unknown>[] = strikes.map((strike) => ({
    strike: { raw: strike, fmt: strike.toFixed(2) },
    lastPrice: strike === 25 ? { raw: 0.5, fmt: '0.50' } : null,
    bid: strike === 25 ? { raw: 0.45, fmt: '0.45' } : null,
    ask: strike === 25 ? { raw: 0.55, fmt: '0.55' } : null,
    volume: strike === 25 ? { raw: 10, fmt: '10' } : { raw: 0, fmt: '0' },
    openInterest: { raw: strike === 25 ? 50 : 0, fmt: String(strike === 25 ? 50 : 0) },
    impliedVolatility:
      strike === 25 ? { raw: 0.45, fmt: '45.00%' } : null,
    inTheMoney: strike < 25,
    expiration: exp1,
    optionType: 'call',
  }));

  return {
    THIN: {
      calls,
      puts: [],
      underlyingSymbol: 'THIN',
      underlyingPrice: 25.0,
      expirationDates: [Math.floor(exp1.getTime() / 1000)],
      strikes,
    },
  };
}

/** 8 expirations to test summary selection (nearest 3 should show). */
function buildManyExpirations() {
  const now = new Date();
  const exps: Date[] = [];
  for (let i = 1; i <= 8; i++) {
    exps.push(new Date(now.getTime() + i * 7 * 86_400_000));
  }

  const strikes = [95, 100, 105];
  const calls: Record<string, unknown>[] = [];
  const puts: Record<string, unknown>[] = [];

  for (const exp of exps) {
    for (const strike of strikes) {
      calls.push(
        makeContract({
          strike,
          lastPrice: 2.0,
          bid: 1.95,
          ask: 2.05,
          volume: 100,
          openInterest: 200,
          iv: 0.3,
          itm: strike < 100,
          expiration: exp,
          optionType: 'call',
        })
      );
      puts.push(
        makeContract({
          strike,
          lastPrice: 2.0,
          bid: 1.95,
          ask: 2.05,
          volume: 100,
          openInterest: 200,
          iv: 0.3,
          itm: strike > 100,
          expiration: exp,
          optionType: 'put',
        })
      );
    }
  }

  return {
    MANY: {
      calls,
      puts,
      underlyingSymbol: 'MANY',
      underlyingPrice: 100.0,
      expirationDates: exps.map((e) => Math.floor(e.getTime() / 1000)),
      strikes,
    },
  };
}

/** Empty options: valid structure but no contracts. */
const EMPTY_OPTIONS = {
  EMPTY: {
    calls: [],
    puts: [],
    underlyingSymbol: 'EMPTY',
    underlyingPrice: 50.0,
    expirationDates: [],
    strikes: [],
  },
};

/** No underlying price: same as liquid but null price. */
function buildNoPriceOptions() {
  const data = buildLiquidOptions();
  (data.AAPL as Record<string, unknown>).underlyingPrice = null;
  return data;
}

/** Error data: symbol value is a string instead of option chain. */
const ERROR_DATA = {
  INVALID: 'Symbol not found',
};

// ---------------------------------------------------------------------------
// normalizeContract
// ---------------------------------------------------------------------------

describe('normalizeContract', () => {
  it('extracts raw values from {raw, fmt} pairs correctly', () => {
    const contract = makeContract({
      strike: 180,
      lastPrice: 5.25,
      bid: 5.2,
      ask: 5.3,
      volume: 1500,
      openInterest: 3000,
      iv: 0.3215,
      itm: true,
      expiration: new Date(),
      optionType: 'call',
    });

    const result = normalizeContract(contract);
    expect(result.strike).toBe(180);
    expect(result.last).toBe(5.25);
    expect(result.bid).toBe(5.2);
    expect(result.ask).toBe(5.3);
    expect(result.volume).toBe(1500);
    expect(result.openInterest).toBe(3000);
    expect(result.iv).toBe(0.3215);
    expect(result.itm).toBe(true);
  });

  it('handles plain number values (no {raw, fmt} wrapper)', () => {
    const contract: Record<string, unknown> = {
      strike: 180,
      lastPrice: 5.25,
      bid: 5.2,
      ask: 5.3,
      volume: 1500,
      openInterest: 3000,
      impliedVolatility: 0.3215,
      inTheMoney: false,
    };

    const result = normalizeContract(contract);
    expect(result.strike).toBe(180);
    expect(result.last).toBe(5.25);
    expect(result.iv).toBe(0.3215);
    expect(result.itm).toBe(false);
  });

  it('returns null for missing/undefined fields', () => {
    const contract: Record<string, unknown> = {
      strike: { raw: 180, fmt: '180.00' },
      // All other fields missing
    };

    const result = normalizeContract(contract);
    expect(result.strike).toBe(180);
    expect(result.last).toBeNull();
    expect(result.bid).toBeNull();
    expect(result.ask).toBeNull();
    expect(result.volume).toBeNull();
    expect(result.openInterest).toBeNull();
    expect(result.iv).toBeNull();
  });

  it('sets itm to false when inTheMoney is missing', () => {
    const contract: Record<string, unknown> = {
      strike: 180,
    };

    const result = normalizeContract(contract);
    expect(result.itm).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findATMStrike
// ---------------------------------------------------------------------------

describe('findATMStrike', () => {
  it('finds closest strike when price is between two strikes', () => {
    const strikes = [170, 175, 180, 185, 190];
    // 178.45 is closer to 180 (1.55 away) than 175 (3.45 away)
    expect(findATMStrike(strikes, 178.45)).toBe(180);
  });

  it('picks lower strike when equidistant between two strikes', () => {
    const strikes = [170, 175, 180, 185, 190];
    // 177.5 is equidistant from 175 and 180 -> picks lower (175)
    expect(findATMStrike(strikes, 177.5)).toBe(175);
  });

  it('returns the only strike when array has one element', () => {
    expect(findATMStrike([180], 200)).toBe(180);
  });

  it('returns 0 for empty array', () => {
    expect(findATMStrike([], 178.45)).toBe(0);
  });

  it('handles price exactly on a strike', () => {
    const strikes = [170, 175, 180, 185, 190];
    expect(findATMStrike(strikes, 180)).toBe(180);
  });
});

// ---------------------------------------------------------------------------
// groupByExpiration
// ---------------------------------------------------------------------------

describe('groupByExpiration', () => {
  it('groups contracts from mixed expirations into separate date buckets', () => {
    const exp1 = new Date('2026-04-17T00:00:00Z');
    const exp2 = new Date('2026-05-15T00:00:00Z');

    const contracts = [
      { strike: 180, expiration: exp1 },
      { strike: 185, expiration: exp1 },
      { strike: 180, expiration: exp2 },
    ];

    const groups = groupByExpiration(contracts);
    expect(groups.size).toBe(2);
    expect(groups.get('2026-04-17')).toHaveLength(2);
    expect(groups.get('2026-05-15')).toHaveLength(1);
  });

  it('converts Date objects to ISO date strings', () => {
    const contracts = [
      { strike: 180, expiration: new Date('2026-06-19T12:30:00Z') },
    ];

    const groups = groupByExpiration(contracts);
    expect(groups.has('2026-06-19')).toBe(true);
  });

  it('handles contracts with numeric (Unix) expiration values', () => {
    // 2026-04-17 00:00:00 UTC = 1776556800
    const unixTs = Math.floor(new Date('2026-04-17T00:00:00Z').getTime() / 1000);
    const contracts = [{ strike: 180, expiration: unixTs }];

    const groups = groupByExpiration(contracts);
    expect(groups.has('2026-04-17')).toBe(true);
    expect(groups.get('2026-04-17')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// formatOptionsResponse
// ---------------------------------------------------------------------------

describe('formatOptionsResponse', () => {
  // --- Summary view ---

  it('summary view contains expiration list, calls/puts tables, under 3000 chars', () => {
    const data = buildLiquidOptions();
    const result = formatOptionsResponse(data);

    expect(result).toContain('Expirations:');
    expect(result).toContain('Calls:');
    expect(result).toContain('Puts:');
    expect(result.length).toBeLessThan(3000);
  });

  // --- ATM marking ---

  it('ATM strike row is marked with * prefix', () => {
    const data = buildLiquidOptions();
    const result = formatOptionsResponse(data);

    // ATM for 178.45 with $5 strikes: closest is 180
    expect(result).toContain('*180.00');
  });

  // --- DTE display ---

  it('each expiration section header shows DTE in parentheses', () => {
    const data = buildLiquidOptions();
    const result = formatOptionsResponse(data);

    // Should have DTE markers
    expect(result).toMatch(/\(\d+ DTE\)/);
  });

  // --- Expiration list ---

  it('response lists ALL available expirations, not just shown ones', () => {
    const data = buildManyExpirations();
    const result = formatOptionsResponse(data);

    // 8 expirations in fixture, summary shows 3, but all 8 should be listed
    const expLine = result
      .split('\n')
      .find((l) => l.startsWith('Expirations:'));
    expect(expLine).toBeDefined();
    // Count comma-separated dates
    const commas = (expLine!.match(/,/g) || []).length;
    // 8 dates means 7 commas
    expect(commas).toBe(7);
  });

  // --- Single expiration filter ---

  it('expiration param shows only that date', () => {
    const data = buildLiquidOptions();
    const allExps = (data.AAPL.expirationDates as number[]).map(
      (ts) => new Date(ts * 1000).toISOString().slice(0, 10)
    );
    const targetExp = allExps[1]; // second expiration

    const result = formatOptionsResponse(data, { expiration: targetExp });

    // Should contain only the target expiration's section header
    const dteHeaders = result.match(/--- \d{4}-\d{2}-\d{2}/g) || [];
    expect(dteHeaders).toHaveLength(1);
    expect(dteHeaders[0]).toContain(targetExp);
  });

  it('returns error hint if expiration not found', () => {
    const data = buildLiquidOptions();
    const result = formatOptionsResponse(data, { expiration: '2099-12-31' });

    expect(result).toContain('not found');
    expect(result).toContain('Available:');
  });

  // --- Strike range override ---

  it('strike_range=2 narrows to fewer rows', () => {
    const data = buildLiquidOptions();
    const defaultResult = formatOptionsResponse(data);
    const narrowResult = formatOptionsResponse(data, { strike_range: 2 });

    // Narrow result should have fewer table rows
    const countRows = (s: string) =>
      s.split('\n').filter((l) => l.startsWith('|') && !l.includes('Strike') && !l.includes('---')).length;

    expect(countRows(narrowResult)).toBeLessThan(countRows(defaultResult));
  });

  // --- Type filters ---

  it('type=calls shows only Calls section, no Puts', () => {
    const data = buildLiquidOptions();
    const result = formatOptionsResponse(data, { type: 'calls' });

    expect(result).toContain('Calls:');
    expect(result).not.toContain('Puts:');
  });

  it('type=puts shows only Puts section, no Calls', () => {
    const data = buildLiquidOptions();
    const result = formatOptionsResponse(data, { type: 'puts' });

    expect(result).toContain('Puts:');
    expect(result).not.toContain('Calls:');
  });

  // --- Detail full ---

  it('detail=full shows all expirations', () => {
    const data = buildManyExpirations();
    const result = formatOptionsResponse(data, { detail: 'full' });

    // Should have 8 expiration section headers
    const dteHeaders = result.match(/--- \d{4}-\d{2}-\d{2}/g) || [];
    expect(dteHeaders).toHaveLength(8);
  });

  // --- JSON format ---

  it('format=json returns valid parseable JSON with expected structure', () => {
    const data = buildLiquidOptions();
    const result = formatOptionsResponse(data, { format: 'json' });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('expirations');
    expect(parsed).toHaveProperty('underlyingPrice', 178.45);
    expect(parsed).toHaveProperty('atmStrike');
    expect(parsed).toHaveProperty('data');
    expect(Array.isArray(parsed.expirations)).toBe(true);

    // Data should have expiration keys with calls/puts arrays
    const expKeys = Object.keys(parsed.data);
    expect(expKeys.length).toBeGreaterThan(0);
    const firstExp = parsed.data[expKeys[0]];
    expect(Array.isArray(firstExp.calls)).toBe(true);
    expect(Array.isArray(firstExp.puts)).toBe(true);
  });

  // --- Empty data ---

  it('empty data returns "No options data available", does not crash', () => {
    const result = formatOptionsResponse(EMPTY_OPTIONS);
    expect(result).toContain('No options data available');
  });

  // --- Error symbol ---

  it('error symbol returns inline error message', () => {
    const result = formatOptionsResponse(ERROR_DATA);
    expect(result).toContain('Error:');
    expect(result).toContain('Symbol not found');
  });

  // --- Missing underlying price ---

  it('missing underlying price does not crash, renders with estimated ATM', () => {
    const data = buildNoPriceOptions();
    const result = formatOptionsResponse(data);

    expect(result).toBeTruthy();
    expect(result).toContain('ATM Strike: estimated');
    // Should still have tables
    expect(result).toContain('Calls:');
  });

  // --- Sparse options with null fields ---

  it('null bid/ask render as dash, no NaN or [object Object]', () => {
    const data = buildSparseOptions();
    const result = formatOptionsResponse(data);

    // Should not contain NaN or object representations
    expect(result).not.toContain('NaN');
    expect(result).not.toContain('[object');
    // Should contain dash for null values
    expect(result).toContain('-');
  });

  // --- IV formatting ---

  it('IV appears as percentage, not decimal', () => {
    const data = buildLiquidOptions();
    const result = formatOptionsResponse(data);

    // Should contain percentage values like "25.00%" not "0.25"
    expect(result).toMatch(/\d+\.\d+%/);
    // Should NOT contain raw decimal IV values in table
    // (the decimal 0.25-0.35 range would appear as bare numbers if not converted)
    const tableLines = result
      .split('\n')
      .filter((l) => l.startsWith('|') && !l.includes('Strike') && !l.includes('---'));
    for (const line of tableLines) {
      const cells = line.split('|').filter(Boolean);
      // IV is the 7th cell (index 6)
      if (cells.length >= 7) {
        const ivCell = cells[6].trim();
        if (ivCell !== '-') {
          expect(ivCell).toMatch(/^\d+\.\d+%$/);
        }
      }
    }
  });

  // --- Envelope header ---

  it('response starts with envelope header containing symbol and date', () => {
    const data = buildLiquidOptions();
    const result = formatOptionsResponse(data);
    const firstLine = result.split('\n')[0];

    expect(firstLine).toContain('AAPL');
    expect(firstLine).toContain('Options Chain');
    expect(firstLine).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  // --- Hints ---

  it('summary view includes drill-down hints', () => {
    const data = buildManyExpirations();
    const result = formatOptionsResponse(data);

    expect(result).toContain('Tip:');
    expect(result).toContain('expiration=');
    expect(result).toContain('strike_range=');
    expect(result).toContain('type=');
    expect(result).toContain('detail="full"');
  });

  // --- Many expirations summary ---

  it('with 8 expirations, only nearest 3 rendered but all 8 listed', () => {
    const data = buildManyExpirations();
    const result = formatOptionsResponse(data);

    // Only 3 expiration section headers
    const dteHeaders = result.match(/--- \d{4}-\d{2}-\d{2}/g) || [];
    expect(dteHeaders).toHaveLength(3);

    // But all 8 listed in the expiration line
    const expLine = result
      .split('\n')
      .find((l) => l.startsWith('Expirations:'));
    expect(expLine).toBeDefined();
    const dates = expLine!.replace('Expirations: ', '').split(', ');
    expect(dates).toHaveLength(8);
  });
});
