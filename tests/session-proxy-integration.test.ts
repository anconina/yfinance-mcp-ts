/**
 * Integration tests for SessionManager with Proxy Rotation
 */

import { SessionManager } from '../src/core/SessionManager';

describe('SessionManager Proxy Integration', () => {
  describe('Initialization', () => {
    test('should initialize without proxy rotation', () => {
      const session = new SessionManager();

      expect(session.hasProxyRotation()).toBe(false);
      expect(session.getProxyStats()).toBeNull();
      expect(session.getProxyManager()).toBeUndefined();
    });

    test('should initialize with proxy rotation', () => {
      const session = new SessionManager({
        proxyRotation: {
          proxyList: `
            http://proxy1.example.com:8080
            http://proxy2.example.com:8080
          `,
          maxFailures: 2,
          cooldownMs: 30000,
        },
      });

      expect(session.hasProxyRotation()).toBe(true);
      expect(session.getProxyStats()).toHaveLength(2);
      expect(session.getProxyManager()).toBeDefined();
    });

    test('should not enable proxy rotation with empty proxyList', () => {
      const session = new SessionManager({
        proxyRotation: {
          proxyList: '',
        },
      });

      expect(session.hasProxyRotation()).toBe(false);
    });

    test('should not enable proxy rotation with only comments', () => {
      const session = new SessionManager({
        proxyRotation: {
          proxyList: `
            # This is a comment
            # Another comment
          `,
        },
      });

      expect(session.hasProxyRotation()).toBe(false);
    });
  });

  describe('Proxy Statistics', () => {
    test('should return proxy stats with correct structure', () => {
      const session = new SessionManager({
        proxyRotation: {
          proxyList: 'http://proxy.example.com:8080',
        },
      });

      const stats = session.getProxyStats();

      expect(stats).toHaveLength(1);
      expect(stats![0]).toMatchObject({
        host: 'proxy.example.com',
        port: 8080,
        failures: 0,
        successCount: 0,
        isHealthy: true,
      });
    });

    test('should track proxy manager reference', () => {
      const session = new SessionManager({
        proxyRotation: {
          proxyList: `
            http://proxy1.example.com:8080
            socks5://proxy2.example.com:1080
          `,
        },
      });

      const proxyManager = session.getProxyManager();

      expect(proxyManager).toBeDefined();
      expect(proxyManager!.size()).toBe(2);
      expect(proxyManager!.healthyCount()).toBe(2);
    });
  });

  describe('Configuration Options', () => {
    test('should use default maxFailures and cooldownMs', () => {
      const session = new SessionManager({
        proxyRotation: {
          proxyList: 'http://proxy.example.com:8080',
        },
      });

      const proxyManager = session.getProxyManager()!;
      const proxy = proxyManager.getNext()!;

      // Default maxFailures is 3
      proxyManager.reportFailure(proxy);
      proxyManager.reportFailure(proxy);
      expect(proxyManager.getStats()[0].isHealthy).toBe(true);

      proxyManager.reportFailure(proxy);
      expect(proxyManager.getStats()[0].isHealthy).toBe(false);
    });

    test('should respect custom maxFailures', () => {
      const session = new SessionManager({
        proxyRotation: {
          proxyList: 'http://proxy.example.com:8080',
          maxFailures: 1,
        },
      });

      const proxyManager = session.getProxyManager()!;
      const proxy = proxyManager.getNext()!;

      proxyManager.reportFailure(proxy);
      expect(proxyManager.getStats()[0].isHealthy).toBe(false);
    });
  });

  describe('Multiple Proxy Types', () => {
    test('should handle mixed proxy protocols', () => {
      const session = new SessionManager({
        proxyRotation: {
          proxyList: `
            http://http-proxy.com:8080
            https://https-proxy.com:443
            socks5://socks-proxy.com:1080
          `,
        },
      });

      const stats = session.getProxyStats()!;

      expect(stats).toHaveLength(3);
      expect(stats.map(s => s.host)).toEqual([
        'http-proxy.com',
        'https-proxy.com',
        'socks-proxy.com',
      ]);
    });

    test('should handle proxies with authentication', () => {
      const session = new SessionManager({
        proxyRotation: {
          proxyList: `
            http://user1:pass1@auth-proxy1.com:8080
            http://user2:pass2@auth-proxy2.com:8080
          `,
        },
      });

      expect(session.hasProxyRotation()).toBe(true);
      expect(session.getProxyStats()).toHaveLength(2);
    });
  });

  describe('Combined with Other Options', () => {
    test('should work with retry config', () => {
      const session = new SessionManager({
        retry: {
          maxRetries: 5,
          initialDelay: 500,
        },
        proxyRotation: {
          proxyList: 'http://proxy.example.com:8080',
        },
      });

      expect(session.hasProxyRotation()).toBe(true);
      expect(session.getRetryConfig().maxRetries).toBe(5);
    });

    test('should work with timeout config', () => {
      const session = new SessionManager({
        timeout: 60000,
        proxyRotation: {
          proxyList: 'http://proxy.example.com:8080',
        },
      });

      expect(session.hasProxyRotation()).toBe(true);
    });
  });
});
