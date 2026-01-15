# yfinance-mcp-ts

A TypeScript wrapper for the unofficial Yahoo Finance API. This library provides easy access to stock quotes, historical data, financial statements, options chains, screeners, and more.

## Features

- **Ticker Data**: Get quotes, price, summary, earnings, financials, and more
- **Historical Data**: Fetch OHLCV data with customizable periods and intervals
- **Financial Statements**: Income statements, balance sheets, cash flow statements
- **Options Chains**: Full options data with calls and puts
- **Screeners**: Access 300+ predefined stock screeners
- **Research**: Reports, trade ideas, earnings calendar, IPOs, splits
- **Search**: Search for stocks, ETFs, mutual funds, and more
- **Premium Support**: Optional Yahoo Finance Premium authentication
- **MCP Server**: Built-in Model Context Protocol server for AI agents (Claude, etc.)

## MCP Server (AI Agent Integration)

This library includes a built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that allows AI agents like Claude to access Yahoo Finance data directly.

### Quick Setup for Claude Desktop

Add to your Claude Desktop configuration (`~/.config/claude/claude_desktop_config.json` on macOS/Linux or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "yfinance": {
      "command": "npx",
      "args": ["yfinance-mcp"]
    }
  }
}
```

Or if installed locally:

```json
{
  "mcpServers": {
    "yfinance": {
      "command": "node",
      "args": ["/path/to/yfinance-mcp-ts/dist/mcp/server.js"]
    }
  }
}
```

### Available MCP Tools (20 tools)

| Tool | Description |
|------|-------------|
| **Stock Data** | |
| `get_stock_price` | Get current price, market cap, and price changes |
| `get_stock_summary` | Get P/E ratio, volume, 52-week range, dividend yield |
| `get_stock_profile` | Get company info (industry, sector, employees) |
| `get_stock_history` | Get historical OHLCV price data |
| `get_financials` | Get income statement, balance sheet, cash flow |
| `get_options` | Get option chain (calls, puts, strikes, Greeks) |
| `get_key_stats` | Get forward P/E, PEG ratio, beta, EPS |
| `get_recommendations` | Get analyst recommendations |
| `get_earnings` | Get earnings data (EPS estimates/actuals) |
| **Screeners** | |
| `list_screeners` | List all 300+ available screeners |
| `get_screener` | Run a screener (day_gainers, most_actives, etc.) |
| `get_screener_info` | Get screener details |
| **Research** | |
| `get_earnings_calendar` | Get upcoming earnings announcements |
| `get_ipos` | Get upcoming and recent IPOs |
| `get_splits` | Get upcoming and recent stock splits |
| **Market Data** | |
| `search_stocks` | Search for stocks by name or symbol |
| `get_market_summary` | Get major indices (S&P 500, Dow, NASDAQ) |
| `get_trending` | Get trending/most watched stocks |
| `get_currencies` | Get currency pairs and exchange rates |
| `get_supported_countries` | Get list of supported countries |

### Example AI Interactions

Once configured, you can ask Claude things like:

- "What's the current price of AAPL?"
- "Show me the top 10 day gainers"
- "Get the financial statements for Microsoft"
- "What stocks are trending right now?"
- "Search for electric vehicle companies"
- "What are the upcoming earnings this week?"

### Running MCP Server Manually

```bash
# Using npm scripts
npm run mcp

# Or directly
npx yfinance-mcp

# Or with node
node dist/mcp/server.js
```

## Installation

```bash
npm install yfinance-mcp-ts
```

For premium features (optional):
```bash
npm install puppeteer
```

## Quick Start

```typescript
import { Ticker } from 'yfinance-mcp-ts';

// Create a ticker for one or more symbols
const ticker = new Ticker('AAPL');
// or multiple symbols
const tickers = new Ticker('AAPL MSFT GOOG');
// or as an array
const tickersArray = new Ticker(['AAPL', 'MSFT', 'GOOG']);

// Get price data
const price = await ticker.getPrice();
console.log(price);

// Get historical data
const history = await ticker.getHistory({ period: '1mo', interval: '1d' });
console.log(history);

// Get financial statements
const income = await ticker.getIncomeStatement('a'); // 'a' for annual, 'q' for quarterly
console.log(income);
```

## API Reference

### Ticker Class

The main class for accessing stock data.

```typescript
import { Ticker, createTicker } from 'yfinance-mcp-ts';

// Constructor
const ticker = new Ticker(symbols, options?);

// Or use the async factory (auto-initializes session)
const ticker = await createTicker(symbols, options?);
```

#### Options

```typescript
interface TickerOptions {
  country?: string;        // Default: 'united states'
  formatted?: boolean;     // Return formatted values (default: false)
  progress?: boolean;      // Show progress (default: false)
  validate?: boolean;      // Validate symbols on creation
  username?: string;       // Yahoo username for premium
  password?: string;       // Yahoo password for premium
  timeout?: number;        // Request timeout in ms (default: 30000)
}
```

#### Quote Summary Methods

```typescript
// Get all available modules
const allData = await ticker.getAllModules();

// Get specific modules
const data = await ticker.getModules(['price', 'summaryDetail']);

// Individual module methods
await ticker.getPrice();              // Current price and market data
await ticker.getSummaryDetail();      // Summary statistics
await ticker.getSummaryProfile();     // Company profile
await ticker.getAssetProfile();       // Detailed company info
await ticker.getKeyStats();           // Key statistics
await ticker.getFinancialDataSummary(); // Financial KPIs
await ticker.getEarnings();           // Earnings data
await ticker.getEarningsTrend();      // Earnings trend
await ticker.getCalendarEvents();     // Upcoming events
await ticker.getRecommendationTrend(); // Analyst recommendations
await ticker.getEsgScores();          // ESG metrics
await ticker.getMajorHolders();       // Major shareholders
await ticker.getInsiderHolders();     // Insider holdings
await ticker.getInsiderTransactions(); // Insider transactions
await ticker.getInstitutionOwnership(); // Institutional ownership
await ticker.getFundOwnership();      // Fund ownership
await ticker.getSecFilings();         // SEC filings
await ticker.getQuoteType();          // Quote type info
await ticker.getGradingHistory();     // Upgrade/downgrade history
```

#### Historical Data

```typescript
// Get historical data
const history = await ticker.getHistory({
  period: '1mo',      // 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
  interval: '1d',     // 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
  start: '2024-01-01', // Optional: start date
  end: '2024-12-31',   // Optional: end date
  adjOhlc: false,      // Adjust OHLC for splits/dividends
  adjTimezone: true,   // Adjust for exchange timezone
});

// Get dividend history
const dividends = await ticker.getDividendHistory('2020-01-01', '2024-01-01');
```

#### Financial Statements

```typescript
// Income Statement
const income = await ticker.getIncomeStatement('a');  // 'a' annual, 'q' quarterly

// Balance Sheet
const balance = await ticker.getBalanceSheet('a');

// Cash Flow Statement
const cashFlow = await ticker.getCashFlow('a');

// Valuation Measures
const valuation = await ticker.getValuationMeasures();

// All Financial Data
const allFinancials = await ticker.getAllFinancialData('a');

// Specific financial types
const specific = await ticker.getFinancialData(['TotalRevenue', 'NetIncome'], 'a');
```

#### Options

```typescript
// Get full options chain
const options = await ticker.getOptionChain();
// Returns: { AAPL: { calls: [...], puts: [...], expirationDates: [...], strikes: [...] } }
```

#### Fund-Specific Methods (ETFs, Mutual Funds)

```typescript
await ticker.getFundHoldingInfo();     // All holding info
await ticker.getFundTopHoldings();     // Top holdings
await ticker.getFundSectorWeightings(); // Sector allocation
await ticker.getFundBondHoldings();    // Bond holdings
await ticker.getFundEquityHoldings(); // Equity holdings
await ticker.getFundBondRatings();    // Bond ratings
await ticker.getFundPerformance();    // Performance data
await ticker.getFundProfile();        // Fund profile
```

#### Additional Methods

```typescript
await ticker.getQuotes();              // Quick quotes
await ticker.getRecommendations();     // Similar stocks
await ticker.getTechnicalInsights();   // Technical analysis
await ticker.getNews(25);              // Recent news
await ticker.getCompanyOfficers();     // Company executives
await ticker.validate();               // Validate symbols
```

### Screener Class

Access Yahoo Finance predefined screeners.

```typescript
import { Screener, createScreener } from 'yfinance-mcp-ts';

const screener = new Screener();

// Get available screeners (300+)
const available = screener.availableScreeners;
// ['day_gainers', 'day_losers', 'most_actives', 'aggressive_small_caps', ...]

// Get screener info
const info = screener.getScreenerInfo('day_gainers');

// Run screeners
const results = await screener.getScreeners('day_gainers', 25);
// or multiple
const multi = await screener.getScreeners('day_gainers most_actives', 25);
```

#### Popular Screeners

- `day_gainers` - Top gaining stocks today
- `day_losers` - Top losing stocks today
- `most_actives` - Most actively traded
- `aggressive_small_caps` - Small cap growth stocks
- `conservative_foreign_funds` - Conservative international funds
- `growth_technology_stocks` - Tech growth stocks
- `high_yield_bond` - High yield bonds
- `undervalued_growth_stocks` - Undervalued growth stocks
- `undervalued_large_caps` - Undervalued large caps

### Research Class

Access research reports, trade ideas, and market events (some features require Premium).

```typescript
import { Research, createResearch } from 'yfinance-mcp-ts';

const research = new Research();

// Get research reports (Premium)
const reports = await research.getReports(100, {
  sector: 'Technology',
  investment_rating: 'Bullish',
  report_date: 'Last Month',
});

// Get trade ideas (Premium)
const trades = await research.getTrades(100, {
  trend: 'Bullish',
  term: 'Short term',
});

// Get earnings calendar
const earnings = await research.getEarnings('2024-01-01', '2024-01-31');

// Get stock splits
const splits = await research.getSplits('2024-01-01', '2024-12-31');

// Get IPO calendar
const ipos = await research.getIPOs('2024-01-01', '2024-12-31');
```

### Standalone Functions

```typescript
import {
  search,
  getCurrencies,
  getMarketSummary,
  getTrending,
  getValidCountries
} from 'yfinance-mcp-ts';

// Search Yahoo Finance
const results = await search('Apple', { quotesCount: 10, newsCount: 5 });

// Get first quote only
const apple = await search('AAPL', { firstQuote: true });

// Get available currencies
const currencies = await getCurrencies();

// Get market summary (major indices)
const summary = await getMarketSummary('united states');

// Get trending stocks
const trending = await getTrending('united states');

// Get valid countries
const countries = getValidCountries();
// ['united states', 'france', 'germany', 'united kingdom', ...]
```

### Premium Features

For Yahoo Finance Premium subscribers:

```typescript
import { Ticker, yahooLogin, hasPuppeteer } from 'yfinance-mcp-ts';

// Check if puppeteer is installed
const hasPup = await hasPuppeteer();

// Option 1: Manual login
const result = await yahooLogin('your@email.com', 'password');
if (result.success) {
  console.log('Logged in successfully');
}

// Option 2: Auto-login with Ticker
const ticker = new Ticker('AAPL', {
  username: 'your@email.com',
  password: 'password',
});

// Check if premium is active
const session = ticker['session']; // Access internal session
console.log(session.hasPremium());
```

## Configuration

### Countries

The library supports 14 countries/regions:

| Country | Lang | Region |
|---------|------|--------|
| united states | en-US | US |
| australia | en-AU | AU |
| canada | en-CA | CA |
| france | fr-FR | FR |
| germany | de-DE | DE |
| hong kong | zh-Hant-HK | HK |
| india | en-IN | IN |
| italy | it-IT | IT |
| spain | es-ES | ES |
| united kingdom | en-GB | GB |
| brazil | pt-BR | BR |
| new zealand | en-NZ | NZ |
| singapore | en-SG | SG |
| taiwan | zh-TW | TW |

```typescript
const ticker = new Ticker('AAPL', { country: 'germany' });
```

### Intervals

For historical data:

| Interval | Description |
|----------|-------------|
| 1m | 1 minute |
| 2m | 2 minutes |
| 5m | 5 minutes |
| 15m | 15 minutes |
| 30m | 30 minutes |
| 60m / 1h | 1 hour |
| 90m | 90 minutes |
| 1d | 1 day |
| 5d | 5 days |
| 1wk | 1 week |
| 1mo | 1 month |
| 3mo | 3 months |

### Periods

| Period | Description |
|--------|-------------|
| 1d | 1 day |
| 5d | 5 days |
| 1mo | 1 month |
| 3mo | 3 months |
| 6mo | 6 months |
| 1y | 1 year |
| 2y | 2 years |
| 5y | 5 years |
| 10y | 10 years |
| ytd | Year to date |
| max | Maximum available |

## Error Handling

```typescript
import { Ticker } from 'yfinance-mcp-ts';

try {
  const ticker = new Ticker('INVALID_SYMBOL');
  const price = await ticker.getPrice();

  if (price.INVALID_SYMBOL && typeof price.INVALID_SYMBOL === 'string') {
    console.error('Error:', price.INVALID_SYMBOL);
  }
} catch (error) {
  console.error('Request failed:', error.message);
}

// Validate symbols
const ticker = new Ticker('AAPL INVALID');
const { valid, invalid } = await ticker.validateSymbols();
console.log('Valid:', valid);     // ['AAPL']
console.log('Invalid:', invalid); // ['INVALID']
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import {
  Ticker,
  TickerOptions,
  HistoryParams,
  SessionOptions,
  SearchResult,
  ScreenerResult,
  AuthCookie,
} from 'yfinance-mcp-ts';
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for development)
- puppeteer >= 21.0.0 (optional, for premium features)

## License

MIT

## Credits

This is a TypeScript port of the excellent [yahooquery](https://github.com/dpguthrie/yahooquery) Python library by Doug Guthrie.

## Disclaimer

This library is not affiliated with Yahoo, Inc. The data retrieved is for personal use only. Please review Yahoo's terms of service before using this library in production applications.
