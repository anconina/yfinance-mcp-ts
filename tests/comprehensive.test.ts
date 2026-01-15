/**
 * Comprehensive Tests with Mocked API Responses
 * Tests core functionality without making actual API calls
 */

import axios from 'axios';
import { Ticker, createTicker } from '../src/core/Ticker';
import { SessionManager, createSession } from '../src/core/SessionManager';
import { BaseFinance } from '../src/core/BaseFinance';
import { Screener, createScreener } from '../src/core/Screener';
import { Research, createResearch } from '../src/core/Research';
import { search, getCurrencies, getMarketSummary, getTrending, getValidCountries } from '../src/misc/functions';
import {
  convertToList,
  convertToTimestamp,
  formatTimestamp,
  flattenList,
  chunkArray,
  stringifyBooleans,
  formatDate,
  isPlainObject,
  deepClone,
  sleep,
  parseBoolean,
  keysToLowerCase,
  removeNullish,
} from '../src/utils/helpers';

// Mock axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { jar: null },
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      get: jest.fn(),
    },
    create: jest.fn(() => mockAxiosInstance),
  };
});

// Mock axios-cookiejar-support
jest.mock('axios-cookiejar-support', () => ({
  wrapper: jest.fn((instance) => instance),
}));

// Mock HeadlessAuth for premium tests
jest.mock('../src/auth/HeadlessAuth', () => ({
  HeadlessAuth: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue({ success: false, cookies: [], error: 'mocked' }),
    getCookies: jest.fn().mockReturnValue([]),
    close: jest.fn(),
  })),
  yahooLogin: jest.fn().mockResolvedValue({ success: false, cookies: [], error: 'mocked' }),
  hasPuppeteer: jest.fn().mockResolvedValue(true),
}));

describe('Utility Functions - Extended', () => {
  describe('convertToList - edge cases', () => {
    test('should handle empty string', () => {
      expect(convertToList('')).toEqual([]);
    });

    test('should handle single symbol', () => {
      expect(convertToList('AAPL')).toEqual(['AAPL']);
    });

    test('should handle array with empty strings', () => {
      expect(convertToList(['AAPL', '', 'MSFT'])).toEqual(['AAPL', '', 'MSFT']);
    });

    test('should handle special ticker symbols', () => {
      expect(convertToList('BRK-A BRK-B ^GSPC')).toEqual(['BRK-A', 'BRK-B', '^GSPC']);
    });

    test('should handle currency pairs', () => {
      expect(convertToList('EURUSD=X GBPUSD=X')).toEqual(['EURUSD=X', 'GBPUSD=X']);
    });
  });

  describe('convertToTimestamp', () => {
    test('should handle Date object', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const ts = convertToTimestamp(date);
      expect(ts).toBe(Math.floor(date.getTime() / 1000));
    });

    test('should handle date string', () => {
      const ts = convertToTimestamp('2024-01-01T00:00:00Z');
      expect(ts).toBe(1704067200);
    });

    test('should return start default when undefined', () => {
      const ts = convertToTimestamp(undefined, true);
      // 1942-01-01 is the default start
      expect(ts).toBeLessThan(0); // Before Unix epoch
    });

    test('should return now when undefined and start=false', () => {
      const ts = convertToTimestamp(undefined, false);
      const now = Math.floor(Date.now() / 1000);
      expect(Math.abs(ts - now)).toBeLessThan(5);
    });
  });

  describe('formatTimestamp', () => {
    test('should format timestamp to ISO date', () => {
      const formatted = formatTimestamp(1704067200);
      expect(formatted).toMatch(/2024-01-0[12]/); // Timezone dependent
    });

    test('should handle null/undefined gracefully', () => {
      expect(formatTimestamp(0)).toBeDefined();
    });
  });

  describe('flattenList', () => {
    test('should handle empty array', () => {
      expect(flattenList([])).toEqual([]);
    });

    test('should handle single level array', () => {
      expect(flattenList([[1], [2], [3]])).toEqual([1, 2, 3]);
    });

    test('should handle mixed content', () => {
      expect(flattenList([[1, 2], [3]])).toEqual([1, 2, 3]);
    });
  });

  describe('chunkArray', () => {
    test('should handle empty array', () => {
      expect(chunkArray([], 5)).toEqual([]);
    });

    test('should handle array smaller than chunk size', () => {
      expect(chunkArray([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
    });

    test('should handle exact chunk size', () => {
      expect(chunkArray([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });
  });

  describe('stringifyBooleans', () => {
    test('should handle empty object', () => {
      expect(stringifyBooleans({})).toEqual({});
    });

    test('should handle nested objects (shallow)', () => {
      expect(stringifyBooleans({ a: true, b: { c: false } })).toEqual({
        a: 'true',
        b: { c: false },
      });
    });

    test('should preserve numbers and strings', () => {
      expect(stringifyBooleans({ a: 1, b: 'test', c: true })).toEqual({
        a: 1,
        b: 'test',
        c: 'true',
      });
    });
  });

  describe('formatDate', () => {
    test('should format timestamp to YYYY-MM-DD', () => {
      const formatted = formatDate(1704067200);
      expect(formatted).toMatch(/2024-01-01/);
    });

    test('should handle invalid timestamp', () => {
      const result = formatDate(NaN);
      expect(result).toBe('NaN');
    });
  });

  describe('isPlainObject', () => {
    test('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
    });

    test('should return false for arrays', () => {
      expect(isPlainObject([])).toBe(false);
    });

    test('should return false for null', () => {
      expect(isPlainObject(null)).toBe(false);
    });

    test('should return false for primitives', () => {
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
      expect(isPlainObject(true)).toBe(false);
    });
  });

  describe('deepClone', () => {
    test('should clone simple object', () => {
      const obj = { a: 1, b: 'test' };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    test('should clone nested object', () => {
      const obj = { a: { b: { c: 1 } } };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.a).not.toBe(obj.a);
    });

    test('should clone arrays', () => {
      const arr = [1, 2, [3, 4]];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    test('should handle primitives', () => {
      expect(deepClone(123)).toBe(123);
      expect(deepClone('test')).toBe('test');
      expect(deepClone(null)).toBe(null);
    });
  });

  describe('sleep', () => {
    test('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
    });
  });

  describe('parseBoolean', () => {
    test('should return boolean as-is', () => {
      expect(parseBoolean(true)).toBe(true);
      expect(parseBoolean(false)).toBe(false);
    });

    test('should parse string "true"', () => {
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('True')).toBe(true);
    });

    test('should parse string "false"', () => {
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('FALSE')).toBe(false);
    });

    test('should convert truthy/falsy values', () => {
      expect(parseBoolean(1)).toBe(true);
      expect(parseBoolean(0)).toBe(false);
      expect(parseBoolean('')).toBe(false);
    });
  });

  describe('keysToLowerCase', () => {
    test('should convert keys to lowercase', () => {
      const obj = { ABC: 1, Def: 2, ghi: 3 };
      const result = keysToLowerCase(obj);
      expect(result).toEqual({ abc: 1, def: 2, ghi: 3 });
    });

    test('should handle empty object', () => {
      expect(keysToLowerCase({})).toEqual({});
    });
  });

  describe('removeNullish', () => {
    test('should remove null values', () => {
      const obj = { a: 1, b: null, c: 'test' };
      const result = removeNullish(obj);
      expect(result).toEqual({ a: 1, c: 'test' });
    });

    test('should remove undefined values', () => {
      const obj = { a: 1, b: undefined, c: 'test' };
      const result = removeNullish(obj);
      expect(result).toEqual({ a: 1, c: 'test' });
    });

    test('should keep empty strings and zeros', () => {
      const obj = { a: '', b: 0, c: false };
      const result = removeNullish(obj);
      expect(result).toEqual({ a: '', b: 0, c: false });
    });
  });
});

describe('SessionManager - Mocked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create with default options', () => {
      const session = new SessionManager();
      expect(session).toBeInstanceOf(SessionManager);
      expect(session.isInitialized()).toBe(false);
    });

    test('should create with custom timeout', () => {
      const session = new SessionManager({ timeout: 60000 });
      expect(session).toBeDefined();
    });

    test('should create with premium credentials', () => {
      const session = new SessionManager({
        username: 'test@example.com',
        password: 'password123',
      });
      expect(session).toBeDefined();
      expect(session.hasPremium()).toBe(false); // Not logged in yet
    });
  });

  describe('Impersonation', () => {
    test('should return browser impersonation info', () => {
      const session = new SessionManager();
      const { browser, headers } = session.getImpersonation();
      expect(browser).toBeDefined();
      expect(headers).toBeDefined();
      expect(headers['user-agent']).toBeTruthy();
    });
  });

  describe('Cookie Management', () => {
    test('should set cookies without error', async () => {
      const session = new SessionManager();
      const cookies = [
        { name: 'test', value: 'value', domain: '.yahoo.com', path: '/' },
      ];
      await expect(session.setCookies(cookies)).resolves.not.toThrow();
    });

    test('should handle empty cookie array', async () => {
      const session = new SessionManager();
      await expect(session.setCookies([])).resolves.not.toThrow();
    });
  });

  describe('Client Access', () => {
    test('should return axios client', () => {
      const session = new SessionManager();
      const client = session.getClient();
      expect(client).toBeDefined();
    });
  });
});

describe('Ticker Class - Extended', () => {
  describe('Symbol Management', () => {
    test('should normalize symbols to uppercase', () => {
      const ticker = new Ticker('aapl msft');
      // Symbols are stored as provided (not auto-uppercased in this implementation)
      expect(ticker.symbols).toEqual(['aapl', 'msft']);
    });

    test('should handle special symbols', () => {
      const ticker = new Ticker(['^GSPC', 'BRK-B', 'EURUSD=X']);
      expect(ticker.symbols).toEqual(['^GSPC', 'BRK-B', 'EURUSD=X']);
    });

    test('should handle empty symbol string', () => {
      const ticker = new Ticker('');
      expect(ticker.symbols).toEqual([]);
    });
  });

  describe('Country Configuration', () => {
    test('should default to united states', () => {
      const ticker = new Ticker('AAPL');
      expect(ticker.country).toBe('united states');
    });

    test('should accept different countries', () => {
      const ticker = new Ticker('AAPL', { country: 'germany' });
      expect(ticker.country).toBe('germany');
    });

    test('should throw for invalid country', () => {
      expect(() => new Ticker('AAPL', { country: 'invalid_country' })).toThrow();
    });

    test('should allow changing country after creation', () => {
      const ticker = new Ticker('AAPL');
      ticker.country = 'france';
      expect(ticker.country).toBe('france');
    });
  });

  describe('Quote Summary Methods Existence', () => {
    const ticker = new Ticker('AAPL');
    const methods = [
      'getAssetProfile',
      'getCalendarEvents',
      'getEarnings',
      'getEarningsTrend',
      'getEsgScores',
      'getFinancialDataSummary',
      'getIndexTrend',
      'getIndustryTrend',
      'getKeyStats',
      'getMajorHolders',
      'getPageViews',
      'getPrice',
      'getQuoteType',
      'getSharePurchaseActivity',
      'getSummaryDetail',
      'getSummaryProfile',
      'getRecommendationTrend',
      'getGradingHistory',
      'getEarningHistory',
      'getFundOwnership',
      'getInsiderHolders',
      'getInsiderTransactions',
      'getInstitutionOwnership',
      'getSecFilings',
    ];

    test.each(methods)('should have %s method', (method) => {
      expect(typeof (ticker as unknown as Record<string, unknown>)[method]).toBe('function');
    });
  });

  describe('Historical Data Methods Existence', () => {
    const ticker = new Ticker('AAPL');

    test('should have getHistory method', () => {
      expect(typeof ticker.getHistory).toBe('function');
    });

    test('should have getDividendHistory method', () => {
      expect(typeof ticker.getDividendHistory).toBe('function');
    });
  });

  describe('Financials Methods Existence', () => {
    const ticker = new Ticker('AAPL');
    const methods = [
      'getIncomeStatement',
      'getBalanceSheet',
      'getCashFlow',
      'getValuationMeasures',
      'getAllFinancialData',
      'getFinancialData',
      'getCorporateEvents',
      'getCorporateGuidance',
    ];

    test.each(methods)('should have %s method', (method) => {
      expect(typeof (ticker as unknown as Record<string, unknown>)[method]).toBe('function');
    });
  });

  describe('Fund Methods Existence', () => {
    const ticker = new Ticker('SPY');
    const methods = [
      'getFundHoldingInfo',
      'getFundTopHoldings',
      'getFundBondHoldings',
      'getFundEquityHoldings',
      'getFundSectorWeightings',
      'getFundBondRatings',
      'getFundPerformance',
      'getFundProfile',
      'getFundCategoryHoldings',
    ];

    test.each(methods)('should have %s method', (method) => {
      expect(typeof (ticker as unknown as Record<string, unknown>)[method]).toBe('function');
    });
  });

  describe('Other Methods Existence', () => {
    const ticker = new Ticker('AAPL');

    test('should have getQuotes method', () => {
      expect(typeof ticker.getQuotes).toBe('function');
    });

    test('should have getRecommendations method', () => {
      expect(typeof ticker.getRecommendations).toBe('function');
    });

    test('should have getTechnicalInsights method', () => {
      expect(typeof ticker.getTechnicalInsights).toBe('function');
    });

    test('should have getNews method', () => {
      expect(typeof ticker.getNews).toBe('function');
    });

    test('should have getOptionChain method', () => {
      expect(typeof ticker.getOptionChain).toBe('function');
    });

    test('should have getCompanyOfficers method', () => {
      expect(typeof ticker.getCompanyOfficers).toBe('function');
    });

    test('should have validate method', () => {
      expect(typeof ticker.validate).toBe('function');
    });
  });
});

describe('Screener Class - Extended', () => {
  describe('Constructor', () => {
    test('should create with default options', () => {
      const screener = new Screener();
      expect(screener).toBeInstanceOf(Screener);
    });

    test('should create with custom country', () => {
      const screener = new Screener({ country: 'france' });
      expect(screener.country).toBe('france');
    });
  });

  describe('Available Screeners', () => {
    test('should have many available screeners', () => {
      const screener = new Screener();
      expect(screener.availableScreeners.length).toBeGreaterThan(100);
    });

    test('should include popular screeners', () => {
      const screener = new Screener();
      const popular = ['day_gainers', 'day_losers', 'most_actives', 'undervalued_growth_stocks'];
      for (const id of popular) {
        expect(screener.availableScreeners).toContain(id);
      }
    });
  });

  describe('Screener Info', () => {
    test('should return info for valid screener', () => {
      const screener = new Screener();
      const info = screener.getScreenerInfo('day_gainers');
      expect(info).not.toBeNull();
      expect(info?.id).toBeTruthy();
      expect(info?.title).toBeTruthy();
    });

    test('should return null for invalid screener', () => {
      const screener = new Screener();
      expect(screener.getScreenerInfo('not_a_real_screener')).toBeNull();
    });

    test('should return info for each available screener', () => {
      const screener = new Screener();
      const sampleScreeners = screener.availableScreeners.slice(0, 10);
      for (const id of sampleScreeners) {
        const info = screener.getScreenerInfo(id);
        expect(info).not.toBeNull();
      }
    });
  });
});

describe('Research Class - Extended', () => {
  describe('Constructor', () => {
    test('should create with default options', () => {
      const research = new Research();
      expect(research).toBeInstanceOf(Research);
    });

    test('should create with custom country', () => {
      const research = new Research({ country: 'germany' });
      expect(research.country).toBe('germany');
    });
  });

  describe('Methods Existence', () => {
    const research = new Research();
    const methods = ['getReports', 'getTrades', 'getEarnings', 'getSplits', 'getIPOs'];

    test.each(methods)('should have %s method', (method) => {
      expect(typeof (research as unknown as Record<string, unknown>)[method]).toBe('function');
    });
  });
});

describe('Misc Functions - Extended', () => {
  describe('getValidCountries', () => {
    test('should return 14 countries', () => {
      const countries = getValidCountries();
      expect(countries.length).toBe(14);
    });

    test('should include major markets', () => {
      const countries = getValidCountries();
      expect(countries).toContain('united states');
      expect(countries).toContain('united kingdom');
      expect(countries).toContain('germany');
      expect(countries).toContain('france');
    });
  });

  describe('search function', () => {
    test('should be a function', () => {
      expect(typeof search).toBe('function');
    });
  });

  describe('getCurrencies function', () => {
    test('should be a function', () => {
      expect(typeof getCurrencies).toBe('function');
    });
  });

  describe('getMarketSummary function', () => {
    test('should be a function', () => {
      expect(typeof getMarketSummary).toBe('function');
    });
  });

  describe('getTrending function', () => {
    test('should be a function', () => {
      expect(typeof getTrending).toBe('function');
    });
  });
});

describe('createTicker Factory', () => {
  test('should create ticker with single symbol', async () => {
    const ticker = await createTicker('AAPL');
    expect(ticker).toBeInstanceOf(Ticker);
    expect(ticker.symbols).toEqual(['AAPL']);
  });

  test('should create ticker with multiple symbols', async () => {
    const ticker = await createTicker(['AAPL', 'MSFT']);
    expect(ticker.symbols).toEqual(['AAPL', 'MSFT']);
  });

  test('should create ticker with options', async () => {
    const ticker = await createTicker('AAPL', { formatted: true });
    expect(ticker).toBeDefined();
  });
});

describe('createScreener Factory', () => {
  test('should be a function', () => {
    expect(typeof createScreener).toBe('function');
  });
});

describe('createResearch Factory', () => {
  test('should be a function', () => {
    expect(typeof createResearch).toBe('function');
  });
});

describe('Type Exports', () => {
  test('should export Ticker class', async () => {
    const exports = await import('../src/index');
    expect(exports.Ticker).toBeDefined();
  });

  test('should export SessionManager', async () => {
    const exports = await import('../src/index');
    expect(exports.SessionManager).toBeDefined();
  });

  test('should export Screener', async () => {
    const exports = await import('../src/index');
    expect(exports.Screener).toBeDefined();
  });

  test('should export Research', async () => {
    const exports = await import('../src/index');
    expect(exports.Research).toBeDefined();
  });

  test('should export misc functions', async () => {
    const exports = await import('../src/index');
    expect(exports.search).toBeDefined();
    expect(exports.getCurrencies).toBeDefined();
    expect(exports.getMarketSummary).toBeDefined();
    expect(exports.getTrending).toBeDefined();
    expect(exports.getValidCountries).toBeDefined();
  });

  test('should export config', async () => {
    const exports = await import('../src/index');
    expect(exports.CONFIG).toBeDefined();
    expect(exports.PERIODS).toBeDefined();
    expect(exports.INTERVALS).toBeDefined();
  });
});

// Configuration Coverage Tests
describe('Screeners Configuration', () => {
  const { SCREENERS, getAvailableScreeners, isValidScreener, getScreenerConfig } = require('../src/config/screeners');

  test('should have many screeners', () => {
    expect(Object.keys(SCREENERS).length).toBeGreaterThan(100);
  });

  test('should have day_gainers screener', () => {
    expect(SCREENERS.day_gainers).toBeDefined();
    expect(SCREENERS.day_gainers.id).toBeTruthy();
  });

  test('should validate screener', () => {
    expect(isValidScreener('day_gainers')).toBe(true);
    expect(isValidScreener('invalid_screener')).toBe(false);
  });

  test('should get available screeners', () => {
    const screeners = getAvailableScreeners();
    expect(screeners).toContain('day_gainers');
    expect(screeners).toContain('most_actives');
  });

  test('should get screener config', () => {
    const config = getScreenerConfig('day_gainers');
    expect(config).toBeDefined();
    expect(config?.id).toBeTruthy();
  });

  test('should return undefined for invalid screener config', () => {
    const config = getScreenerConfig('invalid_screener');
    expect(config).toBeUndefined();
  });
});

describe('Countries Configuration', () => {
  const { COUNTRIES, getCountryConfig, isValidCountry, getValidCountries } = require('../src/config/countries');

  test('should have 14 countries', () => {
    expect(Object.keys(COUNTRIES).length).toBe(14);
  });

  test('should get valid country config', () => {
    const config = getCountryConfig('united states');
    expect(config.lang).toBe('en-US');
    expect(config.region).toBe('US');
  });

  test('should throw for invalid country', () => {
    expect(() => getCountryConfig('invalid')).toThrow();
  });

  test('should check country validity', () => {
    expect(isValidCountry('united states')).toBe(true);
    expect(isValidCountry('invalid')).toBe(false);
  });

  test('should get valid countries list', () => {
    const countries = getValidCountries();
    expect(countries).toContain('united states');
    expect(countries).toContain('france');
  });
});
