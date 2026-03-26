/**
 * SessionManager - Handles HTTP session initialization, browser impersonation,
 * consent page handling, and crumb (CSRF token) retrieval for Yahoo Finance API.
 *
 * Supports two HTTP client backends:
 * - impit (default): Browser impersonation with TLS fingerprinting bypass
 * - axios: Traditional HTTP client (fallback)
 *
 * Includes automatic retry with exponential backoff for handling rate limits
 * and transient network errors.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar, Cookie } from 'tough-cookie';
import * as cheerio from 'cheerio';
import {
  getRandomBrowser,
  getBrowserHeadersAsRecord,
  BrowserHeaders,
  ImpitBrowserConfig,
} from '../config/browsers';
import { SessionOptions, RetryConfig, HttpClientType } from '../types';
import { AuthCookie, HeadlessAuth } from '../auth/HeadlessAuth';
import {
  retry,
  RetryOptions,
  isRetryableError,
  isRateLimitError,
  isInvalidCrumbError,
  isImpitError,
  getRetryAfterMs,
} from '../utils/helpers';
import { RequestThrottler } from '../utils/performance';
import { classifyImpitError, ImpitErrorType } from '../types/impit';
import { ProxyManager, ProxyConfig } from './ProxyManager';
import { ImpitClient } from './ImpitClient';

// Constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_SESSION_URL = 'https://finance.yahoo.com';
const CRUMB_URL = 'https://query2.finance.yahoo.com/v1/test/getcrumb';
const CONSENT_URL = 'https://consent.yahoo.com/v2/collectConsent';

// Default retry configuration
// P1 Recommendation: Increased parameters for better rate limit handling
const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'onRetry'>> = {
  enabled: true,
  maxRetries: 5,        // Increased from 3 for better resilience
  initialDelay: 2000,   // Increased from 1000ms to be more conservative
  maxDelay: 60000,      // Increased from 30000ms (1 minute max)
  factor: 2,
  jitter: true,
};

export class SessionManager {
  // HTTP clients (one will be used based on httpClientType)
  private axiosClient?: AxiosInstance;
  private impitClient?: ImpitClient;
  private httpClientType: HttpClientType;

  private cookieJar: CookieJar;
  private crumb: string | null = null;
  private headers: BrowserHeaders;
  private impersonate: string;
  private initialized = false;
  private isPremium = false;
  private username?: string;
  private password?: string;
  private retryConfig: Required<Omit<RetryConfig, 'onRetry'>> & { onRetry?: RetryConfig['onRetry'] };
  private crumbRefreshInProgress = false;
  private proxyManager?: ProxyManager;
  private requestThrottler: RequestThrottler;
  private options: SessionOptions;

  constructor(options: SessionOptions = {}) {
    this.options = options;
    this.cookieJar = new CookieJar();
    const [impersonate, headers] = getRandomBrowser();
    this.impersonate = impersonate;
    this.headers = headers;
    this.username = options.username;
    this.password = options.password;

    // Determine which HTTP client to use (default to impit)
    this.httpClientType = options.httpClient || 'impit';

    // Merge retry configuration with defaults
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...options.retry,
    };

    // Initialize request throttler for rate limit prevention
    // Default: 100ms delay between requests, configurable via requestDelay option
    const requestDelay = options.requestDelay ?? 100;
    this.requestThrottler = new RequestThrottler(requestDelay, true);

    // Initialize proxy manager if proxy rotation is configured
    if (options.proxyRotation?.proxyList) {
      this.proxyManager = new ProxyManager({
        maxFailures: options.proxyRotation.maxFailures,
        cooldownMs: options.proxyRotation.cooldownMs,
      });
      this.proxyManager.addProxiesFromString(options.proxyRotation.proxyList);
      console.log(`ProxyManager initialized with ${this.proxyManager.size()} proxies`);
    }

    // Initialize the appropriate HTTP client
    if (this.httpClientType === 'impit') {
      this.initializeImpitClient(options);
    } else {
      this.initializeAxiosClient(options);
    }
  }

  /**
   * Initialize the impit HTTP client
   */
  private initializeImpitClient(options: SessionOptions): void {
    // Get first proxy from manager if available
    const proxy = this.proxyManager?.getNext();
    const proxyUrl = proxy ? this.proxyManager!.getProxyUrl(proxy) : undefined;

    this.impitClient = new ImpitClient({
      cookieJar: this.cookieJar,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      http3: options.http3 || false,
      ignoreTlsErrors: options.ignoreTlsErrors || false,
      proxyUrl,
      headers: getBrowserHeadersAsRecord(this.headers),
    });

    console.log(`SessionManager using impit client (browser: ${this.impitClient.getBrowserConfig().browser})`);
  }

  /**
   * Initialize the axios HTTP client (legacy/fallback)
   * @deprecated axios is maintained for backwards compatibility. Consider using impit instead
   * for better rate limit handling via TLS fingerprinting.
   */
  private initializeAxiosClient(options: SessionOptions): void {
    // Log deprecation warning if axios is explicitly requested
    if (options.httpClient === 'axios') {
      console.warn(
        '[DEPRECATION] axios HTTP client is deprecated and may be removed in a future version. ' +
          'Consider using impit (default) for better rate limit handling. ' +
          'Set httpClient: "impit" or remove the httpClient option to use the recommended client.'
      );
    }

    // Create axios instance with cookie jar support
    this.axiosClient = wrapper(
      axios.create({
        timeout: options.timeout ?? DEFAULT_TIMEOUT,
        withCredentials: true,
        headers: getBrowserHeadersAsRecord(this.headers),
        // Allow self-signed certificates in development if needed
        ...(options.verify === false && {
          httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
        }),
      })
    );

    // Attach cookie jar
    (this.axiosClient.defaults as unknown as { jar: CookieJar }).jar = this.cookieJar;

    console.log(`SessionManager using axios client (browser: ${this.impersonate})`);
  }

  /**
   * Initialize the session by handling consent page and retrieving crumb
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Handle premium login if credentials provided
    if (this.username && this.password) {
      await this.loginPremium();
    }

    await this.setupSession();
    this.crumb = await this.getCrumb();
    this.initialized = true;
  }

  /**
   * Login to Yahoo Finance Premium using headless browser
   */
  private async loginPremium(): Promise<boolean> {
    if (!this.username || !this.password) {
      return false;
    }

    try {
      const auth = new HeadlessAuth(this.username, this.password);
      const result = await auth.login();

      if (result.success && result.cookies.length > 0) {
        await this.setCookies(result.cookies);
        this.isPremium = true;
        return true;
      }

      console.warn('Premium login failed:', result.error);
      return false;
    } catch (error) {
      console.warn('Premium login error:', (error as Error).message);
      return false;
    }
  }

  /**
   * Set cookies from authentication
   */
  async setCookies(cookies: AuthCookie[]): Promise<void> {
    for (const cookie of cookies) {
      const cookieStr = `${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}`;
      const url = `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`;

      try {
        await this.cookieJar.setCookie(cookieStr, url);
      } catch (error) {
        // Ignore cookie setting errors
      }
    }
  }

  /**
   * Check if premium features are available
   */
  hasPremium(): boolean {
    return this.isPremium;
  }

  /**
   * Setup session by visiting Yahoo Finance and handling consent page if needed.
   *
   * Note: The consent page handling is best-effort. Even if it fails, the session
   * typically still works because cookies are set during the initial request that
   * allow API access. The consent form submission is primarily for GDPR compliance
   * in the EU, but Yahoo's API endpoints work regardless of consent status.
   */
  private async setupSession(url: string = DEFAULT_SESSION_URL): Promise<void> {
    try {
      if (this.httpClientType === 'impit' && this.impitClient) {
        // Use impit client - visit the page to establish cookies
        const response = await this.impitClient.get<string>(url);
        const finalUrl = response.url || url;

        // Check if redirected to consent page
        if (finalUrl.includes('consent') || finalUrl.includes('guce')) {
          // Consent handling is best-effort - don't block on failures
          // The API typically works even without explicit consent submission
          try {
            await this.handleConsentPage(response.data, url);
          } catch (consentError) {
            // Silently ignore consent errors - they don't block API functionality
          }
        }
      } else if (this.axiosClient) {
        // Use axios client
        const response = await this.axiosClient.get(url, {
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        });

        // Check if redirected to consent page
        const finalUrl = response.request?.res?.responseUrl || response.config?.url || '';
        if (finalUrl.includes('consent') || finalUrl.includes('guce')) {
          try {
            await this.handleConsentPage(response.data, url);
          } catch (consentError) {
            // Silently ignore consent errors
          }
        }
      }
    } catch (error) {
      // Log warning but don't fail - session setup is best-effort
      // The crumb retrieval that follows will still work in most cases
      console.warn('Session setup warning:', (error as Error).message);
    }
  }

  /**
   * Handle Yahoo consent page by extracting CSRF token and submitting consent.
   *
   * This is best-effort - the Yahoo Finance API works regardless of consent status.
   * Consent submission primarily affects the web UI experience, not API access.
   */
  private async handleConsentPage(html: string, originalUrl: string): Promise<void> {
    // Don't log warnings for consent failures - they're expected and non-blocking
    const $ = cheerio.load(html);

    // Extract CSRF token and session ID from the consent form
    const csrfToken = $('input[name="csrfToken"]').val() as string;
    const sessionId = $('input[name="sessionId"]').val() as string;

    if (!csrfToken || !sessionId) {
      // Tokens not found - this is fine, consent not required for API access
      return;
    }

    // Submit consent form
    const formData = new URLSearchParams({
      agree: 'agree',
      consentUUID: 'default',
      sessionId,
      csrfToken,
      originalDoneUrl: originalUrl,
      namespace: 'yahoo',
    });

    // Use appropriate headers for form submission
    const consentHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://consent.yahoo.com',
      'Referer': 'https://consent.yahoo.com/',
      ...getBrowserHeadersAsRecord(this.headers),
    };

    if (this.httpClientType === 'impit' && this.impitClient) {
      await this.impitClient.post(CONSENT_URL, formData.toString(), {
        headers: consentHeaders,
      });
    } else if (this.axiosClient) {
      await this.axiosClient.post(CONSENT_URL, formData.toString(), {
        headers: consentHeaders,
        maxRedirects: 5,
      });
    }
  }

  /**
   * Retrieve crumb token from Yahoo Finance.
   * The crumb is a CSRF protection token required for API requests.
   *
   * Includes retry logic for transient failures.
   */
  private async getCrumb(): Promise<string | null> {
    const maxAttempts = 3;
    const retryDelay = 1000; // 1 second between attempts

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let crumb: string;

        if (this.httpClientType === 'impit' && this.impitClient) {
          const response = await this.impitClient.get<string>(CRUMB_URL, {
            headers: getBrowserHeadersAsRecord(this.headers),
          });
          crumb = response.data;
        } else if (this.axiosClient) {
          const response = await this.axiosClient.get(CRUMB_URL, {
            headers: getBrowserHeadersAsRecord(this.headers),
          });
          crumb = response.data;
        } else {
          console.warn('No HTTP client available');
          return null;
        }

        // Validate crumb - should be a short alphanumeric string
        if (this.isValidCrumb(crumb)) {
          return crumb;
        }

        // Invalid crumb - retry if we have attempts left
        if (attempt < maxAttempts) {
          await this.sleep(retryDelay);
        }
      } catch (error) {
        // On error, retry if we have attempts left
        if (attempt < maxAttempts) {
          await this.sleep(retryDelay);
        } else {
          console.warn('Crumb retrieval failed after', maxAttempts, 'attempts:', (error as Error).message);
        }
      }
    }

    return null;
  }

  /**
   * Validate a crumb token.
   */
  private isValidCrumb(crumb: unknown): crumb is string {
    if (typeof crumb !== 'string') return false;
    if (!crumb || crumb.trim() === '') return false;
    if (crumb.includes('<html>') || crumb.includes('<!DOCTYPE')) return false;
    if (crumb.length > 50) return false; // Crumbs are typically short
    return true;
  }

  /**
   * Sleep for a specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the current crumb value
   */
  getCrumbValue(): string | null {
    return this.crumb;
  }

  /**
   * Get the underlying axios client (if using axios)
   * @deprecated Use getHttpClientType() to check which client is in use
   */
  getClient(): AxiosInstance | undefined {
    return this.axiosClient;
  }

  /**
   * Get the underlying impit client (if using impit)
   */
  getImpitClient(): ImpitClient | undefined {
    return this.impitClient;
  }

  /**
   * Get the HTTP client type being used
   */
  getHttpClientType(): HttpClientType {
    return this.httpClientType;
  }

  /**
   * Get browser impersonation info
   */
  getImpersonation(): { browser: string; headers: BrowserHeaders } {
    return { browser: this.impersonate, headers: this.headers };
  }

  /**
   * Check if session is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Make a GET request with automatic crumb injection and retry on failure
   *
   * Automatically retries on:
   * - Rate limit errors (HTTP 429)
   * - Server errors (HTTP 5xx)
   * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
   * - Invalid crumb errors (will refresh crumb and retry)
   */
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    // If retry is disabled, make direct request
    if (!this.retryConfig.enabled) {
      return this.executeGet<T>(url, config);
    }

    // Build retry options
    const retryOptions: RetryOptions = {
      maxRetries: this.retryConfig.maxRetries,
      initialDelay: this.retryConfig.initialDelay,
      maxDelay: this.retryConfig.maxDelay,
      factor: this.retryConfig.factor,
      jitter: this.retryConfig.jitter,
      isRetryable: (error) => this.isErrorRetryable(error),
      // P1 Recommendation: Use Retry-After header when available
      getDelayFromError: (error) => getRetryAfterMs(error),
      onRetry: async (error, attempt, delay) => {
        // Log retry attempt
        if (this.retryConfig.onRetry) {
          this.retryConfig.onRetry(error, attempt, delay);
        }

        // Handle invalid crumb - refresh before retry
        if (isInvalidCrumbError(error)) {
          await this.refreshCrumb();
        }

        // Handle impit-specific errors (proxy rotation, browser rotation, etc.)
        await this.handleImpitError(error);

        // Log rate limit for debugging with Retry-After info
        if (isRateLimitError(error)) {
          const retryAfter = getRetryAfterMs(error);
          const retryInfo = retryAfter ? ` (Retry-After: ${retryAfter}ms)` : '';
          console.warn(`Rate limited${retryInfo}. Retry ${attempt}/${this.retryConfig.maxRetries} in ${delay}ms...`);
        }
      },
    };

    return retry(() => this.executeGet<T>(url, config), retryOptions);
  }

  /**
   * Execute the actual GET request (internal method)
   * Uses proxy rotation if ProxyManager is configured
   */
  private async executeGet<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // Throttle requests to prevent rate limiting
    await this.requestThrottler.throttle();

    const params = {
      ...config?.params,
      ...(this.crumb && { crumb: this.crumb }),
    };

    // Get next proxy if proxy rotation is enabled
    const proxy = this.proxyManager?.getNext();

    try {
      let data: T;

      if (this.httpClientType === 'impit' && this.impitClient) {
        // Update proxy if using rotation
        const proxyUrl = proxy ? this.proxyManager!.getProxyUrl(proxy) : undefined;
        if (proxyUrl && this.impitClient.getProxy() !== proxyUrl) {
          this.impitClient.setProxy(proxyUrl);
        }

        const response = await this.impitClient.get<T>(url, {
          params,
          headers: {
            ...getBrowserHeadersAsRecord(this.headers),
            ...(config?.headers as Record<string, string>),
          },
          timeout: config?.timeout,
        });
        data = response.data;
      } else if (this.axiosClient) {
        const proxyConfig = proxy
          ? {
              httpsAgent: this.proxyManager!.getProxyAgent(proxy),
              proxy: false as const, // Disable axios's built-in proxy to use agent
            }
          : {};

        const response = await this.axiosClient.get<T>(url, {
          ...config,
          ...proxyConfig,
          params,
          headers: {
            ...getBrowserHeadersAsRecord(this.headers),
            ...config?.headers,
          },
        });
        data = response.data;
      } else {
        throw new Error('No HTTP client available');
      }

      // Report success to proxy manager
      if (proxy) {
        this.proxyManager!.reportSuccess(proxy);
      }

      return data;
    } catch (error) {
      // Report failure to proxy manager for proxy-related errors
      if (proxy && this.isProxyError(error)) {
        this.proxyManager!.reportFailure(proxy);
      }
      throw error;
    }
  }

  /**
   * Make a POST request with automatic crumb injection and retry on failure
   *
   * Automatically retries on:
   * - Rate limit errors (HTTP 429)
   * - Server errors (HTTP 5xx)
   * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
   * - Invalid crumb errors (will refresh crumb and retry)
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    // If retry is disabled, make direct request
    if (!this.retryConfig.enabled) {
      return this.executePost<T>(url, data, config);
    }

    // Build retry options
    const retryOptions: RetryOptions = {
      maxRetries: this.retryConfig.maxRetries,
      initialDelay: this.retryConfig.initialDelay,
      maxDelay: this.retryConfig.maxDelay,
      factor: this.retryConfig.factor,
      jitter: this.retryConfig.jitter,
      isRetryable: (error) => this.isErrorRetryable(error),
      // P1 Recommendation: Use Retry-After header when available
      getDelayFromError: (error) => getRetryAfterMs(error),
      onRetry: async (error, attempt, delay) => {
        // Log retry attempt
        if (this.retryConfig.onRetry) {
          this.retryConfig.onRetry(error, attempt, delay);
        }

        // Handle invalid crumb - refresh before retry
        if (isInvalidCrumbError(error)) {
          await this.refreshCrumb();
        }

        // Handle impit-specific errors (proxy rotation, browser rotation, etc.)
        await this.handleImpitError(error);

        // Log rate limit for debugging with Retry-After info
        if (isRateLimitError(error)) {
          const retryAfter = getRetryAfterMs(error);
          const retryInfo = retryAfter ? ` (Retry-After: ${retryAfter}ms)` : '';
          console.warn(`Rate limited${retryInfo}. Retry ${attempt}/${this.retryConfig.maxRetries} in ${delay}ms...`);
        }
      },
    };

    return retry(() => this.executePost<T>(url, data, config), retryOptions);
  }

  /**
   * Execute the actual POST request (internal method)
   * Uses proxy rotation if ProxyManager is configured
   */
  private async executePost<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    // Throttle requests to prevent rate limiting
    await this.requestThrottler.throttle();

    const params = {
      ...config?.params,
      ...(this.crumb && { crumb: this.crumb }),
    };

    // Get next proxy if proxy rotation is enabled
    const proxy = this.proxyManager?.getNext();

    try {
      let responseData: T;

      if (this.httpClientType === 'impit' && this.impitClient) {
        // Update proxy if using rotation
        const proxyUrl = proxy ? this.proxyManager!.getProxyUrl(proxy) : undefined;
        if (proxyUrl && this.impitClient.getProxy() !== proxyUrl) {
          this.impitClient.setProxy(proxyUrl);
        }

        const response = await this.impitClient.post<T>(url, data, {
          params,
          headers: {
            ...getBrowserHeadersAsRecord(this.headers),
            ...(config?.headers as Record<string, string>),
          },
          timeout: config?.timeout,
        });
        responseData = response.data;
      } else if (this.axiosClient) {
        const proxyConfig = proxy
          ? {
              httpsAgent: this.proxyManager!.getProxyAgent(proxy),
              proxy: false as const, // Disable axios's built-in proxy to use agent
            }
          : {};

        const response = await this.axiosClient.post<T>(url, data, {
          ...config,
          ...proxyConfig,
          params,
          headers: {
            ...getBrowserHeadersAsRecord(this.headers),
            ...config?.headers,
          },
        });
        responseData = response.data;
      } else {
        throw new Error('No HTTP client available');
      }

      // Report success to proxy manager
      if (proxy) {
        this.proxyManager!.reportSuccess(proxy);
      }

      return responseData;
    } catch (error) {
      // Report failure to proxy manager for proxy-related errors
      if (proxy && this.isProxyError(error)) {
        this.proxyManager!.reportFailure(proxy);
      }
      throw error;
    }
  }

  /**
   * Make multiple concurrent GET requests
   */
  async getAll<T = unknown>(
    requests: Array<{ url: string; config?: AxiosRequestConfig }>
  ): Promise<T[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const promises = requests.map(({ url, config }) =>
      this.get<T>(url, config)
    );

    return Promise.all(promises);
  }

  /**
   * Refresh the session (get new crumb)
   */
  async refresh(): Promise<void> {
    this.crumb = await this.getCrumb();
  }

  /**
   * Check if an error is retryable
   * Considers rate limits, network errors, server errors, and invalid crumb
   */
  private isErrorRetryable(error: unknown): boolean {
    // Always retry rate limit errors
    if (isRateLimitError(error)) {
      return true;
    }

    // Retry invalid crumb errors (will refresh crumb before retry)
    if (isInvalidCrumbError(error)) {
      return true;
    }

    // Use the general retryable error checker for other errors
    return isRetryableError(error);
  }

  /**
   * Refresh the crumb token (thread-safe)
   * Prevents multiple concurrent crumb refresh requests
   */
  private async refreshCrumb(): Promise<void> {
    // Prevent multiple concurrent refresh attempts
    if (this.crumbRefreshInProgress) {
      // Wait a bit and hope the other refresh completes
      await this.sleep(500);
      return;
    }

    this.crumbRefreshInProgress = true;
    try {
      console.warn('Refreshing crumb token...');
      this.crumb = await this.getCrumb();
      if (this.crumb) {
        console.warn('Crumb token refreshed successfully');
      }
    } finally {
      this.crumbRefreshInProgress = false;
    }
  }

  /**
   * Get the current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Update retry configuration at runtime
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = {
      ...this.retryConfig,
      ...config,
    };
  }

  /**
   * Check if an error is likely caused by a proxy issue
   * Handles both axios and impit errors
   */
  private isProxyError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const err = error as {
      code?: string;
      response?: { status?: number };
      message?: string;
    };

    // Connection errors often indicate proxy issues
    const connectionErrors = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EPIPE',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];

    if (err.code && connectionErrors.includes(err.code)) {
      return true;
    }

    // Proxy authentication failure
    if (err.response?.status === 407) {
      return true;
    }

    // Check for proxy-related error messages (works for both axios and impit)
    const message = err.message?.toLowerCase() || '';
    if (
      message.includes('proxy') ||
      message.includes('tunnel') ||
      message.includes('socket hang up') ||
      message.includes('socks')
    ) {
      return true;
    }

    // Check for impit-specific proxy errors
    if (isImpitError(error)) {
      // Impit proxy connection errors from reqwest/hyper
      if (
        message.includes('connect') &&
        (message.includes('refused') || message.includes('reset') || message.includes('timeout'))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handle proxy failure by rotating to next proxy.
   * Called automatically during retry when a proxy error is detected.
   *
   * @param error - The error that triggered the proxy failure
   */
  private async handleProxyFailure(error: unknown): Promise<void> {
    if (!this.proxyManager || this.proxyManager.size() === 0) {
      return;
    }

    // Get current proxy and report failure
    const currentProxy = this.proxyManager.getNext();
    if (currentProxy) {
      // Go back one step to get the actual failed proxy (getNext advances)
      // Actually, we need to track the current proxy separately
      // For now, just get a new proxy for the next attempt
    }

    // Get next available proxy
    const nextProxy = this.proxyManager.getNext();
    if (!nextProxy) {
      console.warn('No healthy proxies available for rotation');
      return;
    }

    const proxyUrl = this.proxyManager.getProxyUrl(nextProxy);
    console.warn(`Rotating proxy to: ${nextProxy.host}:${nextProxy.port}`);

    // Update the impit client with the new proxy
    if (this.httpClientType === 'impit' && this.impitClient) {
      this.impitClient.setProxy(proxyUrl);
    }
  }

  /**
   * Rotate browser fingerprint on rate limit.
   * This can help bypass rate limiting by appearing as a different browser.
   *
   * @param error - The rate limit error
   */
  private rotateBrowserOnRateLimit(error: unknown): void {
    if (this.httpClientType !== 'impit' || !this.impitClient) {
      return;
    }

    // Only rotate browser on rate limit errors
    if (!isRateLimitError(error)) {
      return;
    }

    const oldBrowser = this.impitClient.getBrowserConfig().browser;
    this.impitClient.rotateBrowser();
    const newBrowser = this.impitClient.getBrowserConfig().browser;

    console.warn(`Rotating browser fingerprint: ${oldBrowser} → ${newBrowser}`);
  }

  /**
   * Handle impit-specific errors with appropriate actions.
   * Routes errors to proper handlers based on error type.
   *
   * @param error - The error to handle
   */
  private async handleImpitError(error: unknown): Promise<void> {
    if (!isImpitError(error)) {
      return;
    }

    const errorType = classifyImpitError(error as Error);

    switch (errorType) {
      case ImpitErrorType.PROXY:
        await this.handleProxyFailure(error);
        break;

      case ImpitErrorType.RATE_LIMITED:
        this.rotateBrowserOnRateLimit(error);
        break;

      case ImpitErrorType.NETWORK:
        // For network errors with proxy enabled, try rotating proxy
        if (this.hasProxyRotation()) {
          await this.handleProxyFailure(error);
        }
        break;

      case ImpitErrorType.TLS:
        // TLS errors might indicate fingerprint detection, rotate browser
        if (this.httpClientType === 'impit' && this.impitClient) {
          this.impitClient.rotateBrowser();
          console.warn('TLS error detected, rotated browser fingerprint');
        }
        break;

      default:
        // No specific action for other error types
        break;
    }
  }

  /**
   * Get the proxy manager instance (if configured)
   */
  getProxyManager(): ProxyManager | undefined {
    return this.proxyManager;
  }

  /**
   * Get proxy statistics (if proxy rotation is enabled)
   */
  getProxyStats(): Array<{
    host: string;
    port: number;
    failures: number;
    successCount: number;
    isHealthy: boolean;
  }> | null {
    return this.proxyManager?.getStats() ?? null;
  }

  /**
   * Check if proxy rotation is enabled
   */
  hasProxyRotation(): boolean {
    return this.proxyManager !== undefined && this.proxyManager.size() > 0;
  }

  /**
   * Manually rotate browser fingerprint (impit only).
   * Useful for proactively avoiding detection or rate limiting.
   *
   * @returns The new browser configuration, or null if not using impit
   */
  rotateBrowser(): ImpitBrowserConfig | null {
    if (this.httpClientType !== 'impit' || !this.impitClient) {
      return null;
    }

    const oldBrowser = this.impitClient.getBrowserConfig();
    this.impitClient.rotateBrowser();
    const newBrowser = this.impitClient.getBrowserConfig();

    console.log(`Browser rotated: ${oldBrowser.browser}/${oldBrowser.platform} → ${newBrowser.browser}/${newBrowser.platform}`);
    return newBrowser;
  }

  /**
   * Get current proxy information (if proxy is configured).
   *
   * @returns Current proxy URL or null if not configured
   */
  getCurrentProxy(): string | null {
    if (this.httpClientType === 'impit' && this.impitClient) {
      return this.impitClient.getProxy() || null;
    }
    return null;
  }

  /**
   * Get current browser impersonation info (impit only).
   *
   * @returns Browser configuration or null if not using impit
   */
  getCurrentBrowser(): ImpitBrowserConfig | null {
    if (this.httpClientType !== 'impit' || !this.impitClient) {
      return null;
    }
    return this.impitClient.getBrowserConfig();
  }
}

/**
 * Create and initialize a session manager
 */
export async function createSession(options?: SessionOptions): Promise<SessionManager> {
  const session = new SessionManager(options);
  await session.initialize();
  return session;
}
