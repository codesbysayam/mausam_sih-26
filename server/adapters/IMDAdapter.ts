// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// IMD Adapter (Optional Direct Connector - Disabled by Default)
// ====================================================================

import { NormalizedWeather, GeoLocation } from '../normalization/types';
import { MAUSAM_RUNTIME_CONFIG } from '../../lib/providers/ai';

export class IMDAdapter {
  public static isConfigured(): boolean {
    return MAUSAM_RUNTIME_CONFIG.officialImdEnabled;
  }

  public static async fetchCurrentWeather(_loc: GeoLocation, _stationId: string = '42971'): Promise<NormalizedWeather | null> {
    if (!this.isConfigured()) {
      return null;
    }
    return null;
  }
}
