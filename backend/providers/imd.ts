// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// IMD Provider Adapter (Optional Authenticated Direct Connector - Disabled by Default)
// Core MAUSAM weather and warnings operate via public Open-Meteo & NDMA SACHET feeds.
// ====================================================================

import { NormalizedWeather, NormalizedForecast, NormalizedWarningItem, GeoLocation } from '../normalization/types';
import {
  MAUSAM_RUNTIME_CONFIG,
  OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
} from '../../lib/providers/ai';

export class IMDProvider {
  public static readonly providerName = 'India Meteorological Department (IMD)';
  public readonly name = 'India Meteorological Department (IMD)';

  public static isConfigured(): boolean {
    return MAUSAM_RUNTIME_CONFIG.officialImdEnabled;
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

  public static async fetchCurrentWeather(_loc: GeoLocation, _stationId?: string): Promise<NormalizedWeather | null> {
    if (!this.isConfigured()) {
      return null;
    }
    return null;
  }

  public static async fetchCityForecast(_loc: GeoLocation): Promise<NormalizedForecast | null> {
    if (!this.isConfigured()) {
      return null;
    }
    return null;
  }

  public static async fetchForecast(loc: GeoLocation, _stationId?: string): Promise<NormalizedForecast | null> {
    return this.fetchCityForecast(loc);
  }

  public static async fetchDistrictWarnings(_district: string, _state?: string): Promise<NormalizedWarningItem[]> {
    if (!this.isConfigured()) {
      return [];
    }
    return [];
  }
}
