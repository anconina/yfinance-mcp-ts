/**
 * Type exports
 */

export * from './api-responses';

// Common types used throughout the library

export interface QueryParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface RequestOptions {
  method?: 'get' | 'post';
  params?: QueryParams;
  data?: unknown;
  headers?: Record<string, string>;
}

export interface SessionOptions {
  timeout?: number;
  maxWorkers?: number;
  asynchronous?: boolean;
  verify?: boolean;
  proxies?: Record<string, string>;
  username?: string;
  password?: string;
}

export interface BaseFinanceOptions extends SessionOptions {
  country?: string;
  formatted?: boolean;
  progress?: boolean;
  username?: string;
  password?: string;
}

export interface TickerOptions extends BaseFinanceOptions {
  validate?: boolean;
}

export interface HistoryOptions {
  period?: string;
  interval?: string;
  start?: string | Date;
  end?: string | Date;
  adjTimezone?: boolean;
  adjOhlc?: boolean;
}

export interface HistoryParams {
  period?: string | null;
  interval?: string;
  start?: string | Date;
  end?: string | Date;
  adjTimezone?: boolean;
  adjOhlc?: boolean;
}

export interface FinancialStatementOptions {
  frequency?: 'a' | 'q' | 'm';
  trailing?: boolean;
}

// Data types returned from API
export type HistoryData = Record<string, unknown>;
export type FinancialsData = Record<string, unknown>;
export type OptionChainData = Record<string, unknown>;
