// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Data Sources & System Health Transparency Console
// Strictly Real Telemetry, Zero Fabricated Data, Isolated ProviderStore
// Missing provider/database/cache records display as Not Reported, never
// false Not Configured or In-Memory Cache assumptions.
// ====================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Server,
  Activity,
  X,
  Info,
  Wrench,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import {
  MultiSourceService,
  SystemHealthResponse,
  ProviderHealthDetail,
  ProviderStatusCode,
} from '../../services/multiSourceService';
import { PROVIDER_DESCRIPTORS, useProviderStore } from '../../store/providerStore';
import {
  formatRelativeAge,
  formatTimestampIST,
  getProviderStatusVisual,
} from '../../services/providers/providerStatus';
import { ProviderId, ProviderState } from '../../types/providers';

interface MausamDataHealthProps {
  onRefreshAll?: () => Promise<void> | void;
  gatewayHealth?: SystemHealthResponse | null;
  gatewayError?: string | null;
  gatewayLoading?: boolean;
  gatewayLatencyMs?: number | null;
  lastUpdated?: string;
  observedAt?: string;
  weatherStatus?: string;
  radarStatus?: string;
  aqiStatus?: string;
  warningStatus?: string;
  stationStatus?: string;
  imdStatus?: string;
  cpcbStatus?: string;
  nwpStatus?: string;
}

interface DisplayProviderItem {
  id: string;
  name: string;
  fullName: string;
  category: 'Government' | 'Open Data' | 'Commercial';
  detail: ProviderHealthDetail | null;
}

const ORDERED_PROVIDER_IDS: ProviderId[] = [
  'WEATHER',
  'RADAR',
  'AQI',
  'NWP',
  'SACHET',
  'IMD',
];

function getToneClasses(tone: ReturnType<typeof getProviderStatusVisual>['tone']) {
  switch (tone) {
    case 'live':
      return {
        dot: 'bg-[var(--m-ok)]',
        text: 'text-[var(--m-ok)]',
        badgeBg: 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/30',
        cardBorder: 'border-[var(--m-ok)]/30 hover:border-[var(--m-ok)]/55',
      };
    case 'recent':
    case 'loading':
      return {
        dot: 'bg-[var(--m-accent)]',
        text: 'text-[var(--m-accent)]',
        badgeBg: 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/30',
        cardBorder: 'border-[var(--m-accent)]/30 hover:border-[var(--m-accent)]/55',
      };
    case 'stale':
      return {
        dot: 'bg-[var(--m-watch)]',
        text: 'text-[var(--m-watch)]',
        badgeBg: 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/30',
        cardBorder: 'border-[var(--m-watch)]/30 hover:border-[var(--m-watch)]/55',
      };
    case 'error':
      return {
        dot: 'bg-[var(--m-danger)]',
        text: 'text-[var(--m-danger)]',
        badgeBg: 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/35',
        cardBorder: 'border-[var(--m-danger)]/35 hover:border-[var(--m-danger)]/55',
      };
    case 'unavailable':
    default:
      return {
        dot: 'bg-[var(--m-watch)]',
        text: 'text-[var(--m-watch)]',
        badgeBg: 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/30',
        cardBorder: 'border-[var(--m-border)] hover:border-[var(--m-border-strong)]',
      };
  }
}

export const MausamDataHealth: React.FC<MausamDataHealthProps> = ({
  onRefreshAll,
  gatewayHealth: externalHealth,
  gatewayError: externalError,
  gatewayLoading: externalLoading,
  lastUpdated,
  observedAt,
}) => {
  const { providers, systemStatus, refreshProvider, refreshAllProviders } = useProviderStore();

  const isControlled = externalHealth !== undefined || externalError !== undefined || externalLoading !== undefined;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingSingleId, setRefreshingSingleId] = useState<ProviderId | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [internalHealthData, setInternalHealthData] = useState<SystemHealthResponse | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState<boolean>(!isControlled);
  const [showAttribution, setShowAttribution] = useState(false);
  const [showOptionalProviders, setShowOptionalProviders] = useState(false);
  const [selectedStoreProviderId, setSelectedStoreProviderId] = useState<ProviderId | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<DisplayProviderItem | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const healthData = isControlled ? externalHealth ?? null : internalHealthData;
  const gatewayError = isControlled ? externalError ?? null : internalError;
  const gatewayLoading = isControlled ? Boolean(externalLoading) : internalLoading;

  const loadHealthData = async () => {
    if (isControlled) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setInternalLoading(true);
    try {
      const result = await MultiSourceService.fetchGatewayHealth({ signal: controller.signal });
      if (result.ok === true) {
        setInternalHealthData(result.data);
        setInternalError(null);
      } else if ('errorCode' in result && result.errorCode !== 'ABORTED') {
        // Do not present stale health data as live when gateway check fails
        setInternalHealthData(null);
        setInternalError(result.errorMessage);
      }
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    if (isControlled) return;
    loadHealthData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadHealthData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadHealthData();
      }
    }, 300000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
      abortControllerRef.current?.abort();
    };
  }, [isControlled]);

  const handleRefreshClick = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setStatusMessage('Syncing providers…');

    try {
      await Promise.allSettled([
        refreshAllProviders(undefined, true),
        isControlled
          ? onRefreshAll
            ? Promise.resolve(onRefreshAll())
            : Promise.resolve()
          : loadHealthData(),
      ]);
      setStatusMessage('Providers synced');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch {
      setStatusMessage('Sync finished with partial availability');
      setTimeout(() => setStatusMessage(null), 3500);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshSingleProvider = async (id: ProviderId, e: React.MouseEvent) => {
    e.stopPropagation();
    if (refreshingSingleId === id) return;
    setRefreshingSingleId(id);
    try {
      await refreshProvider(id, undefined, true);
    } finally {
      setRefreshingSingleId(null);
    }
  };

  const provMap = healthData?.providers;

  const gatewayProvidersList: DisplayProviderItem[] = [
    {
      id: 'openMeteo',
      name: 'Open-Meteo Gateway',
      fullName: 'Open-Meteo Weather & Air Chemistry Backend',
      category: 'Open Data',
      detail: provMap?.openMeteo || null,
    },
    {
      id: 'sachet',
      name: 'SACHET / NDMA CAP',
      fullName: 'NDMA Public Disaster Alerts Gateway',
      category: 'Government',
      detail: provMap?.sachet || null,
    },
    {
      id: 'radar',
      name: 'RainViewer Radar',
      fullName: 'RainViewer Composite Precipitation Mosaic',
      category: 'Open Data',
      detail: provMap?.radar || null,
    },
    {
      id: 'imd',
      name: 'IMD Gateway',
      fullName: 'India Meteorological Department (Optional Auth)',
      category: 'Government',
      detail: provMap?.imd || null,
    },
    {
      id: 'cpcb',
      name: 'CPCB CAAQMS',
      fullName: 'Central Pollution Control Board (Optional)',
      category: 'Government',
      detail: provMap?.cpcb || null,
    },
    {
      id: 'incois',
      name: 'INCOIS Ocean',
      fullName: 'INCOIS Marine Oceanography (Optional)',
      category: 'Government',
      detail: provMap?.incois || null,
    },
    {
      id: 'gemini',
      name: 'Google Gemini AI',
      fullName: 'Server-Side Ask MAUSAM & Neural TTS (Optional)',
      category: 'Commercial',
      detail: provMap?.gemini || null,
    },
    {
      id: 'accuweather',
      name: 'AccuWeather',
      fullName: 'AccuWeather Commercial API (Optional)',
      category: 'Commercial',
      detail: provMap?.accuweather || null,
    },
    {
      id: 'googleWeather',
      name: 'Google Weather',
      fullName: 'Google Weather Commercial API (Optional)',
      category: 'Commercial',
      detail: provMap?.googleWeather || null,
    },
  ];

  const optionalProviders = gatewayProvidersList.filter(
    (p) =>
      p.id !== 'openMeteo' &&
      p.id !== 'sachet' &&
      p.id !== 'radar' &&
      (!p.detail || !p.detail.isConfigured || p.detail.status === 'NOT_CONFIGURED' || p.detail.status === 'NOT_REPORTED')
  );

  const getStatusConfig = (status?: ProviderStatusCode | string | null) => {
    switch (status) {
      case 'OPERATIONAL':
        return { label: 'Operational', text: 'text-[var(--m-ok)]' };
      case 'DEGRADED':
        return { label: 'Degraded', text: 'text-[var(--m-watch)]' };
      case 'STALE':
        return { label: 'Stale (Cached)', text: 'text-[var(--m-watch)]' };
      case 'OFFLINE':
        return { label: 'Offline', text: 'text-[var(--m-danger)]' };
      case 'UNAVAILABLE':
        return { label: 'Unavailable', text: 'text-[var(--m-danger)]' };
      case 'NOT_CONFIGURED':
        return { label: 'Not Configured', text: 'text-[var(--m-accent)]' };
      case 'NOT_REPORTED':
      default:
        return { label: 'Not Reported', text: 'text-[var(--m-text-muted)]' };
    }
  };

  // Truthful Database & Cache status formatting (never fabricate In-Memory Cache or Not Configured when omitted)
  const dbState = healthData?.database;
  const cacheState = healthData?.cache;

  const dbLabel = gatewayLoading
    ? 'Checking…'
    : !healthData || !dbState || !dbState.reported
    ? 'Not reported by gateway'
    : dbState.connected
    ? `Connected (${dbState.provider === 'POSTGRESQL' ? 'PostgreSQL' : dbState.provider})`
    : dbState.configured
    ? 'Configured (Disconnected)'
    : 'Not Configured';

  const dbToneClass =
    dbState?.reported && dbState.connected
      ? 'text-[var(--m-ok)]'
      : dbState?.reported && dbState.configured && !dbState.connected
      ? 'text-[var(--m-danger)]'
      : 'text-[var(--m-text-muted)]';

  const dbLatencyLabel =
    dbState?.reported && typeof dbState.latencyMs === 'number'
      ? `${dbState.latencyMs} ms`
      : 'Not reported';

  const cacheEngineLabel = gatewayLoading
    ? 'Checking…'
    : !healthData || !cacheState || !cacheState.reported
    ? 'Not reported by gateway'
    : cacheState.connected
    ? `${cacheState.provider === 'VERCEL_KV' ? 'Vercel KV' : 'Upstash Redis'} Connected`
    : cacheState.configured
    ? `${cacheState.provider} (Probe Failed)`
    : 'Not Configured';

  const cacheToneClass =
    cacheState?.reported && cacheState.connected
      ? 'text-[var(--m-ok)]'
      : cacheState?.reported && cacheState.configured && !cacheState.connected
      ? 'text-[var(--m-danger)]'
      : 'text-[var(--m-text-muted)]';

  const cacheHitRatioLabel =
    cacheState?.reported && cacheState.hitRatio ? cacheState.hitRatio : 'Not reported';

  const cacheEntriesLabel =
    cacheState?.reported && typeof cacheState.totalEntries === 'number'
      ? String(cacheState.totalEntries)
      : 'Not reported';

  const lastSyncFormatted = healthData?.timestamp
    ? formatTimestampIST(healthData.timestamp)
    : lastUpdated || observedAt || (gatewayError ? 'Gateway unreachable' : 'Pending');

  const selectedStoreDescriptor = selectedStoreProviderId
    ? PROVIDER_DESCRIPTORS[selectedStoreProviderId]
    : null;
  const selectedStoreState: ProviderState | null = selectedStoreProviderId
    ? providers[selectedStoreProviderId]
    : null;

  return (
    <section
      id="mausam-data-sources-health"
      aria-label="Data Sources and System Health"
      className="w-full mausam-surface p-5 sm:p-6 flex flex-col gap-5 text-[var(--m-text-primary)]"
    >
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--m-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)] shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-[var(--m-text-primary)]">
                Independent Client Feed Store &amp; Telemetry Provenance
              </h2>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${
                  systemStatus === 'LIVE'
                    ? 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/30 text-[var(--m-ok)]'
                    : systemStatus === 'PARTIAL'
                    ? 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/30 text-[var(--m-watch)]'
                    : 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/35 text-[var(--m-danger)]'
                }`}
              >
                Client Store: {systemStatus}
              </span>
            </div>
            <p className="text-xs text-[var(--m-text-muted)] mt-0.5 tabular-nums">
              Isolated per-provider state · Gateway Check:{' '}
              <strong className="text-[var(--m-text-primary)] font-mono">{lastSyncFormatted}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          {statusMessage && (
            <span className="text-xs text-[var(--m-ok)] font-mono">
              {statusMessage}
            </span>
          )}

          <button
            id="btn-sources-refresh"
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className={`min-h-[44px] sm:min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-mono font-semibold transition-colors cursor-pointer select-none m-focus-ring ${
              isRefreshing
                ? 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-muted)] cursor-not-allowed'
                : 'bg-[var(--m-accent)] hover:opacity-95 border-[var(--m-accent)] text-[var(--m-on-accent)]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing…' : 'Refresh All Feeds'}</span>
          </button>
        </div>
      </div>

      {gatewayError && !isControlled && (
        <div className="rounded-lg border border-[var(--m-danger)]/35 bg-[var(--m-danger-soft)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-start gap-2 text-[var(--m-danger)]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-mono break-words">{gatewayError}</span>
          </div>
          <button
            type="button"
            onClick={loadHealthData}
            className="min-h-[36px] px-3 py-1 rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-text-primary)] font-mono text-[11px] shrink-0 cursor-pointer"
          >
            Retry Gateway
          </button>
        </div>
      )}

      {/* 2. Isolated ProviderStore Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ORDERED_PROVIDER_IDS.map((id) => {
          const descriptor = PROVIDER_DESCRIPTORS[id];
          const state = providers[id];
          const visual = getProviderStatusVisual(state.status);
          const tone = getToneClasses(visual.tone);
          const isSingleRefreshing = refreshingSingleId === id || state.status === 'LOADING';

          return (
            <div
              key={id}
              id={`provider-card-${id.toLowerCase()}`}
              onClick={() => setSelectedStoreProviderId(id)}
              className={`p-3.5 rounded-xl border bg-[var(--m-surface-2)] ${tone.cardBorder} flex flex-col justify-between gap-3 transition-colors cursor-pointer group`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[var(--m-text-primary)] group-hover:text-[var(--m-accent)] transition-colors truncate">
                      {descriptor.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--m-surface-1)] text-[var(--m-text-muted)] border border-[var(--m-border)]">
                      {descriptor.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--m-text-secondary)] mt-1 line-clamp-2">
                    {state.source || descriptor.defaultSource}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold shrink-0 ${tone.badgeBg} ${tone.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                  {visual.label}
                </span>
              </div>

              {state.error && (
                <div className="text-[11px] text-[var(--m-danger)] bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/30 rounded-lg px-2.5 py-1.5 truncate font-mono">
                  {state.error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2.5 border-t border-[var(--m-border)] text-[11px] font-mono tabular-nums">
                <div className="flex items-center gap-3 text-[var(--m-text-muted)]">
                  <span>
                    {typeof state.latencyMs === 'number' ? `${state.latencyMs} ms` : 'Not reported'}
                  </span>
                  <span>{formatRelativeAge(state.fetchedAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleRefreshSingleProvider(id, e)}
                    disabled={isSingleRefreshing}
                    title={`Refresh ${descriptor.name}`}
                    className="min-h-[36px] px-2.5 py-1 rounded-md bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSingleRefreshing ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                  <span className="text-[var(--m-accent)] font-semibold group-hover:underline">
                    Details →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Optional Institutional & Commercial Gateway Providers */}
      {optionalProviders.length > 0 && (
        <div className="rounded-xl border border-[var(--m-border)] bg-[var(--m-surface-2)] p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--m-text-primary)] flex-wrap">
                <span>OPTIONAL INSTITUTIONAL &amp; COMMERCIAL FEEDS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--m-surface-1)] text-[var(--m-accent)] border border-[var(--m-border)]">
                  Server-Side Credentials Only
                </span>
              </div>
              <p className="text-[11px] text-[var(--m-text-muted)] mt-0.5">
                Core meteorology runs without API keys. Optional credentials are configured strictly via server environment variables.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOptionalProviders(!showOptionalProviders)}
              className="min-h-[40px] px-2.5 text-xs font-mono font-semibold text-[var(--m-accent)] hover:underline flex items-center gap-1 shrink-0 self-start sm:self-center transition-colors cursor-pointer"
            >
              <span>
                {showOptionalProviders
                  ? 'Hide Optional Feeds'
                  : `Inspect ${optionalProviders.length} Optional Feeds`}
              </span>
              {showOptionalProviders ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showOptionalProviders && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[var(--m-border)]">
              {optionalProviders.map((p) => {
                const badge = getStatusConfig(p.detail?.status ?? 'NOT_REPORTED');
                return (
                  <button
                    key={p.id}
                    id={`optional-provider-card-${p.id}`}
                    type="button"
                    onClick={() => setSelectedProvider(p)}
                    className="text-left p-3 rounded-lg border border-[var(--m-border)] bg-[var(--m-surface-1)] flex flex-col justify-between gap-2 hover:border-[var(--m-accent)] transition-colors cursor-pointer m-focus-ring"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--m-text-primary)] truncate block">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-[var(--m-text-muted)] truncate block">
                          {p.fullName}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] border border-[var(--m-border)] shrink-0">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-[var(--m-border)] w-full">
                      <span className={badge.text}>{badge.label}</span>
                      <span className="text-[var(--m-accent)]">Inspect →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Backend Gateway & Storage Health Summary */}
      <div
        id="mausam-system-status-panel"
        className="rounded-xl border border-[var(--m-border)] bg-[var(--m-surface-2)] p-3.5 sm:p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
            <Server className="w-3.5 h-3.5 text-[var(--m-accent)]" />
            <span>Backend Gateway &amp; Storage Telemetry</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAttribution(!showAttribution)}
            className="min-h-[36px] px-2 text-[11px] font-mono font-medium text-[var(--m-accent)] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{showAttribution ? 'Hide Attributions' : 'Data Sources & Attribution'}</span>
            {showAttribution ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs font-mono tabular-nums">
          <div className="bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] block">Database</span>
            <span className={`text-xs font-semibold ${dbToneClass}`}>
              {dbLabel}
            </span>
          </div>

          <div className="bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] block">Database Latency</span>
            <span className={`text-xs font-semibold ${typeof dbState?.latencyMs === 'number' ? 'text-[var(--m-ok)]' : 'text-[var(--m-text-muted)]'}`}>
              {dbLatencyLabel}
            </span>
          </div>

          <div className="bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] block">Shared Cache</span>
            <span className={`text-xs font-semibold ${cacheToneClass}`}>
              {cacheEngineLabel}
            </span>
          </div>

          <div className="bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] block">Cache Hit Ratio</span>
            <span className="text-xs font-semibold text-[var(--m-text-secondary)]">
              {cacheHitRatioLabel}
            </span>
          </div>

          <div className="bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] block">Cache Entries</span>
            <span className="text-xs font-semibold text-[var(--m-text-secondary)]">
              {cacheEntriesLabel}
            </span>
          </div>
        </div>

        {(healthData?.buildId || healthData?.warningServiceVersion) && (
          <div className="pt-2 border-t border-[var(--m-border)] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--m-text-muted)] font-mono tabular-nums">
            <div className="flex items-center gap-3 flex-wrap">
              {healthData?.buildId && (
                <span>
                  BUILD: <strong className="text-[var(--m-text-secondary)] font-medium">{healthData.buildId}</strong>
                </span>
              )}
              {healthData?.gitCommit && (
                <span>
                  REV: <strong className="text-[var(--m-text-secondary)] font-medium">{healthData.gitCommit}</strong>
                </span>
              )}
              {healthData?.gateway?.runtime && (
                <span>
                  RUNTIME: <strong className="text-[var(--m-text-secondary)] font-medium">{healthData.gateway.runtime}</strong>
                </span>
              )}
            </div>
            {healthData?.warningServiceVersion && (
              <div>
                <span>
                  WARN SVC:{' '}
                  <strong className="text-[var(--m-accent)] font-medium">
                    {healthData.warningServiceVersion}
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Isolated ProviderStore Diagnostic Modal */}
      {selectedStoreProviderId && selectedStoreDescriptor && selectedStoreState && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedStoreProviderId(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedStoreDescriptor.name} Telemetry`}
        >
          <div
            className="bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 text-[var(--m-text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--m-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--m-text-primary)]">
                    {selectedStoreDescriptor.name} Telemetry
                  </h3>
                  <p className="text-xs text-[var(--m-text-muted)]">{selectedStoreDescriptor.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStoreProviderId(null)}
                aria-label="Close provider diagnostics"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const visual = getProviderStatusVisual(selectedStoreState.status);
              const tone = getToneClasses(visual.tone);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
                  <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Status</span>
                    <span className={`font-bold flex items-center gap-1.5 mt-1 ${tone.text}`}>
                      <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                      {visual.label} ({selectedStoreState.status})
                    </span>
                  </div>

                  <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">
                      Measured Latency
                    </span>
                    <span className="font-bold text-[var(--m-text-primary)] block mt-1">
                      {typeof selectedStoreState.latencyMs === 'number'
                        ? `${selectedStoreState.latencyMs} ms`
                        : 'Not reported'}
                    </span>
                  </div>

                  <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)] sm:col-span-2">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">
                      Active Source
                    </span>
                    <span className="font-semibold text-[var(--m-accent)] block mt-1">
                      {selectedStoreState.source || selectedStoreDescriptor.defaultSource}
                    </span>
                  </div>

                  <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">
                      Last Successful Fetch
                    </span>
                    <span className="text-[var(--m-text-primary)] block mt-1 text-[11px]">
                      {formatTimestampIST(
                        selectedStoreState.lastSuccessfulFetch || selectedStoreState.fetchedAt
                      )}
                    </span>
                  </div>

                  <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">
                      Last Attempted Fetch
                    </span>
                    <span className="text-[var(--m-text-primary)] block mt-1 text-[11px]">
                      {formatTimestampIST(
                        selectedStoreState.lastAttemptedFetch || selectedStoreState.fetchedAt
                      )}
                    </span>
                  </div>

                  {selectedStoreState.error && (
                    <div className="bg-[var(--m-danger-soft)] p-3 rounded-lg border border-[var(--m-danger)]/35 sm:col-span-2">
                      <span className="text-[10px] text-[var(--m-danger)] uppercase font-bold block mb-1">
                        Normalized Upstream Error
                      </span>
                      <p className="text-xs text-[var(--m-danger)] font-sans break-words">
                        {selectedStoreState.error}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-3 border-t border-[var(--m-border)]">
              <button
                type="button"
                onClick={(e) => handleRefreshSingleProvider(selectedStoreProviderId, e)}
                disabled={refreshingSingleId === selectedStoreProviderId}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--m-accent)] hover:opacity-95 text-xs font-mono font-semibold text-[var(--m-on-accent)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    refreshingSingleId === selectedStoreProviderId ? 'animate-spin' : ''
                  }`}
                />
                <span>Re-sync Provider</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStoreProviderId(null)}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-xs font-mono font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Optional Gateway Provider Inspection Modal (Read-Only, Server-Side Env Guidance) */}
      {selectedProvider && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedProvider(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedProvider.name} Gateway Status`}
        >
          <div
            className="bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 text-[var(--m-text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--m-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)]">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--m-text-primary)]">
                    {selectedProvider.name} Gateway Status
                  </h3>
                  <p className="text-xs text-[var(--m-text-muted)]">{selectedProvider.fullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                aria-label="Close provider status modal"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const modalStatus: ProviderStatusCode = selectedProvider.detail?.status || 'NOT_REPORTED';
              const modalWhyReason =
                selectedProvider.detail?.reason ||
                selectedProvider.detail?.error ||
                (modalStatus === 'NOT_REPORTED'
                  ? 'The telemetry gateway did not return a status record for this provider.'
                  : modalStatus === 'NOT_CONFIGURED'
                  ? 'Official credentials are not configured in the server environment.'
                  : 'Provider gateway checked.');
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg border border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Status</span>
                    <span className={`font-bold ${getStatusConfig(modalStatus).text}`}>
                      {getStatusConfig(modalStatus).label}
                    </span>
                  </div>
                  <div className="bg-[var(--m-surface-2)] p-2.5 rounded-lg border border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">
                      Upstream Latency
                    </span>
                    <span className="font-semibold text-[var(--m-text-primary)]">
                      {typeof selectedProvider.detail?.latency === 'number'
                        ? `${selectedProvider.detail.latency} ms`
                        : 'Not reported'}
                    </span>
                  </div>
                  <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)] sm:col-span-2">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block mb-1">
                      Diagnostics
                    </span>
                    <p className="text-xs text-[var(--m-text-secondary)] font-sans leading-relaxed">
                      {modalWhyReason}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="p-3.5 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[var(--m-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[var(--m-accent)]" /> Server-Side Environment Configuration
              </span>
              <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
                Provider credentials are strictly managed server-side and never entered in the browser. Configure{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-accent)] font-mono">
                  {selectedProvider.detail?.requiredKey || 'see .env.example'}
                </code>{' '}
                in your deployment environment settings and redeploy to activate live probing.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-xs font-mono font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Official Attributions Section */}
      {showAttribution && (
        <div
          id="mausam-attributions-section"
          className="rounded-xl border border-[var(--m-border)] bg-[var(--m-surface-2)] p-4 flex flex-col gap-2.5 text-xs"
        >
          <span className="text-xs font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
            Data Sources &amp; Official Attributions
          </span>
          <p className="text-[11px] text-[var(--m-text-muted)] leading-relaxed">
            MAUSAM surfaces open and institutional meteorological feeds with explicit source attribution and zero fabricated observations:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-[var(--m-text-secondary)]">
            {[
              { name: 'IMD', desc: 'India Meteorological Department (MoES surface & DWR)', url: 'https://mausam.imd.gov.in' },
              { name: 'Open-Meteo', desc: 'Numerical point meteorology & air chemistry (CC BY 4.0)', url: 'https://open-meteo.com' },
              { name: 'CPCB', desc: 'Central Pollution Control Board (NAQI benchmarks)', url: 'https://cpcb.nic.in' },
              { name: 'NDMA / SACHET', desc: 'National Disaster Management Authority (CAP Alerts)', url: 'https://sachet.ndma.gov.in' },
              { name: 'RainViewer', desc: 'Global precipitation radar tile mosaic', url: 'https://www.rainviewer.com/api.html' },
              { name: 'OpenStreetMap', desc: 'Base cartography (© OSM contributors)', url: 'https://www.openstreetmap.org' },
            ].map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]"
              >
                <span>
                  <strong className="text-[var(--m-text-primary)]">{item.name}</strong> — {item.desc}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--m-accent)] hover:underline shrink-0 ml-2"
                  aria-label={`${item.name} Website`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
