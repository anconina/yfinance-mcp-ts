/**
 * Yahoo Finance API endpoint configurations.
 * Each endpoint has a path, response field, and query parameters.
 */

import { MODULES_DICT, FUNDAMENTALS_OPTIONS } from './modules';

export interface QueryParam {
  required: boolean;
  default: unknown;
  options?: string[] | Record<string, string[]>;
}

export interface EndpointConfig {
  path: string;
  response_field: string;
  premium?: boolean;
  query: Record<string, QueryParam>;
}

// Current timestamp for default period2 values
const getCurrentTimestamp = (): number => Math.floor(Date.now() / 1000);

// Default period1 (Jan 1985)
const DEFAULT_PERIOD1 = 493590046;

export const CONFIG: Record<string, EndpointConfig> = {
  yfp_fair_value: {
    path: 'https://query2.finance.yahoo.com/ws/value-analyzer/v1/finance/premium/valueAnalyzer/multiquote',
    response_field: 'finance',
    query: {
      formatted: { required: false, default: false },
      symbols: { required: true, default: null },
    },
  },
  news: {
    path: 'https://query2.finance.yahoo.com/v2/finance/news',
    response_field: 'Content',
    query: {
      start: { required: false, default: null },
      count: { required: false, default: null },
      symbols: { required: true, default: null },
      sizeLabels: { required: false, default: null },
      widths: { required: false, default: null },
      tags: { required: false, default: null },
      filterOldVideos: { required: false, default: null },
      category: { required: false, default: null },
    },
  },
  quoteSummary: {
    path: 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}',
    response_field: 'quoteSummary',
    query: {
      formatted: { required: false, default: false },
      modules: {
        required: true,
        default: null,
        options: Object.keys(MODULES_DICT),
      },
    },
  },
  fundamentals: {
    path: 'https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{symbol}',
    response_field: 'timeseries',
    query: {
      period1: { required: true, default: DEFAULT_PERIOD1 },
      period2: { required: true, default: getCurrentTimestamp() },
      type: {
        required: true,
        default: null,
        options: FUNDAMENTALS_OPTIONS,
      },
      merge: { required: false, default: false },
      padTimeSeries: { required: false, default: false },
    },
  },
  fundamentals_premium: {
    path: 'https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/premium/timeseries/{symbol}',
    response_field: 'timeseries',
    query: {
      period1: { required: true, default: DEFAULT_PERIOD1 },
      period2: { required: true, default: getCurrentTimestamp() },
      type: {
        required: true,
        default: null,
        options: FUNDAMENTALS_OPTIONS,
      },
      merge: { required: false, default: false },
      padTimeSeries: { required: false, default: false },
    },
  },
  chart: {
    path: 'https://query2.finance.yahoo.com/v8/finance/chart/{symbol}',
    response_field: 'chart',
    query: {
      period1: { required: false, default: null },
      period2: { required: false, default: null },
      interval: {
        required: false,
        default: null,
        options: [
          '1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h',
          '1d', '5d', '1wk', '1mo', '3mo',
        ],
      },
      range: {
        required: false,
        default: null,
        options: [
          '1d', '5d', '7d', '60d', '1mo', '3mo', '6mo',
          '1y', '2y', '5y', '10y', 'ytd', 'max',
        ],
      },
      events: { required: false, default: 'div,split' },
      numberOfPoints: { required: false, default: null },
      formatted: { required: false, default: false },
    },
  },
  options: {
    path: 'https://query2.finance.yahoo.com/v7/finance/options/{symbol}',
    response_field: 'optionChain',
    query: {
      formatted: { required: false, default: false },
      date: { required: false, default: null },
      endDate: { required: false, default: null },
      size: { required: false, default: null },
      strikeMin: { required: false, default: null },
      strikeMax: { required: false, default: null },
      straddle: { required: false, default: null },
      getAllData: { required: false, default: null },
    },
  },
  validation: {
    path: 'https://query2.finance.yahoo.com/v6/finance/quote/validate',
    response_field: 'symbolsValidation',
    query: {
      symbols: { required: true, default: null },
    },
  },
  esg_chart: {
    path: 'https://query2.finance.yahoo.com/v1/finance/esgChart',
    response_field: 'esgChart',
    query: {
      symbol: { required: true, default: null },
    },
  },
  esg_peer_scores: {
    path: 'https://query2.finance.yahoo.com/v1/finance/esgPeerScores',
    response_field: 'esgPeerScores',
    query: {
      symbol: { required: true, default: null },
    },
  },
  recommendations: {
    path: 'https://query2.finance.yahoo.com/v6/finance/recommendationsbysymbol/{symbol}',
    response_field: 'finance',
    query: {},
  },
  insights: {
    path: 'https://query2.finance.yahoo.com/ws/insights/v2/finance/insights',
    response_field: 'finance',
    query: {
      symbol: { required: true, default: null },
      reportsCount: { required: false, default: null },
    },
  },
  premium_insights: {
    path: 'https://query2.finance.yahoo.com/ws/insights/v2/finance/premium/insights',
    response_field: 'finance',
    premium: true,
    query: {
      symbol: { required: true, default: null },
      reportsCount: { required: false, default: null },
    },
  },
  screener: {
    path: 'https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved',
    response_field: 'finance',
    query: {
      formatted: { required: false, default: false },
      scrIds: { required: true, default: null },
      count: { required: false, default: 25 },
    },
  },
  company360: {
    path: 'https://query2.finance.yahoo.com/ws/finance-company-360/v1/finance/premium/company360',
    response_field: 'finance',
    premium: true,
    query: {
      symbol: { required: true, default: null },
      modules: {
        required: true,
        default: [
          'innovations',
          'sustainability',
          'insiderSentiments',
          'significantDevelopments',
          'supplyChain',
          'earnings',
          'dividend',
          'companyOutlookSummary',
          'hiring',
          'companySnapshot',
        ].join(','),
      },
    },
  },
  premium_portal: {
    path: 'https://query2.finance.yahoo.com/ws/portal/v1/finance/premium/portal',
    response_field: 'finance',
    premium: true,
    query: {
      symbols: { required: true, default: null },
      modules: { required: false, default: null },
      quotefields: { required: false, default: null },
    },
  },
  trade_ideas: {
    path: 'https://query2.finance.yahoo.com/v1/finance/premium/tradeideas/overlay',
    response_field: 'tradeIdeasOverlay',
    premium: true,
    query: {
      ideaId: { required: true, default: null },
    },
  },
  visualization: {
    path: 'https://query1.finance.yahoo.com/v1/finance/visualization',
    response_field: 'finance',
    query: {
      crumb: { required: true, default: null },
    },
  },
  research: {
    path: 'https://query2.finance.yahoo.com/v1/finance/premium/visualization',
    response_field: 'finance',
    premium: true,
    query: {
      crumb: { required: true, default: null },
    },
  },
  reports: {
    path: 'https://query2.finance.yahoo.com/v1/finance/premium/researchreports/overlay',
    response_field: 'researchReportsOverlay',
    premium: true,
    query: {
      reportId: { required: true, default: null },
    },
  },
  value_analyzer: {
    path: 'https://query2.finance.yahoo.com/ws/value-analyzer/v1/finance/premium/valueAnalyzer/portal',
    response_field: 'finance',
    premium: true,
    query: {
      symbols: { required: true, default: null },
      formatted: { required: false, default: false },
    },
  },
  value_analyzer_drilldown: {
    path: 'https://query2.finance.yahoo.com/ws/value-analyzer/v1/finance/premium/valueAnalyzer',
    response_field: 'finance',
    premium: true,
    query: {
      symbol: { required: true, default: null },
      formatted: { required: false, default: false },
      start: { required: false, default: null },
      end: { required: false, default: null },
    },
  },
  technical_events: {
    path: 'https://query2.finance.yahoo.com/ws/finance-technical-events/v1/finance/premium/technicalevents',
    response_field: 'technicalEvents',
    premium: true,
    query: {
      symbol: { required: true, default: null },
      formatted: { required: false, default: false },
      tradingHorizons: { required: false, default: null },
      size: { required: false, default: null },
    },
  },
  quotes: {
    path: 'https://query2.finance.yahoo.com/v7/finance/quote',
    response_field: 'quoteResponse',
    query: {
      symbols: { required: true, default: null },
    },
  },
};

// Derived constants from CONFIG
export const PERIODS = CONFIG.chart.query.range.options as string[];
export const INTERVALS = CONFIG.chart.query.interval.options as string[];
export const MODULES = CONFIG.quoteSummary.query.modules.options as string[];

// Visualization/Research config
export const VIZ_CONFIG = {
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
      'timeZoneShortName',
      'gmtOffsetMilliSeconds',
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
};

// Fund details modules
export const FUND_DETAILS = [
  'holdings',
  'equityHoldings',
  'bondHoldings',
  'bondRatings',
  'sectorWeightings',
];

