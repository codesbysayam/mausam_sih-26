export type WeatherNewsCategory =
  | 'all'
  | 'cyclone'
  | 'rainfall'
  | 'thunderstorm'
  | 'flood'
  | 'aqi'
  | 'agriculture'
  | 'general';

export interface WeatherNewsArticle {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  fetchedAt: string;
  snippet: string;
  category: Exclude<WeatherNewsCategory, 'all'>;
  regionTags: string[];
  isStale: boolean;
  freshness: 'RECENT' | 'STALE';
  ageHours: number | null;
  observationType: 'MEDIA';
}

export interface OfficialWeatherSourceLink {
  title: string;
  authority: string;
  url: string;
  category: string;
}

export interface WeatherNewsPayload {
  status: 'OK' | 'STALE' | 'UNAVAILABLE';
  fetchedAt: string;
  freshnessWindowHours: number;
  articles: WeatherNewsArticle[];
  officialSources: OfficialWeatherSourceLink[];
  disclaimer: string;
  error?: string | null;
}

const DEFAULT_OFFICIAL_SOURCES: OfficialWeatherSourceLink[] = [
  {
    title: 'IMD All-India Weather & Cyclone Bulletin Archive',
    authority: 'India Meteorological Department (IMD)',
    url: 'https://mausam.imd.gov.in/responsive/cyclone_bulletin_archive.php',
    category: 'Cyclone & Synoptic',
  },
  {
    title: 'RSMC New Delhi — Tropical Cyclone Advisories',
    authority: 'Regional Specialised Meteorological Centre (IMD)',
    url: 'https://rsmcnewdelhi.imd.gov.in/',
    category: 'Cyclone',
  },
  {
    title: 'NDMA SACHET — Official Common Alerting Protocol Portal',
    authority: 'National Disaster Management Authority (NDMA)',
    url: 'https://sachet.ndma.gov.in/',
    category: 'Official Alerts',
  },
];

let clientCache: { payload: WeatherNewsPayload; ts: number } | null = null;
const CLIENT_TTL_MS = 5 * 60 * 1000;

export async function fetchWeatherNews(options?: {
  category?: WeatherNewsCategory;
  region?: string;
  force?: boolean;
}): Promise<WeatherNewsPayload> {
  const now = Date.now();
  const useCache =
    !options?.force &&
    (!options?.category || options.category === 'all') &&
    !options?.region &&
    clientCache &&
    now - clientCache.ts < CLIENT_TTL_MS;

  if (useCache && clientCache) {
    return clientCache.payload;
  }

  try {
    const params = new URLSearchParams();
    if (options?.category && options.category !== 'all') params.set('category', options.category);
    if (options?.region) params.set('region', options.region);
    if (options?.force) params.set('force', '1');
    const qs = params.toString();

    const res = await fetch(`/api/weather-news${qs ? `?${qs}` : ''}`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Weather news endpoint returned HTTP ${res.status}`);
    }

    const payload: WeatherNewsPayload = await res.json();
    if ((!options?.category || options.category === 'all') && !options?.region) {
      clientCache = { payload, ts: now };
    }
    return payload;
  } catch (err: any) {
    return {
      status: 'UNAVAILABLE',
      fetchedAt: new Date().toISOString(),
      freshnessWindowHours: 24,
      articles: [],
      officialSources: DEFAULT_OFFICIAL_SOURCES,
      disclaimer:
        'Media reporting provides context only and never supersedes official IMD or NDMA SACHET alerts.',
      error: err?.message || 'Unable to reach weather news aggregation service.',
    };
  }
}
