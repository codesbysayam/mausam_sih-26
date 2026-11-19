// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Consolidated Weather Gateway (/api/weather)
// Multiplexed via mode query parameter:
// current | forecast | hourly | daily | air | marine | bundle | persona | search | imd
// Self-contained implementation using Open-Meteo & Open Environmental Feeds.
// Zero fabricated defaults, strict (0,0)-safe coordinate validation,
// explicit HTTP 400 / 502 / 504 semantics, and in-memory fresh/stale cache.
// ====================================================================

interface CacheEntry {
  data: any;
  fetchedAt: number;
}

const WEATHER_FRESH_MS = 5 * 60 * 1000;
const WEATHER_STALE_MS = 30 * 60 * 1000;
const weatherGatewayCache = new Map<string, CacheEntry>();

function sendJson(res: any, status: number, data: any, customHeaders: Record<string, string> = {}) {
  const payload = JSON.stringify(data);
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload, 'utf8').toString(),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
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

function parseStrictCoordinates(
  query: Record<string, any>
): { ok: true; lat: number; lon: number; error?: undefined } | { ok: false; lat?: undefined; lon?: undefined; error: string } {
  const rawLat = query.lat ?? query.latitude;
  const rawLon = query.lon ?? query.lng ?? query.longitude;

  if (
    rawLat === undefined ||
    rawLat === null ||
    String(rawLat).trim() === '' ||
    rawLon === undefined ||
    rawLon === null ||
    String(rawLon).trim() === ''
  ) {
    return { ok: false, error: 'Missing required lat/latitude and lon/lng/longitude parameters.' };
  }

  const lat = typeof rawLat === 'number' ? rawLat : Number(String(rawLat).trim());
  const lon = typeof rawLon === 'number' ? rawLon : Number(String(rawLon).trim());

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, error: 'Coordinates must be finite numeric values.' };
  }
  if (lat < -90 || lat > 90) {
    return { ok: false, error: `Latitude ${lat} out of bounds [-90, 90].` };
  }
  if (lon < -180 || lon > 180) {
    return { ok: false, error: `Longitude ${lon} out of bounds [-180, 180].` };
  }
  return { ok: true, lat, lon };
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function roundOrNull(v: unknown, decimals = 0): number | null {
  const n = numOrNull(v);
  if (n === null) return null;
  if (decimals <= 0) return Math.round(n);
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function degreesToCompass(deg: number | null): string {
  if (deg === null || !Number.isFinite(deg)) return '—';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

function getWeatherCondition(code: number | null | undefined): {
  condition: string;
  description: string;
  icon: string;
} {
  if (code === null || code === undefined || !Number.isFinite(code)) {
    return {
      condition: 'Condition Unavailable',
      description: 'Weather condition code was not provided by upstream telemetry.',
      icon: 'CloudOff',
    };
  }
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', description: 'Clear skies with unhindered visibility', icon: 'Sun' };
    case 1:
      return { condition: 'Mainly Clear', description: 'Scattered light clouds, mostly sunny', icon: 'SunMedium' };
    case 2:
      return { condition: 'Partly Cloudy', description: 'Broken high-altitude cumulus clouds', icon: 'CloudSun' };
    case 3:
      return { condition: 'Overcast', description: 'Heavy stratus cloud coverage', icon: 'Cloud' };
    case 45:
    case 48:
      return { condition: 'Fog', description: 'Dense ground radiation fog with low visibility', icon: 'CloudFog' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', description: 'Continuous fine liquid droplet precipitation', icon: 'CloudDrizzle' };
    case 56:
    case 57:
      return { condition: 'Freezing Drizzle', description: 'Supercooled light liquid precipitation', icon: 'CloudDrizzle' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Rain', description: 'Synoptic liquid precipitation', icon: 'CloudRain' };
    case 66:
    case 67:
      return { condition: 'Freezing Rain', description: 'Supercooled rain freezing on surface contact', icon: 'CloudRain' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { condition: 'Snowfall', description: 'Solid crystalline precipitation', icon: 'CloudSnow' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Rain Showers', description: 'Convective localized rain bursts', icon: 'CloudRain' };
    case 85:
    case 86:
      return { condition: 'Snow Showers', description: 'Convective snow bursts', icon: 'CloudSnow' };
    case 95:
    case 96:
    case 99:
      return { condition: 'Thunderstorm', description: 'Severe convective storm with lightning activity', icon: 'CloudLightning' };
    default:
      return {
        condition: 'Condition Unavailable',
        description: `Unrecognized WMO condition code (${code}).`,
        icon: 'CloudOff',
      };
  }
}

function isCoastalLocation(city: string, state: string, lat: number, lon: number): boolean {
  const text = `${city} ${state}`.toLowerCase();
  const inlandExclusions = ['bhubaneswar', 'cuttack', 'delhi', 'new delhi', 'bengaluru', 'hyderabad', 'pune', 'jaipur', 'lucknow', 'patna', 'bhopal', 'indore', 'nagpur', 'ranchi', 'raipur'];
  if (inlandExclusions.some((item) => text.includes(item))) {
    return false;
  }
  const coastalCities = [
    'mumbai', 'chennai', 'kochi', 'cochin', 'visakhapatnam', 'vizag', 'puri', 'gopalpur',
    'paradip', 'balasore', 'digha', 'haldia', 'kolkata', 'goa', 'panaji', 'vasco', 'mangalore',
    'mangaluru', 'karwar', 'udupi', 'kozikhode', 'kozhikode', 'thiruvananthapuram', 'trivandrum',
    'alleppey', 'alappuzha', 'kanyakumari', 'tuticorin', 'thoothukudi', 'rameswaram', 'nagapattinam',
    'pondicherry', 'puducherry', 'kakinada', 'machilipatnam', 'nellore', 'surat', 'porbandar',
    'veraval', 'dwarka', 'okha', 'kandla', 'bhavnagar', 'diu', 'daman', 'port blair', 'andaman',
    'nicobar', 'kavaratti', 'lakshadweep', 'ratnagiri', 'alibag',
  ];
  if (coastalCities.some((item) => text.includes(item))) {
    return true;
  }
  // Open-ocean equatorial or coastal band heuristic only when no Indian inland city matched
  if (Math.abs(lat) < 2 && Math.abs(lon) < 2) {
    return true; // Equatorial Gulf of Guinea / Ocean at (0,0)
  }
  return false;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'aistudio-build',
      },
    });
    if (!res.ok) {
      const err: any = new Error(`Upstream HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function getCache(key: string): { fresh: any | null; stale: any | null } {
  const entry = weatherGatewayCache.get(key);
  if (!entry) return { fresh: null, stale: null };
  const age = Date.now() - entry.fetchedAt;
  if (age <= WEATHER_FRESH_MS) return { fresh: entry.data, stale: entry.data };
  if (age <= WEATHER_STALE_MS) return { fresh: null, stale: entry.data };
  weatherGatewayCache.delete(key);
  return { fresh: null, stale: null };
}

function formatTimeIST(isoOrUnix: unknown): string | null {
  if (isoOrUnix === null || isoOrUnix === undefined) return null;
  const d = typeof isoOrUnix === 'number' ? new Date(isoOrUnix * 1000) : new Date(String(isoOrUnix));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function computeCpcbAqiFromPm25(pm25: number | null): number | null {
  if (pm25 === null || !Number.isFinite(pm25)) return null;
  if (pm25 <= 30) return Math.round(pm25 * (50 / 30));
  if (pm25 <= 60) return Math.round(50 + ((pm25 - 30) * 50) / 30);
  if (pm25 <= 90) return Math.round(100 + ((pm25 - 60) * 100) / 30);
  if (pm25 <= 120) return Math.round(200 + ((pm25 - 90) * 100) / 30);
  if (pm25 <= 250) return Math.round(300 + ((pm25 - 120) * 100) / 130);
  return Math.round(400 + ((pm25 - 250) * 100) / 130);
}

function classifyAqi(aqiVal: number | null): { category: string; color: string } {
  if (aqiVal === null) return { category: 'Unavailable', color: '#8295A8' };
  if (aqiVal <= 50) return { category: 'Good', color: '#22C7A0' };
  if (aqiVal <= 100) return { category: 'Satisfactory', color: '#84CC16' };
  if (aqiVal <= 200) return { category: 'Moderate', color: '#F59E0B' };
  if (aqiVal <= 300) return { category: 'Poor', color: '#F97316' };
  if (aqiVal <= 400) return { category: 'Very Poor', color: '#EF4444' };
  return { category: 'Severe', color: '#A855F7' };
}

function getCurrentCropSeason(): 'Kharif' | 'Rabi' | 'Zaid' {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 10) return 'Kharif';
  if (m >= 11 || m <= 2) return 'Rabi';
  return 'Zaid';
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    return sendJson(res, 200, { status: 'ok' });
  }

  const query = parseQuery(req);
  const mode = (query.mode || 'current').toString().toLowerCase();

  try {
    if (mode === 'imd') {
      const route = (query.route || '').toString().replace(/^\//, '');
      if (!route) {
        return sendJson(res, 400, {
          source: 'IMD',
          status: 'error',
          fetchedAt: new Date().toISOString(),
          stale: false,
          data: null,
          error: { code: 'MISSING_ROUTE', message: 'Missing IMD route parameter.' },
        });
      }
      const allowedBase = process.env.IMD_API_BASE_URL || 'https://mausam.imd.gov.in/api/v1';
      const imdUrl = `${allowedBase}/${route}`;
      try {
        const imdJson = await fetchJsonWithTimeout(imdUrl, 5000);
        return sendJson(res, 200, {
          source: 'IMD',
          status: 'live',
          fetchedAt: new Date().toISOString(),
          stale: false,
          data: imdJson,
        });
      } catch (imdErr: any) {
        return sendJson(res, 200, {
          source: 'IMD',
          status: 'error',
          fetchedAt: new Date().toISOString(),
          stale: false,
          data: null,
          error: {
            code: 'IMD_UNAVAILABLE',
            message: imdErr?.message || 'IMD upstream endpoint did not respond.',
          },
        });
      }
    }

    if (mode === 'search' || mode === 'locations') {
      const q = (query.q || query.query || query.city || '').toString().trim();
      if (!q) {
        return sendJson(res, 200, []);
      }
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`;
      const geoData = await fetchJsonWithTimeout(geoUrl, 7000);
      const results = (geoData?.results || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        city: r.name,
        district: r.admin2 || r.admin1 || r.name,
        state: r.admin1 || '',
        country: r.country || '',
        latitude: r.latitude,
        longitude: r.longitude,
        elevation: r.elevation ?? null,
      }));
      return sendJson(res, 200, results, {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      });
    }

    // All atmospheric telemetry modes strictly require valid finite coordinates
    const parsedCoords = parseStrictCoordinates(query);
    if (!parsedCoords.ok) {
      return sendJson(res, 400, {
        status: 'error',
        source: 'MAUSAM Gateway',
        dataStatus: 'UNAVAILABLE',
        data: null,
        error: parsedCoords.error,
      });
    }

    const { lat, lon } = parsedCoords;
    const city = (query.city || query.q || '').toString();
    const state = (query.state || '').toString();
    const district = (query.district || city || '').toString();
    const stationLabel = city || district ? `${district || city} Grid Point` : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

    if (mode === 'air' || mode === 'aqi') {
      const requestedDate = typeof query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
        ? query.date
        : '';
      const cacheKey = `air:${lat.toFixed(3)}:${lon.toFixed(3)}:${requestedDate || 'latest'}`;
      const { fresh, stale } = getCache(cacheKey);
      if (fresh) {
        return sendJson(res, 200, fresh);
      }

      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi,dust,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen,ammonia&hourly=pm10,pm2_5,us_aqi,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&past_days=6&forecast_days=1&timezone=auto`;
      let aqiData: any;
      try {
        aqiData = await fetchJsonWithTimeout(aqiUrl, 8500);
      } catch (err: any) {
        if (stale) {
          return sendJson(res, 200, {
            ...stale,
            dataStatus: 'STALE',
            cached: true,
          });
        }
        const httpStatus = err?.name === 'AbortError' ? 504 : 502;
        return sendJson(res, httpStatus, {
          status: 'error',
          source: 'Open-Meteo Air Quality Model',
          provider: 'OPEN_METEO_AQ',
          dataStatus: 'UNAVAILABLE',
          data: null,
          error: err?.message || 'Air quality upstream request failed.',
        });
      }

      const cur = aqiData?.current;
      if (!cur || typeof cur !== 'object') {
        return sendJson(res, 502, {
          status: 'error',
          source: 'Open-Meteo Air Quality Model',
          provider: 'OPEN_METEO_AQ',
          dataStatus: 'UNAVAILABLE',
          data: null,
          error: 'Malformed upstream air quality payload.',
        });
      }

      const pm25 = roundOrNull(cur.pm2_5, 1);
      const pm10 = roundOrNull(cur.pm10, 1);
      const no2 = roundOrNull(cur.nitrogen_dioxide, 1);
      const so2 = roundOrNull(cur.sulphur_dioxide, 1);
      const coUg = roundOrNull(cur.carbon_monoxide, 0);
      const o3 = roundOrNull(cur.ozone, 1);
      const dust = roundOrNull(cur.dust, 1);
      const aqiVal = computeCpcbAqiFromPm25(pm25) ?? roundOrNull(cur.us_aqi) ?? roundOrNull(cur.european_aqi);
      const { category, color } = classifyAqi(aqiVal);
      const hasMetrics = aqiVal !== null || pm25 !== null || pm10 !== null;

      const curPollenVals = [
        numOrNull(cur.alder_pollen),
        numOrNull(cur.birch_pollen),
        numOrNull(cur.grass_pollen),
        numOrNull(cur.mugwort_pollen),
        numOrNull(cur.olive_pollen),
        numOrNull(cur.ragweed_pollen),
      ].filter((v): v is number => v !== null);
      const curTotalPollenGrains =
        curPollenVals.length > 0 ? Math.round(curPollenVals.reduce((a, b) => a + b, 0)) : null;
      const curPollenLevel =
        curTotalPollenGrains === null
          ? null
          : curTotalPollenGrains > 100
          ? 5
          : curTotalPollenGrains > 50
          ? 4
          : curTotalPollenGrains > 20
          ? 3
          : curTotalPollenGrains > 5
          ? 2
          : 1;

      // Aggregate hourly series by day (YYYY-MM-DD) for 7-day trend chart
      const hRaw = aqiData?.hourly || {};
      const hTimes: string[] = Array.isArray(hRaw.time) ? hRaw.time : [];
      const dayBuckets = new Map<
        string,
        {
          pm25: number[];
          pm10: number[];
          aqi: number[];
          no2: number[];
          so2: number[];
          co: number[];
          o3: number[];
          pollenGrains: number[];
        }
      >();

      let peakConcentration: number | null = null;
      let peakTime: string | null = null;

      for (let i = 0; i < hTimes.length; i++) {
        const ts = hTimes[i];
        if (typeof ts !== 'string' || ts.length < 10) continue;
        const dateKey = ts.slice(0, 10);
        if (!dayBuckets.has(dateKey)) {
          dayBuckets.set(dateKey, {
            pm25: [],
            pm10: [],
            aqi: [],
            no2: [],
            so2: [],
            co: [],
            o3: [],
            pollenGrains: [],
          });
        }
        const b = dayBuckets.get(dateKey)!;
        const hp25 = numOrNull(hRaw.pm2_5?.[i]);
        const hp10 = numOrNull(hRaw.pm10?.[i]);
        const haqi = numOrNull(hRaw.us_aqi?.[i]);
        const hno2 = numOrNull(hRaw.nitrogen_dioxide?.[i]);
        const hso2 = numOrNull(hRaw.sulphur_dioxide?.[i]);
        const hco = numOrNull(hRaw.carbon_monoxide?.[i]);
        const ho3 = numOrNull(hRaw.ozone?.[i]);

        if (hp25 !== null) {
          b.pm25.push(hp25);
          if (peakConcentration === null || hp25 > peakConcentration) {
            peakConcentration = Math.round(hp25 * 10) / 10;
            peakTime = dateKey;
          }
        }
        if (hp10 !== null) b.pm10.push(hp10);
        if (haqi !== null) b.aqi.push(haqi);
        if (hno2 !== null) b.no2.push(hno2);
        if (hso2 !== null) b.so2.push(hso2);
        if (hco !== null) b.co.push(hco);
        if (ho3 !== null) b.o3.push(ho3);

        const hourPollenParts = [
          numOrNull(hRaw.alder_pollen?.[i]),
          numOrNull(hRaw.birch_pollen?.[i]),
          numOrNull(hRaw.grass_pollen?.[i]),
          numOrNull(hRaw.mugwort_pollen?.[i]),
          numOrNull(hRaw.olive_pollen?.[i]),
          numOrNull(hRaw.ragweed_pollen?.[i]),
        ].filter((v): v is number => v !== null);
        if (hourPollenParts.length > 0) {
          b.pollenGrains.push(hourPollenParts.reduce((a, c) => a + c, 0));
        }
      }

      const avg = (arr: number[], decimals = 1): number | null => {
        if (!arr.length) return null;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const factor = Math.pow(10, decimals);
        return Math.round(mean * factor) / factor;
      };

      const observations = Array.from(dayBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([dateStr, b]) => {
          const dayPm25 = avg(b.pm25, 1);
          const dayPm10 = avg(b.pm10, 1);
          const dayAqi = computeCpcbAqiFromPm25(dayPm25) ?? avg(b.aqi, 0);
          const dayPollenGrains = b.pollenGrains.length ? avg(b.pollenGrains, 0) : null;
          const dayPollenLevel =
            dayPollenGrains === null
              ? null
              : dayPollenGrains > 100
              ? 5
              : dayPollenGrains > 50
              ? 4
              : dayPollenGrains > 20
              ? 3
              : dayPollenGrains > 5
              ? 2
              : 1;
          const parsedDate = new Date(`${dateStr}T00:00:00`);
          const dayLabel = Number.isNaN(parsedDate.getTime())
            ? dateStr
            : parsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

          return {
            date: dateStr,
            day: dayLabel,
            pm25: dayPm25,
            pm10: dayPm10,
            aqi: dayAqi,
            aqiCategory: classifyAqi(dayAqi).category,
            pollen: dayPollenLevel,
            totalPollenGrains: dayPollenGrains,
            no2: avg(b.no2, 1),
            so2: avg(b.so2, 1),
            co: avg(b.co, 0),
            o3: avg(b.o3, 1),
          };
        });

      const validDailyPm25 = observations
        .map((o) => o.pm25)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      const sevenDayAveragePm25 =
        validDailyPm25.length > 0
          ? Math.round((validDailyPm25.reduce((a, b) => a + b, 0) / validDailyPm25.length) * 10) / 10
          : pm25;
      const firstPm25 = validDailyPm25[0] ?? null;
      const lastPm25 = validDailyPm25[validDailyPm25.length - 1] ?? null;
      const trendStatus =
        firstPm25 === null || lastPm25 === null || validDailyPm25.length < 2
          ? 'Stable'
          : lastPm25 - firstPm25 > 5
          ? 'Rising'
          : firstPm25 - lastPm25 > 5
          ? 'Improving'
          : 'Stable';

      const payload = {
        status: hasMetrics ? 'success' : 'error',
        source: 'Open-Meteo Air Quality Model',
        provider: 'OPEN_METEO_AQ',
        dataStatus: hasMetrics ? 'MODEL_LIVE' : 'UNAVAILABLE',
        observedAt: cur.time || new Date().toISOString(),
        stationId: (query.stationId as string) || stationLabel,
        startDate: observations[0]?.date || null,
        sevenDayAveragePm25,
        peakConcentration,
        peakTime,
        trendStatus,
        observations,
        current: {
          ...cur,
          pm25,
          pm10,
          aqi: aqiVal,
          pollen: curPollenLevel,
          totalPollenGrains: curTotalPollenGrains,
        },
        raw: aqiData,
        data: {
          aqi: aqiVal,
          category,
          dominantPollutant: pm25 !== null ? 'PM2.5' : pm10 !== null ? 'PM10' : 'Unavailable',
          color,
          components: {
            pm2_5: pm25,
            pm10,
            no2,
            so2,
            co: coUg !== null ? Math.round((coUg / 1000) * 100) / 100 : null,
            o3,
            dust,
          },
          advisory:
            aqiVal === null
              ? 'Air quality telemetry is unavailable for this coordinate.'
              : aqiVal > 200
              ? 'Poor air quality: limit prolonged outdoor exertion and wear N95 protection if sensitive.'
              : aqiVal > 100
              ? 'Moderate air quality: sensitive individuals should pace heavy outdoor activity.'
              : 'Air quality is within satisfactory ambient limits.',
        },
      };

      weatherGatewayCache.set(cacheKey, { data: payload, fetchedAt: Date.now() });
      return sendJson(res, 200, payload, {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      });
    }

    if (mode === 'marine') {
      const coastal = isCoastalLocation(city, state, lat, lon);
      if (!coastal) {
        return sendJson(res, 200, {
          status: 'success',
          source: 'Open-Meteo Marine Model',
          provider: 'OPEN_METEO_MARINE',
          dataStatus: 'NOT_APPLICABLE',
          isCoastal: false,
          isApplicable: false,
          observedAt: new Date().toISOString(),
          data: {
            isCoastal: false,
            isApplicable: false,
            waveHeightM: null,
            wavePeriodSec: null,
            swellHeightM: null,
            waterTempC: null,
            tideStatus: null,
            tideHeightM: null,
            seaCondition: 'Not applicable (inland location)',
            fishermenWarning: 'Inland station outside coastal marine domain.',
          },
        });
      }

      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,swell_wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction&timezone=auto`;
      let marineJson: any;
      try {
        marineJson = await fetchJsonWithTimeout(marineUrl, 8000);
      } catch (err: any) {
        return sendJson(res, err?.name === 'AbortError' ? 504 : 502, {
          status: 'error',
          source: 'Open-Meteo Marine Model',
          provider: 'OPEN_METEO_MARINE',
          dataStatus: 'UNAVAILABLE',
          isCoastal: true,
          isApplicable: true,
          data: null,
          error: err?.message || 'Marine model feed unreachable.',
        });
      }

      const mc = marineJson?.current || {};
      const waveH = roundOrNull(mc.wave_height, 2);
      const seaCondition =
        waveH === null
          ? 'Unavailable'
          : waveH > 2.5
          ? 'Rough to Very Rough'
          : waveH > 1.25
          ? 'Moderate'
          : 'Calm to Slight';

      return sendJson(res, 200, {
        status: waveH !== null ? 'success' : 'error',
        source: 'Open-Meteo Marine Model',
        provider: 'OPEN_METEO_MARINE',
        dataStatus: waveH !== null ? 'MODEL_LIVE' : 'UNAVAILABLE',
        isCoastal: true,
        isApplicable: true,
        observedAt: mc.time || new Date().toISOString(),
        data: {
          isCoastal: true,
          isApplicable: true,
          waveHeightM: waveH,
          wavePeriodSec: roundOrNull(mc.wave_period, 1),
          swellHeightM: roundOrNull(mc.swell_wave_height, 2),
          waterTempC: roundOrNull(mc.sea_surface_temperature, 1),
          currentVelocityKmh: roundOrNull(mc.ocean_current_velocity, 2),
          currentDirectionDeg: roundOrNull(mc.ocean_current_direction, 0),
          seaCondition,
          fishermenWarning:
            waveH === null
              ? 'Marine wave telemetry currently unavailable.'
              : waveH > 2.5
              ? 'High wave energy (>2.5m): small craft caution advised.'
              : 'No high-wave threshold exceeded in model guidance.',
        },
      });
    }

    // Forecast / Current / Hourly / Daily / Bundle / Persona
    const cacheKey = `wx:${lat.toFixed(3)}:${lon.toFixed(3)}`;
    const { fresh, stale } = getCache(cacheKey);

    let omData: any = fresh;
    let servedFromStale = false;

    if (!omData) {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m,visibility&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility,cloud_cover,direct_normal_irradiance,soil_moisture_0_to_1cm,soil_temperature_0cm,et0_fao_evapotranspiration&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=auto&forecast_days=7`;
      try {
        omData = await fetchJsonWithTimeout(weatherUrl, 8500);
        if (!omData || typeof omData !== 'object' || !omData.current) {
          throw new Error('Malformed Open-Meteo response: missing current block');
        }
        weatherGatewayCache.set(cacheKey, { data: omData, fetchedAt: Date.now() });
      } catch (err: any) {
        if (stale) {
          omData = stale;
          servedFromStale = true;
        } else {
          const httpStatus = err?.name === 'AbortError' ? 504 : 502;
          return sendJson(res, httpStatus, {
            status: 'error',
            source: 'Open-Meteo Model Data',
            provider: 'OPEN_METEO',
            dataStatus: 'UNAVAILABLE',
            data: null,
            error: err?.message || 'Upstream weather model unreachable.',
          });
        }
      }
    }

    const cur = omData.current || {};
    const hourlyRaw = omData.hourly || {};
    const dailyRaw = omData.daily || {};

    const curCode = numOrNull(cur.weather_code);
    const weatherCond = getWeatherCondition(curCode);
    const temp = roundOrNull(cur.temperature_2m, 1);
    const feelsLike = roundOrNull(cur.apparent_temperature, 1);
    const humidity = roundOrNull(cur.relative_humidity_2m, 0);
    const windSpeed = roundOrNull(cur.wind_speed_10m, 1);
    const windDeg = roundOrNull(cur.wind_direction_10m, 0);
    const pressure = roundOrNull(cur.pressure_msl ?? cur.surface_pressure, 1);
    const cloudCover = roundOrNull(cur.cloud_cover, 0);
    const visMeters = numOrNull(cur.visibility ?? hourlyRaw.visibility?.[0]);
    const visibilityKm = visMeters !== null ? Math.round((visMeters / 1000) * 10) / 10 : null;
    const uvToday = roundOrNull(dailyRaw.uv_index_max?.[0] ?? hourlyRaw.uv_index?.[0], 1);
    const dewPoint = roundOrNull(cur.dew_point_2m ?? hourlyRaw.dew_point_2m?.[0], 1);
    const rainVal = roundOrNull(cur.rain ?? cur.precipitation, 1);
    const hasPrimaryMetrics = temp !== null && (humidity !== null || windSpeed !== null);
    const dataStatus = !hasPrimaryMetrics ? 'UNAVAILABLE' : servedFromStale ? 'STALE' : 'MODEL_LIVE';

    const normalizedCurrent = {
      temperature: temp,
      temp,
      feelsLike,
      humidity,
      weatherCode: curCode,
      condition: weatherCond.condition,
      description: weatherCond.description,
      icon: weatherCond.icon,
      windSpeed,
      windDirection: degreesToCompass(windDeg),
      windDirectionDegrees: windDeg,
      pressure,
      cloudCover,
      visibility: visibilityKm,
      uvIndex: uvToday,
      dewPoint,
      isDay: cur.is_day === 1,
      rain: rainVal,
      observedAt: cur.time || new Date().toISOString(),
      station: stationLabel,
      location: {
        city: city || null,
        district: district || null,
        state: state || null,
        latitude: lat,
        longitude: lon,
      },
    };

    const dailyTimes: string[] = Array.isArray(dailyRaw.time) ? dailyRaw.time : [];
    const normalizedDaily = dailyTimes.map((t: string, i: number) => {
      const code = numOrNull(dailyRaw.weather_code?.[i]);
      const cond = getWeatherCondition(code);
      return {
        date: t,
        day: new Date(t).toLocaleDateString('en-US', { weekday: 'short' }),
        weatherCode: code,
        tempMax: roundOrNull(dailyRaw.temperature_2m_max?.[i], 1),
        tempMin: roundOrNull(dailyRaw.temperature_2m_min?.[i], 1),
        condition: cond.condition,
        icon: cond.icon,
        precipitationProb: roundOrNull(dailyRaw.precipitation_probability_max?.[i], 0),
        precipitationMm: roundOrNull(dailyRaw.precipitation_sum?.[i], 1),
        uvIndex: roundOrNull(dailyRaw.uv_index_max?.[i], 1),
        sunrise: dailyRaw.sunrise?.[i] || null,
        sunset: dailyRaw.sunset?.[i] || null,
      };
    });

    const hourlyTimes: string[] = Array.isArray(hourlyRaw.time) ? hourlyRaw.time.slice(0, 24) : [];
    const normalizedHourly = hourlyTimes.map((t: string, i: number) => {
      const code = numOrNull(hourlyRaw.weather_code?.[i]);
      const cond = getWeatherCondition(code);
      return {
        time: t,
        hour: new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        weatherCode: code,
        temperature: roundOrNull(hourlyRaw.temperature_2m?.[i], 1),
        feelsLike: roundOrNull(hourlyRaw.apparent_temperature?.[i], 1),
        humidity: roundOrNull(hourlyRaw.relative_humidity_2m?.[i], 0),
        precipitationProb: roundOrNull(hourlyRaw.precipitation_probability?.[i], 0),
        condition: cond.condition,
        icon: cond.icon,
        windSpeed: roundOrNull(hourlyRaw.wind_speed_10m?.[i], 1),
      };
    });

    if (mode === 'hourly') {
      return sendJson(res, 200, {
        status: 'success',
        source: 'Open-Meteo Model Data',
        dataStatus,
        raw: omData,
        data: normalizedHourly,
      });
    }

    if (mode === 'daily') {
      return sendJson(res, 200, {
        status: 'success',
        source: 'Open-Meteo Model Data',
        dataStatus,
        raw: omData,
        data: normalizedDaily,
      });
    }

    if (mode === 'forecast') {
      return sendJson(res, 200, {
        status: 'success',
        source: 'Open-Meteo Model Data',
        dataStatus,
        raw: omData,
        data: {
          current: normalizedCurrent,
          daily: normalizedDaily,
          hourly: normalizedHourly,
        },
      });
    }

    if (mode === 'bundle' || mode === 'persona') {
      // Fetch optional air quality & coastal marine telemetry in parallel without blocking weather response
      const coastal = isCoastalLocation(city, state, lat, lon);
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi,alder_pollen,birch_pollen,grass_pollen,ragweed_pollen&timezone=auto`;
      const marineUrl = coastal
        ? `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=auto`
        : null;

      const [aqResult, marineResult] = await Promise.allSettled([
        fetchJsonWithTimeout(aqiUrl, 5000),
        marineUrl ? fetchJsonWithTimeout(marineUrl, 5000) : Promise.resolve(null),
      ]);

      const aqCur = aqResult.status === 'fulfilled' ? aqResult.value?.current || {} : {};
      const pm25 = roundOrNull(aqCur.pm2_5, 1);
      const pm10 = roundOrNull(aqCur.pm10, 1);
      const no2 = roundOrNull(aqCur.nitrogen_dioxide, 1);
      const so2 = roundOrNull(aqCur.sulphur_dioxide, 1);
      const co = roundOrNull(aqCur.carbon_monoxide, 0);
      const o3 = roundOrNull(aqCur.ozone, 1);
      const aqiVal = computeCpcbAqiFromPm25(pm25) ?? roundOrNull(aqCur.us_aqi) ?? roundOrNull(aqCur.european_aqi);
      const { category: aqiCat, color: aqiColor } = classifyAqi(aqiVal);

      const treeP = roundOrNull((numOrNull(aqCur.birch_pollen) ?? 0) + (numOrNull(aqCur.alder_pollen) ?? 0), 0);
      const grassP = roundOrNull(aqCur.grass_pollen, 0);
      const weedP = roundOrNull(aqCur.ragweed_pollen, 0);
      const hasPollen =
        numOrNull(aqCur.birch_pollen) !== null ||
        numOrNull(aqCur.alder_pollen) !== null ||
        numOrNull(aqCur.grass_pollen) !== null ||
        numOrNull(aqCur.ragweed_pollen) !== null;
      const totalPollen = hasPollen ? (treeP ?? 0) + (grassP ?? 0) + (weedP ?? 0) : null;
      const pollenRisk =
        totalPollen === null
          ? 'Low'
          : totalPollen > 50
          ? 'Very High'
          : totalPollen > 20
          ? 'High'
          : totalPollen > 6
          ? 'Moderate'
          : 'Low';

      const curTemp = temp;
      const curHum = humidity;
      const curWind = windSpeed;
      const curUv = uvToday;
      const curVis = visibilityKm;
      const sunriseStr = formatTimeIST(dailyRaw.sunrise?.[0]) || 'Unavailable';
      const sunsetStr = formatTimeIST(dailyRaw.sunset?.[0]) || 'Unavailable';

      const heatAlertActive = curTemp !== null && curTemp >= 38;
      const thermalStressLevel =
        curTemp === null
          ? 'Low'
          : curTemp >= 40
          ? 'Extreme'
          : curTemp >= 34
          ? 'High'
          : curTemp >= 28
          ? 'Moderate'
          : 'Low';
      const workoutSuitability =
        curTemp === null
          ? 'Fair'
          : heatAlertActive || (aqiVal !== null && aqiVal > 200)
          ? 'Poor'
          : curTemp >= 33 || (curHum !== null && curHum >= 82)
          ? 'Fair'
          : curTemp >= 18 && curTemp <= 28
          ? 'Excellent'
          : 'Good';

      const marineCur =
        marineResult.status === 'fulfilled' && marineResult.value?.current
          ? marineResult.value.current
          : null;
      const waveH = marineCur ? roundOrNull(marineCur.wave_height, 2) : null;
      const marineData =
        coastal && waveH !== null
          ? {
              source: 'Open-Meteo Marine Model',
              isCoastal: true,
              waveHeightMeters: waveH,
              wavePeriodSeconds: roundOrNull(marineCur.wave_period, 1) ?? 0,
              waveDirectionDegrees: roundOrNull(marineCur.wave_direction, 0) ?? 0,
              seaSurfaceTemperatureC: roundOrNull(marineCur.sea_surface_temperature, 1) ?? 0,
              surfCondition:
                waveH > 2.5
                  ? 'Dangerous Surf'
                  : waveH > 1.5
                  ? 'Rough Waves'
                  : waveH > 0.75
                  ? 'Moderate Swell'
                  : 'Calm & Safe',
              marineAdvisory:
                waveH > 2.2
                  ? 'Strong swells reported in Open-Meteo marine guidance; exercise coastal caution.'
                  : 'Coastal sea state within moderate bounds.',
              lastUpdated: new Date().toISOString(),
            }
          : null;

      // Soil moisture & 3-day rain strictly from Open-Meteo hourly/daily arrays
      const smRaw = numOrNull(hourlyRaw.soil_moisture_0_to_1cm?.[0]);
      const soilPct = smRaw !== null ? Math.round(smRaw * 100) : null;
      const threeDaySum = [0, 1, 2].reduce<number | null>((acc, idx) => {
        const val = numOrNull(dailyRaw.precipitation_sum?.[idx]);
        if (val === null) return acc;
        return (acc ?? 0) + val;
      }, null);

      const isRaining = rainVal !== null && rainVal > 0.1;
      const roadCondition: 'Dry' | 'Wet' | 'Waterlogged' | 'Icy' | 'Foggy' =
        rainVal !== null && rainVal >= 10
          ? 'Waterlogged'
          : isRaining
          ? 'Wet'
          : curVis !== null && curVis < 1.5
          ? 'Foggy'
          : curTemp !== null && curTemp <= 0
          ? 'Icy'
          : 'Dry';

      const personaBundle = {
        location: {
          city: city || stationLabel,
          state: state || 'Region',
          lat,
          lng: lon,
          isCoastal: coastal,
        },
        health: {
          aqi: {
            source: 'Open-Meteo Air Quality Model',
            stationName: `${city || stationLabel} Model Grid`,
            aqi: aqiVal,
            category: aqiCat,
            dominantPollutant: pm25 !== null ? 'PM2.5' : 'PM10',
            pm25,
            pm10,
            no2,
            so2,
            co: co !== null ? Math.round((co / 1000) * 100) / 100 : null,
            o3,
            healthAdvice:
              aqiVal === null
                ? 'Air quality readings currently unavailable from upstream feed.'
                : aqiVal > 200
                ? 'Limit prolonged outdoor exertion and keep indoor air filtered.'
                : aqiVal > 100
                ? 'Sensitive individuals should limit strenuous outdoor activity.'
                : 'Ambient air quality is within acceptable limits.',
            colorCode: aqiColor,
            lastUpdated: aqCur.time || new Date().toISOString(),
            isOfficialFeed: false,
          },
          pollen: {
            source: hasPollen ? 'Open-Meteo Pollen Model' : 'Unavailable for region',
            overallIndex: totalPollen,
            riskCategory: pollenRisk,
            treePollen: hasPollen ? treeP : null,
            grassPollen: hasPollen ? grassP : null,
            weedPollen: hasPollen ? weedP : null,
            allergyTip: hasPollen
              ? `Pollen load index is ${totalPollen} (${pollenRisk}).`
              : 'Gridded pollen counts are unavailable outside Europe in current Open-Meteo coverage.',
            lastUpdated: aqCur.time || new Date().toISOString(),
          },
          uvIndex: curUv,
          uvRiskLabel:
            curUv === null
              ? 'Unavailable'
              : curUv >= 8
              ? 'Very High UV'
              : curUv >= 6
              ? 'High UV'
              : curUv >= 3
              ? 'Moderate UV'
              : 'Low UV',
          uvAdvice:
            curUv === null
              ? 'UV irradiance unavailable.'
              : curUv >= 6
              ? 'Use SPF 30+ sun protection and avoid direct midday exposure.'
              : 'Moderate/low solar UV exposure.',
          humidity: curHum,
        },
        fitness: {
          sunrise: sunriseStr,
          sunset: sunsetStr,
          bestRunningHours: '05:30 AM – 07:30 AM',
          workoutSuitability,
          heatAlertActive,
          heatAlertMessage: heatAlertActive ? `High ambient temperature (${curTemp}°C) increases heat strain.` : null,
          windSpeedKmh: curWind,
          windDirection: degreesToCompass(windDeg),
          hydrationRateMlHour:
            curTemp === null ? null : curTemp >= 35 ? 850 : curTemp >= 28 ? 650 : 450,
          thermalStressLevel,
        },
        beachAndSurf: {
          isCoastal: coastal,
          tides: null,
          marine: marineData,
        },
        travel: {
          activeAlerts: [],
          packingSuggestions: isRaining
            ? ['Waterproof shell or umbrella', 'Quick-dry footwear']
            : heatAlertActive
            ? ['Breathable cotton layers', 'Sunscreen & hydration bottle']
            : ['Light seasonal layers'],
          travelSafetyRating:
            roadCondition === 'Waterlogged' || roadCondition === 'Foggy'
              ? 'Caution Advised'
              : roadCondition === 'Wet'
              ? 'Minor Delays Expected'
              : 'Favorable',
        },
        familyCommute: {
          morningCommuteStatus: roadCondition === 'Waterlogged' || roadCondition === 'Foggy' ? 'Caution' : 'Safe',
          eveningCommuteStatus: isRaining ? 'Caution' : 'Safe',
          morningWindow: '07:30 AM – 09:30 AM',
          eveningWindow: '05:00 PM – 07:30 PM',
          rainExpectedDuringCommute: isRaining || (normalizedDaily[0]?.precipitationProb ?? 0) >= 60,
          commuteRainSummary:
            normalizedDaily[0]?.precipitationProb !== null && normalizedDaily[0]?.precipitationProb !== undefined
              ? `Peak daily rain probability ${normalizedDaily[0].precipitationProb}%`
              : 'Precipitation probability unavailable',
          schoolBusSafetyNote:
            curVis !== null && curVis < 2
              ? `Low visibility (${curVis} km); allow extra transit margin.`
              : 'Standard visibility conditions along local routes.',
          severeWarnings: [],
        },
        agriculture: {
          soilMoisturePercent: soilPct,
          soilMoistureStatus:
            soilPct === null ? 'Optimal' : soilPct >= 35 ? 'Saturated' : soilPct < 15 ? 'Dry' : 'Optimal',
          threeDayRainfallTotalMm: threeDaySum !== null ? Math.round(threeDaySum * 10) / 10 : null,
          frostAlertActive: curTemp !== null && curTemp <= 2,
          frostAlertMessage: curTemp !== null && curTemp <= 2 ? 'Low temperature frost risk detected.' : null,
          currentCropSeason: getCurrentCropSeason(),
          seasonalPlantingTip: 'Align field operations with 5-day Open-Meteo precipitation & soil moisture guidance.',
          irrigationRecommendation:
            soilPct === null
              ? 'Soil moisture telemetry unavailable; verify field moisture manually.'
              : soilPct >= 30 || (threeDaySum ?? 0) >= 15
              ? 'Hold irrigation; surface soil moisture and forecast rain are adequate.'
              : 'Monitor root-zone moisture for scheduled light irrigation.',
        },
        commuter: {
          roadCondition,
          roadSafetyIndex: roadCondition === 'Waterlogged' || roadCondition === 'Foggy' ? 'Yellow' : 'Green',
          roadSafetyLabel: roadCondition === 'Dry' ? 'Clear Transit Conditions' : `${roadCondition} Surface Conditions`,
          visibilityKm: curVis,
          visibilityStatus:
            curVis === null
              ? 'Clear'
              : curVis < 0.5
              ? 'Dense Fog Danger'
              : curVis < 2
              ? 'Poor (Fog)'
              : curVis < 6
              ? 'Moderate'
              : 'Clear',
          travelHazards: [
            ...(isRaining ? ['Wet road surface traction'] : []),
            ...(curWind !== null && curWind >= 35 ? [`Strong crosswinds (${curWind} km/h)`] : []),
            ...(curVis !== null && curVis < 2 ? [`Reduced visibility (${curVis} km)`] : []),
          ],
        },
        eventPlanner: {
          extendedForecast: normalizedDaily.slice(0, 7).map((d) => {
            const comfortVal =
              d.tempMax === null
                ? 50
                : Math.max(10, Math.min(98, Math.round(100 - Math.abs(d.tempMax - 25) * 3 - (d.precipitationProb ?? 0) * 0.35)));
            const comfortCategory =
              comfortVal >= 80
                ? 'Pleasant'
                : comfortVal >= 65
                ? 'Comfortable'
                : comfortVal >= 50
                ? 'Warm & Humid'
                : comfortVal >= 35
                ? 'Uncomfortable'
                : 'Stifling';
            return {
              date: d.date,
              dayOfWeek: d.day,
              tempMax: d.tempMax,
              tempMin: d.tempMin,
              condition: d.condition,
              icon: d.icon,
              rainProbabilityPercent: d.precipitationProb,
              comfortIndexValue: comfortVal,
              comfortCategory,
            };
          }),
          comfortIndexToday:
            curTemp === null
              ? null
              : Math.max(10, Math.min(98, Math.round(100 - Math.abs(curTemp - 25) * 3 - ((curHum ?? 50) > 75 ? 10 : 0)))),
          comfortCategoryToday:
            curTemp === null
              ? 'Comfortable'
              : curTemp >= 36
              ? 'Stifling'
              : curTemp >= 31
              ? 'Warm & Humid'
              : curTemp >= 20
              ? 'Pleasant'
              : 'Comfortable',
          eventRecommendation:
            isRaining || (normalizedDaily[0]?.precipitationProb ?? 0) >= 60
              ? 'Keep covered contingency ready due to elevated precipitation risk.'
              : heatAlertActive
              ? 'Schedule outdoor gatherings during early morning or evening hours.'
              : 'Favorable outdoor event conditions based on current model guidance.',
        },
        fetchedAt: new Date().toISOString(),
      };

      return sendJson(res, 200, {
        status: 'success',
        source: 'Open-Meteo Model Data',
        dataStatus,
        cached: servedFromStale,
        current: normalizedCurrent,
        forecast: normalizedDaily,
        hourly: normalizedHourly,
        raw: omData,
        data: personaBundle,
      });
    }

    // Default: current weather
    return sendJson(
      res,
      200,
      {
        status: hasPrimaryMetrics ? 'success' : 'error',
        source: 'Open-Meteo Model Data',
        provider: 'OPEN_METEO',
        dataStatus,
        cached: servedFromStale,
        observedAt: normalizedCurrent.observedAt,
        raw: omData,
        data: normalizedCurrent,
      },
      {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      }
    );
  } catch (err: any) {
    const httpStatus = err?.name === 'AbortError' ? 504 : 502;
    return sendJson(res, httpStatus, {
      status: 'error',
      source: 'Open-Meteo Gateway',
      provider: 'OPEN_METEO',
      dataStatus: 'UNAVAILABLE',
      data: null,
      error: err?.message || 'Weather telemetry query failed',
    });
  }
}
