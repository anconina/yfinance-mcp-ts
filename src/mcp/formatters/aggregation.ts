/**
 * OHLCV Aggregation, Price Statistics, and Auto-Interval Selection
 *
 * Provides daily-to-weekly/monthly OHLCV bucketing, pre-computed price
 * statistics (return%, volatility, max drawdown), and period-to-interval mapping.
 */

import { DateTime } from 'luxon';

export interface OHLCVRow {
  date: string;   // ISO date string: '2026-03-13'
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceStats {
  returnPct: number;      // Total return percentage
  annualizedVol: number;  // Annualized volatility
  maxDrawdown: number;    // Maximum drawdown percentage (negative value)
  avgVolume: number;      // Average volume
}

/**
 * Groups daily OHLCV rows into weekly or monthly candles using Luxon date bucketing.
 *
 * Rules:
 * - Weekly: Group by ISO week start (Monday) via DateTime.startOf('week')
 * - Monthly: Group by month start via DateTime.startOf('month')
 * - Open = first candle's open in bucket
 * - High = max of all highs in bucket
 * - Low = min of all lows in bucket
 * - Close = last candle's close in bucket
 * - Volume = sum of all volumes in bucket
 * - Date = bucket key (week/month start date)
 *
 * Assumes rows are sorted chronologically (no re-sorting).
 */
export function aggregateOHLCV(
  rows: OHLCVRow[],
  period: 'weekly' | 'monthly'
): OHLCVRow[] {
  if (rows.length === 0) return [];

  const bucketKey = period === 'weekly' ? 'week' : 'month';
  const buckets = new Map<string, OHLCVRow[]>();

  for (const row of rows) {
    const dt = DateTime.fromISO(row.date);
    const key = dt.startOf(bucketKey).toISODate()!;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(row);
  }

  const result: OHLCVRow[] = [];
  for (const [key, bucket] of buckets) {
    result.push({
      date: key,
      open: bucket[0].open,
      high: Math.max(...bucket.map(r => r.high)),
      low: Math.min(...bucket.map(r => r.low)),
      close: bucket[bucket.length - 1].close,
      volume: bucket.reduce((sum, r) => sum + r.volume, 0),
    });
  }

  return result;
}

/**
 * Computes summary statistics from a price series.
 *
 * - returnPct: ((last close - first close) / first close) * 100
 * - annualizedVol: stddev(daily_returns) * sqrt(252), population stddev
 * - maxDrawdown: maximum peak-to-trough decline as a percentage (negative or zero)
 * - avgVolume: mean of all volume values
 */
export function computeStats(rows: OHLCVRow[]): PriceStats {
  if (rows.length === 0) {
    return { returnPct: 0, annualizedVol: 0, maxDrawdown: 0, avgVolume: 0 };
  }

  if (rows.length === 1) {
    return {
      returnPct: 0,
      annualizedVol: 0,
      maxDrawdown: 0,
      avgVolume: rows[0].volume,
    };
  }

  const closes = rows.map(r => r.close);
  const firstClose = closes[0];
  const lastClose = closes[closes.length - 1];

  // Return percentage
  const returnPct = ((lastClose - firstClose) / firstClose) * 100;

  // Daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }

  // Population standard deviation of daily returns
  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / dailyReturns.length;
  const stddev = Math.sqrt(variance);

  // Annualized volatility
  const annualizedVol = stddev * Math.sqrt(252) * 100;

  // Max drawdown
  let peak = closes[0];
  let maxDrawdown = 0;
  for (const close of closes) {
    if (close > peak) {
      peak = close;
    }
    const drawdown = ((close - peak) / peak) * 100;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Average volume
  const avgVolume =
    rows.reduce((sum, r) => sum + r.volume, 0) / rows.length;

  return { returnPct, annualizedVol, maxDrawdown, avgVolume };
}

/** Known Yahoo period string to aggregation interval mapping. */
const INTERVAL_MAP: Record<string, 'daily' | 'weekly' | 'monthly'> = {
  '1d': 'daily',
  '5d': 'daily',
  '1mo': 'daily',
  '3mo': 'daily',
  '6mo': 'weekly',
  '1y': 'weekly',
  '2y': 'monthly',
  '5y': 'monthly',
  '10y': 'monthly',
  'max': 'monthly',
  'ytd': 'daily',
};

/**
 * Maps Yahoo period strings to recommended aggregation intervals.
 *
 * Thresholds from design doc:
 * - 1d, 5d, 1mo, 3mo -> daily
 * - 6mo, 1y -> weekly
 * - 2y, 5y, 10y, max -> monthly
 */
export function autoSelectInterval(
  periodStr: string
): 'daily' | 'weekly' | 'monthly' {
  const direct = INTERVAL_MAP[periodStr];
  if (direct) return direct;

  // Fallback: parse number + unit for unknown period strings
  const match = periodStr.match(/^(\d+)(d|mo|y)$/);
  if (!match) return 'monthly'; // Unknown format, default to monthly

  const num = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === 'd') return 'daily';
  if (unit === 'mo' && num <= 3) return 'daily';
  if (unit === 'mo') return 'weekly';
  if (unit === 'y' && num <= 1) return 'weekly';
  return 'monthly';
}
