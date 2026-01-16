/**
 * MCP Tools for Ticker/Stock data
 */

import { z } from 'zod';
import { Ticker } from '../../core/Ticker';
import { getMcpSessionOptions } from '../config';

// Schema definitions
export const getStockPriceSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated (e.g., "AAPL" or "AAPL MSFT GOOG")'),
});

export const getStockSummarySchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
});

export const getStockProfileSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
});

export const getStockHistorySchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
  period: z.string().optional().describe('Time period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max (default: 1y)'),
  interval: z.string().optional().describe('Data interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo (default: 1d)'),
  start: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  end: z.string().optional().describe('End date in YYYY-MM-DD format'),
});

export const getFinancialsSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
  type: z.enum(['income', 'balance', 'cashflow', 'all']).optional().describe('Financial statement type (default: all)'),
  frequency: z.enum(['annual', 'quarterly']).optional().describe('Data frequency (default: annual)'),
});

export const getOptionsSchema = z.object({
  symbol: z.string().describe('Stock symbol (single symbol only)'),
});

export const getKeyStatsSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
});

export const getRecommendationsSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
});

export const getEarningsSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
});

// Tool implementations
export async function getStockPrice(args: z.infer<typeof getStockPriceSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getPrice();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get stock price: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockSummary(args: z.infer<typeof getStockSummarySchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getSummaryDetail();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get stock summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockProfile(args: z.infer<typeof getStockProfileSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getAssetProfile();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get stock profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockHistory(args: z.infer<typeof getStockHistorySchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getHistory({
      period: args.period || '1y',
      interval: args.interval || '1d',
      start: args.start,
      end: args.end,
    });
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get stock history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getFinancials(args: z.infer<typeof getFinancialsSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    // Convert frequency to short form: 'a' for annual, 'q' for quarterly
    const freq = args.frequency === 'quarterly' ? 'q' : 'a';

    let data: Record<string, unknown> = {};

    switch (args.type) {
      case 'income':
        data = await ticker.getIncomeStatement(freq);
        break;
      case 'balance':
        data = await ticker.getBalanceSheet(freq);
        break;
      case 'cashflow':
        data = await ticker.getCashFlow(freq);
        break;
      case 'all':
      default:
        data = await ticker.getAllFinancialData(freq);
        break;
    }

    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get financials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getOptions(args: z.infer<typeof getOptionsSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbol, getMcpSessionOptions());
    const data = await ticker.getOptionChain();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get options: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getKeyStats(args: z.infer<typeof getKeyStatsSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getKeyStats();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get key stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getRecommendations(args: z.infer<typeof getRecommendationsSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getRecommendationTrend();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getEarnings(args: z.infer<typeof getEarningsSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getEarnings();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get earnings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Tool definitions for MCP
export const tickerTools = [
  {
    name: 'get_stock_price',
    description: 'Get current stock price, market cap, and price changes for one or more symbols',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated (e.g., "AAPL" or "AAPL MSFT GOOG")',
        },
      },
      required: ['symbols'],
    },
    handler: getStockPrice,
    schema: getStockPriceSchema,
  },
  {
    name: 'get_stock_summary',
    description: 'Get detailed summary including P/E ratio, volume, 52-week range, dividend yield, and more',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
      },
      required: ['symbols'],
    },
    handler: getStockSummary,
    schema: getStockSummarySchema,
  },
  {
    name: 'get_stock_profile',
    description: 'Get company profile including industry, sector, employees, description, and website',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
      },
      required: ['symbols'],
    },
    handler: getStockProfile,
    schema: getStockProfileSchema,
  },
  {
    name: 'get_stock_history',
    description: 'Get historical OHLCV (Open, High, Low, Close, Volume) price data',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
        period: {
          type: 'string',
          description: 'Time period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max (default: 1y)',
        },
        interval: {
          type: 'string',
          description: 'Data interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo (default: 1d)',
        },
        start: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        end: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
      },
      required: ['symbols'],
    },
    handler: getStockHistory,
    schema: getStockHistorySchema,
  },
  {
    name: 'get_financials',
    description: 'Get financial statements (income statement, balance sheet, cash flow)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
        type: {
          type: 'string',
          enum: ['income', 'balance', 'cashflow', 'all'],
          description: 'Financial statement type (default: all)',
        },
        frequency: {
          type: 'string',
          enum: ['annual', 'quarterly'],
          description: 'Data frequency (default: annual)',
        },
      },
      required: ['symbols'],
    },
    handler: getFinancials,
    schema: getFinancialsSchema,
  },
  {
    name: 'get_options',
    description: 'Get option chain data including calls and puts with strikes, premiums, and Greeks',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbol: {
          type: 'string',
          description: 'Stock symbol (single symbol only)',
        },
      },
      required: ['symbol'],
    },
    handler: getOptions,
    schema: getOptionsSchema,
  },
  {
    name: 'get_key_stats',
    description: 'Get key statistics including forward P/E, PEG ratio, beta, EPS, and shares outstanding',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
      },
      required: ['symbols'],
    },
    handler: getKeyStats,
    schema: getKeyStatsSchema,
  },
  {
    name: 'get_recommendations',
    description: 'Get analyst recommendations (strong buy, buy, hold, sell, strong sell)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
      },
      required: ['symbols'],
    },
    handler: getRecommendations,
    schema: getRecommendationsSchema,
  },
  {
    name: 'get_earnings',
    description: 'Get earnings data including EPS estimates and actuals',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
      },
      required: ['symbols'],
    },
    handler: getEarnings,
    schema: getEarningsSchema,
  },
];
