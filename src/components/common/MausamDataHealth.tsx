// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Data Sources & System Health Transparency Console
// Strictly Real Telemetry, Zero Fabricated Data, Isolated ProviderStore
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
  CheckCircle2,
  AlertTriangle,
  Info,
  Key,
  Save,
  Wrench,
  Radio,
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
        dot: 'bg-[#22C7A0]',
        text: 'text-[#6EE7B7]',
        badgeBg: 'bg-[#22C7A0]/12 border-[#22C7A0]/35',
        cardBorder: 'border-[#22C7A0]/30 hover:border-[#22C7A0]/50',
      };
    case 'recent':
      return {
        dot: 'bg-[#35C7E8]',
        text: 'text-[#7DD3FC]',
        badgeBg: 'bg-[#35C7E8]/12 border-[#35C7E8]/35',
        cardBorder: 'border-[#35C7E8]/30 hover:border-[#35C7E8]/50',
      };
    case 'stale':
      return {
        dot: 'bg-[#F59E0B]',
        text: 'text-[#FCD34D]',
        badgeBg: 'bg-[#F59E0B]/12 border-[#F59E0B]/35',
        cardBorder: 'border-[#F59E0B]/30 hover:border-[#F59E0B]/50',
      };
    case 'loading':
      return {
        dot: 'bg-[#35C7E8]',
        text: 'text-[#7DD3FC]',
        badgeBg: 'bg-[#35C7E8]/12 border-[#35C7E8]/35',
        cardBorder: 'border-[#35C7E8]/30 hover:border-[#35C7E8]/50',
      };
    case 'error':
      return {
        dot: 'bg-[#EF4444]',
        text: 'text-[#FCA5A5]',
        badgeBg: 'bg-[#EF4444]/12 border-[#EF4444]/35',
        cardBorder: 'border-[#EF4444]/35 hover:border-[#EF4444]/55',
      };
    case 'unavailable':
    default:
      return {
        dot: 'bg-[#F59E0B]',
        text: 'text-[#FCD34D]',
        badgeBg: 'bg-[#F59E0B]/10 border-[#F59E0B]/30',
        cardBorder: 'border-[#26394B] hover:border-[#38536A]',
      };
  }
}

export const MausamDataHealth: React.FC<MausamDataHealthProps> = ({
  onRefreshAll,
  lastUpdated,
  observedAt,
}) => {
  const { providers, systemStatus, refreshProvider, refreshAllProviders } = useProviderStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingSingleId, setRefreshingSingleId] = useState<ProviderId | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<SystemHealthResponse | null>(null);
  const [showAttribution, setShowAttribution] = useState(false);
  const [showOptionalProviders, setShowOptionalProviders] = useState(false);
  const [selectedStoreProviderId, setSelectedStoreProviderId] = useState<ProviderId | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<DisplayProviderItem | null>(null);
  const [configKeyInput, setConfigKeyInput] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveResult, setConfigSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadHealthData = async () => {
    const data = await MultiSourceService.fetchSystemHealth();
    if (data) {
      setHealthData(data);
    }
  };

  const handleSaveProviderConfig = async (providerId: string, customKey?: string) => {
    setIsSavingConfig(true);
    setConfigSaveResult(null);
    try {
      const keyToSave = customKey !== undefined ? customKey : configKeyInput.trim();
      const res = await fetch('/api/system?mode=config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          apiKey: keyToSave,
          enabled: true,
        }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.status === 'success') {
        setConfigSaveResult({
          success: true,
          message: `${selectedProvider?.name || providerId} configuration updated.`,
        });
        setConfigKeyInput('');
        await loadHealthData();
        if (providerId === 'imd') {
          await refreshProvider('IMD', undefined, true);
        } else if (providerId === 'sachet') {
          await refreshProvider('SACHET', undefined, true);
        } else if (providerId === 'cpcb') {
          await refreshProvider('AQI', undefined, true);
        }
      } else {
        setConfigSaveResult({
          success: false,
          message: resJson.error || 'Failed to save configuration',
        });
      }
    } catch (err: any) {
      setConfigSaveResult({
        success: false,
        message: err.message || 'Network error updating configuration',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  useEffect(() => {
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
    };
  }, []);

  const handleRefreshClick = async () => {
    if (isRefreshing) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsRefreshing(true);
    setStatusMessage('Syncing providers…');

    try {
      await Promise.allSettled([
        refreshAllProviders(undefined, true),
        loadHealthData(),
        onRefreshAll ? Promise.resolve(onRefreshAll()) : Promise.resolve(),
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
      (!p.detail || !p.detail.isConfigured || p.detail.status === 'NOT_CONFIGURED')
  );

  const getStatusConfig = (status?: ProviderStatusCode | string) => {
    switch (status) {
      case 'OPERATIONAL':
        return {
          label: 'Operational',
          text: 'text-[#6EE7B7]',
        };
      case 'DEGRADED':
        return {
          label: 'Degraded',
          text: 'text-[#FCD34D]',
        };
      case 'STALE':
        return {
          label: 'Stale (Cached)',
          text: 'text-[#FCD34D]',
        };
      case 'NO_COVERAGE':
        return {
          label: 'No Coverage',
          text: 'text-[#B5C3D1]',
        };
      case 'OFFLINE':
      case 'UNAVAILABLE':
        return {
          label: 'Unavailable',
          text: 'text-[#FCA5A5]',
        };
      case 'NOT_CONFIGURED':
      default:
        return {
          label: 'Not Configured',
          text: 'text-[#7DD3FC]',
        };
    }
  };

  const dbConnected = healthData?.database?.connected;
  const dbMode = (healthData?.database as any)?.mode === 'POSTGRESQL' ? 'PostgreSQL' : 'Embedded DB';
  const dbLatency = healthData?.database?.latencyMs;
  const cacheStats = healthData?.cache;

  const lastSyncFormatted =
    healthData?.requests?.lastSyncTime ||
    healthData?.summary?.lastSyncTime ||
    lastUpdated ||
    observedAt ||
    'Pending';

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
      className="w-full m-panel p-4 sm:p-6 flex flex-col gap-5 text-[#F3F6FA]"
    >
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#26394B]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8] shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#F3F6FA]">
                Independent Provider Registry &amp; Feed Provenance
              </h2>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${
                  systemStatus === 'LIVE'
                    ? 'bg-[#22C7A0]/12 border-[#22C7A0]/35 text-[#6EE7B7]'
                    : systemStatus === 'PARTIAL'
                    ? 'bg-[#F59E0B]/12 border-[#F59E0B]/35 text-[#FCD34D]'
                    : 'bg-[#EF4444]/12 border-[#EF4444]/35 text-[#FCA5A5]'
                }`}
              >
                System: {systemStatus}
              </span>
            </div>
            <p className="text-xs text-[#8295A8] mt-0.5 tabular-nums">
              Isolated per-provider state · Server Sync:{' '}
              <strong className="text-[#F3F6FA] font-mono">{lastSyncFormatted}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          {statusMessage && (
            <span className="text-xs text-[#6EE7B7] font-mono">
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
                ? 'bg-[#08131F] border-[#26394B] text-[#8295A8] cursor-not-allowed'
                : 'bg-[#0B72B9] hover:bg-[#35C7E8] border-[#35C7E8]/40 text-white hover:text-[#07111D]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing…' : 'Refresh All Providers'}</span>
          </button>
        </div>
      </div>

      {/* 2. Isolated ProviderStore Cards (SACHET, IMD, RADAR, AQI, WEATHER, NWP) */}
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
              className={`p-3.5 rounded-xl border bg-[#08131F] ${tone.cardBorder} flex flex-col justify-between gap-3 transition-colors cursor-pointer group`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#F3F6FA] group-hover:text-[#35C7E8] transition-colors truncate">
                      {descriptor.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B1927] text-[#8295A8] border border-[#26394B]">
                      {descriptor.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B5C3D1] mt-1 line-clamp-2">
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
                <div className="text-[11px] text-[#FCA5A5] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg px-2.5 py-1.5 truncate font-mono">
                  {state.error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2.5 border-t border-[#26394B] text-[11px] font-mono tabular-nums">
                <div className="flex items-center gap-3 text-[#8295A8]">
                  <span>
                    {typeof state.latencyMs === 'number' ? `${state.latencyMs} ms` : '— ms'}
                  </span>
                  <span>{formatRelativeAge(state.fetchedAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleRefreshSingleProvider(id, e)}
                    disabled={isSingleRefreshing}
                    title={`Refresh ${descriptor.name}`}
                    className="min-h-[36px] px-2.5 py-1 rounded-md bg-[#0B1927] hover:bg-[#101F2E] border border-[#26394B] hover:border-[#38536A] text-[#B5C3D1] hover:text-[#F3F6FA] text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSingleRefreshing ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                  <span className="text-[#35C7E8] font-semibold group-hover:underline">
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
        <div className="m-panel-inset p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F3F6FA] flex-wrap">
                <span>OPTIONAL INSTITUTIONAL &amp; COMMERCIAL FEEDS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B1927] text-[#35C7E8] border border-[#26394B]">
                  Zero Keys Required for Core
                </span>
              </div>
              <p className="text-[11px] text-[#8295A8] mt-0.5">
                Core meteorology runs without API keys. Configure optional credentials below when an official endpoint key is provisioned.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOptionalProviders(!showOptionalProviders)}
              className="min-h-[40px] px-2.5 text-xs font-mono font-semibold text-[#35C7E8] hover:text-[#7DD3FC] flex items-center gap-1 shrink-0 self-start sm:self-center transition-colors cursor-pointer"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[#26394B]">
              {optionalProviders.map((p) => {
                const badge = getStatusConfig(p.detail?.status);
                return (
                  <button
                    key={p.id}
                    id={`optional-provider-card-${p.id}`}
                    type="button"
                    onClick={() => setSelectedProvider(p)}
                    className="text-left p-3 rounded-lg border border-[#26394B] bg-[#0B1927] flex flex-col justify-between gap-2 hover:border-[#35C7E8]/45 transition-colors cursor-pointer m-focus-ring"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#F3F6FA] truncate block">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-[#8295A8] truncate block">
                          {p.fullName}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#08131F] text-[#B5C3D1] border border-[#26394B] shrink-0">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-[#26394B] w-full">
                      <span className={badge.text}>{badge.label}</span>
                      <span className="text-[#35C7E8]">Configure / Inspect →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Backend Gateway & Cache Health Summary */}
      <div
        id="mausam-system-status-panel"
        className="m-panel-inset p-3.5 sm:p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#F3F6FA] uppercase tracking-wide">
            <Server className="w-3.5 h-3.5 text-[#35C7E8]" />
            <span>Backend Gateway &amp; Storage</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAttribution(!showAttribution)}
            className="min-h-[36px] px-2 text-[11px] font-mono font-medium text-[#35C7E8] hover:text-[#7DD3FC] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{showAttribution ? 'Hide Attributions' : 'Data Sources & Attribution'}</span>
            {showAttribution ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs font-mono tabular-nums">
          <div className="bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B]">
            <span className="text-[10px] text-[#8295A8] block">Database</span>
            <span className={`text-xs font-semibold ${dbConnected ? 'text-[#6EE7B7]' : 'text-[#8295A8]'}`}>
              {healthData ? (dbConnected ? `Connected (${dbMode})` : 'Not Configured') : '—'}
            </span>
          </div>

          <div className="bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B]">
            <span className="text-[10px] text-[#8295A8] block">Database Latency</span>
            <span className={`text-xs font-semibold ${typeof dbLatency === 'number' ? 'text-[#6EE7B7]' : 'text-[#8295A8]'}`}>
              {typeof dbLatency === 'number' ? `${dbLatency} ms` : 'Unavailable'}
            </span>
          </div>

          <div className="bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B]">
            <span className="text-[10px] text-[#8295A8] block">Cache Engine</span>
            <span className={`text-xs font-semibold ${cacheStats?.connected ? 'text-[#6EE7B7]' : 'text-[#FCD34D]'}`}>
              {healthData ? (cacheStats?.connected ? 'Redis Connected' : 'In-Memory Cache') : '—'}
            </span>
          </div>

          <div className="bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B]">
            <span className="text-[10px] text-[#8295A8] block">Cache Hit Ratio</span>
            <span className="text-xs font-semibold text-[#F3F6FA]">
              {cacheStats?.hitRatio || '—'}
            </span>
          </div>

          <div className="bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B]">
            <span className="text-[10px] text-[#8295A8] block">Cache Entries</span>
            <span className="text-xs font-semibold text-[#F3F6FA]">
              {typeof cacheStats?.totalEntries === 'number' ? cacheStats.totalEntries : '—'}
            </span>
          </div>
        </div>

        {(healthData?.buildId || healthData?.warningServiceVersion) && (
          <div className="pt-2 border-t border-[#26394B] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8295A8] font-mono tabular-nums">
            <div className="flex items-center gap-3">
              {healthData?.buildId && (
                <span>
                  BUILD: <strong className="text-[#B5C3D1] font-medium">{healthData.buildId}</strong>
                </span>
              )}
              {healthData?.gitCommit && (
                <span>
                  REV: <strong className="text-[#B5C3D1] font-medium">{healthData.gitCommit}</strong>
                </span>
              )}
            </div>
            {healthData?.warningServiceVersion && (
              <div>
                <span>
                  WARN SVC:{' '}
                  <strong className="text-[#35C7E8] font-medium">
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
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedStoreProviderId(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedStoreDescriptor.name} Telemetry`}
        >
          <div
            className="bg-[#0B1927] border border-[#38536A] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 text-[#F3F6FA]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#26394B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F3F6FA]">
                    {selectedStoreDescriptor.name} Telemetry
                  </h3>
                  <p className="text-xs text-[#8295A8]">{selectedStoreDescriptor.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStoreProviderId(null)}
                aria-label="Close provider diagnostics"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const visual = getProviderStatusVisual(selectedStoreState.status);
              const tone = getToneClasses(visual.tone);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
                  <div className="bg-[#08131F] p-3 rounded-lg border border-[#26394B]">
                    <span className="text-[10px] text-[#8295A8] uppercase block">Status</span>
                    <span className={`font-bold flex items-center gap-1.5 mt-1 ${tone.text}`}>
                      <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                      {visual.label} ({selectedStoreState.status})
                    </span>
                  </div>

                  <div className="bg-[#08131F] p-3 rounded-lg border border-[#26394B]">
                    <span className="text-[10px] text-[#8295A8] uppercase block">
                      Measured Latency
                    </span>
                    <span className="font-bold text-[#F3F6FA] block mt-1">
                      {typeof selectedStoreState.latencyMs === 'number'
                        ? `${selectedStoreState.latencyMs} ms`
                        : 'Unavailable'}
                    </span>
                  </div>

                  <div className="bg-[#08131F] p-3 rounded-lg border border-[#26394B] sm:col-span-2">
                    <span className="text-[10px] text-[#8295A8] uppercase block">
                      Active Source
                    </span>
                    <span className="font-semibold text-[#35C7E8] block mt-1">
                      {selectedStoreState.source || selectedStoreDescriptor.defaultSource}
                    </span>
                  </div>

                  <div className="bg-[#08131F] p-3 rounded-lg border border-[#26394B]">
                    <span className="text-[10px] text-[#8295A8] uppercase block">
                      Last Successful Fetch
                    </span>
                    <span className="text-[#F3F6FA] block mt-1 text-[11px]">
                      {formatTimestampIST(
                        selectedStoreState.lastSuccessfulFetch || selectedStoreState.fetchedAt
                      )}
                    </span>
                  </div>

                  <div className="bg-[#08131F] p-3 rounded-lg border border-[#26394B]">
                    <span className="text-[10px] text-[#8295A8] uppercase block">
                      Last Attempted Fetch
                    </span>
                    <span className="text-[#F3F6FA] block mt-1 text-[11px]">
                      {formatTimestampIST(
                        selectedStoreState.lastAttemptedFetch || selectedStoreState.fetchedAt
                      )}
                    </span>
                  </div>

                  <div className="bg-[#08131F] p-3 rounded-lg border border-[#26394B] sm:col-span-2">
                    <span className="text-[10px] text-[#8295A8] uppercase block">
                      Endpoint Classification
                    </span>
                    <span className="text-[#B5C3D1] block mt-1 font-sans">
                      {selectedStoreState.endpointType || selectedStoreDescriptor.description}
                    </span>
                  </div>

                  {selectedStoreState.requestId && (
                    <div className="bg-[#08131F] p-3 rounded-lg border border-[#26394B] sm:col-span-2">
                      <span className="text-[10px] text-[#8295A8] uppercase block">
                        Trace Request ID
                      </span>
                      <span className="text-[#8295A8] block mt-1">
                        {selectedStoreState.requestId}
                      </span>
                    </div>
                  )}

                  {selectedStoreState.error && (
                    <div className="bg-[#EF4444]/10 p-3 rounded-lg border border-[#EF4444]/35 sm:col-span-2">
                      <span className="text-[10px] text-[#FCA5A5] uppercase font-bold block mb-1">
                        Normalized Upstream Error
                      </span>
                      <p className="text-xs text-[#FCA5A5] font-sans break-words">
                        {selectedStoreState.error}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-3 border-t border-[#26394B]">
              <button
                type="button"
                onClick={(e) => handleRefreshSingleProvider(selectedStoreProviderId, e)}
                disabled={refreshingSingleId === selectedStoreProviderId}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#0B72B9] hover:bg-[#35C7E8] text-xs font-mono font-semibold text-white hover:text-[#07111D] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-xs font-mono font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Optional Gateway Configuration Modal */}
      {selectedProvider && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedProvider(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedProvider.name} Gateway Config`}
        >
          <div
            className="bg-[#0B1927] border border-[#38536A] rounded-xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 text-[#F3F6FA]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#26394B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8]">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F3F6FA]">
                    {selectedProvider.name} Gateway Config
                  </h3>
                  <p className="text-xs text-[#8295A8]">{selectedProvider.fullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                aria-label="Close configuration modal"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const modalStatus = selectedProvider.detail?.status || 'NOT_CONFIGURED';
              const modalWhyReason =
                selectedProvider.detail?.reason ||
                (modalStatus === 'NOT_CONFIGURED'
                  ? 'Official credentials/access are not configured on the server.'
                  : modalStatus === 'UNAVAILABLE'
                  ? 'Real data could not be retrieved from provider endpoint.'
                  : 'Provider gateway checked.');
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="bg-[#08131F] p-2.5 rounded-lg border border-[#26394B]">
                    <span className="text-[10px] text-[#8295A8] uppercase block">Status</span>
                    <span className={`font-bold ${getStatusConfig(modalStatus).text}`}>
                      {getStatusConfig(modalStatus).label}
                    </span>
                  </div>
                  <div className="bg-[#08131F] p-2.5 rounded-lg border border-[#26394B]">
                    <span className="text-[10px] text-[#8295A8] uppercase block">
                      Active Fallback
                    </span>
                    <span className="font-semibold text-[#35C7E8]">
                      {selectedProvider.detail?.fallback || 'Open-Meteo / None'}
                    </span>
                  </div>
                  <div className="bg-[#08131F] p-3 rounded-lg border border-[#26394B] sm:col-span-2">
                    <span className="text-[10px] text-[#8295A8] uppercase block mb-1">
                      Diagnostics
                    </span>
                    <p className="text-xs text-[#B5C3D1] font-sans leading-relaxed">
                      {modalWhyReason}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="p-3.5 rounded-lg bg-[#08131F] border border-[#26394B] flex flex-col gap-2.5">
              <span className="text-[11px] font-bold text-[#F3F6FA] uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#35C7E8]" /> Configure {selectedProvider.name} Key
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Key className="w-3.5 h-3.5 text-[#8295A8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={configKeyInput}
                    onChange={(e) => setConfigKeyInput(e.target.value)}
                    placeholder={
                      selectedProvider.detail?.requiredKey
                        ? `Enter ${selectedProvider.detail.requiredKey}...`
                        : 'Enter API key...'
                    }
                    className="w-full min-h-[40px] bg-[#0B1927] border border-[#26394B] rounded-lg px-2.5 py-2 pl-8 text-xs text-[#F3F6FA] placeholder-[#8295A8] focus:outline-none focus:border-[#35C7E8]"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSavingConfig}
                  onClick={() => handleSaveProviderConfig(selectedProvider.id)}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#0B72B9] hover:bg-[#35C7E8] text-xs font-mono font-semibold text-white hover:text-[#07111D] flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingConfig ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
              {configSaveResult && (
                <div
                  className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                    configSaveResult.success
                      ? 'bg-[#22C7A0]/12 text-[#6EE7B7] border border-[#22C7A0]/35'
                      : 'bg-[#EF4444]/12 text-[#FCA5A5] border border-[#EF4444]/35'
                  }`}
                >
                  {configSaveResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{configSaveResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-xs font-mono font-semibold cursor-pointer"
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
          className="m-panel-inset p-4 flex flex-col gap-2.5 text-xs"
        >
          <span className="text-xs font-bold text-[#F3F6FA] uppercase tracking-wide">
            Data Sources &amp; Official Attributions
          </span>
          <p className="text-[11px] text-[#8295A8] leading-relaxed">
            MAUSAM surfaces open and institutional meteorological feeds with explicit source attribution and zero fabricated observations:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-[#B5C3D1]">
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
              <span>
                <strong className="text-[#F3F6FA]">IMD</strong> — India Meteorological Department (MoES surface &amp; DWR)
              </span>
              <a
                href="https://mausam.imd.gov.in"
                target="_blank"
                rel="noreferrer"
                className="text-[#35C7E8] hover:underline shrink-0 ml-2"
                aria-label="IMD Official Website"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
              <span>
                <strong className="text-[#F3F6FA]">Open-Meteo</strong> — Numerical point meteorology &amp; air chemistry (CC BY 4.0)
              </span>
              <a
                href="https://open-meteo.com"
                target="_blank"
                rel="noreferrer"
                className="text-[#35C7E8] hover:underline shrink-0 ml-2"
                aria-label="Open-Meteo Website"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
              <span>
                <strong className="text-[#F3F6FA]">CPCB</strong> — Central Pollution Control Board (NAQI benchmarks)
              </span>
              <a
                href="https://cpcb.nic.in"
                target="_blank"
                rel="noreferrer"
                className="text-[#35C7E8] hover:underline shrink-0 ml-2"
                aria-label="CPCB Website"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
              <span>
                <strong className="text-[#F3F6FA]">NDMA / SACHET</strong> — National Disaster Management Authority (CAP Alerts)
              </span>
              <a
                href="https://sachet.ndma.gov.in"
                target="_blank"
                rel="noreferrer"
                className="text-[#35C7E8] hover:underline shrink-0 ml-2"
                aria-label="SACHET Website"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
              <span>
                <strong className="text-[#F3F6FA]">RainViewer</strong> — Global precipitation radar tile mosaic
              </span>
              <a
                href="https://www.rainviewer.com/api.html"
                target="_blank"
                rel="noreferrer"
                className="text-[#35C7E8] hover:underline shrink-0 ml-2"
                aria-label="RainViewer API"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
              <span>
                <strong className="text-[#F3F6FA]">OpenStreetMap</strong> — Base cartography (&copy; OSM contributors)
              </span>
              <a
                href="https://www.openstreetmap.org"
                target="_blank"
                rel="noreferrer"
                className="text-[#35C7E8] hover:underline shrink-0 ml-2"
                aria-label="OpenStreetMap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
};
