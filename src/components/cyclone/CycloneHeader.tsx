import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { WeatherSystemEvent, CycloneProviderHealth } from '../../types/cyclone';
import { PageHeader, ProvenanceStatus, SourceStatus } from '../ui/ObservatoryPrimitives';

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

function mapProviderToProvenance(status: CycloneProviderHealth['status']): ProvenanceStatus {
  if (status === 'LIVE') return 'LIVE';
  if (status === 'RECENT') return 'RECENT';
  if (status === 'STALE') return 'STALE';
  return 'UNAVAILABLE';
}

export const CycloneHeader: React.FC<CycloneHeaderProps> = ({
  activeSystem,
  hasActiveMarineCyclone,
  providerHealth,
  countdownSeconds,
  isRefreshing,
  onRefresh,
}) => {
  const anyLive =
    providerHealth.imdCyclone.status === 'LIVE' ||
    providerHealth.imdWarnings.status === 'LIVE' ||
    providerHealth.sachet.status === 'LIVE';
  const anyStale =
    providerHealth.imdCyclone.status === 'STALE' ||
    providerHealth.imdWarnings.status === 'STALE' ||
    providerHealth.sachet.status === 'STALE';

  const overallStatus: ProvenanceStatus = isRefreshing && !anyLive
    ? 'LOADING'
    : anyLive
    ? hasActiveMarineCyclone
      ? 'LIVE'
      : 'ALL_CLEAR'
    : anyStale
    ? 'STALE'
    : 'UNAVAILABLE';

  const latestFetch =
    providerHealth.imdCyclone.lastFetch ||
    providerHealth.imdWarnings.lastFetch ||
    providerHealth.sachet.lastFetch ||
    null;

  const formattedUpdated = latestFetch
    ? new Date(latestFetch).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    : 'Feed Unreachable';

  const renderProviderChip = (health: CycloneProviderHealth, label: string) => {
    const prov = mapProviderToProvenance(health.status);
    const suffix =
      health.latencyMs !== null && health.latencyMs !== undefined
        ? `${health.latencyMs}ms`
        : undefined;
    return (
      <div
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#08131F] border border-[#26394B] text-[11px]"
        title={`${label}: ${health.status}${suffix ? ` (${suffix})` : ''}`}
      >
        <SourceStatus status={prov} labelOverride={`${label}: ${prov}`} />
        {suffix && (
          <span className="font-mono text-[10px] text-[#8295A8] tabular-nums">{suffix}</span>
        )}
      </div>
    );
  };

  return (
    <PageHeader
      eyebrow="RSMC NEW DELHI · IMD · NDMA SACHET"
      title="RSMC Tropical Cyclone Intelligence & Synoptic Tracker"
      description="24x7 basin surveillance grounded in RSMC New Delhi Sea Area Bulletins, IMD Cyclone Warning Division advisories, and SACHET civil alerts."
      coordinates={activeSystem?.basin || 'North Indian Ocean'}
      status={overallStatus}
      statusLabel={
        hasActiveMarineCyclone
          ? activeSystem?.classification.toUpperCase() || 'CYCLONE ALERT'
          : overallStatus === 'UNAVAILABLE'
          ? 'FEED UNAVAILABLE'
          : overallStatus === 'STALE'
          ? 'CACHED / STALE'
          : 'ALL CLEAR · NO ACTIVE CYCLONE'
      }
      source={activeSystem?.bulletinNumber || 'RSMC Sea Area Bulletin'}
      updatedAt={formattedUpdated}
      actions={
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-[#08131F] border border-[#26394B] text-xs font-mono text-[#B5C3D1] tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[#35C7E8]" />
            <span>Sync in</span>
            <strong className="text-[#F3F6FA] w-6 text-right">{countdownSeconds}s</strong>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 min-h-[40px] rounded-lg bg-[#0B72B9] hover:bg-[#095C96] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed m-focus-ring"
            title="Force ingest latest synoptic bulletins"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing' : 'Refresh'}</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {renderProviderChip(providerHealth.imdCyclone, 'IMD RSMC')}
        {renderProviderChip(providerHealth.imdWarnings, 'IMD CAP')}
        {renderProviderChip(providerHealth.sachet, 'SACHET')}
      </div>
    </PageHeader>
  );
};
