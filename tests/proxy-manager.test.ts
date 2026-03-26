/**
 * Tests for ProxyManager - Proxy rotation with failure tracking
 */

import { ProxyManager, ProxyConfig } from '../src/core/ProxyManager';

describe('ProxyManager', () => {
  let proxyManager: ProxyManager;

  beforeEach(() => {
    proxyManager = new ProxyManager({ maxFailures: 3, cooldownMs: 1000 });
  });

  describe('Proxy String Parsing', () => {
    test('should parse HTTP proxy with auth', () => {
      const result = proxyManager.parseProxyString('http://user:pass@proxy.example.com:8080');
      expect(result).toEqual({
        protocol: 'http',
        username: 'user',
        password: 'pass',
        host: 'proxy.example.com',
        port: 8080,
      });
    });

    test('should parse HTTPS proxy without auth', () => {
      const result = proxyManager.parseProxyString('https://proxy.example.com:443');
      expect(result).toEqual({
        protocol: 'https',
        username: undefined,
        password: undefined,
        host: 'proxy.example.com',
        port: 443,
      });
    });

    test('should parse SOCKS5 proxy with auth', () => {
      const result = proxyManager.parseProxyString('socks5://admin:secret@socks.example.com:1080');
      expect(result).toEqual({
        protocol: 'socks5',
        username: 'admin',
        password: 'secret',
        host: 'socks.example.com',
        port: 1080,
      });
    });

    test('should return null for invalid proxy string', () => {
      expect(proxyManager.parseProxyString('invalid')).toBeNull();
      expect(proxyManager.parseProxyString('ftp://proxy.com:21')).toBeNull();
      expect(proxyManager.parseProxyString('http://proxy.com')).toBeNull(); // missing port
    });

    test('should handle special characters in password', () => {
      const result = proxyManager.parseProxyString('http://user:p@ss:word@proxy.com:8080');
      // Note: This tests current behavior - special chars in password may need URL encoding
      expect(result).toBeNull(); // Current regex doesn't handle @ in password
    });
  });

  describe('Adding Proxies', () => {
    test('should add single proxy', () => {
      proxyManager.addProxy({
        protocol: 'http',
        host: 'proxy.example.com',
        port: 8080,
      });
      expect(proxyManager.size()).toBe(1);
    });

    test('should add proxies from string', () => {
      proxyManager.addProxiesFromString(`
        http://proxy1.example.com:8080
        https://proxy2.example.com:443
        socks5://proxy3.example.com:1080
      `);
      expect(proxyManager.size()).toBe(3);
    });

    test('should skip comments and empty lines', () => {
      proxyManager.addProxiesFromString(`
        # This is a comment
        http://proxy1.example.com:8080

        # Another comment
        http://proxy2.example.com:8080
      `);
      expect(proxyManager.size()).toBe(2);
    });

    test('should skip invalid proxy strings', () => {
      proxyManager.addProxiesFromString(`
        http://valid.proxy.com:8080
        invalid-proxy-string
        http://another-valid.com:8080
      `);
      expect(proxyManager.size()).toBe(2);
    });
  });

  describe('Round-Robin Rotation', () => {
    beforeEach(() => {
      proxyManager.addProxiesFromString(`
        http://proxy1.com:8080
        http://proxy2.com:8080
        http://proxy3.com:8080
      `);
    });

    test('should rotate through proxies in order', () => {
      const proxy1 = proxyManager.getNext();
      const proxy2 = proxyManager.getNext();
      const proxy3 = proxyManager.getNext();
      const proxy4 = proxyManager.getNext(); // Should wrap around

      expect(proxy1?.host).toBe('proxy1.com');
      expect(proxy2?.host).toBe('proxy2.com');
      expect(proxy3?.host).toBe('proxy3.com');
      expect(proxy4?.host).toBe('proxy1.com');
    });

    test('should return null when no proxies configured', () => {
      const emptyManager = new ProxyManager();
      expect(emptyManager.getNext()).toBeNull();
    });
  });

  describe('Failure Tracking', () => {
    beforeEach(() => {
      proxyManager.addProxiesFromString(`
        http://proxy1.com:8080
        http://proxy2.com:8080
        http://proxy3.com:8080
      `);
    });

    test('should track failures per proxy', () => {
      const proxy = proxyManager.getNext()!;

      proxyManager.reportFailure(proxy);
      proxyManager.reportFailure(proxy);

      const stats = proxyManager.getStats();
      const proxyStats = stats.find(s => s.host === proxy.host);

      expect(proxyStats?.failures).toBe(2);
      expect(proxyStats?.isHealthy).toBe(true); // Still healthy (< maxFailures)
    });

    test('should mark proxy unhealthy after max failures', () => {
      const proxy = proxyManager.getNext()!;

      proxyManager.reportFailure(proxy);
      proxyManager.reportFailure(proxy);
      proxyManager.reportFailure(proxy); // 3rd failure = maxFailures

      const stats = proxyManager.getStats();
      const proxyStats = stats.find(s => s.host === proxy.host);

      expect(proxyStats?.failures).toBe(3);
      expect(proxyStats?.isHealthy).toBe(false);
    });

    test('should skip unhealthy proxies in rotation', () => {
      // Get and fail proxy1
      const proxy1 = proxyManager.getNext()!;
      proxyManager.reportFailure(proxy1);
      proxyManager.reportFailure(proxy1);
      proxyManager.reportFailure(proxy1);

      // Next should be proxy2, not proxy1
      const nextProxy = proxyManager.getNext();
      expect(nextProxy?.host).toBe('proxy2.com');
    });

    test('should reset failures on success', () => {
      const proxy = proxyManager.getNext()!;

      proxyManager.reportFailure(proxy);
      proxyManager.reportFailure(proxy);
      proxyManager.reportSuccess(proxy);

      const stats = proxyManager.getStats();
      const proxyStats = stats.find(s => s.host === proxy.host);

      expect(proxyStats?.failures).toBe(0);
      expect(proxyStats?.successCount).toBe(1);
    });

    test('should track success count', () => {
      const proxy = proxyManager.getNext()!;

      proxyManager.reportSuccess(proxy);
      proxyManager.reportSuccess(proxy);
      proxyManager.reportSuccess(proxy);

      const stats = proxyManager.getStats();
      const proxyStats = stats.find(s => s.host === proxy.host);

      expect(proxyStats?.successCount).toBe(3);
    });
  });

  describe('Cooldown Behavior', () => {
    test('should allow unhealthy proxy after cooldown', async () => {
      const manager = new ProxyManager({ maxFailures: 2, cooldownMs: 100 });
      manager.addProxy({ protocol: 'http', host: 'proxy1.com', port: 8080 });

      const proxy = manager.getNext()!;
      manager.reportFailure(proxy);
      manager.reportFailure(proxy);

      // Proxy should be unhealthy
      let stats = manager.getStats();
      expect(stats[0].isHealthy).toBe(false);

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 150));

      // Proxy should be healthy again (cooldown passed)
      stats = manager.getStats();
      expect(stats[0].isHealthy).toBe(true);
    });
  });

  describe('Healthy Count', () => {
    test('should return correct healthy count', () => {
      proxyManager.addProxiesFromString(`
        http://proxy1.com:8080
        http://proxy2.com:8080
        http://proxy3.com:8080
      `);

      expect(proxyManager.healthyCount()).toBe(3);

      // Fail one proxy
      const proxy = proxyManager.getNext()!;
      proxyManager.reportFailure(proxy);
      proxyManager.reportFailure(proxy);
      proxyManager.reportFailure(proxy);

      expect(proxyManager.healthyCount()).toBe(2);
    });
  });

  describe('Proxy Removal', () => {
    beforeEach(() => {
      proxyManager.addProxiesFromString(`
        http://proxy1.com:8080
        http://proxy2.com:8080
      `);
    });

    test('should remove specific proxy', () => {
      const proxy = proxyManager.getNext()!;
      const removed = proxyManager.removeProxy(proxy);

      expect(removed).toBe(true);
      expect(proxyManager.size()).toBe(1);
    });

    test('should return false when proxy not found', () => {
      const removed = proxyManager.removeProxy({
        protocol: 'http',
        host: 'nonexistent.com',
        port: 8080,
      });

      expect(removed).toBe(false);
      expect(proxyManager.size()).toBe(2);
    });

    test('should clear all proxies', () => {
      proxyManager.clear();
      expect(proxyManager.size()).toBe(0);
    });
  });

  describe('Proxy Agent Creation', () => {
    test('should create HTTPS proxy agent for HTTP protocol', () => {
      proxyManager.addProxy({
        protocol: 'http',
        host: 'proxy.example.com',
        port: 8080,
        username: 'user',
        password: 'pass',
      });

      const proxy = proxyManager.getNext()!;

      // This will throw if https-proxy-agent is not installed
      // In a real test environment, you'd mock this
      expect(() => {
        proxyManager.getProxyAgent(proxy);
      }).not.toThrow();
    });

    test('should handle special characters in credentials', () => {
      proxyManager.addProxy({
        protocol: 'http',
        host: 'proxy.example.com',
        port: 8080,
        username: 'user@domain',
        password: 'p@ss:word!',
      });

      const proxy = proxyManager.getNext()!;

      // Should URL-encode special characters
      expect(() => {
        proxyManager.getProxyAgent(proxy);
      }).not.toThrow();
    });
  });

  describe('Reset All Failures', () => {
    test('should reset all failures when all proxies exhausted', () => {
      proxyManager.addProxiesFromString(`
        http://proxy1.com:8080
        http://proxy2.com:8080
      `);

      // Fail all proxies
      const proxy1 = proxyManager.getNext()!;
      const proxy2 = proxyManager.getNext()!;

      for (let i = 0; i < 3; i++) {
        proxyManager.reportFailure(proxy1);
        proxyManager.reportFailure(proxy2);
      }

      expect(proxyManager.healthyCount()).toBe(0);

      // Getting next should reset all and return first
      const nextProxy = proxyManager.getNext();
      expect(nextProxy).not.toBeNull();
      expect(proxyManager.healthyCount()).toBe(2); // All reset
    });
  });

  describe('Statistics', () => {
    test('should return complete stats for all proxies', () => {
      proxyManager.addProxiesFromString(`
        http://proxy1.com:8080
        http://proxy2.com:8080
      `);

      const proxy1 = proxyManager.getNext()!;
      proxyManager.reportSuccess(proxy1);
      proxyManager.reportSuccess(proxy1);

      const proxy2 = proxyManager.getNext()!;
      proxyManager.reportFailure(proxy2);

      const stats = proxyManager.getStats();

      expect(stats).toHaveLength(2);
      expect(stats[0]).toEqual({
        host: 'proxy1.com',
        port: 8080,
        failures: 0,
        successCount: 2,
        isHealthy: true,
      });
      expect(stats[1]).toEqual({
        host: 'proxy2.com',
        port: 8080,
        failures: 1,
        successCount: 0,
        isHealthy: true,
      });
    });
  });
});
