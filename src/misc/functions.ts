/**
 * Miscellaneous standalone functions for Yahoo Finance
 *
 * These functions don't require a class instance and can be called directly.
 */

import { SessionManager } from '../core/SessionManager';
import { COUNTRIES, getCountryConfig } from '../config/countries';

const BASE_URL = 'https://query2.finance.yahoo.com';

// Types
export interface SearchResult {
  quotes: SearchQuote[];
  news?: SearchNews[];
  count?: number;
}

export interface SearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  industry?: string;
  sector?: string;
  isYahooFinance?: boolean;
  [key: string]: unknown;
}

export interface SearchNews {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime?: number;
  type?: string;
  [key: string]: unknown;
}

export interface Currency {
  shortName: string;
  longName: string;
  symbol: string;
  localLongName?: string;
  [key: string]: unknown;
}

export interface MarketSummaryItem {
  fullExchangeName: string;
  symbol: string;
  regularMarketTime?: { raw: number; fmt: string };
  regularMarketPrice?: { raw: number; fmt: string };
  regularMarketChange?: { raw: number; fmt: string };
  regularMarketChangePercent?: { raw: number; fmt: string };
  shortName?: string;
  [key: string]: unknown;
}

export interface TrendingResult {
  count: number;
  quotes: TrendingQuote[];
  jobTimestamp: number;
  startInterval: number;
}

export interface TrendingQuote {
  symbol: string;
  [key: string]: unknown;
}

export interface SearchOptions {
  country?: string;
  quotesCount?: number;
  newsCount?: number;
  firstQuote?: boolean;
}

/**
 * Search Yahoo Finance for stocks, ETFs, mutual funds, etc.
 *
 * @param query - Search query string
 * @param options - Search options
 * @returns Search results or first quote if firstQuote is true
 */
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult | SearchQuote> {
  const {
    country = 'united states',
    quotesCount = 10,
    newsCount = 10,
    firstQuote = false,
  } = options;

  const session = new SessionManager();
  await session.initialize();

  const countryParams = getCountryConfig(country.toLowerCase());

  const response = await session.get<SearchResult>(
    `${BASE_URL}/v1/finance/search`,
    {
      params: {
        q: query,
        quotes_count: quotesCount,
        news_count: newsCount,
        ...countryParams,
      },
    }
  );

  if (firstQuote) {
    return response.quotes?.[0] ?? response;
  }

  return response;
}

/**
 * Get a list of available currencies
 *
 * @returns Array of currency objects
 */
export async function getCurrencies(): Promise<Currency[]> {
  const session = new SessionManager();
  await session.initialize();

  const response = await session.get<{ currencies: { result: Currency[] } }>(
    `${BASE_URL}/v1/finance/currencies`
  );

  return response.currencies?.result ?? [];
}

/**
 * Get a market summary for a specific region
 *
 * @param country - Country name (default: 'united states')
 * @returns Array of market summary items (major indices, etc.)
 */
export async function getMarketSummary(
  country = 'united states'
): Promise<MarketSummaryItem[]> {
  const session = new SessionManager();
  await session.initialize();

  const countryParams = getCountryConfig(country.toLowerCase());

  const response = await session.get<{ marketSummaryResponse: { result: MarketSummaryItem[] } }>(
    `${BASE_URL}/v6/finance/quote/marketSummary`,
    {
      params: countryParams,
    }
  );

  return response.marketSummaryResponse?.result ?? [];
}

/**
 * Get trending stocks for a specific region
 *
 * @param country - Country name (default: 'united states')
 * @returns Trending stocks result
 */
export async function getTrending(
  country = 'united states'
): Promise<TrendingResult | null> {
  const countryParams = getCountryConfig(country.toLowerCase());
  const region = countryParams.region;

  const session = new SessionManager();
  await session.initialize();

  const response = await session.get<{ finance: { result: TrendingResult[] } }>(
    `${BASE_URL}/v1/finance/trending/${region}`,
    {
      params: countryParams,
    }
  );

  return response.finance?.result?.[0] ?? null;
}

/**
 * Get list of valid countries
 *
 * @returns Array of valid country names
 */
export function getValidCountries(): string[] {
  return Object.keys(COUNTRIES);
}
