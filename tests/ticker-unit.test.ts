/**
 * Ticker Unit Tests with Proper Mocking
 * Tests actual Ticker methods by mocking axios at module level
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

import { Ticker } from '../src/core/Ticker';

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

describe('Ticker - Unit Tests with Mocked HTTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock for crumb endpoint
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

  describe('Initialization', () => {
    test('should create ticker and set symbols', () => {
      const ticker = new Ticker('AAPL');
      expect(ticker.symbols).toEqual(['AAPL']);
    });

    test('should parse multiple symbols from string', () => {
      const ticker = new Ticker('AAPL MSFT GOOG');
      expect(ticker.symbols).toEqual(['AAPL', 'MSFT', 'GOOG']);
    });

    test('should accept array of symbols', () => {
      const ticker = new Ticker(['AAPL', 'MSFT']);
      expect(ticker.symbols).toEqual(['AAPL', 'MSFT']);
    });

    test('should allow updating symbols', () => {
      const ticker = new Ticker('AAPL');
      ticker.symbols = 'MSFT GOOG';
      expect(ticker.symbols).toEqual(['MSFT', 'GOOG']);
    });

    test('should set country from options', () => {
      const ticker = new Ticker('AAPL', { country: 'france' });
      expect(ticker.country).toBe('france');
    });

    test('should allow changing country', () => {
      const ticker = new Ticker('AAPL');
      ticker.country = 'germany';
      expect(ticker.country).toBe('germany');
    });

    test('should throw for invalid country', () => {
      expect(() => new Ticker('AAPL', { country: 'invalid' })).toThrow();
    });
  });

  describe('Quote Summary - getPrice', () => {
    test('should call quote summary endpoint for price', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: [
                {
                  price: {
                    regularMarketPrice: { raw: 150.5 },
                    symbol: 'AAPL',
                  },
                },
              ],
              error: null,
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getPrice();
      expect(result).toBeDefined();
    });

    test('should handle API error in getPrice', async () => {
      const ticker = new Ticker('INVALID');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: null,
              error: {
                code: 'Not Found',
                description: 'Quote not found',
              },
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getPrice();
      expect(result).toBeDefined();
    });
  });

  describe('Quote Summary - getSummaryDetail', () => {
    test('should fetch summary detail', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: [
                {
                  summaryDetail: {
                    marketCap: { raw: 2500000000000 },
                    trailingPE: { raw: 28.5 },
                  },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getSummaryDetail();
      expect(result).toBeDefined();
    });
  });

  describe('Quote Summary - getAssetProfile', () => {
    test('should fetch asset profile', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: [
                {
                  assetProfile: {
                    industry: 'Consumer Electronics',
                    sector: 'Technology',
                    fullTimeEmployees: 164000,
                  },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getAssetProfile();
      expect(result).toBeDefined();
    });
  });

  describe('Quote Summary - getAllModules', () => {
    test('should fetch all quote summary modules', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: [
                {
                  price: { regularMarketPrice: { raw: 150 } },
                  summaryDetail: { marketCap: { raw: 2500000000000 } },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getAllModules();
      expect(result).toBeDefined();
    });
  });

  describe('Quote Summary - getModules', () => {
    test('should fetch specific modules', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: [
                {
                  price: { regularMarketPrice: { raw: 150 } },
                  summaryDetail: { marketCap: { raw: 2500000000000 } },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getModules(['price', 'summaryDetail']);
      expect(result).toBeDefined();
    });

    test('should throw for invalid modules', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({}));
      });

      await expect(ticker.getModules(['invalidModule'])).rejects.toThrow('Invalid modules');
    });
  });

  describe('Historical Data - getHistory', () => {
    test('should fetch historical data with default params', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('chart')) {
          return Promise.resolve(mockResponse({
            chart: {
              result: [
                {
                  meta: { symbol: 'AAPL', exchangeTimezoneName: 'America/New_York' },
                  timestamp: [1704067200, 1704153600],
                  indicators: {
                    quote: [
                      {
                        open: [150, 151],
                        high: [151.5, 152.5],
                        low: [149.5, 150.5],
                        close: [151, 152],
                        volume: [1000000, 1100000],
                      },
                    ],
                    adjclose: [{ adjclose: [150.9, 151.9] }],
                  },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getHistory();
      expect(result).toBeDefined();
      expect(result.AAPL).toBeDefined();
    });

    test('should fetch historical data with custom period', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('chart')) {
          return Promise.resolve(mockResponse({
            chart: {
              result: [
                {
                  meta: { symbol: 'AAPL' },
                  timestamp: [1704067200],
                  indicators: {
                    quote: [{ open: [150], high: [151], low: [149], close: [150.5], volume: [1000000] }],
                  },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getHistory({ period: '1mo', interval: '1d' });
      expect(result).toBeDefined();
    });

    test('should fetch historical data with start/end dates', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('chart')) {
          return Promise.resolve(mockResponse({
            chart: {
              result: [
                {
                  meta: { symbol: 'AAPL' },
                  timestamp: [1704067200],
                  indicators: {
                    quote: [{ open: [150], high: [151], low: [149], close: [150.5], volume: [1000000] }],
                  },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getHistory({ start: '2024-01-01', end: '2024-01-31' });
      expect(result).toBeDefined();
    });

    test('should throw for invalid interval', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({}));
      });

      await expect(ticker.getHistory({ interval: 'invalid' as string })).rejects.toThrow('Invalid interval');
    });
  });

  describe('Financial Statements', () => {
    test('should fetch income statement', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('fundamentals')) {
          return Promise.resolve(mockResponse({
            timeseries: {
              result: [
                {
                  meta: { symbol: ['AAPL'] },
                  annualTotalRevenue: [{ raw: 365000000000 }],
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getIncomeStatement();
      expect(result).toBeDefined();
    });

    test('should fetch quarterly income statement', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('fundamentals')) {
          return Promise.resolve(mockResponse({
            timeseries: {
              result: [{ meta: { symbol: ['AAPL'] } }],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getIncomeStatement('q');
      expect(result).toBeDefined();
    });

    test('should fetch balance sheet', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('fundamentals')) {
          return Promise.resolve(mockResponse({
            timeseries: {
              result: [{ meta: { symbol: ['AAPL'] } }],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getBalanceSheet();
      expect(result).toBeDefined();
    });

    test('should fetch cash flow statement', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('fundamentals')) {
          return Promise.resolve(mockResponse({
            timeseries: {
              result: [{ meta: { symbol: ['AAPL'] } }],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getCashFlow();
      expect(result).toBeDefined();
    });

    test('should fetch valuation measures', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('fundamentals')) {
          return Promise.resolve(mockResponse({
            timeseries: {
              result: [{ meta: { symbol: ['AAPL'] } }],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getValuationMeasures();
      expect(result).toBeDefined();
    });
  });

  describe('Options', () => {
    test('should fetch option chain', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('options')) {
          return Promise.resolve(mockResponse({
            optionChain: {
              result: [
                {
                  underlyingSymbol: 'AAPL',
                  expirationDates: [1705622400],
                  strikes: [150, 155, 160],
                  options: [
                    {
                      expirationDate: 1705622400,
                      calls: [{ strike: 150, lastPrice: 5.5 }],
                      puts: [{ strike: 150, lastPrice: 2.5 }],
                    },
                  ],
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getOptionChain();
      expect(result).toBeDefined();
    });
  });

  describe('Additional Methods', () => {
    test('should fetch quotes', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quote')) {
          return Promise.resolve(mockResponse({
            quoteResponse: {
              result: [
                { symbol: 'AAPL', regularMarketPrice: 150 },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getQuotes();
      expect(result).toBeDefined();
    });

    test('should fetch recommendations', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('recommend')) {
          return Promise.resolve(mockResponse({
            finance: {
              result: [{ symbol: 'AAPL', recommendedSymbols: ['MSFT', 'GOOG'] }],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getRecommendations();
      expect(result).toBeDefined();
    });

    test('should fetch technical insights', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('insights')) {
          return Promise.resolve(mockResponse({
            finance: {
              result: { technicalEvents: {} },
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getTechnicalInsights();
      expect(result).toBeDefined();
    });

    test('should fetch news', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('news')) {
          return Promise.resolve(mockResponse({
            news: {
              result: [
                { uuid: '1', title: 'Apple News' },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getNews(10);
      expect(result).toBeDefined();
    });
  });

  describe('Fund Methods', () => {
    test('should fetch fund holding info', async () => {
      const ticker = new Ticker('SPY');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: [
                {
                  topHoldings: {
                    holdings: [{ symbol: 'AAPL', holdingPercent: { raw: 0.07 } }],
                  },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getFundHoldingInfo();
      expect(result).toBeDefined();
    });

    test('should fetch fund top holdings', async () => {
      const ticker = new Ticker('SPY');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: [
                {
                  topHoldings: {
                    holdings: [{ symbol: 'AAPL' }],
                    sectorWeightings: [{ technology: 0.28 }],
                  },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getFundTopHoldings();
      expect(result).toBeDefined();
    });

    test('should fetch fund performance', async () => {
      const ticker = new Ticker('SPY');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: [
                {
                  fundPerformance: {
                    trailingReturns: { ytd: { raw: 0.15 } },
                  },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getFundPerformance();
      expect(result).toBeDefined();
    });
  });

  describe('Validation', () => {
    test('should validate symbols', async () => {
      const ticker = new Ticker('AAPL');

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('validation')) {
          return Promise.resolve(mockResponse({
            symbolsValidation: {
              result: [{ AAPL: { valid: true } }],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.validateSymbols();
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(result.invalid).toBeDefined();
    });
  });

  describe('Multiple Symbols', () => {
    test('should handle multiple symbols', async () => {
      const ticker = new Ticker(['AAPL', 'MSFT']);

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        if (url.includes('quoteSummary')) {
          const symbol = url.includes('AAPL') ? 'AAPL' : 'MSFT';
          return Promise.resolve(mockResponse({
            quoteSummary: {
              result: [
                {
                  price: { regularMarketPrice: { raw: symbol === 'AAPL' ? 150 : 380 } },
                },
              ],
            },
          }));
        }
        return Promise.resolve(mockResponse({}));
      });

      const result = await ticker.getPrice();
      expect(result).toBeDefined();
    });
  });
});
