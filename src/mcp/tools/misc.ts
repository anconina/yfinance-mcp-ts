/**
 * MCP Tools for Miscellaneous functions (Search, Market Summary, Trending)
 */

import { z } from 'zod';
import { search, getMarketSummary, getTrending, getCurrencies, getValidCountries } from '../../misc/functions';
import { isValidCountry } from '../../config/countries';
import { getMcpSessionOptions } from '../config';
import { formatMarketSummaryResponse, formatCurrenciesResponse, FormatType, guardSize, DEFAULT_QUOTE_FIELDS } from '../formatters';

// Schema definitions
export const searchStocksSchema = z.object({
  query: z.string().describe('Search query (company name or symbol)'),
  limit: z.number().optional().describe('Maximum number of results (default: 10)'),
});

export const getMarketSummarySchema = z.object({
  country: z.string().optional().describe('Country for market summary (default: united states)'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getTrendingSchema = z.object({
  country: z.string().optional().describe('Country for trending stocks (default: united states)'),
  count: z.number().optional().describe('Number of trending symbols to return (default: 20)'),
});

export const getCurrenciesSchema = z.object({
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
  max_results: z.number().optional().describe('Maximum currency pairs to return'),
});

export const getCountriesSchema = z.object({});

// Tool implementations
export async function searchStocks(args: z.infer<typeof searchStocksSchema>): Promise<string> {
  try {
    const results = await search(args.query, {
      quotesCount: args.limit || 10,
      sessionOptions: getMcpSessionOptions(),
    });
    const fieldSet = new Set<string>(DEFAULT_QUOTE_FIELDS);
    const projected = results && typeof results === 'object' && Array.isArray((results as Record<string, unknown>).quotes)
      ? { ...results as Record<string, unknown>, quotes: ((results as Record<string, unknown>).quotes as Record<string, unknown>[]).map((q: Record<string, unknown>) => {
          const p: Record<string, unknown> = {};
          for (const f of fieldSet) { if (f in q) p[f] = q[f]; }
          return p;
        })}
      : results;
    return guardSize(JSON.stringify(projected));
  } catch (error) {
    throw new Error(`Failed to search stocks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function marketSummary(args: z.infer<typeof getMarketSummarySchema>): Promise<string> {
  try {
    const country = args.country || 'united states';
    if (!isValidCountry(country)) {
      throw new Error(`Invalid country: "${country}". Valid countries: ${getValidCountries().join(', ')}`);
    }
    const data = await getMarketSummary(country, getMcpSessionOptions());
    return formatMarketSummaryResponse(data, {
      format: (args.format as FormatType) || 'text',
    });
  } catch (error) {
    throw new Error(`Failed to get market summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function trending(args: z.infer<typeof getTrendingSchema>): Promise<string> {
  try {
    const country = args.country || 'united states';
    if (!isValidCountry(country)) {
      throw new Error(`Invalid country: "${country}". Valid countries: ${getValidCountries().join(', ')}`);
    }
    const data = await getTrending(country, getMcpSessionOptions());
    // Limit results if count is specified
    if (args.count && Array.isArray(data.quotes)) {
      data.quotes = data.quotes.slice(0, args.count);
    }
    // Project quote fields to curated set
    const fieldSet = new Set<string>(DEFAULT_QUOTE_FIELDS);
    const output: Record<string, unknown> = { ...data };
    if (Array.isArray(data.quotes)) {
      output.quotes = data.quotes.map((q: Record<string, unknown>) => {
        const p: Record<string, unknown> = {};
        for (const f of fieldSet) { if (f in q) p[f] = q[f]; }
        return p;
      });
    }
    return guardSize(JSON.stringify(output));
  } catch (error) {
    throw new Error(`Failed to get trending stocks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function currencies(args: z.infer<typeof getCurrenciesSchema> = {}): Promise<string> {
  try {
    const data = await getCurrencies(getMcpSessionOptions());
    return formatCurrenciesResponse(data, {
      format: (args.format as FormatType) || 'text',
      max_results: args.max_results,
    });
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
    description: 'Searches for stocks by company name or symbol. Use to find ticker symbols before calling other tools. Returns JSON.',
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
    description: 'Returns major market indices with price, change, and percent change. Use for broad market overview. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: {
          type: 'string',
          enum: ['france', 'india', 'hong kong', 'germany', 'canada', 'spain', 'italy', 'united states', 'australia', 'united kingdom', 'brazil', 'new zealand', 'singapore', 'taiwan'],
          description: 'Country for market summary (default: united states)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: [] as string[],
    },
    handler: marketSummary,
    schema: getMarketSummarySchema,
  },
  {
    name: 'get_trending',
    description: 'Returns currently trending/most watched stock symbols. Use to find popular stocks before deeper analysis. Returns JSON.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: {
          type: 'string',
          enum: ['france', 'india', 'hong kong', 'germany', 'canada', 'spain', 'italy', 'united states', 'australia', 'united kingdom', 'brazil', 'new zealand', 'singapore', 'taiwan'],
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
    description: 'Returns available currency pairs as a compact table. Use to find forex pair symbols. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
        max_results: {
          type: 'number',
          description: 'Maximum currency pairs to return',
        },
      },
      required: [] as string[],
    },
    handler: currencies,
    schema: getCurrenciesSchema,
  },
  {
    name: 'get_supported_countries',
    description: 'Returns list of supported countries for market data and screeners. Use to find valid country codes for other tools. Returns JSON.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
    handler: countries,
    schema: getCountriesSchema,
  },
];
