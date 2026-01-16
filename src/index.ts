/**
 * yfinance-mcp-ts - TypeScript wrapper for unofficial Yahoo Finance API
 *
 * @packageDocumentation
 */

// Core classes
export { SessionManager, createSession } from './core/SessionManager';
export { BaseFinance } from './core/BaseFinance';
export { Ticker, createTicker } from './core/Ticker';
export { Screener, createScreener } from './core/Screener';
export { Research, createResearch } from './core/Research';
export { ProxyManager } from './core/ProxyManager';
export type { ProxyConfig, ProxyManagerOptions } from './core/ProxyManager';

// Authentication
export { HeadlessAuth, yahooLogin, hasPuppeteer } from './auth/HeadlessAuth';
export type { AuthCookie, HeadlessAuthResult } from './auth/HeadlessAuth';

// Misc functions
export {
  search,
  getCurrencies,
  getMarketSummary,
  getTrending,
  getValidCountries,
} from './misc/functions';

// Configuration
export * from './config';

// Types
export * from './types';

// Utilities
export * from './utils';
