/**
 * MCP Tools for Research data (Earnings, IPOs, Splits)
 */

import { z } from 'zod';
import { Research } from '../../core/Research';
import { getMcpSessionOptions } from '../config';
import { formatEarningsCalendarResponse, formatIPOsResponse, formatSplitsResponse, FormatType } from '../formatters';

// Schema definitions
export const getEarningsCalendarSchema = z.object({
  start: z.string().optional().describe('Start date in YYYY-MM-DD format (default: today)'),
  end: z.string().optional().describe('End date in YYYY-MM-DD format (default: 7 days from start)'),
  max_results: z.number().optional().describe('Maximum results to return (default: 25)'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getIPOsSchema = z.object({
  start: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  end: z.string().optional().describe('End date in YYYY-MM-DD format'),
  max_results: z.number().optional().describe('Maximum results to return (default: 25)'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

export const getSplitsSchema = z.object({
  start: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  end: z.string().optional().describe('End date in YYYY-MM-DD format'),
  max_results: z.number().optional().describe('Maximum results to return (default: 25)'),
  format: z.enum(['text', 'json']).optional().describe('Output format (default: text)'),
});

// Helper to get default date range
function getDefaultDateRange(startOffset = 0, endOffset = 7): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + startOffset);
  const end = new Date(now);
  end.setDate(end.getDate() + endOffset);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// Tool implementations
export async function getEarningsCalendar(args: z.infer<typeof getEarningsCalendarSchema>): Promise<string> {
  try {
    const research = new Research(getMcpSessionOptions());
    const defaults = getDefaultDateRange(0, 7);
    const data = await research.getEarnings(args.start || defaults.start, args.end || defaults.end);
    return formatEarningsCalendarResponse(data, {
      format: (args.format as FormatType) || 'text',
      max_results: args.max_results,
    });
  } catch (error) {
    throw new Error(`Failed to get earnings calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getIPOs(args: z.infer<typeof getIPOsSchema>): Promise<string> {
  try {
    const research = new Research(getMcpSessionOptions());
    const defaults = getDefaultDateRange(-30, 30);
    const data = await research.getIPOs(args.start || defaults.start, args.end || defaults.end);
    return formatIPOsResponse(data, {
      format: (args.format as FormatType) || 'text',
      max_results: args.max_results,
    });
  } catch (error) {
    throw new Error(`Failed to get IPOs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSplits(args: z.infer<typeof getSplitsSchema>): Promise<string> {
  try {
    const research = new Research(getMcpSessionOptions());
    const defaults = getDefaultDateRange(-30, 30);
    const data = await research.getSplits(args.start || defaults.start, args.end || defaults.end);
    return formatSplitsResponse(data, {
      format: (args.format as FormatType) || 'text',
      max_results: args.max_results,
    });
  } catch (error) {
    throw new Error(`Failed to get splits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Tool definitions for MCP
export const researchTools = [
  {
    name: 'get_earnings_calendar',
    description: 'Returns upcoming earnings announcements with EPS estimates as a table. Use for tracking reporting dates across the market. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        start: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format (default: today)',
        },
        end: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format (default: 7 days from start)',
        },
        max_results: {
          type: 'number',
          description: 'Maximum results to return (default: 25)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: [] as string[],
    },
    handler: getEarningsCalendar,
    schema: getEarningsCalendarSchema,
  },
  {
    name: 'get_ipos',
    description: 'Returns upcoming and recent IPO listings with pricing and deal details. Use for tracking new market listings. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        start: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        end: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
        max_results: {
          type: 'number',
          description: 'Maximum results to return (default: 25)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: [] as string[],
    },
    handler: getIPOs,
    schema: getIPOsSchema,
  },
  {
    name: 'get_splits',
    description: 'Returns upcoming and recent stock splits with ratios. Use for tracking share split events. Text default; set format=json for structured data.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        start: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        end: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
        max_results: {
          type: 'number',
          description: 'Maximum results to return (default: 25)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
      required: [] as string[],
    },
    handler: getSplits,
    schema: getSplitsSchema,
  },
];
