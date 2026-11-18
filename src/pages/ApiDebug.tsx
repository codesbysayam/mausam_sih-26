import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Server, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await imdService.getDebugStats();
      setStats(res?.stats || null);
    } catch (e: any) {
      console.error('Debug stats fetch error:', e);
    } finally {
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
    <div id="mausam-data-sources-page" className="max-w-7xl mx-auto space-y-5 pb-12 text-[#F3F6FA]">
      {/* Unified Observatory Header */}
      <PageHeader
        eyebrow="Provider Registry & Telemetry Diagnostics"
        title="Data Sources & Upstream Diagnostics"
        description="Independent per-provider availability, measured upstream latency, server cache ratios, and live gateway endpoint verification."
        status={loading ? 'LOADING' : stats ? 'LIVE' : 'UNAVAILABLE'}
        source="MAUSAM Multi-Source Telemetry Gateway"
        actions={
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="min-h-[44px] sm:min-h-[40px] px-4 py-2 bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] hover:border-[#38536A] text-[#F3F6FA] rounded-lg font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 m-focus-ring"
          >
            <RefreshCw className={`w-4 h-4 text-[#35C7E8] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Server Stats</span>
          </button>
        }
      />

      {/* Independent Provider Store & System Health Console */}
      <MausamDataHealth onRefreshAll={fetchStats} />

      {/* Cache & Deduplication Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 tabular-nums">
        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[#8295A8]">
              Cache Hits
            </span>
            <Database className="w-4 h-4 text-[#22C7A0]" />
          </div>
          <MetricValue
            label="Memory Returns"
            value={typeof stats?.hits === 'number' ? stats.hits : null}
            hint="Served from server cache"
            unavailableLabel={loading ? 'Syncing…' : 'Unavailable'}
          />
        </DataPanel>

        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[#8295A8]">
              Cache Misses
            </span>
            <Server className="w-4 h-4 text-[#35C7E8]" />
          </div>
          <MetricValue
            label="Upstream Fetches"
            value={typeof stats?.misses === 'number' ? stats.misses : null}
            hint="Dispatched to providers"
            unavailableLabel={loading ? 'Syncing…' : 'Unavailable'}
          />
        </DataPanel>

        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[#8295A8]">
              Deduplicated Calls
            </span>
            <Clock className="w-4 h-4 text-[#35C7E8]" />
          </div>
          <MetricValue
            label="In-Flight Reuse"
            value={typeof stats?.dedupes === 'number' ? stats.dedupes : null}
            hint="Coalesced concurrent queries"
            unavailableLabel={loading ? 'Syncing…' : 'Unavailable'}
          />
        </DataPanel>

        <DataPanel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-[#8295A8]">
              Stale Serves
            </span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <MetricValue
            label="Graceful Degrades"
            value={typeof stats?.staleServes === 'number' ? stats.staleServes : null}
            hint="Cached fallback on upstream delay"
            unavailableLabel={loading ? 'Syncing…' : 'Unavailable'}
          />
        </DataPanel>
      </div>

      {/* Active Cache Entries */}
      {stats?.entries && stats.entries.length > 0 && (
        <DataPanel className="p-0 overflow-hidden tabular-nums">
          <div className="p-4 bg-[#08131F] border-b border-[#26394B] font-mono text-sm font-semibold text-[#F3F6FA] flex justify-between items-center">
            <span>In-Memory Cache Registry ({stats.entries.length} entries)</span>
            <span className="text-xs text-[#8295A8] font-normal">TTL: 60s – 300s</span>
          </div>
          <div className="divide-y divide-[#26394B] max-h-60 overflow-y-auto">
            {stats.entries.map((entry: any, i: number) => (
              <div
                key={i}
                className="p-3.5 text-xs font-mono flex items-center justify-between hover:bg-[#101F2E]/70 gap-3"
              >
                <span className="font-semibold text-[#B5C3D1] truncate">{entry.key}</span>
                <div className="flex items-center gap-4 text-[#8295A8] shrink-0">
                  <span>Hits: {entry.hitCount}</span>
                  <span
                    className={
                      entry.isExpired
                        ? 'text-[#FCD34D] font-bold'
                        : 'text-[#6EE7B7] font-bold'
                    }
                  >
                    {entry.isExpired ? 'STALE' : `Expires in ${entry.expiresInSec}s`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DataPanel>
      )}

      {/* Interactive Weather Condition & Animation System Test Bench */}
      <WeatherConditionTestBench />

      {/* Interactive Endpoint Validation Runner */}
      <DataPanel className="p-0 overflow-hidden tabular-nums">
        <div className="p-4 sm:p-5 bg-[#08131F] border-b border-[#26394B]">
          <SectionHeading
            title="Gateway & IMD Endpoint Validation Suite"
            subtitle="On-demand upstream latency probes and status inspection"
            icon={<Server className="w-4 h-4" />}
            className="border-b-0 pb-0"
          />
        </div>

        <div className="divide-y divide-[#26394B]">
          {testEndpoints.map((ep, idx) => {
            const result = testResults[ep.name];
            const isTesting = testingEndpoint === ep.name;

            return (
              <div
                key={idx}
                className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#101F2E]/60 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold text-sm text-[#F3F6FA] flex flex-wrap items-center gap-2">
                    <span>{ep.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-[#08131F] border border-[#26394B] text-[#35C7E8] rounded font-mono">
                      {ep.path}
                    </span>
                  </div>
                  {result && (
                    <div className="text-xs font-mono flex flex-wrap items-center gap-3 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          result.ok ? 'text-[#6EE7B7]' : 'text-[#FCA5A5]'
                        }`}
                      >
                        {result.ok ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {result.status.toUpperCase()}
                      </span>
                      <span className="text-[#8295A8]">Latency: {result.durationMs} ms</span>
                      {result.error && (
                        <span className="text-[#FCA5A5] font-normal truncate max-w-md">
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
                  className="min-h-[44px] sm:min-h-[40px] px-3.5 py-2 bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] hover:border-[#38536A] text-[#F3F6FA] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 cursor-pointer m-focus-ring"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#35C7E8] ${isTesting ? 'animate-spin' : ''}`} />
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
