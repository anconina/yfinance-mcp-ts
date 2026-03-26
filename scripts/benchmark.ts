#!/usr/bin/env npx ts-node
/**
 * Benchmark script for comparing impit vs axios HTTP client performance
 *
 * Usage: npm run benchmark
 */

import { Ticker } from '../src/core/Ticker';
import type { HttpClientType } from '../src/types/impit';

interface BenchmarkResult {
  client: HttpClientType;
  operation: string;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
  errors: string[];
}

interface TimingResult {
  success: boolean;
  time: number;
  error?: string;
}

async function measureTime<T>(fn: () => Promise<T>): Promise<TimingResult> {
  const start = performance.now();
  try {
    await fn();
    return { success: true, time: performance.now() - start };
  } catch (error) {
    return {
      success: false,
      time: performance.now() - start,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function benchmarkOperation(
  client: HttpClientType,
  operation: string,
  fn: () => Promise<unknown>,
  iterations: number
): Promise<BenchmarkResult> {
  const times: number[] = [];
  const errors: string[] = [];

  console.log(`  Running ${iterations} iterations of ${operation}...`);

  for (let i = 0; i < iterations; i++) {
    const result = await measureTime(fn);
    times.push(result.time);
    if (!result.success && result.error) {
      errors.push(result.error);
    }
    // Small delay between iterations to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const successfulTimes = times.filter((_, i) => i < times.length - errors.length || errors.length === 0);

  return {
    client,
    operation,
    totalTime: times.reduce((a, b) => a + b, 0),
    avgTime: successfulTimes.length > 0
      ? successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length
      : 0,
    minTime: successfulTimes.length > 0 ? Math.min(...successfulTimes) : 0,
    maxTime: successfulTimes.length > 0 ? Math.max(...successfulTimes) : 0,
    successRate: ((iterations - errors.length) / iterations) * 100,
    errors: [...new Set(errors)] // Unique errors only
  };
}

function formatMs(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

function printResults(results: BenchmarkResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK RESULTS');
  console.log('='.repeat(80));

  // Group by operation
  const operations = [...new Set(results.map(r => r.operation))];

  for (const op of operations) {
    console.log(`\n${op}:`);
    console.log('-'.repeat(60));

    const opResults = results.filter(r => r.operation === op);

    // Print header
    console.log(
      'Client'.padEnd(10) +
      'Avg'.padStart(10) +
      'Min'.padStart(10) +
      'Max'.padStart(10) +
      'Success'.padStart(10)
    );

    for (const result of opResults) {
      console.log(
        result.client.padEnd(10) +
        formatMs(result.avgTime).padStart(10) +
        formatMs(result.minTime).padStart(10) +
        formatMs(result.maxTime).padStart(10) +
        `${result.successRate.toFixed(0)}%`.padStart(10)
      );

      if (result.errors.length > 0) {
        console.log(`    Errors: ${result.errors.slice(0, 3).join(', ')}`);
      }
    }

    // Calculate and print comparison
    const impitResult = opResults.find(r => r.client === 'impit');
    const axiosResult = opResults.find(r => r.client === 'axios');

    if (impitResult && axiosResult && impitResult.avgTime > 0 && axiosResult.avgTime > 0) {
      const speedup = ((axiosResult.avgTime - impitResult.avgTime) / axiosResult.avgTime * 100);
      const comparison = speedup > 0
        ? `impit is ${speedup.toFixed(1)}% faster`
        : `axios is ${Math.abs(speedup).toFixed(1)}% faster`;
      console.log(`\n  -> ${comparison}`);
    }
  }
}

async function main() {
  const symbols = ['AAPL', 'MSFT', 'GOOGL'];
  const iterations = 3;
  const results: BenchmarkResult[] = [];

  console.log('='.repeat(80));
  console.log('Yahoo Finance HTTP Client Benchmark');
  console.log('='.repeat(80));
  console.log(`Symbols: ${symbols.join(', ')}`);
  console.log(`Iterations per test: ${iterations}`);
  console.log('');

  // Check if impit is available
  let impitAvailable = true;
  try {
    const testTicker = new Ticker('AAPL', { httpClient: 'impit' });
    // Quick check - just instantiate, don't make requests
    if (!testTicker) impitAvailable = false;
  } catch {
    console.log('Note: impit is not available, skipping impit benchmarks');
    impitAvailable = false;
  }

  const clients: HttpClientType[] = impitAvailable ? ['impit', 'axios'] : ['axios'];

  for (const client of clients) {
    console.log(`\n${'*'.repeat(40)}`);
    console.log(`Benchmarking: ${client.toUpperCase()}`);
    console.log('*'.repeat(40));

    const clientOptions = {
      httpClient: client,
      requestDelay: 50  // Minimal delay for benchmark
    };

    // Test 1: Single Quote
    console.log('\n[1] Single Quote Fetch');
    results.push(await benchmarkOperation(
      client,
      'Single Quote',
      async () => {
        const ticker = new Ticker('AAPL', clientOptions);
        return ticker.getPrice();
      },
      iterations
    ));

    // Test 2: Historical Data
    console.log('\n[2] Historical Data (1 month)');
    results.push(await benchmarkOperation(
      client,
      'Historical Data',
      async () => {
        const ticker = new Ticker('AAPL', clientOptions);
        return ticker.getHistory({ period: '1mo', interval: '1d' });
      },
      iterations
    ));

    // Test 3: Multiple Quotes (Sequential)
    console.log('\n[3] Multiple Quotes (3 symbols, sequential)');
    results.push(await benchmarkOperation(
      client,
      'Multiple Quotes (seq)',
      async () => {
        const quotes = [];
        for (const symbol of symbols) {
          const ticker = new Ticker(symbol, clientOptions);
          quotes.push(await ticker.getPrice());
        }
        return quotes;
      },
      iterations
    ));

    // Test 4: Options Chain
    console.log('\n[4] Options Chain');
    results.push(await benchmarkOperation(
      client,
      'Options Chain',
      async () => {
        const ticker = new Ticker('AAPL', clientOptions);
        return ticker.getOptionChain();
      },
      iterations
    ));
  }

  // Print final results
  printResults(results);

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  if (impitAvailable && results.some(r => r.client === 'axios')) {
    const impitResults = results.filter(r => r.client === 'impit');
    const axiosResults = results.filter(r => r.client === 'axios');

    const impitSuccessRate = impitResults.reduce((a, b) => a + b.successRate, 0) / impitResults.length;
    const axiosSuccessRate = axiosResults.reduce((a, b) => a + b.successRate, 0) / axiosResults.length;

    console.log(`\nimpit overall success rate: ${impitSuccessRate.toFixed(1)}%`);
    console.log(`axios overall success rate: ${axiosSuccessRate.toFixed(1)}%`);

    if (impitSuccessRate > axiosSuccessRate) {
      console.log(`\nimpit has ${(impitSuccessRate - axiosSuccessRate).toFixed(1)}% higher success rate`);
      console.log('This indicates better rate limit bypass with browser impersonation.');
    } else if (axiosSuccessRate > impitSuccessRate) {
      console.log(`\naxios has ${(axiosSuccessRate - impitSuccessRate).toFixed(1)}% higher success rate`);
    } else {
      console.log('\nBoth clients have equal success rates.');
    }
  }

  console.log('\nBenchmark complete!');
}

main().catch(console.error);
