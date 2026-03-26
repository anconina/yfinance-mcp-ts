/**
 * yfinance MCP Server
 *
 * This module provides a Model Context Protocol (MCP) server
 * that exposes Yahoo Finance data to AI agents.
 *
 * Usage:
 *   npx yfinance-mcp
 *
 * Or in Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "yfinance": {
 *         "command": "npx",
 *         "args": ["yfinance-mcp"]
 *       }
 *     }
 *   }
 */

export { startServer } from './server.js';
export { tickerTools } from './tools/ticker.js';
export { screenerTools } from './tools/screener.js';
export { researchTools } from './tools/research.js';
export { miscTools } from './tools/misc.js';
