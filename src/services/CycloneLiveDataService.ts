// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// CycloneLiveDataService - Canonical Grounded Cyclone Tracker Service
//
// Rules enforced:
// 1. Single authoritative client-side data service for Cyclone Tracker.
// 2. Real-time synchronization with server gateway (/api/cyclone).
// 3. Truthful meteorological reporting: Never invent a cyclone or landfall.
// 4. Clearly distinguishes between Marine Cyclone, Inland Depression,
//    and Dissipated Historical Archives.
// 5. Normalizes all bulletins, tracks, threats, and provider diagnostics.
// ====================================================================

import {
  CyclonePayload,
  WeatherSystemEvent,
  RegionalWarningStatus,
  CycloneProviderHealth,
  WeatherSystemForecastPoint,
  WarningLevel,
  ThreatLevel,
} from '../types/cyclone';

export interface MarineWarningInfo {
  status: 'NO_STORM_WARNING' | 'WARNING_ACTIVE';
  title: string;
  bulletinText: string;
  issuedAt: string;
  seaAreas: {
    bayOfBengal: string;
    arabianSea: string;
  };
  fishermenAdvisory: string;
}

export interface SystemStatusSummary {
  hasActiveMarineCyclone: boolean;
  activeCycloneCount: number;
  monitoredDisturbancesCount: number;
  stageProtocolNumber: number;
  stageProtocolLabel: string;
  headline: string;
  subHeadline: string;
  statusBadge: 'NORMAL' | 'WATCH' | 'ALERT' | 'WARNING';
}

export interface RainfallThreatSummary {
  maxThreatLevel: ThreatLevel;
  affectedStates: string[];
  rainfallAdvisory: string;
}

export interface WindThreatSummary {
  maxSpeedKmph: string;
  squallAreas: string[];
  windAdvisory: string;
}

export type CycloneDataListener = (payload: CyclonePayload) => void;

export class CycloneLiveDataService {
  private static instance: CycloneLiveDataService;

  private cachedPayload: CyclonePayload | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds
  private inFlightPromise: Promise<CyclonePayload> | null = null;
  private abortController: AbortController | null = null;
  private listeners: Set<CycloneDataListener> = new Set();
  private autoRefreshTimer: any = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      // Re-sync on network reconnect and tab visibility change
      window.addEventListener('online', () => {
        this.fetchCycloneData(true).catch(() => {});
      });

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isCacheStale()) {
          this.fetchCycloneData(true).catch(() => {});
        }
      });

      // 60-second background refresh interval
      this.autoRefreshTimer = setInterval(() => {
        this.fetchCycloneData(false).catch(() => {});
      }, 60 * 1000);
    }
  }

  public static getInstance(): CycloneLiveDataService {
    if (!CycloneLiveDataService.instance) {
      CycloneLiveDataService.instance = new CycloneLiveDataService();
    }
    return CycloneLiveDataService.instance;
  }

  public isCacheStale(): boolean {
    if (!this.cachedPayload) return true;
    return Date.now() - this.lastFetchTime > this.CACHE_TTL_MS;
  }

  public getCachedPayload(): CyclonePayload | null {
    return this.cachedPayload;
  }

  /**
   * Primary fetch for canonical cyclone & synoptic disturbances payload
   */
  public async fetchCycloneData(forceRefresh = false): Promise<CyclonePayload> {
    const now = Date.now();

    if (!forceRefresh && this.cachedPayload && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedPayload;
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.inFlightPromise = (async () => {
      try {
        const baseUrl = typeof window !== 'undefined' ? '' : 'http://127.0.0.1:3000';
        const query = forceRefresh ? '?mode=bundle&force=1' : '?mode=bundle';
        const targetUrl = `${baseUrl}/api/cyclone${query}`;

        const res = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: this.abortController?.signal,
        });

        if (!res.ok) {
          throw new Error(`Cyclone API returned status ${res.status}`);
        }

        const data: CyclonePayload = await res.json();
        this.cachedPayload = data;
        this.lastFetchTime = Date.now();
        this.notifyListeners(data);
        return data;
      } catch (err) {
        console.warn('[CycloneLiveDataService] Fetch fallback to cached/reference state:', err);
        if (this.cachedPayload) {
          return this.cachedPayload;
        }
        const fallback = this.buildTruthfulDefaultPayload(err instanceof Error ? err.message : 'Cyclone API unreachable');
        this.cachedPayload = fallback;
        this.lastFetchTime = Date.now();
        return fallback;
      } finally {
        this.inFlightPromise = null;
      }
    })();

    return this.inFlightPromise;
  }

  // ==========================================
  // Canonical Spec Methods
  // ==========================================

  /**
   * 1. fetchActiveSystems()
   * Returns active marine cyclones / depressions currently tracked
   */
  public async fetchActiveSystems(): Promise<WeatherSystemEvent[]> {
    const payload = await this.fetchCycloneData();
    return (payload.systems || []).filter((s) => s.status === 'ACTIVE');
  }

  /**
   * 2. fetchLatestBulletin()
   * Returns latest official IMD/RSMC synoptic bulletin
   */
  public async fetchLatestBulletin(systemId?: string): Promise<{
    bulletinNumber: string;
    headline: string;
    issuedAt: string;
    text: string;
    source: string;
  }> {
    const payload = await this.fetchCycloneData();
    const system = systemId
      ? payload.systems.find((s) => s.id === systemId)
      : payload.systems[0];

    if (system) {
      return {
        bulletinNumber: system.bulletinNumber || 'National Synoptic Bulletin',
        headline: `${system.classification} - ${system.name}`,
        issuedAt: system.issuedAt,
        text: system.advisoryText || 'Active synoptic surveillance by IMD.',
        source: system.source || 'IMD / RSMC New Delhi',
      };
    }

    return {
      bulletinNumber: 'RSMC Sea Area Bulletin',
      headline: 'NO STORM WARNING FOR INDIAN COASTS',
      issuedAt: payload.lastSync,
      text: 'No active cyclonic storm or depression currently tracked over Bay of Bengal, Arabian Sea, or inland India in live bulletins.',
      source: 'IMD / RSMC New Delhi',
    };
  }

  /**
   * 3. fetchObservedTrack()
   * Returns observed/historical track points for a system
   */
  public async fetchObservedTrack(systemId?: string): Promise<WeatherSystemForecastPoint[]> {
    const payload = await this.fetchCycloneData();
    const system = systemId
      ? payload.systems.find((s) => s.id === systemId)
      : payload.systems[0];
    return system?.historicalTrack || [];
  }

  /**
   * 4. fetchForecastTrack()
   * Returns forecast track points for a system
   */
  public async fetchForecastTrack(systemId?: string): Promise<WeatherSystemForecastPoint[]> {
    const payload = await this.fetchCycloneData();
    const system = systemId
      ? payload.systems.find((s) => s.id === systemId)
      : payload.systems[0];
    return system?.forecastTrack || [];
  }

  /**
   * 5. fetchWarnings()
   * Returns all 36 state & UT warning statuses
   */
  public async fetchWarnings(): Promise<RegionalWarningStatus[]> {
    const payload = await this.fetchCycloneData();
    return payload.regionalWarnings || [];
  }

  /**
   * 6. fetchMarineWarning()
   * Returns official IMD Sea Area & Fishermen warning
   */
  public async fetchMarineWarning(): Promise<MarineWarningInfo> {
    const payload = await this.fetchCycloneData();
    const hasCyclone = (payload.systems || []).some(
      (s) => s.status === 'ACTIVE' && s.basin !== 'Inland Central India'
    );

    if (hasCyclone) {
      const active = payload.systems[0];
      return {
        status: 'WARNING_ACTIVE',
        title: `Marine Warning - ${active.classification}`,
        bulletinText: active.advisoryText || 'Rough to very rough sea conditions.',
        issuedAt: active.issuedAt,
        seaAreas: {
          bayOfBengal: active.basin === 'Bay of Bengal' ? 'Rough to very rough' : 'Moderate',
          arabianSea: active.basin === 'Arabian Sea' ? 'Rough to very rough' : 'Moderate',
        },
        fishermenAdvisory: 'Fishermen are strictly advised not to venture into deep sea areas.',
      };
    }

    return {
      status: 'NO_STORM_WARNING',
      title: 'IMD RSMC Sea Area Bulletin: NO STORM WARNING',
      bulletinText:
        'There is NO STORM WARNING for Indian coasts. Routine marine surveillance active across Bay of Bengal and Arabian Sea.',
      issuedAt: payload.lastSync,
      seaAreas: {
        bayOfBengal: 'No active cyclonic storm alert reported',
        arabianSea: 'No active cyclonic storm alert reported',
      },
      fishermenAdvisory:
        'No cyclonic storm warnings currently active for coastal waters. Follow routine local port signals.',
    };
  }

  /**
   * 7. fetchRainfallThreat()
   * Returns evaluated rainfall threat across states
   */
  public async fetchRainfallThreat(): Promise<RainfallThreatSummary> {
    const payload = await this.fetchCycloneData();
    const active = payload.systems.find((s) => s.status === 'ACTIVE');

    if (active) {
      return {
        maxThreatLevel: active.rainfallThreat,
        affectedStates: active.affectedStates,
        rainfallAdvisory: `Heavy to very heavy rainfall expected across ${active.affectedStates.join(', ')}.`,
      };
    }

    return {
      maxThreatLevel: 'NO_WARNING',
      affectedStates: [],
      rainfallAdvisory: 'No cyclone-induced rainfall threat currently active.',
    };
  }

  /**
   * 8. fetchWindThreat()
   * Returns evaluated wind threat
   */
  public async fetchWindThreat(): Promise<WindThreatSummary> {
    const payload = await this.fetchCycloneData();
    const active = payload.systems.find((s) => s.status === 'ACTIVE');

    if (active) {
      return {
        maxSpeedKmph: String(active.maxSustainedWind || 'Unavailable'),
        squallAreas: active.affectedStates,
        windAdvisory: `Squally wind speed reaching ${active.maxSustainedWind} with gusts to ${active.windGust || 'Unavailable'}.`,
      };
    }

    return {
      maxSpeedKmph: 'Routine Coastal Regime',
      squallAreas: [],
      windAdvisory: 'No cyclonic squall warning active across Indian coastal waters.',
    };
  }

  /**
   * 9. normalizeSystem()
   * Ensures raw API system object complies with canonical contract
   */
  public normalizeSystem(raw: any): WeatherSystemEvent {
    return {
      id: raw.id || 'SYS-DEFAULT',
      name: raw.name || 'Synoptic Weather Disturbance',
      classification: raw.classification || 'Low Pressure Area',
      basin: raw.basin || 'Bay of Bengal',
      source: raw.source || 'IMD / RSMC New Delhi',
      sourceUrl: raw.sourceUrl || 'https://rsmcnewdelhi.imd.gov.in',
      latitude: typeof raw.latitude === 'number' && Number.isFinite(raw.latitude)
        ? raw.latitude
        : Number.isFinite(Number(raw.latitude)) && String(raw.latitude ?? '').trim() !== ''
        ? Number(raw.latitude)
        : 0,
      longitude: typeof raw.longitude === 'number' && Number.isFinite(raw.longitude)
        ? raw.longitude
        : Number.isFinite(Number(raw.longitude)) && String(raw.longitude ?? '').trim() !== ''
        ? Number(raw.longitude)
        : 0,
      pressure: raw.pressure || 'Unavailable',
      maxSustainedWind: raw.maxSustainedWind || 'Unavailable',
      windGust: raw.windGust || 'Unavailable',
      movementDirection: raw.movementDirection || '—',
      movementSpeed: raw.movementSpeed || '—',
      currentLocation: raw.currentLocation || 'Position Unavailable',
      forecastTrack: Array.isArray(raw.forecastTrack) ? raw.forecastTrack : [],
      historicalTrack: Array.isArray(raw.historicalTrack) ? raw.historicalTrack : [],
      expectedLandfall: raw.expectedLandfall || 'No landfall forecasted',
      expectedLandfallWindow: raw.expectedLandfallWindow || 'Unavailable',
      issuedAt: raw.issuedAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      nextBulletinAt: raw.nextBulletinAt || '',
      status: raw.status || 'ACTIVE',
      affectedStates: Array.isArray(raw.affectedStates) ? raw.affectedStates : [],
      affectedDistricts: Array.isArray(raw.affectedDistricts) ? raw.affectedDistricts : [],
      rainfallThreat: raw.rainfallThreat || 'WATCH',
      windThreat: raw.windThreat || 'WATCH',
      stormSurgeThreat: raw.stormSurgeThreat || 'NO_WARNING',
      thunderstormThreat: raw.thunderstormThreat || 'WATCH',
      sourceStatus: raw.sourceStatus || 'LIVE',
      fetchedAt: raw.fetchedAt || new Date().toISOString(),
      bulletinNumber: raw.bulletinNumber,
      advisoryText: raw.advisoryText,
      damagePotential: raw.damagePotential,
      suggestedActions: raw.suggestedActions,
      conePolygon: raw.conePolygon,
    };
  }

  /**
   * 10. normalizeBulletin()
   */
  public normalizeBulletin(raw: any) {
    return {
      bulletinNumber: raw.bulletinNumber || 'National Bulletin',
      issuedAt: raw.issuedAt || new Date().toISOString(),
      title: raw.title || 'Official IMD Weather Report',
      content: raw.content || raw.text || '',
    };
  }

  /**
   * 11. normalizeTrack()
   */
  public normalizeTrack(points: any[]): WeatherSystemForecastPoint[] {
    if (!Array.isArray(points)) return [];
    return points.map((p) => ({
      time: p.time || new Date().toISOString(),
      latitude: Number(p.latitude) || 0,
      longitude: Number(p.longitude) || 0,
      expectedClassification: p.expectedClassification || 'System',
      windSpeed: p.windSpeed,
      centralPressure: p.centralPressure,
      locationName: p.locationName,
    }));
  }

  /**
   * 12. getSystemStatus()
   * Returns high-level operational status of Indian Seas & Coasts
   */
  public getSystemStatus(): SystemStatusSummary {
    const payload = this.cachedPayload;
    if (!payload) {
      return {
        hasActiveMarineCyclone: false,
        activeCycloneCount: 0,
        monitoredDisturbancesCount: 0,
        stageProtocolNumber: 0,
        stageProtocolLabel: 'STAGE 0: NO CYCLONE ALERT',
        headline: 'NO ACTIVE CYCLONIC DISTURBANCE',
        subHeadline: 'Surveillance active across Bay of Bengal and Arabian Sea.',
        statusBadge: 'NORMAL',
      };
    }

    const marineCyclone = (payload.systems || []).find(
      (s) =>
        s.status === 'ACTIVE' &&
        (s.classification.includes('Cyclone') || s.classification === 'Deep Depression') &&
        s.basin !== 'Inland Central India'
    );

    if (marineCyclone) {
      return {
        hasActiveMarineCyclone: true,
        activeCycloneCount: 1,
        monitoredDisturbancesCount: payload.systems.length,
        stageProtocolNumber: 3,
        stageProtocolLabel: 'STAGE 3: CYCLONE WARNING (ORANGE)',
        headline: `${marineCyclone.classification.toUpperCase()} IN PROGRESS`,
        subHeadline: `${marineCyclone.currentLocation}`,
        statusBadge: 'ALERT',
      };
    }

    const monitoredCount = (payload.systems || []).filter((s) => s.status === 'ACTIVE').length;

    return {
      hasActiveMarineCyclone: false,
      activeCycloneCount: 0,
      monitoredDisturbancesCount: monitoredCount,
      stageProtocolNumber: 0,
      stageProtocolLabel: 'STAGE 0: NO CYCLONE ALERT (ALL CLEAR)',
      headline: 'NO ACTIVE CYCLONIC DISTURBANCE IN INDIAN SEAS',
      subHeadline:
        'Official IMD RSMC Sea Area Bulletin: No Storm Warning. Indian coasts are clear of cyclonic threats.',
      statusBadge: 'NORMAL',
    };
  }

  /**
   * 13. getProviderHealth()
   */
  public getProviderHealth(): {
    imdCyclone: CycloneProviderHealth;
    imdWarnings: CycloneProviderHealth;
    sachet: CycloneProviderHealth;
  } {
    return (
      this.cachedPayload?.providerHealth || {
        imdCyclone: { status: 'UNAVAILABLE', latencyMs: null, lastFetch: null },
        imdWarnings: { status: 'UNAVAILABLE', latencyMs: null, lastFetch: null },
        sachet: { status: 'UNAVAILABLE', latencyMs: null, lastFetch: null },
      }
    );
  }

  // ==========================================
  // Subscription & Fallback State
  // ==========================================

  public subscribe(listener: CycloneDataListener): () => void {
    this.listeners.add(listener);
    if (this.cachedPayload) {
      listener(this.cachedPayload);
    }
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(payload: CyclonePayload): void {
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (e) {
        console.error('[CycloneLiveDataService] Listener error:', e);
      }
    }
  }

  /**
   * Builds honest unavailable state when cyclone API gateway cannot be reached
   */
  private buildTruthfulDefaultPayload(errorMsg?: string): CyclonePayload {
    const now = new Date().toISOString();

    return {
      systems: [],
      activeCount: 0,
      selectedSystemId: null,
      regionalWarnings: [],
      stateCount: 28,
      utCount: 8,
      totalRegions: 36,
      lastSync: now,
      providerHealth: {
        imdCyclone: { status: 'UNAVAILABLE', latencyMs: null, lastFetch: null, error: errorMsg || 'Gateway unreachable' },
        imdWarnings: { status: 'UNAVAILABLE', latencyMs: null, lastFetch: null, error: errorMsg || 'Gateway unreachable' },
        sachet: { status: 'UNAVAILABLE', latencyMs: null, lastFetch: null, error: errorMsg || 'Gateway unreachable' },
      },
    };
  }
}

export const cycloneLiveDataService = CycloneLiveDataService.getInstance();
