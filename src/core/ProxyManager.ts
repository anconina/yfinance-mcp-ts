/**
 * ProxyManager - Handles proxy rotation with failure tracking for Yahoo Finance API requests.
 *
 * Features:
 * - Round-robin proxy rotation
 * - Automatic failure tracking and proxy removal
 * - Support for HTTP, HTTPS, and SOCKS5 proxies
 * - Proxy string parsing (protocol://user:pass@host:port)
 */

import { Agent } from 'https';

/**
 * Proxy configuration interface
 */
export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks5';
}

/**
 * Proxy manager options
 */
export interface ProxyManagerOptions {
  /** Maximum consecutive failures before marking proxy as unhealthy (default: 3) */
  maxFailures?: number;
  /** Cooldown period in ms before retrying a failed proxy (default: 300000 = 5 min) */
  cooldownMs?: number;
}

/**
 * Internal proxy state tracking
 */
interface ProxyState {
  proxy: ProxyConfig;
  failures: number;
  lastFailure: number;
  successCount: number;
}

/**
 * ProxyManager handles proxy rotation with intelligent failure tracking
 */
export class ProxyManager {
  private proxies: ProxyState[] = [];
  private currentIndex: number = 0;
  private readonly maxFailures: number;
  private readonly cooldownMs: number;

  constructor(options: ProxyManagerOptions = {}) {
    this.maxFailures = options.maxFailures ?? 3;
    this.cooldownMs = options.cooldownMs ?? 300000; // 5 minutes default
  }

  /**
   * Add a single proxy configuration
   */
  addProxy(proxy: ProxyConfig): void {
    this.proxies.push({
      proxy,
      failures: 0,
      lastFailure: 0,
      successCount: 0,
    });
  }

  /**
   * Add multiple proxies from a newline-separated string
   * Format: protocol://user:pass@host:port or protocol://host:port
   */
  addProxiesFromString(proxyList: string): void {
    const lines = proxyList.trim().split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue; // Skip empty lines and comments
      }

      const proxy = this.parseProxyString(trimmedLine);
      if (proxy) {
        this.addProxy(proxy);
      }
    }
  }

  /**
   * Parse a proxy string into ProxyConfig
   * Supports: protocol://user:pass@host:port and protocol://host:port
   */
  parseProxyString(proxyString: string): ProxyConfig | null {
    // Match: protocol://[user:pass@]host:port
    const match = proxyString.match(
      /^(https?|socks5):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/i
    );

    if (!match) {
      console.warn(`Invalid proxy format: ${proxyString}`);
      return null;
    }

    return {
      protocol: match[1].toLowerCase() as 'http' | 'https' | 'socks5',
      username: match[2],
      password: match[3],
      host: match[4],
      port: parseInt(match[5], 10),
    };
  }

  /**
   * Get the next available proxy using round-robin with failure tracking
   * Returns null if no proxies are configured
   */
  getNext(): ProxyConfig | null {
    if (this.proxies.length === 0) {
      return null;
    }

    const now = Date.now();
    const startIndex = this.currentIndex;

    // Try to find a healthy proxy
    do {
      const state = this.proxies[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

      // Check if proxy is healthy or has cooled down
      const isHealthy = state.failures < this.maxFailures;
      const hasCooledDown = now - state.lastFailure > this.cooldownMs;

      if (isHealthy || hasCooledDown) {
        // Reset failures if cooled down
        if (hasCooledDown && state.failures >= this.maxFailures) {
          state.failures = 0;
        }
        return state.proxy;
      }
    } while (this.currentIndex !== startIndex);

    // All proxies are unhealthy, reset all and return first
    console.warn('All proxies failed, resetting failure counts');
    this.resetAllFailures();
    return this.proxies[0]?.proxy ?? null;
  }

  /**
   * Report a successful request through a proxy
   */
  reportSuccess(proxy: ProxyConfig): void {
    const state = this.findProxyState(proxy);
    if (state) {
      state.failures = 0;
      state.successCount++;
    }
  }

  /**
   * Report a failed request through a proxy
   */
  reportFailure(proxy: ProxyConfig): void {
    const state = this.findProxyState(proxy);
    if (state) {
      state.failures++;
      state.lastFailure = Date.now();

      if (state.failures >= this.maxFailures) {
        console.warn(
          `Proxy ${proxy.host}:${proxy.port} marked as unhealthy after ${state.failures} failures`
        );
      }
    }
  }

  /**
   * Get an HTTPS/SOCKS agent for the given proxy
   * Requires https-proxy-agent and socks-proxy-agent packages
   */
  getProxyAgent(proxy: ProxyConfig): Agent {
    const auth = proxy.username
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password || '')}@`
      : '';
    const url = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;

    if (proxy.protocol === 'socks5') {
      // Dynamic import to make socks-proxy-agent optional
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SocksProxyAgent } = require('socks-proxy-agent');
        return new SocksProxyAgent(url);
      } catch {
        throw new Error(
          'socks-proxy-agent package is required for SOCKS5 proxies. Install with: npm install socks-proxy-agent'
        );
      }
    }

    // HTTP/HTTPS proxy
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { HttpsProxyAgent } = require('https-proxy-agent');
      return new HttpsProxyAgent(url);
    } catch {
      throw new Error(
        'https-proxy-agent package is required for HTTP/HTTPS proxies. Install with: npm install https-proxy-agent'
      );
    }
  }

  /**
   * Get the number of configured proxies
   */
  size(): number {
    return this.proxies.length;
  }

  /**
   * Get the number of healthy proxies
   */
  healthyCount(): number {
    const now = Date.now();
    return this.proxies.filter((state) => {
      const isHealthy = state.failures < this.maxFailures;
      const hasCooledDown = now - state.lastFailure > this.cooldownMs;
      return isHealthy || hasCooledDown;
    }).length;
  }

  /**
   * Get statistics for all proxies
   */
  getStats(): Array<{
    host: string;
    port: number;
    failures: number;
    successCount: number;
    isHealthy: boolean;
  }> {
    const now = Date.now();
    return this.proxies.map((state) => ({
      host: state.proxy.host,
      port: state.proxy.port,
      failures: state.failures,
      successCount: state.successCount,
      isHealthy:
        state.failures < this.maxFailures ||
        now - state.lastFailure > this.cooldownMs,
    }));
  }

  /**
   * Remove all proxies
   */
  clear(): void {
    this.proxies = [];
    this.currentIndex = 0;
  }

  /**
   * Remove a specific proxy
   */
  removeProxy(proxy: ProxyConfig): boolean {
    const index = this.proxies.findIndex(
      (state) =>
        state.proxy.host === proxy.host && state.proxy.port === proxy.port
    );

    if (index !== -1) {
      this.proxies.splice(index, 1);
      if (this.currentIndex >= this.proxies.length) {
        this.currentIndex = 0;
      }
      return true;
    }
    return false;
  }

  /**
   * Find proxy state by proxy config
   */
  private findProxyState(proxy: ProxyConfig): ProxyState | undefined {
    return this.proxies.find(
      (state) =>
        state.proxy.host === proxy.host && state.proxy.port === proxy.port
    );
  }

  /**
   * Reset all proxy failure counts
   */
  private resetAllFailures(): void {
    for (const state of this.proxies) {
      state.failures = 0;
      state.lastFailure = 0;
    }
  }
}
