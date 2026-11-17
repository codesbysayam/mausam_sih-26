// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// IMD API Provider - Authenticated IMD API Management Platform Adapter
//
// Rules enforced:
// 1. Only activates when process.env.IMD_API_ENABLED === 'true' and IMD_API_TOKEN is provided.
// 2. NEVER creates a fake token or fabricates mock data.
// 3. Keeps credentials strictly server-side (never exposed to browser bundles).
// 4. Returns empty/null gracefully when not configured or when no cyclone is active.
// ====================================================================

import { CycloneProvider } from './CycloneProvider';

export function isImdApiConfigured(): boolean {
  if (typeof process === 'undefined' || !process.env) {
    return false;
  }
  return (
    process.env.IMD_API_ENABLED === 'true' &&
    Boolean(process.env.IMD_API_TOKEN && process.env.IMD_API_TOKEN.trim().length > 0)
  );
}

export class ImdApiProvider implements CycloneProvider {
  public readonly name = 'IMD Authenticated API';

  public isConfigured(): boolean {
    return isImdApiConfigured();
  }

  public getBaseUrl(): string {
    if (typeof process !== 'undefined' && process.env && process.env.IMD_API_BASE_URL) {
      return process.env.IMD_API_BASE_URL.replace(/\/+$/, '');
    }
    return 'https://api.imd.gov.in';
  }

  public async fetchSystems(signal?: AbortSignal): Promise<unknown> {
    if (!this.isConfigured()) {
      return null;
    }

    const token = process.env.IMD_API_TOKEN;
    const url = `${this.getBaseUrl()}/v1/cyclone/systems`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'User-Agent': 'Mausam-Atmospheric-Platform',
        },
        signal,
      });

      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(`IMD Authenticated API returned HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn(`[ImdApiProvider] fetchSystems error:`, err.message);
      return null;
    }
  }

  public async fetchLatestBulletin(signal?: AbortSignal): Promise<unknown | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const token = process.env.IMD_API_TOKEN;
    const url = `${this.getBaseUrl()}/v1/cyclone/bulletins/latest`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'User-Agent': 'Mausam-Atmospheric-Platform',
        },
        signal,
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`IMD Authenticated API returned HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn(`[ImdApiProvider] fetchLatestBulletin error:`, err.message);
      return null;
    }
  }

  public async fetchWarnings(signal?: AbortSignal): Promise<unknown> {
    if (!this.isConfigured()) {
      return null;
    }

    const token = process.env.IMD_API_TOKEN;
    const url = `${this.getBaseUrl()}/v1/warnings/cyclone`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'User-Agent': 'Mausam-Atmospheric-Platform',
        },
        signal,
      });

      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(`IMD Authenticated API returned HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn(`[ImdApiProvider] fetchWarnings error:`, err.message);
      return null;
    }
  }
}

export const imdApiProvider = new ImdApiProvider();
