// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// RSMC Tropical Cyclone Intelligence & Synoptic Tracker
// ====================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Compass,
  RefreshCw,
  ShieldCheck,
  Orbit,
  Ship,
  Info,
} from 'lucide-react';
import {
  CyclonePayload,
  WeatherSystemEvent,
} from '../types/cyclone';
import {
  cycloneLiveDataService,
  MarineWarningInfo,
  SystemStatusSummary,
} from '../services/CycloneLiveDataService';
import { CycloneHeader } from '../components/cyclone/CycloneHeader';
import { CycloneSystemOverview } from '../components/cyclone/CycloneSystemOverview';
import { CycloneThreatMatrix } from '../components/cyclone/CycloneThreatMatrix';
import { CycloneTrackMap } from '../components/cyclone/CycloneTrackMap';
import { CycloneStateMatrix } from '../components/cyclone/CycloneStateMatrix';
import { CycloneGuidancePanel } from '../components/cyclone/CycloneGuidancePanel';
import {
  DataPanel,
  SectionHeading,
  SeverityBanner,
  SourceStatus,
} from '../components/ui/ObservatoryPrimitives';

export const CycloneTrackerPage: React.FC = () => {
  const [payload, setPayload] = useState<CyclonePayload | null>(() =>
    cycloneLiveDataService.getCachedPayload()
  );
  const [isLoading, setIsLoading] = useState<boolean>(!payload);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(60);
  const [marineWarning, setMarineWarning] = useState<MarineWarningInfo | null>(null);

  const loadData = useCallback(async (force = false) => {
    if (force) setIsRefreshing(true);
    try {
      const data = await cycloneLiveDataService.fetchCycloneData(force);
      setPayload(data);
      const marine = await cycloneLiveDataService.fetchMarineWarning();
      setMarineWarning(marine);

      setSelectedSystemId((prev) => {
        if (prev && (prev === 'ALL_CLEAR_SURVEILLANCE' || data.systems.some((s) => s.id === prev))) {
          return prev;
        }
        const active = data.systems.find((s) => s.status === 'ACTIVE');
        return active ? active.id : data.systems.length > 0 ? data.systems[0].id : null;
      });
      setCountdownSeconds(60);
    } catch (err) {
      console.error('[CycloneTracker] Load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);

    const unsubscribe = cycloneLiveDataService.subscribe((data) => {
      setPayload(data);
      setSelectedSystemId((prev) => {
        if (prev && (prev === 'ALL_CLEAR_SURVEILLANCE' || data.systems.some((s) => s.id === prev))) {
          return prev;
        }
        const active = data.systems.find((s) => s.status === 'ACTIVE');
        return active ? active.id : data.systems.length > 0 ? data.systems[0].id : null;
      });
    });

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [loadData]);

  const systemStatus: SystemStatusSummary = useMemo(() => {
    return cycloneLiveDataService.getSystemStatus();
  }, [payload]);

  const providerHealth = cycloneLiveDataService.getProviderHealth();
  const allProvidersUnavailable =
    providerHealth.imdCyclone.status === 'UNAVAILABLE' &&
    providerHealth.imdWarnings.status === 'UNAVAILABLE' &&
    providerHealth.sachet.status === 'UNAVAILABLE';

  const activeSystem: WeatherSystemEvent | null = useMemo(() => {
    if (!payload || payload.systems.length === 0) return null;
    if (selectedSystemId === 'ALL_CLEAR_SURVEILLANCE') return null;
    if (!selectedSystemId) return payload.systems[0];
    return payload.systems.find((s) => s.id === selectedSystemId) || payload.systems[0];
  }, [payload, selectedSystemId]);

  const systems = payload?.systems || [];
  const activeSystemsSummary = useMemo(() => {
    const activeList = systems.filter((s) => s.status === 'ACTIVE');
    if (activeList.length === 0) {
      return 'Official IMD and RSMC New Delhi bulletins report normal sea conditions with no active cyclonic disturbance across Indian basins.';
    }
    return `Monitored disturbances (${activeList.length}): ${activeList.map((s) => s.name).join(' · ')}.`;
  }, [systems]);

  return (
    <div className="w-full text-[var(--m-text-primary)] pb-14 flex flex-col gap-5 max-w-7xl mx-auto">
      {/* 1. Official Header & Live Provider Diagnostics */}
      <CycloneHeader
        activeSystem={activeSystem}
        hasActiveMarineCyclone={systemStatus.hasActiveMarineCyclone}
        providerHealth={providerHealth}
        countdownSeconds={countdownSeconds}
        isRefreshing={isRefreshing}
        onRefresh={() => loadData(true)}
      />

      {/* 2. Synoptic Status Hero Banner */}
      {allProvidersUnavailable ? (
        <SeverityBanner
          state="UNAVAILABLE"
          title="Upstream RSMC / IMD / SACHET Synoptic Gateway Unreachable"
          description="Live marine cyclone bulletins could not be verified from upstream servers. This does not confirm an all-clear; reference synoptic archive entries are shown below with unavailable feed provenance."
          source={providerHealth.imdCyclone.error || 'RSMC New Delhi / IMD / NDMA SACHET'}
          action={
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-xs font-semibold text-[var(--m-text-primary)] transition-colors cursor-pointer m-focus-ring"
            >
              Retry Sync
            </button>
          }
        />
      ) : !systemStatus.hasActiveMarineCyclone ? (
        <SeverityBanner
          state="ALL_CLEAR"
          title="No Active Cyclonic Disturbance Reported Over Indian Seas"
          description={activeSystemsSummary}
          source="IMD RSMC New Delhi Sea Area Bulletin"
        />
      ) : (
        <SeverityBanner
          state="SEVERE"
          title={`${activeSystem?.classification.toUpperCase() || 'CYCLONE'}: ${activeSystem?.name || 'Active Marine Disturbance'}`}
          description={activeSystem?.advisoryText || 'Severe cyclonic warning in effect for Indian coastal sectors.'}
          source={activeSystem?.bulletinNumber || 'IMD Cyclone Warning Division'}
        />
      )}

      {/* 3. Multi-Disturbance Surveillance Selector Tabs */}
      <DataPanel className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--m-text-secondary)] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[var(--m-accent)]" />
            <span>Monitored Synoptic Disturbances &amp; Archives</span>
          </span>
          <span className="text-[11px] font-mono text-[var(--m-text-muted)]">
            Select basin or disturbance to inspect synoptic track parameters
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedSystemId('ALL_CLEAR_SURVEILLANCE')}
            className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 border m-focus-ring ${
              selectedSystemId === 'ALL_CLEAR_SURVEILLANCE'
                ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] border-[var(--m-accent)]'
                : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)]'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${selectedSystemId === 'ALL_CLEAR_SURVEILLANCE' ? 'text-white' : 'text-[var(--m-ok)]'}`} />
            <span>North Indian Ocean (Basin)</span>
          </button>

          {systems.map((s) => {
            const isSelected = activeSystem?.id === s.id && selectedSystemId !== 'ALL_CLEAR_SURVEILLANCE';
            const isHistorical = s.status === 'DISSIPATED';
            const isInland = s.basin === 'Inland Central India';

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSystemId(s.id)}
                className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 border m-focus-ring ${
                  isSelected
                    ? isHistorical
                      ? 'bg-[var(--m-surface-3)] border-[var(--m-border-strong)] text-[var(--m-text-primary)]'
                      : 'bg-[var(--m-accent)] border-[var(--m-accent)] text-[var(--m-on-accent)]'
                    : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)]'
                }`}
              >
                <Orbit className={`w-3.5 h-3.5 shrink-0 ${isSelected && !isHistorical ? 'text-white' : isHistorical ? 'text-[var(--m-text-muted)]' : 'text-[var(--m-accent)]'}`} />
                <span>
                  {isInland ? 'Inland ' : ''}
                  {s.classification}
                </span>
                {isHistorical && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[10px] text-[var(--m-text-muted)] font-normal">
                    Archived
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </DataPanel>

      {/* Loading State */}
      {isLoading && !payload && (
        <DataPanel className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-7 h-7 text-[var(--m-accent)] animate-spin" />
          <span className="text-xs font-mono text-[var(--m-text-secondary)]">
            Fetching synoptic bulletins from RSMC New Delhi and IMD…
          </span>
        </DataPanel>
      )}

      {/* 4. Active System Overview or Basin Surveillance Details */}
      {activeSystem ? (
        <>
          <CycloneSystemOverview
            activeSystem={activeSystem}
            hasActiveMarineCyclone={systemStatus.hasActiveMarineCyclone}
          />
          <div data-theme="dark-workspace" className="rounded-xl overflow-hidden">
            <CycloneTrackMap activeSystem={activeSystem} />
          </div>
          <CycloneThreatMatrix activeSystem={activeSystem} />
        </>
      ) : (
        <>
          <div data-theme="dark-workspace" className="rounded-xl overflow-hidden">
            <CycloneTrackMap activeSystem={null} />
          </div>

          {marineWarning && (
            <DataPanel className="flex flex-col gap-4">
              <SectionHeading
                title={marineWarning.title}
                subtitle="IMD RSMC New Delhi Coastal & Offshore Maritime Surveillance"
                icon={<Ship className="w-4 h-4" />}
                badge={
                  <SourceStatus
                    status={allProvidersUnavailable ? 'UNAVAILABLE' : marineWarning.status === 'WARNING_ACTIVE' ? 'LIVE' : 'ALL_CLEAR'}
                    labelOverride={allProvidersUnavailable ? 'UNVERIFIED' : marineWarning.status === 'WARNING_ACTIVE' ? 'WARNING ACTIVE' : 'NO ACTIVE MARINE THREAT'}
                  />
                }
              />

              <p className="text-xs sm:text-sm text-[var(--m-text-secondary)] leading-relaxed">
                {marineWarning.bulletinText}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="m-panel-inset p-3.5 text-xs font-mono">
                  <span className="text-[var(--m-text-muted)] block text-[10px] uppercase tracking-wider mb-1">
                    Bay of Bengal Sector
                  </span>
                  <strong className="text-[var(--m-text-primary)]">{marineWarning.seaAreas.bayOfBengal}</strong>
                </div>
                <div className="m-panel-inset p-3.5 text-xs font-mono">
                  <span className="text-[var(--m-text-muted)] block text-[10px] uppercase tracking-wider mb-1">
                    Arabian Sea Sector
                  </span>
                  <strong className="text-[var(--m-text-primary)]">{marineWarning.seaAreas.arabianSea}</strong>
                </div>
              </div>

              <div className="rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] px-3.5 py-3 text-xs text-[var(--m-text-secondary)] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--m-text-primary)]">Fishermen Advisory:</strong>{' '}
                  {marineWarning.fishermenAdvisory}
                </span>
              </div>
            </DataPanel>
          )}
        </>
      )}

      {/* 5. Warning Readout Service & Emergency Helplines */}
      <CycloneGuidancePanel
        activeSystem={activeSystem}
        marineBulletinText={marineWarning?.bulletinText}
      />

      {/* 6. State & UT Warning Engine */}
      <CycloneStateMatrix
        regionalWarnings={payload?.regionalWarnings || []}
      />
    </div>
  );
};

export default CycloneTrackerPage;
