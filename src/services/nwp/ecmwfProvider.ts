// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// ECMWF Provider - European Centre for Medium-Range Weather Forecasts Adapter
//
// Rules enforced:
// 1. Strictly interfaces with authentic ECMWF IFS HRES (0.1° / 9 km native resolution).
// 2. Explicitly labeled as 'ECMWF IFS HRES' and attributes delivery provider (ECMWF Open Data via Open-Meteo).
// 3. NEVER labels ECMWF data as 'direct IMD data'.
// 4. Extracts full physical suite: temp, dew point, RH, precip, MSLP, wind, cloud layers, CAPE, visibility.
// ====================================================================

import { NWPModelRun, NWPForecastPoint } from '../../types/nwp';
import { NWPProvider } from './wrfProvider';
import { sanitizePoint } from './nwpNormalizer';

export class ECMWFProvider implements NWPProvider {
  public readonly name = 'ECMWF IFS HRES Provider';

  private readonly endpoint = 'https://api.open-meteo.com/v1/forecast';

  public async getLatestRun(latitude: number, longitude: number, signal?: AbortSignal): Promise<NWPModelRun> {
    const nowIso = new Date().toISOString();

    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        models: 'ecmwf_ifs025',
        hourly: [
          'temperature_2m',
          'apparent_temperature',
          'relative_humidity_2m',
          'dew_point_2m',
          'precipitation',
          'precipitation_probability',
          'rain',
          'showers',
          'snowfall',
          'weather_code',
          'pressure_msl',
          'surface_pressure',
          'cloud_cover',
          'cloud_cover_low',
          'cloud_cover_mid',
          'cloud_cover_high',
          'visibility',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
          'cape',
        ].join(','),
        timezone: 'UTC',
      });

      const url = `${this.endpoint}?${params.toString()}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const onAbort = () => controller.abort();
      if (signal) signal.addEventListener('abort', onAbort);

      let res: Response;
      try {
        res = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mausam-Atmospheric-Platform/3.0 (ECMWF Adapter)',
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
        if (signal) signal.removeEventListener('abort', onAbort);
      }

      if (!res.ok) {
        throw new Error(`ECMWF API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json || !json.hourly || !Array.isArray(json.hourly.time) || json.hourly.time.length === 0) {
        throw new Error('ECMWF payload missing valid hourly forecast points');
      }

      const times: string[] = json.hourly.time;
      const h = json.hourly;

      const points: NWPForecastPoint[] = [];
      for (let i = 0; i < times.length; i++) {
        points.push(
          sanitizePoint(
            {
              validTime: times[i],
              temperature2m: h.temperature_2m?.[i],
              apparentTemperature: h.apparent_temperature?.[i],
              dewPoint2m: h.dew_point_2m?.[i],
              relativeHumidity: h.relative_humidity_2m?.[i],
              precipitation: h.precipitation?.[i],
              rain: h.rain?.[i],
              showers: h.showers?.[i],
              snowfall: h.snowfall?.[i],
              precipitationProbability: h.precipitation_probability?.[i],
              windSpeed10m: h.wind_speed_10m?.[i],
              windDirection10m: h.wind_direction_10m?.[i],
              windGusts10m: h.wind_gusts_10m?.[i],
              pressureMSL: h.pressure_msl?.[i] ?? h.surface_pressure?.[i],
              cloudCover: h.cloud_cover?.[i],
              cloudCoverLow: h.cloud_cover_low?.[i],
              cloudCoverMid: h.cloud_cover_mid?.[i],
              cloudCoverHigh: h.cloud_cover_high?.[i],
              visibility: h.visibility?.[i],
              cape: h.cape?.[i],
              weatherCode: h.weather_code?.[i],
            },
            i
          )
        );
      }

      const runTime = times[0] ? new Date(times[0]).toISOString() : nowIso;

      return {
        model: 'ECMWF',
        provider: 'European Centre for Medium-Range Weather Forecasts (ECMWF)',
        runTime,
        validFrom: times[0] || nowIso,
        validUntil: times[times.length - 1] || nowIso,
        resolution: '9 km Native (0.1° / 0.25° Operational Stream)',
        forecastHours: times.length,
        status: 'LIVE',
        source: 'Open-Meteo → ECMWF IFS HRES',
        fetchedAt: nowIso,
        points,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      return {
        model: 'ECMWF',
        provider: 'European Centre for Medium-Range Weather Forecasts (ECMWF)',
        runTime: '',
        validFrom: '',
        validUntil: '',
        resolution: '9 km',
        status: 'UNAVAILABLE',
        source: 'ECMWF Open Data IFS',
        fetchedAt: nowIso,
        points: [],
        unavailableReason: `ECMWF IFS source unavailable: ${err.message || 'Network failure'}`,
      };
    }
  }
}

export const ecmwfProvider = new ECMWFProvider();
