/**
 * Live API Test Script
 * Tests all yfinance-mcp-ts functionalities with real API calls
 */

import {
  Ticker,
  Screener,
  Research,
  search,
  getCurrencies,
  getMarketSummary,
  getTrending,
  getValidCountries
} from './src';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testTicker() {
  console.log('\n' + '='.repeat(60));
  console.log('TICKER CLASS TESTS');
  console.log('='.repeat(60));

  const ticker = new Ticker('AAPL');

  // Test 1: Price
  console.log('\n📊 1. getPrice()');
  try {
    const price = await ticker.getPrice();
    const p = price.AAPL as Record<string, unknown>;
    if (p && typeof p === 'object') {
      console.log(`   Symbol: ${p.symbol}`);
      console.log(`   Price: $${p.regularMarketPrice}`);
      console.log(`   Change: ${p.regularMarketChangePercent}%`);
      console.log(`   Market Cap: $${(p.marketCap as number / 1e12).toFixed(2)}T`);
    } else {
      console.log('   Result:', JSON.stringify(price).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 2: Summary Detail
  console.log('\n📈 2. getSummaryDetail()');
  try {
    const summary = await ticker.getSummaryDetail();
    const s = summary.AAPL as Record<string, unknown>;
    if (s && typeof s === 'object') {
      console.log(`   Previous Close: $${s.previousClose}`);
      console.log(`   Open: $${s.open}`);
      console.log(`   Day Range: $${s.dayLow} - $${s.dayHigh}`);
      console.log(`   52 Week Range: $${s.fiftyTwoWeekLow} - $${s.fiftyTwoWeekHigh}`);
      console.log(`   Volume: ${s.volume}`);
      console.log(`   Avg Volume: ${s.averageVolume}`);
      console.log(`   Dividend Yield: ${s.dividendYield}`);
    } else {
      console.log('   Result:', JSON.stringify(summary).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 3: Asset Profile
  console.log('\n🏢 3. getAssetProfile()');
  try {
    const profile = await ticker.getAssetProfile();
    const p = profile.AAPL as Record<string, unknown>;
    if (p && typeof p === 'object') {
      console.log(`   Industry: ${p.industry}`);
      console.log(`   Sector: ${p.sector}`);
      console.log(`   Employees: ${p.fullTimeEmployees}`);
      console.log(`   Website: ${p.website}`);
      console.log(`   City: ${p.city}, ${p.country}`);
    } else {
      console.log('   Result:', JSON.stringify(profile).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 4: Key Stats
  console.log('\n📉 4. getKeyStats()');
  try {
    const stats = await ticker.getKeyStats();
    const s = stats.AAPL as Record<string, unknown>;
    if (s && typeof s === 'object') {
      console.log(`   Forward P/E: ${s.forwardPE}`);
      console.log(`   PEG Ratio: ${s.pegRatio}`);
      console.log(`   Beta: ${s.beta}`);
      console.log(`   EPS (TTM): $${s.trailingEps}`);
      console.log(`   Shares Outstanding: ${((s.sharesOutstanding as number) / 1e9).toFixed(2)}B`);
    } else {
      console.log('   Result:', JSON.stringify(stats).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 5: Financial Data Summary
  console.log('\n💰 5. getFinancialDataSummary()');
  try {
    const financials = await ticker.getFinancialDataSummary();
    const f = financials.AAPL as Record<string, unknown>;
    if (f && typeof f === 'object') {
      console.log(`   Revenue: $${((f.totalRevenue as number) / 1e9).toFixed(1)}B`);
      console.log(`   Profit Margin: ${((f.profitMargins as number) * 100).toFixed(1)}%`);
      console.log(`   ROE: ${((f.returnOnEquity as number) * 100).toFixed(1)}%`);
      console.log(`   Free Cash Flow: $${((f.freeCashflow as number) / 1e9).toFixed(1)}B`);
      console.log(`   Recommendation: ${f.recommendationKey}`);
    } else {
      console.log('   Result:', JSON.stringify(financials).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 6: Earnings
  console.log('\n💵 6. getEarnings()');
  try {
    const earnings = await ticker.getEarnings();
    const e = earnings.AAPL as Record<string, unknown>;
    if (e && typeof e === 'object') {
      const quarterly = e.earningsChart as Record<string, unknown>;
      if (quarterly?.quarterly) {
        console.log('   Recent Quarterly Earnings:');
        const q = quarterly.quarterly as Array<Record<string, unknown>>;
        q.slice(0, 2).forEach((item) => {
          console.log(`     ${item.date}: Actual $${item.actual}, Est $${item.estimate}`);
        });
      }
    } else {
      console.log('   Result:', JSON.stringify(earnings).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 7: Recommendation Trend
  console.log('\n👍 7. getRecommendationTrend()');
  try {
    const recs = await ticker.getRecommendationTrend();
    const r = recs.AAPL as Record<string, unknown>;
    if (r && typeof r === 'object' && r.trend) {
      const trends = r.trend as Array<Record<string, number>>;
      if (trends.length > 0) {
        const latest = trends[0];
        console.log(`   Strong Buy: ${latest.strongBuy}`);
        console.log(`   Buy: ${latest.buy}`);
        console.log(`   Hold: ${latest.hold}`);
        console.log(`   Sell: ${latest.sell}`);
        console.log(`   Strong Sell: ${latest.strongSell}`);
      }
    } else {
      console.log('   Result:', JSON.stringify(recs).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 8: Historical Data
  console.log('\n📅 8. getHistory()');
  try {
    const history = await ticker.getHistory({ period: '5d', interval: '1d' });
    const h = history.AAPL;
    if (Array.isArray(h) && h.length > 0) {
      console.log(`   Retrieved ${h.length} data points`);
      const latest = h[h.length - 1] as Record<string, unknown>;
      console.log(`   Latest: Date=${latest.date}, Close=$${(latest.close as number)?.toFixed(2)}, Volume=${latest.volume}`);
    } else {
      console.log('   Result:', JSON.stringify(history).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 9: Options Chain
  console.log('\n🎯 9. getOptionChain()');
  try {
    const options = await ticker.getOptionChain();
    const o = options.AAPL as Record<string, unknown>;
    if (o && typeof o === 'object') {
      const calls = o.calls as unknown[];
      const puts = o.puts as unknown[];
      console.log(`   Calls: ${calls?.length || 0} contracts`);
      console.log(`   Puts: ${puts?.length || 0} contracts`);
      if (calls && calls.length > 0) {
        const firstCall = calls[0] as Record<string, unknown>;
        console.log(`   Sample Call: Strike $${firstCall.strike}, Last $${firstCall.lastPrice}`);
      }
    } else {
      console.log('   Result:', JSON.stringify(options).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 10: News
  console.log('\n📰 10. getNews()');
  try {
    const news = await ticker.getNews(5);
    if (Array.isArray(news) && news.length > 0) {
      console.log(`   Retrieved ${news.length} news items`);
      news.slice(0, 2).forEach((item: unknown) => {
        const n = item as Record<string, unknown>;
        console.log(`   - ${(n.title as string)?.slice(0, 60)}...`);
      });
    } else {
      console.log('   Result:', JSON.stringify(news).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 11: Income Statement
  console.log('\n📑 11. getIncomeStatement()');
  try {
    const income = await ticker.getIncomeStatement('a');
    console.log('   Retrieved income statement data');
    console.log('   Result preview:', JSON.stringify(income).slice(0, 150) + '...');
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 12: Balance Sheet
  console.log('\n📋 12. getBalanceSheet()');
  try {
    const balance = await ticker.getBalanceSheet('a');
    console.log('   Retrieved balance sheet data');
    console.log('   Result preview:', JSON.stringify(balance).slice(0, 150) + '...');
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test 13: Cash Flow
  console.log('\n💸 13. getCashFlow()');
  try {
    const cashflow = await ticker.getCashFlow('a');
    console.log('   Retrieved cash flow data');
    console.log('   Result preview:', JSON.stringify(cashflow).slice(0, 150) + '...');
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);
}

async function testFundMethods() {
  console.log('\n' + '='.repeat(60));
  console.log('FUND METHODS (ETF: SPY)');
  console.log('='.repeat(60));

  const spy = new Ticker('SPY');

  // Test Fund Holdings
  console.log('\n🏦 14. getFundTopHoldings()');
  try {
    const holdings = await spy.getFundTopHoldings();
    const h = holdings.SPY;
    if (Array.isArray(h) && h.length > 0) {
      console.log(`   Top ${Math.min(5, h.length)} holdings:`);
      h.slice(0, 5).forEach((item: unknown) => {
        const holding = item as Record<string, unknown>;
        const pct = holding.holdingPercent as Record<string, number>;
        console.log(`   - ${holding.holdingName}: ${((pct?.raw || 0) * 100).toFixed(2)}%`);
      });
    } else {
      console.log('   Result:', JSON.stringify(holdings).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test Fund Performance
  console.log('\n📊 15. getFundPerformance()');
  try {
    const perf = await spy.getFundPerformance();
    const p = perf.SPY as Record<string, unknown>;
    if (p && typeof p === 'object') {
      const trailing = p.trailingReturns as Record<string, Record<string, number>>;
      if (trailing) {
        console.log(`   YTD Return: ${(trailing.ytd?.raw * 100)?.toFixed(2)}%`);
        console.log(`   1 Year Return: ${(trailing.oneYear?.raw * 100)?.toFixed(2)}%`);
        console.log(`   3 Year Return: ${(trailing.threeYear?.raw * 100)?.toFixed(2)}%`);
      }
    } else {
      console.log('   Result:', JSON.stringify(perf).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test Sector Weightings
  console.log('\n🥧 16. getFundSectorWeightings()');
  try {
    const sectors = await spy.getFundSectorWeightings();
    const s = sectors.SPY;
    if (Array.isArray(s) && s.length > 0) {
      console.log('   Sector Weightings:');
      s.slice(0, 5).forEach((item: unknown) => {
        const sector = item as Record<string, Record<string, number>>;
        const key = Object.keys(sector)[0];
        const val = sector[key];
        console.log(`   - ${key}: ${((val?.raw || 0) * 100).toFixed(2)}%`);
      });
    } else {
      console.log('   Result:', JSON.stringify(sectors).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);
}

async function testScreener() {
  console.log('\n' + '='.repeat(60));
  console.log('SCREENER CLASS TESTS');
  console.log('='.repeat(60));

  const screener = new Screener();

  // Test available screeners
  console.log('\n📋 17. availableScreeners');
  const available = screener.availableScreeners;
  console.log(`   Total screeners available: ${available.length}`);
  console.log(`   Sample: ${available.slice(0, 5).join(', ')}`);

  // Test screener info
  console.log('\n📝 18. getScreenerInfo()');
  const info = screener.getScreenerInfo('day_gainers');
  if (info) {
    console.log(`   ID: ${info.id}`);
    console.log(`   Title: ${info.title}`);
  }
  await delay(2000);

  // Test get screeners
  console.log('\n📈 19. getScreeners("day_gainers")');
  try {
    const results = await screener.getScreeners('day_gainers', 5);
    const gainers = results.day_gainers as Record<string, unknown>;
    if (gainers && gainers.quotes) {
      const quotes = gainers.quotes as Array<Record<string, unknown>>;
      console.log(`   Top ${quotes.length} gainers:`);
      quotes.slice(0, 3).forEach((q) => {
        console.log(`   - ${q.symbol}: $${q.regularMarketPrice} (${((q.regularMarketChangePercent as number) || 0).toFixed(2)}%)`);
      });
    } else {
      console.log('   Result:', JSON.stringify(results).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test most actives
  console.log('\n🔥 20. getScreeners("most_actives")');
  try {
    const results = await screener.getScreeners('most_actives', 5);
    const actives = results.most_actives as Record<string, unknown>;
    if (actives && actives.quotes) {
      const quotes = actives.quotes as Array<Record<string, unknown>>;
      console.log(`   Top ${quotes.length} most active:`);
      quotes.slice(0, 3).forEach((q) => {
        console.log(`   - ${q.symbol}: Volume ${q.regularMarketVolume}`);
      });
    } else {
      console.log('   Result:', JSON.stringify(results).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);
}

async function testResearch() {
  console.log('\n' + '='.repeat(60));
  console.log('RESEARCH CLASS TESTS');
  console.log('='.repeat(60));

  const research = new Research();

  // Test earnings calendar
  console.log('\n📅 21. getEarnings() - Calendar');
  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const startDate = today.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];

    const earnings = await research.getEarnings(startDate, endDate, 10);
    if (Array.isArray(earnings) && earnings.length > 0) {
      console.log(`   Found ${earnings.length} upcoming earnings`);
      earnings.slice(0, 3).forEach((e: Record<string, unknown>) => {
        console.log(`   - ${e.ticker}: ${e.companyshortname}`);
      });
    } else {
      console.log('   No upcoming earnings found or:', JSON.stringify(earnings).slice(0, 100));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test IPO calendar
  console.log('\n🚀 22. getIPOs()');
  try {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    const startDate = today.toISOString().split('T')[0];
    const endDate = nextMonth.toISOString().split('T')[0];

    const ipos = await research.getIPOs(startDate, endDate, 10);
    if (Array.isArray(ipos) && ipos.length > 0) {
      console.log(`   Found ${ipos.length} upcoming IPOs`);
      ipos.slice(0, 3).forEach((i: Record<string, unknown>) => {
        console.log(`   - ${i.ticker}: ${i.companyshortname}`);
      });
    } else {
      console.log('   No upcoming IPOs found or:', JSON.stringify(ipos).slice(0, 100));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test splits
  console.log('\n✂️ 23. getSplits()');
  try {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    const startDate = lastMonth.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const splits = await research.getSplits(startDate, endDate, 10);
    if (Array.isArray(splits) && splits.length > 0) {
      console.log(`   Found ${splits.length} recent splits`);
      splits.slice(0, 3).forEach((s: Record<string, unknown>) => {
        console.log(`   - ${s.ticker}: ${s.companyshortname}`);
      });
    } else {
      console.log('   No recent splits found or:', JSON.stringify(splits).slice(0, 100));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);
}

async function testMiscFunctions() {
  console.log('\n' + '='.repeat(60));
  console.log('MISC FUNCTIONS TESTS');
  console.log('='.repeat(60));

  // Test search
  console.log('\n🔍 24. search("Apple")');
  try {
    const results = await search('Apple', { quotesCount: 5 });
    if ('quotes' in results && Array.isArray(results.quotes)) {
      console.log(`   Found ${results.quotes.length} results`);
      results.quotes.slice(0, 3).forEach((q) => {
        console.log(`   - ${q.symbol}: ${q.shortname} (${q.quoteType})`);
      });
    } else {
      console.log('   Result:', JSON.stringify(results).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test currencies
  console.log('\n💱 25. getCurrencies()');
  try {
    const currencies = await getCurrencies();
    if (Array.isArray(currencies) && currencies.length > 0) {
      console.log(`   Found ${currencies.length} currencies`);
      currencies.slice(0, 5).forEach((c) => {
        console.log(`   - ${c.shortName}: ${c.longName}`);
      });
    } else {
      console.log('   Result:', JSON.stringify(currencies).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test market summary
  console.log('\n🌍 26. getMarketSummary()');
  try {
    const summary = await getMarketSummary();
    if (Array.isArray(summary) && summary.length > 0) {
      console.log(`   Found ${summary.length} indices`);
      summary.slice(0, 5).forEach((s) => {
        const price = s.regularMarketPrice as Record<string, unknown>;
        const change = s.regularMarketChangePercent as Record<string, unknown>;
        console.log(`   - ${s.symbol}: ${price?.fmt || price?.raw} (${change?.fmt || ''})`);
      });
    } else {
      console.log('   Result:', JSON.stringify(summary).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test trending
  console.log('\n📈 27. getTrending()');
  try {
    const trending = await getTrending();
    if (trending && trending.quotes) {
      console.log(`   Found ${trending.quotes.length} trending symbols`);
      trending.quotes.slice(0, 5).forEach((q) => {
        console.log(`   - ${q.symbol}`);
      });
    } else {
      console.log('   Result:', JSON.stringify(trending).slice(0, 200));
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
  await delay(2000);

  // Test valid countries
  console.log('\n🌐 28. getValidCountries()');
  const countries = getValidCountries();
  console.log(`   Supported countries (${countries.length}):`);
  console.log(`   ${countries.join(', ')}`);
}

async function testMultipleSymbols() {
  console.log('\n' + '='.repeat(60));
  console.log('MULTIPLE SYMBOLS TEST');
  console.log('='.repeat(60));

  const ticker = new Ticker(['AAPL', 'GOOGL', 'MSFT']);

  console.log('\n📊 29. getPrice() - Multiple Symbols');
  try {
    const prices = await ticker.getPrice();
    for (const [symbol, data] of Object.entries(prices)) {
      const p = data as Record<string, unknown>;
      if (p && typeof p === 'object' && p.regularMarketPrice) {
        console.log(`   ${symbol}: $${p.regularMarketPrice}`);
      } else {
        console.log(`   ${symbol}: ${JSON.stringify(data).slice(0, 50)}`);
      }
    }
  } catch (e) { console.log('   Error:', (e as Error).message); }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      YFINANCE-MCP-TS LIVE API TEST SUITE                   ║');
  console.log('║      Testing all functionalities with real API calls       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n⏳ Note: Adding delays between requests to avoid rate limiting\n');

  const startTime = Date.now();

  try {
    await testTicker();
    await testFundMethods();
    await testScreener();
    await testResearch();
    await testMiscFunctions();
    await testMultipleSymbols();
  } catch (e) {
    console.error('Fatal error:', (e as Error).message);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUITE COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n✅ Completed in ${elapsed} seconds`);
  console.log('📝 29 functionality tests executed');
}

main().catch(console.error);
