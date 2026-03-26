/**
 * Research - Access Yahoo Finance Premium research reports and trade ideas
 *
 * Note: Requires Yahoo Finance Premium subscription for most methods.
 */

import { BaseFinance } from './BaseFinance';
import { convertToList } from '../utils/helpers';
import { BaseFinanceOptions } from '../types';

// Research data configuration
const RESEARCH_DATA = {
  report: {
    sortType: 'DESC',
    sortField: 'report_date',
    offset: 0,
    size: 100,
    entityIdType: 'argus_reports',
    includeFields: [
      'report_date',
      'report_type',
      'report_title',
      'head_html',
      'ticker',
      'pdf_url',
      'snapshot_url',
      'sector',
      'id',
      'change_in_investment_rating',
      'investment_rating',
      'change_in_target_price',
      'change_in_earnings_per_share_estimate',
    ],
  },
  trade: {
    sortType: 'DESC',
    sortField: 'startdatetime',
    offset: 0,
    size: 100,
    entityIdType: 'trade_idea',
    includeFields: [
      'startdatetime',
      'term',
      'ticker',
      'rating',
      'price_target',
      'ror',
      'id',
      'image_url',
      'company_name',
      'price_timestamp',
      'current_price',
      'trade_idea_title',
      'highlights',
      'description',
    ],
  },
  earnings: {
    sortType: 'ASC',
    sortField: 'companyshortname',
    offset: 0,
    size: 100,
    entityIdType: 'earnings',
    includeFields: [
      'ticker',
      'companyshortname',
      'startdatetime',
      'startdatetimetype',
      'epsestimate',
      'epsactual',
      'epssurprisepct',
    ],
  },
  splits: {
    sortType: 'DESC',
    sortField: 'startdatetime',
    entityIdType: 'splits',
    includeFields: [
      'ticker',
      'companyshortname',
      'startdatetime',
      'optionable',
      'old_share_worth',
      'share_worth',
    ],
  },
  ipo: {
    sortType: 'DESC',
    sortField: 'startdatetime',
    entityIdType: 'ipo_info',
    includeFields: [
      'ticker',
      'companyshortname',
      'exchange_short_name',
      'filingdate',
      'startdatetime',
      'amendeddate',
      'pricefrom',
      'priceto',
      'offerprice',
      'currencyname',
      'shares',
      'dealtype',
    ],
  },
} as const;

// Filter options
export const TRENDS = {
  options: ['Bearish', 'Bullish'] as const,
  multiple: true,
};

export const SECTORS = {
  options: [
    'Basic Materials',
    'Communication Services',
    'Consumer Cyclical',
    'Consumer Defensive',
    'Energy',
    'Financial Services',
    'Healthcare',
    'Industrial',
    'Real Estate',
    'Technology',
    'Utilities',
  ] as const,
  multiple: true,
};

export const REPORT_TYPES = {
  options: [
    'Analyst Report',
    'Insider Activity',
    'Market Outlook',
    'Market Summary',
    'Market Update',
    'Portfolio Ideas',
    'Quantitative Report',
    'Sector Watch',
    'Stock Picks',
    'Technical Analysis',
    'Thematic Portfolio',
    'Top/Bottom Insider Activity',
  ] as const,
  multiple: true,
};

export const DATES = {
  options: {
    'Last Week': 7,
    'Last Month': 30,
    'Last Year': 365,
  } as const,
  multiple: false,
};

export const TERMS = {
  field: 'term',
  options: ['Short term', 'Mid term', 'Long term'] as const,
  multiple: true,
};

// Query options by research type
const QUERY_OPTIONS = {
  report: {
    investment_rating: TRENDS,
    sector: SECTORS,
    report_type: REPORT_TYPES,
    report_date: DATES,
  },
  trade: {
    trend: TRENDS,
    sector: SECTORS,
    term: TERMS,
    startdatetime: DATES,
  },
} as const;

// Types
export interface ReportFilters {
  investment_rating?: string | string[];
  sector?: string | string[];
  report_type?: string | string[];
  report_date?: string;
}

export interface TradeFilters {
  trend?: string | string[];
  sector?: string | string[];
  term?: string | string[];
  startdatetime?: string;
}

export interface ResearchResult {
  documents?: Array<{
    columns: Array<{ label: string }>;
    rows: unknown[][];
  }>;
  [key: string]: unknown;
}

type ResearchType = 'report' | 'trade' | 'earnings' | 'splits' | 'ipo';

export class Research extends BaseFinance {
  private static readonly OPERATORS = ['lt', 'lte', 'gt', 'gte', 'btwn', 'eq', 'and', 'or'];
  private static readonly RESEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/visualization';

  constructor(options: BaseFinanceOptions = {}) {
    super(options);
    this._symbols = [];
  }

  /**
   * Construct date string for queries
   */
  private constructDate(daysAgo = 0): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  /**
   * Build query from filters
   */
  private constructQuery(
    researchType: 'report' | 'trade',
    filters: Record<string, string | string[]>
  ): Record<string, unknown> {
    const operandList: Record<string, unknown>[] = [];
    const queryOptions = QUERY_OPTIONS[researchType];

    for (const [key, value] of Object.entries(filters)) {
      const values = convertToList(value as string, true);

      if (!(key in queryOptions)) {
        throw new Error(`${key} is an invalid argument for ${researchType}`);
      }

      const optionConfig = queryOptions[key as keyof typeof queryOptions];
      const options = 'options' in optionConfig
        ? (typeof optionConfig.options === 'object' && !Array.isArray(optionConfig.options)
          ? Object.keys(optionConfig.options)
          : optionConfig.options as readonly string[])
        : [];

      const invalid = values.filter((v) => !options.includes(v));
      if (invalid.length > 0) {
        throw new Error(`${invalid.join(', ')} is an invalid option for ${key}`);
      }

      if (!optionConfig.multiple && values.length > 1) {
        throw new Error(`Please provide only one value for ${key}`);
      }

      operandList.push(this.constructOperand(key, values, researchType));
    }

    if (operandList.length === 0) {
      return {};
    }

    if (operandList.length === 1) {
      return operandList[0];
    }

    return { operands: operandList, operator: 'and' };
  }

  /**
   * Build operand for query
   */
  private constructOperand(
    key: string,
    values: string[],
    researchType: 'report' | 'trade'
  ): Record<string, unknown> {
    const queryOptions = QUERY_OPTIONS[researchType];
    const optionConfig = queryOptions[key as keyof typeof queryOptions];

    if (values.length === 1) {
      // Check if it's a date range option (DATES has a Record, not array)
      if ('options' in optionConfig) {
        const opts = optionConfig.options;
        if (typeof opts === 'object' && !Array.isArray(opts) && opts !== null) {
          const dateOptions = opts as unknown as Record<string, number>;
          const days = dateOptions[values[0]];
          if (typeof days === 'number') {
            return {
              operands: [key, this.constructDate(days), this.constructDate()],
              operator: 'btwn',
            };
          }
        }
      }
      return { operands: [key, values[0]], operator: 'eq' };
    }

    // Multiple values - OR condition
    return {
      operands: values.map((v) => ({ operands: [key, v], operator: 'eq' })),
      operator: 'or',
    };
  }

  /**
   * Internal method to fetch research data
   */
  private async getResearch(
    researchType: ResearchType,
    size: number,
    filters: Record<string, string | string[]> = {}
  ): Promise<Array<Record<string, unknown>>> {
    await this.initialize();

    const query = researchType === 'report' || researchType === 'trade'
      ? this.constructQuery(researchType, filters)
      : {};

    const basePayload = RESEARCH_DATA[researchType];
    const results: Array<Record<string, unknown>> = [];

    // Make paginated requests
    for (let offset = 0; offset < size; offset += 100) {
      const payload = {
        ...basePayload,
        offset,
        size: Math.min(100, size - offset),
        query,
      };

      try {
        const response = await this.session.post<ResearchResult>(
          Research.RESEARCH_URL,
          payload,
          { params: this.defaultQueryParams }
        );

        if (response.documents?.[0]?.rows) {
          const columns = response.documents[0].columns.map((c) => c.label);
          const rows = response.documents[0].rows;

          for (const row of rows) {
            const record: Record<string, unknown> = {};
            columns.forEach((col, idx) => {
              record[col] = row[idx];
            });
            results.push(record);
          }
        }
      } catch (error) {
        console.warn(`Research request failed: ${(error as Error).message}`);
        break;
      }
    }

    return results;
  }

  /**
   * Get research reports
   * @param size - Number of reports to return (default: 100)
   * @param filters - Optional filters (investment_rating, sector, report_type, report_date)
   */
  async getReports(
    size = 100,
    filters: ReportFilters = {}
  ): Promise<Array<Record<string, unknown>>> {
    return this.getResearch('report', size, filters as Record<string, string | string[]>);
  }

  /**
   * Get trade ideas
   * @param size - Number of trades to return (default: 100)
   * @param filters - Optional filters (trend, sector, term, startdatetime)
   */
  async getTrades(
    size = 100,
    filters: TradeFilters = {}
  ): Promise<Array<Record<string, unknown>>> {
    return this.getResearch('trade', size, filters as Record<string, string | string[]>);
  }

  /**
   * Get earnings calendar
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @param size - Max number of results (default: 100)
   */
  async getEarnings(
    startDate: string,
    endDate: string,
    size = 100
  ): Promise<Array<Record<string, unknown>>> {
    // Earnings uses date range in the query
    const query = {
      operands: ['startdatetime', startDate, endDate],
      operator: 'btwn',
    };

    await this.initialize();

    const payload = {
      ...RESEARCH_DATA.earnings,
      size,
      query,
    };

    try {
      const response = await this.session.post<ResearchResult>(
        Research.RESEARCH_URL,
        payload,
        { params: this.defaultQueryParams }
      );

      if (response.documents?.[0]?.rows) {
        const columns = response.documents[0].columns.map((c) => c.label);
        return response.documents[0].rows.map((row) => {
          const record: Record<string, unknown> = {};
          columns.forEach((col, idx) => {
            record[col] = row[idx];
          });
          return record;
        });
      }
    } catch (error) {
      console.warn(`Earnings request failed: ${(error as Error).message}`);
    }

    return [];
  }

  /**
   * Get stock splits
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @param size - Max number of results (default: 100)
   */
  async getSplits(
    startDate: string,
    endDate: string,
    size = 100
  ): Promise<Array<Record<string, unknown>>> {
    const query = {
      operands: ['startdatetime', startDate, endDate],
      operator: 'btwn',
    };

    await this.initialize();

    const payload = {
      ...RESEARCH_DATA.splits,
      size,
      query,
    };

    try {
      const response = await this.session.post<ResearchResult>(
        Research.RESEARCH_URL,
        payload,
        { params: this.defaultQueryParams }
      );

      if (response.documents?.[0]?.rows) {
        const columns = response.documents[0].columns.map((c) => c.label);
        return response.documents[0].rows.map((row) => {
          const record: Record<string, unknown> = {};
          columns.forEach((col, idx) => {
            record[col] = row[idx];
          });
          return record;
        });
      }
    } catch (error) {
      console.warn(`Splits request failed: ${(error as Error).message}`);
    }

    return [];
  }

  /**
   * Get IPO calendar
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @param size - Max number of results (default: 100)
   */
  async getIPOs(
    startDate: string,
    endDate: string,
    size = 100
  ): Promise<Array<Record<string, unknown>>> {
    const query = {
      operands: ['startdatetime', startDate, endDate],
      operator: 'btwn',
    };

    await this.initialize();

    const payload = {
      ...RESEARCH_DATA.ipo,
      size,
      query,
    };

    try {
      const response = await this.session.post<ResearchResult>(
        Research.RESEARCH_URL,
        payload,
        { params: this.defaultQueryParams }
      );

      if (response.documents?.[0]?.rows) {
        const columns = response.documents[0].columns.map((c) => c.label);
        return response.documents[0].rows.map((row) => {
          const record: Record<string, unknown> = {};
          columns.forEach((col, idx) => {
            record[col] = row[idx];
          });
          return record;
        });
      }
    } catch (error) {
      console.warn(`IPO request failed: ${(error as Error).message}`);
    }

    return [];
  }
}

/**
 * Create and initialize a Research instance
 */
export async function createResearch(options: BaseFinanceOptions = {}): Promise<Research> {
  const research = new Research(options);
  await research['initialize']();
  return research;
}
