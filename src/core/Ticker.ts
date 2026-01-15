/**
 * Ticker - Main class for interacting with Yahoo Finance API
 *
 * Provides access to quote summary modules, historical data, financials,
 * options chains, and more for given symbol(s).
 */

import { BaseFinance } from './BaseFinance';
import { CONFIG, FUND_DETAILS } from '../config/endpoints';
import { MODULES_DICT, FUNDAMENTALS_OPTIONS, FUNDAMENTALS_TIME_ARGS, CORPORATE_EVENTS } from '../config/modules';
import { convertToTimestamp, flattenList } from '../utils/helpers';
import { TickerOptions, HistoryParams, FinancialsData, HistoryData, OptionChainData } from '../types';

// Type for quote summary data
type QuoteSummaryData = Record<string, unknown>;

export class Ticker extends BaseFinance {
  invalidSymbols: string[] | null = null;

  constructor(symbols: string | string[], options: TickerOptions = {}) {
    const { validate, ...baseOptions } = options;
    super(baseOptions);
    this.symbols = symbols;

    // Validation will be handled separately since it's async
    if (validate) {
      // Store a flag to validate on first use
      (this as unknown as { _needsValidation: boolean })._needsValidation = true;
    }
  }

  /**
   * Validate symbols and separate valid from invalid
   */
  async validate(): Promise<void> {
    const { valid, invalid } = await this.validateSymbols();
    this._symbols = valid;
    this.invalidSymbols = invalid.length > 0 ? invalid : null;
  }

  // ============================================================
  // QUOTE SUMMARY METHODS
  // ============================================================

  /**
   * Internal method to fetch quote summary modules
   */
  private async quoteSummary(modules: string[]): Promise<QuoteSummaryData> {
    await this.initialize();

    const params = { modules: modules.join(',') };
    const options = modules.length === 1 ? { addlKey: modules[0] } : {};

    const data = await this.getData<QuoteSummaryData>('quoteSummary', params, options);

    if (!this.formatted) {
      const dates = this.getModuleDates(modules);
      return this.formatAllData(data, dates);
    }

    return data;
  }

  /**
   * Format data for all symbols
   */
  private formatAllData(
    data: Record<string, unknown>,
    dates: string[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [symbol, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        result[symbol] = this.formatData(value as Record<string, unknown>, dates);
      } else {
        result[symbol] = value;
      }
    }
    return result;
  }

  /**
   * Get all available quote summary modules
   */
  async getAllModules(): Promise<QuoteSummaryData> {
    const options = CONFIG.quoteSummary.query.modules.options;
    const modules = Array.isArray(options) ? options : Object.keys(MODULES_DICT);
    return this.quoteSummary(modules);
  }

  /**
   * Get specific quote summary modules
   */
  async getModules(modules: string | string[]): Promise<QuoteSummaryData> {
    const options = CONFIG.quoteSummary.query.modules.options;
    const allModules = Array.isArray(options) ? options : Object.keys(MODULES_DICT);
    const moduleList = Array.isArray(modules)
      ? modules
      : modules.match(/[a-zA-Z]+/g) || [];

    const invalid = moduleList.filter((m) => !allModules.includes(m));
    if (invalid.length > 0) {
      throw new Error(
        `Invalid modules: ${invalid.join(', ')}. Valid modules: ${allModules.join(', ')}`
      );
    }

    return this.quoteSummary(moduleList);
  }

  // Quote Summary Properties (as async methods in TypeScript)

  /** Asset Profile - Geographical and business summary data */
  async getAssetProfile(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['assetProfile']);
  }

  /** Calendar Events - Earnings and revenue expectations */
  async getCalendarEvents(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['calendarEvents']);
  }

  /** Earnings - Historical earnings data */
  async getEarnings(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['earnings']);
  }

  /** Earnings Trend - Historical trend data for earnings/revenue estimations */
  async getEarningsTrend(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['earningsTrend']);
  }

  /** ESG Scores - Environmental, social, and governance metrics */
  async getEsgScores(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['esgScores']);
  }

  /** Financial Data Summary - Financial KPIs from quote summary */
  async getFinancialDataSummary(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['financialData']);
  }

  /** Index Trend - Index-related PE and PEG ratios */
  async getIndexTrend(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['indexTrend']);
  }

  /** Industry Trend (deprecated) */
  async getIndustryTrend(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['industryTrend']);
  }

  /** Key Statistics - PE, enterprise value, EPS, EBITA, etc. */
  async getKeyStats(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['defaultKeyStatistics']);
  }

  /** Major Holders - Breakdown of owners (insiders, institutions) */
  async getMajorHolders(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['majorHoldersBreakdown']);
  }

  /** Page Views - Trend data for symbol page views */
  async getPageViews(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['pageViews']);
  }

  /** Price - Detailed pricing data, exchange, market cap, etc. */
  async getPrice(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['price']);
  }

  /** Quote Type - Stock exchange specific data */
  async getQuoteType(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['quoteType']);
  }

  /** Share Purchase Activity - Buy/sell data for insiders */
  async getSharePurchaseActivity(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['netSharePurchaseActivity']);
  }

  /** Summary Detail - Similar to price endpoint */
  async getSummaryDetail(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['summaryDetail']);
  }

  /** Summary Profile - Location and business summary */
  async getSummaryProfile(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['summaryProfile']);
  }

  /** Recommendation Trend - Historical recommendations (buy, hold, sell) */
  async getRecommendationTrend(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['recommendationTrend']);
  }

  /** Upgrade/Downgrade History */
  async getGradingHistory(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['upgradeDowngradeHistory']);
  }

  /** Earnings History */
  async getEarningHistory(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['earningsHistory']);
  }

  /** Fund Ownership - Top 10 owners */
  async getFundOwnership(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['fundOwnership']);
  }

  /** Insider Holders - Stock holdings of insiders */
  async getInsiderHolders(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['insiderHolders']);
  }

  /** Insider Transactions */
  async getInsiderTransactions(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['insiderTransactions']);
  }

  /** Institution Ownership - Top 10 institutional owners */
  async getInstitutionOwnership(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['institutionOwnership']);
  }

  /** SEC Filings - Historical SEC filings */
  async getSecFilings(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['secFilings']);
  }

  // ============================================================
  // ADDITIONAL DATA METHODS
  // ============================================================

  /**
   * Get quotes for multiple symbols
   */
  async getQuotes(): Promise<QuoteSummaryData> {
    await this.initialize();
    const data = await this.getData<unknown[]>('quotes', undefined, { listResult: true });

    try {
      // Transform array to object keyed by symbol
      const result: QuoteSummaryData = {};
      if (Array.isArray(data)) {
        for (const item of data) {
          if (typeof item === 'object' && item !== null && 'symbol' in item) {
            const { symbol, ...rest } = item as { symbol: string; [key: string]: unknown };
            result[symbol] = rest;
          }
        }
        return result;
      }
      return data as QuoteSummaryData;
    } catch {
      return data as QuoteSummaryData;
    }
  }

  /**
   * Get recommendations for similar symbols
   */
  async getRecommendations(): Promise<QuoteSummaryData> {
    await this.initialize();
    return this.getData<QuoteSummaryData>('recommendations');
  }

  /**
   * Get technical insights
   */
  async getTechnicalInsights(): Promise<QuoteSummaryData> {
    await this.initialize();
    return this.getData<QuoteSummaryData>('insights');
  }

  /**
   * Get news articles related to symbols
   */
  async getNews(count = 25, start?: string | Date): Promise<unknown[]> {
    await this.initialize();
    const params: Record<string, unknown> = { count };
    if (start) {
      params.start = convertToTimestamp(start);
    }
    const data = await this.getData<unknown[]>('news', params as Record<string, string | number | boolean>, { listResult: true });
    return Array.isArray(data) ? data : [];
  }

  // ============================================================
  // HISTORICAL DATA METHODS
  // ============================================================

  /**
   * Get historical pricing data
   */
  async getHistory(params: HistoryParams = {}): Promise<HistoryData> {
    await this.initialize();

    const {
      period = 'ytd',
      interval = '1d',
      start,
      end,
      adjTimezone = true,
      adjOhlc = false,
    } = params;

    const config = CONFIG.chart;
    const intervalOptions = config.query.interval.options;
    const intervals = Array.isArray(intervalOptions) ? intervalOptions : [];

    if (intervals.length > 0 && !intervals.includes(interval)) {
      throw new Error(`Invalid interval. Must be one of: ${intervals.join(', ')}`);
    }

    let queryParams: Record<string, string | number | boolean>;

    if (start || period === null || period?.toLowerCase() === 'max') {
      const period1 = convertToTimestamp(start, true);
      const period2 = convertToTimestamp(end, false);
      queryParams = { period1, period2, interval: interval.toLowerCase() };
    } else {
      queryParams = { range: period.toLowerCase(), interval: interval.toLowerCase() };
    }

    // Handle 1m interval for 1mo period specially
    if (queryParams.interval === '1m' && period === '1mo') {
      return this.getHistory1m(adjTimezone, adjOhlc);
    }

    const data = await this.getData<HistoryData>('chart', queryParams);
    return this.processHistoricalData(data, queryParams, adjTimezone, adjOhlc);
  }

  /**
   * Get 1-minute historical data (requires multiple requests)
   */
  private async getHistory1m(adjTimezone: boolean, adjOhlc: boolean): Promise<HistoryData> {
    const today = new Date();
    const results: HistoryData = {};

    // Get data for past 4 weeks in 7-day chunks
    for (let i = 0; i < 4; i++) {
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 7 * i);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);

      const period1 = Math.floor(startDate.getTime() / 1000);
      const period2 = Math.floor(endDate.getTime() / 1000);

      const queryParams = { period1, period2, interval: '1m' };
      const data = await this.getData<HistoryData>('chart', queryParams);
      const processed = this.processHistoricalData(data, queryParams, adjTimezone, adjOhlc);

      // Merge results
      for (const [symbol, symbolData] of Object.entries(processed)) {
        if (!results[symbol]) {
          results[symbol] = symbolData;
        } else if (Array.isArray(symbolData) && Array.isArray(results[symbol])) {
          (results[symbol] as unknown[]).push(...symbolData);
        }
      }
    }

    return results;
  }

  /**
   * Process raw historical data into structured format
   */
  private processHistoricalData(
    data: HistoryData,
    params: Record<string, string | number | boolean>,
    adjTimezone: boolean,
    adjOhlc: boolean
  ): HistoryData {
    const result: HistoryData = {};
    const isDaily = !String(params.interval).endsWith('m') && !String(params.interval).endsWith('h');

    for (const symbol of this._symbols) {
      const symbolData = data[symbol] as Record<string, unknown>;

      if (!symbolData || typeof symbolData !== 'object') {
        result[symbol] = symbolData;
        continue;
      }

      if ('timestamp' in symbolData && Array.isArray(symbolData.timestamp)) {
        const timestamps = symbolData.timestamp as number[];
        const indicators = symbolData.indicators as {
          quote: Array<Record<string, number[]>>;
          adjclose?: Array<{ adjclose: number[] }>;
        };
        const events = symbolData.events as Record<string, Record<string, unknown>> | undefined;
        const meta = symbolData.meta as Record<string, unknown>;

        const quote = indicators?.quote?.[0] || {};
        const adjclose = indicators?.adjclose?.[0]?.adjclose;

        // Build OHLCV data
        const rows: Array<Record<string, unknown>> = [];

        for (let i = 0; i < timestamps.length; i++) {
          const timestamp = timestamps[i];
          let date: Date | string;

          if (isDaily) {
            // Convert to date string for daily data
            const d = new Date(timestamp * 1000);
            if (adjTimezone && meta?.exchangeTimezoneName) {
              // Adjust for timezone
              date = d.toISOString().split('T')[0];
            } else {
              date = d.toISOString().split('T')[0];
            }
          } else {
            // Keep as datetime for intraday
            date = new Date(timestamp * 1000);
            if (adjTimezone && meta?.exchangeTimezoneName) {
              // Could convert to local timezone here
            }
          }

          const row: Record<string, unknown> = {
            date,
            open: quote.open?.[i],
            high: quote.high?.[i],
            low: quote.low?.[i],
            close: quote.close?.[i],
            volume: quote.volume?.[i],
          };

          if (adjclose) {
            row.adjclose = adjclose[i];
          }

          // Add dividend/split data if present
          if (events?.dividends) {
            const dividend = Object.values(events.dividends).find(
              (d: unknown) => (d as { date: number }).date === timestamp
            ) as { amount: number } | undefined;
            row.dividends = dividend?.amount ?? 0;
          }

          if (events?.splits) {
            const split = Object.values(events.splits).find(
              (s: unknown) => (s as { date: number }).date === timestamp
            ) as { numerator: number; denominator: number } | undefined;
            row.splits = split ? split.numerator / split.denominator : 0;
          }

          rows.push(row);
        }

        // Adjust OHLC if requested
        if (adjOhlc && adjclose) {
          for (const row of rows) {
            if (row.close && row.adjclose) {
              const adjust = (row.close as number) / (row.adjclose as number);
              row.open = (row.open as number) / adjust;
              row.high = (row.high as number) / adjust;
              row.low = (row.low as number) / adjust;
              row.close = row.adjclose;
              delete row.adjclose;
            }
          }
        }

        result[symbol] = rows;
      } else {
        // Error or no data
        result[symbol] = symbolData;
      }
    }

    return result;
  }

  /**
   * Get dividend history
   */
  async getDividendHistory(start: string | Date, end?: string | Date): Promise<HistoryData> {
    const history = await this.getHistory({ start, end });
    const result: HistoryData = {};

    for (const [symbol, data] of Object.entries(history)) {
      if (Array.isArray(data)) {
        const dividends = data.filter(
          (row) => typeof row === 'object' && row !== null && (row as Record<string, unknown>).dividends !== 0
        );
        result[symbol] = dividends;
      } else {
        result[symbol] = data;
      }
    }

    return result;
  }

  // ============================================================
  // FINANCIALS METHODS
  // ============================================================

  /**
   * Internal method to fetch financial data
   */
  private async financials(
    financialsType: string,
    frequency: string | null = 'a',
    premium = false,
    types?: string[],
    trailing = true
  ): Promise<FinancialsData> {
    await this.initialize();

    let prefix = '';
    let periodType = '';

    if (frequency) {
      const freqKey = frequency.charAt(0).toLowerCase();
      const timeDict = FUNDAMENTALS_TIME_ARGS[freqKey as keyof typeof FUNDAMENTALS_TIME_ARGS];
      if (timeDict) {
        prefix = timeDict.prefix;
        periodType = timeDict.period_type;
      }
    }

    const key = premium ? 'fundamentals_premium' : 'fundamentals';
    const configOptions = CONFIG[key]?.query?.type?.options;
    let configTypes: string[] = types || [];

    if (!types && configOptions && typeof configOptions === 'object' && !Array.isArray(configOptions)) {
      configTypes = (configOptions as Record<string, string[]>)[financialsType] || [];
    }

    let prefixedTypes: string[];
    if (trailing && prefix) {
      prefixedTypes = [
        ...configTypes.map((t: string) => `${prefix}${t}`),
        ...configTypes.map((t: string) => `trailing${t}`),
      ];
    } else if (prefix) {
      prefixedTypes = configTypes.map((t: string) => `${prefix}${t}`);
    } else {
      prefixedTypes = configTypes;
    }

    const params = { type: prefixedTypes.join(',') };
    const data = await this.getData<FinancialsData>(key, params, { listResult: true });

    return this.processFinancialsData(data, prefix, periodType, trailing, financialsType);
  }

  /**
   * Process raw financials data
   */
  private processFinancialsData(
    data: FinancialsData,
    prefix: string,
    periodType: string,
    trailing: boolean,
    financialsType: string
  ): FinancialsData {
    // For now, return the raw data
    // Full pandas-like processing would require a DataFrame library
    // This can be enhanced with danfojs or similar
    return data;
  }

  /**
   * Get income statement
   */
  async getIncomeStatement(frequency = 'a', trailing = true): Promise<FinancialsData> {
    return this.financials('income_statement', frequency, false, undefined, trailing);
  }

  /**
   * Get balance sheet
   */
  async getBalanceSheet(frequency = 'a'): Promise<FinancialsData> {
    return this.financials('balance_sheet', frequency);
  }

  /**
   * Get cash flow statement
   */
  async getCashFlow(frequency = 'a', trailing = true): Promise<FinancialsData> {
    return this.financials('cash_flow', frequency, false, undefined, trailing);
  }

  /**
   * Get valuation measures
   */
  async getValuationMeasures(): Promise<FinancialsData> {
    return this.financials('valuation', 'q');
  }

  /**
   * Get all financial data
   */
  async getAllFinancialData(frequency = 'a'): Promise<FinancialsData> {
    const types = flattenList(
      Object.values(FUNDAMENTALS_OPTIONS).map((options) => options as string[])
    );
    return this.financials('cash_flow', frequency, false, types, false);
  }

  /**
   * Get specific financial data types
   */
  async getFinancialData(types: string | string[], frequency = 'a', trailing = true): Promise<FinancialsData> {
    const typeList = Array.isArray(types)
      ? types
      : types.match(/[a-zA-Z]+/g) || [];
    return this.financials('cash_flow', frequency, false, typeList, trailing);
  }

  /**
   * Get corporate events
   */
  async getCorporateEvents(): Promise<FinancialsData> {
    return this.financials('cash_flow', null, false, CORPORATE_EVENTS, false);
  }

  /**
   * Get corporate guidance
   */
  async getCorporateGuidance(): Promise<FinancialsData> {
    return this.financials('cash_flow', null, false, ['sigdev_corporate_guidance'], false);
  }

  // ============================================================
  // OPTIONS METHODS
  // ============================================================

  /**
   * Get option chain data
   */
  async getOptionChain(): Promise<OptionChainData> {
    await this.initialize();
    const data = await this.getData<OptionChainData>('options', { getAllData: 'true' });
    return this.processOptionData(data);
  }

  /**
   * Process option chain data
   */
  private processOptionData(data: OptionChainData): OptionChainData {
    const result: OptionChainData = {};

    for (const symbol of this._symbols) {
      const symbolData = data[symbol] as Record<string, unknown>;

      if (!symbolData || typeof symbolData !== 'object') {
        result[symbol] = symbolData;
        continue;
      }

      if ('options' in symbolData && Array.isArray(symbolData.options)) {
        const options = symbolData.options as Array<{
          calls: unknown[];
          puts: unknown[];
          expirationDate: number;
        }>;

        const allCalls: unknown[] = [];
        const allPuts: unknown[] = [];

        for (const expiration of options) {
          const expirationDate = new Date(expiration.expirationDate * 1000);

          for (const call of expiration.calls || []) {
            allCalls.push({ ...call as object, expiration: expirationDate, optionType: 'call' });
          }

          for (const put of expiration.puts || []) {
            allPuts.push({ ...put as object, expiration: expirationDate, optionType: 'put' });
          }
        }

        result[symbol] = {
          calls: allCalls,
          puts: allPuts,
          underlyingSymbol: (symbolData as Record<string, unknown>).underlyingSymbol,
          expirationDates: (symbolData as Record<string, unknown>).expirationDates,
          strikes: (symbolData as Record<string, unknown>).strikes,
        };
      } else {
        result[symbol] = symbolData;
      }
    }

    return result;
  }

  // ============================================================
  // FUND-SPECIFIC METHODS
  // ============================================================

  /**
   * Get fund holding info
   */
  async getFundHoldingInfo(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['topHoldings']);
  }

  /**
   * Get fund top holdings
   */
  async getFundTopHoldings(): Promise<QuoteSummaryData> {
    const data = await this.quoteSummary(['topHoldings']);
    const result: QuoteSummaryData = {};

    for (const [symbol, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null && 'holdings' in value) {
        result[symbol] = (value as Record<string, unknown>).holdings;
      } else {
        result[symbol] = value;
      }
    }

    return result;
  }

  /**
   * Get fund bond holdings
   */
  async getFundBondHoldings(): Promise<QuoteSummaryData> {
    const data = await this.getFundHoldingInfo();
    return this.extractFundData(data, 'bondHoldings');
  }

  /**
   * Get fund equity holdings
   */
  async getFundEquityHoldings(): Promise<QuoteSummaryData> {
    const data = await this.getFundHoldingInfo();
    return this.extractFundData(data, 'equityHoldings');
  }

  /**
   * Get fund sector weightings
   */
  async getFundSectorWeightings(): Promise<QuoteSummaryData> {
    const data = await this.getFundHoldingInfo();
    return this.extractFundData(data, 'sectorWeightings');
  }

  /**
   * Get fund bond ratings
   */
  async getFundBondRatings(): Promise<QuoteSummaryData> {
    const data = await this.getFundHoldingInfo();
    return this.extractFundData(data, 'bondRatings');
  }

  /**
   * Get fund performance
   */
  async getFundPerformance(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['fundPerformance']);
  }

  /**
   * Get fund profile
   */
  async getFundProfile(): Promise<QuoteSummaryData> {
    return this.quoteSummary(['fundProfile']);
  }

  /**
   * Get fund category holdings
   */
  async getFundCategoryHoldings(): Promise<QuoteSummaryData> {
    const data = await this.quoteSummary(['topHoldings']);
    const result: QuoteSummaryData = {};

    for (const [symbol, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        const filtered: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
          if (!FUND_DETAILS.includes(key)) {
            filtered[key] = val;
          }
        }
        result[symbol] = filtered;
      } else {
        result[symbol] = value;
      }
    }

    return result;
  }

  /**
   * Extract specific fund data field
   */
  private extractFundData(data: QuoteSummaryData, field: string): QuoteSummaryData {
    const result: QuoteSummaryData = {};

    for (const [symbol, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null && field in value) {
        result[symbol] = (value as Record<string, unknown>)[field];
      } else {
        result[symbol] = value;
      }
    }

    return result;
  }

  // ============================================================
  // COMPANY OFFICERS
  // ============================================================

  /**
   * Get company officers
   */
  async getCompanyOfficers(): Promise<QuoteSummaryData> {
    const data = await this.quoteSummary(['assetProfile']);
    return this.extractFundData(data, 'companyOfficers');
  }
}

/**
 * Create a Ticker instance and optionally validate symbols
 */
export async function createTicker(
  symbols: string | string[],
  options: TickerOptions = {}
): Promise<Ticker> {
  const ticker = new Ticker(symbols, options);

  if (options.validate) {
    await ticker.validate();
  }

  return ticker;
}
