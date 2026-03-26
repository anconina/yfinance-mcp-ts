/**
 * ImpitClient - Impit-based HTTP client wrapper for yfinance-mcp-ts.
 *
 * Provides an axios-compatible interface using the impit library for
 * sophisticated browser impersonation with TLS fingerprinting bypass.
 */

import { Impit, ImpitResponse } from 'impit';
import { CookieJar } from 'tough-cookie';
import { URL } from 'url';
import {
  YFinanceImpitOptions,
  ImpitRequestConfig,
  ImpitPostConfig,
  ImpitAxiosLikeResponse,
} from '../types/impit';
import {
  ImpitBrowserConfig,
  getRandomImpitBrowserConfig,
} from '../config/browsers';

/**
 * ImpitClient - HTTP client using impit for browser impersonation.
 *
 * This class wraps the impit library to provide an interface compatible
 * with the existing axios-based SessionManager, enabling seamless switching
 * between HTTP clients.
 *
 * Features:
 * - TLS fingerprinting bypass (Chrome/Firefox impersonation)
 * - Cookie jar persistence (tough-cookie compatible)
 * - Proxy support (HTTP, HTTPS, SOCKS4, SOCKS5)
 * - Automatic header management
 * - Response parsing (JSON, text)
 *
 * @example
 * ```typescript
 * const client = new ImpitClient({ browser: 'chrome', timeout: 30000 });
 * const response = await client.get('https://finance.yahoo.com/quote/AAPL');
 * console.log(response.data);
 * ```
 */
export class ImpitClient {
  private client: Impit;
  private cookieJar: CookieJar;
  private browserConfig: ImpitBrowserConfig;
  private defaultTimeout: number;
  private proxyUrl?: string;
  private options: YFinanceImpitOptions;

  /**
   * Create a new ImpitClient instance.
   *
   * @param options - Configuration options for the client
   */
  constructor(options: YFinanceImpitOptions = {}) {
    this.options = options;
    this.cookieJar = options.cookieJar || new CookieJar();
    this.browserConfig = getRandomImpitBrowserConfig();
    this.defaultTimeout = options.timeout || 30000;
    this.proxyUrl = options.proxyUrl;

    // Initialize impit with browser impersonation
    this.client = this.createImpitInstance();
  }

  /**
   * Create a new impit instance with current configuration.
   */
  private createImpitInstance(): Impit {
    return new Impit({
      browser: this.browserConfig.browser,
      cookieJar: this.cookieJar,
      timeout: this.defaultTimeout,
      ignoreTlsErrors: this.options.ignoreTlsErrors || false,
      http3: this.options.http3 || false,
      followRedirects: this.options.followRedirects !== false,
      maxRedirects: this.options.maxRedirects || 10,
      headers: {
        ...this.browserConfig.headers,
        ...this.options.headers,
      },
      proxyUrl: this.proxyUrl,
      vanillaFallback: this.options.vanillaFallback || false,
      localAddress: this.options.localAddress,
    });
  }

  /**
   * Build URL with query parameters.
   *
   * @param baseUrl - The base URL
   * @param params - Query parameters to append
   * @returns The full URL with query parameters
   */
  private buildUrl(
    baseUrl: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    if (!params || Object.keys(params).length === 0) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return url.toString();
  }

  /**
   * Convert Headers object to plain record.
   */
  private headersToRecord(headers: Headers): Record<string, string> {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key.toLowerCase()] = value;
    });
    return record;
  }

  /**
   * Convert impit response to axios-like response format.
   *
   * @param response - The impit response object
   * @returns An axios-compatible response object
   */
  private async toAxiosLikeResponse<T>(
    response: ImpitResponse
  ): Promise<ImpitAxiosLikeResponse<T>> {
    const headers = this.headersToRecord(response.headers);
    const contentType = headers['content-type'] || '';

    let data: T;

    // Parse response body based on content type
    if (contentType.includes('application/json')) {
      try {
        data = (await response.json()) as T;
      } catch {
        // If JSON parsing fails, return as text
        data = (await response.text()) as unknown as T;
      }
    } else {
      data = (await response.text()) as unknown as T;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
      url: response.url,
      ok: response.ok,
    };
  }

  /**
   * Merge custom headers with browser defaults.
   *
   * @param customHeaders - Custom headers to merge
   * @returns Merged headers object
   */
  private mergeHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      ...this.browserConfig.headers,
      ...customHeaders,
    };
  }

  /**
   * Make a GET request.
   *
   * @param url - The URL to request
   * @param config - Optional request configuration
   * @returns Promise resolving to the response data
   *
   * @example
   * ```typescript
   * const response = await client.get('https://api.example.com/data', {
   *   params: { symbol: 'AAPL' },
   *   timeout: 5000,
   * });
   * ```
   */
  async get<T = unknown>(
    url: string,
    config?: ImpitRequestConfig
  ): Promise<ImpitAxiosLikeResponse<T>> {
    const fullUrl = this.buildUrl(url, config?.params);
    const headers = this.mergeHeaders(config?.headers);

    const response = await this.client.fetch(fullUrl, {
      method: 'GET',
      headers,
      timeout: config?.timeout || this.defaultTimeout,
      signal: config?.signal,
    });

    return this.toAxiosLikeResponse<T>(response);
  }

  /**
   * Make a POST request.
   *
   * @param url - The URL to request
   * @param data - Request body data
   * @param config - Optional request configuration
   * @returns Promise resolving to the response data
   *
   * @example
   * ```typescript
   * const response = await client.post('https://api.example.com/data', {
   *   symbol: 'AAPL',
   * });
   * ```
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: ImpitPostConfig
  ): Promise<ImpitAxiosLikeResponse<T>> {
    const fullUrl = this.buildUrl(url, config?.params);
    const headers = this.mergeHeaders(config?.headers);

    // Determine content type and serialize body
    let body: string | undefined;
    if (data !== undefined && data !== null) {
      if (typeof data === 'string') {
        body = data;
      } else if (data instanceof URLSearchParams) {
        body = data.toString();
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      } else {
        body = JSON.stringify(data);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    const response = await this.client.fetch(fullUrl, {
      method: 'POST',
      headers,
      body,
      timeout: config?.timeout || this.defaultTimeout,
      signal: config?.signal,
    });

    return this.toAxiosLikeResponse<T>(response);
  }

  /**
   * Make a raw fetch request (for advanced use cases).
   *
   * @param url - The URL to request
   * @param init - Fetch-compatible request init
   * @returns The raw impit response
   */
  async fetch(url: string, init?: Parameters<Impit['fetch']>[1]): Promise<ImpitResponse> {
    return this.client.fetch(url, init);
  }

  /**
   * Get the cookie jar for external access.
   *
   * @returns The tough-cookie CookieJar instance
   */
  getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  /**
   * Get the current browser configuration.
   *
   * @returns The current ImpitBrowserConfig
   */
  getBrowserConfig(): ImpitBrowserConfig {
    return this.browserConfig;
  }

  /**
   * Rotate to a new random browser configuration.
   *
   * This recreates the impit instance with a new browser fingerprint,
   * while preserving the cookie jar and other settings.
   */
  rotateBrowser(): void {
    this.browserConfig = getRandomImpitBrowserConfig();
    this.client = this.createImpitInstance();
  }

  /**
   * Update the proxy URL.
   *
   * This recreates the impit instance with the new proxy setting,
   * while preserving the cookie jar and browser configuration.
   *
   * @param proxyUrl - The new proxy URL, or undefined to disable proxy
   */
  setProxy(proxyUrl: string | undefined): void {
    this.proxyUrl = proxyUrl;
    this.client = this.createImpitInstance();
  }

  /**
   * Get the current proxy URL.
   *
   * @returns The current proxy URL, or undefined if not set
   */
  getProxy(): string | undefined {
    return this.proxyUrl;
  }

  /**
   * Get the default timeout value.
   *
   * @returns The default timeout in milliseconds
   */
  getTimeout(): number {
    return this.defaultTimeout;
  }

  /**
   * Update the default timeout.
   *
   * @param timeout - The new timeout in milliseconds
   */
  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
    this.client = this.createImpitInstance();
  }

  /**
   * Check if HTTP/3 is enabled.
   *
   * @returns True if HTTP/3 is enabled
   */
  isHttp3Enabled(): boolean {
    return this.options.http3 || false;
  }

  /**
   * Get information about the current impersonation.
   *
   * @returns Object containing browser and platform information
   */
  getImpersonation(): { browser: string; platform: string; headers: Record<string, string> } {
    return {
      browser: this.browserConfig.browser,
      platform: this.browserConfig.platform,
      headers: { ...this.browserConfig.headers },
    };
  }
}

/**
 * Create a new ImpitClient instance.
 *
 * Factory function for creating ImpitClient instances.
 *
 * @param options - Configuration options
 * @returns A new ImpitClient instance
 *
 * @example
 * ```typescript
 * const client = createImpitClient({ browser: 'chrome' });
 * ```
 */
export function createImpitClient(options?: YFinanceImpitOptions): ImpitClient {
  return new ImpitClient(options);
}
