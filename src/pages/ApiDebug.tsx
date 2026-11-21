import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Clock, AlertTriangle, CheckCircle, Activity, Info } from 'lucide-react';
import { imdService } from '../services/imdService';
import { MausamDataHealth } from '../components/common/MausamDataHealth';
import { WeatherConditionTestBench } from '../components/dev/WeatherConditionTestBench';
import {
  PageHeader,
  DataPanel,
  SectionHeading,
  MetricValue,
} from '../components/ui/ObservatoryPrimitives';

export const ApiDebugPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [gatewayLatencyMs, setGatewayLatencyMs] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  // Use the Vercel-deployed serverless health gateway. The old
  // /api/imd/debug/stats route exists in the Express development server,
  // but is not deployed as an individual Vercel function.
  const fetchStats = async () => {
    setLoading(true);
    const controller = new AbortController();
    const startedAt = performance.now();
    const timeoutId = window.setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch('/api/system?mode=health', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error || payload?.message || `Health gateway returned HTTP ${response.status}`
        );
      }

      if (
        !payload ||
        !payload.summary ||
        typeof payload.summary.totalProviders !== 'number' ||
        typeof payload.summary.operational !== 'number' ||
        !payload.providers ||
        typeof payload.providers !== 'object'
      ) {
        throw new Error('Health gateway returned an invalid diagnostics payload.');
      }

      setStats(payload);
      setGatewayError(null);
      setGatewayLatencyMs(Math.round(performance.now() - startedAt));
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'The health gateway timed out after 7 seconds.'
            : error.message
          : 'Unknown gateway connection failure';

      setStats(null);
      setGatewayError(message);
      setGatewayLatencyMs(null);
      console.error('[MAUSAM Diagnostics] Health gateway request failed:', error);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const runEndpointTest = async (name: string, fn: () => Promise<any>) => {
    setTestingEndpoint(name);
    const start = performance.now();
    try {
      const res = await fn();
      const duration = Math.round(performance.now() - start);
      setTestResults((prev) => ({
        ...prev,
        [name]: {
          status: res?.status || 'success',
          ok: res?.status === 'success' || res?.status === 'stale',
          durationMs: duration,
          data: res?.data,
          error: res?.error,
          fetchedAt: res?.fetchedAt,
          stale: res?.stale,
        },
      }));
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setTestResults((prev) => ({
        ...prev,
        [name]: {
          status: 'error',
          ok: false,
          durationMs: duration,
          error: { message: err.message },
        },
      }));
    } finally {
      setTestingEndpoint(null);
      fetchStats();
    }
  };

  const testEndpoints = [
    { name: 'Current Weather (National/All)', path: '/api/imd/current-weather', fn: () => imdService.getCurrentWeather() },
    { name: 'Current Weather (Bhubaneswar - 42971)', path: '/api/imd/current-weather/42971', fn: () => imdService.getCurrentWeather('42971') },
    { name: 'City Forecast (Delhi - 42182)', path: '/api/imd/city-forecast/42182', fn: () => imdService.getCityForecast('42182') },
    { name: 'District Warnings', path: '/api/imd/district-warning', fn: () => imdService.getDistrictWarnings() },
    { name: 'State Rainfall', path: '/api/imd/state-rainfall', fn: () => imdService.getStateRainfall() },
    { name: 'AWS Surface Telemetry', path: '/api/imd/aws', fn: () => imdService.getAWSData() },
    { name: 'Sun/Moon Ephemeris (20.3°N, 85.8°E)', path: '/api/imd/sunmoon', fn: () => imdService.getSunMoon(20.2961, 85.8245) },
    { name: 'Cyclone Bundle (Track/Wind/Cone)', path: '/api/imd/cyclone-bundle', fn: () => imdService.getCycloneBundle() },
    { name: 'Marine Bulletins (Port/Sea/Coastal)', path: '/api/imd/marine-bundle', fn: () => imdService.getMarineBundle() },
    { name: 'National Synoptic Overview', path: '/api/imd/overview', fn: () => imdService.getNationalOverview() },
    { name: 'AQI Provider Telemetry', path: '/api/imd/environment/aqi', fn: () => imdService.getAQI(28.61, 77.20, 'Delhi') },
    { name: 'Pollen Provider Telemetry', path: '/api/imd/environment/pollen', fn: () => imdService.getPollen(28.61, 77.20) },
  ];

  return (
    <div id="mausam-data-sources-page" className="max-w-7xl mx-auto space-y-5 pb-12 text-[var(--m-text-primary)]">
      {/* Unified Observatory Header */}
      <PageHeader
        eyebrow="Provider Registry & Telemetry Diagnostics"
        title="Data Sources & Upstream Diagnostics"
        description="Live serverless gateway verification, independent upstream provider health, and measured response latency. Cache and request counters are displayed only when the deployed backend reports them."
        status={
          loading
            ? 'LOADING'
            : !stats
            ? 'UNAVAILABLE'
            : stats.status === 'HEALTHY'
            ? 'LIVE'
            : 'STALE'
        }
        statusLabel={
          loading
            ? 'CHECKING GATEWAY'
            : !stats
            ? 'GATEWAY UNREACHABLE'
            : stats.status === 'HEALTHY'
            ? 'GATEWAY HEALTHY'
            : 'GATEWAY DEGRADED'
        }
        source="MAUSAM Serverless Health Gateway · /api/system?mode=health"
        actions={
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="min-h-[44px] sm:min-h-[40px] px-4 py-2 bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-[var(--m-text-primary)] rounded-lg font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 m-focus-ring"
          >
            <RefreshCw className={`w-4 h-4 text-[var(--m-accent)] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Server Stats</span>
          </button>
        }
      />

      {gatewayError && (
        <DataPanel className="border border-[var(--m-danger)]/35">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle className="w-5 h-5 text-[var(--m-danger)] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--m-text-primary)]">Gateway health check failed</p>
                <p className="text-xs text-[var(--m-text-secondary)] mt-1 break-words">{gatewayError}</p>
                <p className="text-[11px] text-[var(--m-text-muted)] mt-1 font-mono">GET /api/system?mode=health</p>
              </div>
            </div>
            <button type="button" onClick={fetchStats} disabled={loading} className="min-h-[40px] px-3 py-2 rounded-lg border border-[var(--m-border-strong)] text-xs font-semibold disabled:opacity-50">
              Retry gateway
            </button>
          </div>
        </DataPanel>
      )}

      {/* Independent Provider Store & System Health Console */}
      <MausamDataHealth onRefreshAll={fetchStats} />

      {/* Metrics sourced from the deployed health response only. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 tabular-nums">
        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[var(--m-text-muted)]">Operational Providers</span>
            <CheckCircle className="w-4 h-4 text-[var(--m-ok)]" />
          </div>
          <MetricValue label="Verified upstreams" value={typeof stats?.summary?.operational === 'number' ? stats.summary.operational : null} hint="Successful live health probes" unavailableLabel={loading ? 'Checking…' : 'Not reported'} />
        </DataPanel>

        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[var(--m-text-muted)]">Unavailable Providers</span>
            <AlertTriangle className="w-4 h-4 text-[var(--m-danger)]" />
          </div>
          <MetricValue label="Failed or degraded probes" value={typeof stats?.summary?.totalProviders === 'number' && typeof stats?.summary?.operational === 'number' && typeof stats?.summary?.notConfigured === 'number' ? Math.max(0, stats.summary.totalProviders - stats.summary.operational - stats.summary.notConfigured) : null} hint="Configured providers not responding" unavailableLabel={loading ? 'Checking…' : 'Not reported'} />
        </DataPanel>

        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[var(--m-text-muted)]">Not Configured</span>
            <Info className="w-4 h-4 text-[var(--m-accent)]" />
          </div>
          <MetricValue label="Optional integrations" value={typeof stats?.summary?.notConfigured === 'number' ? stats.summary.notConfigured : null} hint="Credentials or integration not configured" unavailableLabel={loading ? 'Checking…' : 'Not reported'} />
        </DataPanel>

        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[var(--m-text-muted)]">Gateway Response</span>
            <Clock className="w-4 h-4 text-[var(--m-accent)]" />
          </div>
          <MetricValue label="Browser-to-gateway round trip" value={gatewayLatencyMs} unit="ms" hint="Measured for this health request" unavailableLabel={loading ? 'Measuring…' : 'Not measured'} />
        </DataPanel>
      </div>

      {/* Interactive Weather Condition & Animation System Test Bench */}
      <WeatherConditionTestBench />

      {/* Interactive Endpoint Validation Runner */}
      <DataPanel className="p-0 overflow-hidden tabular-nums">
        <div className="p-4 sm:p-5 bg-[var(--m-surface-2)] border-b border-[var(--m-border)]">
          <SectionHeading
            title="Gateway & IMD Endpoint Validation Suite"
            subtitle="On-demand upstream latency probes and status inspection"
            icon={<Server className="w-4 h-4" />}
            className="border-b-0 pb-0"
          />
        </div>

        <div className="divide-y divide-[var(--m-border)]">
          {testEndpoints.map((ep, idx) => {
            const result = testResults[ep.name];
            const isTesting = testingEndpoint === ep.name;

            return (
              <div
                key={idx}
                className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[var(--m-surface-2)] transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold text-sm text-[var(--m-text-primary)] flex flex-wrap items-center gap-2">
                    <span>{ep.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-accent)] rounded font-mono">
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
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {result.status.toUpperCase()}
                      </span>
                      <span className="text-[var(--m-text-muted)]">Latency: {result.durationMs} ms</span>
                      {result.error && (
                        <span className="text-[var(--m-danger)] font-normal truncate max-w-md">
                          ({result.error.code || 'ERR'}: {result.error.message})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => runEndpointTest(ep.name, ep.fn)}
                  disabled={isTesting}
                  className="min-h-[44px] sm:min-h-[40px] px-3.5 py-2 bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-[var(--m-text-primary)] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 cursor-pointer m-focus-ring"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[var(--m-accent)] ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing…' : 'Execute Probe'}</span>
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
