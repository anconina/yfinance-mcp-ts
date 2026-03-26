/**
 * Financials domain formatter for get_financials.
 *
 * Transforms Yahoo Finance fundamentals timeseries API responses into
 * compact markdown tables with curated metrics and YoY% change columns.
 * Reduces 80-100+ metric JSON dumps (~15K tokens) to 15-20 key metrics
 * per statement type (~1500 tokens) while preserving analytical value.
 *
 * Pipeline: parse timeseries array -> extract metrics by statement type
 * -> compute YoY% -> render markdown tables -> wrap envelope.
 *
 * Imports all Phase 1 utilities from the barrel index.
 */

import {
  formatCompact,
  toMarkdownTable,
  wrapResponse,
  serializeResponse,
  formatHint,
  FormatType,
  NumberContext,
} from './index';

/** Options for financials response formatting. */
export interface FinancialsFormatOptions {
  /** Output format: text (markdown) or json. */
  format?: FormatType;
  /** Detail level: summary shows curated metrics, full shows all. */
  detail?: 'summary' | 'full';
  /** Statement type filter. */
  type?: 'income' | 'balance' | 'cashflow' | 'all';
  /** Data frequency. */
  frequency?: 'annual' | 'quarterly';
}

/** Definition of a single metric for rendering. */
interface MetricDef {
  /** Display name shown in the Metric column. */
  name: string;
  /** Timeseries metric name WITHOUT prefix (e.g., 'TotalRevenue', not 'annualTotalRevenue'). */
  metric: string;
  /** Number formatting context. */
  context: NumberContext;
}

// ---------------------------------------------------------------------------
// Curated metric lists
// ---------------------------------------------------------------------------

const INCOME_METRICS: MetricDef[] = [
  { name: 'Revenue', metric: 'TotalRevenue', context: 'compact' },
  { name: 'Cost of Revenue', metric: 'CostOfRevenue', context: 'compact' },
  { name: 'Gross Profit', metric: 'GrossProfit', context: 'compact' },
  { name: 'Operating Expense', metric: 'OperatingExpense', context: 'compact' },
  { name: 'Operating Income', metric: 'OperatingIncome', context: 'compact' },
  { name: 'EBITDA', metric: 'EBITDA', context: 'compact' },
  { name: 'Interest Expense', metric: 'InterestExpense', context: 'compact' },
  { name: 'Pretax Income', metric: 'PretaxIncome', context: 'compact' },
  { name: 'Tax Provision', metric: 'TaxProvision', context: 'compact' },
  { name: 'Net Income', metric: 'NetIncome', context: 'compact' },
  { name: 'Diluted EPS', metric: 'DilutedEPS', context: 'eps' },
  { name: 'Diluted Avg Shares', metric: 'DilutedAverageShares', context: 'compact' },
  { name: 'R&D', metric: 'ResearchAndDevelopment', context: 'compact' },
  { name: 'SG&A', metric: 'SellingGeneralAndAdministration', context: 'compact' },
  { name: 'Stock-Based Comp', metric: 'StockBasedCompensation', context: 'compact' },
];

const BALANCE_METRICS: MetricDef[] = [
  { name: 'Total Assets', metric: 'TotalAssets', context: 'compact' },
  { name: 'Current Assets', metric: 'CurrentAssets', context: 'compact' },
  { name: 'Cash & Equivalents', metric: 'CashAndCashEquivalents', context: 'compact' },
  { name: 'Total Liabilities', metric: 'TotalLiabilitiesNetMinorityInterest', context: 'compact' },
  { name: 'Current Liabilities', metric: 'CurrentLiabilities', context: 'compact' },
  { name: 'Long-Term Debt', metric: 'LongTermDebt', context: 'compact' },
  { name: 'Total Debt', metric: 'TotalDebt', context: 'compact' },
  { name: 'Stockholders Equity', metric: 'StockholdersEquity', context: 'compact' },
  { name: 'Retained Earnings', metric: 'RetainedEarnings', context: 'compact' },
  { name: 'Net PP&E', metric: 'NetPPE', context: 'compact' },
  { name: 'Goodwill', metric: 'Goodwill', context: 'compact' },
  { name: 'Intangible Assets', metric: 'OtherIntangibleAssets', context: 'compact' },
  { name: 'Inventory', metric: 'Inventory', context: 'compact' },
  { name: 'Receivables', metric: 'Receivables', context: 'compact' },
  { name: 'Accounts Payable', metric: 'AccountsPayable', context: 'compact' },
];

const CASHFLOW_METRICS: MetricDef[] = [
  { name: 'Operating Cash Flow', metric: 'OperatingCashFlow', context: 'compact' },
  { name: 'Capital Expenditure', metric: 'CapitalExpenditure', context: 'compact' },
  { name: 'Free Cash Flow', metric: 'FreeCashFlow', context: 'compact' },
  { name: 'D&A', metric: 'DepreciationAndAmortization', context: 'compact' },
  { name: 'Stock-Based Comp', metric: 'StockBasedCompensation', context: 'compact' },
  { name: 'Change in Working Capital', metric: 'ChangeInWorkingCapital', context: 'compact' },
  { name: 'Investing Cash Flow', metric: 'InvestingCashFlow', context: 'compact' },
  { name: 'Financing Cash Flow', metric: 'FinancingCashFlow', context: 'compact' },
  { name: 'Dividends Paid', metric: 'CommonStockDividendPaid', context: 'compact' },
  { name: 'Share Repurchases', metric: 'RepurchaseOfCapitalStock', context: 'compact' },
];

/** Map statement type to its curated metric list. */
const STATEMENT_METRICS: Record<string, { title: string; metrics: MetricDef[] }> = {
  income: { title: 'Income Statement', metrics: INCOME_METRICS },
  balance: { title: 'Balance Sheet', metrics: BALANCE_METRICS },
  cashflow: { title: 'Cash Flow Statement', metrics: CASHFLOW_METRICS },
};

/** Map frequency to the periodType in Yahoo timeseries data. */
const FREQUENCY_PERIOD: Record<string, string> = {
  annual: '12M',
  quarterly: '3M',
};

/** Map frequency to the metric name prefix in Yahoo timeseries data. */
const FREQUENCY_PREFIX: Record<string, string> = {
  annual: 'annual',
  quarterly: 'quarterly',
};

// ---------------------------------------------------------------------------
// Core extraction and computation functions
// ---------------------------------------------------------------------------

/**
 * Compute Year-over-Year percentage change.
 *
 * @param current - Current period value (or null)
 * @param prior - Prior period value (or null)
 * @returns Formatted YoY% string like '+10.5%' or '-3.2%', or '-' for invalid inputs
 */
export function computeYoY(current: number | null, prior: number | null): string {
  if (current === null || prior === null || prior === 0) return '-';
  const pct = ((current - prior) / Math.abs(prior)) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
}

/**
 * A single timeseries result object from the Yahoo fundamentals API.
 * Each object in the response array has this shape.
 */
interface TimeseriesEntry {
  meta: { symbol: string[]; type: string[] };
  [metricKey: string]: unknown;
}

/** A data point within a timeseries metric. */
interface DataPoint {
  asOfDate: string;
  periodType: string;
  reportedValue: { raw: number; fmt?: string };
}

/**
 * Extract curated metrics from the Yahoo timeseries array.
 *
 * For each metric definition, finds the matching timeseries object by
 * stripping the prefix (annual/quarterly/trailing) from `meta.type[0]`
 * and comparing against the metric name. Extracts `reportedValue.raw`
 * values keyed by `asOfDate`. Skips metrics with no data points.
 *
 * @param rawArray - Array of timeseries result objects from Yahoo
 * @param metricDefs - Curated metric definitions to extract
 * @param periodType - Period type filter ('12M' for annual, '3M' for quarterly)
 * @returns Map of metric display name to { context, values: Map<date, rawValue> }
 */
export function extractMetrics(
  rawArray: unknown[],
  metricDefs: MetricDef[],
  periodType: string
): Map<string, { context: NumberContext; values: Map<string, number> }> {
  const result = new Map<string, { context: NumberContext; values: Map<string, number> }>();

  // Build a lookup: stripped metric name -> timeseries entry
  const entryMap = new Map<string, TimeseriesEntry>();
  for (const item of rawArray) {
    const entry = item as TimeseriesEntry;
    if (!entry.meta?.type?.[0]) continue;
    const fullName = entry.meta.type[0];
    const stripped = fullName.replace(/^(annual|quarterly|trailing)/, '');
    entryMap.set(stripped, entry);
  }

  for (const def of metricDefs) {
    const entry = entryMap.get(def.metric);
    if (!entry) continue;

    const fullName = entry.meta.type[0];
    const dataArr = entry[fullName] as DataPoint[] | undefined;
    if (!dataArr || !Array.isArray(dataArr)) continue;

    const values = new Map<string, number>();
    for (const dp of dataArr) {
      if (dp.periodType !== periodType) continue;
      if (dp.reportedValue?.raw !== undefined && dp.reportedValue.raw !== null) {
        values.set(dp.asOfDate, dp.reportedValue.raw);
      }
    }

    if (values.size > 0) {
      result.set(def.name, { context: def.context, values });
    }
  }

  return result;
}

/**
 * Extract ALL metrics from the timeseries array (for detail=full mode).
 *
 * Instead of using curated lists, iterates every timeseries object,
 * strips the prefix for display name, and extracts values.
 *
 * @param rawArray - Array of timeseries result objects from Yahoo
 * @param periodType - Period type filter ('12M' for annual, '3M' for quarterly)
 * @param prefix - Expected prefix ('annual' or 'quarterly')
 * @returns Map of metric display name to { context, values: Map<date, rawValue> }
 */
function extractAllMetrics(
  rawArray: unknown[],
  periodType: string,
  prefix: string
): Map<string, { context: NumberContext; values: Map<string, number> }> {
  const result = new Map<string, { context: NumberContext; values: Map<string, number> }>();

  for (const item of rawArray) {
    const entry = item as TimeseriesEntry;
    if (!entry.meta?.type?.[0]) continue;

    const fullName = entry.meta.type[0];
    // Only include metrics with the matching prefix
    if (!fullName.startsWith(prefix)) continue;

    const stripped = fullName.replace(/^(annual|quarterly|trailing)/, '');
    const dataArr = entry[fullName] as DataPoint[] | undefined;
    if (!dataArr || !Array.isArray(dataArr)) continue;

    const values = new Map<string, number>();
    for (const dp of dataArr) {
      if (dp.periodType !== periodType) continue;
      if (dp.reportedValue?.raw !== undefined && dp.reportedValue.raw !== null) {
        values.set(dp.asOfDate, dp.reportedValue.raw);
      }
    }

    if (values.size > 0) {
      // Use stripped name with spaces inserted before capitals for readability
      const displayName = stripped.replace(/([a-z])([A-Z])/g, '$1 $2');
      result.set(displayName, { context: 'compact', values });
    }
  }

  return result;
}

/**
 * Render a statement section as a markdown table with YoY% column.
 *
 * @param title - Section title (e.g., 'Income Statement')
 * @param metrics - Extracted metrics map
 * @returns Markdown string with title and table, or empty string if no metrics
 */
function renderStatementTable(
  title: string,
  metrics: Map<string, { context: NumberContext; values: Map<string, number> }>
): string {
  if (metrics.size === 0) return '';

  // Collect all dates across all metrics and sort newest-first
  const allDates = new Set<string>();
  for (const { values } of metrics.values()) {
    for (const date of values.keys()) {
      allDates.add(date);
    }
  }
  const dates = [...allDates].sort().reverse();

  if (dates.length === 0) return '';

  // Extract just the year from each date for column headers
  const dateHeaders = dates.map((d) => d.slice(0, 4));

  // Headers: Metric, dates (newest first), YoY%
  const headers = ['Metric', ...dateHeaders, 'YoY%'];
  const align: ('l' | 'r')[] = ['l', ...dates.map(() => 'r' as const), 'r'];

  const rows: string[][] = [];
  for (const [name, { context, values }] of metrics) {
    const row: string[] = [name];

    // Add value for each date column
    for (const date of dates) {
      const val = values.get(date) ?? null;
      row.push(formatCompact(val, context));
    }

    // YoY%: compare newest two dates
    if (dates.length >= 2) {
      const newest = values.get(dates[0]) ?? null;
      const prior = values.get(dates[1]) ?? null;
      row.push(computeYoY(newest, prior));
    } else {
      row.push('-');
    }

    rows.push(row);
  }

  return title + ':\n' + toMarkdownTable(headers, rows, align);
}

/**
 * Normalize timeseries data for JSON output.
 *
 * For each metric, returns an object with date-keyed values.
 *
 * @param rawArray - Raw timeseries array
 * @param statementTypes - Statement types to include
 * @param periodType - Period type filter
 * @returns Normalized object suitable for JSON serialization
 */
function normalizeForJson(
  rawArray: unknown[],
  statementTypes: string[],
  periodType: string
): Record<string, Record<string, Record<string, number>>> {
  const result: Record<string, Record<string, Record<string, number>>> = {};

  for (const stType of statementTypes) {
    const stDef = STATEMENT_METRICS[stType];
    if (!stDef) continue;

    const metrics = extractMetrics(rawArray, stDef.metrics, periodType);
    const stData: Record<string, Record<string, number>> = {};

    for (const [name, { values }] of metrics) {
      const obj: Record<string, number> = {};
      for (const [date, val] of values) {
        obj[date] = val;
      }
      stData[name] = obj;
    }

    if (Object.keys(stData).length > 0) {
      result[stDef.title] = stData;
    }
  }

  return result;
}

/**
 * Top-level format function for get_financials.
 *
 * Handles multi-symbol data, error strings per symbol, format routing
 * (text vs JSON), statement type filtering, and summary/full modes.
 *
 * @param data - Raw Yahoo financials data keyed by symbol (values are timeseries arrays or error strings)
 * @param options - Format options controlling output
 * @returns Formatted response string ready to return to the LLM
 */
export function formatFinancialsResponse(
  data: Record<string, unknown>,
  options: FinancialsFormatOptions = {}
): string {
  const {
    format = 'text',
    detail = 'summary',
    type: typeFilter = 'all',
    frequency = 'annual',
  } = options;

  const symbols = Object.keys(data);
  if (symbols.length === 0) {
    return wrapResponse('No financials data available', { dataType: 'Financials' });
  }

  const periodType = FREQUENCY_PERIOD[frequency] || '12M';
  const prefix = FREQUENCY_PREFIX[frequency] || 'annual';

  // Determine which statement types to render
  const statementTypes =
    typeFilter === 'all' ? ['income', 'balance', 'cashflow'] : [typeFilter];

  // Process each symbol
  const allSections: string[] = [];
  const allNormalized: Record<string, unknown> = {};

  for (const sym of symbols) {
    const symData = data[sym];

    // Error case
    if (typeof symData === 'string') {
      if (format === 'json') {
        allNormalized[sym] = { error: symData };
      } else {
        allSections.push(`${sym}: Error - ${symData}`);
      }
      continue;
    }

    // Expect symData to be an array of timeseries objects
    const rawArray = Array.isArray(symData) ? symData : [];

    if (rawArray.length === 0) {
      if (format === 'json') {
        allNormalized[sym] = { error: 'No financials data available' };
      } else {
        allSections.push(`${sym}: No financials data available`);
      }
      continue;
    }

    // JSON path
    if (format === 'json') {
      allNormalized[sym] = normalizeForJson(rawArray, statementTypes, periodType);
      continue;
    }

    // Text path
    const symbolSections: string[] = [];

    if (symbols.length > 1) {
      symbolSections.push(`--- ${sym} ---`);
    }

    if (detail === 'full') {
      // Full mode: extract ALL metrics with matching prefix
      const allMetrics = extractAllMetrics(rawArray, periodType, prefix);
      const table = renderStatementTable('All Metrics', allMetrics);
      if (table) {
        symbolSections.push(table);
      } else {
        symbolSections.push('No metrics data found');
      }
    } else {
      // Summary mode: extract curated metrics per statement type
      for (const stType of statementTypes) {
        const stDef = STATEMENT_METRICS[stType];
        if (!stDef) continue;

        const metrics = extractMetrics(rawArray, stDef.metrics, periodType);
        const table = renderStatementTable(stDef.title, metrics);
        if (table) {
          symbolSections.push(table);
        }
      }
    }

    if (symbolSections.length === 0 || (symbolSections.length === 1 && symbols.length > 1)) {
      symbolSections.push('No metrics data found');
    }

    allSections.push(symbolSections.join('\n\n'));
  }

  // JSON path: serialize and return
  if (format === 'json') {
    return serializeResponse(allNormalized as Record<string, unknown>, 'json');
  }

  // Text path: assemble body
  const body = allSections.join('\n\n');

  // Build hints
  const hints: string[] = [];
  if (detail === 'summary') {
    hints.push('Use detail="full" for all metrics');
  }
  if (typeFilter === 'all') {
    hints.push('Use type="income" | "balance" | "cashflow" to filter');
  }
  if (frequency === 'annual') {
    hints.push('Use frequency="quarterly" for quarterly data');
  }

  const hint = formatHint(hints);

  // Wrap with envelope
  const wrapOptions =
    symbols.length === 1
      ? { symbol: symbols[0], dataType: 'Financials' }
      : { dataType: 'Financials' };

  return wrapResponse(body, { ...wrapOptions, hint: hint || undefined });
}
