/**
 * MCP Server Tests
 * Tests for the Model Context Protocol server tools
 */

import { z } from 'zod';

// Mock the core modules before importing MCP tools
jest.mock('../src/core/Ticker', () => ({
  Ticker: jest.fn().mockImplementation((symbols) => ({
    symbols: Array.isArray(symbols) ? symbols : symbols.split(' '),
    getPrice: jest.fn().mockResolvedValue({
      AAPL: {
        regularMarketPrice: 150.0,
        regularMarketChange: 2.5,
        regularMarketChangePercent: 0.017,
        marketCap: 2500000000000,
      },
    }),
    getSummaryDetail: jest.fn().mockResolvedValue({
      AAPL: {
        previousClose: 147.5,
        open: 148.0,
        dayLow: 147.0,
        dayHigh: 151.0,
        volume: 50000000,
        averageVolume: 60000000,
        marketCap: 2500000000000,
        trailingPE: 25.5,
        forwardPE: 22.0,
        dividendYield: 0.006,
      },
    }),
    getAssetProfile: jest.fn().mockResolvedValue({
      AAPL: {
        industry: 'Consumer Electronics',
        sector: 'Technology',
        fullTimeEmployees: 160000,
        city: 'Cupertino',
        country: 'United States',
        website: 'https://www.apple.com',
        longBusinessSummary: 'Apple Inc. designs, manufactures, and markets smartphones...',
      },
    }),
    getHistory: jest.fn().mockResolvedValue({
      AAPL: [
        { date: '2024-01-01', open: 145, high: 148, low: 144, close: 147, volume: 50000000 },
        { date: '2024-01-02', open: 147, high: 150, low: 146, close: 149, volume: 55000000 },
      ],
    }),
    getIncomeStatement: jest.fn().mockResolvedValue({
      AAPL: { totalRevenue: 400000000000, netIncome: 100000000000 },
    }),
    getBalanceSheet: jest.fn().mockResolvedValue({
      AAPL: { totalAssets: 350000000000, totalLiabilities: 300000000000 },
    }),
    getCashFlow: jest.fn().mockResolvedValue({
      AAPL: { operatingCashFlow: 120000000000, freeCashFlow: 90000000000 },
    }),
    getAllFinancialData: jest.fn().mockResolvedValue({
      AAPL: {
        incomeStatement: { totalRevenue: 400000000000 },
        balanceSheet: { totalAssets: 350000000000 },
        cashFlow: { operatingCashFlow: 120000000000 },
      },
    }),
    getOptionChain: jest.fn().mockResolvedValue({
      AAPL: {
        calls: [{ strike: 150, lastPrice: 5.0, volume: 1000 }],
        puts: [{ strike: 150, lastPrice: 4.0, volume: 800 }],
        expirationDates: ['2024-01-19', '2024-01-26'],
      },
    }),
    getKeyStats: jest.fn().mockResolvedValue({
      AAPL: {
        forwardPE: 22.0,
        pegRatio: 2.5,
        beta: 1.2,
        trailingEps: 6.0,
        sharesOutstanding: 16000000000,
      },
    }),
    getRecommendationTrend: jest.fn().mockResolvedValue({
      AAPL: {
        strongBuy: 10,
        buy: 20,
        hold: 5,
        sell: 2,
        strongSell: 1,
      },
    }),
    getEarnings: jest.fn().mockResolvedValue({
      AAPL: {
        earningsChart: {
          quarterly: [
            { date: '4Q2023', actual: 2.18, estimate: 2.10 },
          ],
        },
      },
    }),
  })),
  createTicker: jest.fn(),
}));

jest.mock('../src/core/Screener', () => ({
  Screener: jest.fn().mockImplementation(() => ({
    availableScreeners: ['day_gainers', 'day_losers', 'most_actives', 'undervalued_growth_stocks'],
    getScreenerInfo: jest.fn().mockImplementation((name) => {
      if (name === 'day_gainers') {
        return { id: 'day_gainers_id', title: 'Day Gainers', description: 'Stocks with highest gains' };
      }
      return null;
    }),
    getScreeners: jest.fn().mockResolvedValue({
      day_gainers: {
        quotes: [
          { symbol: 'XYZ', regularMarketPrice: 50, regularMarketChangePercent: 15 },
          { symbol: 'ABC', regularMarketPrice: 30, regularMarketChangePercent: 12 },
        ],
      },
    }),
  })),
  createScreener: jest.fn(),
}));

jest.mock('../src/core/Research', () => ({
  Research: jest.fn().mockImplementation(() => ({
    getEarnings: jest.fn().mockResolvedValue({
      rows: [
        { ticker: 'AAPL', companyShortName: 'Apple Inc.', startDateTime: '2024-01-25' },
        { ticker: 'MSFT', companyShortName: 'Microsoft Corp.', startDateTime: '2024-01-30' },
      ],
    }),
    getIPOs: jest.fn().mockResolvedValue({
      rows: [
        { ticker: 'NEWCO', companyName: 'New Company Inc.', pricingDate: '2024-02-01' },
      ],
    }),
    getSplits: jest.fn().mockResolvedValue({
      rows: [
        { ticker: 'SPLIT', companyName: 'Split Corp.', splitDate: '2024-02-15', splitRatio: '2:1' },
      ],
    }),
  })),
  createResearch: jest.fn(),
}));

jest.mock('../src/misc/functions', () => ({
  search: jest.fn().mockResolvedValue({
    quotes: [
      { symbol: 'AAPL', shortname: 'Apple Inc.', quoteType: 'EQUITY' },
      { symbol: 'APLE', shortname: 'Apple Hospitality REIT', quoteType: 'EQUITY' },
    ],
  }),
  getMarketSummary: jest.fn().mockResolvedValue([
    { symbol: '^GSPC', regularMarketPrice: 4800, regularMarketChangePercent: 0.5 },
    { symbol: '^DJI', regularMarketPrice: 38000, regularMarketChangePercent: 0.3 },
  ]),
  getTrending: jest.fn().mockResolvedValue({
    quotes: [
      { symbol: 'NVDA' },
      { symbol: 'TSLA' },
      { symbol: 'AMD' },
    ],
  }),
  getCurrencies: jest.fn().mockResolvedValue([
    { symbol: 'EURUSD=X', regularMarketPrice: 1.08 },
    { symbol: 'GBPUSD=X', regularMarketPrice: 1.27 },
  ]),
  getValidCountries: jest.fn().mockReturnValue([
    'united states', 'france', 'germany', 'united kingdom',
  ]),
}));

// Import MCP tools after mocking
import {
  tickerTools,
  getStockPrice,
  getStockSummary,
  getStockProfile,
  getStockHistory,
  getFinancials,
  getOptions,
  getKeyStats,
  getRecommendations,
  getEarnings,
} from '../src/mcp/tools/ticker';

import {
  screenerTools,
  listScreeners,
  getScreener,
  getScreenerInfo,
} from '../src/mcp/tools/screener';

import {
  researchTools,
  getEarningsCalendar,
  getIPOs,
  getSplits,
} from '../src/mcp/tools/research';

import {
  miscTools,
  searchStocks,
  marketSummary,
  trending,
  currencies,
  countries,
} from '../src/mcp/tools/misc';

describe('MCP Tools', () => {
  describe('Tool Registration', () => {
    test('should have correct number of ticker tools', () => {
      expect(tickerTools.length).toBe(9);
    });

    test('should have correct number of screener tools', () => {
      expect(screenerTools.length).toBe(3);
    });

    test('should have correct number of research tools', () => {
      expect(researchTools.length).toBe(3);
    });

    test('should have correct number of misc tools', () => {
      expect(miscTools.length).toBe(5);
    });

    test('all tools should have required properties', () => {
      const allTools = [...tickerTools, ...screenerTools, ...researchTools, ...miscTools];

      for (const tool of allTools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe('function');
        expect(tool.schema).toBeDefined();
      }
    });

    test('tool names should be unique', () => {
      const allTools = [...tickerTools, ...screenerTools, ...researchTools, ...miscTools];
      const names = allTools.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Ticker Tools', () => {
    test('getStockPrice should return price data', async () => {
      const result = await getStockPrice({ symbols: 'AAPL' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.regularMarketPrice).toBe(150.0);
      expect(parsed.AAPL.marketCap).toBe(2500000000000);
    });

    test('getStockSummary should return summary data', async () => {
      const result = await getStockSummary({ symbols: 'AAPL' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.previousClose).toBe(147.5);
      expect(parsed.AAPL.trailingPE).toBe(25.5);
    });

    test('getStockProfile should return profile data', async () => {
      const result = await getStockProfile({ symbols: 'AAPL' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.industry).toBe('Consumer Electronics');
      expect(parsed.AAPL.sector).toBe('Technology');
    });

    test('getStockHistory should return historical data', async () => {
      const result = await getStockHistory({ symbols: 'AAPL' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(Array.isArray(parsed.AAPL)).toBe(true);
      expect(parsed.AAPL.length).toBe(2);
    });

    test('getStockHistory should accept optional parameters', async () => {
      const result = await getStockHistory({
        symbols: 'AAPL',
        period: '1mo',
        interval: '1d',
        start: '2024-01-01',
        end: '2024-01-31',
      });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
    });

    test('getFinancials should return financial data', async () => {
      const result = await getFinancials({ symbols: 'AAPL' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
    });

    test('getFinancials should handle type parameter', async () => {
      const incomeResult = await getFinancials({ symbols: 'AAPL', type: 'income' });
      expect(JSON.parse(incomeResult).AAPL).toBeDefined();

      const balanceResult = await getFinancials({ symbols: 'AAPL', type: 'balance' });
      expect(JSON.parse(balanceResult).AAPL).toBeDefined();

      const cashflowResult = await getFinancials({ symbols: 'AAPL', type: 'cashflow' });
      expect(JSON.parse(cashflowResult).AAPL).toBeDefined();
    });

    test('getFinancials should handle frequency parameter', async () => {
      const annualResult = await getFinancials({ symbols: 'AAPL', frequency: 'annual' });
      expect(JSON.parse(annualResult).AAPL).toBeDefined();

      const quarterlyResult = await getFinancials({ symbols: 'AAPL', frequency: 'quarterly' });
      expect(JSON.parse(quarterlyResult).AAPL).toBeDefined();
    });

    test('getOptions should return option chain data', async () => {
      const result = await getOptions({ symbol: 'AAPL' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.calls).toBeDefined();
      expect(parsed.AAPL.puts).toBeDefined();
    });

    test('getKeyStats should return key statistics', async () => {
      const result = await getKeyStats({ symbols: 'AAPL' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.forwardPE).toBe(22.0);
      expect(parsed.AAPL.beta).toBe(1.2);
    });

    test('getRecommendations should return analyst recommendations', async () => {
      const result = await getRecommendations({ symbols: 'AAPL' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.strongBuy).toBe(10);
      expect(parsed.AAPL.buy).toBe(20);
    });

    test('getEarnings should return earnings data', async () => {
      const result = await getEarnings({ symbols: 'AAPL' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.earningsChart).toBeDefined();
    });
  });

  describe('Screener Tools', () => {
    test('listScreeners should return available screeners', async () => {
      const result = await listScreeners();
      const parsed = JSON.parse(result);

      expect(parsed.all).toBeDefined();
      expect(Array.isArray(parsed.all)).toBe(true);
      expect(parsed.all).toContain('day_gainers');
    });

    test('getScreener should return screener results', async () => {
      const result = await getScreener({ screener: 'day_gainers' });
      const parsed = JSON.parse(result);

      expect(parsed.day_gainers).toBeDefined();
      expect(parsed.day_gainers.quotes).toBeDefined();
    });

    test('getScreener should accept count parameter', async () => {
      const result = await getScreener({ screener: 'day_gainers', count: 10 });
      const parsed = JSON.parse(result);

      expect(parsed.day_gainers).toBeDefined();
    });

    test('getScreenerInfo should return screener details', async () => {
      const result = await getScreenerInfo({ screener: 'day_gainers' });
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe('day_gainers_id');
      expect(parsed.title).toBe('Day Gainers');
    });

    test('getScreenerInfo should handle invalid screener', async () => {
      const result = await getScreenerInfo({ screener: 'invalid_screener' });
      const parsed = JSON.parse(result);

      expect(parsed.error).toBeDefined();
      expect(parsed.hint).toContain('list_screeners');
    });
  });

  describe('Research Tools', () => {
    test('getEarningsCalendar should return earnings calendar', async () => {
      const result = await getEarningsCalendar({});
      const parsed = JSON.parse(result);

      expect(parsed.rows).toBeDefined();
      expect(Array.isArray(parsed.rows)).toBe(true);
    });

    test('getEarningsCalendar should accept date parameters', async () => {
      const result = await getEarningsCalendar({
        start: '2024-01-01',
        end: '2024-01-31',
      });
      const parsed = JSON.parse(result);

      expect(parsed.rows).toBeDefined();
    });

    test('getIPOs should return IPO calendar', async () => {
      const result = await getIPOs({});
      const parsed = JSON.parse(result);

      expect(parsed.rows).toBeDefined();
      expect(Array.isArray(parsed.rows)).toBe(true);
    });

    test('getSplits should return stock splits', async () => {
      const result = await getSplits({});
      const parsed = JSON.parse(result);

      expect(parsed.rows).toBeDefined();
      expect(Array.isArray(parsed.rows)).toBe(true);
    });
  });

  describe('Misc Tools', () => {
    test('searchStocks should return search results', async () => {
      const result = await searchStocks({ query: 'Apple' });
      const parsed = JSON.parse(result);

      expect(parsed.quotes).toBeDefined();
      expect(Array.isArray(parsed.quotes)).toBe(true);
      expect(parsed.quotes[0].symbol).toBe('AAPL');
    });

    test('searchStocks should accept limit parameter', async () => {
      const result = await searchStocks({ query: 'Apple', limit: 5 });
      const parsed = JSON.parse(result);

      expect(parsed.quotes).toBeDefined();
    });

    test('marketSummary should return market indices', async () => {
      const result = await marketSummary({});
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].symbol).toBe('^GSPC');
    });

    test('marketSummary should accept country parameter', async () => {
      const result = await marketSummary({ country: 'germany' });
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
    });

    test('trending should return trending stocks', async () => {
      const result = await trending({});
      const parsed = JSON.parse(result);

      expect(parsed.quotes).toBeDefined();
      expect(Array.isArray(parsed.quotes)).toBe(true);
    });

    test('trending should limit results with count parameter', async () => {
      const result = await trending({ count: 2 });
      const parsed = JSON.parse(result);

      expect(parsed.quotes).toBeDefined();
      expect(parsed.quotes.length).toBeLessThanOrEqual(2);
    });

    test('currencies should return currency pairs', async () => {
      const result = await currencies();
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].symbol).toBe('EURUSD=X');
    });

    test('countries should return supported countries', async () => {
      const result = await countries();
      const parsed = JSON.parse(result);

      expect(parsed.count).toBe(4);
      expect(parsed.countries).toContain('united states');
    });
  });

  describe('Schema Validation', () => {
    test('ticker tool schemas should validate correctly', () => {
      for (const tool of tickerTools) {
        expect(() => tool.schema.parse({})).toThrow(); // Should fail without required fields
      }
    });

    test('getStockPrice schema should require symbols', () => {
      const schema = tickerTools.find((t) => t.name === 'get_stock_price')?.schema;
      expect(schema).toBeDefined();

      expect(() => schema!.parse({})).toThrow();
      expect(() => schema!.parse({ symbols: 'AAPL' })).not.toThrow();
    });

    test('getScreener schema should require screener name', () => {
      const schema = screenerTools.find((t) => t.name === 'get_screener')?.schema;
      expect(schema).toBeDefined();

      expect(() => schema!.parse({})).toThrow();
      expect(() => schema!.parse({ screener: 'day_gainers' })).not.toThrow();
    });

    test('searchStocks schema should require query', () => {
      const schema = miscTools.find((t) => t.name === 'search_stocks')?.schema;
      expect(schema).toBeDefined();

      expect(() => schema!.parse({})).toThrow();
      expect(() => schema!.parse({ query: 'Apple' })).not.toThrow();
    });

    test('research tool schemas should allow empty objects', () => {
      for (const tool of researchTools) {
        expect(() => tool.schema.parse({})).not.toThrow();
      }
    });
  });

  describe('Error Handling', () => {
    test('getStockPrice should handle errors gracefully', async () => {
      const { Ticker } = require('../src/core/Ticker');
      Ticker.mockImplementationOnce(() => ({
        getPrice: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      await expect(getStockPrice({ symbols: 'AAPL' })).rejects.toThrow('Failed to get stock price');
    });

    test('getStockSummary should handle errors gracefully', async () => {
      const { Ticker } = require('../src/core/Ticker');
      Ticker.mockImplementationOnce(() => ({
        getSummaryDetail: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      await expect(getStockSummary({ symbols: 'AAPL' })).rejects.toThrow('Failed to get stock summary');
    });

    test('getStockProfile should handle errors gracefully', async () => {
      const { Ticker } = require('../src/core/Ticker');
      Ticker.mockImplementationOnce(() => ({
        getAssetProfile: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      await expect(getStockProfile({ symbols: 'AAPL' })).rejects.toThrow('Failed to get stock profile');
    });

    test('getStockHistory should handle errors gracefully', async () => {
      const { Ticker } = require('../src/core/Ticker');
      Ticker.mockImplementationOnce(() => ({
        getHistory: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      await expect(getStockHistory({ symbols: 'AAPL' })).rejects.toThrow('Failed to get stock history');
    });

    test('getFinancials should handle errors gracefully', async () => {
      const { Ticker } = require('../src/core/Ticker');
      Ticker.mockImplementationOnce(() => ({
        getAllFinancialData: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      await expect(getFinancials({ symbols: 'AAPL' })).rejects.toThrow('Failed to get financials');
    });

    test('getOptions should handle errors gracefully', async () => {
      const { Ticker } = require('../src/core/Ticker');
      Ticker.mockImplementationOnce(() => ({
        getOptionChain: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      await expect(getOptions({ symbol: 'AAPL' })).rejects.toThrow('Failed to get options');
    });

    test('getKeyStats should handle errors gracefully', async () => {
      const { Ticker } = require('../src/core/Ticker');
      Ticker.mockImplementationOnce(() => ({
        getKeyStats: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      await expect(getKeyStats({ symbols: 'AAPL' })).rejects.toThrow('Failed to get key stats');
    });

    test('getRecommendations should handle errors gracefully', async () => {
      const { Ticker } = require('../src/core/Ticker');
      Ticker.mockImplementationOnce(() => ({
        getRecommendationTrend: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      await expect(getRecommendations({ symbols: 'AAPL' })).rejects.toThrow('Failed to get recommendations');
    });

    test('getEarnings should handle errors gracefully', async () => {
      const { Ticker } = require('../src/core/Ticker');
      Ticker.mockImplementationOnce(() => ({
        getEarnings: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      await expect(getEarnings({ symbols: 'AAPL' })).rejects.toThrow('Failed to get earnings');
    });

    test('listScreeners should handle errors gracefully', async () => {
      const { Screener } = require('../src/core/Screener');
      Screener.mockImplementationOnce(() => {
        throw new Error('Screener Error');
      });

      await expect(listScreeners()).rejects.toThrow('Failed to list screeners');
    });

    test('getScreener should handle errors gracefully', async () => {
      const { Screener } = require('../src/core/Screener');
      Screener.mockImplementationOnce(() => ({
        getScreeners: jest.fn().mockRejectedValue(new Error('Screener Error')),
      }));

      await expect(getScreener({ screener: 'day_gainers' })).rejects.toThrow('Failed to get screener data');
    });

    test('getScreenerInfo should handle errors gracefully', async () => {
      const { Screener } = require('../src/core/Screener');
      Screener.mockImplementationOnce(() => {
        throw new Error('Screener Error');
      });

      await expect(getScreenerInfo({ screener: 'day_gainers' })).rejects.toThrow('Failed to get screener info');
    });

    test('getEarningsCalendar should handle errors gracefully', async () => {
      const { Research } = require('../src/core/Research');
      Research.mockImplementationOnce(() => ({
        getEarnings: jest.fn().mockRejectedValue(new Error('Research Error')),
      }));

      await expect(getEarningsCalendar({})).rejects.toThrow('Failed to get earnings calendar');
    });

    test('getIPOs should handle errors gracefully', async () => {
      const { Research } = require('../src/core/Research');
      Research.mockImplementationOnce(() => ({
        getIPOs: jest.fn().mockRejectedValue(new Error('Research Error')),
      }));

      await expect(getIPOs({})).rejects.toThrow('Failed to get IPOs');
    });

    test('getSplits should handle errors gracefully', async () => {
      const { Research } = require('../src/core/Research');
      Research.mockImplementationOnce(() => ({
        getSplits: jest.fn().mockRejectedValue(new Error('Research Error')),
      }));

      await expect(getSplits({})).rejects.toThrow('Failed to get splits');
    });

    test('searchStocks should handle errors gracefully', async () => {
      const { search } = require('../src/misc/functions');
      search.mockRejectedValueOnce(new Error('Search Error'));

      await expect(searchStocks({ query: 'Apple' })).rejects.toThrow('Failed to search stocks');
    });

    test('marketSummary should handle errors gracefully', async () => {
      const { getMarketSummary } = require('../src/misc/functions');
      getMarketSummary.mockRejectedValueOnce(new Error('Market Error'));

      await expect(marketSummary({})).rejects.toThrow('Failed to get market summary');
    });

    test('trending should handle errors gracefully', async () => {
      const { getTrending } = require('../src/misc/functions');
      getTrending.mockRejectedValueOnce(new Error('Trending Error'));

      await expect(trending({})).rejects.toThrow('Failed to get trending stocks');
    });

    test('currencies should handle errors gracefully', async () => {
      const { getCurrencies } = require('../src/misc/functions');
      getCurrencies.mockRejectedValueOnce(new Error('Currency Error'));

      await expect(currencies()).rejects.toThrow('Failed to get currencies');
    });

    test('countries should handle errors gracefully', async () => {
      const { getValidCountries } = require('../src/misc/functions');
      getValidCountries.mockImplementationOnce(() => {
        throw new Error('Countries Error');
      });

      await expect(countries()).rejects.toThrow('Failed to get countries');
    });
  });

  describe('Tool Input Schema Format', () => {
    test('all tools should have valid JSON Schema format', () => {
      const allTools = [...tickerTools, ...screenerTools, ...researchTools, ...miscTools];

      for (const tool of allTools) {
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(typeof tool.inputSchema.properties).toBe('object');
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      }
    });

    test('required fields should exist in properties', () => {
      const allTools = [...tickerTools, ...screenerTools, ...researchTools, ...miscTools];

      for (const tool of allTools) {
        const properties = tool.inputSchema.properties as Record<string, unknown>;
        for (const required of tool.inputSchema.required) {
          expect(properties[required]).toBeDefined();
        }
      }
    });
  });
});
