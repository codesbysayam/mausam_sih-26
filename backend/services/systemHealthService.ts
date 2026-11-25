// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Central System Health & Telemetry Engine
// Strict Zero-Fabrication, Real Provider Metrics & Latencies
// ====================================================================

import { dbService, DatabaseStatus } from '../database/db';
import { cacheService, CacheStats } from '../cache/cacheService';
import { OpenMeteoProvider } from '../providers/openMeteo';
import { IMDProvider } from '../providers/imd';
import { CPCBProvider } from '../providers/cpcb';
import { SachetProvider } from '../providers/sachet';
import { INCOISProvider } from '../providers/incois';
import { RadarProvider } from '../providers/radar';
import { AccuWeatherProvider } from '../providers/accuweather';
import { GoogleWeatherProvider } from '../providers/googleWeather';
import {
  OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
} from '../../lib/providers/ai';

export type ProviderStatusCode = 'OPERATIONAL' | 'DEGRADED' | 'STALE' | 'NOT_CONFIGURED' | 'DISABLED' | 'UNAVAILABLE';

export function getAppEnvironment(): 'DEVELOPMENT' | 'PREVIEW' | 'PRODUCTION' {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production' || process.env.MAUSAM_ENV === 'production') {
    return 'PRODUCTION';
  }
  if (process.env.VERCEL_ENV === 'preview' || process.env.MAUSAM_ENV === 'preview') {
    return 'PREVIEW';
  }
  return 'DEVELOPMENT';
}

export function getDeploymentType(): 'VERCEL' | 'CONTAINER' | 'LOCAL' {
  if (process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV)) {
    return 'VERCEL';
  }
  if (Boolean(process.env.K_SERVICE) || Boolean(process.env.CONTAINER_APP_NAME)) {
    return 'CONTAINER';
  }
  return 'LOCAL';
}

export interface ProviderHealthDetail {
  code: string;
  name: string;
  category: 'GOVERNMENT' | 'COMMERCIAL' | 'OPEN_DATA';
  status: ProviderStatusCode;
  role: string;
  fallback: string | null;
  currentDataSource: string | null;
  reason: string | null;
  message?: string | null;
  nextAction: string | null;
  isConfigured: boolean;
  optional?: boolean;
  requiredKey: string | null;
  latency: number | null; // in ms
  last_success: string | null;
  last_failure: string | null;
  last_checked: string;
  requests: number;
  successful_requests: number;
  failed_requests: number;
  cache_hits: number;
  cache_misses: number;
  error: string | null;
  source: string;
  endpoint: string;
  attribution: string;
  attributionUrl?: string;
  latestObservation?: string | null;
}

export interface SystemHealthData {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  environment: 'DEVELOPMENT' | 'PREVIEW' | 'PRODUCTION';
  deployment: 'VERCEL' | 'CONTAINER' | 'LOCAL';
  timestamp: string;
  database: DatabaseStatus;
  cache: CacheStats;
  summary: {
    totalSources: number;
    operational: number;
    degraded: number;
    notConfigured: number;
    unavailable: number;
    activeProviders: number;
    providerAvailabilityPct: number; // e.g. 100.0 or 62.5
    overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    lastSyncTime: string;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    cacheHits: number;
    cacheMisses: number;
    lastSyncTime: string;
  };
  providers: {
    openMeteo: ProviderHealthDetail;
    imd: ProviderHealthDetail;
    cpcb: ProviderHealthDetail;
    sachet: ProviderHealthDetail;
    incois: ProviderHealthDetail;
    radar: ProviderHealthDetail;
    accuweather: ProviderHealthDetail;
    googleWeather: ProviderHealthDetail;
  };
}

export interface ProviderDiagnosticItem {
  provider: string;
  name: string;
  configured: boolean;
  reachable: boolean;
  status: ProviderStatusCode;
  lastSuccess: string | null;
  latency: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  environment: 'DEVELOPMENT' | 'PREVIEW' | 'PRODUCTION';
}

export interface SystemReadinessData {
  status: 'READY' | 'DEGRADED' | 'NOT_READY';
  timestamp: string;
  environment: 'DEVELOPMENT' | 'PREVIEW' | 'PRODUCTION';
  deployment: 'VERCEL' | 'CONTAINER' | 'LOCAL';
  checks: Record<string, {
    status: string;
    required: boolean;
    ok: boolean;
    message?: string;
  }>;
  message: string;
}

export class SystemHealthService {
  private static instance: SystemHealthService;

  // Real operational telemetry counters
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;

  // Provider-specific counters
  private providerMetrics: Record<string, {
    requests: number;
    success: number;
    failed: number;
    lastSuccess: string | null;
    lastFailure: string | null;
    lastError: string | null;
    lastLatency: number | null;
  }> = {
    OPEN_METEO: { requests: 0, success: 0, failed: 0, lastSuccess: null, lastFailure: null, lastError: null, lastLatency: null },
    IMD: { requests: 0, success: 0, failed: 0, lastSuccess: null, lastFailure: null, lastError: null, lastLatency: null },
    CPCB: { requests: 0, success: 0, failed: 0, lastSuccess: null, lastFailure: null, lastError: null, lastLatency: null },
    SACHET: { requests: 0, success: 0, failed: 0, lastSuccess: null, lastFailure: null, lastError: null, lastLatency: null },
    INCOIS: { requests: 0, success: 0, failed: 0, lastSuccess: null, lastFailure: null, lastError: null, lastLatency: null },
    RADAR: { requests: 0, success: 0, failed: 0, lastSuccess: null, lastFailure: null, lastError: null, lastLatency: null },
    ACCUWEATHER: { requests: 0, success: 0, failed: 0, lastSuccess: null, lastFailure: null, lastError: null, lastLatency: null },
    GOOGLE_WEATHER: { requests: 0, success: 0, failed: 0, lastSuccess: null, lastFailure: null, lastError: null, lastLatency: null },
  };

  private lastHealthData: SystemHealthData | null = null;
  private lastCheckEpoch = 0;
  private CACHE_TTL_MS = 15 * 1000; // 15 seconds

  public static getInstance(): SystemHealthService {
    if (!SystemHealthService.instance) {
      SystemHealthService.instance = new SystemHealthService();
    }
    return SystemHealthService.instance;
  }

  public recordRequest(success: boolean, providerCode?: string, latencyMs?: number, error?: string): void {
    this.totalRequests++;
    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }

    if (providerCode && this.providerMetrics[providerCode]) {
      const pm = this.providerMetrics[providerCode];
      pm.requests++;
      if (success) {
        pm.success++;
        pm.lastSuccess = new Date().toISOString();
      } else {
        pm.failed++;
        pm.lastFailure = new Date().toISOString();
        if (error) pm.lastError = error;
      }
      if (latencyMs !== undefined) {
        pm.lastLatency = latencyMs;
      }
    }
  }

  public async getHealth(): Promise<SystemHealthData> {
    const now = Date.now();
    const cacheStats = cacheService.getCacheStats();

    if (this.lastHealthData && now - this.lastCheckEpoch < this.CACHE_TTL_MS) {
      return {
        ...this.lastHealthData,
        cache: cacheStats,
        requests: {
          total: this.totalRequests,
          successful: this.successfulRequests,
          failed: this.failedRequests,
          cacheHits: cacheStats.hits,
          cacheMisses: cacheStats.misses,
          lastSyncTime: new Date(this.lastCheckEpoch).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }) + ' IST',
        },
      };
    }

    // Run real live health probes against all upstream providers safely using Promise.allSettled
    const results = await Promise.allSettled([
      dbService.getStatus(),
      OpenMeteoProvider.checkHealth(),
      IMDProvider.checkHealth(),
      CPCBProvider.checkHealth(),
      SachetProvider.checkHealth(),
      INCOISProvider.checkHealth(),
      RadarProvider.checkHealth(),
      AccuWeatherProvider.checkHealth(),
      GoogleWeatherProvider.checkHealth(),
    ]);

    const dbStatus: DatabaseStatus = results[0].status === 'fulfilled'
      ? results[0].value
      : {
          connected: false,
          configured: false,
          provider: 'NOT_CONFIGURED',
          latencyMs: null,
          lastChecked: new Date().toISOString(),
        };
    const omHealth = results[1].status === 'fulfilled' ? results[1].value : { operational: false, latencyMs: 0, error: 'Open-Meteo probe failed' };
    const imdHealth = results[2].status === 'fulfilled' ? results[2].value : { configured: false, operational: false, latencyMs: null, error: 'IMD probe failed' };
    const cpcbHealth = results[3].status === 'fulfilled' ? results[3].value : { configured: false, operational: false, latencyMs: null, error: 'CPCB probe failed' };
    const sachetHealth = results[4].status === 'fulfilled' ? results[4].value : { operational: false, latencyMs: 0, error: 'SACHET probe failed' };
    const incoisHealth = results[5].status === 'fulfilled' ? results[5].value : { configured: false, operational: false, latencyMs: null, error: 'INCOIS probe failed' };
    const radarHealth = results[6].status === 'fulfilled' ? results[6].value : { operational: false, latencyMs: 0, error: 'Radar probe failed' };
    const accuHealth = results[7].status === 'fulfilled' ? results[7].value : { configured: false, operational: false, latencyMs: null, error: 'AccuWeather probe failed' };
    const googleHealth = results[8].status === 'fulfilled' ? results[8].value : { configured: false, operational: false, latencyMs: null, error: 'Google Weather probe failed' };

    const checkTimestamp = new Date().toISOString();

    const providers: SystemHealthData['providers'] = {
      openMeteo: {
        code: 'OPEN_METEO',
        name: 'Open-Meteo Weather API',
        category: 'OPEN_DATA',
        status: omHealth.operational ? 'OPERATIONAL' : 'UNAVAILABLE',
        role: 'Primary Weather / Free Fallback',
        fallback: null,
        currentDataSource: 'Open-Meteo',
        reason: omHealth.operational ? null : 'Open-Meteo public API temporarily unreachable',
        nextAction: null,
        isConfigured: true,
        requiredKey: null,
        latency: omHealth.latencyMs,
        last_success: omHealth.operational ? checkTimestamp : this.providerMetrics.OPEN_METEO.lastSuccess,
        last_failure: omHealth.operational ? this.providerMetrics.OPEN_METEO.lastFailure : checkTimestamp,
        last_checked: checkTimestamp,
        requests: this.providerMetrics.OPEN_METEO.requests,
        successful_requests: this.providerMetrics.OPEN_METEO.success,
        failed_requests: this.providerMetrics.OPEN_METEO.failed,
        cache_hits: 0,
        cache_misses: 0,
        error: omHealth.error || null,
        source: 'Open-Meteo Atmospheric Models (ECMWF, GFS, ICON)',
        endpoint: 'https://api.open-meteo.com/v1/forecast',
        attribution: 'Open-Meteo.com under CC BY 4.0 International',
        attributionUrl: 'https://open-meteo.com',
      },
      imd: {
        code: 'IMD',
        name: 'India Meteorological Department (IMD)',
        category: 'GOVERNMENT',
        status: !imdHealth.configured
          ? 'DISABLED'
          : imdHealth.operational
          ? 'OPERATIONAL'
          : 'UNAVAILABLE',
        role: 'Optional Official Surface Feed',
        fallback: 'Open-Meteo',
        currentDataSource: imdHealth.operational ? 'IMD (Official Portal & AWS)' : 'Open-Meteo',
        reason: !imdHealth.configured
          ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE
          : !imdHealth.operational
          ? 'Real data could not be retrieved from IMD gateway.'
          : null,
        message: !imdHealth.configured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : null,
        nextAction: null,
        isConfigured: imdHealth.configured,
        optional: true,
        requiredKey: null,
        latency: imdHealth.latencyMs,
        last_success: imdHealth.operational ? checkTimestamp : this.providerMetrics.IMD.lastSuccess,
        last_failure: imdHealth.configured && !imdHealth.operational ? checkTimestamp : this.providerMetrics.IMD.lastFailure,
        last_checked: checkTimestamp,
        requests: this.providerMetrics.IMD.requests,
        successful_requests: this.providerMetrics.IMD.success,
        failed_requests: this.providerMetrics.IMD.failed,
        cache_hits: 0,
        cache_misses: 0,
        error: imdHealth.configured && !imdHealth.operational ? (imdHealth.error || null) : null,
        source: 'India Meteorological Department (Ministry of Earth Sciences, Govt of India)',
        endpoint: 'Optional direct integration (disabled)',
        attribution: 'Official data source: India Meteorological Department (IMD), Ministry of Earth Sciences',
        attributionUrl: 'https://mausam.imd.gov.in',
      },
      cpcb: {
        code: 'CPCB',
        name: 'Central Pollution Control Board (CPCB / NAQI)',
        category: 'GOVERNMENT',
        status: cpcbHealth.configured
          ? (cpcbHealth.operational ? 'OPERATIONAL' : 'UNAVAILABLE')
          : 'DISABLED',
        role: 'Optional Direct AQI Feed',
        fallback: 'Open-Meteo CAMS Air Quality',
        currentDataSource: cpcbHealth.configured && cpcbHealth.operational ? 'CPCB CAAQMS / Indian NAQI' : 'Open-Meteo CAMS Air Quality',
        reason: !cpcbHealth.configured
          ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE
          : !cpcbHealth.operational
          ? 'Real data could not be retrieved from CPCB monitor network.'
          : null,
        message: !cpcbHealth.configured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : null,
        nextAction: null,
        isConfigured: cpcbHealth.configured,
        optional: true,
        requiredKey: null,
        latency: cpcbHealth.latencyMs,
        last_success: cpcbHealth.operational ? checkTimestamp : null,
        last_failure: cpcbHealth.configured && !cpcbHealth.operational ? checkTimestamp : null,
        last_checked: checkTimestamp,
        requests: this.providerMetrics.CPCB.requests,
        successful_requests: this.providerMetrics.CPCB.success,
        failed_requests: this.providerMetrics.CPCB.failed,
        cache_hits: 0,
        cache_misses: 0,
        error: cpcbHealth.configured && !cpcbHealth.operational ? (cpcbHealth.error || null) : null,
        source: 'Open-Meteo CAMS Air Quality (Indian NAQI Standard)',
        endpoint: 'https://air-quality-api.open-meteo.com/v1/air-quality',
        attribution: 'CPCB National Air Quality Index (NAQI) & CAMS Atmospheric Chemistry',
        attributionUrl: 'https://cpcb.nic.in',
      },
      sachet: {
        code: 'SACHET',
        name: 'NDMA / SACHET Disaster Management',
        category: 'GOVERNMENT',
        status: sachetHealth.operational ? 'OPERATIONAL' : 'DEGRADED',
        role: 'Official Disaster Alerts',
        fallback: 'Cached Alerts (unexpired)',
        currentDataSource: 'SACHET / NDMA',
        reason: sachetHealth.operational ? null : 'SACHET CAP feed temporarily unreachable; using cached warnings',
        nextAction: null,
        isConfigured: true,
        optional: false,
        requiredKey: null,
        latency: sachetHealth.latencyMs,
        last_success: sachetHealth.operational ? checkTimestamp : this.providerMetrics.SACHET.lastSuccess,
        last_failure: sachetHealth.operational ? this.providerMetrics.SACHET.lastFailure : checkTimestamp,
        last_checked: checkTimestamp,
        requests: this.providerMetrics.SACHET.requests,
        successful_requests: this.providerMetrics.SACHET.success,
        failed_requests: this.providerMetrics.SACHET.failed,
        cache_hits: 0,
        cache_misses: 0,
        error: sachetHealth.error || null,
        source: 'National Disaster Management Authority (NDMA) & SACHET CAP Protocol',
        endpoint: 'https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails',
        attribution: 'National Disaster Management Authority (NDMA), Government of India',
        attributionUrl: 'https://sachet.ndma.gov.in',
      },
      incois: {
        code: 'INCOIS',
        name: 'INCOIS Coastal Oceanography',
        category: 'GOVERNMENT',
        status: !incoisHealth.configured
          ? 'DISABLED'
          : incoisHealth.operational
          ? 'OPERATIONAL'
          : 'UNAVAILABLE',
        role: 'Optional Ocean State Feed',
        fallback: 'Open-Meteo Marine Data',
        currentDataSource: incoisHealth.configured && incoisHealth.operational ? 'INCOIS' : 'Open-Meteo Marine Data',
        reason: !incoisHealth.configured
          ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE
          : incoisHealth.operational
          ? null
          : 'INCOIS coastal oceanography feed temporarily unreachable',
        message: !incoisHealth.configured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : null,
        nextAction: null,
        isConfigured: incoisHealth.configured,
        optional: true,
        requiredKey: null,
        latency: incoisHealth.latencyMs,
        last_success: incoisHealth.operational ? checkTimestamp : this.providerMetrics.INCOIS.lastSuccess,
        last_failure: incoisHealth.configured && !incoisHealth.operational ? checkTimestamp : this.providerMetrics.INCOIS.lastFailure,
        last_checked: checkTimestamp,
        requests: this.providerMetrics.INCOIS.requests,
        successful_requests: this.providerMetrics.INCOIS.success,
        failed_requests: this.providerMetrics.INCOIS.failed,
        cache_hits: 0,
        cache_misses: 0,
        error: incoisHealth.configured && !incoisHealth.operational ? (incoisHealth.error || null) : null,
        source: 'Open-Meteo Marine Data (Open Data)',
        endpoint: 'https://marine-api.open-meteo.com/v1/marine',
        attribution: 'INCOIS, Ministry of Earth Sciences & Open Marine under CC BY 4.0',
        attributionUrl: 'https://incois.gov.in',
      },
      radar: {
        code: 'RADAR',
        name: 'Doppler Radar & Weather Maps',
        category: 'OPEN_DATA',
        status: radarHealth.operational ? 'OPERATIONAL' : 'DEGRADED',
        role: 'Doppler Radar & Weather Maps',
        fallback: 'Cached Radar Frames',
        currentDataSource: 'RainViewer & DWR Network',
        reason: radarHealth.operational ? null : 'Radar frame server temporarily unreachable; serving cached frames',
        nextAction: null,
        isConfigured: true,
        optional: false,
        requiredKey: null,
        latency: radarHealth.latencyMs,
        last_success: radarHealth.operational ? checkTimestamp : this.providerMetrics.RADAR.lastSuccess,
        last_failure: radarHealth.operational ? this.providerMetrics.RADAR.lastFailure : checkTimestamp,
        last_checked: checkTimestamp,
        requests: this.providerMetrics.RADAR.requests,
        successful_requests: this.providerMetrics.RADAR.success,
        failed_requests: this.providerMetrics.RADAR.failed,
        cache_hits: 0,
        cache_misses: 0,
        error: radarHealth.error || null,
        source: 'Radar Source: RainViewer (Open Weather Maps API)',
        endpoint: 'https://api.rainviewer.com/public/weather-maps.json',
        attribution: 'RainViewer Open Weather Maps API & IMD DWR Network Stations',
        attributionUrl: 'https://www.rainviewer.com/api.html',
      },
      accuweather: {
        code: 'ACCUWEATHER',
        name: 'AccuWeather Commercial API',
        category: 'COMMERCIAL',
        status: !accuHealth.configured
          ? 'DISABLED'
          : accuHealth.operational
          ? 'OPERATIONAL'
          : 'UNAVAILABLE',
        role: 'Optional Commercial Secondary',
        fallback: 'Open-Meteo',
        currentDataSource: accuHealth.operational ? 'AccuWeather' : 'Open-Meteo',
        reason: !accuHealth.configured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : (!accuHealth.operational ? 'AccuWeather gateway unreachable' : null),
        message: !accuHealth.configured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : null,
        nextAction: null,
        isConfigured: accuHealth.configured,
        optional: true,
        requiredKey: null,
        latency: accuHealth.latencyMs,
        last_success: accuHealth.operational ? checkTimestamp : null,
        last_failure: accuHealth.configured && !accuHealth.operational ? checkTimestamp : null,
        last_checked: checkTimestamp,
        requests: this.providerMetrics.ACCUWEATHER.requests,
        successful_requests: this.providerMetrics.ACCUWEATHER.success,
        failed_requests: this.providerMetrics.ACCUWEATHER.failed,
        cache_hits: 0,
        cache_misses: 0,
        error: accuHealth.configured && !accuHealth.operational ? (accuHealth.error || null) : null,
        source: 'AccuWeather Commercial API (Optional)',
        endpoint: 'Optional commercial integration (disabled)',
        attribution: 'AccuWeather Commercial API',
        attributionUrl: 'https://developer.accuweather.com',
      },
      googleWeather: {
        code: 'GOOGLE_WEATHER',
        name: 'Google Weather Commercial API',
        category: 'COMMERCIAL',
        status: !googleHealth.configured
          ? 'DISABLED'
          : googleHealth.operational
          ? 'OPERATIONAL'
          : 'UNAVAILABLE',
        role: 'Optional Commercial Secondary',
        fallback: 'Open-Meteo',
        currentDataSource: googleHealth.operational ? 'Google Weather' : 'Open-Meteo',
        reason: !googleHealth.configured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : (!googleHealth.operational ? 'Google Weather gateway unreachable' : null),
        message: !googleHealth.configured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : null,
        nextAction: null,
        isConfigured: googleHealth.configured,
        optional: true,
        requiredKey: null,
        latency: googleHealth.latencyMs,
        last_success: googleHealth.operational ? checkTimestamp : null,
        last_failure: googleHealth.configured && !googleHealth.operational ? checkTimestamp : null,
        last_checked: checkTimestamp,
        requests: this.providerMetrics.GOOGLE_WEATHER.requests,
        successful_requests: this.providerMetrics.GOOGLE_WEATHER.success,
        failed_requests: this.providerMetrics.GOOGLE_WEATHER.failed,
        cache_hits: 0,
        cache_misses: 0,
        error: googleHealth.configured && !googleHealth.operational ? (googleHealth.error || null) : null,
        source: 'Google Weather Commercial API (Optional)',
        endpoint: 'Optional commercial integration (disabled)',
        attribution: 'Google Maps Platform Weather API',
        attributionUrl: 'https://developers.google.com',
      },
    };

    let operational = 0;
    let degraded = 0;
    let notConfigured = 0;
    let unavailable = 0;

    for (const p of Object.values(providers)) {
      if (p.status === 'OPERATIONAL') operational++;
      else if (p.status === 'DEGRADED') degraded++;
      else if (p.status === 'NOT_CONFIGURED' || p.status === 'DISABLED') notConfigured++;
      else if (p.status === 'UNAVAILABLE') unavailable++;
    }

    const totalSources = Object.keys(providers).length;
    const configuredCount = totalSources - notConfigured;
    const activeProviders = operational + degraded;
    const providerAvailabilityPct =
      configuredCount > 0 ? Math.round((operational / configuredCount) * 1000) / 10 : 0;

    const anyConfiguredFailed = degraded > 0 || unavailable > 0;
    const overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' =
      operational === 0 ? 'CRITICAL' : anyConfiguredFailed ? 'DEGRADED' : 'HEALTHY';

    const syncTimeStr = new Date(now).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' IST';

    this.lastCheckEpoch = now;
    this.lastHealthData = {
      status: overallStatus,
      environment: getAppEnvironment(),
      deployment: getDeploymentType(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      cache: cacheStats,
      summary: {
        totalSources,
        operational,
        degraded,
        notConfigured,
        unavailable,
        activeProviders,
        providerAvailabilityPct,
        overallStatus,
        lastSyncTime: syncTimeStr,
      },
      requests: {
        total: this.totalRequests,
        successful: this.successfulRequests,
        failed: this.failedRequests,
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
        lastSyncTime: syncTimeStr,
      },
      providers,
    };

    // Asynchronously record provider health in PostgreSQL if connected
    if (dbStatus.connected) {
      for (const p of Object.values(providers)) {
        dbService.updateProviderHealth({
          provider_code: p.code,
          provider_name: p.name,
          category: p.category,
          status: p.status,
          is_configured: p.isConfigured,
          latency_ms: p.latency,
          last_success: p.last_success,
          last_failure: p.last_failure,
          requests_count: p.requests,
          successful_requests: p.successful_requests,
          failed_requests: p.failed_requests,
          cache_hits: p.cache_hits,
          cache_misses: p.cache_misses,
          last_error: p.error,
          source_url: p.endpoint,
          attribution_text: p.attribution,
          attribution_url: p.attributionUrl,
        }).catch(() => {});
      }
    }

    return this.lastHealthData;
  }

  /**
   * Diagnostic endpoint /api/system/providers:
   * Returns a sanitized array of provider statuses. Never exposes API keys.
   */
  public async getProviders(): Promise<ProviderDiagnosticItem[]> {
    const health = await this.getHealth();
    const env = health.environment;

    const list: ProviderDiagnosticItem[] = [
      {
        provider: 'OPEN_METEO',
        name: health.providers.openMeteo.name,
        configured: true,
        reachable: health.providers.openMeteo.status === 'OPERATIONAL',
        status: health.providers.openMeteo.status,
        lastSuccess: health.providers.openMeteo.last_success,
        latency: health.providers.openMeteo.latency,
        errorCode: health.providers.openMeteo.error ? 'OPEN_METEO_ERROR' : null,
        errorMessage: health.providers.openMeteo.error,
        environment: env,
      },
      {
        provider: 'IMD',
        name: health.providers.imd.name,
        configured: health.providers.imd.isConfigured,
        reachable: health.providers.imd.status === 'OPERATIONAL',
        status: health.providers.imd.status,
        lastSuccess: health.providers.imd.last_success,
        latency: health.providers.imd.latency,
        errorCode: !health.providers.imd.isConfigured ? 'DISABLED' : (health.providers.imd.error ? 'IMD_ERROR' : null),
        errorMessage: !health.providers.imd.isConfigured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : health.providers.imd.error,
        environment: env,
      },
      {
        provider: 'CPCB',
        name: health.providers.cpcb.name,
        configured: health.providers.cpcb.isConfigured,
        reachable: health.providers.cpcb.status === 'OPERATIONAL',
        status: health.providers.cpcb.status,
        lastSuccess: health.providers.cpcb.last_success,
        latency: health.providers.cpcb.latency,
        errorCode: !health.providers.cpcb.isConfigured ? 'DISABLED' : (health.providers.cpcb.error ? 'CPCB_ERROR' : null),
        errorMessage: !health.providers.cpcb.isConfigured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : health.providers.cpcb.error,
        environment: env,
      },
      {
        provider: 'SACHET',
        name: health.providers.sachet.name,
        configured: true,
        reachable: health.providers.sachet.status === 'OPERATIONAL',
        status: health.providers.sachet.status,
        lastSuccess: health.providers.sachet.last_success,
        latency: health.providers.sachet.latency,
        errorCode: health.providers.sachet.error ? 'SACHET_ERROR' : null,
        errorMessage: health.providers.sachet.error,
        environment: env,
      },
      {
        provider: 'INCOIS',
        name: health.providers.incois.name,
        configured: health.providers.incois.isConfigured,
        reachable: health.providers.incois.status === 'OPERATIONAL',
        status: health.providers.incois.status,
        lastSuccess: health.providers.incois.last_success,
        latency: health.providers.incois.latency,
        errorCode: !health.providers.incois.isConfigured ? 'DISABLED' : (health.providers.incois.error ? 'INCOIS_ERROR' : null),
        errorMessage: !health.providers.incois.isConfigured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : health.providers.incois.error,
        environment: env,
      },
      {
        provider: 'RADAR',
        name: health.providers.radar.name,
        configured: true,
        reachable: health.providers.radar.status === 'OPERATIONAL',
        status: health.providers.radar.status,
        lastSuccess: health.providers.radar.last_success,
        latency: health.providers.radar.latency,
        errorCode: health.providers.radar.error ? 'RADAR_ERROR' : null,
        errorMessage: health.providers.radar.error,
        environment: env,
      },
      {
        provider: 'MAUSAM_ASSISTANT',
        name: 'MAUSAM Assistant',
        configured: true,
        reachable: true,
        status: 'OPERATIONAL' as ProviderStatusCode,
        lastSuccess: health.timestamp,
        latency: null,
        errorCode: null,
        errorMessage: 'Grounded local assistant active. No API key required.',
        environment: env,
      },
      {
        provider: 'ACCUWEATHER',
        name: health.providers.accuweather.name,
        configured: health.providers.accuweather.isConfigured,
        reachable: health.providers.accuweather.status === 'OPERATIONAL',
        status: health.providers.accuweather.status,
        lastSuccess: health.providers.accuweather.last_success,
        latency: health.providers.accuweather.latency,
        errorCode: !health.providers.accuweather.isConfigured ? 'DISABLED' : null,
        errorMessage: !health.providers.accuweather.isConfigured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : health.providers.accuweather.error,
        environment: env,
      },
      {
        provider: 'GOOGLE_WEATHER',
        name: health.providers.googleWeather.name,
        configured: health.providers.googleWeather.isConfigured,
        reachable: health.providers.googleWeather.status === 'OPERATIONAL',
        status: health.providers.googleWeather.status,
        lastSuccess: health.providers.googleWeather.last_success,
        latency: health.providers.googleWeather.latency,
        errorCode: !health.providers.googleWeather.isConfigured ? 'DISABLED' : null,
        errorMessage: !health.providers.googleWeather.isConfigured ? OPTIONAL_INTEGRATION_DISABLED_MESSAGE : health.providers.googleWeather.error,
        environment: env,
      },
    ];

    return list;
  }

  /**
   * Production Readiness check /api/system/readiness:
   * Returns READY, DEGRADED, or NOT_READY.
   * Rule: A single optional provider failure must NOT make the entire MAUSAM application NOT_READY.
   */
  public async getReadiness(): Promise<SystemReadinessData> {
    const health = await this.getHealth();
    const env = health.environment;
    const dep = health.deployment;

    const omOk = health.providers.openMeteo.status === 'OPERATIONAL';
    const dbStatus = health.database.connected ? 'CONNECTED' : (health.database.configured ? 'FAILED' : 'NOT_CONFIGURED');
    const cacheStatus = health.cache.connected ? 'ACTIVE' : 'IN_MEMORY';

    const checks: Record<string, { status: string; required: boolean; ok: boolean; message?: string }> = {
      openMeteo: {
        status: health.providers.openMeteo.status,
        required: true,
        ok: omOk,
        message: omOk ? 'Primary weather service operational' : 'Open-Meteo connection failing',
      },
      database: {
        status: dbStatus,
        required: false,
        ok: true, // Optional
        message: health.database.connected ? 'PostgreSQL connected' : 'Database optional; in-memory cache active',
      },
      cache: {
        status: cacheStatus,
        required: false,
        ok: true,
        message: health.cache.connected ? 'Distributed Redis active' : 'Fallback memory cache operational',
      },
      imd: {
        status: health.providers.imd.status,
        required: false,
        ok: true,
        message: health.providers.imd.status === 'OPERATIONAL' ? 'Official IMD gateway online' : 'IMD optional; Open-Meteo fallback active',
      },
      cpcb: {
        status: health.providers.cpcb.status,
        required: false,
        ok: true,
        message: health.providers.cpcb.status === 'OPERATIONAL' ? 'CPCB NAQI online' : 'Using CAMS NAQI fallback',
      },
      sachet: {
        status: health.providers.sachet.status,
        required: false,
        ok: true,
        message: health.providers.sachet.status === 'OPERATIONAL' ? 'SACHET CAP active' : 'Cached alerts active',
      },
      incois: {
        status: health.providers.incois.status,
        required: false,
        ok: true,
        message: health.providers.incois.status === 'OPERATIONAL' ? 'INCOIS marine active' : 'Coastal marine fallback active',
      },
      radar: {
        status: health.providers.radar.status,
        required: false,
        ok: true,
        message: health.providers.radar.status === 'OPERATIONAL' ? 'Doppler radar feed active' : 'Radar cache active',
      },
      ai: {
        status: 'OPERATIONAL',
        required: false,
        ok: true,
        message: 'Grounded local assistant active. No API key required.',
      },
    };

    let readinessStatus: 'READY' | 'DEGRADED' | 'NOT_READY';
    let message: string;

    if (!omOk) {
      readinessStatus = 'NOT_READY';
      message = 'Critical failure: Primary weather data provider (Open-Meteo) is unreachable.';
    } else if (health.summary.operational >= 3) {
      readinessStatus = 'READY';
      message = 'All core weather, warning, and radar pipelines are ready.';
    } else {
      readinessStatus = 'DEGRADED';
      message = 'Core weather pipeline is operational. Some secondary feeds are running in fallback mode.';
    }

    return {
      status: readinessStatus,
      timestamp: new Date().toISOString(),
      environment: env,
      deployment: dep,
      checks,
      message,
    };
  }

  /**
   * Diagnostic Self-Test /api/system/self-test:
   * Actively runs end-to-end integration tests on critical sub-systems
   * and reports truthful latency and pass/fail state.
   */
  public async getSelfTest() {
    const startAll = performance.now();
    const tests: Array<{
      name: string;
      category: string;
      status: 'PASSED' | 'FAILED' | 'SKIPPED';
      latencyMs: number | null;
      message: string;
      details?: any;
    }> = [];

    // 1. Primary Weather (Open-Meteo) Test
    const omStart = performance.now();
    try {
      const omRes = await OpenMeteoProvider.checkHealth();
      tests.push({
        name: 'Primary Atmospheric Feed (Open-Meteo)',
        category: 'WEATHER_CORE',
        status: omRes.operational ? 'PASSED' : 'FAILED',
        latencyMs: Math.round(performance.now() - omStart),
        message: omRes.operational ? 'Successfully retrieved atmospheric telemetry' : (omRes.error || 'Connection failed'),
      });
    } catch (e: any) {
      tests.push({
        name: 'Primary Atmospheric Feed (Open-Meteo)',
        category: 'WEATHER_CORE',
        status: 'FAILED',
        latencyMs: Math.round(performance.now() - omStart),
        message: e.message,
      });
    }

    // 2. NDMA / SACHET Disaster Warnings Feed Test
    const sachetStart = performance.now();
    try {
      const sachetRes = await SachetProvider.checkHealth();
      tests.push({
        name: 'NDMA / SACHET Disaster Warning Gateway',
        category: 'GOVERNMENT_DISASTER',
        status: sachetRes.operational ? 'PASSED' : 'FAILED',
        latencyMs: Math.round(performance.now() - sachetStart),
        message: sachetRes.operational ? 'CAP 1.2 disaster alert feed reachable' : (sachetRes.error || 'SACHET connection failed'),
      });
    } catch (e: any) {
      tests.push({
        name: 'NDMA / SACHET Disaster Warning Gateway',
        category: 'GOVERNMENT_DISASTER',
        status: 'FAILED',
        latencyMs: Math.round(performance.now() - sachetStart),
        message: e.message,
      });
    }

    // 3. Doppler Radar Feed (RainViewer) Test
    const radarStart = performance.now();
    try {
      const radarRes = await RadarProvider.checkHealth();
      tests.push({
        name: 'Doppler Radar Map Telemetry (RainViewer)',
        category: 'RADAR_SYSTEM',
        status: radarRes.operational ? 'PASSED' : 'FAILED',
        latencyMs: Math.round(performance.now() - radarStart),
        message: radarRes.operational ? 'Radar frame metadata active' : (radarRes.error || 'Radar feed unreachable'),
      });
    } catch (e: any) {
      tests.push({
        name: 'Doppler Radar Map Telemetry (RainViewer)',
        category: 'RADAR_SYSTEM',
        status: 'FAILED',
        latencyMs: Math.round(performance.now() - radarStart),
        message: e.message,
      });
    }

    // 4. Official IMD Gateway Test
    if (IMDProvider.isConfigured()) {
      const imdStart = performance.now();
      try {
        const imdRes = await IMDProvider.checkHealth();
        tests.push({
          name: 'Official IMD Direct API Access',
          category: 'GOVERNMENT_MET',
          status: imdRes.operational ? 'PASSED' : 'FAILED',
          latencyMs: Math.round(performance.now() - imdStart),
          message: imdRes.operational ? 'IMD gateway responding' : (imdRes.error || 'IMD unreachable'),
        });
      } catch (e: any) {
        tests.push({
          name: 'Official IMD Direct API Access',
          category: 'GOVERNMENT_MET',
          status: 'FAILED',
          latencyMs: Math.round(performance.now() - imdStart),
          message: e.message,
        });
      }
    } else {
      tests.push({
        name: 'Official IMD Direct API Access',
        category: 'GOVERNMENT_MET',
        status: 'SKIPPED',
        latencyMs: null,
        message: OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
      });
    }

    // 5. CPCB NAQI Air Chemistry Test
    if (CPCBProvider.isConfigured()) {
      const cpcbStart = performance.now();
      try {
        const cpcbRes = await CPCBProvider.checkHealth();
        tests.push({
          name: 'CPCB CAAQMS Direct Monitoring',
          category: 'ENVIRONMENT',
          status: cpcbRes.operational ? 'PASSED' : 'FAILED',
          latencyMs: Math.round(performance.now() - cpcbStart),
          message: cpcbRes.operational ? 'CPCB telemetry active' : (cpcbRes.error || 'CPCB unreachable'),
        });
      } catch (e: any) {
        tests.push({
          name: 'CPCB CAAQMS Direct Monitoring',
          category: 'ENVIRONMENT',
          status: 'FAILED',
          latencyMs: Math.round(performance.now() - cpcbStart),
          message: e.message,
        });
      }
    } else {
      tests.push({
        name: 'CPCB CAAQMS Direct Monitoring',
        category: 'ENVIRONMENT',
        status: 'SKIPPED',
        latencyMs: null,
        message: OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
      });
    }

    // 6. Cache Layer Health
    const cacheStart = performance.now();
    try {
      const testKey = '__self_test_probe__';
      await cacheService.set(testKey, { test: true }, 'SYSTEM_HEALTH', 'self-test', 10000);
      const retrieved = await cacheService.get(testKey);
      tests.push({
        name: 'Multi-Tier Cache Storage',
        category: 'CACHE_INFRASTRUCTURE',
        status: retrieved && retrieved.isHit ? 'PASSED' : 'FAILED',
        latencyMs: Math.round(performance.now() - cacheStart),
        message: retrieved && retrieved.isHit ? 'Cache read/write cycle verified' : 'Cache returned null',
      });
    } catch (e: any) {
      tests.push({
        name: 'Multi-Tier Cache Storage',
        category: 'CACHE_INFRASTRUCTURE',
        status: 'FAILED',
        latencyMs: Math.round(performance.now() - cacheStart),
        message: e.message,
      });
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    for (const t of tests) {
      if (t.status === 'PASSED') passed++;
      else if (t.status === 'FAILED') failed++;
      else skipped++;
    }

    const overallStatus: 'PASSED' | 'DEGRADED' | 'FAILED' =
      failed === 0 ? 'PASSED' : passed >= 2 ? 'DEGRADED' : 'FAILED';

    return {
      timestamp: new Date().toISOString(),
      durationMs: Math.round(performance.now() - startAll),
      status: overallStatus,
      summary: {
        totalTests: tests.length,
        passed,
        failed,
        skipped,
      },
      tests,
    };
  }
}

export const systemHealthService = SystemHealthService.getInstance();
