/**
 * Formatting infrastructure constants.
 *
 * Zero-dependency module -- this is the dependency root.
 * All magic numbers, precision rules, size limits, and aggregation thresholds
 * live here so they can be tuned in one place.
 */

/** Response size soft cap in characters. Responses exceeding this get a notice. */
export const SOFT_CAP_CHARS = 4_000;

/** Response size hard cap in characters. Responses exceeding this are truncated. */
export const HARD_CAP_CHARS = 12_000;

/** Default maximum rows in a table output. */
export const DEFAULT_MAX_ROWS = 52;

/** Maximum number of columns in a markdown table. */
export const MAX_TABLE_COLUMNS = 8;

/**
 * Row-count thresholds that trigger automatic OHLCV aggregation.
 *
 * - Periods with <= 65 rows stay daily.
 * - Periods with <= 260 rows aggregate to weekly.
 * - Everything else goes monthly.
 */
export const AUTO_AGGREGATE_THRESHOLDS = {
  daily: 65,
  weekly: 260,
  monthly: Infinity,
} as const;

/**
 * Context for number formatting, controlling precision and display rules.
 *
 * - `compact`: Intl compact notation (2.78T, 45.2M) -- for market cap, volume, revenue
 * - `price`: Always 2 decimal places -- for stock prices
 * - `eps`: Always 2 decimal places -- for earnings per share, per-share metrics
 * - `percent`: 2dp with sign prefix and % suffix -- for change percentages, yields
 * - `greeks`: Always 4 decimal places -- for options delta, gamma, theta, vega
 * - `currency_pair`: Always 4 decimal places -- for forex pairs
 */
export type NumberContext =
  | 'compact'
  | 'price'
  | 'eps'
  | 'percent'
  | 'greeks'
  | 'currency_pair';

/**
 * Default number of strikes above/below ATM in options summary view.
 * Set to 3 (7 total strikes) to keep 3-expiration summaries under 3,000 chars.
 */
export const DEFAULT_STRIKE_RANGE = 3;

/** Default maximum expirations shown in options summary view. */
export const DEFAULT_MAX_EXPIRATIONS = 3;

/**
 * Default fields projected onto each screener quote in JSON format.
 * Covers identification, price action, volume, fundamentals, and classification.
 * Keeps ~20 fields per quote (~2K chars) vs ~86 raw fields (~5K chars).
 */
export const DEFAULT_SCREENER_FIELDS: readonly string[] = [
  // Identification
  'symbol', 'shortName', 'longName', 'quoteType', 'exchange',
  // Price action
  'regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent',
  'regularMarketOpen', 'regularMarketDayHigh', 'regularMarketDayLow',
  'regularMarketPreviousClose', 'regularMarketVolume',
  // Valuation
  'marketCap', 'trailingPE', 'forwardPE', 'priceToBook',
  // Fundamentals
  'trailingAnnualDividendYield', 'epsTrailingTwelveMonths',
  // Range context
  'fiftyTwoWeekHigh', 'fiftyTwoWeekLow',
  'fiftyDayAverage', 'twoHundredDayAverage',
  // Classification
  'sector', 'industry',
] as const;

/** Hard cap for JSON screener responses (higher than text -- structured data is denser). */
export const SCREENER_JSON_HARD_CAP = 40_000;
