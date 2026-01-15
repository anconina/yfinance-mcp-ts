/**
 * SessionManager - Handles HTTP session initialization, browser impersonation,
 * consent page handling, and crumb (CSRF token) retrieval for Yahoo Finance API.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar, Cookie } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { getRandomBrowser, getBrowserHeadersAsRecord, BrowserHeaders } from '../config/browsers';
import { SessionOptions } from '../types';
import { AuthCookie, HeadlessAuth } from '../auth/HeadlessAuth';

// Constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_SESSION_URL = 'https://finance.yahoo.com';
const CRUMB_URL = 'https://query2.finance.yahoo.com/v1/test/getcrumb';
const CONSENT_URL = 'https://consent.yahoo.com/v2/collectConsent';

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

  constructor(options: SessionOptions = {}) {
    this.cookieJar = new CookieJar();
    const [impersonate, headers] = getRandomBrowser();
    this.impersonate = impersonate;
    this.headers = headers;
    this.username = options.username;
    this.password = options.password;

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
   * Make a GET request with automatic crumb injection
   */
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    const params = {
      ...config?.params,
      ...(this.crumb && { crumb: this.crumb }),
    };

    const response = await this.client.get<T>(url, {
      ...config,
      params,
      headers: {
        ...getBrowserHeadersAsRecord(this.headers),
        ...config?.headers,
      },
    });

    return response.data;
  }

  /**
   * Make a POST request with automatic crumb injection
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    const params = {
      ...config?.params,
      ...(this.crumb && { crumb: this.crumb }),
    };

    const response = await this.client.post<T>(url, data, {
      ...config,
      params,
      headers: {
        ...getBrowserHeadersAsRecord(this.headers),
        ...config?.headers,
      },
    });

    return response.data;
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
}

/**
 * Create and initialize a session manager
 */
export async function createSession(options?: SessionOptions): Promise<SessionManager> {
  const session = new SessionManager(options);
  await session.initialize();
  return session;
}
