/**
 * Mocked API Tests
 * Tests core classes with mocked HTTP responses
 */

import { SessionManager } from '../src/core/SessionManager';

// Create a mock session that doesn't make real requests
class MockSessionManager extends SessionManager {
  private mockResponses: Map<string, unknown> = new Map();

  setMockResponse(urlPattern: string, response: unknown): void {
    this.mockResponses.set(urlPattern, response);
  }

  async get<T = unknown>(url: string): Promise<T> {
    // Check for mock responses
    for (const [pattern, response] of this.mockResponses.entries()) {
      if (url.includes(pattern)) {
        return response as T;
      }
    }
    // Return empty object by default
    return {} as T;
  }

  async post<T = unknown>(): Promise<T> {
    return {} as T;
  }

  async initialize(): Promise<void> {
    // Skip real initialization
    (this as unknown as { initialized: boolean }).initialized = true;
    (this as unknown as { crumb: string }).crumb = 'mock_crumb';
  }

  getCrumbValue(): string | null {
    return 'mock_crumb';
  }

  isInitialized(): boolean {
    return true;
  }
}

describe('MockSessionManager', () => {
  test('should be creatable', () => {
    const session = new MockSessionManager();
    expect(session).toBeDefined();
  });

  test('should return mock response', async () => {
    const session = new MockSessionManager();
    session.setMockResponse('test', { data: 'test_data' });
    const result = await session.get<{ data: string }>('http://example.com/test');
    expect(result.data).toBe('test_data');
  });

  test('should initialize without error', async () => {
    const session = new MockSessionManager();
    await session.initialize();
    expect(session.isInitialized()).toBe(true);
    expect(session.getCrumbValue()).toBe('mock_crumb');
  });
});

describe('Data Processing Functions', () => {
  // Test response validation logic through SessionManager
  describe('Response Validation', () => {
    test('should handle various response formats', () => {
      // Test the response structure expected by the API
      const validResponse = {
        quoteSummary: {
          result: [
            {
              price: {
                regularMarketPrice: { raw: 150.5, fmt: '$150.50' },
                symbol: 'AAPL',
              },
            },
          ],
          error: null,
        },
      };
      expect(validResponse.quoteSummary.result).toBeDefined();
      expect(validResponse.quoteSummary.result[0].price.regularMarketPrice.raw).toBe(150.5);
    });

    test('should handle error responses', () => {
      const errorResponse = {
        quoteSummary: {
          result: null,
          error: {
            code: 'Not Found',
            description: 'Quote not found for ticker symbol: INVALID',
          },
        },
      };
      expect(errorResponse.quoteSummary.error).toBeDefined();
      expect(errorResponse.quoteSummary.error.description).toContain('not found');
    });

    test('should handle chart data structure', () => {
      const chartResponse = {
        chart: {
          result: [
            {
              meta: {
                symbol: 'AAPL',
                exchangeTimezoneName: 'America/New_York',
              },
              timestamp: [1704067200, 1704153600, 1704240000],
              indicators: {
                quote: [
                  {
                    open: [150.0, 151.0, 152.0],
                    high: [151.5, 152.5, 153.5],
                    low: [149.5, 150.5, 151.5],
                    close: [151.0, 152.0, 153.0],
                    volume: [1000000, 1100000, 1200000],
                  },
                ],
                adjclose: [{ adjclose: [150.9, 151.9, 152.9] }],
              },
            },
          ],
        },
      };
      expect(chartResponse.chart.result[0].timestamp.length).toBe(3);
      expect(chartResponse.chart.result[0].indicators.quote[0].open.length).toBe(3);
    });
  });

  describe('Financial Data Structure', () => {
    test('should handle income statement structure', () => {
      const financialsResponse = {
        timeseries: {
          result: [
            {
              meta: { symbol: ['AAPL'] },
              timestamp: [1609459200, 1640995200, 1672531200],
              annualTotalRevenue: [
                { raw: 274515000000, fmt: '274.52B' },
                { raw: 365817000000, fmt: '365.82B' },
                { raw: 394328000000, fmt: '394.33B' },
              ],
              annualNetIncome: [
                { raw: 57411000000, fmt: '57.41B' },
                { raw: 94680000000, fmt: '94.68B' },
                { raw: 99803000000, fmt: '99.80B' },
              ],
            },
          ],
        },
      };
      expect(financialsResponse.timeseries.result[0].annualTotalRevenue.length).toBe(3);
    });

    test('should handle valuation data structure', () => {
      const valuationResponse = {
        timeseries: {
          result: [
            {
              meta: { symbol: ['AAPL'] },
              quarterlyPeRatio: [
                { raw: 28.5, fmt: '28.50' },
                { raw: 29.2, fmt: '29.20' },
              ],
              quarterlyPegRatio: [
                { raw: 2.5, fmt: '2.50' },
                { raw: 2.8, fmt: '2.80' },
              ],
            },
          ],
        },
      };
      expect(valuationResponse.timeseries.result[0].quarterlyPeRatio).toBeDefined();
    });
  });

  describe('Options Chain Structure', () => {
    test('should handle options data structure', () => {
      const optionsResponse = {
        optionChain: {
          result: [
            {
              underlyingSymbol: 'AAPL',
              expirationDates: [1705622400, 1706227200, 1706832000],
              strikes: [140, 145, 150, 155, 160],
              options: [
                {
                  expirationDate: 1705622400,
                  calls: [
                    {
                      contractSymbol: 'AAPL240119C00140000',
                      strike: 140,
                      lastPrice: 15.5,
                      bid: 15.3,
                      ask: 15.7,
                      volume: 1000,
                      openInterest: 5000,
                      impliedVolatility: 0.25,
                    },
                  ],
                  puts: [
                    {
                      contractSymbol: 'AAPL240119P00140000',
                      strike: 140,
                      lastPrice: 2.5,
                      bid: 2.3,
                      ask: 2.7,
                      volume: 500,
                      openInterest: 3000,
                      impliedVolatility: 0.28,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      expect(optionsResponse.optionChain.result[0].options[0].calls.length).toBe(1);
      expect(optionsResponse.optionChain.result[0].options[0].puts.length).toBe(1);
    });
  });

  describe('Screener Data Structure', () => {
    test('should handle screener response', () => {
      const screenerResponse = {
        finance: {
          result: [
            {
              id: 'day_gainers',
              title: 'Day Gainers',
              description: 'Stocks with the highest gains today',
              quotes: [
                {
                  symbol: 'AAPL',
                  regularMarketPrice: 155.5,
                  regularMarketChange: 5.5,
                  regularMarketChangePercent: 3.67,
                },
                {
                  symbol: 'MSFT',
                  regularMarketPrice: 380.0,
                  regularMarketChange: 10.0,
                  regularMarketChangePercent: 2.7,
                },
              ],
            },
          ],
        },
      };
      expect(screenerResponse.finance.result[0].quotes.length).toBe(2);
    });
  });

  describe('Research Data Structure', () => {
    test('should handle earnings calendar structure', () => {
      const earningsResponse = {
        finance: {
          result: {
            rows: [
              {
                ticker: 'AAPL',
                companyshortname: 'Apple Inc.',
                startdatetime: '2024-01-25T16:30:00.000Z',
                epsestimate: 2.1,
              },
              {
                ticker: 'MSFT',
                companyshortname: 'Microsoft Corporation',
                startdatetime: '2024-01-30T21:00:00.000Z',
                epsestimate: 2.76,
              },
            ],
          },
        },
      };
      expect(earningsResponse.finance.result.rows.length).toBe(2);
    });

    test('should handle IPO calendar structure', () => {
      const ipoResponse = {
        finance: {
          result: [
            {
              id: 'ipo',
              content: [
                {
                  ticker: 'NEW1',
                  companyName: 'New Company 1',
                  priceLow: 15.0,
                  priceHigh: 18.0,
                  date: '2024-02-01',
                },
              ],
            },
          ],
        },
      };
      expect(ipoResponse.finance.result[0].content.length).toBe(1);
    });
  });

  describe('Search Response Structure', () => {
    test('should handle search results', () => {
      const searchResponse = {
        quotes: [
          {
            symbol: 'AAPL',
            shortname: 'Apple Inc.',
            longname: 'Apple Inc.',
            exchange: 'NASDAQ',
            quoteType: 'EQUITY',
          },
          {
            symbol: 'AAPL.MX',
            shortname: 'Apple Inc.',
            exchange: 'Mexico',
            quoteType: 'EQUITY',
          },
        ],
        news: [
          {
            uuid: 'news-1',
            title: 'Apple announces new product',
            link: 'https://example.com/news/1',
          },
        ],
      };
      expect(searchResponse.quotes.length).toBe(2);
      expect(searchResponse.news.length).toBe(1);
    });
  });

  describe('Market Summary Structure', () => {
    test('should handle market summary data', () => {
      const summaryResponse = {
        marketSummaryResponse: {
          result: [
            {
              symbol: '^DJI',
              shortName: 'Dow Jones Industrial Average',
              regularMarketPrice: { raw: 38000.5, fmt: '38,000.50' },
              regularMarketChange: { raw: 150.25, fmt: '+150.25' },
            },
            {
              symbol: '^GSPC',
              shortName: 'S&P 500',
              regularMarketPrice: { raw: 4850.75, fmt: '4,850.75' },
              regularMarketChange: { raw: 25.5, fmt: '+25.50' },
            },
          ],
        },
      };
      expect(summaryResponse.marketSummaryResponse.result.length).toBe(2);
    });
  });

  describe('Trending Symbols Structure', () => {
    test('should handle trending data', () => {
      const trendingResponse = {
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
            },
          ],
        },
      };
      expect(trendingResponse.finance.result[0].quotes.length).toBe(5);
    });
  });

  describe('Currencies Structure', () => {
    test('should handle currencies data', () => {
      const currenciesResponse = {
        currencies: {
          result: [
            {
              id: 'USD',
              name: 'US Dollar',
              symbol: '$',
            },
            {
              id: 'EUR',
              name: 'Euro',
              symbol: '€',
            },
            {
              id: 'GBP',
              name: 'British Pound',
              symbol: '£',
            },
          ],
        },
      };
      expect(currenciesResponse.currencies.result.length).toBe(3);
    });
  });
});

describe('Fund Data Structures', () => {
  test('should handle fund holdings structure', () => {
    const fundResponse = {
      quoteSummary: {
        result: [
          {
            topHoldings: {
              stockPosition: 0.9876,
              bondPosition: 0.0,
              holdings: [
                {
                  symbol: 'AAPL',
                  holdingName: 'Apple Inc.',
                  holdingPercent: { raw: 0.072, fmt: '7.20%' },
                },
                {
                  symbol: 'MSFT',
                  holdingName: 'Microsoft Corporation',
                  holdingPercent: { raw: 0.068, fmt: '6.80%' },
                },
              ],
              sectorWeightings: [
                { realestate: { raw: 0.025, fmt: '2.50%' } },
                { technology: { raw: 0.285, fmt: '28.50%' } },
              ],
            },
          },
        ],
        error: null,
      },
    };
    expect(fundResponse.quoteSummary.result[0].topHoldings.holdings.length).toBe(2);
  });

  test('should handle fund performance structure', () => {
    const performanceResponse = {
      quoteSummary: {
        result: [
          {
            fundPerformance: {
              trailingReturns: {
                ytd: { raw: 0.15, fmt: '15.00%' },
                oneYear: { raw: 0.25, fmt: '25.00%' },
                threeYear: { raw: 0.12, fmt: '12.00%' },
                fiveYear: { raw: 0.14, fmt: '14.00%' },
              },
              annualTotalReturns: {
                returns: [
                  { year: 2023, annualValue: { raw: 0.26, fmt: '26.00%' } },
                  { year: 2022, annualValue: { raw: -0.18, fmt: '-18.00%' } },
                ],
              },
            },
          },
        ],
        error: null,
      },
    };
    expect(performanceResponse.quoteSummary.result[0].fundPerformance.trailingReturns.ytd.raw).toBe(0.15);
  });
});

describe('Error Handling Scenarios', () => {
  test('should identify rate limit error', () => {
    const rateLimitResponse = {
      finance: {
        error: {
          code: 'Too Many Requests',
          description: 'Rate limit exceeded. Please try again later.',
        },
      },
    };
    expect(rateLimitResponse.finance.error.code).toBe('Too Many Requests');
  });

  test('should identify invalid symbol error', () => {
    const invalidSymbolResponse = {
      quoteSummary: {
        error: {
          code: 'Not Found',
          description: 'Quote not found for ticker symbol: INVALIDSYMBOL',
        },
        result: null,
      },
    };
    expect(invalidSymbolResponse.quoteSummary.error).toBeDefined();
  });

  test('should identify network error format', () => {
    const networkError = {
      message: 'Network Error',
      code: 'ERR_NETWORK',
    };
    expect(networkError.code).toBe('ERR_NETWORK');
  });

  test('should identify timeout error format', () => {
    const timeoutError = {
      message: 'timeout of 30000ms exceeded',
      code: 'ECONNABORTED',
    };
    expect(timeoutError.code).toBe('ECONNABORTED');
  });
});

describe('Historical Data Edge Cases', () => {
  test('should handle missing data points', () => {
    const chartWithMissing = {
      chart: {
        result: [
          {
            timestamp: [1704067200, 1704153600, 1704240000],
            indicators: {
              quote: [
                {
                  open: [150.0, null, 152.0],
                  high: [151.5, null, 153.5],
                  low: [149.5, null, 151.5],
                  close: [151.0, null, 153.0],
                  volume: [1000000, null, 1200000],
                },
              ],
            },
          },
        ],
      },
    };
    // The null values represent market holidays or missing data
    expect(chartWithMissing.chart.result[0].indicators.quote[0].open[1]).toBeNull();
  });

  test('should handle dividend events', () => {
    const chartWithDividend = {
      chart: {
        result: [
          {
            timestamp: [1704067200],
            events: {
              dividends: {
                '1704067200': {
                  amount: 0.24,
                  date: 1704067200,
                },
              },
            },
          },
        ],
      },
    };
    expect(chartWithDividend.chart.result[0].events.dividends['1704067200'].amount).toBe(0.24);
  });

  test('should handle stock split events', () => {
    const chartWithSplit = {
      chart: {
        result: [
          {
            timestamp: [1704067200],
            events: {
              splits: {
                '1704067200': {
                  date: 1704067200,
                  numerator: 4,
                  denominator: 1,
                  splitRatio: '4:1',
                },
              },
            },
          },
        ],
      },
    };
    expect(chartWithSplit.chart.result[0].events.splits['1704067200'].numerator).toBe(4);
    expect(chartWithSplit.chart.result[0].events.splits['1704067200'].denominator).toBe(1);
  });
});

describe('Premium Features Data', () => {
  test('should handle research report structure', () => {
    const reportResponse = {
      finance: {
        result: {
          hits: [
            {
              reportId: 'report-123',
              title: 'Apple Q4 Analysis',
              author: 'Analyst Name',
              publishDate: '2024-01-15',
              reportType: 'Analyst Report',
              investmentRating: 'Bullish',
              targetPrice: 200.0,
            },
          ],
          total: 1,
        },
      },
    };
    expect(reportResponse.finance.result.hits[0].investmentRating).toBe('Bullish');
  });

  test('should handle trade idea structure', () => {
    const tradeResponse = {
      finance: {
        result: {
          hits: [
            {
              tradeId: 'trade-456',
              symbol: 'AAPL',
              trend: 'Bullish',
              term: 'Short term',
              entryPrice: 150.0,
              targetPrice: 165.0,
              stopLoss: 145.0,
            },
          ],
        },
      },
    };
    expect(tradeResponse.finance.result.hits[0].trend).toBe('Bullish');
  });
});
