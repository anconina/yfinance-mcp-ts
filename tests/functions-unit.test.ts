/**
 * Misc Functions Unit Tests with Proper Mocking
 */

// Mock axios before imports
const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      get: mockGet,
      post: mockPost,
      defaults: { jar: null },
    })),
  };
});

jest.mock('axios-cookiejar-support', () => ({
  wrapper: jest.fn((instance) => instance),
}));

import {
  search,
  getCurrencies,
  getMarketSummary,
  getTrending,
  getValidCountries,
} from '../src/misc/functions';

// Helper to create a mock axios response
function mockResponse<T>(data: T) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    request: {},
  };
}

describe('Misc Functions - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGet.mockImplementation((url: string) => {
      if (url.includes('getcrumb')) {
        return Promise.resolve(mockResponse('mock_crumb_value'));
      }
      if (url.includes('finance.yahoo.com')) {
        return Promise.resolve(mockResponse('<html></html>'));
      }
      return Promise.resolve(mockResponse({}));
    });
  });

  describe('search', () => {
    test('should search for a symbol', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('search')) {
          return Promise.resolve(mockResponse({
            quotes: [
              {
                symbol: 'AAPL',
                shortname: 'Apple Inc.',
                longname: 'Apple Inc.',
                exchange: 'NASDAQ',
                quoteType: 'EQUITY',
              },
            ],
            news: [],
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await search('AAPL');
      expect(result).toBeDefined();
    });

    test('should return first quote when firstQuote is true', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('search')) {
          return Promise.resolve(mockResponse({
            quotes: [
              { symbol: 'AAPL', shortname: 'Apple Inc.' },
              { symbol: 'AAPL.MX', shortname: 'Apple Inc.' },
            ],
            news: [],
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await search('AAPL', { firstQuote: true });
      expect(result).toBeDefined();
    });

    test('should search with custom country', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('search')) {
          return Promise.resolve(mockResponse({
            quotes: [{ symbol: 'BMW.DE', shortname: 'BMW' }],
            news: [],
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await search('BMW', { country: 'germany' });
      expect(result).toBeDefined();
    });

    test('should search with custom quotes count', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('search')) {
          return Promise.resolve(mockResponse({
            quotes: [],
            news: [],
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await search('AAPL', { quotesCount: 5 });
      expect(result).toBeDefined();
    });

    test('should search with custom news count', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('search')) {
          return Promise.resolve(mockResponse({
            quotes: [{ symbol: 'AAPL' }],
            news: [
              { uuid: '1', title: 'Apple News 1' },
              { uuid: '2', title: 'Apple News 2' },
            ],
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await search('AAPL', { newsCount: 5 });
      expect(result).toBeDefined();
    });

    test('should handle empty search results', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('search')) {
          return Promise.resolve(mockResponse({
            quotes: [],
            news: [],
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await search('NONEXISTENT_SYMBOL_XYZ');
      expect(result).toBeDefined();
    });
  });

  describe('getCurrencies', () => {
    test('should fetch currencies', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('currencies')) {
          return Promise.resolve(mockResponse({
            currencies: {
              result: [
                { shortName: 'USD', longName: 'US Dollar', symbol: '$' },
                { shortName: 'EUR', longName: 'Euro', symbol: '€' },
                { shortName: 'GBP', longName: 'British Pound', symbol: '£' },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await getCurrencies();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should return empty array on error', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('currencies')) {
          return Promise.resolve(mockResponse({}));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await getCurrencies();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getMarketSummary', () => {
    test('should fetch market summary', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('marketSummary')) {
          return Promise.resolve(mockResponse({
            marketSummaryResponse: {
              result: [
                {
                  symbol: '^DJI',
                  shortName: 'Dow Jones Industrial Average',
                  regularMarketPrice: { raw: 38000, fmt: '38,000' },
                },
                {
                  symbol: '^GSPC',
                  shortName: 'S&P 500',
                  regularMarketPrice: { raw: 4800, fmt: '4,800' },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await getMarketSummary();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should fetch market summary for specific country', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('marketSummary')) {
          return Promise.resolve(mockResponse({
            marketSummaryResponse: {
              result: [
                { symbol: '^GDAXI', shortName: 'DAX' },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await getMarketSummary('germany');
      expect(result).toBeDefined();
    });

    test('should return empty array on error', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('marketSummary')) {
          return Promise.resolve(mockResponse({}));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await getMarketSummary();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTrending', () => {
    test('should fetch trending stocks', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('trending')) {
          return Promise.resolve(mockResponse({
            finance: {
              result: [
                {
                  count: 5,
                  quotes: [
                    { symbol: 'AAPL' },
                    { symbol: 'TSLA' },
                    { symbol: 'NVDA' },
                    { symbol: 'MSFT' },
                    { symbol: 'AMZN' },
                  ],
                  jobTimestamp: 1704067200,
                  startInterval: 1704060000,
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await getTrending();
      expect(result).toBeDefined();
    });

    test('should fetch trending for specific country', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('trending')) {
          return Promise.resolve(mockResponse({
            finance: {
              result: [
                {
                  count: 3,
                  quotes: [
                    { symbol: 'BMW.DE' },
                    { symbol: 'SAP.DE' },
                    { symbol: 'VOW3.DE' },
                  ],
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await getTrending('germany');
      expect(result).toBeDefined();
    });

    test('should return null on error', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('trending')) {
          return Promise.resolve(mockResponse({}));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await getTrending();
      expect(result).toBeNull();
    });
  });

  describe('getValidCountries', () => {
    test('should return list of valid countries', () => {
      const countries = getValidCountries();
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBe(14);
    });

    test('should include united states', () => {
      const countries = getValidCountries();
      expect(countries).toContain('united states');
    });

    test('should include major markets', () => {
      const countries = getValidCountries();
      expect(countries).toContain('united kingdom');
      expect(countries).toContain('germany');
      expect(countries).toContain('france');
      expect(countries).toContain('canada');
    });

    test('should include asian markets', () => {
      const countries = getValidCountries();
      expect(countries).toContain('hong kong');
      expect(countries).toContain('singapore');
      expect(countries).toContain('taiwan');
      expect(countries).toContain('india');
    });
  });
});
