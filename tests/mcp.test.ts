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
        previousClose: { raw: 147.5, fmt: '147.50' },
        open: { raw: 148.0, fmt: '148.00' },
        dayLow: { raw: 147.0, fmt: '147.00' },
        dayHigh: { raw: 151.0, fmt: '151.00' },
        volume: { raw: 50000000, fmt: '50M' },
        averageVolume: { raw: 60000000, fmt: '60M' },
        marketCap: { raw: 2500000000000, fmt: '2.5T' },
        trailingPE: { raw: 25.5, fmt: '25.50' },
        forwardPE: { raw: 22.0, fmt: '22.00' },
        dividendYield: { raw: 0.006, fmt: '0.60%' },
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
      AAPL: [
        { meta: { symbol: ['AAPL'], type: ['annualTotalRevenue'] }, annualTotalRevenue: [{ asOfDate: '2024-09-28', periodType: '12M', reportedValue: { raw: 400000000000, fmt: '400B' } }, { asOfDate: '2023-09-28', periodType: '12M', reportedValue: { raw: 380000000000, fmt: '380B' } }] },
        { meta: { symbol: ['AAPL'], type: ['annualNetIncome'] }, annualNetIncome: [{ asOfDate: '2024-09-28', periodType: '12M', reportedValue: { raw: 100000000000, fmt: '100B' } }, { asOfDate: '2023-09-28', periodType: '12M', reportedValue: { raw: 95000000000, fmt: '95B' } }] },
      ],
    }),
    getBalanceSheet: jest.fn().mockResolvedValue({
      AAPL: [
        { meta: { symbol: ['AAPL'], type: ['annualTotalAssets'] }, annualTotalAssets: [{ asOfDate: '2024-09-28', periodType: '12M', reportedValue: { raw: 350000000000, fmt: '350B' } }] },
      ],
    }),
    getCashFlow: jest.fn().mockResolvedValue({
      AAPL: [
        { meta: { symbol: ['AAPL'], type: ['annualOperatingCashFlow'] }, annualOperatingCashFlow: [{ asOfDate: '2024-09-28', periodType: '12M', reportedValue: { raw: 120000000000, fmt: '120B' } }] },
      ],
    }),
    getAllFinancialData: jest.fn().mockResolvedValue({
      AAPL: [
        { meta: { symbol: ['AAPL'], type: ['annualTotalRevenue'] }, annualTotalRevenue: [{ asOfDate: '2024-09-28', periodType: '12M', reportedValue: { raw: 400000000000, fmt: '400B' } }, { asOfDate: '2023-09-28', periodType: '12M', reportedValue: { raw: 380000000000, fmt: '380B' } }] },
        { meta: { symbol: ['AAPL'], type: ['annualNetIncome'] }, annualNetIncome: [{ asOfDate: '2024-09-28', periodType: '12M', reportedValue: { raw: 100000000000, fmt: '100B' } }, { asOfDate: '2023-09-28', periodType: '12M', reportedValue: { raw: 95000000000, fmt: '95B' } }] },
        { meta: { symbol: ['AAPL'], type: ['annualTotalAssets'] }, annualTotalAssets: [{ asOfDate: '2024-09-28', periodType: '12M', reportedValue: { raw: 350000000000, fmt: '350B' } }] },
      ],
    }),
    getOptionChain: jest.fn().mockResolvedValue({
      AAPL: {
        calls: [
          { strike: 145, lastPrice: 8.0, bid: 7.8, ask: 8.2, volume: 500, openInterest: 2000, impliedVolatility: 0.30, inTheMoney: true, expiration: new Date('2027-01-15'), optionType: 'call' },
          { strike: 150, lastPrice: 5.0, bid: 4.8, ask: 5.2, volume: 1000, openInterest: 5000, impliedVolatility: 0.28, inTheMoney: false, expiration: new Date('2027-01-15'), optionType: 'call' },
          { strike: 155, lastPrice: 2.5, bid: 2.3, ask: 2.7, volume: 800, openInterest: 3000, impliedVolatility: 0.32, inTheMoney: false, expiration: new Date('2027-01-15'), optionType: 'call' },
        ],
        puts: [
          { strike: 145, lastPrice: 2.0, bid: 1.8, ask: 2.2, volume: 400, openInterest: 1500, impliedVolatility: 0.29, inTheMoney: false, expiration: new Date('2027-01-15'), optionType: 'put' },
          { strike: 150, lastPrice: 4.0, bid: 3.8, ask: 4.2, volume: 800, openInterest: 4000, impliedVolatility: 0.27, inTheMoney: true, expiration: new Date('2027-01-15'), optionType: 'put' },
          { strike: 155, lastPrice: 7.5, bid: 7.3, ask: 7.7, volume: 600, openInterest: 2500, impliedVolatility: 0.31, inTheMoney: true, expiration: new Date('2027-01-15'), optionType: 'put' },
        ],
        underlyingSymbol: 'AAPL',
        expirationDates: [Math.floor(new Date('2027-01-15').getTime() / 1000), Math.floor(new Date('2027-02-19').getTime() / 1000)],
        strikes: [140, 145, 150, 155, 160],
        underlyingPrice: 148.5,
      },
    }),
    getKeyStats: jest.fn().mockResolvedValue({
      AAPL: {
        forwardPE: { raw: 22.0, fmt: '22.00' },
        pegRatio: { raw: 2.5, fmt: '2.50' },
        beta: { raw: 1.2, fmt: '1.20' },
        profitMargins: { raw: 0.265, fmt: '26.5%' },
        trailingEps: { raw: 6.0, fmt: '6.00' },
        sharesOutstanding: { raw: 16000000000, fmt: '16B' },
      },
    }),
    getRecommendationTrend: jest.fn().mockResolvedValue({
      AAPL: {
        trend: [
          { period: '0m', strongBuy: 10, buy: 20, hold: 5, sell: 2, strongSell: 1 },
          { period: '-1m', strongBuy: 9, buy: 18, hold: 6, sell: 3, strongSell: 1 },
        ],
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
          { symbol: 'XYZ', shortName: 'XYZ Corp', regularMarketPrice: 50, regularMarketChange: 6.5, regularMarketChangePercent: 15, regularMarketVolume: 1200000, marketCap: 5000000000 },
          { symbol: 'ABC', shortName: 'ABC Inc', regularMarketPrice: 30, regularMarketChange: 3.2, regularMarketChangePercent: 12, regularMarketVolume: 800000, marketCap: 3000000000 },
        ],
      },
    }),
  })),
  createScreener: jest.fn(),
}));

jest.mock('../src/core/Research', () => ({
  Research: jest.fn().mockImplementation(() => ({
    getEarnings: jest.fn().mockResolvedValue([
      { ticker: 'AAPL', companyshortname: 'Apple Inc.', startdatetime: '2024-01-25', startdatetimetype: 'AMC', epsestimate: 2.10, epsactual: 2.18, epssurprisepct: 3.81 },
      { ticker: 'MSFT', companyshortname: 'Microsoft Corp.', startdatetime: '2024-01-30', startdatetimetype: 'BMO', epsestimate: 2.78, epsactual: 2.93, epssurprisepct: 5.40 },
    ]),
    getIPOs: jest.fn().mockResolvedValue([
      { ticker: 'NEWCO', companyshortname: 'New Co', exchange_short_name: 'NYSE', startdatetime: '2024-02-15', pricefrom: 18, priceto: 22, offerprice: 20, shares: 5000000, dealtype: 'IPO' },
    ]),
    getSplits: jest.fn().mockResolvedValue([
      { ticker: 'NVDA', companyshortname: 'NVIDIA', startdatetime: '2024-06-10', old_share_worth: 1, share_worth: 10 },
    ]),
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
    { symbol: '^GSPC', shortName: 'S&P 500', regularMarketPrice: { raw: 4800, fmt: '4,800.00' }, regularMarketChange: { raw: 24.0, fmt: '24.00' }, regularMarketChangePercent: { raw: 0.5, fmt: '0.50%' } },
    { symbol: '^DJI', shortName: 'Dow 30', regularMarketPrice: { raw: 38000, fmt: '38,000.00' }, regularMarketChange: { raw: 114.0, fmt: '114.00' }, regularMarketChangePercent: { raw: 0.3, fmt: '0.30%' } },
  ]),
  getTrending: jest.fn().mockResolvedValue({
    quotes: [
      { symbol: 'NVDA' },
      { symbol: 'TSLA' },
      { symbol: 'AMD' },
    ],
  }),
  getCurrencies: jest.fn().mockResolvedValue([
    { symbol: 'EURUSD=X', shortName: 'EUR/USD', longName: 'Euro to US Dollar' },
    { symbol: 'GBPUSD=X', shortName: 'GBP/USD', longName: 'British Pound to US Dollar' },
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
    test('getStockPrice should return formatted text by default', async () => {
      const result = await getStockPrice({ symbols: 'AAPL' });
      // Default format is text -- should contain symbol and price data
      expect(result).toContain('AAPL');
      expect(result).toContain('Price Summary');
    });

    test('getStockPrice should return JSON when format=json', async () => {
      const result = await getStockPrice({ symbols: 'AAPL', format: 'json' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      // Fields are normalized: regularMarketPrice -> price, marketCap stays
      expect(parsed.AAPL.price).toBe(150.0);
      expect(parsed.AAPL.marketCap).toBe(2500000000000);
    });

    test('getStockSummary should return formatted text by default', async () => {
      const result = await getStockSummary({ symbols: 'AAPL' });
      // Default format is text -- should contain group labels and formatted values
      expect(result).toContain('Valuation');
      expect(result).toContain('P/E');
      expect(result).toContain('Volume');
    });

    test('getStockSummary should return JSON when format=json', async () => {
      const result = await getStockSummary({ symbols: 'AAPL', format: 'json' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.trailingPE).toBe(25.5);
      expect(parsed.AAPL.volume).toBe(50000000);
    });

    test('getStockProfile should return formatted text by default', async () => {
      const result = await getStockProfile({ symbols: 'AAPL' });
      // Default format is text -- should contain sector/industry info
      expect(result).toContain('Sector: Technology');
      expect(result).toContain('Industry: Consumer Electronics');
      expect(result).toContain('Apple Inc. designs');
    });

    test('getStockProfile should return JSON when format=json', async () => {
      const result = await getStockProfile({ symbols: 'AAPL', format: 'json' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.industry).toBe('Consumer Electronics');
      expect(parsed.AAPL.sector).toBe('Technology');
    });

    test('getStockProfile should include officers when requested', async () => {
      const result = await getStockProfile({ symbols: 'AAPL', include_officers: true });
      // Mock doesn't have officers, but the formatter should still run without error
      expect(result).toContain('Technology');
    });

    test('getStockHistory should return formatted text by default', async () => {
      const result = await getStockHistory({ symbols: 'AAPL' });
      // Default format is text -- should contain symbol and OHLCV table
      expect(result).toContain('AAPL');
      expect(result).toContain('OHLCV');
      expect(result).toContain('|Date|');
    });

    test('getStockHistory should return JSON when format=json', async () => {
      const result = await getStockHistory({ symbols: 'AAPL', format: 'json', aggregate: 'daily' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.symbol).toBe('AAPL');
      expect(Array.isArray(parsed.AAPL.rows)).toBe(true);
      expect(parsed.AAPL.rows.length).toBe(2);
    });

    test('getStockHistory should accept optional parameters', async () => {
      const result = await getStockHistory({
        symbols: 'AAPL',
        period: '1mo',
        interval: '1d',
        start: '2024-01-01',
        end: '2024-01-31',
      });
      // Default text format -- should contain AAPL
      expect(result).toContain('AAPL');
    });

    test('getFinancials should return formatted text by default', async () => {
      const result = await getFinancials({ symbols: 'AAPL' });
      // Default format is text -- should contain section headers or metric table markers
      expect(result).toContain('AAPL');
      expect(result).toContain('Income Statement');
    });

    test('getFinancials should return JSON when format=json', async () => {
      const result = await getFinancials({ symbols: 'AAPL', format: 'json' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
    });

    test('getFinancials should handle type parameter', async () => {
      const incomeResult = await getFinancials({ symbols: 'AAPL', type: 'income' });
      expect(incomeResult).toContain('AAPL');

      const balanceResult = await getFinancials({ symbols: 'AAPL', type: 'balance' });
      expect(balanceResult).toContain('AAPL');

      const cashflowResult = await getFinancials({ symbols: 'AAPL', type: 'cashflow' });
      expect(cashflowResult).toContain('AAPL');
    });

    test('getFinancials should handle detail parameter', async () => {
      const summaryResult = await getFinancials({ symbols: 'AAPL', detail: 'summary' });
      expect(summaryResult).toContain('AAPL');

      const fullResult = await getFinancials({ symbols: 'AAPL', detail: 'full' });
      expect(fullResult).toContain('AAPL');
    });

    test('getFinancials should handle frequency parameter', async () => {
      const annualResult = await getFinancials({ symbols: 'AAPL', frequency: 'annual' });
      expect(annualResult).toContain('AAPL');

      const quarterlyResult = await getFinancials({ symbols: 'AAPL', frequency: 'quarterly' });
      expect(quarterlyResult).toContain('AAPL');
    });

    test('getOptions should return formatted text by default', async () => {
      const result = await getOptions({ symbol: 'AAPL' });
      // Default format is text -- should contain symbol and options data
      expect(result).toContain('AAPL');
      expect(result).toContain('Options Chain');
      expect(result).toContain('Underlying:');
      expect(result).toContain('Calls:');
      expect(result).toContain('|');
    });

    test('getOptions should return JSON when format=json', async () => {
      const result = await getOptions({ symbol: 'AAPL', format: 'json' });
      const parsed = JSON.parse(result);

      expect(parsed.expirations).toBeDefined();
      expect(Array.isArray(parsed.expirations)).toBe(true);
      expect(parsed.underlyingPrice).toBe(148.5);
      expect(parsed.data).toBeDefined();
    });

    test('getOptions should accept filtering parameters', async () => {
      const result = await getOptions({ symbol: 'AAPL', type: 'calls' });
      expect(result).toContain('Calls:');
      expect(result).not.toContain('Puts:');
    });

    test('getKeyStats should return formatted text by default', async () => {
      const result = await getKeyStats({ symbols: 'AAPL' });
      // Default format is text -- should contain group labels
      expect(result).toContain('Valuation');
      expect(result).toContain('Profitability');
    });

    test('getKeyStats should return JSON when format=json', async () => {
      const result = await getKeyStats({ symbols: 'AAPL', format: 'json' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(parsed.AAPL.forwardPE).toBe(22.0);
      expect(parsed.AAPL.beta).toBe(1.2);
    });

    test('getRecommendations should return formatted text by default', async () => {
      const result = await getRecommendations({ symbols: 'AAPL' });
      // Default format is text -- should contain consensus and analyst counts
      expect(result).toContain('Current:');
      expect(result).toContain('Strong Buy: 10');
      expect(result).toContain('Buy: 20');
    });

    test('getRecommendations should return JSON when format=json', async () => {
      const result = await getRecommendations({ symbols: 'AAPL', format: 'json' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      expect(Array.isArray(parsed.AAPL)).toBe(true);
      expect(parsed.AAPL[0].strongBuy).toBe(10);
    });

    test('getEarnings should return formatted text by default', async () => {
      const result = await getEarnings({ symbols: 'AAPL' });
      // Default format is text -- should contain EPS table markers
      expect(result).toContain('Earnings');
      expect(result).toContain('Quarter');
      expect(result).toContain('4Q2023');
    });

    test('getEarnings should return JSON when format=json', async () => {
      const result = await getEarnings({ symbols: 'AAPL', format: 'json' });
      const parsed = JSON.parse(result);

      expect(parsed.AAPL).toBeDefined();
      // Projection flattens earningsChart/financialsChart into top-level keys
      expect(parsed.AAPL.quarterly).toBeDefined();
    });
  });

  describe('Screener Tools', () => {
    test('listScreeners should return formatted text by default', async () => {
      const result = await listScreeners({});
      // Default format is text -- should contain category names and screener keys
      expect(typeof result).toBe('string');
      expect(result).toContain('Market Movers');
      expect(result).toContain('day_gainers');
    });

    test('listScreeners should return JSON when format=json', async () => {
      const result = await listScreeners({ format: 'json' });
      const parsed = JSON.parse(result);
      // JSON groups screeners by category
      expect(parsed['Market Movers']).toBeDefined();
      expect(parsed['Market Movers']).toContain('day_gainers');
    });

    test('getScreener should return formatted text by default', async () => {
      const result = await getScreener({ screener: 'day_gainers' });
      // Default format is text -- should contain markdown table markers
      expect(typeof result).toBe('string');
      expect(result).toContain('|');
      expect(result).toContain('XYZ');
    });

    test('getScreener should return JSON when format=json', async () => {
      const result = await getScreener({ screener: 'day_gainers', format: 'json' });
      const parsed = JSON.parse(result);

      expect(parsed.day_gainers).toBeDefined();
      expect(parsed.day_gainers.quotes).toBeDefined();
    });

    test('getScreener should use default count of 10', async () => {
      await getScreener({ screener: 'day_gainers' });
      const { Screener } = require('../src/core/Screener');
      const instance = Screener.mock.results[Screener.mock.results.length - 1].value;
      expect(instance.getScreeners).toHaveBeenCalledWith('day_gainers', 10);
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
    test('getEarningsCalendar should return formatted text by default', async () => {
      const result = await getEarningsCalendar({});
      // Default format is text -- should contain markdown table with earnings data
      expect(typeof result).toBe('string');
      expect(result).toContain('Earnings Calendar');
      expect(result).toContain('|');
      expect(result).toContain('AAPL');
    });

    test('getEarningsCalendar should return JSON when format=json', async () => {
      const result = await getEarningsCalendar({ format: 'json' });
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].ticker).toBe('AAPL');
      expect(parsed[0].companyshortname).toBe('Apple Inc.');
    });

    test('getEarningsCalendar should accept date parameters', async () => {
      const result = await getEarningsCalendar({
        start: '2024-01-01',
        end: '2024-01-31',
      });
      expect(typeof result).toBe('string');
      expect(result).toContain('AAPL');
    });

    test('getIPOs should return formatted text by default', async () => {
      const result = await getIPOs({});
      // Default format is text -- should contain markdown table with IPO data
      expect(typeof result).toBe('string');
      expect(result).toContain('IPOs');
      expect(result).toContain('|');
      expect(result).toContain('NEWCO');
    });

    test('getIPOs should return JSON when format=json', async () => {
      const result = await getIPOs({ format: 'json' });
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].ticker).toBe('NEWCO');
      expect(parsed[0].companyshortname).toBe('New Co');
    });

    test('getSplits should return formatted text by default', async () => {
      const result = await getSplits({});
      // Default format is text -- should contain markdown table with split data
      expect(typeof result).toBe('string');
      expect(result).toContain('Stock Splits');
      expect(result).toContain('|');
      expect(result).toContain('NVDA');
    });

    test('getSplits should return JSON when format=json', async () => {
      const result = await getSplits({ format: 'json' });
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].ticker).toBe('NVDA');
      expect(parsed[0].companyshortname).toBe('NVIDIA');
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

    test('marketSummary should return formatted text by default', async () => {
      const result = await marketSummary({});
      // Default format is text -- should contain markdown table with market indices
      expect(typeof result).toBe('string');
      expect(result).toContain('Market Summary');
      expect(result).toContain('|');
      expect(result).toContain('S&P 500');
    });

    test('marketSummary should return JSON when format=json', async () => {
      const result = await marketSummary({ format: 'json' });
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].symbol).toBe('^GSPC');
    });

    test('marketSummary should accept country parameter', async () => {
      const result = await marketSummary({ country: 'germany' });
      expect(typeof result).toBe('string');
      expect(result).toContain('|');
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

    test('currencies should return formatted text by default', async () => {
      const result = await currencies({});
      // Default format is text -- should contain markdown table with currency pairs
      expect(typeof result).toBe('string');
      expect(result).toContain('Currencies');
      expect(result).toContain('|');
      expect(result).toContain('EURUSD=X');
    });

    test('currencies should return JSON when format=json', async () => {
      const result = await currencies({ format: 'json' });
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

    test('trending should throw for invalid country', async () => {
      // isValidCountry is imported from config/countries (not mocked), so real validation runs
      // "us" is not a valid country name (should be "united states")
      await expect(trending({ country: 'us' })).rejects.toThrow('Invalid country');
      await expect(trending({ country: 'us' })).rejects.toThrow('Valid countries:');
    });

    test('marketSummary should throw for invalid country', async () => {
      await expect(marketSummary({ country: 'US' })).rejects.toThrow('Invalid country');
      await expect(marketSummary({ country: 'US' })).rejects.toThrow('Valid countries:');
    });

    test('trending should handle null response from Yahoo API', async () => {
      const { getTrending } = require('../src/misc/functions');
      getTrending.mockRejectedValueOnce(new Error('No trending data returned for region US'));

      await expect(trending({ country: 'united states' })).rejects.toThrow('Failed to get trending stocks');
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

  describe('Output Structure Validation', () => {
    describe('Formatted Tools - Text Output Structure', () => {
      test('get_stock_price produces structured text output', async () => {
        const result = await getStockPrice({ symbols: 'AAPL' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Price Summary/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_stock_summary produces structured text output', async () => {
        const result = await getStockSummary({ symbols: 'AAPL' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Summary/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_stock_profile produces structured text output', async () => {
        const result = await getStockProfile({ symbols: 'AAPL' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Profile/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_stock_history produces structured text output', async () => {
        const result = await getStockHistory({ symbols: 'AAPL' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/OHLCV/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_financials produces structured text output', async () => {
        const result = await getFinancials({ symbols: 'AAPL' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Income Statement|Financials/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_options produces structured text output', async () => {
        const result = await getOptions({ symbol: 'AAPL' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Options Chain/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_key_stats produces structured text output', async () => {
        const result = await getKeyStats({ symbols: 'AAPL' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Key Statistics/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_recommendations produces structured text output', async () => {
        const result = await getRecommendations({ symbols: 'AAPL' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Recommendations/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_earnings produces structured text output', async () => {
        const result = await getEarnings({ symbols: 'AAPL' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Earnings/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('list_screeners produces structured text output', async () => {
        const result = await listScreeners({});
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Screeners/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_screener produces structured text output', async () => {
        const result = await getScreener({ screener: 'day_gainers' });
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Screener/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_earnings_calendar produces structured text output', async () => {
        const result = await getEarningsCalendar({});
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Earnings Calendar/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_ipos produces structured text output', async () => {
        const result = await getIPOs({});
        expect(typeof result).toBe('string');
        expect(result).toMatch(/IPOs/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_splits produces structured text output', async () => {
        const result = await getSplits({});
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Stock Splits/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_market_summary produces structured text output', async () => {
        const result = await marketSummary({});
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Market Summary/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });

      test('get_currencies produces structured text output', async () => {
        const result = await currencies({});
        expect(typeof result).toBe('string');
        expect(result).toMatch(/Currencies/);
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(result).not.toMatch(/"raw"\s*:/);
        expect(result).not.toMatch(/"fmt"\s*:/);
        expect(() => JSON.parse(result)).toThrow();
      });
    });

    describe('JSON-Only Tools - JSON Output Structure', () => {
      test('search_stocks produces valid JSON', async () => {
        const result = await searchStocks({ query: 'Apple' });
        expect(typeof result).toBe('string');
        const parsed = JSON.parse(result);
        expect(parsed).toBeDefined();
        expect(parsed.quotes).toBeDefined();
      });

      test('get_trending produces valid JSON', async () => {
        const result = await trending({});
        expect(typeof result).toBe('string');
        const parsed = JSON.parse(result);
        expect(parsed).toBeDefined();
        expect(parsed.quotes).toBeDefined();
      });

      test('get_screener_info produces valid JSON', async () => {
        const result = await getScreenerInfo({ screener: 'day_gainers' });
        expect(typeof result).toBe('string');
        const parsed = JSON.parse(result);
        expect(parsed).toBeDefined();
        expect(parsed.id).toBeDefined();
      });

      test('get_supported_countries produces valid JSON', async () => {
        const result = await countries();
        expect(typeof result).toBe('string');
        const parsed = JSON.parse(result);
        expect(parsed).toBeDefined();
        expect(parsed.count).toBeDefined();
        expect(parsed.countries).toBeDefined();
      });
    });

    describe('Format Parameter Toggle', () => {
      test('format=json produces valid JSON, default produces text', async () => {
        const textResult = await getStockPrice({ symbols: 'AAPL' });
        expect(() => JSON.parse(textResult)).toThrow();

        const jsonResult = await getStockPrice({ symbols: 'AAPL', format: 'json' });
        expect(() => JSON.parse(jsonResult)).not.toThrow();
      });

      test('format toggle works for non-ticker tools', async () => {
        const textResult = await marketSummary({});
        expect(() => JSON.parse(textResult)).toThrow();

        const jsonResult = await marketSummary({ format: 'json' });
        expect(() => JSON.parse(jsonResult)).not.toThrow();
      });

      test('format toggle works for screener tools', async () => {
        const textResult = await getScreener({ screener: 'day_gainers' });
        expect(() => JSON.parse(textResult)).toThrow();

        const jsonResult = await getScreener({ screener: 'day_gainers', format: 'json' });
        expect(() => JSON.parse(jsonResult)).not.toThrow();
      });
    });
  });
});
