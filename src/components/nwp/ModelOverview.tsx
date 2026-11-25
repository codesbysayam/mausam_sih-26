import React from 'react';
import {
  ExternalLink,
  Info,
  Layers,
} from 'lucide-react';
import { NWPModelId, NWP_MODEL_DEFINITIONS } from '../../data/nwpModels';
import { NWPModelRun } from '../../types/nwp';
import { DataPanel, SectionHeading, SourceStatus, ProvenanceStatus } from '../ui/ObservatoryPrimitives';

interface ModelOverviewProps {
  modelId: NWPModelId;
  runData?: NWPModelRun;
  ageLabel: string;
}

export const ModelOverview: React.FC<ModelOverviewProps> = ({
  modelId,
  runData,
  ageLabel,
}) => {
  const def = NWP_MODEL_DEFINITIONS[modelId];
  const isUnavailable = !runData || runData.status === 'UNAVAILABLE';

  const formatRunDate = (isoStr?: string) => {
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

  const provStatus: ProvenanceStatus = isUnavailable
    ? 'UNAVAILABLE'
    : runData?.status === 'LIVE'
    ? 'LIVE'
    : runData?.status === 'STALE'
    ? 'STALE'
    : 'RECENT';

  const modelFullName =
    modelId === 'ECMWF'
      ? 'ECMWF IFS HRES'
      : modelId === 'GEFS'
      ? 'NOAA GEFS v12 Global Ensemble'
      : 'IMD WRF-ARW Regional Model';

  const membersCount = runData?.ensembleStats?.membersCount ?? def.ensembleMembers;

  return (
    <div className="flex flex-col gap-3 w-full">
      <DataPanel className="flex flex-col gap-4">
        <SectionHeading
          title={`Model Overview — ${modelFullName}`}
          icon={<Layers className="w-4 h-4" />}
          action={
            <a
              href={def.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--m-accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>Official Documentation</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="m-panel-inset p-3 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Model</span>
              <span className="text-[var(--m-text-primary)] font-bold text-xs sm:text-sm truncate">{modelFullName}</span>
              <span className="text-[11px] text-[var(--m-text-muted)]">{def.modelFamily}</span>
            </div>

            <div className="m-panel-inset p-3 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Provider</span>
              <span className="text-[var(--m-text-primary)] font-semibold text-xs sm:text-sm truncate">
                {runData?.provider || def.provider.split('/')[0]}
              </span>
              <span className="text-[11px] text-[var(--m-text-muted)]">{def.domain}</span>
            </div>

            <div className="m-panel-inset p-3 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Run (UTC)</span>
              <span className="text-[var(--m-text-primary)] font-mono font-bold text-xs sm:text-sm tabular-nums truncate">
                {isUnavailable ? '—' : formatRunDate(runData?.runTime)}
              </span>
              <span className="text-[11px] text-[var(--m-text-muted)] font-mono">
                {isUnavailable ? 'No active cycle' : 'Synoptic cycle'}
              </span>
            </div>

            <div className="m-panel-inset p-3 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Resolution</span>
              <span className="text-[var(--m-text-primary)] font-mono font-bold text-xs sm:text-sm truncate">
                {runData?.resolution || def.spatialResolution || '—'}
              </span>
              <span className="text-[11px] text-[var(--m-text-muted)]">
                {membersCount && membersCount > 1 ? `${membersCount} Members` : 'Deterministic'}
              </span>
            </div>

            <div className="m-panel-inset p-3 flex flex-col gap-0.5 col-span-2">
              <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Forecast Range</span>
              <span className="text-[var(--m-text-primary)] font-bold text-xs sm:text-sm truncate">
                {isUnavailable
                  ? def.forecastRange
                  : runData?.forecastHours
                  ? `${runData.forecastHours} Hours (${Math.round(runData.forecastHours / 24)} Days)`
                  : def.forecastRange}
              </span>
              <span className="text-[11px] text-[var(--m-text-muted)]">Hourly temporal discretization</span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-[var(--m-border)] md:pl-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Feed Status</span>
                <SourceStatus
                  status={provStatus}
                  labelOverride={modelId === 'WRF' && isUnavailable ? 'DISABLED (OPTIONAL)' : undefined}
                />
              </div>

              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Last Synced</span>
                <span className="text-[var(--m-text-primary)] font-mono text-xs sm:text-sm font-semibold mt-0.5 tabular-nums">
                  {runData?.fetchedAt ? new Date(runData.fetchedAt).toLocaleTimeString() : '—'}
                </span>
                <span className="text-[11px] text-[var(--m-text-muted)] font-mono">Age: {ageLabel}</span>
              </div>
            </div>

            <div className="m-panel-inset p-3 flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">Source Delivery</span>
                <span className="text-[var(--m-text-primary)] text-xs font-medium truncate mt-0.5">
                  {runData?.source || (modelId === 'ECMWF' ? 'Open-Meteo → ECMWF IFS HRES' : def.provider)}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[10px] text-[var(--m-accent)] font-mono shrink-0">
                {isUnavailable ? 'Disconnected' : 'Verified Stream'}
              </span>
            </div>
          </div>
        </div>
      </DataPanel>

      {modelId === 'WRF' && isUnavailable && (
        <DataPanel id="wrf-informational-panel" variant="inset" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)] shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-[var(--m-text-primary)]">
                  WRF — Regional High-Resolution Forecast
                </h4>
                <span className="px-2 py-0.5 rounded bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[10px] font-mono text-[var(--m-text-secondary)]">
                  OPTIONAL · DISABLED
                </span>
              </div>

              <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed max-w-2xl">
                Optional integration disabled. Core MAUSAM services are operating using public ECMWF IFS and NOAA GEFS data sources. MAUSAM does not substitute another model for unavailable WRF data.
              </p>
            </div>
          </div>
        </DataPanel>
      )}
    </div>
  );
};
