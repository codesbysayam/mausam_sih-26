import { Router, Request, Response } from 'express';

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

export interface WeatherNewsPayload {
  status: 'OK' | 'STALE' | 'UNAVAILABLE';
  fetchedAt: string;
  freshnessWindowHours: number;
  articles: WeatherNewsArticle[];
  officialSources: {
    title: string;
    authority: string;
    url: string;
    category: string;
  }[];
  disclaimer: string;
  error?: string | null;
}

export const weatherNewsRouter = Router();

const CACHE_TTL_MS = 7 * 60 * 1000; // 7 minutes
const STALE_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const FRESHNESS_WINDOW_HOURS = 24;
const MAX_RESPONSE_BYTES = 512 * 1024; // 512 KB bounded read

const OFFICIAL_WEATHER_SOURCES = [
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
  {
    title: 'IMD Current Agromet Advisories (GKMS)',
    authority: 'IMD Agromet Division',
    url: 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_state_current.php',
    category: 'Agriculture',
  },
];

const RSS_FEED_URLS = [
  'https://news.google.com/rss/search?q=(IMD%20OR%20%22weather%20warning%22%20OR%20cyclone%20OR%20%22deep%20depression%22)%20India&hl=en-IN&gl=IN&ceid=IN:en',
  'https://news.google.com/rss/search?q=(%22heavy%20rainfall%22%20OR%20heatwave%20OR%20AQI%20OR%20flood%20OR%20monsoon)%20India%20IMD&hl=en-IN&gl=IN&ceid=IN:en',
];

let cachedNews: { payload: WeatherNewsPayload; fetchedMs: number } | null = null;

function isSafePublicHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function canonicalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'oc',
      'ref',
      'source',
    ];
    for (const p of trackingParams) {
      u.searchParams.delete(p);
    }
    return u.toString();
  } catch {
    return rawUrl.trim();
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    });
}

function stripTagsAndScripts(input: string): string {
  const decoded = decodeHtmlEntities(input);
  return decoded
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyArticleCategory(text: string): Exclude<WeatherNewsCategory, 'all'> {
  const lower = text.toLowerCase();
  if (/(cyclone|cyclonic|deep depression|depression|storm surge|landfall|akvan|bay of bengal|arabian sea)/i.test(lower)) {
    return 'cyclone';
  }
  if (/(aqi|air quality|pm2\.5|pm10|smog|pollution|cpcb|grap)/i.test(lower)) {
    return 'aqi';
  }
  if (/(flood|inundation|waterlogging|river level|dam release|overflow)/i.test(lower)) {
    return 'flood';
  }
  if (/(thunderstorm|lightning|squall|hailstorm|kalbaishakhi|dust storm)/i.test(lower)) {
    return 'thunderstorm';
  }
  if (/(agromet|crop|farmer|kharif|rabi|sowing|harvest|irrigation|gkms)/i.test(lower)) {
    return 'agriculture';
  }
  if (/(rain|rainfall|monsoon|shower|downpour|cloudburst|precipitation)/i.test(lower)) {
    return 'rainfall';
  }
  return 'general';
}

const REGION_KEYWORDS = [
  'Odisha',
  'Andhra Pradesh',
  'Tamil Nadu',
  'West Bengal',
  'Telangana',
  'Chhattisgarh',
  'Maharashtra',
  'Gujarat',
  'Kerala',
  'Karnataka',
  'Delhi',
  'Punjab',
  'Haryana',
  'Uttar Pradesh',
  'Bihar',
  'Assam',
  'Tripura',
  'Puducherry',
  'Rajasthan',
  'Madhya Pradesh',
  'Himachal Pradesh',
  'Uttarakhand',
  'Bay of Bengal',
  'Arabian Sea',
  'India',
];

function extractRegionTags(text: string): string[] {
  const lower = text.toLowerCase();
  const matched = REGION_KEYWORDS.filter((region) => lower.includes(region.toLowerCase()));
  return matched.length > 0 ? matched.slice(0, 4) : ['India'];
}

function parseRssXml(xml: string, fetchedAt: string): WeatherNewsArticle[] {
  const items: WeatherNewsArticle[] = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const getTag = (tag: string): string => {
      const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const m = block.match(re);
      return m ? m[1].trim() : '';
    };

    const rawTitle = stripTagsAndScripts(getTag('title'));
    const rawLink = decodeHtmlEntities(getTag('link')).trim();
    const rawPubDate = stripTagsAndScripts(getTag('pubDate'));
    const rawDesc = stripTagsAndScripts(getTag('description'));
    const rawSource = stripTagsAndScripts(getTag('source'));

    if (!rawTitle || !rawLink || !isSafePublicHttpUrl(rawLink)) continue;

    // Google News titles often end with " - Publisher Name"
    let cleanTitle = rawTitle;
    let publisher = rawSource || 'News Wire';
    if (!rawSource && rawTitle.includes(' - ')) {
      const lastDash = rawTitle.lastIndexOf(' - ');
      const candidatePub = rawTitle.slice(lastDash + 3).trim();
      if (candidatePub.length > 1 && candidatePub.length < 60) {
        publisher = candidatePub;
        cleanTitle = rawTitle.slice(0, lastDash).trim();
      }
    } else if (rawSource && rawTitle.endsWith(` - ${rawSource}`)) {
      cleanTitle = rawTitle.slice(0, rawTitle.length - rawSource.length - 3).trim();
    }

    let publishedIso: string | null = null;
    let ageHours: number | null = null;
    if (rawPubDate) {
      const parsedDate = new Date(rawPubDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        publishedIso = parsedDate.toISOString();
        ageHours = Math.max(0, Math.round(((Date.now() - parsedDate.getTime()) / 3600000) * 10) / 10);
      }
    }

    const isStale = ageHours === null ? true : ageHours > FRESHNESS_WINDOW_HOURS;
    const canonicalUrl = canonicalizeUrl(rawLink);
    const cleanSnippet = rawDesc && rawDesc !== rawTitle ? rawDesc.slice(0, 220) : '';
    const combinedText = `${cleanTitle} ${cleanSnippet}`;

    // Build deterministic ID from canonical URL
    let hash = 0;
    for (let i = 0; i < canonicalUrl.length; i++) {
      hash = (hash * 31 + canonicalUrl.charCodeAt(i)) | 0;
    }

    items.push({
      id: `news-${Math.abs(hash).toString(36)}`,
      title: cleanTitle,
      publisher,
      url: canonicalUrl,
      publishedAt: publishedIso,
      fetchedAt,
      snippet: cleanSnippet,
      category: classifyArticleCategory(combinedText),
      regionTags: extractRegionTags(combinedText),
      isStale,
      freshness: isStale ? 'STALE' : 'RECENT',
      ageHours,
      observationType: 'MEDIA',
    });
  }

  return items;
}

async function fetchBoundedText(url: string, timeoutMs = 5500): Promise<string | null> {
  if (!isSafePublicHttpUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MAUSAM-WeatherNewsAggregator/1.0 (+https://mausam.imd.gov.in)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) {
      const txt = await res.text();
      return txt.slice(0, MAX_RESPONSE_BYTES);
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_RESPONSE_BYTES) {
          chunks.push(value.slice(0, Math.max(0, value.byteLength - (total - MAX_RESPONSE_BYTES))));
          break;
        }
        chunks.push(value);
      }
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function aggregateWeatherNews(forceRefresh = false): Promise<WeatherNewsPayload> {
  const now = Date.now();
  if (!forceRefresh && cachedNews && now - cachedNews.fetchedMs < CACHE_TTL_MS) {
    return cachedNews.payload;
  }

  const fetchedAt = new Date().toISOString();
  const results = await Promise.all(RSS_FEED_URLS.map((url) => fetchBoundedText(url)));
  const validXmls = results.filter((x): x is string => Boolean(x && x.includes('<item')));

  if (validXmls.length === 0) {
    if (cachedNews && now - cachedNews.fetchedMs < STALE_CACHE_TTL_MS) {
      return {
        ...cachedNews.payload,
        status: 'STALE',
      };
    }

    return {
      status: 'UNAVAILABLE',
      fetchedAt,
      freshnessWindowHours: FRESHNESS_WINDOW_HOURS,
      articles: [],
      officialSources: OFFICIAL_WEATHER_SOURCES,
      disclaimer:
        'Media reporting is provided for situational context only and never supersedes official IMD or NDMA SACHET warnings.',
      error: 'Weather news RSS aggregation endpoint is temporarily unreachable.',
    };
  }

  const rawArticles = validXmls.flatMap((xml) => parseRssXml(xml, fetchedAt));

  // Deduplicate by canonical URL and normalized headline (syndication dedup)
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped: WeatherNewsArticle[] = [];

  for (const art of rawArticles) {
    const normTitle = art.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seenUrls.has(art.url) || seenTitles.has(normTitle)) continue;
    seenUrls.add(art.url);
    seenTitles.add(normTitle);
    deduped.push(art);
  }

  // Sort strictly by publication timestamp descending (never ingestion time)
  deduped.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  const payload: WeatherNewsPayload = {
    status: 'OK',
    fetchedAt,
    freshnessWindowHours: FRESHNESS_WINDOW_HOURS,
    articles: deduped.slice(0, 30),
    officialSources: OFFICIAL_WEATHER_SOURCES,
    disclaimer:
      'Media articles provide contextual reporting only. Official IMD bulletins and NDMA SACHET CAP alerts always take precedence.',
    error: null,
  };

  cachedNews = { payload, fetchedMs: now };
  return payload;
}

weatherNewsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const force = req.query.force === '1' || req.query.refresh === 'true';
    const category = (req.query.category as string | undefined)?.toLowerCase() || 'all';
    const region = (req.query.region as string | undefined)?.toLowerCase().trim() || '';

    const payload = await aggregateWeatherNews(force);

    let articles = payload.articles;
    if (category && category !== 'all') {
      articles = articles.filter((a) => a.category === category);
    }
    if (region) {
      articles = articles.filter(
        (a) =>
          a.regionTags.some((r) => r.toLowerCase().includes(region)) ||
          a.title.toLowerCase().includes(region)
      );
    }

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.json({
      ...payload,
      articles,
    });
  } catch (err: any) {
    return res.status(502).json({
      status: 'UNAVAILABLE',
      fetchedAt: new Date().toISOString(),
      freshnessWindowHours: FRESHNESS_WINDOW_HOURS,
      articles: [],
      officialSources: OFFICIAL_WEATHER_SOURCES,
      disclaimer:
        'Media reporting is provided for situational context only and never supersedes official IMD or NDMA SACHET warnings.',
      error: err?.message || 'Weather news aggregation failed.',
    });
  }
});
