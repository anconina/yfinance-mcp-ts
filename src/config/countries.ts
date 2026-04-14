/**
 * Country-specific configuration for Yahoo Finance API requests.
 * Different regions use different language, region codes, and CORS domains.
 */

export interface CountryConfig {
  lang: string;
  region: string;
  corsDomain: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  'france': {
    lang: 'fr-FR',
    region: 'FR',
    corsDomain: 'fr.finance.yahoo.com',
  },
  'india': {
    lang: 'en-IN',
    region: 'IN',
    corsDomain: 'in.finance.yahoo.com',
  },
  'hong kong': {
    lang: 'zh-Hant-HK',
    region: 'HK',
    corsDomain: 'hk.finance.yahoo.com',
  },
  'germany': {
    lang: 'de-DE',
    region: 'DE',
    corsDomain: 'de.finance.yahoo.com',
  },
  'canada': {
    lang: 'en-CA',
    region: 'CA',
    corsDomain: 'ca.finance.yahoo.com',
  },
  'spain': {
    lang: 'es-ES',
    region: 'ES',
    corsDomain: 'es.finance.yahoo.com',
  },
  'italy': {
    lang: 'it-IT',
    region: 'IT',
    corsDomain: 'it.finance.yahoo.com',
  },
  'united states': {
    lang: 'en-US',
    region: 'US',
    corsDomain: 'finance.yahoo.com',
  },
  'australia': {
    lang: 'en-AU',
    region: 'AU',
    corsDomain: 'au.finance.yahoo.com',
  },
  'united kingdom': {
    lang: 'en-GB',
    region: 'GB',
    corsDomain: 'uk.finance.yahoo.com',
  },
  'brazil': {
    lang: 'pt-BR',
    region: 'BR',
    corsDomain: 'br.financas.yahoo.com',
  },
  'new zealand': {
    lang: 'en-NZ',
    region: 'NZ',
    corsDomain: 'nz.finance.yahoo.com',
  },
  'singapore': {
    lang: 'en-SG',
    region: 'SG',
    corsDomain: 'sg.finance.yahoo.com',
  },
  'taiwan': {
    lang: 'zh-tw',
    region: 'TW',
    corsDomain: 'tw.finance.yahoo.com',
  },
};

/**
 * Get country configuration by name (case-insensitive)
 * @throws Error if country is not found
 */
export function getCountryConfig(country: string): CountryConfig {
  const resolved = resolveCountry(country);

  if (!resolved) {
    const validCountries = Object.keys(COUNTRIES).join(', ');
    throw new Error(
      `"${country}" is not a valid country. Valid countries include: ${validCountries}`
    );
  }

  return COUNTRIES[resolved];
}

/**
 * Resolve a country input to its canonical name.
 * Accepts full name ("united states") or ISO region code ("US").
 * Returns the canonical name or undefined if not found.
 */
export function resolveCountry(input: string): string | undefined {
  const lower = input.toLowerCase();
  if (lower in COUNTRIES) return lower;

  const upper = input.toUpperCase();
  for (const [name, config] of Object.entries(COUNTRIES)) {
    if (config.region === upper) return name;
  }
  return undefined;
}

/**
 * Check if a country is valid (accepts full name or ISO code)
 */
export function isValidCountry(country: string): boolean {
  return resolveCountry(country) !== undefined;
}

/**
 * Get list of all valid country names
 */
export function getValidCountries(): string[] {
  return Object.keys(COUNTRIES);
}
