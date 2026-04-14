/**
 * MCP Tools for Stock Screeners
 */

import { z } from 'zod';
import { Screener } from '../../core/Screener';
import { getMcpSessionOptions } from '../config';
import { formatListScreenersResponse, formatScreenerResponse, FormatType } from '../formatters';

// Schema definitions
export const listScreenersSchema = z.object({
  category: z.string().optional().describe('Filter by category (e.g., "Market Movers", "Value", "Growth", "ETFs", "Sectors")'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getScreenerSchema = z.object({
  screener: z.string().describe('Screener name (e.g., "day_gainers", "day_losers", "most_actives", "undervalued_growth_stocks")'),
  count: z.number().optional().describe('Number of results to return (default: 10)'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
  fields: z.array(z.string()).optional().describe('Field names to include per quote in JSON output (default: ~24 common fields). Ignored for text format.'),
});

export const getScreenerInfoSchema = z.object({
  screener: z.string().describe('Screener name to get information about'),
});

// Tool implementations
export async function listScreeners(args: z.infer<typeof listScreenersSchema> = {}): Promise<string> {
  try {
    const screener = new Screener(getMcpSessionOptions());
    const available = screener.availableScreeners;

    return formatListScreenersResponse(available, {
      category: args.category,
      format: (args.format as FormatType) || 'text',
    });
  } catch (error) {
    throw new Error(`Failed to list screeners: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getScreener(args: z.infer<typeof getScreenerSchema>): Promise<string> {
  try {
    const screener = new Screener(getMcpSessionOptions());
    const data = await screener.getScreeners(args.screener, args.count || 10);
    return formatScreenerResponse(data, {
      format: (args.format as FormatType) || 'text',
      fields: args.fields,
    });
  } catch (error) {
    throw new Error(`Failed to get screener data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getScreenerInfo(args: z.infer<typeof getScreenerInfoSchema>): Promise<string> {
  try {
    const screener = new Screener(getMcpSessionOptions());
    const info = screener.getScreenerInfo(args.screener);

    if (!info) {
      return JSON.stringify({
        error: `Screener "${args.screener}" not found`,
        available: screener.availableScreeners.slice(0, 20),
        hint: 'Use list_screeners to see all available screeners',
      }, null, 2);
    }

    return JSON.stringify(info, null, 2);
  } catch (error) {
    throw new Error(`Failed to get screener info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Tool definitions for MCP
export const screenerTools = [
  {
    name: 'list_screeners',
    description: 'Lists available stock screeners organized by category. Use to discover screener names before calling get_screener. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['Market Movers', 'Value', 'Growth', 'Analyst Picks', 'Dividends & Income', 'Strategies', 'Crypto', 'ETFs', 'Mutual Funds', 'Sectors'],
          description: 'Filter by category',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: [] as string[],
    },
    handler: listScreeners,
    schema: listScreenersSchema,
  },
  {
    name: 'get_screener',
    description: 'Runs a stock screener and returns top results as a compact table. Use list_screeners first to find screener names. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        screener: {
          type: 'string',
          description: 'Screener name (e.g., "day_gainers", "day_losers", "most_actives", "undervalued_growth_stocks")',
        },
        count: {
          type: 'number',
          description: 'Number of results to return (default: 10)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Field names to include per quote in JSON output (default: ~24 common fields including symbol, price, change, volume, marketCap, PE ratios, 52wk range, sector). Ignored for text format.',
        },
      },
      required: ['screener'],
    },
    handler: getScreener,
    schema: getScreenerSchema,
  },
  {
    name: 'get_screener_info',
    description: 'Returns detailed metadata about a specific screener including criteria. Use to understand what a screener filters before running it. Returns JSON.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        screener: {
          type: 'string',
          description: 'Screener name to get information about',
        },
      },
      required: ['screener'],
    },
    handler: getScreenerInfo,
    schema: getScreenerInfoSchema,
  },
];
