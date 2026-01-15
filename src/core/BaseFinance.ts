/**
 * BaseFinance - Base class for all Yahoo Finance API interactions.
 * Provides request orchestration, parameter construction, response validation,
 * data formatting, and symbol management.
 */

import { SessionManager } from './SessionManager';
import { CONFIG, EndpointConfig } from '../config/endpoints';
import { COUNTRIES, CountryConfig, getCountryConfig } from '../config/countries';
import { MODULES_DICT } from '../config/modules';
import {
  convertToList,
  flattenList,
  formatTimestamp,
  stringifyBooleans,
  chunkArray,
} from '../utils/helpers';
import { BaseFinanceOptions, QueryParams } from '../types';

// Maximum symbols per request chunk
const CHUNK_SIZE = 1500;

export abstract class BaseFinance {
  protected _symbols: string[] = [];
  protected _country: string;
  protected _countryParams: CountryConfig;
  protected formatted: boolean;
  protected progress: boolean;
  protected session: SessionManager;
  protected crumb: string | null = null;
  protected initialized = false;

  constructor(options: BaseFinanceOptions = {}) {
    this._country = (options.country ?? 'united states').toLowerCase();
    this._countryParams = getCountryConfig(this._country);
    this.formatted = options.formatted ?? false;
    this.progress = options.progress ?? false;
    this.session = new SessionManager(options);
  }

  /**
   * Initialize the base finance instance
   */
  protected async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.session.initialize();
    this.crumb = this.session.getCrumbValue();
    this.initialized = true;
  }

  // Symbol getter/setter
  get symbols(): string[] {
    return this._symbols;
  }

  set symbols(value: string | string[]) {
    this._symbols = convertToList(value);
  }

  // Country getter/setter
  get country(): string {
    return this._country;
  }

  set country(value: string) {
    const normalized = value.toLowerCase();
    this._countryParams = getCountryConfig(normalized); // throws if invalid
    this._country = normalized;
  }

  /**
   * Get default query parameters (country params + crumb)
   */
  protected get defaultQueryParams(): QueryParams {
    return {
      ...this._countryParams,
      ...(this.crumb && { crumb: this.crumb }),
    };
  }

  /**
   * Main data retrieval method
   */
  protected async getData<T = unknown>(
    key: string,
    params?: QueryParams,
    options: {
      addlKey?: string;
      listResult?: boolean;
      method?: 'get' | 'post';
      payload?: unknown;
      size?: number;
    } = {}
  ): Promise<Record<string, T>> {
    const config = CONFIG[key];
    if (!config) {
      throw new Error(`Unknown endpoint key: ${key}`);
    }

    const constructedParams = this.constructParams(config, params);
    const responseField = config.response_field;

    // Execute requests
    const data = await this.executeRequests<T>(
      config,
      constructedParams,
      responseField,
      options
    );

    return data;
  }

  /**
   * Construct query parameters from config and defaults
   */
  protected constructParams(
    config: EndpointConfig,
    params: QueryParams = {}
  ): QueryParams | QueryParams[] {
    const result: QueryParams = { ...params };

    // Add required params
    for (const [key, spec] of Object.entries(config.query)) {
      if (spec.required && !key.includes('symbol') && result[key] === undefined) {
        // Try to get value from instance properties or use default
        const instanceValue = (this as unknown as Record<string, unknown>)[key];
        const value = instanceValue ?? spec.default;
        if (value !== undefined && value !== null) {
          result[key] = value as string | number | boolean;
        }
      }
    }

    // Add optional params with defaults
    for (const [key, spec] of Object.entries(config.query)) {
      if (!spec.required && spec.default !== null && result[key] === undefined) {
        const instanceValue = (this as unknown as Record<string, unknown>)[key];
        const value = instanceValue ?? spec.default;
        if (value !== undefined && value !== null) {
          result[key] = value as string | number | boolean;
        }
      }
    }

    // Merge default query params
    Object.assign(result, this.defaultQueryParams);

    // Convert booleans to lowercase strings
    const stringified = stringifyBooleans(result);

    // Create per-symbol params if endpoint uses {symbol} in path
    if (config.path.includes('{symbol}') || 'symbol' in config.query) {
      return this._symbols.map((symbol) => ({ ...stringified, symbol }));
    }

    // If endpoint uses 'symbols' param (plural), join all symbols
    if ('symbols' in config.query) {
      return { ...stringified, symbols: this._symbols.join(',') };
    }

    return stringified;
  }

  /**
   * Execute requests based on params type
   */
  private async executeRequests<T>(
    config: EndpointConfig,
    params: QueryParams | QueryParams[],
    responseField: string,
    options: {
      addlKey?: string;
      listResult?: boolean;
      method?: 'get' | 'post';
      payload?: unknown;
    }
  ): Promise<Record<string, T>> {
    if (Array.isArray(params)) {
      // Multiple symbol requests - run concurrently
      return this.executeMultipleRequests<T>(config, params, responseField, options);
    }

    // Single request (screeners, search, etc.)
    return this.executeSingleRequest<T>(config, params, responseField, options);
  }

  /**
   * Execute multiple concurrent requests (one per symbol)
   */
  private async executeMultipleRequests<T>(
    config: EndpointConfig,
    paramsList: QueryParams[],
    responseField: string,
    options: {
      addlKey?: string;
      listResult?: boolean;
    }
  ): Promise<Record<string, T>> {
    const results: Record<string, T> = {};

    // Chunk the requests if there are many symbols
    const chunks = chunkArray(paramsList, CHUNK_SIZE);

    for (const chunk of chunks) {
      const promises = chunk.map(async (params) => {
        const symbol = params.symbol as string;
        const url = config.path.replace('{symbol}', symbol);

        try {
          const response = await this.session.get<unknown>(url, { params });
          const validated = this.validateResponse(response, responseField);
          const data = this.constructData<T>(validated, responseField, options);
          return { symbol, data, error: null };
        } catch (error) {
          return {
            symbol,
            data: null,
            error: (error as Error).message,
          };
        }
      });

      const responses = await Promise.all(promises);

      for (const { symbol, data, error } of responses) {
        if (error) {
          results[symbol] = error as unknown as T;
        } else if (data !== null) {
          // Data is already Record<string, T>, extract the value for this symbol
          results[symbol] = data as unknown as T;
        }
      }
    }

    return results;
  }

  /**
   * Execute a single request
   */
  private async executeSingleRequest<T>(
    config: EndpointConfig,
    params: QueryParams,
    responseField: string,
    options: {
      addlKey?: string;
      listResult?: boolean;
      method?: 'get' | 'post';
      payload?: unknown;
    }
  ): Promise<Record<string, T>> {
    const url = config.path;

    const response =
      options.method === 'post'
        ? await this.session.post<unknown>(url, options.payload, { params })
        : await this.session.get<unknown>(url, { params });

    const validated = this.validateResponse(response, responseField);
    return this.constructData<T>(validated, responseField, options);
  }

  /**
   * Validate API response and check for errors
   */
  protected validateResponse(response: unknown, responseField: string): unknown {
    const resp = response as Record<string, unknown>;

    // Check for standard error format
    try {
      const field = resp[responseField] as Record<string, unknown>;
      if (field?.error) {
        const error = field.error as Record<string, string>;
        return error.description ?? 'Unknown error';
      }
      if (!field?.result && field?.result !== null) {
        return 'No data found';
      }
      return resp;
    } catch {
      // Check for finance error format
      if ('finance' in resp) {
        const finance = resp.finance as Record<string, unknown>;
        if (finance?.error) {
          const error = finance.error as Record<string, string>;
          return error.description;
        }
        return resp;
      }
      // Wrap response if no standard format
      return { [responseField]: { result: [resp] } };
    }
  }

  /**
   * Construct data from validated response
   */
  private constructData<T>(
    json: unknown,
    responseField: string,
    options: { addlKey?: string; listResult?: boolean }
  ): Record<string, T> {
    // If it's a string (error message), return as-is
    if (typeof json === 'string') {
      return { error: json } as unknown as Record<string, T>;
    }

    try {
      const resp = json as Record<string, Record<string, unknown[]>>;
      const result = resp[responseField]?.result;

      if (!result) {
        return json as Record<string, T>;
      }

      // Extract additional key from result
      if (options.addlKey) {
        return (result[0] as Record<string, T>)[options.addlKey] as unknown as Record<string, T>;
      }

      // Return full list
      if (options.listResult) {
        return result as unknown as Record<string, T>;
      }

      // Return first result
      return result[0] as Record<string, T>;
    } catch {
      return json as Record<string, T>;
    }
  }

  /**
   * Format data by converting timestamps and extracting raw values
   */
  protected formatData(
    obj: Record<string, unknown>,
    dates: string[]
  ): Record<string, unknown> {
    for (const [key, value] of Object.entries(obj)) {
      if (dates.includes(key)) {
        // Handle date formatting
        if (typeof value === 'object' && value !== null && 'fmt' in value) {
          obj[key] = (value as Record<string, unknown>).fmt ?? value;
        } else if (Array.isArray(value)) {
          obj[key] = value.map((item) =>
            typeof item === 'object' && item !== null && 'fmt' in item
              ? (item as Record<string, unknown>).fmt
              : typeof item === 'number'
                ? formatTimestamp(item)
                : item
          );
        } else if (typeof value === 'number') {
          obj[key] = formatTimestamp(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects
        if ('raw' in value) {
          // Extract raw value
          obj[key] = (value as Record<string, unknown>).raw;
        } else if (!Array.isArray(value)) {
          // Recursively format nested objects
          obj[key] = this.formatData(value as Record<string, unknown>, dates);
        } else if (value.length > 0 && typeof value[0] === 'object') {
          // Format array of objects
          obj[key] = value.map((item) =>
            this.formatData(item as Record<string, unknown>, dates)
          );
        }
      }
    }
    return obj;
  }

  /**
   * Get date fields for a module
   */
  protected getModuleDates(modules: string[]): string[] {
    return flattenList(
      modules.map((m) => MODULES_DICT[m]?.convert_dates ?? [])
    );
  }

  /**
   * Validate symbols against Yahoo Finance
   */
  async validateSymbols(): Promise<{ valid: string[]; invalid: string[] }> {
    const data = await this.getData<Record<string, boolean>>('validation');
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const [symbol, result] of Object.entries(data)) {
      if (typeof result === 'object' && result !== null) {
        // Check if validation passed
        const isValid = (result as Record<string, unknown>).valid !== false;
        (isValid ? valid : invalid).push(symbol);
      } else if (result === true) {
        valid.push(symbol);
      } else {
        invalid.push(symbol);
      }
    }

    return { valid, invalid };
  }
}
