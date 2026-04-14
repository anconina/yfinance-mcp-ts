/**
 * Response envelope: size guards, metadata headers, format routing, and hints.
 *
 * Every formatted response passes through this module before reaching the LLM.
 * guardSize prevents context window blowouts; wrapResponse adds metadata headers;
 * serializeResponse routes between JSON (universal) and text (domain-specific).
 */

import { SOFT_CAP_CHARS, HARD_CAP_CHARS } from './constants';

/** Output format for dual-format support. */
export type FormatType = 'text' | 'json';

/** Options for wrapping a formatted response with metadata. */
export interface ResponseOptions {
  /** Ticker symbol (e.g., 'AAPL'). */
  symbol?: string;
  /** Data type label (e.g., 'Price Summary', 'Options Chain'). */
  dataType?: string;
  /** Output format. Defaults to 'text'. */
  format?: FormatType;
  /** Optional hint text to append after body. */
  hint?: string;
}

/**
 * Guard response size against LLM context window limits.
 *
 * - Under softCap: return unchanged.
 * - Between softCap and hardCap: append a notice suggesting the user narrow the query.
 * - Over hardCap: truncate at the last complete line before hardCap and append a truncation notice.
 *
 * Operates on already-assembled content (header + body + hints). Called by wrapResponse
 * after full assembly, not on body alone.
 *
 * @param response - The complete assembled response string
 * @param softCap - Character threshold for notice (default: SOFT_CAP_CHARS)
 * @param hardCap - Character threshold for truncation (default: HARD_CAP_CHARS)
 * @param hint - Optional hint appended after the notice/truncation message
 * @returns The size-guarded response string
 */
export function guardSize(
  response: string,
  softCap: number = SOFT_CAP_CHARS,
  hardCap: number = HARD_CAP_CHARS,
  hint?: string
): string {
  const hintSuffix = hint ? '\n' + hint : '';

  if (response.length <= softCap) {
    return response;
  }

  if (response.length > hardCap) {
    // Truncate at last complete line before hardCap.
    // Only use the newline boundary if it's after 70% of hardCap to avoid
    // losing too much content.
    const slice = response.slice(0, hardCap);
    const lastNewline = slice.lastIndexOf('\n');
    // Include the newline itself (+1) to keep the last complete line intact.
    const cutoff =
      lastNewline > hardCap * 0.7 ? lastNewline + 1 : hardCap;
    const truncated = response.slice(0, cutoff);
    return truncated + `\n\n[...truncated at ${hardCap} chars]` + hintSuffix;
  }

  // Between soft and hard cap: append advisory notice.
  return (
    response +
    `\n\n[Response is ${response.length} chars. Consider narrowing your query.]` +
    hintSuffix
  );
}

/**
 * Wrap a formatted body with a metadata header and apply size guards.
 *
 * Builds a metadata header line (symbol | dataType | date), assembles the
 * complete response (header + body + optional hint), then passes the whole
 * thing through guardSize.
 *
 * @param body - The formatted response body
 * @param options - Metadata and formatting options
 * @returns The complete, size-guarded response string
 */
export function wrapResponse(body: string, options: ResponseOptions = {}): string {
  const { symbol, dataType, hint } = options;

  // Build metadata header parts (only non-empty fields).
  const headerParts: string[] = [];
  if (symbol) headerParts.push(symbol);
  if (dataType) headerParts.push(dataType);
  headerParts.push(new Date().toISOString().slice(0, 10)); // ISO date only

  const header = headerParts.join(' | ');

  // Assemble complete response.
  let assembled = header + '\n\n' + body;
  if (hint) {
    assembled += '\n\n' + hint;
  }

  // Size-guard the COMPLETE assembled string (header + body + hints).
  return guardSize(assembled);
}

/**
 * Format actionable drill-down suggestions as a hint string.
 *
 * @param suggestions - Array of suggestion strings
 * @returns Formatted hint like `"Tip: suggestion1 | suggestion2"`, or empty string if no suggestions
 */
export function formatHint(suggestions: string[]): string {
  if (suggestions.length === 0) return '';
  return 'Tip: ' + suggestions.join(' | ');
}

/**
 * Size-guard for JSON responses that always returns valid JSON.
 *
 * Unlike guardSize (which truncates the string and can produce broken JSON),
 * this function trims arrays within the data to fit within the cap, then
 * re-serializes. A `_truncated` field is added to each entry whose array
 * was reduced.
 *
 * Walks one level into top-level values looking for arrays to trim.
 * Set keepEnd=true for time-series data (keeps most recent entries).
 *
 * @param data - The data object (will be mutated when trimming is needed)
 * @param hardCap - Maximum JSON string length
 * @param keepEnd - If true, keep tail of arrays; default keeps head
 * @returns Valid JSON string within the cap
 */
export function guardJsonSize(
  data: Record<string, unknown>,
  hardCap: number = HARD_CAP_CHARS,
  keepEnd = false,
): string {
  const json = JSON.stringify(data);
  if (json.length <= hardCap) return json;

  const ratio = (hardCap / json.length) * 0.8;

  for (const [topKey, topVal] of Object.entries(data)) {
    if (topKey === '_truncated') continue;

    // Top-level arrays (e.g., { screener_name: [q1, q2, ...] })
    if (Array.isArray(topVal)) {
      const total = topVal.length;
      const keep = Math.max(1, Math.floor(total * ratio));
      if (keep < total) {
        data[topKey] = keepEnd ? topVal.slice(-keep) : topVal.slice(0, keep);
        if (!data._truncated) data._truncated = {};
        (data._truncated as Record<string, unknown>)[topKey] = { total, returned: keep };
      }
      continue;
    }

    // Objects with nested arrays (e.g., { AAPL: { rows: [...] } })
    if (typeof topVal === 'object' && topVal !== null) {
      const entry = topVal as Record<string, unknown>;
      for (const [key, subVal] of Object.entries(entry)) {
        if (key === '_truncated' || !Array.isArray(subVal)) continue;
        const total = subVal.length;
        const keep = Math.max(1, Math.floor(total * ratio));
        if (keep >= total) continue;
        entry[key] = keepEnd ? subVal.slice(-keep) : subVal.slice(0, keep);
        entry._truncated = { total, returned: keep };
      }
    }
  }

  return JSON.stringify(data);
}

/**
 * Route serialization based on format type (dual-format support skeleton).
 *
 * - JSON: universal compact serializer via JSON.stringify.
 * - Text: throws an error — text serialization requires domain-specific formatters
 *   (built in Phases 2-5). This prevents accidental use of a generic text path.
 *
 * @param data - The data object to serialize
 * @param format - The target format
 * @returns Compact JSON string for 'json' format
 * @throws Error for 'text' format (must use domain-specific formatters)
 */
export function serializeResponse(
  data: Record<string, unknown>,
  format: FormatType
): string {
  if (format === 'json') {
    return JSON.stringify(data);
  }
  throw new Error(
    'Text serialization requires a domain-specific formatter. Use the domain formatter, not serializeResponse directly.'
  );
}
