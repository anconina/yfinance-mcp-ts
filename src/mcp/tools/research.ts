/**
 * MCP Tools for Research data (Earnings, IPOs, Splits)
 */

import { z } from 'zod';
import { Research } from '../../core/Research';
import { getMcpSessionOptions } from '../config';

// Schema definitions
export const getEarningsCalendarSchema = z.object({
  start: z.string().optional().describe('Start date in YYYY-MM-DD format (default: today)'),
  end: z.string().optional().describe('End date in YYYY-MM-DD format (default: 7 days from start)'),
});

export const getIPOsSchema = z.object({
  start: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  end: z.string().optional().describe('End date in YYYY-MM-DD format'),
});

export const getSplitsSchema = z.object({
  start: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  end: z.string().optional().describe('End date in YYYY-MM-DD format'),
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
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get earnings calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getIPOs(args: z.infer<typeof getIPOsSchema>): Promise<string> {
  try {
    const research = new Research(getMcpSessionOptions());
    const defaults = getDefaultDateRange(-30, 30);
    const data = await research.getIPOs(args.start || defaults.start, args.end || defaults.end);
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get IPOs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSplits(args: z.infer<typeof getSplitsSchema>): Promise<string> {
  try {
    const research = new Research(getMcpSessionOptions());
    const defaults = getDefaultDateRange(-30, 30);
    const data = await research.getSplits(args.start || defaults.start, args.end || defaults.end);
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to get splits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Tool definitions for MCP
export const researchTools = [
  {
    name: 'get_earnings_calendar',
    description: 'Get upcoming earnings announcements calendar',
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
      },
      required: [] as string[],
    },
    handler: getEarningsCalendar,
    schema: getEarningsCalendarSchema,
  },
  {
    name: 'get_ipos',
    description: 'Get upcoming and recent IPO listings',
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
      },
      required: [] as string[],
    },
    handler: getIPOs,
    schema: getIPOsSchema,
  },
  {
    name: 'get_splits',
    description: 'Get upcoming and recent stock splits',
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
      },
      required: [] as string[],
    },
    handler: getSplits,
    schema: getSplitsSchema,
  },
];
