import { Router, Request, Response } from 'express';

export interface OfficialAgrometLinkItem {
  title: string;
  state: string;
  district?: string | null;
  issuingOffice: string;
  language: string;
  url: string;
  issuedAt: string | null;
  validPeriod: string | null;
  freshness: 'CURRENT' | 'RECENT' | 'STALE' | 'UNVERIFIED';
}

export interface OfficialAgrometResponse {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  state: string;
  district: string;
  fetchedAt: string;
  source: string;
  sourceUrl: string;
  bulletins: OfficialAgrometLinkItem[];
  portals: {
    label: string;
    authority: string;
    url: string;
  }[];
  message: string;
}

export const agrometImdRouter = Router();

const IMD_STATE_CURRENT_URL = 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_state_current.php';
const OFFICIAL_AGROMET_PORTALS = [
  {
    label: 'IMD Current State Agromet Advisories',
    authority: 'India Meteorological Department (GKMS)',
    url: 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_state_current.php',
  },
  {
    label: 'IMD District / Block Agromet Bulletins',
    authority: 'IMD Agromet Field Units (AMFU)',
    url: 'https://mausam.imd.gov.in/imd_latest/contents/agromet/advisory/blocalmain.php',
  },
  {
    label: 'National Agromet Advisory Service (AAS) Bulletin',
    authority: 'IMD Agrimet Pune',
    url: 'https://imdagrimet.gov.in/AGNationalAasBulletinView.php',
  },
];

let cachedHtml: { html: string; fetchedAt: string; ts: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

function resolveImdHref(href: string): string | null {
  try {
    const resolved = new URL(href.trim(), 'https://mausam.imd.gov.in/responsive/');
    if (resolved.protocol !== 'https:' && resolved.protocol !== 'http:') return null;
    if (!resolved.hostname.endsWith('imd.gov.in') && !resolved.hostname.endsWith('imdagrimet.gov.in')) {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractMatchingBulletins(
  html: string,
  state: string,
  district: string
): OfficialAgrometLinkItem[] {
  const results: OfficialAgrometLinkItem[] = [];
  const stateLower = state.toLowerCase().trim();
  const distLower = district.toLowerCase().replace(/\(.*?\)/g, '').trim();

  // Extract anchor links pointing to PDF/HTML agromet advisories
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((m = anchorRegex.exec(html)) !== null) {
    const rawHref = m[1];
    const label = stripTags(m[2]);
    const lowerHref = rawHref.toLowerCase();
    const lowerLabel = label.toLowerCase();

    const isPdfOrBulletin =
      lowerHref.includes('.pdf') ||
      lowerHref.includes('agromet') ||
      lowerHref.includes('advisory') ||
      lowerHref.includes('bulletin');

    if (!isPdfOrBulletin) continue;

    const matchesRegion =
      (stateLower && (lowerLabel.includes(stateLower) || lowerHref.includes(stateLower.replace(/\s+/g, '')))) ||
      (distLower && distLower.length > 2 && (lowerLabel.includes(distLower) || lowerHref.includes(distLower.replace(/\s+/g, ''))));

    if (!matchesRegion) continue;

    const resolvedUrl = resolveImdHref(rawHref);
    if (!resolvedUrl || seen.has(resolvedUrl)) continue;
    seen.add(resolvedUrl);

    const isHindiOrRegional = /hindi|regional|odia|marathi|tamil|telugu|punjabi|bengali|gujarati/i.test(
      `${label} ${rawHref}`
    );

    results.push({
      title: label || `Official IMD Agromet Advisory — ${state}`,
      state,
      district: district || null,
      issuingOffice: `IMD Gramin Krishi Mausam Sewa (GKMS) — ${state}`,
      language: isHindiOrRegional ? 'Regional / Bilingual' : 'English',
      url: resolvedUrl,
      issuedAt: null,
      validPeriod: null,
      freshness: 'CURRENT',
    });
  }

  return results.slice(0, 8);
}

agrometImdRouter.get('/official', async (req: Request, res: Response) => {
  const state = String(req.query.state || 'Odisha').trim();
  const district = String(req.query.district || '').trim();
  const force = req.query.force === '1' || req.query.refresh === 'true';
  const now = Date.now();
  const fetchedAt = new Date().toISOString();

  try {
    let html: string | null = null;
    let effectiveFetchedAt = fetchedAt;

    if (!force && cachedHtml && now - cachedHtml.ts < CACHE_TTL_MS) {
      html = cachedHtml.html;
      effectiveFetchedAt = cachedHtml.fetchedAt;
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5500);
      try {
        const upstream = await fetch(IMD_STATE_CURRENT_URL, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 MAUSAM-AgrometSync/1.0',
            Accept: 'text/html,application/xhtml+xml,*/*',
          },
        });
        if (upstream.ok) {
          html = await upstream.text();
          cachedHtml = { html, fetchedAt, ts: now };
        }
      } finally {
        clearTimeout(timer);
      }
    }

    if (!html) {
      return res.json({
        status: 'UNAVAILABLE',
        state,
        district,
        fetchedAt,
        source: 'India Meteorological Department (GKMS)',
        sourceUrl: IMD_STATE_CURRENT_URL,
        bulletins: [],
        portals: OFFICIAL_AGROMET_PORTALS,
        message:
          'Official IMD current district agromet advisory feed is temporarily unreachable. Use the verified IMD GKMS portal links below.',
      } satisfies OfficialAgrometResponse);
    }

    const bulletins = extractMatchingBulletins(html, state, district);

    return res.json({
      status: bulletins.length > 0 ? 'AVAILABLE' : 'UNAVAILABLE',
      state,
      district,
      fetchedAt: effectiveFetchedAt,
      source: 'India Meteorological Department (GKMS)',
      sourceUrl: IMD_STATE_CURRENT_URL,
      bulletins,
      portals: OFFICIAL_AGROMET_PORTALS,
      message:
        bulletins.length > 0
          ? `Retrieved ${bulletins.length} official IMD GKMS advisory link(s) for ${state}.`
          : `No direct current district PDF link was parsed for ${district ? `${district}, ` : ''}${state} from the IMD index page. Open the official IMD Agromet portal below for the latest issued PDF.`,
    } satisfies OfficialAgrometResponse);
  } catch {
    return res.json({
      status: 'UNAVAILABLE',
      state,
      district,
      fetchedAt,
      source: 'India Meteorological Department (GKMS)',
      sourceUrl: IMD_STATE_CURRENT_URL,
      bulletins: [],
      portals: OFFICIAL_AGROMET_PORTALS,
      message:
        'Official IMD district advisory currently unavailable. Refer directly to the IMD Agromet GKMS portal.',
    } satisfies OfficialAgrometResponse);
  }
});
