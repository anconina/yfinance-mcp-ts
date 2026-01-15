/**
 * HeadlessAuth - Puppeteer-based authentication for Yahoo Finance Premium
 *
 * This module provides headless browser authentication for accessing
 * Yahoo Finance Premium features that require a subscription.
 *
 * Note: Requires puppeteer to be installed separately:
 * npm install puppeteer
 */

// Puppeteer types - dynamically imported
type Browser = import('puppeteer').Browser;
type Page = import('puppeteer').Page;
type Cookie = import('puppeteer').Cookie;

export interface AuthCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface HeadlessAuthResult {
  success: boolean;
  cookies: AuthCookie[];
  error?: string;
}

/**
 * Check if puppeteer is available
 */
export async function hasPuppeteer(): Promise<boolean> {
  try {
    await import('puppeteer');
    return true;
  } catch {
    return false;
  }
}

/**
 * HeadlessAuth class for Yahoo Finance Premium authentication
 */
export class HeadlessAuth {
  private static readonly LOGIN_URL = 'https://login.yahoo.com';
  private static readonly TIMEOUT = 15000;

  private browser: Browser | null = null;
  private cookies: AuthCookie[] = [];

  constructor(
    private readonly username: string,
    private readonly password: string
  ) {}

  /**
   * Perform login and retrieve authentication cookies
   */
  async login(): Promise<HeadlessAuthResult> {
    // Check if puppeteer is available
    let puppeteer: typeof import('puppeteer');
    try {
      puppeteer = await import('puppeteer');
    } catch {
      return {
        success: false,
        cookies: [],
        error: 'Puppeteer is not installed. Install with: npm install puppeteer',
      };
    }

    try {
      // Launch browser in headless mode
      this.browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--ignore-certificate-errors',
        ],
      });

      const page = await this.browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to login page
      await page.goto(HeadlessAuth.LOGIN_URL, {
        waitUntil: 'networkidle2',
        timeout: HeadlessAuth.TIMEOUT,
      });

      // Enter username
      await page.waitForSelector('#login-username', { timeout: HeadlessAuth.TIMEOUT });
      await page.type('#login-username', this.username, { delay: 50 });

      // Click next/signin button
      await page.click('#login-signin');

      // Wait for password field
      await page.waitForSelector('#login-passwd', {
        visible: true,
        timeout: HeadlessAuth.TIMEOUT,
      });

      // Small delay for page transition
      await this.delay(500);

      // Enter password
      await page.type('#login-passwd', this.password, { delay: 50 });

      // Click signin button
      await page.click('#login-signin');

      // Wait for navigation (successful login)
      await page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: HeadlessAuth.TIMEOUT,
      });

      // Check for successful login by looking for common post-login elements
      // or checking if we're no longer on the login page
      const currentUrl = page.url();
      if (currentUrl.includes('login.yahoo.com')) {
        // Still on login page - check for error messages
        const errorElement = await page.$('.error-msg');
        if (errorElement) {
          const errorText = await page.evaluate(
            (el) => el?.textContent || 'Login failed',
            errorElement
          );
          throw new Error(errorText);
        }
        throw new Error('Login failed - still on login page');
      }

      // Get cookies
      const browserCookies = await page.cookies();
      this.cookies = this.convertCookies(browserCookies);

      return {
        success: true,
        cookies: this.cookies,
      };
    } catch (error) {
      return {
        success: false,
        cookies: [],
        error: (error as Error).message,
      };
    } finally {
      await this.close();
    }
  }

  /**
   * Get the retrieved cookies
   */
  getCookies(): AuthCookie[] {
    return this.cookies;
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Convert Puppeteer cookies to our cookie format
   */
  private convertCookies(browserCookies: Cookie[]): AuthCookie[] {
    return browserCookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
    }));
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Perform Yahoo Finance Premium login
 *
 * @param username - Yahoo username/email
 * @param password - Yahoo password
 * @returns Authentication result with cookies
 */
export async function yahooLogin(
  username: string,
  password: string
): Promise<HeadlessAuthResult> {
  const auth = new HeadlessAuth(username, password);
  return auth.login();
}
