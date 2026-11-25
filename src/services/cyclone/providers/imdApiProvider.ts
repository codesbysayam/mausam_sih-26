// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// IMD API Provider - Optional Authenticated IMD Adapter (Disabled by Default)
//
// Rules enforced:
// 1. Controlled exclusively by MAUSAM_RUNTIME_CONFIG.officialImdEnabled (false by default).
// 2. NEVER reads optional secret environment variables or fabricates mock data.
// 3. Returns null gracefully when disabled so public cyclone feeds remain active.
// ====================================================================

import { CycloneProvider } from './CycloneProvider';
import { MAUSAM_RUNTIME_CONFIG } from '../../../../lib/providers/ai';

export function isImdApiConfigured(): boolean {
  return MAUSAM_RUNTIME_CONFIG.officialImdEnabled;
}

export class ImdApiProvider implements CycloneProvider {
  public readonly name = 'IMD Authenticated API';

  public isConfigured(): boolean {
    return isImdApiConfigured();
  }

  public getBaseUrl(): string {
    return 'https://api.imd.gov.in';
  }

  public async fetchSystems(_signal?: AbortSignal): Promise<unknown> {
    if (!this.isConfigured()) {
      return null;
    }
    return null;
  }

  public async fetchLatestBulletin(_signal?: AbortSignal): Promise<unknown | null> {
    if (!this.isConfigured()) {
      return null;
    }
    return null;
  }

  public async fetchWarnings(_signal?: AbortSignal): Promise<unknown> {
    if (!this.isConfigured()) {
      return null;
    }
    return null;
  }
}

export const imdApiProvider = new ImdApiProvider();

