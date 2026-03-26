/**
 * Profile domain formatter for get_stock_profile.
 *
 * Transforms Yahoo's assetProfile module data into compact text output.
 * Truncates business summary to 300 chars on word boundary, flattens
 * address parts, optionally includes officer list (capped at 10),
 * and renders governance risk scores.
 *
 * Imports Phase 1 utilities from the barrel index.
 */

import {
  formatCompact,
  wrapResponse,
  serializeResponse,
  FormatType,
} from './index';

/** Options for profile response formatting. */
export interface ProfileFormatOptions {
  format?: FormatType;
  include_officers?: boolean;
}

/**
 * Truncate text to maxLen on a word boundary and append '...'.
 *
 * If text.length <= maxLen, return unchanged. Otherwise find the last
 * space before maxLen. If the space is after 70% of maxLen, cut there;
 * otherwise cut at maxLen to avoid losing too much content.
 *
 * @param text - The text to truncate
 * @param maxLen - Maximum length before truncation
 * @returns Original text or truncated text with '...' appended
 */
export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const lastSpace = text.lastIndexOf(' ', maxLen);
  const cutoff = lastSpace > maxLen * 0.7 ? lastSpace : maxLen;
  return text.slice(0, cutoff) + '...';
}

/**
 * Render a single symbol's profile data as compact text.
 *
 * @param symbol - Ticker symbol
 * @param data - Raw assetProfile object from Yahoo
 * @param options - Profile formatting options
 * @returns Formatted text block
 */
function renderProfileText(
  symbol: string,
  data: Record<string, unknown>,
  options: ProfileFormatOptions
): string {
  const lines: string[] = [];

  // Header
  const name = (data.shortName as string) || (data.longName as string) || symbol;
  lines.push(`${symbol} | ${name} | Company Profile`);

  // Sector & Industry
  const sector = data.sector as string | undefined;
  const industry = data.industry as string | undefined;
  if (sector || industry) {
    const parts: string[] = [];
    if (sector) parts.push(`Sector: ${sector}`);
    if (industry) parts.push(`Industry: ${industry}`);
    lines.push('');
    lines.push(parts.join(' | '));
  }

  // Address
  const addrParts = [
    data.address1,
    data.city,
    data.state,
    data.zip,
    data.country,
  ].filter((p) => p != null && p !== '') as string[];
  if (addrParts.length > 0) {
    lines.push(`Address: ${addrParts.join(', ')}`);
  }

  // Website & Employees
  const websiteRaw = data.website as string | undefined;
  const employees = data.fullTimeEmployees as number | undefined;
  const webEmpParts: string[] = [];
  if (websiteRaw) {
    const website = websiteRaw.replace(/^https?:\/\/(www\.)?/, '');
    webEmpParts.push(`Website: ${website}`);
  }
  if (employees != null) {
    webEmpParts.push(`Employees: ${formatCompact(employees, 'compact')} (FT)`);
  }
  if (webEmpParts.length > 0) {
    lines.push(webEmpParts.join(' | '));
  }

  // Business Summary (truncated to 300 chars)
  const summary = data.longBusinessSummary as string | undefined;
  if (summary) {
    lines.push('');
    lines.push(truncateText(summary, 300));
  }

  // Governance Risk Scores
  const auditRisk = data.auditRisk as number | undefined;
  const boardRisk = data.boardRisk as number | undefined;
  const compensationRisk = data.compensationRisk as number | undefined;
  const overallRisk = data.overallRisk as number | undefined;
  if (auditRisk != null || boardRisk != null || compensationRisk != null || overallRisk != null) {
    const govParts: string[] = [];
    if (auditRisk != null) govParts.push(`auditRisk: ${auditRisk}`);
    if (boardRisk != null) govParts.push(`boardRisk: ${boardRisk}`);
    if (compensationRisk != null) govParts.push(`compensationRisk: ${compensationRisk}`);
    if (overallRisk != null) govParts.push(`overallRisk: ${overallRisk}`);
    lines.push('');
    lines.push(`Governance: ${govParts.join(' | ')}`);
  }

  // Officers (optional, capped at 10)
  if (options.include_officers) {
    const officers = data.companyOfficers as Array<Record<string, unknown>> | undefined;
    if (officers && officers.length > 0) {
      lines.push('');
      lines.push('Officers:');
      const shown = officers.slice(0, 10);
      for (const officer of shown) {
        const officerName = officer.name as string || 'Unknown';
        const title = officer.title as string || 'N/A';
        lines.push(`  ${officerName} - ${title}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Top-level format function for get_stock_profile.
 *
 * Handles single and multi-symbol queries, error entries (string values),
 * format routing (text vs JSON), and response envelope wrapping.
 *
 * @param data - Raw Yahoo assetProfile data keyed by symbol
 * @param options - Format options (text or json, include_officers toggle)
 * @returns Formatted response string ready to return to the LLM
 */
export function formatProfileResponse(
  data: Record<string, unknown>,
  options: ProfileFormatOptions = {}
): string {
  const symbols = Object.keys(data);
  if (symbols.length === 0) {
    return wrapResponse('No profile data available', { dataType: 'Company Profile' });
  }

  // JSON path: strip officers if not requested, serialize
  if (options.format === 'json') {
    const jsonData: Record<string, unknown> = {};
    for (const sym of symbols) {
      const symData = data[sym];
      if (typeof symData === 'string') {
        jsonData[sym] = { error: symData };
      } else {
        const obj = { ...(symData as Record<string, unknown>) };
        if (!options.include_officers) {
          delete obj.companyOfficers;
        }
        jsonData[sym] = obj;
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
      sections.push(
        renderProfileText(sym, symData as Record<string, unknown>, options)
      );
    }
  }

  const body = sections.join('\n\n');

  const wrapOptions = symbols.length === 1
    ? { symbol: symbols[0], dataType: 'Company Profile' }
    : { dataType: 'Company Profile' };

  return wrapResponse(body, wrapOptions);
}
