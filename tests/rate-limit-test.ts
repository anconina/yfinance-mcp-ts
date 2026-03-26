/**
 * Rate Limit Testing Suite for Yahoo Finance API
 *
 * This test file helps understand Yahoo's rate limiting behavior
 * and tests various bypass strategies. Run with: npx ts-node tests/rate-limit-test.ts
 */

import { createSession } from '../src/core/SessionManager';
import type { SessionManager } from '../src/core/SessionManager';
import { sleep, retry } from '../src/utils/helpers';

// Test configuration
const TEST_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'BRK-B',
  'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD', 'DIS', 'PYPL',
  'BAC', 'ADBE', 'CRM', 'NFLX', 'KO', 'PEP', 'TMO', 'COST', 'NKE',
  'INTC', 'AMD', 'QCOM'
];

interface TestResult {
  testName: string;
  success: boolean;
  requestCount: number;
  errorCount: number;
  rateLimitErrors: number;
  duration: number;
  avgResponseTime: number;
  errors: string[];
}

/**
 * Test 1: Rapid Fire Sequential Requests
 * Tests how many sequential requests can be made before hitting rate limits
 */
async function testRapidFireSequential(session: SessionManager): Promise<TestResult> {
  const result: TestResult = {
    testName: 'Rapid Fire Sequential',
    success: true,
    requestCount: 0,
    errorCount: 0,
    rateLimitErrors: 0,
    duration: 0,
    avgResponseTime: 0,
    errors: []
  };

  const startTime = Date.now();
  const responseTimes: number[] = [];

  console.log('\n📊 Test 1: Rapid Fire Sequential Requests');
  console.log('=' .repeat(50));

  for (const symbol of TEST_SYMBOLS) {
    const reqStart = Date.now();
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
      await session.get(url, { params: { modules: 'price' } });
      result.requestCount++;
      responseTimes.push(Date.now() - reqStart);
      process.stdout.write(`✓ ${symbol} `);
    } catch (error: any) {
      result.errorCount++;
      if (error?.response?.status === 429 || error?.message?.includes('429')) {
        result.rateLimitErrors++;
        result.errors.push(`429 Rate Limit: ${symbol}`);
        console.log(`\n⛔ RATE LIMITED at request ${result.requestCount + 1} (${symbol})`);
      } else {
        result.errors.push(`${symbol}: ${error.message}`);
      }
    }
  }

  result.duration = Date.now() - startTime;
  result.avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;
  result.success = result.rateLimitErrors === 0;

  console.log(`\n\nResults: ${result.requestCount}/${TEST_SYMBOLS.length} successful`);
  console.log(`Duration: ${result.duration}ms | Avg Response: ${result.avgResponseTime.toFixed(0)}ms`);
  console.log(`Rate Limit Errors: ${result.rateLimitErrors}`);

  return result;
}

/**
 * Test 2: Concurrent Batch Requests
 * Tests how the API handles concurrent requests
 */
async function testConcurrentBatch(session: SessionManager): Promise<TestResult> {
  const result: TestResult = {
    testName: 'Concurrent Batch',
    success: true,
    requestCount: 0,
    errorCount: 0,
    rateLimitErrors: 0,
    duration: 0,
    avgResponseTime: 0,
    errors: []
  };

  console.log('\n📊 Test 2: Concurrent Batch Requests');
  console.log('='.repeat(50));

  const startTime = Date.now();
  const batchSize = 10;
  const batches = [];

  // Create batches
  for (let i = 0; i < TEST_SYMBOLS.length; i += batchSize) {
    batches.push(TEST_SYMBOLS.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    console.log(`\nBatch: ${batch.join(', ')}`);
    const batchStart = Date.now();

    try {
      const promises = batch.map(async (symbol) => {
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
        return session.get(url, { params: { modules: 'price' } }).then(() => ({ symbol, success: true }));
      });

      const results = await Promise.allSettled(promises);

      for (const res of results) {
        if (res.status === 'fulfilled') {
          result.requestCount++;
          process.stdout.write(`✓ ${res.value.symbol} `);
        } else {
          result.errorCount++;
          const error = res.reason;
          if (error?.response?.status === 429 || error?.message?.includes('429')) {
            result.rateLimitErrors++;
          }
          result.errors.push(error?.message || 'Unknown error');
        }
      }

      console.log(` [${Date.now() - batchStart}ms]`);
    } catch (error: any) {
      console.log(`Batch error: ${error.message}`);
    }
  }

  result.duration = Date.now() - startTime;
  result.success = result.rateLimitErrors === 0;

  console.log(`\nResults: ${result.requestCount}/${TEST_SYMBOLS.length} successful`);
  console.log(`Duration: ${result.duration}ms`);
  console.log(`Rate Limit Errors: ${result.rateLimitErrors}`);

  return result;
}

/**
 * Test 3: Delayed Sequential Requests
 * Tests with delays between requests
 */
async function testDelayedSequential(session: SessionManager, delayMs: number): Promise<TestResult> {
  const result: TestResult = {
    testName: `Delayed Sequential (${delayMs}ms)`,
    success: true,
    requestCount: 0,
    errorCount: 0,
    rateLimitErrors: 0,
    duration: 0,
    avgResponseTime: 0,
    errors: []
  };

  const symbols = TEST_SYMBOLS.slice(0, 10); // Use fewer symbols for delayed test

  console.log(`\n📊 Test 3: Delayed Sequential Requests (${delayMs}ms delay)`);
  console.log('='.repeat(50));

  const startTime = Date.now();
  const responseTimes: number[] = [];

  for (const symbol of symbols) {
    const reqStart = Date.now();
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
      await session.get(url, { params: { modules: 'price,financialData' } });
      result.requestCount++;
      responseTimes.push(Date.now() - reqStart);
      process.stdout.write(`✓ ${symbol} `);
    } catch (error: any) {
      result.errorCount++;
      if (error?.response?.status === 429) {
        result.rateLimitErrors++;
      }
      result.errors.push(`${symbol}: ${error.message}`);
    }

    await sleep(delayMs);
  }

  result.duration = Date.now() - startTime;
  result.avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;
  result.success = result.rateLimitErrors === 0;

  console.log(`\n\nResults: ${result.requestCount}/${symbols.length} successful`);
  console.log(`Duration: ${result.duration}ms | Avg Response: ${result.avgResponseTime.toFixed(0)}ms`);

  return result;
}

/**
 * Test 4: Retry with Exponential Backoff
 * Tests the retry mechanism on rate-limited requests
 */
async function testRetryMechanism(session: SessionManager): Promise<TestResult> {
  const result: TestResult = {
    testName: 'Retry with Exponential Backoff',
    success: true,
    requestCount: 0,
    errorCount: 0,
    rateLimitErrors: 0,
    duration: 0,
    avgResponseTime: 0,
    errors: []
  };

  console.log('\n📊 Test 4: Retry with Exponential Backoff');
  console.log('='.repeat(50));

  const startTime = Date.now();
  const symbols = TEST_SYMBOLS.slice(0, 5);

  for (const symbol of symbols) {
    let retryCount = 0;

    try {
      await retry(
        async () => {
          retryCount++;
          const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
          return session.get(url, { params: { modules: 'price,financialData,summaryDetail' } });
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          factor: 2
        }
      );
      result.requestCount++;
      console.log(`✓ ${symbol} (${retryCount} attempt${retryCount > 1 ? 's' : ''})`);
    } catch (error: any) {
      result.errorCount++;
      if (error?.response?.status === 429) {
        result.rateLimitErrors++;
      }
      console.log(`✗ ${symbol} (failed after ${retryCount} attempts)`);
      result.errors.push(`${symbol}: ${error.message}`);
    }
  }

  result.duration = Date.now() - startTime;
  result.success = result.rateLimitErrors === 0 || result.requestCount > 0;

  console.log(`\nResults: ${result.requestCount}/${symbols.length} successful`);
  console.log(`Duration: ${result.duration}ms`);

  return result;
}

/**
 * Test 5: New Session Per Request
 * Tests if creating new sessions helps bypass rate limits
 */
async function testNewSessionPerBatch(): Promise<TestResult> {
  const result: TestResult = {
    testName: 'New Session Per Batch',
    success: true,
    requestCount: 0,
    errorCount: 0,
    rateLimitErrors: 0,
    duration: 0,
    avgResponseTime: 0,
    errors: []
  };

  console.log('\n📊 Test 5: New Session Per Batch');
  console.log('='.repeat(50));

  const startTime = Date.now();
  const symbols = TEST_SYMBOLS.slice(0, 15);
  const batchSize = 5;

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    console.log(`\nNew session for batch: ${batch.join(', ')}`);

    try {
      const session = await createSession();

      for (const symbol of batch) {
        try {
          const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`;
          await session.get(url, { params: { modules: 'price' } });
          result.requestCount++;
          process.stdout.write(`✓ ${symbol} `);
        } catch (error: any) {
          result.errorCount++;
          if (error?.response?.status === 429) {
            result.rateLimitErrors++;
          }
          result.errors.push(`${symbol}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.log(`Session creation error: ${error.message}`);
    }

    await sleep(1000); // Brief pause between batches
  }

  result.duration = Date.now() - startTime;
  result.success = result.rateLimitErrors === 0;

  console.log(`\n\nResults: ${result.requestCount}/${symbols.length} successful`);
  console.log(`Duration: ${result.duration}ms`);

  return result;
}

/**
 * Test 6: Multi-Symbol Query (Single Request)
 * Tests batch fetching in a single API call
 */
async function testMultiSymbolQuery(session: SessionManager): Promise<TestResult> {
  const result: TestResult = {
    testName: 'Multi-Symbol Single Request',
    success: true,
    requestCount: 0,
    errorCount: 0,
    rateLimitErrors: 0,
    duration: 0,
    avgResponseTime: 0,
    errors: []
  };

  console.log('\n📊 Test 6: Multi-Symbol Single Request');
  console.log('='.repeat(50));

  const startTime = Date.now();

  try {
    // Use the quotes endpoint which supports multiple symbols
    const symbols = TEST_SYMBOLS.slice(0, 20).join(',');
    const url = 'https://query2.finance.yahoo.com/v7/finance/quote';

    const response = await session.get<any>(url, {
      params: { symbols }
    });

    const quotes = response?.quoteResponse?.result || [];
    result.requestCount = 1;
    result.success = quotes.length > 0;

    console.log(`✓ Fetched ${quotes.length} quotes in a single request`);
    quotes.forEach((q: any) => {
      console.log(`  - ${q.symbol}: $${q.regularMarketPrice}`);
    });
  } catch (error: any) {
    result.errorCount++;
    if (error?.response?.status === 429) {
      result.rateLimitErrors++;
    }
    result.errors.push(error.message);
    console.log(`✗ Error: ${error.message}`);
  }

  result.duration = Date.now() - startTime;
  console.log(`\nDuration: ${result.duration}ms`);

  return result;
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 YAHOO FINANCE RATE LIMIT TESTING SUITE');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Test symbols: ${TEST_SYMBOLS.length}`);

  const results: TestResult[] = [];

  try {
    // Create initial session
    console.log('\n🔧 Initializing session...');
    const session = await createSession();
    console.log(`✓ Session initialized`);
    console.log(`  Browser: ${session.getImpersonation().browser}`);
    console.log(`  Crumb: ${session.getCrumbValue() ? 'obtained' : 'not obtained'}`);

    // Run tests with pauses between to reset rate limits
    results.push(await testRapidFireSequential(session));
    await sleep(5000);

    results.push(await testConcurrentBatch(session));
    await sleep(5000);

    results.push(await testDelayedSequential(session, 500));
    await sleep(5000);

    results.push(await testRetryMechanism(session));
    await sleep(5000);

    results.push(await testNewSessionPerBatch());
    await sleep(5000);

    results.push(await testMultiSymbolQuery(session));

  } catch (error: any) {
    console.error('Fatal error:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));

  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.testName}`);
    console.log(`   Requests: ${r.requestCount} | Errors: ${r.errorCount} | Rate Limits: ${r.rateLimitErrors}`);
    console.log(`   Duration: ${r.duration}ms`);
    if (r.errors.length > 0) {
      console.log(`   Sample errors: ${r.errors.slice(0, 2).join(', ')}`);
    }
    console.log('');
  }

  console.log('Finished at:', new Date().toISOString());
  console.log('='.repeat(60));
}

// Run if executed directly
runAllTests().catch(console.error);
