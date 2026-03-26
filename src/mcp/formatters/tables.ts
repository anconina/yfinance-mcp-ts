/**
 * Token-efficient markdown table generation.
 *
 * Produces GitHub-Flavored Markdown (GFM) tables with minimal token overhead:
 * no whitespace padding between pipes, correct separator rows with alignment
 * markers, and null replacement with `'-'`.
 *
 * Zero imports -- this module has no dependencies.
 */

/**
 * Generate a pipe-delimited GFM markdown table.
 *
 * @param headers - Column header labels
 * @param rows - Two-dimensional array of cell values; null/undefined cells become `'-'`
 * @param align - Optional alignment per column: `'l'` (left), `'r'` (right), `'c'` (center)
 * @returns A complete GFM table string, or empty string if headers is empty
 */
export function toMarkdownTable(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  align?: ('l' | 'r' | 'c')[]
): string {
  if (headers.length === 0) return '';

  const separator = headers.map((_, i) => {
    const a = align?.[i];
    if (a === 'r') return '---:';
    if (a === 'c') return ':---:';
    return '---';
  });

  const lines: string[] = [
    '|' + headers.join('|') + '|',
    '|' + separator.join('|') + '|',
    ...rows.map(
      (row) =>
        '|' +
        row
          .map((cell) => (cell === null || cell === undefined ? '-' : String(cell)))
          .join('|') +
        '|'
    ),
  ];

  return lines.join('\n');
}
