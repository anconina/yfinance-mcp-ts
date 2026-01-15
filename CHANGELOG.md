# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

## [1.0.0] - 2026-01-15

### Added

#### Core Features
- `Ticker` class for accessing stock data (quotes, prices, summaries, earnings, financials)
- `Screener` class with access to 300+ predefined Yahoo Finance screeners
- `Research` class for research reports, trade ideas, earnings calendar, IPOs, and splits
- `SessionManager` for handling HTTP sessions, cookies, and CSRF tokens

#### Data Access
- Historical OHLCV data with customizable periods and intervals
- Financial statements (income statement, balance sheet, cash flow)
- Options chains with full Greeks data
- Fund-specific methods for ETFs and mutual funds
- Analyst recommendations and earnings data
- ESG scores and company profiles

#### MCP Server
- Built-in Model Context Protocol (MCP) server for AI agent integration
- 20 MCP tools covering stocks, screeners, research, and market data
- Easy integration with Claude Desktop and other MCP-compatible AI agents

#### Utilities
- `search()` function for searching stocks, ETFs, and mutual funds
- `getCurrencies()` for currency pair data
- `getMarketSummary()` for major market indices
- `getTrending()` for trending stocks
- Multi-country support (14 countries/regions)

#### Premium Features
- Yahoo Finance Premium authentication via headless browser
- Optional puppeteer integration for premium login

### Technical
- Full TypeScript support with strict mode
- Comprehensive type definitions
- Jest test suite with 70% coverage threshold
- Browser impersonation for reliable API access

---

## Version History

- **1.0.0** - Initial release with full Yahoo Finance API coverage and MCP server

[Unreleased]: https://github.com/anconina/yfinance-mcp-ts/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/anconina/yfinance-mcp-ts/releases/tag/v1.0.0
