/**
 * MCP Tools for Miscellaneous functions (Search, Market Summary, Trending)
 */

import { z } from 'zod';
import { search, getMarketSummary, getTrending, getCurrencies, getValidCountries } from '../../misc/functions';
import { getMcpSessionOptions } from '../config';

// Schema definitions
export const searchStocksSchema = z.object({
  query: z.string().describe('Search query (company name or symbol)'),
  limit: z.number().optional().describe('Maximum number of results (default: 10)'),
});

export const getMarketSummarySchema = z.object({
  country: z.string().optional().describe('Country for market summary (default: united states)'),
});

export const getTrendingSchema = z.object({
  country: z.string().optional().describe('Country for trending stocks (default: united states)'),
  count: z.number().optional().describe('Number of trending symbols to return (default: 20)'),
});

export const getCurrenciesSchema = z.object({});

export const getCountriesSchema = z.object({});

// Tool implementations
export async function searchStocks(args: z.infer<typeof searchStocksSchema>): Promise<string> {
  try {
    const results = await search(args.query, {
      quotesCount: args.limit || 10,
      sessionOptions: getMcpSessionOptions(),
    });
    return JSON.stringify(results, null, 2);
  } catch (error) {
    throw new Error(`Failed to search stocks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function marketSummary(args: z.infer<typeof getMarketSummarySchema>): Promise<string> {
  try {
    const data = await getMarketSummary(args.country || 'united states', getMcpSessionOptions());
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get market summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function trending(args: z.infer<typeof getTrendingSchema>): Promise<string> {
  try {
    const data = await getTrending(args.country || 'united states', getMcpSessionOptions());
    // Limit results if count is specified
    if (data && args.count && Array.isArray(data.quotes)) {
      data.quotes = data.quotes.slice(0, args.count);
    }
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get trending stocks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function currencies(): Promise<string> {
  try {
    const data = await getCurrencies(getMcpSessionOptions());
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get currencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function countries(): Promise<string> {
  try {
    const data = getValidCountries();
    return JSON.stringify({
      count: data.length,
      countries: data,
    }, null, 2);
  } catch (error) {
    throw new Error(`Failed to get countries: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Tool definitions for MCP
export const miscTools = [
  {
    name: 'search_stocks',
    description: 'Search for stocks by company name or symbol',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query (company name or symbol)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
        },
      },
      required: ['query'],
    },
    handler: searchStocks,
    schema: searchStocksSchema,
  },
  {
    name: 'get_market_summary',
    description: 'Get market summary with major indices (S&P 500, Dow Jones, NASDAQ, etc.)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: {
          type: 'string',
          description: 'Country for market summary (default: united states)',
        },
      },
      required: [] as string[],
    },
    handler: marketSummary,
    schema: getMarketSummarySchema,
  },
  {
    name: 'get_trending',
    description: 'Get currently trending/most watched stocks',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: {
          type: 'string',
          description: 'Country for trending stocks (default: united states)',
        },
        count: {
          type: 'number',
          description: 'Number of trending symbols to return (default: 20)',
        },
      },
      required: [] as string[],
    },
    handler: trending,
    schema: getTrendingSchema,
  },
  {
    name: 'get_currencies',
    description: 'Get list of available currency pairs and exchange rates',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
    handler: currencies,
    schema: getCurrenciesSchema,
  },
  {
    name: 'get_supported_countries',
    description: 'Get list of supported countries for market data',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
    handler: countries,
    schema: getCountriesSchema,
  },
];
