// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// INCOIS Provider Adapter (Optional Direct Integration Disabled;
// Coastal Marine Telemetry Served via Public Open-Meteo Marine API)
// ====================================================================

import { NormalizedMarine, GeoLocation } from '../normalization/types';
import { WeatherNormalizer } from '../normalization/weatherNormalizer';
import {
  MAUSAM_RUNTIME_CONFIG,
  OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
} from '../../lib/providers/ai';

export class INCOISProvider {
  public static readonly providerName = 'INCOIS Coastal Oceanography';
  public readonly name = 'INCOIS Coastal Oceanography';

  public static isConfigured(): boolean {
    return MAUSAM_RUNTIME_CONFIG.directIncoisEnabled;
  }

  public static isCoastalLocation(lat: number, lon: number, locationText?: string): boolean {
    const coastalKeywords = [
      'puri', 'paradip', 'gopalpur', 'bhubaneswar', 'balasore', 'digha', 'chennai',
      'mumbai', 'kochi', 'cochin', 'visakhapatnam', 'vizag', 'goa', 'panaji', 'mangalore',
      'kandla', 'porbandar', 'kavaratti', 'port blair', 'alappuzha', 'tuticorin', 'thoothukudi',
      'machilipatnam', 'kakinada', 'bhavnagar', 'surat', 'ratnagiri', 'karwar', 'udupi',
      'ramanathapuram', 'kanyakumari', 'cuddalore', 'nagapattinam', 'puducherry', 'pondicherry'
    ];

    if (locationText) {
      const lower = locationText.toLowerCase();
      if (coastalKeywords.some((k) => lower.includes(k))) return true;
    }

    // Proximity to coastal waters of India
    const isNearArabianSea = lon >= 68 && lon <= 74.5 && lat >= 8 && lat <= 23.5;
    const isNearBayOfBengal = lon >= 79.5 && lon <= 89.5 && lat >= 8 && lat <= 22;
    const isIslands = (lon >= 92 && lon <= 94 && lat >= 6 && lat <= 14) || (lon >= 71.5 && lon <= 74 && lat >= 8 && lat <= 12.5);

    return isNearArabianSea || isNearBayOfBengal || isIslands;
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

  public static async fetchMarineData(loc: GeoLocation): Promise<NormalizedMarine> {
    const isCoastal = this.isCoastalLocation(
      loc.latitude,
      loc.longitude,
      `${loc.name} ${loc.city || ''} ${loc.district || ''}`
    );

    if (!isCoastal) {
      return {
        location: loc,
        isCoastal: false,
        observedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        dataStatus: 'UNAVAILABLE',
        source: 'Open-Meteo Marine Data',
        message: 'Marine telemetry not applicable for inland location.',
      };
    }

    try {
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${loc.latitude}&longitude=${loc.longitude}&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,sea_surface_temperature&timezone=auto`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        return {
          location: loc,
          isCoastal: true,
          observedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          dataStatus: 'UNAVAILABLE',
          source: 'Open-Meteo Marine Data',
          message: 'Marine observation temporarily unavailable.',
        };
      }

      const json = await res.json();
      const cur = json.current;
      if (!cur) {
        return {
          location: loc,
          isCoastal: true,
          observedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          dataStatus: 'UNAVAILABLE',
          source: 'Open-Meteo Marine Data',
        };
      }

      const waveHeight = cur.wave_height !== undefined ? Math.round(cur.wave_height * 10) / 10 : null;
      const swellHeight = cur.swell_wave_height !== undefined ? Math.round(cur.swell_wave_height * 10) / 10 : null;
      const wavePeriod = cur.wave_period !== undefined ? Math.round(cur.wave_period) : null;
      const swellPeriod = cur.swell_wave_period !== undefined ? Math.round(cur.swell_wave_period) : null;
      const sst = cur.sea_surface_temperature !== undefined ? Math.round(cur.sea_surface_temperature * 10) / 10 : null;

      const observedAt = cur.time
        ? (typeof cur.time === 'number' ? new Date(cur.time * 1000).toISOString() : new Date(cur.time).toISOString())
        : new Date().toISOString();
      const { status: dataStatus } = WeatherNormalizer.computeDataStatus(observedAt);

      return {
        location: loc,
        isCoastal: true,
        observedAt,
        fetchedAt: new Date().toISOString(),
        dataStatus,
        source: 'Open-Meteo Marine Data',
        significantWaveHeightMeters: waveHeight,
        swellHeightMeters: swellHeight,
        wavePeriodSeconds: wavePeriod,
        swellPeriodSeconds: swellPeriod,
        seaSurfaceTemperatureCelsius: sst,
        coastalAdvisory: waveHeight && waveHeight > 3.0 ? 'Rough Sea Conditions - Fishermen advised not to venture into deep sea' : 'Normal Sea State',
      };
    } catch (err: any) {
      return {
        location: loc,
        isCoastal: true,
        observedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        dataStatus: 'UNAVAILABLE',
        source: 'Open-Meteo Marine Data',
        message: err.message,
      };
    }
  }
}
