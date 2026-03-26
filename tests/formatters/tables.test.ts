import { toMarkdownTable } from '../../src/mcp/formatters/tables';

describe('toMarkdownTable', () => {
  describe('basic table generation', () => {
    it('produces pipe-delimited output with separator row', () => {
      const result = toMarkdownTable(['A', 'B'], [
        ['1', '2'],
        ['3', '4'],
      ]);
      const lines = result.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('|A|B|');
      expect(lines[1]).toBe('|---|---|');
      expect(lines[2]).toBe('|1|2|');
      expect(lines[3]).toBe('|3|4|');
    });

    it('produces valid separator row matching GFM regex', () => {
      const result = toMarkdownTable(['X', 'Y'], [['a', 'b']]);
      expect(result).toMatch(/\|[-:]+\|/);
    });

    it('generates a single row table', () => {
      const result = toMarkdownTable(['Col1', 'Col2'], [['val1', 'val2']]);
      const lines = result.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('|Col1|Col2|');
      expect(lines[1]).toBe('|---|---|');
      expect(lines[2]).toBe('|val1|val2|');
    });
  });

  describe('alignment', () => {
    it('produces right-aligned separator', () => {
      const result = toMarkdownTable(['Name', 'Price'], [['AAPL', '150']], ['l', 'r']);
      const lines = result.split('\n');
      expect(lines[1]).toBe('|---|---:|');
    });

    it('produces center-aligned separator', () => {
      const result = toMarkdownTable(['Name', 'Status'], [['AAPL', 'Active']], ['l', 'c']);
      const lines = result.split('\n');
      expect(lines[1]).toBe('|---|:---:|');
    });

    it('applies mixed alignment', () => {
      const result = toMarkdownTable(
        ['A', 'B', 'C'],
        [['1', '2', '3']],
        ['l', 'r', 'c']
      );
      const lines = result.split('\n');
      expect(lines[1]).toBe('|---|---:|:---:|');
    });

    it('defaults to left alignment when align is omitted', () => {
      const result = toMarkdownTable(['A', 'B'], [['1', '2']]);
      const lines = result.split('\n');
      expect(lines[1]).toBe('|---|---|');
    });
  });

  describe('null/undefined cell handling', () => {
    it('replaces null cells with dash', () => {
      const result = toMarkdownTable(['A'], [[null]]);
      const lines = result.split('\n');
      expect(lines[2]).toBe('|-|');
    });

    it('replaces undefined cells with dash', () => {
      const result = toMarkdownTable(['A'], [[undefined]]);
      const lines = result.split('\n');
      expect(lines[2]).toBe('|-|');
    });

    it('handles mixed null and value cells', () => {
      const result = toMarkdownTable(['A', 'B', 'C'], [['val', null, undefined]]);
      const lines = result.split('\n');
      expect(lines[2]).toBe('|val|-|-|');
    });
  });

  describe('number cells', () => {
    it('converts numbers to strings', () => {
      const result = toMarkdownTable(['A', 'B'], [[42, 3.14]]);
      const lines = result.split('\n');
      expect(lines[2]).toBe('|42|3.14|');
    });
  });

  describe('empty/edge cases', () => {
    it('returns empty string for empty headers', () => {
      expect(toMarkdownTable([], [])).toBe('');
    });

    it('generates header and separator only when rows are empty', () => {
      const result = toMarkdownTable(['A', 'B'], []);
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('|A|B|');
      expect(lines[1]).toBe('|---|---|');
    });
  });

  describe('token efficiency (no whitespace padding)', () => {
    it('has no space-pipe or pipe-space patterns in header row', () => {
      const result = toMarkdownTable(['Name', 'Value'], [['a', 'b']]);
      const headerLine = result.split('\n')[0];
      expect(headerLine).not.toMatch(/ \|/);
      expect(headerLine).not.toMatch(/\| /);
    });

    it('has no space-pipe or pipe-space patterns in data rows', () => {
      const result = toMarkdownTable(
        ['Name', 'Price', 'Change'],
        [
          ['AAPL', '150.45', '+1.23'],
          ['MSFT', '420.10', '-0.45'],
        ]
      );
      const lines = result.split('\n');
      for (let i = 2; i < lines.length; i++) {
        expect(lines[i]).not.toMatch(/ \|/);
        expect(lines[i]).not.toMatch(/\| /);
      }
    });
  });
});
