/**
 * Research Unit Tests with Proper Mocking
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

import { Research, createResearch, SECTORS, TRENDS, REPORT_TYPES, DATES, TERMS } from '../src/core/Research';

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

describe('Research - Unit Tests', () => {
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

    // Research class uses POST for API calls
    mockPost.mockImplementation(() => {
      return Promise.resolve(mockResponse({
        documents: [
          {
            columns: [{ label: 'ticker' }, { label: 'title' }],
            rows: [['AAPL', 'Apple Analysis']],
          },
        ],
      }));
    });
  });

  describe('Initialization', () => {
    test('should create research instance with default options', () => {
      const research = new Research();
      expect(research).toBeDefined();
      expect(research.country).toBe('united states');
    });

    test('should create research instance with custom country', () => {
      const research = new Research({ country: 'germany' });
      expect(research.country).toBe('germany');
    });
  });

  describe('Constants', () => {
    describe('SECTORS', () => {
      test('should have options array', () => {
        expect(Array.isArray(SECTORS.options)).toBe(true);
        expect(SECTORS.options.length).toBeGreaterThan(5);
      });

      test('should include Technology sector', () => {
        expect(SECTORS.options).toContain('Technology');
      });

      test('should include Healthcare sector', () => {
        expect(SECTORS.options).toContain('Healthcare');
      });

      test('should include Financial Services sector', () => {
        expect(SECTORS.options).toContain('Financial Services');
      });

      test('should allow multiple selections', () => {
        expect(SECTORS.multiple).toBe(true);
      });
    });

    describe('TRENDS', () => {
      test('should have options array', () => {
        expect(Array.isArray(TRENDS.options)).toBe(true);
      });

      test('should include Bullish trend', () => {
        expect(TRENDS.options).toContain('Bullish');
      });

      test('should include Bearish trend', () => {
        expect(TRENDS.options).toContain('Bearish');
      });

      test('should allow multiple selections', () => {
        expect(TRENDS.multiple).toBe(true);
      });
    });

    describe('REPORT_TYPES', () => {
      test('should have options array', () => {
        expect(Array.isArray(REPORT_TYPES.options)).toBe(true);
      });

      test('should include Analyst Report', () => {
        expect(REPORT_TYPES.options).toContain('Analyst Report');
      });

      test('should include Technical Analysis', () => {
        expect(REPORT_TYPES.options).toContain('Technical Analysis');
      });

      test('should allow multiple selections', () => {
        expect(REPORT_TYPES.multiple).toBe(true);
      });
    });

    describe('DATES', () => {
      test('should have options object', () => {
        expect(typeof DATES.options).toBe('object');
      });

      test('should have Last Week option', () => {
        expect(DATES.options['Last Week']).toBe(7);
      });

      test('should have Last Month option', () => {
        expect(DATES.options['Last Month']).toBe(30);
      });

      test('should have Last Year option', () => {
        expect(DATES.options['Last Year']).toBe(365);
      });

      test('should not allow multiple selections', () => {
        expect(DATES.multiple).toBe(false);
      });
    });

    describe('TERMS', () => {
      test('should have options array', () => {
        expect(Array.isArray(TERMS.options)).toBe(true);
      });

      test('should include Short term', () => {
        expect(TERMS.options).toContain('Short term');
      });

      test('should include Mid term', () => {
        expect(TERMS.options).toContain('Mid term');
      });

      test('should include Long term', () => {
        expect(TERMS.options).toContain('Long term');
      });
    });
  });

  describe('getReports', () => {
    test('should fetch research reports', async () => {
      const research = new Research();
      const result = await research.getReports(10);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should fetch reports with sector filter', async () => {
      const research = new Research();
      const result = await research.getReports(10, { sector: 'Technology' });
      expect(result).toBeDefined();
    });

    test('should fetch reports with investment rating filter', async () => {
      const research = new Research();
      const result = await research.getReports(10, { investment_rating: 'Bullish' });
      expect(result).toBeDefined();
    });

    test('should fetch reports with report date filter', async () => {
      const research = new Research();
      const result = await research.getReports(10, { report_date: 'Last Month' });
      expect(result).toBeDefined();
    });

    test('should fetch reports with report type filter', async () => {
      const research = new Research();
      const result = await research.getReports(10, { report_type: 'Analyst Report' });
      expect(result).toBeDefined();
    });

    test('should fetch reports with multiple filters', async () => {
      const research = new Research();
      const result = await research.getReports(10, {
        sector: 'Technology',
        investment_rating: 'Bullish',
      });
      expect(result).toBeDefined();
    });

    test('should throw error for invalid filter', async () => {
      const research = new Research();
      await expect(research.getReports(10, { invalid_filter: 'test' } as any)).rejects.toThrow();
    });

    test('should throw error for invalid option value', async () => {
      const research = new Research();
      await expect(research.getReports(10, { sector: 'Invalid Sector' })).rejects.toThrow();
    });
  });

  describe('getTrades', () => {
    test('should fetch trade ideas', async () => {
      const research = new Research();
      const result = await research.getTrades(10);
      expect(result).toBeDefined();
    });

    test('should fetch trades with trend filter', async () => {
      const research = new Research();
      const result = await research.getTrades(10, { trend: 'Bullish' });
      expect(result).toBeDefined();
    });

    test('should fetch trades with term filter', async () => {
      const research = new Research();
      const result = await research.getTrades(10, { term: 'Short term' });
      expect(result).toBeDefined();
    });

    test('should fetch trades with sector filter', async () => {
      const research = new Research();
      const result = await research.getTrades(10, { sector: 'Technology' });
      expect(result).toBeDefined();
    });

    test('should fetch trades with multiple trends', async () => {
      const research = new Research();
      const result = await research.getTrades(10, { trend: ['Bullish', 'Bearish'] as any });
      expect(result).toBeDefined();
    });
  });

  describe('getEarnings', () => {
    test('should fetch earnings calendar', async () => {
      const research = new Research();
      const result = await research.getEarnings('2024-01-01', '2024-01-31');
      expect(result).toBeDefined();
    });

    test('should fetch earnings with different date format', async () => {
      const research = new Research();
      const result = await research.getEarnings('2024-02-01', '2024-02-28');
      expect(result).toBeDefined();
    });

    test('should fetch earnings with custom size', async () => {
      const research = new Research();
      const result = await research.getEarnings('2024-01-01', '2024-12-31', 50);
      expect(result).toBeDefined();
    });
  });

  describe('getSplits', () => {
    test('should fetch stock splits', async () => {
      const research = new Research();
      const result = await research.getSplits('2024-01-01', '2024-12-31');
      expect(result).toBeDefined();
    });

    test('should fetch splits with custom size', async () => {
      const research = new Research();
      const result = await research.getSplits('2024-01-01', '2024-12-31', 50);
      expect(result).toBeDefined();
    });
  });

  describe('getIPOs', () => {
    test('should fetch IPO calendar', async () => {
      const research = new Research();
      const result = await research.getIPOs('2024-01-01', '2024-12-31');
      expect(result).toBeDefined();
    });

    test('should fetch IPOs with custom size', async () => {
      const research = new Research();
      const result = await research.getIPOs('2024-01-01', '2024-12-31', 50);
      expect(result).toBeDefined();
    });
  });

  describe('createResearch Factory', () => {
    test('should create and return research instance', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({}));
      });

      const research = await createResearch();
      expect(research).toBeInstanceOf(Research);
    });

    test('should create research with options', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('getcrumb')) {
          return Promise.resolve(mockResponse('mock_crumb'));
        }
        return Promise.resolve(mockResponse({}));
      });

      const research = await createResearch({ country: 'germany' });
      expect(research.country).toBe('germany');
    });
  });
});
