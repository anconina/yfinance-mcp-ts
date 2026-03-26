import { formatCompact, formatChange, formatCurrency } from '../../src/mcp/formatters/numbers';

describe('formatCompact', () => {
  describe('compact context (default)', () => {
    it('formats trillions with T suffix', () => {
      expect(formatCompact(2780000000000)).toBe('2.78T');
    });

    it('formats millions with M suffix', () => {
      expect(formatCompact(45200000)).toBe('45.2M');
    });

    it('formats thousands with K suffix', () => {
      const result = formatCompact(12345);
      expect(result).toContain('K');
    });

    it('passes through small numbers without suffix', () => {
      const result = formatCompact(178.45);
      expect(result).toBe('178.45');
    });

    it('formats zero', () => {
      expect(formatCompact(0)).toBe('0');
    });

    it('handles negative trillions', () => {
      const result = formatCompact(-2780000000000);
      expect(result).toContain('T');
      expect(result).toMatch(/^-/);
    });
  });

  describe('edge cases (null, undefined, NaN)', () => {
    it('returns dash for null', () => {
      expect(formatCompact(null)).toBe('-');
    });

    it('returns dash for undefined', () => {
      expect(formatCompact(undefined)).toBe('-');
    });

    it('returns dash for NaN', () => {
      expect(formatCompact(NaN)).toBe('-');
    });
  });

  describe('price context', () => {
    it('always formats to 2 decimal places', () => {
      expect(formatCompact(150.456, 'price')).toBe('150.46');
    });

    it('pads to 2 decimal places', () => {
      expect(formatCompact(150, 'price')).toBe('150.00');
    });
  });

  describe('eps context', () => {
    it('always formats to 2 decimal places', () => {
      expect(formatCompact(6.4, 'eps')).toBe('6.40');
    });

    it('rounds correctly', () => {
      expect(formatCompact(6.456, 'eps')).toBe('6.46');
    });
  });

  describe('greeks context', () => {
    it('always formats to 4 decimal places', () => {
      expect(formatCompact(0.5012, 'greeks')).toBe('0.5012');
    });

    it('pads to 4 decimal places', () => {
      expect(formatCompact(0.5, 'greeks')).toBe('0.5000');
    });

    it('rounds correctly at 4dp', () => {
      expect(formatCompact(0.50126, 'greeks')).toBe('0.5013');
    });
  });

  describe('percent context', () => {
    it('formats positive with + prefix and % suffix', () => {
      expect(formatCompact(5.5, 'percent')).toBe('+5.50%');
    });

    it('formats negative with - prefix and % suffix', () => {
      expect(formatCompact(-3.2, 'percent')).toBe('-3.20%');
    });

    it('formats zero as positive', () => {
      expect(formatCompact(0, 'percent')).toBe('+0.00%');
    });
  });

  describe('currency_pair context', () => {
    it('always formats to 4 decimal places', () => {
      expect(formatCompact(148.234, 'currency_pair')).toBe('148.2340');
    });

    it('pads to 4 decimal places', () => {
      expect(formatCompact(1.3, 'currency_pair')).toBe('1.3000');
    });
  });
});

describe('formatChange', () => {
  it('formats positive change with + prefix', () => {
    expect(formatChange(1.23)).toBe('+1.23');
  });

  it('formats negative change with - prefix', () => {
    expect(formatChange(-0.45)).toBe('-0.45');
  });

  it('formats zero as positive', () => {
    expect(formatChange(0)).toBe('+0.00');
  });

  it('returns dash for null', () => {
    expect(formatChange(null)).toBe('-');
  });

  it('returns dash for undefined', () => {
    expect(formatChange(undefined)).toBe('-');
  });

  it('returns dash for NaN', () => {
    expect(formatChange(NaN)).toBe('-');
  });
});

describe('formatCurrency', () => {
  it('formats with default $ symbol', () => {
    expect(formatCurrency(150.456)).toBe('$150.46');
  });

  it('formats with custom symbol', () => {
    expect(formatCurrency(1234.5, '\u00A3')).toBe('\u00A3' + '1234.50');
  });

  it('pads to 2 decimal places', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('returns dash for null', () => {
    expect(formatCurrency(null)).toBe('-');
  });

  it('returns dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('-');
  });

  it('returns dash for NaN', () => {
    expect(formatCurrency(NaN)).toBe('-');
  });
});
