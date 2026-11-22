import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Database,
  Server,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  WifiOff,
  Activity,
} from 'lucide-react';
import {
  MultiSourceService,
  SystemHealthResponse,
  ProviderHealthDetail,
  ProviderStatusCode,
  GATEWAY_HEALTH_ENDPOINT,
  GATEWAY_PROVIDERS_ENDPOINT,
  GATEWAY_READINESS_ENDPOINT,
  GATEWAY_TIMEOUT_MS,
} from '../services/multiSourceService';
import { MausamDataHealth } from '../components/common/MausamDataHealth';
import { WeatherConditionTestBench } from '../components/dev/WeatherConditionTestBench';
import { formatTimestampIST } from '../services/providers/providerStatus';
import {
  PageHeader,
  DataPanel,
  SectionHeading,
  MetricValue,
  ProvenanceStatus,
} from '../components/ui/ObservatoryPrimitives';

interface EndpointProbeResult {
  status: string;
  ok: boolean;
  httpStatus: number | null;
  durationMs: number;
  error?: string | null;
  checkedAt: string;
  summary?: string | null;
}

interface GatewayErrorState {
  code: string;
  message: string;
  httpStatus: number | null;
  latencyMs: number;
  checkedAt: string;
}

function getProviderBadgeStyle(status: ProviderStatusCode): { label: string; badgeClass: string; dotClass: string } {
  switch (status) {
    case 'OPERATIONAL':
      return {
        label: 'OPERATIONAL',
        badgeClass: 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35',
        dotClass: 'bg-[var(--m-ok)]',
      };
    case 'DEGRADED':
      return {
        label: 'DEGRADED',
        badgeClass: 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35',
        dotClass: 'bg-[var(--m-watch)]',
      };
    case 'OFFLINE':
      return {
        label: 'OFFLINE',
        badgeClass: 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35',
        dotClass: 'bg-[var(--m-danger)]',
      };
    case 'UNAVAILABLE':
      return {
        label: 'UNAVAILABLE',
        badgeClass: 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35',
        dotClass: 'bg-[var(--m-danger)]',
      };
    case 'NOT_CONFIGURED':
      return {
        label: 'NOT CONFIGURED',
        badgeClass: 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35',
        dotClass: 'bg-[var(--m-accent)]',
      };
    case 'NOT_REPORTED':
    default:
      return {
        label: 'NOT REPORTED',
        badgeClass: 'bg-[var(--m-surface-2)] text-[var(--m-text-muted)] border-[var(--m-border)]',
        dotClass: 'bg-[var(--m-text-muted)]',
      };
  }
}

export const ApiDebugPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [gatewayError, setGatewayError] = useState<GatewayErrorState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testResults, setTestResults] = useState<Record<string, EndpointProbeResult>>({});
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  // Request sequencing + AbortController prevent concurrent refreshes from racing
  const requestSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchGatewayDiagnostics = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const result = await MultiSourceService.fetchGatewayHealth({
        timeoutMs: GATEWAY_TIMEOUT_MS,
        signal: controller.signal,
      });

      // Discard stale out-of-order responses
      if (seq !== requestSeqRef.current) return;

      if (result.ok === true) {
        setHealth(result.data);
        setGatewayError(null);
      } else if ('errorCode' in result && result.errorCode !== 'ABORTED') {
        // Never present stale diagnostics as live when gateway fails
        setHealth(null);
        setGatewayError({
          code: result.errorCode,
          message: result.errorMessage,
          httpStatus: result.httpStatus,
          latencyMs: result.gatewayLatencyMs,
          checkedAt: result.checkedAt,
        });
      }
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchGatewayDiagnostics();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchGatewayDiagnostics]);

  const runLiveEndpointProbe = async (name: string, path: string) => {
    setTestingEndpoint(name);
    const start = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);
    const checkedAt = new Date().toISOString();

    try {
      const res = await fetch(path, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      const durationMs = Math.max(0, Math.round(performance.now() - start));
      let json: any = null;
      let parseError: string | null = null;
      try {
        json = await res.json();
      } catch (e: any) {
        parseError = e?.message || 'Non-JSON response';
      }

      const ok = res.ok && !parseError && json !== null;
      const summary = ok
        ? json?.status
          ? `status=${json.status}`
          : typeof json?.count === 'number'
          ? `count=${json.count}`
          : 'Valid JSON'
        : null;

      setTestResults((prev) => ({
        ...prev,
        [name]: {
          status: ok ? `HTTP ${res.status}` : parseError ? 'INVALID JSON' : `HTTP ${res.status}`,
          ok,
          httpStatus: res.status,
          durationMs,
          checkedAt,
          summary,
          error: ok
            ? null
            : parseError || json?.error || json?.message || `HTTP ${res.status} ${res.statusText || ''}`.trim(),
        },
      }));
    } catch (err: any) {
      const durationMs = Math.max(0, Math.round(performance.now() - start));
      const isTimeout = err?.name === 'AbortError';
      setTestResults((prev) => ({
        ...prev,
        [name]: {
          status: isTimeout ? 'TIMEOUT' : 'NETWORK ERROR',
          ok: false,
          httpStatus: null,
          durationMs,
          checkedAt,
          error: isTimeout
            ? `Probe timed out after ${GATEWAY_TIMEOUT_MS}ms`
            : err?.message || 'Network failure',
        },
      }));
    } finally {
      clearTimeout(timer);
      setTestingEndpoint(null);
    }
  };

  const deployedGatewayEndpoints = [
    { name: 'System Telemetry Health', path: GATEWAY_HEALTH_ENDPOINT },
    { name: 'System Provider Registry', path: GATEWAY_PROVIDERS_ENDPOINT },
    { name: 'System Readiness Probe', path: GATEWAY_READINESS_ENDPOINT },
    { name: 'Weather Current (Bhubaneswar)', path: '/api/weather?mode=current&lat=20.2961&lon=85.8245' },
    { name: 'SACHET / IMD Warnings Feed', path: '/api/warnings' },
    { name: 'Doppler Radar Mosaic', path: '/api/radar' },
    { name: 'Cyclone Basin Advisory', path: '/api/cyclone' },
    { name: 'Weather News Wire', path: '/api/weather-news' },
  ];

  // Distinguish Gateway Reachability from Upstream Provider Status
  const gatewayStatus: ProvenanceStatus = loading
    ? 'LOADING'
    : !health
    ? 'UNAVAILABLE'
    : health.summary.overallStatus === 'HEALTHY'
    ? 'LIVE'
    : 'DEGRADED';

  const gatewayStatusLabel = loading
    ? 'PROBING GATEWAY'
    : !health
    ? 'GATEWAY UNREACHABLE'
    : health.summary.overallStatus === 'HEALTHY'
    ? 'GATEWAY REACHABLE · HEALTHY'
    : health.summary.overallStatus === 'DEGRADED'
    ? 'GATEWAY REACHABLE · PROVIDERS DEGRADED'
    : 'GATEWAY REACHABLE · UPSTREAM OUTAGE';

  const unavailableTotal = health
    ? health.summary.degraded + health.summary.offline + health.summary.unavailable
    : null;

  const providerRows: ProviderHealthDetail[] = health?.providerList || [];
  const cacheState = health?.cache;
  const dbState = health?.database;

  return (
    <div id="mausam-data-sources-page" className="max-w-7xl mx-auto space-y-5 pb-12 text-[var(--m-text-primary)]">
      {/* 1. Unified Observatory Header — clearly separates gateway reachability vs upstream health */}
      <PageHeader
        eyebrow="Provider Registry & Telemetry Diagnostics"
        title="Data Sources & Upstream Diagnostics"
        description="Live verification of the deployed /api/system?mode=health gateway, independent per-provider server probes, browser-to-gateway round-trip timing, and truthful storage telemetry."
        status={gatewayStatus}
        statusLabel={gatewayStatusLabel}
        source={`Gateway: ${GATEWAY_HEALTH_ENDPOINT}`}
        updatedAt={health ? formatTimestampIST(health.timestamp) : null}
        actions={
          <button
            id="btn-refresh-gateway"
            type="button"
            onClick={fetchGatewayDiagnostics}
            disabled={loading}
            className="min-h-[44px] sm:min-h-[40px] px-4 py-2 bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-[var(--m-text-primary)] rounded-lg font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 m-focus-ring"
          >
            <RefreshCw className={`w-4 h-4 text-[var(--m-accent)] ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Probing Gateway…' : 'Refresh Diagnostics'}</span>
          </button>
        }
      >
        {health && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[var(--m-text-muted)] tabular-nums">
            <span>
              Gateway RTT:{' '}
              <strong className="text-[var(--m-text-primary)]">{health.gateway.roundTripMs} ms</strong>
            </span>
            {typeof health.gateway.probeDurationMs === 'number' && (
              <span>
                Server Probe:{' '}
                <strong className="text-[var(--m-text-primary)]">{health.gateway.probeDurationMs} ms</strong>
              </span>
            )}
            {health.environment && (
              <span>
                Env: <strong className="text-[var(--m-accent)] uppercase">{health.environment}</strong>
              </span>
            )}
          </div>
        )}
      </PageHeader>

      {/* 2. Explicit Retryable Gateway Error Banner when /api/system?mode=health fails */}
      {gatewayError && !loading && (
        <div
          id="gateway-error-banner"
          role="alert"
          className="rounded-xl border border-[var(--m-danger)]/45 bg-[var(--m-danger-soft)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-danger)]/35 flex items-center justify-center text-[var(--m-danger)] shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[var(--m-text-primary)]">
                  Telemetry Gateway Unreachable
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--m-surface-1)] text-[var(--m-danger)] border border-[var(--m-danger)]/35">
                  {gatewayError.code}
                  {gatewayError.httpStatus ? ` · HTTP ${gatewayError.httpStatus}` : ''}
                </span>
              </div>
              <p className="text-xs font-mono text-[var(--m-danger)] break-words">
                {gatewayError.message}
              </p>
              <p className="text-[11px] font-mono text-[var(--m-text-muted)]">
                Attempted: {GATEWAY_HEALTH_ENDPOINT} · Elapsed: {gatewayError.latencyMs} ms · Checked:{' '}
                {formatTimestampIST(gatewayError.checkedAt)} · Stale client diagnostics are withheld.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchGatewayDiagnostics}
            className="min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-xs font-mono font-semibold text-[var(--m-text-primary)] flex items-center gap-2 shrink-0 cursor-pointer m-focus-ring"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--m-accent)]" />
            <span>Retry Gateway Probe</span>
          </button>
        </div>
      )}

      {/* 3. Deployed Gateway Summary KPI Row — strictly real metrics from /api/system?mode=health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 tabular-nums">
        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[var(--m-text-muted)]">
              Operational Providers
            </span>
            <ShieldCheck className="w-4 h-4 text-[var(--m-ok)]" />
          </div>
          <MetricValue
            label="Verified Healthy"
            value={health ? health.summary.operational : null}
            unit={health ? `/ ${health.summary.configuredProviders} configured` : undefined}
            hint={
              health && typeof health.summary.providerAvailabilityPct === 'number'
                ? `${health.summary.providerAvailabilityPct}% configured availability`
                : 'Independent server-side probes'
            }
            unavailableLabel={loading ? 'Probing…' : 'Not reported'}
          />
        </DataPanel>

        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[var(--m-text-muted)]">
              Unavailable / Degraded
            </span>
            <AlertTriangle className="w-4 h-4 text-[var(--m-watch)]" />
          </div>
          <MetricValue
            label="Failed Upstream Probes"
            value={unavailableTotal}
            hint={
              health
                ? `${health.summary.degraded} degraded · ${health.summary.offline + health.summary.unavailable} offline`
                : 'Configured providers failing probe'
            }
            unavailableLabel={loading ? 'Probing…' : 'Not reported'}
          />
        </DataPanel>

        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[var(--m-text-muted)]">
              Not Configured
            </span>
            <Server className="w-4 h-4 text-[var(--m-accent)]" />
          </div>
          <MetricValue
            label="Optional Credentials"
            value={health ? health.summary.notConfigured : null}
            hint="Optional institutional/commercial keys"
            unavailableLabel={loading ? 'Probing…' : 'Not reported'}
          />
        </DataPanel>

        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[var(--m-text-muted)]">
              Gateway Round-Trip
            </span>
            <Clock className="w-4 h-4 text-[var(--m-accent)]" />
          </div>
          <MetricValue
            label="Browser-to-Gateway RTT"
            value={health ? health.gateway.roundTripMs : null}
            unit="ms"
            hint="Client → /api/system?mode=health (not upstream)"
            unavailableLabel={loading ? 'Measuring…' : 'Unreachable'}
          />
        </DataPanel>
      </div>

      {/* 4. Server-Side Independent Provider Probe Registry */}
      <DataPanel className="p-0 overflow-hidden tabular-nums">
        <div className="p-4 sm:p-5 bg-[var(--m-surface-2)] border-b border-[var(--m-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <SectionHeading
            title="Server-Side Provider Probe Matrix"
            subtitle="Independent parallel server probes (Promise.allSettled) with measured upstream elapsed latency and payload validation"
            icon={<Activity className="w-4 h-4" />}
            className="border-b-0 pb-0"
          />
          {health && (
            <span className="text-[11px] font-mono text-[var(--m-text-muted)] shrink-0">
              {providerRows.length} registered providers
            </span>
          )}
        </div>

        {providerRows.length === 0 ? (
          <div className="p-6 text-xs font-mono text-[var(--m-text-muted)] text-center">
            {loading
              ? 'Running live server-side provider probes via /api/system?mode=health…'
              : 'No server-side provider telemetry available while gateway is unreachable.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--m-border)] bg-[var(--m-surface-1)] text-[10px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Config</th>
                  <th className="py-3 px-3">Upstream Latency</th>
                  <th className="py-3 px-3">Last Success</th>
                  <th className="py-3 px-3">Last Failure</th>
                  <th className="py-3 px-4">Error / Diagnostics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--m-border)] font-mono">
                {providerRows.map((p) => {
                  const badge = getProviderBadgeStyle(p.status);
                  return (
                    <tr key={p.id} className="hover:bg-[var(--m-surface-2)]/70 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-[var(--m-text-primary)] flex items-center gap-1.5 flex-wrap">
                          <span>{p.name}</span>
                          {p.core && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-accent)] uppercase">
                              Core
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--m-text-muted)] mt-0.5">
                          {p.role}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-semibold ${badge.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                        {p.status === 'NOT_REPORTED' ? (
                          <span className="text-[var(--m-text-muted)]">Not reported</span>
                        ) : p.isConfigured ? (
                          <span className="text-[var(--m-ok)]">
                            {p.requiredKey ? 'Key Set' : 'Keyless'}
                          </span>
                        ) : (
                          <span className="text-[var(--m-text-muted)]">
                            Missing {p.requiredKey || 'Config'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                        {typeof p.latency === 'number' ? (
                          <span className="text-[var(--m-text-primary)] font-semibold">{p.latency} ms</span>
                        ) : (
                          <span className="text-[var(--m-text-muted)]">Not reported</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-[11px] text-[var(--m-text-secondary)]">
                        {p.last_success ? formatTimestampIST(p.last_success) : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-[11px] text-[var(--m-text-secondary)]">
                        {p.last_failure ? formatTimestampIST(p.last_failure) : '—'}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {p.error ? (
                          <span
                            className={`break-words text-[11px] ${
                              p.status === 'OPERATIONAL'
                                ? 'text-[var(--m-ok)] font-sans'
                                : p.status === 'NOT_CONFIGURED'
                                  ? 'text-[var(--m-text-muted)] font-sans'
                                  : 'text-[var(--m-danger)]'
                            }`}
                          >
                            {p.error}
                          </span>
                        ) : p.reason ? (
                          <span className="text-[var(--m-text-muted)] break-words text-[11px] font-sans">
                            {p.reason}
                          </span>
                        ) : (
                          <span className="text-[var(--m-ok)] text-[11px]">Verified OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {/* 5. Truthful Server Cache & Database Telemetry — never fabricates zeros or in-memory claims */}
      <DataPanel className="p-4 sm:p-5 space-y-3 tabular-nums">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--m-accent)]" />
            <h2 className="text-sm font-bold text-[var(--m-text-primary)]">
              Server Cache &amp; Database Telemetry
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[var(--m-text-muted)]">
            {cacheState?.reported
              ? `Store: ${cacheState.provider}`
              : 'Cache counters: Not reported by serverless gateway'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
          <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Cache Hits</span>
            <span className="text-sm font-semibold text-[var(--m-text-primary)] block mt-1">
              {cacheState?.reported && typeof cacheState.hits === 'number' ? cacheState.hits : 'Not reported'}
            </span>
          </div>
          <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Cache Misses</span>
            <span className="text-sm font-semibold text-[var(--m-text-primary)] block mt-1">
              {cacheState?.reported && typeof cacheState.misses === 'number' ? cacheState.misses : 'Not reported'}
            </span>
          </div>
          <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Deduplicated</span>
            <span className="text-sm font-semibold text-[var(--m-text-primary)] block mt-1">
              {cacheState?.reported && typeof cacheState.dedupes === 'number' ? cacheState.dedupes : 'Not reported'}
            </span>
          </div>
          <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Stale Serves</span>
            <span className="text-sm font-semibold text-[var(--m-text-primary)] block mt-1">
              {cacheState?.reported && typeof cacheState.staleServes === 'number' ? cacheState.staleServes : 'Not reported'}
            </span>
          </div>
          <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Hit Ratio</span>
            <span className="text-sm font-semibold text-[var(--m-text-primary)] block mt-1">
              {cacheState?.reported && cacheState.hitRatio ? cacheState.hitRatio : 'Not reported'}
            </span>
          </div>
          <div className="bg-[var(--m-surface-2)] p-3 rounded-lg border border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Database</span>
            <span
              className={`text-sm font-semibold block mt-1 ${
                dbState?.reported && dbState.connected
                  ? 'text-[var(--m-ok)]'
                  : dbState?.reported && dbState.configured
                  ? 'text-[var(--m-danger)]'
                  : 'text-[var(--m-text-muted)]'
              }`}
            >
              {!dbState || !dbState.reported
                ? 'Not reported'
                : dbState.connected
                ? `PG (${dbState.latencyMs ?? '—'} ms)`
                : dbState.configured
                ? 'Disconnected'
                : 'Not configured'}
            </span>
          </div>
        </div>

        {(cacheState?.reason || dbState?.error) && (
          <p className="text-[11px] font-mono text-[var(--m-text-muted)]">
            {cacheState?.reason}
            {dbState?.error ? ` · DB Error: ${dbState.error}` : ''}
          </p>
        )}
      </DataPanel>

      {/* 6. Independent Client ProviderStore & Feed Provenance Console */}
      <MausamDataHealth
        gatewayHealth={health}
        gatewayError={gatewayError?.message || null}
        gatewayLoading={loading}
        gatewayLatencyMs={health?.gateway.roundTripMs ?? null}
        onRefreshAll={fetchGatewayDiagnostics}
      />

      {/* 7. Interactive Weather Condition & Animation System Test Bench */}
      <WeatherConditionTestBench />

      {/* 8. Live Deployed Gateway Endpoint Validation Runner */}
      <DataPanel className="p-0 overflow-hidden tabular-nums">
        <div className="p-4 sm:p-5 bg-[var(--m-surface-2)] border-b border-[var(--m-border)]">
          <SectionHeading
            title="Deployed Gateway Endpoint Verification Suite"
            subtitle="Live cache-bypassed (no-store) probes against MAUSAM serverless and Express API endpoints"
            icon={<Server className="w-4 h-4" />}
            className="border-b-0 pb-0"
          />
        </div>

        <div className="divide-y divide-[var(--m-border)]">
          {deployedGatewayEndpoints.map((ep) => {
            const result = testResults[ep.name];
            const isTesting = testingEndpoint === ep.name;

            return (
              <div
                key={ep.path}
                className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[var(--m-surface-2)] transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold text-sm text-[var(--m-text-primary)] flex flex-wrap items-center gap-2">
                    <span>{ep.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-accent)] rounded font-mono break-all">
                      {ep.path}
                    </span>
                  </div>
                  {result && (
                    <div className="text-xs font-mono flex flex-wrap items-center gap-3 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          result.ok ? 'text-[var(--m-ok)]' : 'text-[var(--m-danger)]'
                        }`}
                      >
                        {result.ok ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {result.status}
                      </span>
                      <span className="text-[var(--m-text-muted)]">RTT: {result.durationMs} ms</span>
                      {result.summary && (
                        <span className="text-[var(--m-text-secondary)]">{result.summary}</span>
                      )}
                      {result.error && (
                        <span className="text-[var(--m-danger)] font-normal break-words max-w-md">
                          ({result.error})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => runLiveEndpointProbe(ep.name, ep.path)}
                  disabled={isTesting}
                  className="min-h-[44px] sm:min-h-[40px] px-3.5 py-2 bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-[var(--m-text-primary)] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 cursor-pointer m-focus-ring"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[var(--m-accent)] ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Probing…' : 'Execute Probe'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </DataPanel>
    </div>
  );
};
export default ApiDebugPage;
