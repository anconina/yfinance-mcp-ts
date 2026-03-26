/**
 * MCP Tools for Ticker/Stock data
 */

import { z } from 'zod';
import { Ticker } from '../../core/Ticker';
import { getMcpSessionOptions } from '../config';
import { formatPriceResponse } from '../formatters/price';
import { formatHistoryResponse } from '../formatters/history';
import { formatOptionsResponse } from '../formatters/options';
import {
  formatFinancialsResponse,
  formatProfileResponse,
  formatSummaryResponse,
  formatKeyStatsResponse,
  formatRecommendationsResponse,
  formatEarningsResponse,
  FormatType,
} from '../formatters';

// Schema definitions
export const getStockPriceSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated (e.g., "AAPL" or "AAPL MSFT GOOG")'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getStockSummarySchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getStockProfileSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
  include_officers: z.boolean().optional().describe('Include company officers list (default: false)'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getStockHistorySchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
  period: z.string().optional().describe('Time period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max (default: 1y)'),
  interval: z.string().optional().describe('Data interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo (default: 1d)'),
  start: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  end: z.string().optional().describe('End date in YYYY-MM-DD format'),
  aggregate: z.enum(['daily', 'weekly', 'monthly', 'auto']).optional()
    .describe('Aggregation level (default: auto based on period)'),
  max_rows: z.number().optional()
    .describe('Max data rows to return (default: 52)'),
  include_stats: z.boolean().optional()
    .describe('Include return%, volatility, max drawdown stats header (default: true)'),
  format: z.enum(['text', 'json']).optional()
    .describe('Output format (default: text)'),
});

export const getFinancialsSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
  type: z.enum(['income', 'balance', 'cashflow', 'cash', 'all']).optional().describe('Financial statement type: income, balance, cashflow (or cash), all (default: all)'),
  frequency: z.enum(['annual', 'quarterly']).optional().describe('Data frequency (default: annual)'),
  detail: z.enum(['summary', 'full']).optional().describe('summary = key metrics only, full = all metrics (default: summary)'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getOptionsSchema = z.object({
  symbol: z.string().describe('Stock symbol (single symbol only)'),
  expiration: z.string().optional()
    .describe('Specific expiration date YYYY-MM-DD (default: nearest 3 shown)'),
  strike_range: z.number().optional()
    .describe('Number of strikes above/below ATM to show (default: 3)'),
  type: z.enum(['calls', 'puts', 'both']).optional()
    .describe('Option type filter (default: both)'),
  detail: z.enum(['summary', 'full']).optional()
    .describe('summary = nearest expirations + ATM area; full = all data (default: summary)'),
  format: z.enum(['text', 'json']).optional()
    .describe('Output format (default: text)'),
});

export const getKeyStatsSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getRecommendationsSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getEarningsSchema = z.object({
  symbols: z.string().describe('Stock symbol(s), space-separated'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

// Tool implementations
export async function getStockPrice(args: z.infer<typeof getStockPriceSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getPrice();
    return formatPriceResponse(data, { format: args.format });
  } catch (error) {
    throw new Error(`Failed to get stock price: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockSummary(args: z.infer<typeof getStockSummarySchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getSummaryDetail();
    return formatSummaryResponse(data, {
      format: (args.format as FormatType) || 'text',
    });
  } catch (error) {
    throw new Error(`Failed to get stock summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getStockProfile(args: z.infer<typeof getStockProfileSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getAssetProfile();
    return formatProfileResponse(data, {
      format: (args.format as FormatType) || 'text',
      include_officers: args.include_officers,
    });
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
    return formatHistoryResponse(data, {
      period: args.period || '1y',
      aggregate: args.aggregate,
      max_rows: args.max_rows,
      include_stats: args.include_stats,
      format: args.format,
    });
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

    return formatFinancialsResponse(data, {
      format: (args.format as FormatType) || 'text',
      detail: (args.detail as 'summary' | 'full') || 'summary',
      type: ((args.type === 'cash' ? 'cashflow' : args.type) as 'income' | 'balance' | 'cashflow' | 'all') || 'all',
      frequency: (args.frequency as 'annual' | 'quarterly') || 'annual',
    });
  } catch (error) {
    throw new Error(`Failed to get financials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getOptions(args: z.infer<typeof getOptionsSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbol, getMcpSessionOptions());
    const data = await ticker.getOptionChain();
    return formatOptionsResponse(data, {
      expiration: args.expiration,
      strike_range: args.strike_range,
      type: args.type,
      detail: args.detail,
      format: args.format,
    });
  } catch (error) {
    throw new Error(`Failed to get options: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getKeyStats(args: z.infer<typeof getKeyStatsSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getKeyStats();
    return formatKeyStatsResponse(data, {
      format: (args.format as FormatType) || 'text',
    });
  } catch (error) {
    throw new Error(`Failed to get key stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getRecommendations(args: z.infer<typeof getRecommendationsSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getRecommendationTrend();
    return formatRecommendationsResponse(data, {
      format: (args.format as FormatType) || 'text',
    });
  } catch (error) {
    throw new Error(`Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getEarnings(args: z.infer<typeof getEarningsSchema>): Promise<string> {
  try {
    const ticker = new Ticker(args.symbols, getMcpSessionOptions());
    const data = await ticker.getEarnings();
    return formatEarningsResponse(data, {
      format: (args.format as FormatType) || 'text',
    });
  } catch (error) {
    throw new Error(`Failed to get earnings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Tool definitions for MCP
export const tickerTools = [
  {
    name: 'get_stock_price',
    description: 'Returns current price, change, market cap, and volume. Use for quick price checks; use get_stock_summary for valuation metrics. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated (e.g., "AAPL" or "AAPL MSFT GOOG")',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: ['symbols'],
    },
    handler: getStockPrice,
    schema: getStockPriceSchema,
  },
  {
    name: 'get_stock_summary',
    description: 'Returns valuation and trading metrics (P/E, yield, ranges, volume, bid/ask). Use for fundamental screening; use get_key_stats for advanced ratios. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: ['symbols'],
    },
    handler: getStockSummary,
    schema: getStockSummarySchema,
  },
  {
    name: 'get_stock_profile',
    description: 'Returns company profile (sector, industry, summary, governance). Use for company overview; set include_officers=true for executives. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
        include_officers: {
          type: 'boolean',
          description: 'Include company officers list (default: false)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: ['symbols'],
    },
    handler: getStockProfile,
    schema: getStockProfileSchema,
  },
  {
    name: 'get_stock_history',
    description: 'Returns historical OHLCV data with auto-aggregation and stats. Use for price trends and technical analysis. Text default; set format=json for structured data.',
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
        aggregate: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'auto'],
          description: 'Aggregation level (default: auto based on period)',
        },
        max_rows: {
          type: 'number',
          description: 'Max data rows to return (default: 52)',
        },
        include_stats: {
          type: 'boolean',
          description: 'Include return%, volatility, max drawdown stats header (default: true)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: ['symbols'],
    },
    handler: getStockHistory,
    schema: getStockHistorySchema,
  },
  {
    name: 'get_financials',
    description: 'Returns financial statements with key metrics and YoY% changes. Default: summary mode (top metrics); use detail=full for all. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
        type: {
          type: 'string',
          enum: ['income', 'balance', 'cashflow', 'cash', 'all'],
          description: 'Financial statement type: income, balance, cashflow (or cash), all (default: all)',
        },
        frequency: {
          type: 'string',
          enum: ['annual', 'quarterly'],
          description: 'Data frequency (default: annual)',
        },
        detail: {
          type: 'string',
          enum: ['summary', 'full'],
          description: 'summary = key metrics only, full = all metrics (default: summary)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: ['symbols'],
    },
    handler: getFinancials,
    schema: getFinancialsSchema,
  },
  {
    name: 'get_options',
    description: 'Returns option chain with ATM-anchored strike window. Default: nearest 3 expirations summary; use expiration param for specific chain. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbol: {
          type: 'string',
          description: 'Stock symbol (single symbol only)',
        },
        expiration: {
          type: 'string',
          description: 'Specific expiration date YYYY-MM-DD (default: nearest 3 shown)',
        },
        strike_range: {
          type: 'number',
          description: 'Number of strikes above/below ATM (default: 3)',
        },
        type: {
          type: 'string',
          enum: ['calls', 'puts', 'both'],
          description: 'Option type filter (default: both)',
        },
        detail: {
          type: 'string',
          enum: ['summary', 'full'],
          description: 'summary or full detail (default: summary)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: ['symbol'],
    },
    handler: getOptions,
    schema: getOptionsSchema,
  },
  {
    name: 'get_key_stats',
    description: 'Returns advanced statistics (PEG, beta, EV ratios, margins, growth). Use for deep fundamental analysis beyond get_stock_summary. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: ['symbols'],
    },
    handler: getKeyStats,
    schema: getKeyStatsSchema,
  },
  {
    name: 'get_recommendations',
    description: 'Returns analyst consensus and 4-month recommendation trend. Use for sentiment analysis on a stock. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: ['symbols'],
    },
    handler: getRecommendations,
    schema: getRecommendationsSchema,
  },
  {
    name: 'get_earnings',
    description: 'Returns EPS history with surprise %, next estimate, and revenue trend. Use for earnings analysis and surprise tracking. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'string',
          description: 'Stock symbol(s), space-separated',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: ['symbols'],
    },
    handler: getEarnings,
    schema: getEarningsSchema,
  },
];
