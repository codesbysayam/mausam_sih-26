// ====================================================================
// MAUSAM - Real Global Atmospheric Wind & Surface Field Service
// Fetches real global 10m wind vectors (U/V components), surface temp,
// rain, and cloud cover across a planet-wide latitude/longitude grid
// from Open-Meteo (keyless, global coverage). Never invents data.
// ====================================================================

export interface GlobalGridSample {
  lat: number;
  lng: number;
  windSpeedKmh: number;
  windDirDeg: number;
  /** Zonal wind component (m/s equivalent scaled for vector flow: positive = eastward) */
  u: number;
  /** Meridional wind component (positive = northward) */
  v: number;
  temperatureC: number | null;
  rainMm: number | null;
  cloudCoverPct: number | null;
}

export interface GlobalAtmosphericField {
  lats: number[];
  lngs: number[];
  samples: GlobalGridSample[];
  fetchedAt: string;
  source: string;
  status: 'LIVE' | 'UNAVAILABLE';
}

// 5 latitude bands × 12 longitude bands = 60 evenly distributed global points covering -60°..+65° lat & -165°..+165° lng
export const GLOBAL_WIND_LATS = [-55, -25, 5, 35, 62] as const;
export const GLOBAL_WIND_LNGS = [-165, -135, -105, -75, -45, -15, 15, 45, 75, 105, 135, 165] as const;

let cachedField: GlobalAtmosphericField | null = null;
let cachedAtMs = 0;
let inflightPromise: Promise<GlobalAtmosphericField> | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Converts meteorological wind speed (km/h) and "from" compass bearing (deg)
 * into mathematical U (eastward) and V (northward) flow components.
 */
export function windSpeedDirToUV(speedKmh: number, fromDeg: number): { u: number; v: number } {
  const safeSpeed = Number.isFinite(speedKmh) && speedKmh >= 0 ? speedKmh : 0;
  const rad = ((Number.isFinite(fromDeg) ? fromDeg : 0) * Math.PI) / 180;
  // Wind blowing FROM north (0°) moves SOUTH (v < 0); FROM east (90°) moves WEST (u < 0)
  return {
    u: -safeSpeed * Math.sin(rad),
    v: -safeSpeed * Math.cos(rad),
  };
}

/**
 * Normalizes any longitude into [-180, 180) so antimeridian crossings wrap seamlessly.
 */
export function normalizeLongitude(lng: number): number {
  if (!Number.isFinite(lng)) return 0;
  let wrapped = ((lng + 180) % 360 + 360) % 360 - 180;
  if (wrapped === -180 && lng > 0) wrapped = 180;
  return wrapped;
}

/**
 * Bilinear interpolation across the global wind grid with seamless antimeridian wrapping.
 * Returns null if the global wind field is unavailable.
 */
export function sampleGlobalWindField(
  field: GlobalAtmosphericField | null,
  lng: number,
  lat: number
): { u: number; v: number; speedKmh: number } | null {
  if (!field || field.status !== 'LIVE' || field.samples.length === 0) {
    return null;
  }

  const lats = field.lats;
  const lngs = field.lngs;
  const nLat = lats.length;
  const nLng = lngs.length;
  if (nLat < 2 || nLng < 2) return null;

  const clampedLat = Math.max(lats[0], Math.min(lats[nLat - 1], lat));
  const normLng = normalizeLongitude(lng);

  // Locate latitude bracket
  let latIdx0 = 0;
  for (let i = 0; i < nLat - 1; i++) {
    if (clampedLat >= lats[i] && clampedLat <= lats[i + 1]) {
      latIdx0 = i;
      break;
    }
  }
  const latIdx1 = Math.min(nLat - 1, latIdx0 + 1);
  const latSpan = lats[latIdx1] - lats[latIdx0] || 1;
  const fy = (clampedLat - lats[latIdx0]) / latSpan;

  // Locate longitude bracket with periodic wrap across -180 / +180 antimeridian
  let lngIdx0 = nLng - 1;
  let lngIdx1 = 0;
  let fx = 0;

  if (normLng < lngs[0]) {
    lngIdx0 = nLng - 1;
    lngIdx1 = 0;
    const span = lngs[0] + 360 - lngs[nLng - 1];
    fx = (normLng + 360 - lngs[nLng - 1]) / (span || 1);
  } else if (normLng >= lngs[nLng - 1]) {
    lngIdx0 = nLng - 1;
    lngIdx1 = 0;
    const span = lngs[0] + 360 - lngs[nLng - 1];
    fx = (normLng - lngs[nLng - 1]) / (span || 1);
  } else {
    for (let j = 0; j < nLng - 1; j++) {
      if (normLng >= lngs[j] && normLng <= lngs[j + 1]) {
        lngIdx0 = j;
        lngIdx1 = j + 1;
        const span = lngs[j + 1] - lngs[j] || 1;
        fx = (normLng - lngs[j]) / span;
        break;
      }
    }
  }

  const s00 = field.samples[latIdx0 * nLng + lngIdx0];
  const s10 = field.samples[latIdx0 * nLng + lngIdx1];
  const s01 = field.samples[latIdx1 * nLng + lngIdx0];
  const s11 = field.samples[latIdx1 * nLng + lngIdx1];
  if (!s00 || !s10 || !s01 || !s11) return null;

  const u0 = s00.u * (1 - fx) + s10.u * fx;
  const u1 = s01.u * (1 - fx) + s11.u * fx;
  const u = u0 * (1 - fy) + u1 * fy;

  const v0 = s00.v * (1 - fx) + s10.v * fx;
  const v1 = s01.v * (1 - fx) + s11.v * fx;
  const v = v0 * (1 - fy) + v1 * fy;

  return {
    u,
    v,
    speedKmh: Math.hypot(u, v),
  };
}

export async function fetchGlobalAtmosphericField(
  forceRefresh = false
): Promise<GlobalAtmosphericField> {
  if (!forceRefresh && cachedField && Date.now() - cachedAtMs < CACHE_TTL_MS) {
    return cachedField;
  }
  if (!forceRefresh && inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async (): Promise<GlobalAtmosphericField> => {
    const latList: number[] = [];
    const lngList: number[] = [];
    for (const lat of GLOBAL_WIND_LATS) {
      for (const lng of GLOBAL_WIND_LNGS) {
        latList.push(lat);
        lngList.push(lng);
      }
    }

    const params = new URLSearchParams({
      latitude: latList.join(','),
      longitude: lngList.join(','),
      current: 'temperature_2m,wind_speed_10m,wind_direction_10m,rain,cloud_cover',
      wind_speed_unit: 'kmh',
      timezone: 'GMT',
    });

    const endpoints = [
      `/api/proxy/open-meteo?${params.toString()}`,
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(9500) });
        if (!res.ok) continue;
        const json = await res.json();
        const list = Array.isArray(json)
          ? json
          : Array.isArray(json?.raw)
          ? json.raw
          : json?.current
          ? [json]
          : [];

        if (list.length !== latList.length) continue;

        const samples: GlobalGridSample[] = list.map((item: any, idx: number) => {
          const cur = item?.current || {};
          const speed = typeof cur.wind_speed_10m === 'number' && Number.isFinite(cur.wind_speed_10m)
            ? cur.wind_speed_10m
            : 0;
          const dir = typeof cur.wind_direction_10m === 'number' && Number.isFinite(cur.wind_direction_10m)
            ? cur.wind_direction_10m
            : 0;
          const { u, v } = windSpeedDirToUV(speed, dir);
          return {
            lat: latList[idx],
            lng: lngList[idx],
            windSpeedKmh: speed,
            windDirDeg: dir,
            u,
            v,
            temperatureC:
              typeof cur.temperature_2m === 'number' && Number.isFinite(cur.temperature_2m)
                ? cur.temperature_2m
                : null,
            rainMm:
              typeof cur.rain === 'number' && Number.isFinite(cur.rain) ? cur.rain : null,
            cloudCoverPct:
              typeof cur.cloud_cover === 'number' && Number.isFinite(cur.cloud_cover)
                ? cur.cloud_cover
                : null,
          };
        });

        const field: GlobalAtmosphericField = {
          lats: [...GLOBAL_WIND_LATS],
          lngs: [...GLOBAL_WIND_LNGS],
          samples,
          fetchedAt: new Date().toISOString(),
          source: 'Open-Meteo Global Model Grid (10m Wind & Surface)',
          status: 'LIVE',
        };
        cachedField = field;
        cachedAtMs = Date.now();
        return field;
      } catch {
        // Try next endpoint
      }
    }

    return {
      lats: [...GLOBAL_WIND_LATS],
      lngs: [...GLOBAL_WIND_LNGS],
      samples: [],
      fetchedAt: new Date().toISOString(),
      source: 'Open-Meteo Global Grid Unavailable',
      status: 'UNAVAILABLE',
    };
  })();

  try {
    return await inflightPromise;
  } finally {
    inflightPromise = null;
  }
}
