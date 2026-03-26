<p align="center">
  <img src="assets/banner.png" alt="yfinance-mcp-ts" width="100%" />
</p>

<p align="center">
  A TypeScript wrapper for the Yahoo Finance API with a built-in <a href="https://modelcontextprotocol.io/">MCP</a> server for AI agents like Claude.
</p>

## Features

- **20 MCP Tools** — stock quotes, financials, options, screeners, research, and market data
- **LLM-Optimized Output** — compact text/markdown responses with auto-aggregation and size guards
- **Browser Impersonation** — TLS fingerprinting bypass via [impit](https://github.com/nicklasoverworlds/impit) for 100% success rate
- **Proxy Rotation** — round-robin rotation with automatic failure tracking and cooldown
- **Retry with Backoff** — exponential backoff with jitter for rate limits and transient errors
- **300+ Screeners** — predefined stock screeners (day gainers, most actives, growth stocks, etc.)
- **Premium Support** — optional Yahoo Finance Premium authentication via Puppeteer

## Installation

```bash
npm install yfinance-mcp-ts
```

## MCP Server Setup

### Claude Desktop / Claude Code

Add to your config (`~/.config/claude/claude_desktop_config.json` on macOS/Linux, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "yfinance": {
      "command": "npx",
      "args": ["yfinance-mcp-ts"]
    }
  }
}
```

With proxy rotation:

```json
{
  "mcpServers": {
    "yfinance": {
      "command": "npx",
      "args": ["yfinance-mcp-ts"],
      "env": {
        "YFINANCE_PROXY_LIST": "http://user:pass@proxy1.com:8080\nhttp://user:pass@proxy2.com:8080"
      }
    }
  }
}
```

You can also run the server manually:

```bash
npm run mcp          # production
npm run mcp:dev      # development (ts-node)
npx yfinance-mcp-ts  # from npm
```

### Available Tools

| Tool | Description |
|------|-------------|
| **Stock Data** | |
| `get_stock_price` | Current price, market cap, volume |
| `get_stock_summary` | P/E ratio, 52-week range, dividend yield |
| `get_stock_profile` | Company info, sector, employees |
| `get_stock_history` | Historical OHLCV data |
| `get_financials` | Income statement, balance sheet, cash flow |
| `get_options` | Options chain with Greeks |
| `get_key_stats` | Forward P/E, PEG, beta, EPS |
| `get_recommendations` | Analyst recommendations |
| `get_earnings` | EPS estimates and actuals |
| **Screeners** | |
| `list_screeners` | List all 300+ screeners |
| `get_screener` | Run a screener |
| `get_screener_info` | Get screener details |
| **Research** | |
| `get_earnings_calendar` | Upcoming earnings announcements |
| `get_ipos` | Upcoming and recent IPOs |
| `get_splits` | Upcoming and recent stock splits |
| **Market Data** | |
| `search_stocks` | Search by name or symbol |
| `get_market_summary` | Major indices (S&P 500, Dow, NASDAQ) |
| `get_trending` | Trending stocks |
| `get_currencies` | Currency pairs and exchange rates |
| `get_supported_countries` | Supported countries list |

All tools return compact text by default. Add `format: "json"` to any call for raw JSON output.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `YFINANCE_HTTP_CLIENT` | `impit` or `axios` | `impit` |
| `YFINANCE_HTTP3` | Enable HTTP/3 (impit only) | `false` |
| `YFINANCE_IGNORE_TLS_ERRORS` | Ignore TLS certificate errors | `false` |
| `YFINANCE_TIMEOUT` | Request timeout (ms) | `30000` |
| `YFINANCE_PROXY_LIST` | Newline-separated proxy URLs | — |
| `YFINANCE_PROXY_MAX_FAILURES` | Failures before marking proxy unhealthy | `3` |
| `YFINANCE_PROXY_COOLDOWN_MS` | Cooldown before retrying unhealthy proxy (ms) | `300000` |
| `YFINANCE_RETRY_ENABLED` | Enable automatic retry | `true` |
| `YFINANCE_RETRY_MAX_RETRIES` | Max retry attempts | `5` |
| `YFINANCE_RETRY_INITIAL_DELAY` | Initial retry delay (ms) | `2000` |
| `YFINANCE_RETRY_MAX_DELAY` | Max retry delay (ms) | `60000` |

## Library Usage

### Ticker

```typescript
import { Ticker } from 'yfinance-mcp-ts';

const ticker = new Ticker('AAPL');
// or multiple: new Ticker('AAPL MSFT GOOG') / new Ticker(['AAPL', 'MSFT'])

await ticker.getPrice();
await ticker.getSummaryDetail();
await ticker.getSummaryProfile();
await ticker.getKeyStats();
await ticker.getEarnings();
await ticker.getRecommendationTrend();

// Historical data
await ticker.getHistory({ period: '1mo', interval: '1d' });
await ticker.getHistory({ start: '2024-01-01', end: '2024-12-31', interval: '1wk' });

// Financial statements ('a' = annual, 'q' = quarterly)
await ticker.getIncomeStatement('a');
await ticker.getBalanceSheet('q');
await ticker.getCashFlow('a');
await ticker.getFinancials('income', 'a'); // type: 'income' | 'balance' | 'cash' | 'cashflow'

// Options
await ticker.getOptionChain();

// All available modules at once
await ticker.getAllModules();
```

<details>
<summary>All Ticker methods</summary>

| Method | Description |
|--------|-------------|
| `getPrice()` | Current price and market data |
| `getSummaryDetail()` | Summary statistics |
| `getSummaryProfile()` | Company profile |
| `getAssetProfile()` | Detailed company info |
| `getKeyStats()` | Key statistics |
| `getFinancialDataSummary()` | Financial KPIs |
| `getEarnings()` | Earnings data |
| `getEarningsTrend()` | Earnings trend |
| `getCalendarEvents()` | Upcoming events |
| `getRecommendationTrend()` | Analyst recommendations |
| `getEsgScores()` | ESG metrics |
| `getMajorHolders()` | Major shareholders |
| `getInsiderHolders()` | Insider holdings |
| `getInsiderTransactions()` | Insider transactions |
| `getInstitutionOwnership()` | Institutional ownership |
| `getFundOwnership()` | Fund ownership |
| `getSecFilings()` | SEC filings |
| `getQuoteType()` | Quote type info |
| `getGradingHistory()` | Upgrade/downgrade history |
| `getHistory()` | Historical OHLCV data |
| `getDividendHistory()` | Dividend history |
| `getIncomeStatement()` | Income statement |
| `getBalanceSheet()` | Balance sheet |
| `getCashFlow()` | Cash flow statement |
| `getValuationMeasures()` | Valuation measures |
| `getAllFinancialData()` | All financial data |
| `getOptionChain()` | Full options chain |
| `getQuotes()` | Quick quotes |
| `getRecommendations()` | Similar stocks |
| `getTechnicalInsights()` | Technical analysis |
| `getNews()` | Recent news |
| `getCompanyOfficers()` | Company executives |

**Fund-specific:** `getFundHoldingInfo()`, `getFundTopHoldings()`, `getFundSectorWeightings()`, `getFundBondHoldings()`, `getFundEquityHoldings()`, `getFundBondRatings()`, `getFundPerformance()`, `getFundProfile()`

</details>

### Screener

```typescript
import { Screener } from 'yfinance-mcp-ts';

const screener = new Screener();
screener.availableScreeners;                    // list all 300+ screener IDs
screener.getScreenerInfo('day_gainers');         // screener metadata
await screener.getScreeners('day_gainers', 25); // run with result count
await screener.getScreeners('day_gainers most_actives', 10); // multiple
```

### Research

```typescript
import { Research } from 'yfinance-mcp-ts';

const research = new Research();
await research.getEarnings('2024-01-01', '2024-01-31');
await research.getSplits('2024-01-01', '2024-12-31');
await research.getIPOs('2024-01-01', '2024-12-31');

// Premium only
await research.getReports(100, { sector: 'Technology', investment_rating: 'Bullish' });
await research.getTrades(100, { trend: 'Bullish', term: 'Short term' });
```

### Standalone Functions

```typescript
import { search, getMarketSummary, getTrending, getCurrencies, getValidCountries } from 'yfinance-mcp-ts';

await search('Apple', { quotesCount: 10, newsCount: 5 });
await search('AAPL', { firstQuote: true });
await getMarketSummary('united states');
await getTrending('united states');
await getCurrencies();
getValidCountries(); // ['united states', 'france', 'germany', ...]
```

### Configuration

```typescript
const ticker = new Ticker('AAPL', {
  country: 'united states',   // 14 supported countries
  timeout: 30000,
  httpClient: 'impit',        // 'impit' (default) or 'axios'
  retry: {
    enabled: true,
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
  },
  proxyRotation: {
    proxyList: 'http://proxy1:8080\nhttp://proxy2:8080',
    maxFailures: 3,
    cooldownMs: 300000,
  },
  // Premium auth (requires puppeteer)
  username: 'your@email.com',
  password: 'password',
});
```

Supported countries: `united states`, `australia`, `canada`, `france`, `germany`, `hong kong`, `india`, `italy`, `spain`, `united kingdom`, `brazil`, `new zealand`, `singapore`, `taiwan`

## Requirements

- Node.js >= 20.0.0
- TypeScript >= 5.0 (for development)
- `puppeteer` >= 21.0.0 (optional, for premium features)
- `https-proxy-agent` / `socks-proxy-agent` (optional, for proxy support)

## License

MIT

## Credits

TypeScript port of [yahooquery](https://github.com/dpguthrie/yahooquery) by Doug Guthrie.

## Disclaimer

Not affiliated with Yahoo, Inc. Data is for personal use only. Review Yahoo's terms of service before using in production.
