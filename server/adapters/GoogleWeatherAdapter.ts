// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Google Weather Adapter (Optional Commercial Source - Disabled by Default)
// ====================================================================

import { NormalizedWeather, GeoLocation } from '../normalization/types';
import { MAUSAM_RUNTIME_CONFIG } from '../../lib/providers/ai';

export class GoogleWeatherAdapter {
  public static isConfigured(): boolean {
    return MAUSAM_RUNTIME_CONFIG.googleWeatherEnabled;
  }

  public static async fetchCurrentWeather(_loc: GeoLocation): Promise<NormalizedWeather | null> {
    if (!this.isConfigured()) {
      return null;
    }
    return null;
  }
}
