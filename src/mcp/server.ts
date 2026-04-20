#!/usr/bin/env node
/**
 * yfinance MCP Server
 *
 * Exposes Yahoo Finance data through the Model Context Protocol (MCP)
 * for use by AI agents like Claude.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { tickerTools } from './tools/ticker.js';
import { screenerTools } from './tools/screener.js';
import { researchTools } from './tools/research.js';
import { miscTools } from './tools/misc.js';

/**
 * Transport-level size cap for tool results.
 *
 * MCP clients (e.g. Claude) truncate results at ~50K chars by appending a
 * plaintext marker AFTER the JSON payload, which corrupts the JSON and makes
 * offloaded result files unparseable.  We cap at 40K to stay well under the
 * transport limit with margin for MCP framing overhead.
 */
const TRANSPORT_CAP = 40_000;

/**
 * Final size guard applied to every tool result before it goes over the wire.
 *
 * For JSON payloads (starts with { or [), truncates at the array-element or
 * object-entry boundary nearest to the cap, then closes the structure and
 * appends a _truncated indicator — producing valid JSON.
 *
 * For text payloads, truncates at the last newline before the cap.
 */
function transportGuard(result: string): string {
  if (result.length <= TRANSPORT_CAP) return result;

  const first = result[0];

  // JSON payload: trim to last complete element boundary for valid JSON
  if (first === '{' || first === '[') {
    // Find the last comma before the cap — that's an element boundary
    const slice = result.slice(0, TRANSPORT_CAP);
    let cutoff = slice.lastIndexOf('},');
    if (cutoff === -1) cutoff = slice.lastIndexOf('],');
    if (cutoff === -1) cutoff = slice.lastIndexOf('",');

    if (cutoff > TRANSPORT_CAP * 0.5) {
      // Keep through the closing brace/bracket/quote, drop the comma
      const kept = result.slice(0, cutoff + 1);
      // Close any open structures
      const opens = (kept.match(/{/g) || []).length - (kept.match(/}/g) || []).length;
      const openBrackets = (kept.match(/\[/g) || []).length - (kept.match(/]/g) || []).length;
      const closers = '}'.repeat(Math.max(0, opens - 1))
        + ']'.repeat(Math.max(0, openBrackets))
        + ',"_truncated":true}';
      return kept + closers;
    }
  }

  // Text fallback: truncate at last newline
  const slice = result.slice(0, TRANSPORT_CAP);
  const lastNl = slice.lastIndexOf('\n');
  const cutoff = lastNl > TRANSPORT_CAP * 0.7 ? lastNl : TRANSPORT_CAP;
  return result.slice(0, cutoff) + `\n\n[...truncated from ${result.length} to ${cutoff} chars — narrow your query]`;
}

// Combine all tools
const allTools = [...tickerTools, ...screenerTools, ...researchTools, ...miscTools];

// Create tool lookup map for efficient handler access
const toolHandlers = new Map<string, (args: unknown) => Promise<string>>();
const toolSchemas = new Map<string, { parse: (args: unknown) => unknown }>();

for (const tool of allTools) {
  toolHandlers.set(tool.name, tool.handler as (args: unknown) => Promise<string>);
  toolSchemas.set(tool.name, tool.schema);
}

// Initialize the MCP server
const server = new Server(
  {
    name: 'yfinance',
    version: '1.0.6',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handler for executing tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers.get(name);
  const schema = toolSchemas.get(name);

  if (!handler || !schema) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}. Use list_tools to see available tools.`,
        },
      ],
    };
  }

  try {
    // Validate arguments against schema
    const validatedArgs = schema.parse(args || {});

    // Execute the tool and apply transport-level size guard
    const result = transportGuard(await handler(validatedArgs));

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
    };
  }
});

// Start the server
export async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('yfinance MCP Server running on stdio');
  console.error(`Available tools: ${allTools.length}`);
}

// Run if executed directly
startServer().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
