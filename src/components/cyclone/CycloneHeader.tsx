import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Radio,
  Clock,
  ExternalLink,
  ChevronRight,
  Wifi,
} from 'lucide-react';
import { WeatherSystemEvent, CycloneProviderHealth } from '../../types/cyclone';

interface CycloneHeaderProps {
  activeSystem: WeatherSystemEvent | null;
  hasActiveMarineCyclone: boolean;
  providerHealth: {
    imdCyclone: CycloneProviderHealth;
    imdWarnings: CycloneProviderHealth;
    sachet: CycloneProviderHealth;
  };
  countdownSeconds: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const CycloneHeader: React.FC<CycloneHeaderProps> = ({
  activeSystem,
  hasActiveMarineCyclone,
  providerHealth,
  countdownSeconds,
  isRefreshing,
  onRefresh,
}) => {
  const getProviderBadge = (health: CycloneProviderHealth, label: string) => {
    const isLive = health.status === 'LIVE';
    const isStale = health.status === 'STALE';

    let colorClass = 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/40';
    let dotClass = 'bg-[#10B981]';
    let statusText = 'LIVE';

    if (isStale) {
      colorClass = 'bg-[#EAB308]/15 text-[#FDE047] border-[#EAB308]/40';
      dotClass = 'bg-[#EAB308]';
      statusText = 'RECENT';
    } else if (!isLive) {
      colorClass = 'bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/40';
      dotClass = 'bg-[#EF4444]';
      statusText = 'UNAVAILABLE';
    }

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border ${colorClass}`}
        title={`${label}: ${statusText}${health.latencyMs ? ` (${health.latencyMs}ms)` : ''}`}
      >
        <span className={`w-2 h-2 rounded-full ${dotClass} ${isLive ? 'animate-pulse' : ''}`} />
        <span className="font-semibold text-slate-300">{label}:</span>
        <strong className="font-bold">{statusText}</strong>
        {health.latencyMs && (
          <span className="text-[10px] opacity-75 font-normal">({health.latencyMs}ms)</span>
        )}
      </div>
    );
  };

  const isHistorical = activeSystem?.status === 'DISSIPATED';

  return (
    <div className="w-full bg-[#0B1523]/95 border border-[#1E3A5F] rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0284C7]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="flex flex-col gap-4 relative z-10">
        {/* Top bar: Classification badge + Live Provider Feeds */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E2E40]/80">
          <div className="flex items-center gap-2.5 flex-wrap">
            {hasActiveMarineCyclone ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E74C3C]/15 border border-[#E74C3C]/40 text-[#FF6B6B]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  {activeSystem?.classification.toUpperCase() || 'CYCLONE ALERT'}
                </span>
              </div>
            ) : isHistorical ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#64748B]/20 border border-[#64748B]/50 text-[#94A3B8]">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  HISTORICAL ARCHIVE • DISSIPATED
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981]">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  ALL CLEAR • NO ACTIVE CYCLONE
                </span>
              </div>
            )}

            <span className="text-xs font-mono text-[#94A3B8] hidden sm:inline-block">
              {activeSystem?.basin || 'North Indian Ocean (Bay of Bengal & Arabian Sea)'}
            </span>

            {activeSystem?.bulletinNumber && (
              <span className="px-2.5 py-1 rounded bg-[#132337] border border-[#25486F] text-[#93C5FD] text-[11px] font-mono font-medium">
                {activeSystem.bulletinNumber}
              </span>
            )}
          </div>

          {/* Right: Live Feed Diagnostics */}
          <div className="flex items-center gap-2 flex-wrap">
            {getProviderBadge(providerHealth.imdCyclone, 'IMD RSMC')}
            {getProviderBadge(providerHealth.imdWarnings, 'IMD CAP')}
            {getProviderBadge(providerHealth.sachet, 'NDMA SACHET')}
          </div>
        </div>

        {/* Main Title Banner & Refresh Controller */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#38BDF8] animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase font-mono">
                RSMC Tropical Cyclone Intelligence &amp; Synoptic Tracker
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-3xl leading-relaxed">
              Official 24x7 synoptic surveillance grounded in Regional Specialized Meteorological Centre (RSMC) New Delhi, India Meteorological Department (IMD) bulletins, and NDMA SACHET civil protection network.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            {/* Auto refresh counter */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#09111C] border border-[#1E2E40] text-xs font-mono text-[#94A3B8]">
              <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Sync in:</span>
              <strong className="text-white w-6 text-right">{countdownSeconds}s</strong>
            </div>

            {/* Manual refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] disabled:bg-[#1E2E40] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg disabled:cursor-not-allowed"
              title="Force ingest latest synoptic bulletins"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
