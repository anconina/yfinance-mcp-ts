/**
 * Recommendations domain formatter for get_recommendations.
 *
 * Transforms Yahoo's recommendationTrend module data into compact text
 * with a current consensus line and optional trend table. Handles both
 * the full module object { trend: [...] } and a bare array (defensive).
 *
 * Imports Phase 1 utilities from the barrel index.
 */

import {
  toMarkdownTable,
  wrapResponse,
  serializeResponse,
  FormatType,
} from './index';

/** Options for recommendations response formatting. */
export interface RecommendationsFormatOptions {
  format?: FormatType;
}

/** A single trend period entry from Yahoo's recommendationTrend module. */
interface TrendEntry {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

/**
 * Compute a consensus label from analyst counts.
 *
 * - If (strongBuy + buy) > 60% of total: 'Buy'
 * - If (sell + strongSell) > 40% of total: 'Sell'
 * - Otherwise: 'Hold'
 *
 * @param sb - Strong buy count
 * @param b - Buy count
 * @param h - Hold count
 * @param s - Sell count
 * @param ss - Strong sell count
 * @returns Consensus label
 */
export function getConsensusLabel(
  sb: number,
  b: number,
  h: number,
  s: number,
  ss: number
): string {
  const total = sb + b + h + s + ss;
  if (total === 0) return 'N/A';
  if ((sb + b) > total * 0.6) return 'Buy';
  if ((s + ss) > total * 0.4) return 'Sell';
  return 'Hold';
}

/**
 * Extract the trend array from Yahoo data.
 *
 * Handles both the full module object { trend: [...], maxAge: ... }
 * and a bare array (defensive).
 *
 * @param data - Raw per-symbol data
 * @returns Trend array or null if not found
 */
function extractTrend(data: unknown): TrendEntry[] | null {
  if (Array.isArray(data)) return data as TrendEntry[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.trend)) return obj.trend as TrendEntry[];
  }
  return null;
}

/**
 * Render a single symbol's recommendation data as compact text.
 *
 * @param symbol - Ticker symbol
 * @param data - Raw per-symbol data from Yahoo
 * @returns Formatted text block
 */
function renderRecommendationsText(symbol: string, data: unknown): string {
  const trend = extractTrend(data);
  if (!trend || trend.length === 0) {
    return `${symbol} | No recommendation data available`;
  }

  const lines: string[] = [];

  // Header
  lines.push(`${symbol} | Analyst Recommendations`);
  lines.push('');

  // Current consensus from first entry (period "0m")
  const current = trend[0];
  const { strongBuy: sb, buy: b, hold: h, sell: s, strongSell: ss } = current;
  const total = sb + b + h + s + ss;

  lines.push(`Current: Strong Buy: ${sb} | Buy: ${b} | Hold: ${h} | Sell: ${s} | Strong Sell: ${ss}`);

  // Compute consensus score and label
  if (total > 0) {
    const score = (sb * 1 + b * 2 + h * 3 + s * 4 + ss * 5) / total;
    const label = getConsensusLabel(sb, b, h, s, ss);
    lines.push(`Consensus: ${label} (${score.toFixed(1)}/5, ${total} analysts)`);
  }

  // Trend table if more than 1 period
  if (trend.length > 1) {
    lines.push('');
    const headers = ['Period', 'StrongBuy', 'Buy', 'Hold', 'Sell', 'StrongSell'];
    const align: ('l' | 'r')[] = ['l', 'r', 'r', 'r', 'r', 'r'];
    const rows = trend.map((t) => [
      t.period,
      t.strongBuy,
      t.buy,
      t.hold,
      t.sell,
      t.strongSell,
    ]);
    lines.push(toMarkdownTable(headers, rows, align));
  }

  return lines.join('\n');
}

/**
 * Top-level format function for get_recommendations.
 *
 * Handles single and multi-symbol queries, error entries (string values),
 * format routing (text vs JSON), and response envelope wrapping.
 *
 * @param data - Raw Yahoo recommendationTrend data keyed by symbol
 * @param options - Format options (text or json)
 * @returns Formatted response string ready to return to the LLM
 */
export function formatRecommendationsResponse(
  data: Record<string, unknown>,
  options: RecommendationsFormatOptions = {}
): string {
  const symbols = Object.keys(data);
  if (symbols.length === 0) {
    return wrapResponse('No recommendation data available', { dataType: 'Analyst Recommendations' });
  }

  // JSON path
  if (options.format === 'json') {
    const jsonData: Record<string, unknown> = {};
    for (const sym of symbols) {
      const symData = data[sym];
      if (typeof symData === 'string') {
        jsonData[sym] = { error: symData };
      } else {
        const trend = extractTrend(symData);
        jsonData[sym] = trend || { error: 'Invalid data format' };
      }
    }
    return serializeResponse(jsonData, 'json');
  }

  // Text path
  const sections: string[] = [];
  for (const sym of symbols) {
    const symData = data[sym];
    if (typeof symData === 'string') {
      sections.push(`${sym} | Error: ${symData}`);
    } else {
      sections.push(renderRecommendationsText(sym, symData));
    }
  }

  const body = sections.join('\n\n');

  const wrapOptions = symbols.length === 1
    ? { symbol: symbols[0], dataType: 'Analyst Recommendations' }
    : { dataType: 'Analyst Recommendations' };

  return wrapResponse(body, wrapOptions);
}
