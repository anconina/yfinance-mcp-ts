/**
 * MCP Tools for Stock Screeners
 */

import { z } from 'zod';
import { Screener } from '../../core/Screener';
import { getMcpSessionOptions } from '../config';

// Schema definitions
export const listScreenersSchema = z.object({});

export const getScreenerSchema = z.object({
  screener: z.string().describe('Screener name (e.g., "day_gainers", "day_losers", "most_actives", "undervalued_growth_stocks")'),
  count: z.number().optional().describe('Number of results to return (default: 25)'),
});

export const getScreenerInfoSchema = z.object({
  screener: z.string().describe('Screener name to get information about'),
});

// Tool implementations
export async function listScreeners(): Promise<string> {
  try {
    const screener = new Screener(getMcpSessionOptions());
    const available = screener.availableScreeners;

    // Group screeners by category for better readability
    const categories: Record<string, string[]> = {
      'Market Movers': ['day_gainers', 'day_losers', 'most_actives', 'most_shorted_stocks'],
      'Value': ['undervalued_growth_stocks', 'undervalued_large_caps', 'growth_technology_stocks'],
      'Dividends': ['high_yield_bond', 'portfolio_anchors'],
      'Sectors': [],
    };

    return JSON.stringify({
      total: available.length,
      popular: ['day_gainers', 'day_losers', 'most_actives', 'undervalued_growth_stocks', 'aggressive_small_caps'],
      all: available,
    }, null, 2);
  } catch (error) {
    throw new Error(`Failed to list screeners: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getScreener(args: z.infer<typeof getScreenerSchema>): Promise<string> {
  try {
    const screener = new Screener(getMcpSessionOptions());
    const data = await screener.getScreeners(args.screener, args.count || 25);
    return JSON.stringify(data, null, 2);
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
    description: 'List all available stock screeners (day gainers, losers, most active, etc.)',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
    handler: listScreeners,
    schema: listScreenersSchema,
  },
  {
    name: 'get_screener',
    description: 'Run a stock screener to find stocks matching specific criteria',
    inputSchema: {
      type: 'object' as const,
      properties: {
        screener: {
          type: 'string',
          description: 'Screener name (e.g., "day_gainers", "day_losers", "most_actives", "undervalued_growth_stocks")',
        },
        count: {
          type: 'number',
          description: 'Number of results to return (default: 25)',
        },
      },
      required: ['screener'],
    },
    handler: getScreener,
    schema: getScreenerSchema,
  },
  {
    name: 'get_screener_info',
    description: 'Get detailed information about a specific screener',
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
