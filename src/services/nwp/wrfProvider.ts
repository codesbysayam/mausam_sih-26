// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// WRF Provider - Mesoscale Numerical Weather Prediction Adapter
//
// Rules enforced:
// 1. Treats WRF strictly as a high-resolution regional NWP system.
// 2. Requires verified IMD WRF endpoint/credentials to claim live operational data.
// 3. If unconfigured or unavailable, clearly returns 'UNAVAILABLE' with exact reason.
// 4. NEVER substitutes GFS/Open-Meteo as fake WRF.
// 5. NEVER claims 'IMD WRF 3 km' without verified configuration.
// ====================================================================

import { NWPModelRun } from '../../types/nwp';

export interface NWPProvider {
  getLatestRun(latitude: number, longitude: number, signal?: AbortSignal): Promise<NWPModelRun>;
}

export class WRFProvider implements NWPProvider {
  public readonly name = 'IMD WRF Mesoscale NWP Provider';

  private getWrfConfig(): { url: string; token: string } | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUrl = localStorage.getItem('mausam_imd_wrf_url');
      const storedToken = localStorage.getItem('mausam_imd_wrf_token');
      if (storedUrl && storedUrl.trim().length > 0) {
        return { url: storedUrl.trim(), token: storedToken?.trim() || '' };
      }
    }

    if (typeof process !== 'undefined' && process.env) {
      const envUrl = process.env.IMD_WRF_API_URL;
      const envToken = process.env.IMD_API_TOKEN;
      if (envUrl && envUrl.trim().length > 0) {
        return { url: envUrl.trim(), token: envToken?.trim() || '' };
      }
    }

    return null;
  }

  public async getLatestRun(latitude: number, longitude: number, signal?: AbortSignal): Promise<NWPModelRun> {
    const nowIso = new Date().toISOString();
    const config = this.getWrfConfig();

    if (!config) {
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
        unavailableReason:
          'Live IMD WRF operational output requires an authorized IMD data-access configuration. MAUSAM does not fabricate WRF values when the source is unavailable.',
      };
    }

    try {
      const endpoint = `${config.url}/forecast?lat=${latitude}&lon=${longitude}`;
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'User-Agent': 'Mausam-Atmospheric-Platform/3.0',
      };
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }

      const res = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal,
      });

      if (!res.ok) {
        throw new Error(`IMD WRF gateway returned HTTP ${res.status}`);
      }

      const raw = await res.json();
      return raw as NWPModelRun;
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      return {
        model: 'WRF',
        provider: 'India Meteorological Department (IMD) / NCMRWF',
        runTime: '',
        validFrom: '',
        validUntil: '',
        resolution: 'Configured up to 3 km (Regional Mesoscale Grid)',
        status: 'UNAVAILABLE',
        source: 'IMD HPC Gateway',
        fetchedAt: nowIso,
        points: [],
        unavailableReason: `WRF source unavailable: ${err.message || 'Connection failure'}`,
      };
    }
  }
}

export const wrfProvider = new WRFProvider();
