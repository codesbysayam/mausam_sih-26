// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// CPCB Adapter (Public Open-Meteo Air Quality Fallback on Indian NAQI Scale)
// ====================================================================

import { NormalizedAQI, GeoLocation } from '../normalization/types';
import { WeatherValidator } from '../validation/weatherValidator';
import { MAUSAM_RUNTIME_CONFIG } from '../../lib/providers/ai';

export class CPCBAdapter {
  private static fallbackEndpoint = 'https://air-quality-api.open-meteo.com/v1';

  public static isConfigured(): boolean {
    return MAUSAM_RUNTIME_CONFIG.directCpcbEnabled;
  }

  public static calculateIndianCategory(aqi: number): 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe' {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
  }

  public static getIndianHealthAdvisory(category: string): string {
    switch (category) {
      case 'Good':
        return 'Air quality is considered satisfactory, and air pollution poses little or no risk.';
      case 'Satisfactory':
        return 'Minor breathing discomfort to sensitive people.';
      case 'Moderate':
        return 'Breathing discomfort to the people with lungs, asthma and heart diseases.';
      case 'Poor':
        return 'Breathing discomfort to most people on prolonged exposure.';
      case 'Very Poor':
        return 'Respiratory illness on prolonged exposure. Avoid strenuous outdoor activity.';
      case 'Severe':
        return 'Affects healthy people and seriously impacts those with existing diseases.';
      default:
        return 'Standard environmental precautions recommended.';
    }
  }

  public static async fetchAQI(loc: GeoLocation): Promise<NormalizedAQI | null> {
    // Public Open-Meteo High-Resolution Air Quality feed mapped to Indian NAQI scale
    try {
      const url = `${this.fallbackEndpoint}/air-quality?latitude=${loc.latitude}&longitude=${loc.longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&timezone=Asia%2FKolkata`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const cur = json.current;
      if (!cur) {
        return null;
      }

      const pm25 = cur.pm2_5 ?? 0;
      const pm10 = cur.pm10 ?? 0;
      const no2 = cur.nitrogen_dioxide ?? 0;
      const so2 = cur.sulphur_dioxide ?? 0;
      const co = (cur.carbon_monoxide ?? 0) / 1000; // convert µg to mg
      const o3 = cur.ozone ?? 0;

      // CPCB National AQI sub-index formula for PM2.5 (dominant in India)
      let calculatedAqi = 0;
      if (pm25 <= 30) calculatedAqi = (pm25 / 30) * 50;
      else if (pm25 <= 60) calculatedAqi = 50 + ((pm25 - 30) / 30) * 50;
      else if (pm25 <= 90) calculatedAqi = 100 + ((pm25 - 60) / 30) * 100;
      else if (pm25 <= 120) calculatedAqi = 200 + ((pm25 - 90) / 30) * 100;
      else if (pm25 <= 250) calculatedAqi = 300 + ((pm25 - 120) / 130) * 100;
      else calculatedAqi = 400 + ((pm25 - 250) / 130) * 100;

      calculatedAqi = Math.min(500, Math.max(10, Math.round(calculatedAqi)));
      const category = this.calculateIndianCategory(calculatedAqi);

      const aqiData: NormalizedAQI = {
        location: loc,
        stationId: 'OPEN-METEO-AQ-GRID',
        stationName: `${loc.city || loc.name} Telemetry Grid`,
        observedAt: cur.time ? new Date(cur.time).toISOString() : new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        dataStatus: 'LIVE',
        source: 'Open-Meteo Air Quality (Indian NAQI Scale)',
        aqi: calculatedAqi,
        category,
        dominantPollutant: 'PM2.5',
        pollutants: {
          pm25: { code: 'pm25', label: 'PM2.5', concentration: Math.round(pm25 * 10) / 10, unit: 'µg/m³' },
          pm10: { code: 'pm10', label: 'PM10', concentration: Math.round(pm10 * 10) / 10, unit: 'µg/m³' },
          no2: { code: 'no2', label: 'NO₂', concentration: Math.round(no2 * 10) / 10, unit: 'µg/m³' },
          so2: { code: 'so2', label: 'SO₂', concentration: Math.round(so2 * 10) / 10, unit: 'µg/m³' },
          co: { code: 'co', label: 'CO', concentration: Math.round(co * 100) / 100, unit: 'mg/m³' },
          o3: { code: 'o3', label: 'Ozone', concentration: Math.round(o3 * 10) / 10, unit: 'µg/m³' },
        },
        healthAdvisory: this.getIndianHealthAdvisory(category),
        isIndianStandard: true,
      };

      const val = WeatherValidator.validateAQI(aqiData);
      if (!val.isValid) {
        return null;
      }

      return aqiData;
    } catch {
      return null;
    }
  }
}
