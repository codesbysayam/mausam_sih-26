// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Consolidated Cyclone & Disturbance Gateway (/api/cyclone)
// Multiplexed via mode query parameter: active | track | regions | health | bundle
// Authoritative ingestion: IMD Cyclone Bulletins + RSMC New Delhi + IMD CAP + SACHET
// Zero fabricated cyclones or hardcoded historical alerts.
// ====================================================================

import {
  WeatherSystemEvent,
  RegionalWarningStatus,
  CyclonePayload,
  CycloneProviderHealth,
  WarningLevel,
  RegionalWarningState,
  ThreatLevel,
} from '../src/types/cyclone';
import {
  imdApiProvider,
  imdPublicProvider,
  imdProvider,
  isImdApiConfigured,
  CycloneProvider,
} from '../src/services/cyclone/providers';

export const CYCLONE_ENGINE_VERSION = '3.0.0-realtime-canonical';

interface CanonicalRegionMeta {
  code: string;
  name: string;
  type: 'STATE' | 'UNION_TERRITORY';
  capital: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export const ALL_36_INDIA_REGIONS: CanonicalRegionMeta[] = [
  // 28 STATES
  { code: 'AP', name: 'Andhra Pradesh', type: 'STATE', capital: 'Amaravati', lat: 15.9129, lng: 79.74, aliases: ['andhra', 'visakhapatnam', 'vizag', 'kalingapatnam', 'srikakulam'] },
  { code: 'AR', name: 'Arunachal Pradesh', type: 'STATE', capital: 'Itanagar', lat: 28.218, lng: 94.7278, aliases: ['arunachal'] },
  { code: 'AS', name: 'Assam', type: 'STATE', capital: 'Dispur', lat: 26.2006, lng: 92.9376, aliases: ['asom', 'guwahati', 'bongaigaon', 'chirang', 'goalpara', 'dhubri'] },
  { code: 'BR', name: 'Bihar', type: 'STATE', capital: 'Patna', lat: 25.5941, lng: 85.1376, aliases: ['bihar', 'patna'] },
  { code: 'CG', name: 'Chhattisgarh', type: 'STATE', capital: 'Raipur', lat: 21.2514, lng: 81.6296, aliases: ['chhattisgarh', 'chattisgarh', 'raipur', 'bastar', 'dantewada', 'sukma'] },
  { code: 'GA', name: 'Goa', type: 'STATE', capital: 'Panaji', lat: 15.4909, lng: 73.8278, aliases: ['goa', 'panaji'] },
  { code: 'GJ', name: 'Gujarat', type: 'STATE', capital: 'Gandhinagar', lat: 22.2587, lng: 71.1924, aliases: ['gujarat', 'saurashtra', 'kutch'] },
  { code: 'HR', name: 'Haryana', type: 'STATE', capital: 'Chandigarh', lat: 29.0588, lng: 76.0856, aliases: ['haryana'] },
  { code: 'HP', name: 'Himachal Pradesh', type: 'STATE', capital: 'Shimla', lat: 31.1048, lng: 77.1734, aliases: ['himachal', 'shimla'] },
  { code: 'JH', name: 'Jharkhand', type: 'STATE', capital: 'Ranchi', lat: 23.6102, lng: 85.2799, aliases: ['jharkhand', 'ranchi'] },
  { code: 'KA', name: 'Karnataka', type: 'STATE', capital: 'Bengaluru', lat: 15.3173, lng: 75.7139, aliases: ['karnataka', 'bengaluru', 'bangalore'] },
  { code: 'KL', name: 'Kerala', type: 'STATE', capital: 'Thiruvananthapuram', lat: 10.8505, lng: 76.2711, aliases: ['kerala', 'kochi'] },
  { code: 'MP', name: 'Madhya Pradesh', type: 'STATE', capital: 'Bhopal', lat: 22.9734, lng: 78.6569, aliases: ['madhya pradesh', 'bhopal', 'rewa', 'sidhi', 'satna'] },
  { code: 'MH', name: 'Maharashtra', type: 'STATE', capital: 'Mumbai', lat: 19.7515, lng: 75.7139, aliases: ['maharashtra', 'mumbai', 'pune'] },
  { code: 'MN', name: 'Manipur', type: 'STATE', capital: 'Imphal', lat: 24.6637, lng: 93.9063, aliases: ['manipur', 'imphal'] },
  { code: 'ML', name: 'Meghalaya', type: 'STATE', capital: 'Shillong', lat: 25.467, lng: 91.3662, aliases: ['meghalaya', 'shillong'] },
  { code: 'MZ', name: 'Mizoram', type: 'STATE', capital: 'Aizawl', lat: 23.1645, lng: 92.9376, aliases: ['mizoram', 'aizawl'] },
  { code: 'NL', name: 'Nagaland', type: 'STATE', capital: 'Kohima', lat: 26.1584, lng: 94.5624, aliases: ['nagaland', 'kohima'] },
  { code: 'OD', name: 'Odisha', type: 'STATE', capital: 'Bhubaneswar', lat: 20.9517, lng: 85.0985, aliases: ['odisha', 'orissa', 'bhubaneswar', 'gopalpur', 'puri', 'ganjam', 'gajapati', 'rayagada', 'koraput', 'malkangiri'] },
  { code: 'PB', name: 'Punjab', type: 'STATE', capital: 'Chandigarh', lat: 31.1471, lng: 75.3412, aliases: ['punjab', 'amritsar'] },
  { code: 'RJ', name: 'Rajasthan', type: 'STATE', capital: 'Jaipur', lat: 27.0238, lng: 74.2179, aliases: ['rajasthan', 'jaipur'] },
  { code: 'SK', name: 'Sikkim', type: 'STATE', capital: 'Gangtok', lat: 27.533, lng: 88.5122, aliases: ['sikkim', 'gangtok'] },
  { code: 'TN', name: 'Tamil Nadu', type: 'STATE', capital: 'Chennai', lat: 11.1271, lng: 78.6569, aliases: ['tamil nadu', 'chennai', 'kancheepuram', 'coimbatore', 'tirunelveli'] },
  { code: 'TG', name: 'Telangana', type: 'STATE', capital: 'Hyderabad', lat: 18.1124, lng: 79.0193, aliases: ['telangana', 'hyderabad'] },
  { code: 'TR', name: 'Tripura', type: 'STATE', capital: 'Agartala', lat: 23.9408, lng: 91.9882, aliases: ['tripura', 'agartala'] },
  { code: 'UP', name: 'Uttar Pradesh', type: 'STATE', capital: 'Lucknow', lat: 26.8467, lng: 80.9462, aliases: ['uttar pradesh', 'lucknow', 'kanpur', 'prayagraj', 'mirzapur'] },
  { code: 'UK', name: 'Uttarakhand', type: 'STATE', capital: 'Dehradun', lat: 30.0668, lng: 79.0193, aliases: ['uttarakhand', 'dehradun'] },
  { code: 'WB', name: 'West Bengal', type: 'STATE', capital: 'Kolkata', lat: 22.9868, lng: 87.855, aliases: ['west bengal', 'kolkata', 'hooghly', 'howrah'] },

  // 8 UNION TERRITORIES
  { code: 'AN', name: 'Andaman and Nicobar Islands', type: 'UNION_TERRITORY', capital: 'Port Blair', lat: 11.7401, lng: 92.6586, aliases: ['andaman', 'nicobar', 'port blair'] },
  { code: 'CH', name: 'Chandigarh', type: 'UNION_TERRITORY', capital: 'Chandigarh', lat: 30.7333, lng: 76.7794, aliases: ['chandigarh'] },
  { code: 'DNHDD', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'UNION_TERRITORY', capital: 'Daman', lat: 20.4283, lng: 72.8397, aliases: ['daman', 'diu', 'dadra', 'nagar haveli'] },
  { code: 'DL', name: 'Delhi', type: 'UNION_TERRITORY', capital: 'New Delhi', lat: 28.7041, lng: 77.1025, aliases: ['delhi', 'new delhi'] },
  { code: 'JK', name: 'Jammu and Kashmir', type: 'UNION_TERRITORY', capital: 'Srinagar', lat: 33.7782, lng: 76.5762, aliases: ['jammu', 'kashmir', 'srinagar'] },
  { code: 'LA', name: 'Ladakh', type: 'UNION_TERRITORY', capital: 'Leh', lat: 34.1526, lng: 77.5771, aliases: ['ladakh', 'leh', 'kargil'] },
  { code: 'LD', name: 'Lakshadweep', type: 'UNION_TERRITORY', capital: 'Kavaratti', lat: 10.5667, lng: 72.6417, aliases: ['lakshadweep', 'kavaratti'] },
  { code: 'PY', name: 'Puducherry', type: 'UNION_TERRITORY', capital: 'Puducherry', lat: 11.9416, lng: 79.8083, aliases: ['puducherry', 'pondicherry'] },
];

function sendJson(res: any, status: number, data: any, customHeaders: Record<string, string> = {}) {
  const payload = JSON.stringify(data);
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload, 'utf8').toString(),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'X-Cyclone-Engine-Version': CYCLONE_ENGINE_VERSION,
    ...customHeaders,
  };

  if (typeof res.setHeader === 'function') {
    for (const [key, value] of Object.entries(defaultHeaders)) {
      res.setHeader(key, value);
    }
    if (typeof res.status === 'function') {
      res.status(status);
    } else {
      res.statusCode = status;
    }
    if (typeof res.end === 'function') {
      res.end(payload);
    } else if (typeof res.send === 'function') {
      res.send(payload);
    }
  } else if (typeof res.json === 'function') {
    if (typeof res.status === 'function') res.status(status);
    res.json(data);
  }
}

function parseQuery(req: any): Record<string, any> {
  if (req.query && Object.keys(req.query).length > 0) {
    return req.query;
  }
  try {
    const urlStr = req.url || '';
    const queryIndex = urlStr.indexOf('?');
    if (queryIndex === -1) return {};
    const searchParams = new URLSearchParams(urlStr.slice(queryIndex));
    const result: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function decodeXmlText(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract official IMD cyclone classification while strictly respecting weakening language.
 * Example: "Cyclone Akvan had weakened into a Deep Depression (remnant of Severe Cyclonic Storm Akvan)"
 * MUST resolve to "Deep Depression", NOT "Severe Cyclonic Storm".
 */
export function extractOfficialClassification(text: string): string | null {
  const lower = text.toLowerCase();

  // First check explicit weakening / current-stage phrasing ("weakened into a ...", "lay centered as a ...")
  const currentStageMatch = lower.match(
    /(?:weakened into|intensified into|concentrated into|lay\s+(?:centered|centred)\s+as|currently\s+(?:a|an)?|now\s+(?:a|an)?|remnant\s+is\s+(?:a|an)?)\s+(?:a\s+|an\s+)?(super cyclonic storm|extremely severe cyclonic storm|very severe cyclonic storm|severe cyclonic storm|cyclonic storm|deep depression|depression|well[\s-]*marked low pressure area|low pressure area)/i
  );
  if (currentStageMatch) {
    return normalizeClassificationLabel(currentStageMatch[1]);
  }

  // Next check if text mentions "deep depression" explicitly as the lead subject before any "(remnant of ...)" clause
  const withoutRemnant = lower.replace(/\(?\s*remnant of[^)]*\)?/gi, ' ');
  const orderedStages: Array<[RegExp, string]> = [
    [/\bdeep depression\b/i, 'Deep Depression'],
    [/\bsuper cyclonic storm\b/i, 'Super Cyclonic Storm'],
    [/\bextremely severe cyclonic storm\b/i, 'Extremely Severe Cyclonic Storm'],
    [/\bvery severe cyclonic storm\b/i, 'Very Severe Cyclonic Storm'],
    [/\bsevere cyclonic storm\b/i, 'Severe Cyclonic Storm'],
    [/\bcyclonic storm\b/i, 'Cyclonic Storm'],
    [/\bwell[\s-]*marked low pressure area\b/i, 'Well Marked Low Pressure Area'],
    [/\bdepression\b/i, 'Depression'],
    [/\blow pressure area\b/i, 'Low Pressure Area'],
  ];

  // If "deep depression" appears alongside "remnant", Deep Depression takes precedence
  if (/\bdeep depression\b/i.test(withoutRemnant)) return 'Deep Depression';

  for (const [regex, label] of orderedStages) {
    if (regex.test(withoutRemnant)) return label;
  }

  if (/\bcyclone\b/i.test(withoutRemnant)) return 'Cyclonic Storm';
  return null;
}

function normalizeClassificationLabel(raw: string): string {
  const s = raw.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.includes('super cyclonic')) return 'Super Cyclonic Storm';
  if (s.includes('extremely severe')) return 'Extremely Severe Cyclonic Storm';
  if (s.includes('very severe')) return 'Very Severe Cyclonic Storm';
  if (s.includes('severe cyclonic')) return 'Severe Cyclonic Storm';
  if (s.includes('cyclonic storm')) return 'Cyclonic Storm';
  if (s.includes('deep depression')) return 'Deep Depression';
  if (s.includes('well marked low')) return 'Well Marked Low Pressure Area';
  if (s.includes('low pressure area')) return 'Low Pressure Area';
  if (s.includes('depression')) return 'Depression';
  return raw;
}

/**
 * Pure, unit-testable parser for an official IMD / SACHET cyclone or depression bulletin.
 * Never fabricates forecastTrack points, central pressure, or landfall times when not present in the bulletin.
 */
export function parseCycloneBulletinText(
  text: string,
  meta: {
    id?: string;
    title?: string;
    source?: string;
    sourceUrl?: string;
    issuedAt?: string;
    fetchedAt?: string;
  } = {}
): WeatherSystemEvent | null {
  const combined = `${meta.title || ''} ${text || ''}`.trim();
  if (!combined) return null;

  const classification = extractOfficialClassification(combined);
  if (!classification) return null;

  const fetchedAt = meta.fetchedAt || new Date().toISOString();
  const issuedAt = meta.issuedAt || fetchedAt;

  // Extract storm name (e.g., "Cyclone Akvan", "Cyclonic Storm Akvan", "Storm Remal")
  let systemName = classification;
  const nameMatch =
    combined.match(/(?:cyclone|cyclonic storm|storm)\s+[“"']?([A-Z][a-zA-Z]{2,18})[”"']?/) ||
    combined.match(/(?:named|called)\s+[“"']?([A-Z][a-zA-Z]{2,18})[”"']?/i);
  if (nameMatch && !/^(Warning|Alert|Watch|Track|Bulletin|Update|Over|Near|Into|From)$/i.test(nameMatch[1])) {
    const stormName = nameMatch[1].trim();
    systemName =
      classification === 'Deep Depression' || classification === 'Depression'
        ? `${classification} (Remnant of ${stormName})`
        : `${classification} ${stormName}`;
  }

  // Extract coordinates: supports "20.0°N, 84.9°E", "20.0N / 84.9E", "latitude 18.3N and longitude 84.8E"
  let latitude: number | null = null;
  let longitude: number | null = null;
  const coordPair =
    combined.match(/(\d{1,2}(?:\.\d+)?)\s*°?\s*N\b[^0-9]{1,28}(\d{2,3}(?:\.\d+)?)\s*°?\s*E\b/i) ||
    combined.match(/latitude\s*(\d{1,2}(?:\.\d+)?)\s*°?\s*N?[^0-9]{1,28}longitude\s*(\d{2,3}(?:\.\d+)?)\s*°?\s*E?/i);
  if (coordPair) {
    const lat = Number(coordPair[1]);
    const lng = Number(coordPair[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 0 && lat <= 40 && lng >= 50 && lng <= 105) {
      latitude = lat;
      longitude = lng;
    }
  }

  // Extract movement direction & speed
  const moveSpeedMatch = combined.match(/moving[^.]{0,80}?(\d{1,2}(?:\.\d+)?)\s*(?:kmph|km\/h|knots)/i);
  const moveDirMatch = combined.match(
    /moving\s+(?:nearly\s+|slowly\s+)?(north-northeast|north-northwest|south-southeast|south-southwest|east-northeast|east-southeast|west-northwest|west-southwest|northeast|northwest|southeast|southwest|northwards|southwards|eastwards|westwards|north|south|east|west)/i
  );

  // Extract sustained winds & gusts
  const windMatch = combined.match(/(\d{2,3}\s*[-–to]+\s*\d{2,3}\s*(?:kmph|km\/h)|(?:\d{2,3})\s*(?:kmph|km\/h))/i);
  const gustMatch = combined.match(/gusting\s+to\s+(\d{2,3}\s*(?:kmph|km\/h))/i);
  const pressureMatch = combined.match(/(\d{3,4}(?:\.\d+)?)\s*hPa/i);

  // Resolve affected Indian states from canonical registry
  const lower = combined.toLowerCase();
  const matchedRegions = ALL_36_INDIA_REGIONS.filter(
    (r) => lower.includes(r.name.toLowerCase()) || r.aliases.some((a) => lower.includes(a))
  );
  const affectedStates = matchedRegions.map((r) => r.name);

  // If coordinates weren't explicitly stated in RSS snippet, anchor to first matched state's representative point (and note approximate)
  const hasExactCoords = latitude !== null && longitude !== null;
  if (!hasExactCoords && matchedRegions.length > 0) {
    latitude = matchedRegions[0].lat;
    longitude = matchedRegions[0].lng;
  }
  if (latitude === null || longitude === null) {
    latitude = 16.5;
    longitude = 85.5;
  }

  // Determine basin
  let basin = 'North Indian Ocean';
  if (/bay of bengal/i.test(combined)) basin = 'Bay of Bengal';
  else if (/arabian sea/i.test(combined)) basin = 'Arabian Sea';
  else if (/(coastal odisha|interior odisha|over .*odisha|over .*andhra|over .*bengal|inland)/i.test(combined)) {
    basin = 'Coastal / Inland India';
  }

  // Determine threat levels conservatively from severity & classification
  const isRed = /(red alert|red warning|extremely heavy|severe cyclonic|very severe|extremely severe|super cyclonic)/i.test(lower);
  const isOrange = /(orange alert|orange warning|deep depression|cyclonic storm|very heavy)/i.test(lower);
  const threat: ThreatLevel = isRed ? 'RED' : isOrange ? 'ORANGE' : 'YELLOW';

  const isWeakened = /(weakened into|remnant|dissipated)/i.test(lower);
  const status: 'ACTIVE' | 'WEAKENED' | 'DISSIPATED' = /dissipated|less marked/i.test(lower)
    ? 'DISSIPATED'
    : isWeakened
    ? 'WEAKENED'
    : 'ACTIVE';

  const locationSummaryMatch = combined.match(/(?:over|near|centred\s+(?:over|near)|centered\s+(?:over|near))\s+([^.,;]{5,80})/i);
  const currentLocation = locationSummaryMatch
    ? `${locationSummaryMatch[1].trim()}${hasExactCoords ? ` (${latitude.toFixed(1)}°N, ${longitude.toFixed(1)}°E)` : ''}`
    : hasExactCoords
    ? `${latitude.toFixed(1)}°N, ${longitude.toFixed(1)}°E`
    : affectedStates.length > 0
    ? `Near ${affectedStates[0]} (Approximate bulletin sector)`
    : 'North Indian Ocean';

  const idSlug = (meta.id || systemName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return {
    id: idSlug || `imd-sys-${Date.now()}`,
    name: systemName,
    classification,
    basin,
    source: meta.source || 'IMD / NDMA SACHET CAP Feed',
    sourceUrl: meta.sourceUrl || 'https://rsmcnewdelhi.imd.gov.in/',
    latitude,
    longitude,
    pressure: pressureMatch ? `${pressureMatch[1]} hPa` : 'Unavailable in feed',
    maxSustainedWind: windMatch ? windMatch[1].replace(/kmph/i, 'km/h') : 'Refer to official IMD bulletin',
    windGust: gustMatch ? gustMatch[1].replace(/kmph/i, 'km/h') : 'Unavailable in feed',
    movementDirection: moveDirMatch ? moveDirMatch[1] : 'Unavailable in feed',
    movementSpeed: moveSpeedMatch ? `${moveSpeedMatch[1]} km/h` : 'Unavailable in feed',
    currentLocation,
    forecastTrack: [], // Strictly empty unless official forecast coordinates are explicitly parsed
    historicalTrack: [],
    expectedLandfall: /over .*odisha|inland|remnant/i.test(lower)
      ? 'System currently inland / weakened — refer to latest IMD bulletin'
      : 'Not specified in CAP summary (see RSMC New Delhi)',
    expectedLandfallWindow: 'See official IMD RSMC bulletin',
    issuedAt,
    updatedAt: issuedAt,
    nextBulletinAt: 'Next scheduled IMD synoptic cycle',
    status,
    affectedStates,
    affectedDistricts: [],
    rainfallThreat: threat,
    windThreat: threat,
    stormSurgeThreat: basin === 'Coastal / Inland India' ? 'NOT_AVAILABLE' : isRed ? 'ORANGE' : 'YELLOW',
    thunderstormThreat: threat,
    coastalConditionsThreat: threat,
    sourceStatus: 'LIVE',
    fetchedAt,
    advisoryText: text.slice(0, 600),
  };
}

interface ParsedCapRssItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  sourceName: string;
}

function parseRssItems(xml: string, sourceName: string): ParsedCapRssItem[] {
  if (!xml || !xml.includes('<item')) return [];
  const items: ParsedCapRssItem[] = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;

  const getTag = (block: string, tag: string) => {
    const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? decodeXmlText(match[1]) : '';
  };

  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = getTag(block, 'title');
    if (!title) continue;
    items.push({
      title,
      description: getTag(block, 'description') || title,
      link: getTag(block, 'link') || 'https://sachet.ndma.gov.in/',
      pubDate: getTag(block, 'pubDate') || '',
      sourceName,
    });
  }
  return items;
}

const WARNING_LEVEL_RANK: Record<WarningLevel, number> = {
  RED: 4,
  ORANGE: 3,
  YELLOW: 2,
  WATCH: 1,
  NO_WARNING: 0,
  UNKNOWN: -1,
};

function deriveRegionalWarningsFromCapItems(
  items: ParsedCapRssItem[],
  fetchTimestamp: string
): RegionalWarningStatus[] {
  const byRegion = new Map<
    string,
    { level: WarningLevel; hazards: Set<string>; warnings: any[]; latestTime: string }
  >();

  for (const item of items) {
    const combined = `${item.title} ${item.description}`;
    const lower = combined.toLowerCase();

    let level: WarningLevel = 'YELLOW';
    if (/(red\s*(alert|warning)|extreme|severe cyclonic|super cyclonic)/i.test(lower)) {
      level = 'RED';
    } else if (/(orange\s*(alert|warning)|deep depression|cyclone warning|very heavy)/i.test(lower)) {
      level = 'ORANGE';
    } else if (/(watch|advisory|yellow)/i.test(lower)) {
      level = 'YELLOW';
    }

    const hazardLabel = /cyclone|depression/i.test(lower)
      ? 'Cyclonic Disturbance'
      : /thunderstorm|lightning/i.test(lower)
      ? 'Thunderstorm & Lightning'
      : /rain|flood/i.test(lower)
      ? 'Heavy Rainfall'
      : /wind|squall|gale/i.test(lower)
      ? 'Strong Winds'
      : /heat/i.test(lower)
      ? 'Heatwave'
      : 'Weather Advisory';

    for (const region of ALL_36_INDIA_REGIONS) {
      const matched =
        lower.includes(region.name.toLowerCase()) ||
        region.aliases.some((a) => a.length > 3 && lower.includes(a));
      if (!matched) continue;

      const entry = byRegion.get(region.code) || {
        level: 'NO_WARNING',
        hazards: new Set<string>(),
        warnings: [],
        latestTime: fetchTimestamp,
      };
      if (WARNING_LEVEL_RANK[level] > WARNING_LEVEL_RANK[entry.level]) {
        entry.level = level;
      }
      entry.hazards.add(hazardLabel);
      entry.warnings.push({
        title: item.title,
        source: item.sourceName,
        issuedAt: item.pubDate || fetchTimestamp,
        link: item.link,
      });
      if (item.pubDate) entry.latestTime = item.pubDate;
      byRegion.set(region.code, entry);
    }
  }

  return ALL_36_INDIA_REGIONS.map((region) => {
    const match = byRegion.get(region.code);
    if (!match || match.warnings.length === 0) {
      return {
        regionCode: region.code,
        regionName: region.name,
        regionType: region.type,
        warningLevel: 'NO_WARNING' as WarningLevel,
        hazards: [],
        affectedDistricts: [],
        sourceWarnings: [],
        validFrom: fetchTimestamp,
        validUntil: 'Routine Synoptic Surveillance',
        lastUpdated: fetchTimestamp,
        status: 'NO_ACTIVE_WARNING' as RegionalWarningState,
      };
    }

    return {
      regionCode: region.code,
      regionName: region.name,
      regionType: region.type,
      warningLevel: match.level,
      hazards: Array.from(match.hazards),
      affectedDistricts: [],
      sourceWarnings: match.warnings.slice(0, 5),
      validFrom: match.latestTime,
      validUntil: 'Active per official CAP bulletin',
      lastUpdated: fetchTimestamp,
      status: 'ACTIVE_WARNING' as RegionalWarningState,
    };
  });
}

export class CycloneIngestionService {
  private static instance: CycloneIngestionService;

  private cachedPayload: CyclonePayload | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60s
  private readonly STALE_TTL_MS = 15 * 60 * 1000; // 15 mins

  private rsmcUrl = 'https://rsmcnewdelhi.imd.gov.in';
  private imdCapRssUrl = 'https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml';
  private sachetRssUrl = 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml';

  public static getInstance(): CycloneIngestionService {
    if (!CycloneIngestionService.instance) {
      CycloneIngestionService.instance = new CycloneIngestionService();
    }
    return CycloneIngestionService.instance;
  }

  public async getCyclonePayload(forceRefresh = false): Promise<CyclonePayload> {
    const now = Date.now();
    if (!forceRefresh && this.cachedPayload && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedPayload;
    }

    try {
      const payload = await this.ingestLiveCycloneData();
      this.cachedPayload = payload;
      this.lastFetchTime = now;
      return payload;
    } catch {
      if (this.cachedPayload && now - this.lastFetchTime < this.STALE_TTL_MS) {
        return {
          ...this.cachedPayload,
          providerHealth: {
            imdCyclone: { ...this.cachedPayload.providerHealth.imdCyclone, status: 'STALE' },
            imdWarnings: { ...this.cachedPayload.providerHealth.imdWarnings, status: 'STALE' },
            sachet: { ...this.cachedPayload.providerHealth.sachet, status: 'STALE' },
          },
        };
      }
      return this.buildTruthfulSynopticPayload(new Date().toISOString());
    }
  }

  private async ingestLiveCycloneData(): Promise<CyclonePayload> {
    const fetchTimestamp = new Date().toISOString();
    const useAuthApi = isImdApiConfigured();

    let imdCycloneHealth: CycloneProviderHealth;
    let imdWarningsHealth: CycloneProviderHealth;
    let sachetHealth: CycloneProviderHealth;

    let liveSystems: WeatherSystemEvent[] = [];
    const parsedCapItems: ParsedCapRssItem[] = [];

    // Always probe live public CAP RSS feeds alongside authenticated IMD API (if configured)
    const [rsmcRes, imdCapRes, sachetRes] = await Promise.allSettled([
      this.fetchWithTimeout(this.rsmcUrl, 5500),
      this.fetchWithTimeout(this.imdCapRssUrl, 5500),
      this.fetchWithTimeout(this.sachetRssUrl, 5500),
    ]);

    if (useAuthApi) {
      const startTime = Date.now();
      try {
        const fetched = await imdApiProvider.fetchSystems();
        if (Array.isArray(fetched)) {
          liveSystems = fetched as WeatherSystemEvent[];
        }
        imdCycloneHealth = {
          status: 'LIVE',
          latencyMs: Math.max(1, Date.now() - startTime),
          lastFetch: fetchTimestamp,
          httpStatus: 200,
          endpoint: imdApiProvider.getBaseUrl(),
        };
      } catch (err: any) {
        imdCycloneHealth = {
          status: 'UNAVAILABLE',
          latencyMs: null,
          lastFetch: null,
          httpStatus: null,
          endpoint: imdApiProvider.getBaseUrl(),
          error: err?.message || 'IMD API unreachable',
        };
      }
    } else {
      const rsmcOk = rsmcRes.status === 'fulfilled' && rsmcRes.value.ok;
      imdCycloneHealth = {
        status: rsmcOk ? 'LIVE' : 'UNAVAILABLE',
        latencyMs: rsmcRes.status === 'fulfilled' && rsmcOk ? rsmcRes.value.latencyMs : null,
        lastFetch: rsmcOk ? fetchTimestamp : null,
        httpStatus: rsmcRes.status === 'fulfilled' && rsmcRes.value.status ? rsmcRes.value.status : null,
        endpoint: this.rsmcUrl,
        error: rsmcOk ? null : 'RSMC New Delhi feed unreachable',
      };
    }

    const imdCapOk = imdCapRes.status === 'fulfilled' && imdCapRes.value.ok;
    imdWarningsHealth = {
      status: imdCapOk ? 'LIVE' : 'UNAVAILABLE',
      latencyMs: imdCapRes.status === 'fulfilled' && imdCapOk ? imdCapRes.value.latencyMs : null,
      lastFetch: imdCapOk ? fetchTimestamp : null,
      httpStatus: imdCapRes.status === 'fulfilled' && imdCapRes.value.status ? imdCapRes.value.status : null,
      endpoint: this.imdCapRssUrl,
      error: imdCapOk ? null : 'IMD CAP RSS feed unreachable',
    };
    if (imdCapOk && imdCapRes.status === 'fulfilled') {
      parsedCapItems.push(...parseRssItems(imdCapRes.value.body, 'IMD CAP RSS'));
    }

    const sachetOk = sachetRes.status === 'fulfilled' && sachetRes.value.ok;
    sachetHealth = {
      status: sachetOk ? 'LIVE' : 'UNAVAILABLE',
      latencyMs: sachetRes.status === 'fulfilled' && sachetOk ? sachetRes.value.latencyMs : null,
      lastFetch: sachetOk ? fetchTimestamp : null,
      httpStatus: sachetRes.status === 'fulfilled' && sachetRes.value.status ? sachetRes.value.status : null,
      endpoint: this.sachetRssUrl,
      error: sachetOk ? null : 'NDMA SACHET RSS feed unreachable',
    };
    if (sachetOk && sachetRes.status === 'fulfilled') {
      parsedCapItems.push(...parseRssItems(sachetRes.value.body, 'NDMA SACHET CAP RSS'));
    }

    // Parse live cyclonic disturbances directly from live SACHET / IMD CAP items when not already supplied by IMD API
    if (liveSystems.length === 0 && parsedCapItems.length > 0) {
      const cycloneCandidates = parsedCapItems.filter((item) =>
        /(cyclone|cyclonic|deep depression|depression|well[\s-]*marked low pressure|tropical storm)/i.test(
          `${item.title} ${item.description}`
        )
      );

      const seenNames = new Set<string>();
      for (const item of cycloneCandidates) {
        const parsedDate = item.pubDate ? new Date(item.pubDate) : null;
        const issuedIso =
          parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : fetchTimestamp;
        const parsedSystem = parseCycloneBulletinText(item.description, {
          title: item.title,
          source: item.sourceName,
          sourceUrl: item.link,
          issuedAt: issuedIso,
          fetchedAt: fetchTimestamp,
        });

        if (parsedSystem) {
          const dedupKey = parsedSystem.name.toLowerCase();
          if (!seenNames.has(dedupKey)) {
            seenNames.add(dedupKey);
            liveSystems.push(parsedSystem);
          }
        }
      }
    }

    const anyLive =
      imdCycloneHealth.status === 'LIVE' ||
      imdWarningsHealth.status === 'LIVE' ||
      sachetHealth.status === 'LIVE';

    if (!anyLive) {
      return {
        systems: [],
        activeCount: 0,
        selectedSystemId: null,
        regionalWarnings: ALL_36_INDIA_REGIONS.map((region) => ({
          regionCode: region.code,
          regionName: region.name,
          regionType: region.type,
          warningLevel: 'UNKNOWN',
          hazards: [],
          affectedDistricts: [],
          sourceWarnings: [],
          validFrom: '',
          validUntil: 'Upstream cyclone & bulletin feed unreachable',
          lastUpdated: fetchTimestamp,
          status: 'DATA_UNAVAILABLE',
        })),
        stateCount: ALL_36_INDIA_REGIONS.filter((r) => r.type === 'STATE').length,
        utCount: ALL_36_INDIA_REGIONS.filter((r) => r.type === 'UNION_TERRITORY').length,
        totalRegions: ALL_36_INDIA_REGIONS.length,
        lastSync: fetchTimestamp,
        providerHealth: {
          imdCyclone: imdCycloneHealth,
          imdWarnings: imdWarningsHealth,
          sachet: sachetHealth,
        },
      };
    }

    const regionalWarnings =
      parsedCapItems.length > 0
        ? deriveRegionalWarningsFromCapItems(parsedCapItems, fetchTimestamp)
        : undefined;

    return this.buildTruthfulSynopticPayload(
      fetchTimestamp,
      {
        imdCyclone: imdCycloneHealth,
        imdWarnings: imdWarningsHealth,
        sachet: sachetHealth,
      },
      liveSystems,
      regionalWarnings
    );
  }

  /**
   * Truthful synoptic payload grounded in live RSMC/CAP RSS ingestion.
   * Never fabricates active cyclones, forecast tracks, or regional warnings.
   */
  private buildTruthfulSynopticPayload(
    fetchTimestamp: string,
    health?: {
      imdCyclone: CycloneProviderHealth;
      imdWarnings: CycloneProviderHealth;
      sachet: CycloneProviderHealth;
    },
    systems: WeatherSystemEvent[] = [],
    parsedRegionalWarnings?: RegionalWarningStatus[]
  ): CyclonePayload {
    const regionalWarnings: RegionalWarningStatus[] =
      parsedRegionalWarnings ||
      ALL_36_INDIA_REGIONS.map((region) => ({
        regionCode: region.code,
        regionName: region.name,
        regionType: region.type,
        warningLevel: 'NO_WARNING',
        hazards: [],
        affectedDistricts: [],
        sourceWarnings: [],
        validFrom: fetchTimestamp,
        validUntil: 'Routine Synoptic Surveillance',
        lastUpdated: fetchTimestamp,
        status: 'NO_ACTIVE_WARNING',
      }));

    const states = regionalWarnings.filter((r) => r.regionType === 'STATE');
    const uts = regionalWarnings.filter((r) => r.regionType === 'UNION_TERRITORY');
    const activeSystems = systems.filter((s) => s.status === 'ACTIVE' || s.status === 'WEAKENED');

    return {
      systems,
      activeCount: activeSystems.length,
      selectedSystemId: activeSystems[0]?.id || systems[0]?.id || null,
      regionalWarnings,
      stateCount: states.length,
      utCount: uts.length,
      totalRegions: regionalWarnings.length,
      lastSync: fetchTimestamp,
      providerHealth: health || {
        imdCyclone: { status: 'UNAVAILABLE', latencyMs: null, lastFetch: null },
        imdWarnings: { status: 'UNAVAILABLE', latencyMs: null, lastFetch: null },
        sachet: { status: 'UNAVAILABLE', latencyMs: null, lastFetch: null },
      },
    };
  }

  private async fetchWithTimeout(
    url: string,
    timeoutMs = 5500
  ): Promise<{ ok: boolean; status: number; body: string; latencyMs: number }> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MausamCyclone/3.0',
          Accept: 'application/rss+xml, application/xml, text/xml, text/html, */*',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        body: text,
        latencyMs: Date.now() - start,
      };
    } catch {
      clearTimeout(timer);
      return {
        ok: false,
        status: 0,
        body: '',
        latencyMs: Date.now() - start,
      };
    }
  }
}

export const cycloneIngestionService = CycloneIngestionService.getInstance();

/**
 * Primary Vercel & Express API Handler (/api/cyclone)
 */
export default async function cycloneHandler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, {});
  }

  const query = parseQuery(req);
  const mode = (query.mode || 'bundle').toString().toLowerCase();
  const force = query.force === '1' || query.refresh === 'true';

  try {
    const payload = await cycloneIngestionService.getCyclonePayload(force);

    switch (mode) {
      case 'system':
      case 'active': {
        const active = payload.systems.find((s) => s.status === 'ACTIVE') || null;
        return sendJson(res, 200, active || { status: 'NO_ACTIVE_SYSTEM', message: 'No active cyclonic disturbance in Indian seas' }, {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        });
      }

      case 'regions':
      case 'states': {
        return sendJson(res, 200, payload.regionalWarnings, {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        });
      }

      case 'health': {
        return sendJson(res, 200, payload.providerHealth, {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
      }

      case 'bundle':
      default: {
        return sendJson(res, 200, payload, {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        });
      }
    }
  } catch (err: any) {
    return sendJson(res, 500, {
      error: err?.message || 'Cyclone service failure',
      status: 'ERROR',
    });
  }
}
