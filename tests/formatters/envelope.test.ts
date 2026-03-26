import {
  guardSize,
  wrapResponse,
  formatHint,
  serializeResponse,
} from '../../src/mcp/formatters/envelope';
import { SOFT_CAP_CHARS, HARD_CAP_CHARS } from '../../src/mcp/formatters/constants';

describe('guardSize', () => {
  it('returns response unchanged when under soft cap', () => {
    const short = 'Hello, world!';
    expect(guardSize(short)).toBe(short);
  });

  it('returns response unchanged when at exactly soft cap', () => {
    const exact = 'x'.repeat(SOFT_CAP_CHARS);
    expect(guardSize(exact)).toBe(exact);
  });

  it('appends notice when between soft and hard cap', () => {
    const mid = 'a'.repeat(5000);
    const result = guardSize(mid);
    expect(result).toContain(mid); // Original content preserved
    expect(result).toContain('Consider narrowing');
    expect(result).toContain(`${mid.length} chars`);
  });

  it('truncates when over hard cap', () => {
    const long = ('line of text here\n').repeat(1000); // Well over 12000 chars
    const result = guardSize(long);
    expect(result.length).toBeLessThan(long.length);
    expect(result).toContain('truncated');
    expect(result).toContain(`${HARD_CAP_CHARS} chars`);
  });

  it('truncates at line boundary (no mid-line cut)', () => {
    // Build a string of known lines, each 100 chars + newline
    const line = 'A'.repeat(100) + '\n';
    const lineCount = Math.ceil(15000 / line.length);
    const long = line.repeat(lineCount);
    expect(long.length).toBeGreaterThan(HARD_CAP_CHARS);

    const result = guardSize(long);
    // Find where truncation notice starts
    const noticeIndex = result.indexOf('\n\n[...truncated');
    expect(noticeIndex).toBeGreaterThan(0);
    const content = result.slice(0, noticeIndex);
    // Content should end with a newline (line boundary)
    expect(content.endsWith('\n')).toBe(true);
  });

  it('respects custom soft/hard caps', () => {
    const str = 'x'.repeat(150);
    const result = guardSize(str, 100, 200);
    // Between custom soft (100) and custom hard (200) -> notice
    expect(result).toContain('Consider narrowing');
    expect(result).toContain('150 chars');
  });

  it('truncates with custom hard cap', () => {
    const str = ('short line\n').repeat(100); // ~1100 chars
    const result = guardSize(str, 50, 200);
    expect(result).toContain('truncated');
    expect(result).toContain('200 chars');
  });

  it('includes hint text when provided and response exceeds soft cap', () => {
    const mid = 'b'.repeat(5000);
    const result = guardSize(mid, SOFT_CAP_CHARS, HARD_CAP_CHARS, 'Try a shorter period.');
    expect(result).toContain('Consider narrowing');
    expect(result).toContain('Try a shorter period.');
  });

  it('includes hint text when truncated over hard cap', () => {
    const long = ('abcde\n').repeat(5000);
    const result = guardSize(long, SOFT_CAP_CHARS, HARD_CAP_CHARS, 'Narrow your query.');
    expect(result).toContain('truncated');
    expect(result).toContain('Narrow your query.');
  });

  it('does not include hint when under soft cap', () => {
    const short = 'tiny';
    const result = guardSize(short, SOFT_CAP_CHARS, HARD_CAP_CHARS, 'This should not appear.');
    expect(result).toBe(short);
  });
});

describe('wrapResponse', () => {
  it('includes symbol and dataType in header', () => {
    const result = wrapResponse('body text', {
      symbol: 'AAPL',
      dataType: 'Price Summary',
    });
    expect(result).toContain('AAPL');
    expect(result).toContain('Price Summary');
  });

  it('includes only dataType and date when symbol is omitted', () => {
    const result = wrapResponse('body text', { dataType: 'Options' });
    expect(result).not.toContain('undefined');
    expect(result).toContain('Options');
    // Should contain an ISO date pattern
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('preserves body content in output', () => {
    const body = 'This is the full body content with details.';
    const result = wrapResponse(body, { symbol: 'MSFT' });
    expect(result).toContain(body);
  });

  it('applies guardSize to complete response (header+body proves pitfall #4)', () => {
    // Create body that is just under soft cap alone, but header pushes it over
    const body = 'x'.repeat(SOFT_CAP_CHARS - 10);
    const result = wrapResponse(body, {
      symbol: 'TSLA',
      dataType: 'Long Report',
    });
    // The header adds ~30+ chars, pushing total over SOFT_CAP_CHARS
    // So the "Consider narrowing" notice should appear
    expect(result).toContain('Consider narrowing');
  });

  it('includes hint option in output', () => {
    const result = wrapResponse('some body', {
      symbol: 'GOOG',
      hint: 'Tip: try period=1mo',
    });
    expect(result).toContain('Tip: try period=1mo');
  });

  it('generates header with only date when no symbol or dataType', () => {
    const result = wrapResponse('body');
    const firstLine = result.split('\n')[0];
    // Should be just the date
    expect(firstLine).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatHint', () => {
  it('formats a single suggestion', () => {
    const result = formatHint(["Use period='1mo'"]);
    expect(result).toContain('Tip:');
    expect(result).toContain("Use period='1mo'");
  });

  it('joins multiple suggestions with separator', () => {
    const result = formatHint([
      "Use period='1mo' for daily data",
      'Add include_stats=true for statistics',
    ]);
    expect(result).toContain('Tip:');
    expect(result).toContain(' | ');
    expect(result).toContain("Use period='1mo' for daily data");
    expect(result).toContain('Add include_stats=true for statistics');
  });

  it('returns empty string for empty array', () => {
    expect(formatHint([])).toBe('');
  });
});

describe('serializeResponse', () => {
  it('returns compact JSON for json format', () => {
    const result = serializeResponse({ a: 1, b: 'test' }, 'json');
    expect(result).toBe('{"a":1,"b":"test"}');
  });

  it('handles nested objects in json format', () => {
    const result = serializeResponse({ nested: { x: [1, 2] } }, 'json');
    expect(result).toBe('{"nested":{"x":[1,2]}}');
  });

  it('throws error for text format with domain-specific message', () => {
    expect(() => serializeResponse({ a: 1 }, 'text')).toThrow('domain-specific');
  });
});
