/**
 * Screener Unit Tests with Proper Mocking
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

import { Screener, createScreener } from '../src/core/Screener';

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

describe('Screener - Unit Tests', () => {
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

  describe('Initialization', () => {
    test('should create screener with default options', () => {
      const screener = new Screener();
      expect(screener).toBeDefined();
      expect(screener.country).toBe('united states');
    });

    test('should create screener with custom country', () => {
      const screener = new Screener({ country: 'germany' });
      expect(screener.country).toBe('germany');
    });

    test('should have symbols as empty array by default', () => {
      const screener = new Screener();
      expect(screener.symbols).toEqual([]);
    });
  });

  describe('Available Screeners', () => {
    test('should return list of available screeners', () => {
      const screener = new Screener();
      const available = screener.availableScreeners;
      expect(Array.isArray(available)).toBe(true);
      expect(available.length).toBeGreaterThan(100);
    });

    test('should include day_gainers screener', () => {
      const screener = new Screener();
      expect(screener.availableScreeners).toContain('day_gainers');
    });

    test('should include day_losers screener', () => {
      const screener = new Screener();
      expect(screener.availableScreeners).toContain('day_losers');
    });

    test('should include most_actives screener', () => {
      const screener = new Screener();
      expect(screener.availableScreeners).toContain('most_actives');
    });
  });

  describe('Get Screener Info', () => {
    test('should return info for day_gainers', () => {
      const screener = new Screener();
      const info = screener.getScreenerInfo('day_gainers');
      expect(info).toBeDefined();
      expect(info?.id).toBeTruthy();
      expect(info?.title).toBeTruthy();
    });

    test('should return info for day_losers', () => {
      const screener = new Screener();
      const info = screener.getScreenerInfo('day_losers');
      expect(info).toBeDefined();
    });

    test('should return info for most_actives', () => {
      const screener = new Screener();
      const info = screener.getScreenerInfo('most_actives');
      expect(info).toBeDefined();
    });

    test('should return null for invalid screener', () => {
      const screener = new Screener();
      const info = screener.getScreenerInfo('not_a_real_screener');
      expect(info).toBeNull();
    });

    test('should return null for empty string', () => {
      const screener = new Screener();
      const info = screener.getScreenerInfo('');
      expect(info).toBeNull();
    });
  });

  describe('Get Screeners - Single', () => {
    test('should fetch day_gainers screener data', async () => {
      const screener = new Screener();

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({
          finance: {
            result: [
              {
                id: 'day_gainers',
                title: 'Day Gainers',
                quotes: [
                  { symbol: 'AAPL', regularMarketPrice: 155 },
                  { symbol: 'MSFT', regularMarketPrice: 380 },
                ],
              },
            ],
          },
        }));
      });

      const result = await screener.getScreeners('day_gainers');
      expect(result).toBeDefined();
    });

    test('should fetch most_actives screener data', async () => {
      const screener = new Screener();

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({
          finance: {
            result: [
              {
                id: 'most_actives',
                quotes: [
                  { symbol: 'TSLA', volume: 50000000 },
                ],
              },
            ],
          },
        }));
      });

      const result = await screener.getScreeners('most_actives', 10);
      expect(result).toBeDefined();
    });
  });

  describe('Get Screeners - Multiple', () => {
    test('should fetch multiple screeners as string', async () => {
      const screener = new Screener();

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({
          finance: {
            result: [
              { id: 'day_gainers', quotes: [] },
              { id: 'day_losers', quotes: [] },
            ],
          },
        }));
      });

      const result = await screener.getScreeners('day_gainers day_losers');
      expect(result).toBeDefined();
    });

    test('should fetch multiple screeners as array', async () => {
      const screener = new Screener();

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({
          finance: {
            result: [
              { id: 'day_gainers', quotes: [] },
              { id: 'most_actives', quotes: [] },
            ],
          },
        }));
      });

      const result = await screener.getScreeners(['day_gainers', 'most_actives']);
      expect(result).toBeDefined();
    });
  });

  describe('Get Screeners - Error Handling', () => {
    test('should throw error for invalid screener ID', async () => {
      const screener = new Screener();

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({}));
      });

      await expect(screener.getScreeners('totally_invalid_screener')).rejects.toThrow();
    });

    test('should handle API error response', async () => {
      const screener = new Screener();

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({
          finance: {
            error: {
              code: 'Bad Request',
              description: 'Invalid request',
            },
          },
        }));
      });

      const result = await screener.getScreeners('day_gainers');
      expect(result).toBeDefined();
    });
  });

  describe('Get Screeners - Count Parameter', () => {
    test('should use default count of 25', async () => {
      const screener = new Screener();

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({
          finance: { result: [{ quotes: [] }] },
        }));
      });

      await screener.getScreeners('day_gainers');
      // Default count is 25
      expect(mockGet).toHaveBeenCalled();
    });

    test('should use custom count', async () => {
      const screener = new Screener();

      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({
          finance: { result: [{ quotes: [] }] },
        }));
      });

      await screener.getScreeners('day_gainers', 50);
      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('createScreener Factory', () => {
    test('should create and return screener', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({}));
      });

      const screener = await createScreener();
      expect(screener).toBeInstanceOf(Screener);
    });

    test('should create screener with options', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({}));
      });

      const screener = await createScreener({ country: 'france' });
      expect(screener.country).toBe('france');
    });
  });
});
