/**
 * SessionManager - Handles HTTP session initialization, browser impersonation,
 * consent page handling, and crumb (CSRF token) retrieval for Yahoo Finance API.
 *
 * Includes automatic retry with exponential backoff for handling rate limits
 * and transient network errors.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar, Cookie } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { getRandomBrowser, getBrowserHeadersAsRecord, BrowserHeaders } from '../config/browsers';
import { SessionOptions, RetryConfig } from '../types';
import { AuthCookie, HeadlessAuth } from '../auth/HeadlessAuth';
import {
  retry,
  RetryOptions,
  isRetryableError,
  isRateLimitError,
  isInvalidCrumbError,
  getRetryAfterMs,
} from '../utils/helpers';
import { ProxyManager, ProxyConfig } from './ProxyManager';

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
  private client: AxiosInstance;
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

  constructor(options: SessionOptions = {}) {
    this.cookieJar = new CookieJar();
    const [impersonate, headers] = getRandomBrowser();
    this.impersonate = impersonate;
    this.headers = headers;
    this.username = options.username;
    this.password = options.password;

    // Merge retry configuration with defaults
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...options.retry,
    };

    // Initialize proxy manager if proxy rotation is configured
    if (options.proxyRotation?.proxyList) {
      this.proxyManager = new ProxyManager({
        maxFailures: options.proxyRotation.maxFailures,
        cooldownMs: options.proxyRotation.cooldownMs,
      });
      this.proxyManager.addProxiesFromString(options.proxyRotation.proxyList);
      console.log(`ProxyManager initialized with ${this.proxyManager.size()} proxies`);
    }

    // Create axios instance with cookie jar support
    this.client = wrapper(
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
    (this.client.defaults as unknown as { jar: CookieJar }).jar = this.cookieJar;
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
   * Setup session by visiting Yahoo Finance and handling consent page if needed
   */
  private async setupSession(url: string = DEFAULT_SESSION_URL): Promise<void> {
    try {
      const response = await this.client.get(url, {
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      // Check if redirected to consent page
      const finalUrl = response.request?.res?.responseUrl || response.config?.url || '';
      if (finalUrl.includes('consent')) {
        await this.handleConsentPage(response.data, url);
      }
    } catch (error) {
      // Log warning but don't fail - consent might not be required
      console.warn('Session setup warning:', (error as Error).message);
    }
  }

  /**
   * Handle Yahoo consent page by extracting CSRF token and submitting consent
   */
  private async handleConsentPage(html: string, originalUrl: string): Promise<void> {
    try {
      const $ = cheerio.load(html);

      // Extract CSRF token and session ID from the consent form
      const csrfToken = $('input[name="csrfToken"]').val() as string;
      const sessionId = $('input[name="sessionId"]').val() as string;

      if (!csrfToken || !sessionId) {
        console.warn('Failed to extract consent page tokens');
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

      await this.client.post(CONSENT_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...getBrowserHeadersAsRecord(this.headers),
        },
        maxRedirects: 5,
      });
    } catch (error) {
      console.warn('Consent handling warning:', (error as Error).message);
    }
  }

  /**
   * Retrieve crumb token from Yahoo Finance
   * The crumb is a CSRF protection token required for API requests
   */
  private async getCrumb(): Promise<string | null> {
    try {
      const response = await this.client.get(CRUMB_URL, {
        headers: getBrowserHeadersAsRecord(this.headers),
      });

      const crumb = response.data;

      // Validate crumb
      if (!crumb || crumb === '' || (typeof crumb === 'string' && crumb.includes('<html>'))) {
        console.warn('Failed to obtain valid crumb');
        return null;
      }

      return crumb;
    } catch (error) {
      console.warn('Crumb retrieval warning:', (error as Error).message);
      return null;
    }
  }

  /**
   * Get the current crumb value
   */
  getCrumbValue(): string | null {
    return this.crumb;
  }

  /**
   * Get the underlying axios client
   */
  getClient(): AxiosInstance {
    return this.client;
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
    const params = {
      ...config?.params,
      ...(this.crumb && { crumb: this.crumb }),
    };

    // Get next proxy if proxy rotation is enabled
    const proxy = this.proxyManager?.getNext();
    const proxyConfig = proxy
      ? {
          httpsAgent: this.proxyManager!.getProxyAgent(proxy),
          proxy: false as const, // Disable axios's built-in proxy to use agent
        }
      : {};

    try {
      const response = await this.client.get<T>(url, {
        ...config,
        ...proxyConfig,
        params,
        headers: {
          ...getBrowserHeadersAsRecord(this.headers),
          ...config?.headers,
        },
      });

      // Report success to proxy manager
      if (proxy) {
        this.proxyManager!.reportSuccess(proxy);
      }

      return response.data;
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
    const params = {
      ...config?.params,
      ...(this.crumb && { crumb: this.crumb }),
    };

    // Get next proxy if proxy rotation is enabled
    const proxy = this.proxyManager?.getNext();
    const proxyConfig = proxy
      ? {
          httpsAgent: this.proxyManager!.getProxyAgent(proxy),
          proxy: false as const, // Disable axios's built-in proxy to use agent
        }
      : {};

    try {
      const response = await this.client.post<T>(url, data, {
        ...config,
        ...proxyConfig,
        params,
        headers: {
          ...getBrowserHeadersAsRecord(this.headers),
          ...config?.headers,
        },
      });

      // Report success to proxy manager
      if (proxy) {
        this.proxyManager!.reportSuccess(proxy);
      }

      return response.data;
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
      await new Promise((resolve) => setTimeout(resolve, 500));
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
   */
  private isProxyError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const axiosError = error as {
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

    if (axiosError.code && connectionErrors.includes(axiosError.code)) {
      return true;
    }

    // Proxy authentication failure
    if (axiosError.response?.status === 407) {
      return true;
    }

    // Check for proxy-related error messages
    const message = axiosError.message?.toLowerCase() || '';
    if (
      message.includes('proxy') ||
      message.includes('tunnel') ||
      message.includes('socket hang up')
    ) {
      return true;
    }

    return false;
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
}

/**
 * Create and initialize a session manager
 */
export async function createSession(options?: SessionOptions): Promise<SessionManager> {
  const session = new SessionManager(options);
  await session.initialize();
  return session;
}
