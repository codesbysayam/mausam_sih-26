// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// CPCB Provider Adapter (Keyless Public Open-Meteo Air Quality Fallback)
// Optional direct CPCB authentication is disabled by default.
// ====================================================================

import { NormalizedAQI, GeoLocation } from '../normalization/types';
import { AqiNormalizer } from '../normalization/aqiNormalizer';
import { WeatherNormalizer } from '../normalization/weatherNormalizer';
import {
  MAUSAM_RUNTIME_CONFIG,
  OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
} from '../../lib/providers/ai';

export class CPCBProvider {
  public static readonly providerName = 'Central Pollution Control Board (CPCB / NAQI)';
  public readonly name = 'Central Pollution Control Board (CPCB / NAQI)';
  private static openMeteoAqUrl = 'https://air-quality-api.open-meteo.com/v1';

  public static isConfigured(): boolean {
    return MAUSAM_RUNTIME_CONFIG.directCpcbEnabled;
  }

  public static isAuthCooldownActive(): boolean {
    return false;
  }

  public static async checkHealth(): Promise<{
    configured: boolean;
    operational: boolean;
    latencyMs: number | null;
    status: 'DISABLED';
    requiredKey: null;
    optional: true;
    message: string;
    error?: string;
  }> {
    return {
      configured: false,
      operational: false,
      latencyMs: null,
      status: 'DISABLED',
      requiredKey: null,
      optional: true,
      message: OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
    };
  }

  /**
   * Fetch air quality via public-domain Open-Meteo CAMS Air Quality API
   * mapped onto the Indian NAQI scale with truthful source attribution.
   */
  public static async fetchAQI(loc: GeoLocation): Promise<NormalizedAQI | null> {
    try {
      const url = `${this.openMeteoAqUrl}/air-quality?latitude=${loc.latitude}&longitude=${loc.longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&timezone=auto`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;

      const json = await res.json();
      const cur = json.current;
      if (!cur) return null;

      const pm25 = cur.pm2_5 !== undefined && cur.pm2_5 !== null ? Math.round(cur.pm2_5 * 10) / 10 : null;
      const pm10 = cur.pm10 !== undefined && cur.pm10 !== null ? Math.round(cur.pm10 * 10) / 10 : null;
      const no2 = cur.nitrogen_dioxide !== undefined && cur.nitrogen_dioxide !== null ? Math.round(cur.nitrogen_dioxide * 10) / 10 : null;
      const so2 = cur.sulphur_dioxide !== undefined && cur.sulphur_dioxide !== null ? Math.round(cur.sulphur_dioxide * 10) / 10 : null;
      const coMg = cur.carbon_monoxide !== undefined && cur.carbon_monoxide !== null ? Math.round((cur.carbon_monoxide / 1000) * 100) / 100 : null;
      const o3 = cur.ozone !== undefined && cur.ozone !== null ? Math.round(cur.ozone * 10) / 10 : null;

      const pollutants: NormalizedAQI['pollutants'] = {};
      if (pm25 !== null) {
        pollutants.pm25 = {
          code: 'pm25',
          label: 'PM2.5',
          concentration: pm25,
          unit: 'µg/m³',
          subIndex: AqiNormalizer.calculatePm25SubIndex(pm25),
        };
      }
      if (pm10 !== null) {
        pollutants.pm10 = {
          code: 'pm10',
          label: 'PM10',
          concentration: pm10,
          unit: 'µg/m³',
          subIndex: AqiNormalizer.calculatePm10SubIndex(pm10),
        };
      }
      if (no2 !== null) pollutants.no2 = { code: 'no2', label: 'NO₂', concentration: no2, unit: 'µg/m³' };
      if (so2 !== null) pollutants.so2 = { code: 'so2', label: 'SO₂', concentration: so2, unit: 'µg/m³' };
      if (coMg !== null) pollutants.co = { code: 'co', label: 'CO', concentration: coMg, unit: 'mg/m³' };
      if (o3 !== null) pollutants.o3 = { code: 'o3', label: 'Ozone', concentration: o3, unit: 'µg/m³' };

      const { aqi, dominant } = AqiNormalizer.calculateOverallAqi(pollutants);
      const category = AqiNormalizer.calculateIndianCategory(aqi);

      const observedAt = cur.time
        ? (typeof cur.time === 'number' ? new Date(cur.time * 1000).toISOString() : new Date(cur.time).toISOString())
        : new Date().toISOString();
      const { status: dataStatus } = WeatherNormalizer.computeDataStatus(observedAt);

      return {
        location: loc,
        stationId: 'OPEN-CAMS-GRID',
        stationName: `${loc.city || loc.name} Atmospheric Grid`,
        observedAt,
        fetchedAt: new Date().toISOString(),
        dataStatus,
        source: 'Open-Meteo CAMS Air Quality',
        aqi,
        category,
        dominantPollutant: dominant,
        pollutants,
        healthAdvisory: AqiNormalizer.getIndianHealthAdvisory(category),
        isIndianStandard: true,
      };
    } catch (err: any) {
      console.warn('[CPCB Provider] Open AQ fetch error:', err.message);
      return null;
    }
  }
}
