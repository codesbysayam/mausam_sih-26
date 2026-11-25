// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// WRF Provider - Mesoscale Numerical Weather Prediction Adapter
//
// Rules enforced:
// 1. Treats WRF strictly as an optional high-resolution regional NWP system.
// 2. Disabled by default via MAUSAM_RUNTIME_CONFIG.wrfDirectEnabled (keyless mode).
// 3. Clearly returns 'UNAVAILABLE' with honest disabled message when disabled.
// 4. NEVER substitutes GFS/Open-Meteo as fake WRF.
// 5. NEVER reads optional environment secrets or browser-stored API tokens.
// ====================================================================

import { NWPModelRun } from '../../types/nwp';
import { MAUSAM_RUNTIME_CONFIG, OPTIONAL_INTEGRATION_DISABLED_MESSAGE } from '../../../lib/providers/ai';

export interface NWPProvider {
  getLatestRun(latitude: number, longitude: number, signal?: AbortSignal): Promise<NWPModelRun>;
}

export class WRFProvider implements NWPProvider {
  public readonly name = 'IMD WRF Mesoscale NWP Provider';

  public async getLatestRun(_latitude: number, _longitude: number, _signal?: AbortSignal): Promise<NWPModelRun> {
    const nowIso = new Date().toISOString();

    if (!MAUSAM_RUNTIME_CONFIG.wrfDirectEnabled) {
      return {
        model: 'WRF',
        provider: 'India Meteorological Department (IMD) / NCMRWF',
        runTime: '',
        validFrom: '',
        validUntil: '',
        resolution: 'Configured up to 3 km (Regional Mesoscale Grid)',
        forecastHours: 72,
        status: 'UNAVAILABLE',
        source: 'IMD Numerical Weather Prediction Division (ARW Core)',
        fetchedAt: nowIso,
        points: [],
        unavailableReason: OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
      };
    }

    return {
      model: 'WRF',
      provider: 'India Meteorological Department (IMD) / NCMRWF',
      runTime: '',
      validFrom: '',
      validUntil: '',
      resolution: 'Configured up to 3 km (Regional Mesoscale Grid)',
      forecastHours: 72,
      status: 'UNAVAILABLE',
      source: 'IMD HPC Gateway',
      fetchedAt: nowIso,
      points: [],
      unavailableReason: OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
    };
  }
}

export const wrfProvider = new WRFProvider();

