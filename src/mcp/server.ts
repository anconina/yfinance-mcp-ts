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
    version: '1.0.0',
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

    // Execute the tool
    const result = await handler(validatedArgs);

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
