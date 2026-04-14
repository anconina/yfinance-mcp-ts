/**
 * Earnings domain formatter for get_earnings.
 *
 * Transforms Yahoo's earnings module data (nested earningsChart and
 * financialsChart sub-objects) into compact text with EPS history table,
 * surprise%, next quarter estimate, and revenue trend.
 *
 * Imports Phase 1 utilities from the barrel index.
 */

import {
  extractValue,
  formatCompact,
  toMarkdownTable,
  wrapResponse,
  guardSize,
  FormatType,
} from './index';

/** Options for earnings response formatting. */
export interface EarningsFormatOptions {
  format?: FormatType;
}

/**
 * Compute surprise percentage between actual and estimated EPS.
 *
 * @param actual - Actual EPS
 * @param estimate - Estimated EPS
 * @returns Formatted surprise string with sign prefix and 1 decimal, or '-' if not computable
 */
function computeSurprise(actual: number | null, estimate: number | null): string {
  if (actual === null || estimate === null || typeof actual !== 'number' || typeof estimate !== 'number' || estimate === 0) {
    return '-';
  }
  const pct = ((actual - estimate) / Math.abs(estimate)) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

/**
 * Render a single symbol's earnings data as compact text.
 *
 * @param symbol - Ticker symbol
 * @param data - Raw per-symbol earnings module data from Yahoo
 * @returns Formatted text block
 */
function renderEarningsText(symbol: string, data: Record<string, unknown>): string {
  const lines: string[] = [];

  // Header
  lines.push(`${symbol} | Earnings`);

  const earningsChart = data.earningsChart as Record<string, unknown> | undefined;
  const financialsChart = data.financialsChart as Record<string, unknown> | undefined;

  let hasContent = false;

  // EPS History table from earningsChart.quarterly
  if (earningsChart) {
    const quarterly = earningsChart.quarterly as Array<Record<string, unknown>> | undefined;
    if (quarterly && quarterly.length > 0) {
      hasContent = true;
      lines.push('');
      const headers = ['Quarter', 'EPS Est', 'EPS Act', 'Surprise'];
      const align: ('l' | 'r')[] = ['l', 'r', 'r', 'r'];

      const rows = quarterly.map((q) => {
        const date = q.date as string || '-';
        const est = extractValue(q.estimate) as number | null;
        const act = extractValue(q.actual) as number | null;
        const surprise = computeSurprise(act, est);

        return [
          date,
          formatCompact(est, 'eps'),
          formatCompact(act, 'eps'),
          surprise,
        ];
      });

      lines.push(toMarkdownTable(headers, rows, align));
    }

    // Next quarter estimate
    const nextEst = extractValue(earningsChart.currentQuarterEstimate) as number | null;
    const nextDate = earningsChart.currentQuarterEstimateDate as string | undefined;
    const nextYear = earningsChart.currentQuarterEstimateYear as number | undefined;
    if (nextEst !== null && nextDate) {
      hasContent = true;
      const yearSuffix = nextYear != null ? nextYear : '';
      lines.push('');
      lines.push(`Next: ${nextDate}${yearSuffix ? ' ' + yearSuffix : ''} est. $${formatCompact(nextEst, 'eps')}`);
    }
  }

  // Revenue trend from financialsChart.yearly
  if (financialsChart) {
    const yearly = financialsChart.yearly as Array<Record<string, unknown>> | undefined;
    if (yearly && yearly.length >= 2) {
      hasContent = true;
      const latest = yearly[yearly.length - 1];
      const prior = yearly[yearly.length - 2];
      const latestRev = extractValue(latest.revenue) as number | null;
      const priorRev = extractValue(prior.revenue) as number | null;

      if (latestRev !== null) {
        let yoyStr = '';
        if (priorRev !== null && priorRev !== 0) {
          const yoy = ((latestRev - priorRev) / Math.abs(priorRev)) * 100;
          yoyStr = ` (${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}% YoY)`;
        }
        lines.push('');
        lines.push(`Revenue: ${formatCompact(latestRev, 'compact')}${yoyStr}`);
      }
    }
  }

  if (!hasContent) {
    lines.push('');
    lines.push('No earnings data available');
  }

  return lines.join('\n');
}

/**
 * Top-level format function for get_earnings.
 *
 * Handles single and multi-symbol queries, error entries (string values),
 * format routing (text vs JSON), and response envelope wrapping.
 *
 * @param data - Raw Yahoo earnings data keyed by symbol
 * @param options - Format options (text or json)
 * @returns Formatted response string ready to return to the LLM
 */
export function formatEarningsResponse(
  data: Record<string, unknown>,
  options: EarningsFormatOptions = {}
): string {
  const symbols = Object.keys(data);
  if (symbols.length === 0) {
    return wrapResponse('No earnings data available', { dataType: 'Earnings' });
  }

  // JSON path -- extract only relevant nested data
  if (options.format === 'json') {
    const jsonData: Record<string, unknown> = {};
    for (const sym of symbols) {
      const symData = data[sym];
      if (typeof symData === 'string') {
        jsonData[sym] = { error: symData };
      } else {
        const raw = symData as Record<string, unknown>;
        const earningsChart = raw.earningsChart as Record<string, unknown> | undefined;
        const financialsChart = raw.financialsChart as Record<string, unknown> | undefined;
        const projected: Record<string, unknown> = {};
        if (earningsChart) {
          projected.quarterly = earningsChart.quarterly;
          projected.currentQuarterEstimate = earningsChart.currentQuarterEstimate;
          projected.currentQuarterEstimateDate = earningsChart.currentQuarterEstimateDate;
          projected.currentQuarterEstimateYear = earningsChart.currentQuarterEstimateYear;
        }
        if (financialsChart) {
          projected.yearly = financialsChart.yearly;
        }
        jsonData[sym] = projected;
      }
    }
    return guardSize(JSON.stringify(jsonData));
  }

  // Text path
  const sections: string[] = [];
  for (const sym of symbols) {
    const symData = data[sym];
    if (typeof symData === 'string') {
      sections.push(`${sym} | Error: ${symData}`);
    } else {
      sections.push(
        renderEarningsText(sym, symData as Record<string, unknown>)
      );
    }
  }

  const body = sections.join('\n\n');

  const wrapOptions = symbols.length === 1
    ? { symbol: symbols[0], dataType: 'Earnings' }
    : { dataType: 'Earnings' };

  return wrapResponse(body, wrapOptions);
}
