/**
 * TypeScript interfaces for Yahoo Finance API responses.
 */

// Generic API response wrapper
export interface ApiResponse<T> {
  [key: string]: T | ApiError | undefined;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  description: string;
}

// Quote Summary Module Types

export interface AssetProfile {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  fax?: string;
  website?: string;
  industry?: string;
  industryKey?: string;
  industryDisp?: string;
  sector?: string;
  sectorKey?: string;
  sectorDisp?: string;
  longBusinessSummary?: string;
  fullTimeEmployees?: number;
  companyOfficers?: CompanyOfficer[];
  auditRisk?: number;
  boardRisk?: number;
  compensationRisk?: number;
  shareHolderRightsRisk?: number;
  overallRisk?: number;
  governanceEpochDate?: string;
  compensationAsOfEpochDate?: string;
  maxAge?: number;
}

export interface CompanyOfficer {
  maxAge?: number;
  name?: string;
  age?: number;
  title?: string;
  yearBorn?: number;
  fiscalYear?: number;
  totalPay?: number;
  exercisedValue?: number;
  unexercisedValue?: number;
}

export interface Price {
  maxAge?: number;
  preMarketChangePercent?: number;
  preMarketChange?: number;
  preMarketTime?: string;
  preMarketPrice?: number;
  preMarketSource?: string;
  postMarketChangePercent?: number;
  postMarketChange?: number;
  postMarketTime?: string;
  postMarketPrice?: number;
  postMarketSource?: string;
  regularMarketChangePercent?: number;
  regularMarketChange?: number;
  regularMarketTime?: string;
  priceHint?: number;
  regularMarketPrice?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  averageDailyVolume10Day?: number;
  averageDailyVolume3Month?: number;
  regularMarketPreviousClose?: number;
  regularMarketSource?: string;
  regularMarketOpen?: number;
  strikePrice?: number;
  openInterest?: number;
  exchange?: string;
  exchangeName?: string;
  exchangeDataDelayedBy?: number;
  marketState?: string;
  quoteType?: string;
  symbol?: string;
  underlyingSymbol?: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  quoteSourceName?: string;
  currencySymbol?: string;
  fromCurrency?: string;
  toCurrency?: string;
  lastMarket?: string;
  volume24Hr?: number;
  volumeAllCurrencies?: number;
  circulatingSupply?: number;
  marketCap?: number;
}

export interface SummaryDetail {
  maxAge?: number;
  priceHint?: number;
  previousClose?: number;
  open?: number;
  dayLow?: number;
  dayHigh?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayLow?: number;
  regularMarketDayHigh?: number;
  dividendRate?: number;
  dividendYield?: number;
  exDividendDate?: string;
  payoutRatio?: number;
  fiveYearAvgDividendYield?: number;
  beta?: number;
  trailingPE?: number;
  forwardPE?: number;
  volume?: number;
  regularMarketVolume?: number;
  averageVolume?: number;
  averageVolume10days?: number;
  averageDailyVolume10Day?: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  marketCap?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  priceToSalesTrailing12Months?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  trailingAnnualDividendRate?: number;
  trailingAnnualDividendYield?: number;
  currency?: string;
  fromCurrency?: string;
  toCurrency?: string;
  lastMarket?: string;
  coinMarketCapLink?: string;
  algorithm?: string;
  tradeable?: boolean;
}

export interface FinancialData {
  maxAge?: number;
  currentPrice?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
  targetMeanPrice?: number;
  targetMedianPrice?: number;
  recommendationMean?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;
  totalCash?: number;
  totalCashPerShare?: number;
  ebitda?: number;
  totalDebt?: number;
  quickRatio?: number;
  currentRatio?: number;
  totalRevenue?: number;
  debtToEquity?: number;
  revenuePerShare?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  grossProfits?: number;
  freeCashflow?: number;
  operatingCashflow?: number;
  earningsGrowth?: number;
  revenueGrowth?: number;
  grossMargins?: number;
  ebitdaMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  financialCurrency?: string;
}

export interface DefaultKeyStatistics {
  maxAge?: number;
  priceHint?: number;
  enterpriseValue?: number;
  forwardPE?: number;
  profitMargins?: number;
  floatShares?: number;
  sharesOutstanding?: number;
  sharesShort?: number;
  sharesShortPriorMonth?: number;
  sharesShortPreviousMonthDate?: string;
  dateShortInterest?: string;
  sharesPercentSharesOut?: number;
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;
  shortRatio?: number;
  shortPercentOfFloat?: number;
  beta?: number;
  impliedSharesOutstanding?: number;
  morningStarOverallRating?: number;
  morningStarRiskRating?: number;
  category?: string;
  bookValue?: number;
  priceToBook?: number;
  annualReportExpenseRatio?: number;
  ytdReturn?: number;
  beta3Year?: number;
  totalAssets?: number;
  yield?: number;
  fundFamily?: string;
  fundInceptionDate?: string;
  legalType?: string;
  threeYearAverageReturn?: number;
  fiveYearAverageReturn?: number;
  priceToSalesTrailing12Months?: number;
  lastFiscalYearEnd?: string;
  nextFiscalYearEnd?: string;
  mostRecentQuarter?: string;
  earningsQuarterlyGrowth?: number;
  revenueQuarterlyGrowth?: number;
  netIncomeToCommon?: number;
  trailingEps?: number;
  forwardEps?: number;
  pegRatio?: number;
  lastSplitFactor?: string;
  lastSplitDate?: string;
  enterpriseToRevenue?: number;
  enterpriseToEbitda?: number;
  fiftyTwoWeekChange?: number;
  SandP52WeekChange?: number;
  lastDividendValue?: number;
  lastDividendDate?: string;
  lastCapGain?: number;
}

export interface CalendarEvents {
  maxAge?: number;
  earnings?: {
    earningsDate?: string[];
    earningsAverage?: number;
    earningsLow?: number;
    earningsHigh?: number;
    revenueAverage?: number;
    revenueLow?: number;
    revenueHigh?: number;
  };
  exDividendDate?: string;
  dividendDate?: string;
}

export interface Earnings {
  maxAge?: number;
  earningsChart?: {
    quarterly?: Array<{
      date?: string;
      actual?: number;
      estimate?: number;
    }>;
    currentQuarterEstimate?: number;
    currentQuarterEstimateDate?: string;
    currentQuarterEstimateYear?: number;
    earningsDate?: string[];
  };
  financialsChart?: {
    yearly?: Array<{
      date?: number;
      revenue?: number;
      earnings?: number;
    }>;
    quarterly?: Array<{
      date?: string;
      revenue?: number;
      earnings?: number;
    }>;
  };
  financialCurrency?: string;
}

export interface EsgScores {
  maxAge?: number;
  totalEsg?: number;
  environmentScore?: number;
  socialScore?: number;
  governanceScore?: number;
  ratingYear?: number;
  ratingMonth?: number;
  highestControversy?: number;
  peerCount?: number;
  esgPerformance?: string;
  peerGroup?: string;
  relatedControversy?: string[];
  peerEsgScorePerformance?: {
    min?: number;
    avg?: number;
    max?: number;
  };
  peerGovernancePerformance?: {
    min?: number;
    avg?: number;
    max?: number;
  };
  peerSocialPerformance?: {
    min?: number;
    avg?: number;
    max?: number;
  };
  peerEnvironmentPerformance?: {
    min?: number;
    avg?: number;
    max?: number;
  };
  peerHighestControversyPerformance?: {
    min?: number;
    avg?: number;
    max?: number;
  };
  percentile?: number;
  environmentPercentile?: number;
  socialPercentile?: number;
  governancePercentile?: number;
  adult?: boolean;
  alcoholic?: boolean;
  animalTesting?: boolean;
  catholic?: boolean;
  controversialWeapons?: boolean;
  smallArms?: boolean;
  furLeather?: boolean;
  gambling?: boolean;
  gmo?: boolean;
  militaryContract?: boolean;
  nuclear?: boolean;
  pesticides?: boolean;
  palmOil?: boolean;
  coal?: boolean;
  tobacco?: boolean;
}

// Historical Data Types

export interface HistoryMeta {
  currency?: string;
  symbol?: string;
  exchangeName?: string;
  instrumentType?: string;
  firstTradeDate?: number;
  regularMarketTime?: number;
  gmtoffset?: number;
  timezone?: string;
  exchangeTimezoneName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  scale?: number;
  priceHint?: number;
  currentTradingPeriod?: {
    pre?: TradingPeriod;
    regular?: TradingPeriod;
    post?: TradingPeriod;
  };
  tradingPeriods?: TradingPeriod[][];
  dataGranularity?: string;
  range?: string;
  validRanges?: string[];
}

export interface TradingPeriod {
  timezone?: string;
  start?: number;
  end?: number;
  gmtoffset?: number;
}

export interface HistoryData {
  meta: HistoryMeta;
  timestamp: number[];
  indicators: {
    quote: Array<{
      open?: number[];
      high?: number[];
      low?: number[];
      close?: number[];
      volume?: number[];
    }>;
    adjclose?: Array<{ adjclose: number[] }>;
  };
  events?: {
    dividends?: Record<string, { amount: number; date: number }>;
    splits?: Record<string, { date: number; numerator: number; denominator: number; splitRatio: string }>;
  };
}

// Screener Types

export interface ScreenerQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  marketCap?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  averageAnalystRating?: string;
  exchange?: string;
  quoteType?: string;
  currency?: string;
  [key: string]: unknown;
}

export interface ScreenerResult {
  id?: string;
  title?: string;
  description?: string;
  canonicalName?: string;
  criteriaMeta?: {
    size?: number;
    offset?: number;
    sortField?: string;
    sortType?: string;
    quoteType?: string;
    topOperator?: string;
    criteria?: unknown[];
  };
  rawCriteria?: string;
  start?: number;
  count?: number;
  total?: number;
  quotes: ScreenerQuote[];
  useRecords?: boolean;
  predefinedScr?: boolean;
  versionId?: number;
  creationDate?: number;
  lastUpdated?: number;
  isPremium?: boolean;
  iconUrl?: string;
}

// Financial Statement Types

export interface FinancialStatement {
  [key: string]: number | string | null | undefined;
  asOfDate?: string;
  periodType?: string;
  currencyCode?: string;
}

export interface TimeSeries {
  meta?: {
    symbol?: string[];
    type?: string[];
  };
  timestamp?: number[];
  [key: string]: unknown;
}

// Options Chain Types

export interface OptionContract {
  contractSymbol?: string;
  strike?: number;
  currency?: string;
  lastPrice?: number;
  change?: number;
  percentChange?: number;
  volume?: number;
  openInterest?: number;
  bid?: number;
  ask?: number;
  contractSize?: string;
  expiration?: number;
  lastTradeDate?: number;
  impliedVolatility?: number;
  inTheMoney?: boolean;
}

export interface OptionChain {
  underlying?: {
    symbol?: string;
    shortName?: string;
    longName?: string;
    regularMarketPrice?: number;
  };
  expirationDates?: number[];
  strikes?: number[];
  hasMiniOptions?: boolean;
  options?: Array<{
    expirationDate?: number;
    calls?: OptionContract[];
    puts?: OptionContract[];
  }>;
}

// News Types

export interface NewsItem {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
  type?: string;
  thumbnail?: {
    resolutions?: Array<{
      url?: string;
      width?: number;
      height?: number;
      tag?: string;
    }>;
  };
  relatedTickers?: string[];
}

// Search Types

export interface SearchResult {
  explains?: unknown[];
  count?: number;
  quotes?: Array<{
    exchange?: string;
    shortname?: string;
    quoteType?: string;
    symbol?: string;
    index?: string;
    score?: number;
    typeDisp?: string;
    longname?: string;
    exchDisp?: string;
    sector?: string;
    industry?: string;
    dispSecIndFlag?: boolean;
    isYahooFinance?: boolean;
  }>;
  news?: NewsItem[];
  nav?: unknown[];
  lists?: unknown[];
  researchReports?: unknown[];
  screenerFieldResults?: unknown[];
  totalTime?: number;
  timeTakenForQuotes?: number;
  timeTakenForNews?: number;
  timeTakenForAlgowatchlist?: number;
  timeTakenForPredefinedScreener?: number;
  timeTakenForCr498702?: number;
  timeTakenForResearchReports?: number;
  timeTakenForScreenerField?: number;
  timeTakenForCul498702?: number;
}
