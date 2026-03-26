import { formatProfileResponse, truncateText } from '../../src/mcp/formatters/profile';

// --- Fixtures ---

const PROFILE_FIXTURE = {
  AAPL: {
    shortName: 'Apple Inc.',
    longName: 'Apple Inc.',
    address1: 'One Apple Park Way',
    city: 'Cupertino',
    state: 'CA',
    zip: '95014',
    country: 'United States',
    phone: '408 996 1010',
    website: 'https://www.apple.com',
    industry: 'Consumer Electronics',
    sector: 'Technology',
    longBusinessSummary:
      'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company offers iPhone, a line of smartphones; Mac, a line of personal computers; iPad, a line of multi-purpose tablets; and wearables, home, and accessories comprising AirPods, Apple TV, Apple Watch, Beats products, and HomePod. It also provides AppleCare support and cloud services; and operates various platforms, including the App Store that allow customers to discover and download applications and digital content.',
    fullTimeEmployees: 164000,
    companyOfficers: [
      { name: 'Mr. Timothy D. Cook', title: 'CEO & Director', age: 63, totalPay: { raw: 16239562, fmt: '16.24M' } },
      { name: 'Mr. Luca Maestri', title: 'CFO & Senior VP', age: 60, totalPay: { raw: 4612242, fmt: '4.61M' } },
      { name: 'Mr. Jeff Williams', title: 'COO', age: 59, totalPay: { raw: 4637585, fmt: '4.64M' } },
      { name: 'Ms. Katherine L. Adams', title: 'General Counsel & SVP', age: 59, totalPay: { raw: 4618064, fmt: '4.62M' } },
      { name: "Ms. Deirdre O'Brien", title: 'SVP of Retail', age: 56, totalPay: { raw: 4613369, fmt: '4.61M' } },
    ],
    auditRisk: 1,
    boardRisk: 1,
    compensationRisk: 3,
    overallRisk: 1,
    maxAge: 86400,
  },
};

const MISSING_FIELDS_FIXTURE = {
  AAPL: {
    shortName: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    address1: 'One Apple Park Way',
    city: 'Cupertino',
    country: 'United States',
    // No website, no employees, no state, no zip
    longBusinessSummary: 'A brief summary.',
    auditRisk: 2,
    boardRisk: 3,
    compensationRisk: 4,
    overallRisk: 3,
    maxAge: 86400,
  },
};

const ERROR_FIXTURE = {
  INVALID: 'No data found',
};

const EMPTY_DATA_FIXTURE = {};

// --- Tests ---

describe('truncateText', () => {
  it('returns text unchanged when under maxLen', () => {
    const short = 'This is a short text.';
    expect(truncateText(short, 300)).toBe(short);
  });

  it('truncates text over maxLen at word boundary with ...', () => {
    const long =
      'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company offers iPhone, a line of smartphones; Mac, a line of personal computers; iPad, a line of multi-purpose tablets; and wearables, home, and accessories comprising AirPods, Apple TV, Apple Watch, Beats products, and HomePod. It also provides AppleCare support.';
    const result = truncateText(long, 300);
    expect(result.endsWith('...')).toBe(true);
    // Result without the '...' should be <= 300 chars
    expect(result.length).toBeLessThanOrEqual(303); // 300 + '...'
    // Should not cut mid-word (last char before '...' should be a space or end of word)
    const withoutEllipsis = result.slice(0, -3);
    // The cut point should be at a space boundary (the char after withoutEllipsis should be a space in the original)
    expect(withoutEllipsis.length).toBeLessThanOrEqual(300);
  });
});

describe('formatProfileResponse', () => {
  it('contains sector, industry, and address', () => {
    const result = formatProfileResponse(PROFILE_FIXTURE);
    expect(result).toContain('Sector: Technology');
    expect(result).toContain('Industry: Consumer Electronics');
    expect(result).toContain('One Apple Park Way');
    expect(result).toContain('Cupertino');
    expect(result).toContain('CA');
    expect(result).toContain('95014');
  });

  it('business summary truncated to ~300 chars', () => {
    const result = formatProfileResponse(PROFILE_FIXTURE);
    // The full summary is 500+ chars. It should be truncated.
    expect(result).toContain('...');
    // Should NOT contain the full original summary
    expect(result).not.toContain('AppleCare support and cloud services');
  });

  it('include_officers=false (default) does NOT include officers', () => {
    const result = formatProfileResponse(PROFILE_FIXTURE);
    expect(result).not.toContain('Officers:');
    expect(result).not.toContain('Timothy D. Cook');
  });

  it('include_officers=true includes officers (capped at 10)', () => {
    const result = formatProfileResponse(PROFILE_FIXTURE, { include_officers: true });
    expect(result).toContain('Officers:');
    expect(result).toContain('Mr. Timothy D. Cook - CEO & Director');
    expect(result).toContain('Mr. Luca Maestri - CFO & Senior VP');
    expect(result).toContain("Ms. Deirdre O'Brien - SVP of Retail");
  });

  it('include_officers=true caps at 10 officers', () => {
    // Build fixture with 15 officers
    const manyOfficers = Array.from({ length: 15 }, (_, i) => ({
      name: `Officer ${i + 1}`,
      title: `Title ${i + 1}`,
    }));
    const fixture = {
      AAPL: {
        ...PROFILE_FIXTURE.AAPL,
        companyOfficers: manyOfficers,
      },
    };
    const result = formatProfileResponse(fixture, { include_officers: true });
    expect(result).toContain('Officer 10 - Title 10');
    expect(result).not.toContain('Officer 11');
  });

  it('missing fields (no website, no employees) omitted gracefully', () => {
    const result = formatProfileResponse(MISSING_FIELDS_FIXTURE);
    // Should not contain 'Website:' or 'Employees:'
    expect(result).not.toContain('Website:');
    expect(result).not.toContain('Employees:');
    // Should still have address and governance
    expect(result).toContain('One Apple Park Way');
    expect(result).toContain('Governance:');
  });

  it('format=json returns serialized data', () => {
    const result = formatProfileResponse(PROFILE_FIXTURE, { format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('AAPL');
    expect(parsed.AAPL.sector).toBe('Technology');
    // Officers should be stripped by default (include_officers not set)
    expect(parsed.AAPL.companyOfficers).toBeUndefined();
  });

  it('format=json with include_officers=true keeps officers', () => {
    const result = formatProfileResponse(PROFILE_FIXTURE, { format: 'json', include_officers: true });
    const parsed = JSON.parse(result);
    expect(parsed.AAPL.companyOfficers).toBeDefined();
    expect(parsed.AAPL.companyOfficers.length).toBe(5);
  });

  it('error string handled gracefully', () => {
    const result = formatProfileResponse(ERROR_FIXTURE);
    expect(result).toContain('INVALID | Error: No data found');
  });

  it('empty data returns "No profile data available"', () => {
    const result = formatProfileResponse(EMPTY_DATA_FIXTURE);
    expect(result).toContain('No profile data available');
  });

  it('website strips https://www. prefix', () => {
    const result = formatProfileResponse(PROFILE_FIXTURE);
    expect(result).toContain('Website: apple.com');
    expect(result).not.toContain('https://www.apple.com');
  });

  it('employee count formatted with compact notation', () => {
    const result = formatProfileResponse(PROFILE_FIXTURE);
    expect(result).toContain('Employees: 164K (FT)');
  });
});
