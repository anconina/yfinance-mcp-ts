/**
 * Screener - Access Yahoo Finance predefined stock screeners
 *
 * Provides access to day gainers, most actives, aggressive small caps, and more.
 */

import { BaseFinance } from './BaseFinance';
import { SCREENERS } from '../config/screeners';
import { BaseFinanceOptions } from '../types';

// Screener result type
export interface ScreenerQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  averageDailyVolume3Month?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  trailingPE?: number;
  [key: string]: unknown;
}

export interface ScreenerResult {
  quotes: ScreenerQuote[];
  start?: number;
  count?: number;
  total?: number;
  [key: string]: unknown;
}

export class Screener extends BaseFinance {
  constructor(options: BaseFinanceOptions = {}) {
    super(options);
    // Screener doesn't need symbols
    this._symbols = [];
  }

  /**
   * Get list of available screener keys
   */
  get availableScreeners(): string[] {
    return Object.keys(SCREENERS);
  }

  /**
   * Get information about a specific screener
   */
  getScreenerInfo(screenerId: string): { id: string; title: string; desc: string } | null {
    const screener = SCREENERS[screenerId];
    if (!screener) return null;
    return {
      id: screener.id,
      title: screener.title,
      desc: screener.desc,
    };
  }

  /**
   * Get screener results
   * @param screenIds - Screener key(s) to query (e.g., 'day_gainers', 'most_actives')
   * @param count - Number of results per screener (default: 25)
   */
  async getScreeners(
    screenIds: string | string[],
    count = 25
  ): Promise<Record<string, ScreenerResult>> {
    await this.initialize();

    const validIds = this.checkScreenIds(screenIds);
    const results: Record<string, ScreenerResult> = {};

    // Make requests for each screener
    const promises = validIds.map(async (screenKey) => {
      const screener = SCREENERS[screenKey];
      const scrId = screener.id;

      try {
        const response = await this.session.get<{
          finance: { result: Array<{ quotes: ScreenerQuote[] }> };
        }>(
          'https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved',
          {
            params: {
              scrIds: scrId,
              count,
              ...this.defaultQueryParams,
            },
          }
        );

        const result = response.finance?.result?.[0];
        return { key: screenKey, data: result || { quotes: [] } };
      } catch (error) {
        return {
          key: screenKey,
          data: { quotes: [], error: (error as Error).message },
        };
      }
    });

    const responses = await Promise.all(promises);

    for (const { key, data } of responses) {
      results[key] = data as ScreenerResult;
    }

    return results;
  }

  /**
   * Validate screen IDs
   */
  private checkScreenIds(screenIds: string | string[]): string[] {
    const ids = typeof screenIds === 'string'
      ? screenIds.match(/[a-zA-Z0-9_]+/g) ?? []
      : screenIds;

    const invalid = ids.filter((id) => !SCREENERS[id]);
    if (invalid.length > 0) {
      const availablePreview = Object.keys(SCREENERS).slice(0, 10).join(', ');
      throw new Error(
        `Invalid screener(s): ${invalid.join(', ')}. ` +
        `Examples of valid screeners: ${availablePreview}... ` +
        `Use .availableScreeners to see all options.`
      );
    }

    return ids;
  }
}

/**
 * Create and initialize a Screener instance
 */
export async function createScreener(options: BaseFinanceOptions = {}): Promise<Screener> {
  const screener = new Screener(options);
  await screener['initialize']();
  return screener;
}
