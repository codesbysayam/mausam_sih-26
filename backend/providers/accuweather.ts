// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// AccuWeather Commercial Adapter (Optional Secondary Source - Disabled by Default)
// ====================================================================

import { NormalizedWeather, GeoLocation } from '../normalization/types';
import {
  MAUSAM_RUNTIME_CONFIG,
  OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
} from '../../lib/providers/ai';

export class AccuWeatherProvider {
  public static isConfigured(): boolean {
    return MAUSAM_RUNTIME_CONFIG.accuweatherEnabled;
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

  public static async fetchCurrentWeather(_loc: GeoLocation): Promise<NormalizedWeather | null> {
    if (!this.isConfigured()) {
      return null;
    }
    return null;
  }
}
