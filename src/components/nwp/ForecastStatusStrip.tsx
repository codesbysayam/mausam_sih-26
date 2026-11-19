import React from 'react';
import { Activity, Clock, Calendar, Database, ShieldCheck } from 'lucide-react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelRun } from '../../types/nwp';
import { SourceStatus, ProvenanceStatus } from '../ui/ObservatoryPrimitives';

interface ForecastStatusStripProps {
  modelId: NWPModelId;
  runData?: NWPModelRun;
  ageLabel: string;
}

export const ForecastStatusStrip: React.FC<ForecastStatusStripProps> = ({
  modelId,
  runData,
  ageLabel,
}) => {
  const isUnavailable = !runData || runData.status === 'UNAVAILABLE';
  const provStatus: ProvenanceStatus = isUnavailable
    ? 'UNAVAILABLE'
    : runData?.status === 'LIVE'
    ? 'LIVE'
    : runData?.status === 'STALE'
    ? 'STALE'
    : 'RECENT';

  const formatUtcRun = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '—';
      const day = d.getUTCDate();
      const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const hours = String(d.getUTCHours()).padStart(2, '0');
      return `${day} ${month} ${hours}Z UTC`;
    } catch {
      return '—';
    }
  };

  return (
    <div
      id="nwp-forecast-status-strip"
      className="w-full m-panel px-4 py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-xs no-scrollbar"
    >
      <div className="flex items-center gap-5 whitespace-nowrap min-w-0">
        <SourceStatus
          status={provStatus}
          labelOverride={
            modelId === 'WRF' && isUnavailable
              ? 'WRF NOT CONFIGURED'
              : `${modelId} ${provStatus}`
          }
        />

        <span className="text-[#26394B] hidden sm:inline">|</span>

        <div className="flex items-center gap-1.5 font-mono">
          <Clock className="w-3.5 h-3.5 text-[var(--m-accent)]" />
          <span className="text-[10px] uppercase text-[var(--m-text-muted)]">Run:</span>
          <span className="text-[var(--m-text-primary)] font-medium tabular-nums">
            {isUnavailable ? '—' : formatUtcRun(runData?.runTime)}
          </span>
        </div>

        <span className="text-[#26394B] hidden md:inline">|</span>

        <div className="flex items-center gap-1.5 font-mono">
          <Calendar className="w-3.5 h-3.5 text-[var(--m-ok)]" />
          <span className="text-[10px] uppercase text-[var(--m-text-muted)]">Horizon:</span>
          <span className="text-[var(--m-text-primary)] font-medium tabular-nums">
            {isUnavailable ? '—' : runData?.forecastHours ? `0–${Math.round(runData.forecastHours / 24)}D` : '—'}
          </span>
        </div>

        <span className="text-[#26394B] hidden lg:inline">|</span>

        <div className="flex items-center gap-1.5 font-mono">
          <Activity className="w-3.5 h-3.5 text-[var(--m-watch)]" />
          <span className="text-[10px] uppercase text-[var(--m-text-muted)]">Age:</span>
          <span className="text-[var(--m-text-primary)] font-medium tabular-nums">{ageLabel}</span>
        </div>

        <span className="text-[#26394B] hidden xl:inline">|</span>

        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[var(--m-accent)]" />
          <span className="text-[10px] font-mono uppercase text-[var(--m-text-muted)]">Source:</span>
          <span className="text-[var(--m-text-secondary)] text-xs truncate max-w-[220px]">
            {runData?.source || (modelId === 'ECMWF' ? 'Open-Meteo → ECMWF' : runData?.provider || 'Unconfigured')}
          </span>
        </div>
      </div>

      <div className="hidden 2xl:flex items-center gap-1.5 text-[11px] text-[var(--m-text-muted)] shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-[var(--m-ok)]" />
        <span>Zero Synthetic Fallback</span>
      </div>
    </div>
  );
};
