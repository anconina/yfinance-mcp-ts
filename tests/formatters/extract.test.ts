import {
  extractValue,
  stripNulls,
  flattenYahooObject,
} from '../../src/mcp/formatters/extract';

describe('extractValue', () => {
  describe('Yahoo {raw, fmt} pairs', () => {
    it('returns raw for compute purpose', () => {
      expect(extractValue({ raw: 150.45, fmt: '150.45' }, 'compute')).toBe(150.45);
    });

    it('returns fmt for display purpose', () => {
      expect(extractValue({ raw: 150.45, fmt: '150.45' }, 'display')).toBe('150.45');
    });

    it('falls back to String(raw) when fmt is missing for display', () => {
      expect(extractValue({ raw: 150.45 }, 'display')).toBe('150.45');
    });

    it('returns raw when fmt is null for display', () => {
      expect(extractValue({ raw: 42, fmt: null }, 'display')).toBe('42');
    });

    it('defaults to compute purpose', () => {
      expect(extractValue({ raw: 150.45, fmt: '150.45' })).toBe(150.45);
    });
  });

  describe('null and undefined', () => {
    it('returns null for null input', () => {
      expect(extractValue(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(extractValue(undefined)).toBeNull();
    });
  });

  describe('plain values', () => {
    it('returns number for number input', () => {
      expect(extractValue(42)).toBe(42);
    });

    it('returns string for string input', () => {
      expect(extractValue('hello')).toBe('hello');
    });

    it('returns zero for zero input', () => {
      expect(extractValue(0)).toBe(0);
    });

    it('returns empty string for empty string input', () => {
      expect(extractValue('')).toBe('');
    });
  });

  describe('unrecognized objects', () => {
    it('returns null for object without raw key', () => {
      expect(extractValue({ other: 'shape' })).toBeNull();
    });

    it('returns null for empty object', () => {
      expect(extractValue({})).toBeNull();
    });

    it('returns null for array', () => {
      expect(extractValue([1, 2, 3])).toBeNull();
    });

    it('returns null for boolean', () => {
      expect(extractValue(true)).toBeNull();
    });
  });
});

describe('stripNulls', () => {
  it('removes null values from flat objects', () => {
    expect(stripNulls({ a: 1, b: null })).toEqual({ a: 1 });
  });

  it('removes undefined values from flat objects', () => {
    expect(stripNulls({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('recursively removes nulls from nested objects', () => {
    expect(stripNulls({ a: 1, b: null, c: { d: undefined, e: 2 } })).toEqual({
      a: 1,
      c: { e: 2 },
    });
  });

  it('filters nulls from arrays', () => {
    expect(stripNulls({ a: [1, null, 3] })).toEqual({ a: [1, 3] });
  });

  it('filters undefined from arrays', () => {
    expect(stripNulls({ a: [1, undefined, 3] })).toEqual({ a: [1, 3] });
  });

  it('recursively strips nested arrays and objects', () => {
    expect(
      stripNulls({ a: [{ b: null, c: 1 }, null, { d: 2 }] })
    ).toEqual({ a: [{ c: 1 }, { d: 2 }] });
  });

  it('preserves empty objects', () => {
    expect(stripNulls({})).toEqual({});
  });

  it('preserves empty arrays in objects', () => {
    expect(stripNulls({ a: [] })).toEqual({ a: [] });
  });

  it('passes through null primitive', () => {
    expect(stripNulls(null)).toBeNull();
  });

  it('passes through undefined primitive', () => {
    expect(stripNulls(undefined)).toBeUndefined();
  });

  it('passes through number primitive', () => {
    expect(stripNulls(42)).toBe(42);
  });

  it('passes through string primitive', () => {
    expect(stripNulls('hello')).toBe('hello');
  });

  it('handles deeply nested structures', () => {
    expect(
      stripNulls({ a: { b: { c: { d: null, e: 'deep' } } } })
    ).toEqual({ a: { b: { c: { e: 'deep' } } } });
  });
});

describe('flattenYahooObject', () => {
  it('flattens {raw, fmt} pairs to raw values', () => {
    const input = {
      marketCap: { raw: 2780000000000, fmt: '2.78T' },
      price: { raw: 150.45, fmt: '150.45' },
    };
    expect(flattenYahooObject(input)).toEqual({
      marketCap: 2780000000000,
      price: 150.45,
    });
  });

  it('passes through plain numbers', () => {
    expect(flattenYahooObject({ count: 42 })).toEqual({ count: 42 });
  });

  it('passes through plain strings', () => {
    expect(flattenYahooObject({ name: 'AAPL' })).toEqual({ name: 'AAPL' });
  });

  it('converts null values to null', () => {
    expect(flattenYahooObject({ missing: null })).toEqual({ missing: null });
  });

  it('handles mixed value types', () => {
    const input = {
      marketCap: { raw: 2780000000000, fmt: '2.78T' },
      symbol: 'AAPL',
      count: 42,
      missing: null,
      nested: { other: 'shape' },
    };
    expect(flattenYahooObject(input)).toEqual({
      marketCap: 2780000000000,
      symbol: 'AAPL',
      count: 42,
      missing: null,
      nested: null, // object without raw key -> null
    });
  });

  it('handles empty object', () => {
    expect(flattenYahooObject({})).toEqual({});
  });
});
