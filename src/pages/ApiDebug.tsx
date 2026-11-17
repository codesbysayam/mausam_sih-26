import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, Database, Server, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { imdService } from '../services/imdService';
import { MausamDataHealth } from '../components/common/MausamDataHealth';
import { WeatherConditionTestBench } from '../components/dev/WeatherConditionTestBench';

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
    <div id="mausam-data-sources-page" className="max-w-7xl mx-auto space-y-6 pb-12 text-[#F4F7FA]">
      {/* Unified Observatory Header */}
      <div className="bg-[#101B26] border border-white/12 p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Activity className="w-5 h-5 text-[#38BDF8]" />
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F4F7FA]">
              Data Sources, Provider Registry &amp; Telemetry Diagnostics
            </h1>
          </div>
          <p className="text-[#93A4B8] text-xs sm:text-sm">
            Independent per-provider availability, upstream latency telemetry, server cache hit ratios, and official endpoint verification.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="min-h-[40px] px-4 py-2 bg-[#162331] hover:bg-[#1E2E40] border border-white/12 text-[#F4F7FA] rounded-lg font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-[#38BDF8] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Server Stats</span>
        </button>
      </div>

      {/* Independent Provider Store & System Health Console */}
      <MausamDataHealth onRefreshAll={fetchStats} />

      {/* Cache & Deduplication Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 tabular-nums">
        <div className="bg-[#101B26] p-4 rounded-xl border border-white/12">
          <div className="flex items-center justify-between text-[#93A4B8] mb-2">
            <span className="text-xs font-mono font-semibold uppercase">Cache Hits</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[#F4F7FA] font-mono">{stats?.hits ?? 0}</div>
          <div className="text-xs text-[#93A4B8] mt-1">Server memory returns</div>
        </div>

        <div className="bg-[#101B26] p-4 rounded-xl border border-white/12">
          <div className="flex items-center justify-between text-[#93A4B8] mb-2">
            <span className="text-xs font-mono font-semibold uppercase">Cache Misses</span>
            <Server className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="text-2xl font-bold text-[#F4F7FA] font-mono">{stats?.misses ?? 0}</div>
          <div className="text-xs text-[#93A4B8] mt-1">Upstream requests dispatched</div>
        </div>

        <div className="bg-[#101B26] p-4 rounded-xl border border-white/12">
          <div className="flex items-center justify-between text-[#93A4B8] mb-2">
            <span className="text-xs font-mono font-semibold uppercase">Deduplicated Calls</span>
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-[#F4F7FA] font-mono">{stats?.dedupes ?? 0}</div>
          <div className="text-xs text-[#93A4B8] mt-1">In-flight concurrent reuse</div>
        </div>

        <div className="bg-[#101B26] p-4 rounded-xl border border-white/12">
          <div className="flex items-center justify-between text-[#93A4B8] mb-2">
            <span className="text-xs font-mono font-semibold uppercase">Stale Serves</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-[#F4F7FA] font-mono">{stats?.staleServes ?? 0}</div>
          <div className="text-xs text-[#93A4B8] mt-1">Cached serve during upstream delay</div>
        </div>
      </div>

      {/* Active Cache Entries */}
      {stats?.entries && stats.entries.length > 0 && (
        <div className="bg-[#101B26] rounded-2xl border border-white/12 overflow-hidden tabular-nums">
          <div className="p-4 bg-[#162331] border-b border-white/10 font-mono text-sm font-semibold text-[#F4F7FA] flex justify-between items-center">
            <span>In-Memory Cache Registry ({stats.entries.length} entries)</span>
            <span className="text-xs text-[#93A4B8] font-normal">TTL: 60s – 300s</span>
          </div>
          <div className="divide-y divide-white/10 max-h-60 overflow-y-auto">
            {stats.entries.map((entry: any, i: number) => (
              <div key={i} className="p-3 text-xs font-mono flex items-center justify-between hover:bg-[#162331]/60 gap-3">
                <span className="font-semibold text-[#CBD5E1] truncate">{entry.key}</span>
                <div className="flex items-center gap-4 text-[#93A4B8] shrink-0">
                  <span>Hits: {entry.hitCount}</span>
                  <span className={entry.isExpired ? 'text-amber-300 font-bold' : 'text-emerald-300 font-bold'}>
                    {entry.isExpired ? 'STALE' : `Expires in ${entry.expiresInSec}s`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Weather Condition & Animation System Test Bench */}
      <WeatherConditionTestBench />

      {/* Interactive Endpoint Validation Runner */}
      <div className="bg-[#101B26] rounded-2xl border border-white/12 overflow-hidden tabular-nums">
        <div className="p-4 bg-[#162331] border-b border-white/10 font-mono text-sm font-semibold text-[#F4F7FA] flex justify-between items-center gap-2">
          <span>Gateway &amp; IMD Endpoint Validation Suite</span>
          <span className="text-xs text-[#93A4B8] font-normal">On-demand upstream latency probes</span>
        </div>

        <div className="divide-y divide-white/10">
          {testEndpoints.map((ep, idx) => {
            const result = testResults[ep.name];
            const isTesting = testingEndpoint === ep.name;

            return (
              <div key={idx} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#162331]/50 transition-colors">
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold text-sm text-[#F4F7FA] flex flex-wrap items-center gap-2">
                    <span>{ep.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-[#0B1219] border border-white/10 text-[#38BDF8] rounded font-mono">
                      {ep.path}
                    </span>
                  </div>
                  {result && (
                    <div className="text-xs font-mono flex flex-wrap items-center gap-3 mt-1">
                      <span className={`inline-flex items-center gap-1 font-semibold ${result.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {result.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {result.status.toUpperCase()}
                      </span>
                      <span className="text-[#93A4B8]">Latency: {result.durationMs} ms</span>
                      {result.error && (
                        <span className="text-rose-300 font-normal truncate max-w-md">
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
                  className="min-h-[38px] px-3.5 py-1.5 bg-[#162331] hover:bg-[#1E2E40] border border-white/12 text-[#F4F7FA] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#38BDF8] ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing…' : 'Execute Probe'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default ApiDebugPage;
