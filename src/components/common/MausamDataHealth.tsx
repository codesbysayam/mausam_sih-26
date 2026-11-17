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
        dot: 'bg-emerald-400',
        text: 'text-emerald-300',
        badgeBg: 'bg-emerald-500/12 border-emerald-500/35',
        cardBorder: 'border-emerald-500/25 hover:border-emerald-500/45',
      };
    case 'recent':
      return {
        dot: 'bg-[#38BDF8]',
        text: 'text-[#7DD3FC]',
        badgeBg: 'bg-[#38BDF8]/12 border-[#38BDF8]/35',
        cardBorder: 'border-[#38BDF8]/25 hover:border-[#38BDF8]/45',
      };
    case 'stale':
      return {
        dot: 'bg-amber-400',
        text: 'text-amber-300',
        badgeBg: 'bg-amber-500/12 border-amber-500/35',
        cardBorder: 'border-amber-500/25 hover:border-amber-500/45',
      };
    case 'loading':
      return {
        dot: 'bg-sky-400',
        text: 'text-sky-300',
        badgeBg: 'bg-sky-500/12 border-sky-500/35',
        cardBorder: 'border-sky-500/25 hover:border-sky-500/45',
      };
    case 'error':
      return {
        dot: 'bg-rose-400',
        text: 'text-rose-300',
        badgeBg: 'bg-rose-500/12 border-rose-500/35',
        cardBorder: 'border-rose-500/30 hover:border-rose-500/50',
      };
    case 'unavailable':
    default:
      return {
        dot: 'bg-amber-500',
        text: 'text-amber-300',
        badgeBg: 'bg-amber-500/10 border-amber-500/30',
        cardBorder: 'border-white/12 hover:border-amber-400/40',
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
          dot: 'bg-emerald-400',
          text: 'text-emerald-300',
          border: 'border-emerald-500/30 hover:border-emerald-500/50',
          bg: 'bg-[#162331]',
        };
      case 'DEGRADED':
        return {
          label: 'Degraded',
          dot: 'bg-amber-400',
          text: 'text-amber-300',
          border: 'border-amber-500/30 hover:border-amber-500/50',
          bg: 'bg-[#162331]',
        };
      case 'STALE':
        return {
          label: 'Stale (Cached)',
          dot: 'bg-amber-400',
          text: 'text-amber-300',
          border: 'border-amber-500/30 hover:border-amber-500/50',
          bg: 'bg-[#162331]',
        };
      case 'NO_COVERAGE':
        return {
          label: 'No Coverage',
          dot: 'bg-slate-400',
          text: 'text-slate-300',
          border: 'border-white/12 hover:border-white/25',
          bg: 'bg-[#162331]',
        };
      case 'OFFLINE':
      case 'UNAVAILABLE':
        return {
          label: 'Unavailable',
          dot: 'bg-rose-400',
          text: 'text-rose-300',
          border: 'border-rose-500/30 hover:border-rose-500/50',
          bg: 'bg-[#162331]',
        };
      case 'NOT_CONFIGURED':
      default:
        return {
          label: 'Not Configured',
          dot: 'bg-sky-400/80',
          text: 'text-sky-300',
          border: 'border-white/12 hover:border-[#38BDF8]/40',
          bg: 'bg-[#162331]',
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
      className="w-full bg-[#101B26] border border-white/12 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-5 text-[#F4F7FA]"
    >
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold tracking-tight text-[#F4F7FA]">
                Independent Provider Registry &amp; Feed Provenance
              </h2>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${
                  systemStatus === 'LIVE'
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                    : systemStatus === 'PARTIAL'
                    ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                }`}
              >
                System: {systemStatus}
              </span>
            </div>
            <p className="text-xs text-[#93A4B8] mt-0.5 tabular-nums">
              Isolated per-provider state • Server Sync:{' '}
              <strong className="text-[#F4F7FA] font-mono">{lastSyncFormatted}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          {statusMessage && (
            <span className="text-xs text-emerald-300 font-mono">
              {statusMessage}
            </span>
          )}

          <button
            id="btn-sources-refresh"
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className={`min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer select-none ${
              isRefreshing
                ? 'bg-[#162331] border-white/12 text-[#93A4B8] cursor-not-allowed'
                : 'bg-[#1D4ED8] hover:bg-[#1E40AF] border-[#38BDF8]/30 text-white'
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
              className={`p-3.5 rounded-xl border bg-[#162331] ${tone.cardBorder} flex flex-col justify-between gap-3 transition-colors cursor-pointer group`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#F4F7FA] group-hover:text-[#38BDF8] transition-colors truncate">
                      {descriptor.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B1219] text-[#93A4B8] border border-white/10">
                      {descriptor.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#93A4B8] mt-1 line-clamp-2">
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
                <div className="text-[11px] text-rose-300/90 bg-rose-950/30 border border-rose-500/25 rounded-lg px-2.5 py-1.5 truncate font-mono">
                  {state.error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-[11px] font-mono tabular-nums">
                <div className="flex items-center gap-3 text-[#93A4B8]">
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
                    className="px-2 py-1 rounded bg-[#101B26] hover:bg-[#1E2E40] border border-white/12 text-[#CBD5E1] hover:text-white text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSingleRefreshing ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                  <span className="text-[#38BDF8] font-semibold group-hover:underline">
                    Details →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Optional Institutional / Commercial Gateway Providers */}
      {optionalProviders.length > 0 && (
        <div className="border border-white/10 rounded-xl p-3.5 bg-[#0B1219]/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#CBD5E1]">
                <span>OPTIONAL INSTITUTIONAL &amp; COMMERCIAL FEEDS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#162331] text-[#38BDF8] border border-white/10">
                  Zero Keys Required for Core
                </span>
              </div>
              <p className="text-[11px] text-[#93A4B8] mt-0.5">
                Core meteorology runs without API keys. Configure optional credentials below when an official endpoint key is provisioned.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOptionalProviders(!showOptionalProviders)}
              className="text-xs font-semibold text-[#38BDF8] hover:text-[#7DD3FC] flex items-center gap-1 shrink-0 self-start sm:self-center transition-colors cursor-pointer"
            >
              <span>{showOptionalProviders ? 'Hide Optional Feeds' : `Inspect ${optionalProviders.length} Optional Feeds`}</span>
              {showOptionalProviders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showOptionalProviders && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-white/10">
              {optionalProviders.map((p) => {
                const badge = getStatusConfig(p.detail?.status);
                return (
                  <div
                    key={p.id}
                    id={`optional-provider-card-${p.id}`}
                    onClick={() => setSelectedProvider(p)}
                    className="p-3 rounded-lg border border-white/10 bg-[#101B26] flex flex-col justify-between gap-2 hover:border-[#38BDF8]/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#F4F7FA] truncate block">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-[#93A4B8] truncate block">
                          {p.fullName}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#162331] text-[#93A4B8] border border-white/10 shrink-0">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-white/10">
                      <span className={badge.text}>{badge.label}</span>
                      <span className="text-[#38BDF8]">Configure / Inspect →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Backend Gateway & Cache Health Summary */}
      <div
        id="mausam-system-status-panel"
        className="bg-[#0B1219]/75 border border-white/10 rounded-xl p-3.5 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#F4F7FA] uppercase tracking-wide">
            <Server className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Backend Gateway &amp; Storage</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAttribution(!showAttribution)}
            className="text-[11px] font-medium text-[#38BDF8] hover:text-[#7DD3FC] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{showAttribution ? 'Hide Attributions' : 'Data Sources & Attribution'}</span>
            {showAttribution ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs font-mono tabular-nums">
          <div className="bg-[#101B26] p-2.5 rounded-lg border border-white/10">
            <span className="text-[10px] text-[#93A4B8] block">Database</span>
            <span className={`text-xs font-semibold ${dbConnected ? 'text-emerald-300' : 'text-[#93A4B8]'}`}>
              {dbConnected ? `Connected (${dbMode})` : 'Not Configured'}
            </span>
          </div>

          <div className="bg-[#101B26] p-2.5 rounded-lg border border-white/10">
            <span className="text-[10px] text-[#93A4B8] block">Database Latency</span>
            <span className={`text-xs font-semibold ${dbLatency ? 'text-emerald-300' : 'text-[#93A4B8]'}`}>
              {dbLatency !== null && dbLatency !== undefined ? `${dbLatency} ms` : 'Unavailable'}
            </span>
          </div>

          <div className="bg-[#101B26] p-2.5 rounded-lg border border-white/10">
            <span className="text-[10px] text-[#93A4B8] block">Cache Engine</span>
            <span className={`text-xs font-semibold ${cacheStats?.connected ? 'text-emerald-300' : 'text-amber-300'}`}>
              {cacheStats?.connected ? 'Redis Connected' : 'In-Memory Cache'}
            </span>
          </div>

          <div className="bg-[#101B26] p-2.5 rounded-lg border border-white/10">
            <span className="text-[10px] text-[#93A4B8] block">Cache Hit Ratio</span>
            <span className="text-xs font-semibold text-[#F4F7FA]">
              {cacheStats?.hitRatio || '0.0%'}
            </span>
          </div>

          <div className="bg-[#101B26] p-2.5 rounded-lg border border-white/10">
            <span className="text-[10px] text-[#93A4B8] block">Cache Entries</span>
            <span className="text-xs font-semibold text-[#F4F7FA]">
              {cacheStats?.totalEntries ?? 0}
            </span>
          </div>
        </div>

        {(healthData?.buildId || healthData?.warningServiceVersion) && (
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#93A4B8] font-mono tabular-nums">
            <div className="flex items-center gap-3">
              {healthData?.buildId && (
                <span>BUILD: <strong className="text-[#CBD5E1] font-medium">{healthData.buildId}</strong></span>
              )}
              {healthData?.gitCommit && (
                <span>REV: <strong className="text-[#CBD5E1] font-medium">{healthData.gitCommit}</strong></span>
              )}
            </div>
            {healthData?.warningServiceVersion && (
              <div>
                <span>WARN SVC: <strong className="text-[#38BDF8] font-medium">{healthData.warningServiceVersion}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Isolated ProviderStore Diagnostic Modal */}
      {selectedStoreProviderId && selectedStoreDescriptor && selectedStoreState && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedStoreProviderId(null)}
        >
          <div
            className="bg-[#101B26] border border-white/15 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 text-[#F4F7FA]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F4F7FA]">
                    {selectedStoreDescriptor.name} Telemetry
                  </h3>
                  <p className="text-xs text-[#93A4B8]">{selectedStoreDescriptor.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStoreProviderId(null)}
                aria-label="Close provider diagnostics"
                className="p-1.5 rounded-lg text-[#93A4B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const visual = getProviderStatusVisual(selectedStoreState.status);
              const tone = getToneClasses(visual.tone);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
                  <div className="bg-[#162331] p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-[#93A4B8] uppercase block">Status</span>
                    <span className={`font-bold flex items-center gap-1.5 mt-1 ${tone.text}`}>
                      <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                      {visual.label} ({selectedStoreState.status})
                    </span>
                  </div>

                  <div className="bg-[#162331] p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-[#93A4B8] uppercase block">Measured Latency</span>
                    <span className="font-bold text-[#F4F7FA] block mt-1">
                      {typeof selectedStoreState.latencyMs === 'number'
                        ? `${selectedStoreState.latencyMs} ms`
                        : 'Unavailable'}
                    </span>
                  </div>

                  <div className="bg-[#162331] p-3 rounded-xl border border-white/10 sm:col-span-2">
                    <span className="text-[10px] text-[#93A4B8] uppercase block">Active Source</span>
                    <span className="font-semibold text-[#38BDF8] block mt-1">
                      {selectedStoreState.source || selectedStoreDescriptor.defaultSource}
                    </span>
                  </div>

                  <div className="bg-[#162331] p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-[#93A4B8] uppercase block">Last Successful Fetch</span>
                    <span className="text-[#F4F7FA] block mt-1 text-[11px]">
                      {formatTimestampIST(selectedStoreState.lastSuccessfulFetch || selectedStoreState.fetchedAt)}
                    </span>
                  </div>

                  <div className="bg-[#162331] p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] text-[#93A4B8] uppercase block">Last Attempted Fetch</span>
                    <span className="text-[#F4F7FA] block mt-1 text-[11px]">
                      {formatTimestampIST(selectedStoreState.lastAttemptedFetch || selectedStoreState.fetchedAt)}
                    </span>
                  </div>

                  <div className="bg-[#162331] p-3 rounded-xl border border-white/10 sm:col-span-2">
                    <span className="text-[10px] text-[#93A4B8] uppercase block">Endpoint Classification</span>
                    <span className="text-[#CBD5E1] block mt-1 font-sans">
                      {selectedStoreState.endpointType || selectedStoreDescriptor.description}
                    </span>
                  </div>

                  {selectedStoreState.requestId && (
                    <div className="bg-[#162331] p-3 rounded-xl border border-white/10 sm:col-span-2">
                      <span className="text-[10px] text-[#93A4B8] uppercase block">Trace Request ID</span>
                      <span className="text-[#93A4B8] block mt-1">{selectedStoreState.requestId}</span>
                    </div>
                  )}

                  {selectedStoreState.error && (
                    <div className="bg-rose-950/35 p-3 rounded-xl border border-rose-500/35 sm:col-span-2">
                      <span className="text-[10px] text-rose-300 uppercase font-bold block mb-1">
                        Normalized Upstream Error
                      </span>
                      <p className="text-xs text-rose-200 font-sans break-words">
                        {selectedStoreState.error}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={(e) => handleRefreshSingleProvider(selectedStoreProviderId, e)}
                disabled={refreshingSingleId === selectedStoreProviderId}
                className="px-3.5 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingSingleId === selectedStoreProviderId ? 'animate-spin' : ''}`} />
                <span>Re-sync Provider</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStoreProviderId(null)}
                className="px-4 py-2 rounded-lg bg-[#162331] hover:bg-[#1E2E40] border border-white/12 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Legacy Optional Gateway Configuration Modal */}
      {selectedProvider && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedProvider(null)}
        >
          <div
            className="bg-[#101B26] border border-white/15 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 text-[#F4F7FA]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F4F7FA]">
                    {selectedProvider.name} Gateway Config
                  </h3>
                  <p className="text-xs text-[#93A4B8]">{selectedProvider.fullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="p-1.5 rounded-lg text-[#93A4B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const modalStatus = selectedProvider.detail?.status || 'NOT_CONFIGURED';
              const modalWhyReason = selectedProvider.detail?.reason || (
                modalStatus === 'NOT_CONFIGURED'
                  ? 'Official credentials/access are not configured on the server.'
                  : modalStatus === 'UNAVAILABLE'
                  ? 'Real data could not be retrieved from provider endpoint.'
                  : 'Provider gateway checked.'
              );
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="bg-[#162331] p-2.5 rounded-lg border border-white/10">
                    <span className="text-[10px] text-[#93A4B8] uppercase block">Status</span>
                    <span className={`font-bold ${getStatusConfig(modalStatus).text}`}>
                      {getStatusConfig(modalStatus).label}
                    </span>
                  </div>
                  <div className="bg-[#162331] p-2.5 rounded-lg border border-white/10">
                    <span className="text-[10px] text-[#93A4B8] uppercase block">Active Fallback</span>
                    <span className="font-semibold text-[#38BDF8]">
                      {selectedProvider.detail?.fallback || 'Open-Meteo / None'}
                    </span>
                  </div>
                  <div className="bg-[#162331] p-3 rounded-lg border border-white/10 sm:col-span-2">
                    <span className="text-[10px] text-[#93A4B8] uppercase block mb-1">Diagnostics</span>
                    <p className="text-xs text-[#CBD5E1] font-sans leading-relaxed">{modalWhyReason}</p>
                  </div>
                </div>
              );
            })()}

            <div className="p-3 rounded-xl bg-[#0B1219] border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#F4F7FA] uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#38BDF8]" /> Configure {selectedProvider.name} Key
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Key className="w-3.5 h-3.5 text-[#93A4B8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={configKeyInput}
                    onChange={(e) => setConfigKeyInput(e.target.value)}
                    placeholder={selectedProvider.detail?.requiredKey ? `Enter ${selectedProvider.detail.requiredKey}...` : 'Enter API key...'}
                    className="w-full bg-[#162331] border border-white/12 rounded-lg px-2.5 py-2 pl-8 text-xs text-[#F4F7FA] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSavingConfig}
                  onClick={() => handleSaveProviderConfig(selectedProvider.id)}
                  className="px-3 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-xs font-semibold text-white flex items-center gap-1 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingConfig ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
              {configSaveResult && (
                <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${configSaveResult.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50' : 'bg-rose-950/40 text-rose-300 border border-rose-800/50'}`}>
                  {configSaveResult.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{configSaveResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="px-4 py-2 rounded-lg bg-[#162331] hover:bg-[#1E2E40] border border-white/12 text-xs font-semibold cursor-pointer"
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
          className="bg-[#0B1219]/75 border border-white/10 rounded-xl p-4 flex flex-col gap-2.5 text-xs"
        >
          <span className="text-xs font-bold text-[#F4F7FA] uppercase tracking-wide">
            Data Sources &amp; Official Attributions
          </span>
          <p className="text-[11px] text-[#93A4B8] leading-relaxed">
            MAUSAM surfaces open and institutional meteorological feeds with explicit source attribution and zero fabricated observations:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-[#CBD5E1]">
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#101B26] border border-white/10">
              <span><strong>IMD</strong> — India Meteorological Department (MoES surface &amp; DWR)</span>
              <a href="https://mausam.imd.gov.in" target="_blank" rel="noreferrer" className="text-[#38BDF8] hover:underline shrink-0 ml-2">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#101B26] border border-white/10">
              <span><strong>Open-Meteo</strong> — Numerical point meteorology &amp; air chemistry (CC BY 4.0)</span>
              <a href="https://open-meteo.com" target="_blank" rel="noreferrer" className="text-[#38BDF8] hover:underline shrink-0 ml-2">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#101B26] border border-white/10">
              <span><strong>CPCB</strong> — Central Pollution Control Board (NAQI benchmarks)</span>
              <a href="https://cpcb.nic.in" target="_blank" rel="noreferrer" className="text-[#38BDF8] hover:underline shrink-0 ml-2">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#101B26] border border-white/10">
              <span><strong>NDMA / SACHET</strong> — National Disaster Management Authority (CAP Alerts)</span>
              <a href="https://sachet.ndma.gov.in" target="_blank" rel="noreferrer" className="text-[#38BDF8] hover:underline shrink-0 ml-2">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#101B26] border border-white/10">
              <span><strong>RainViewer</strong> — Global precipitation radar tile mosaic</span>
              <a href="https://www.rainviewer.com/api.html" target="_blank" rel="noreferrer" className="text-[#38BDF8] hover:underline shrink-0 ml-2">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
            <li className="flex items-center justify-between p-2.5 rounded-lg bg-[#101B26] border border-white/10">
              <span><strong>OpenStreetMap</strong> — Base cartography (&copy; OSM contributors)</span>
              <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="text-[#38BDF8] hover:underline shrink-0 ml-2">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
};
