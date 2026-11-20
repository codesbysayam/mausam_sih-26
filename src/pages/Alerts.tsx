import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Megaphone, RefreshCw, Volume2, X } from 'lucide-react';
import { WeatherDataBundle } from '../services/weatherService';
import { LocationRecord } from '../types';
import {
  WarningRecord,
  WarningFilterState,
  StateWarningSummary,
} from '../types/warningTypes';
import { warningService as canonicalWarningService } from '../services/warnings/warningService';
import { warningService as warningHelperService } from '../services/warningService';
import { weatherWarningToRecord } from '../services/warnings/warningAdapter';
import { WarningFeedDiagnostics } from '../types/warnings';
import { WarningHeader } from '../components/warnings/WarningHeader';
import { NationalAlertStatus } from '../components/warnings/NationalAlertStatus';
import { WarningTicker } from '../components/warnings/WarningTicker';
import { WeatherNewsSection } from '../components/warnings/WeatherNewsSection';
import { useAlertAudio } from '../hooks/useAlertAudio';
import { WarningFilterBar } from '../components/warnings/WarningFilterBar';
import { NationalWarningMap } from '../components/warnings/NationalWarningMap';
import { StateWatchlistPanel } from '../components/warnings/StateWatchlistPanel';
import { WarningList } from '../components/warnings/WarningList';
import { WarningDetailDrawer } from '../components/warnings/WarningDetailDrawer';
import { SafetyGuidanceSection } from '../components/warnings/SafetyGuidanceSection';
import { EmergencyResponseSection } from '../components/warnings/EmergencyResponseSection';
import { NationalClassificationMatrix } from '../components/warnings/NationalClassificationMatrix';
import { useProvider } from '../store/providerStore';
import { getAlertFeedAvailability } from '../services/providers/providerStatus';
import { formatIndianDateTime } from '../utils/dateUtils';
import { formatCoordinatePair } from '../../shared/weatherContract';
import {
  ProvenanceStatus,
  SectionHeading,
  SeverityBanner,
} from '../components/ui/ObservatoryPrimitives';

interface AlertsPageProps {
  weatherBundle?: WeatherDataBundle;
  selectedLocation?: LocationRecord;
}

const INITIAL_FILTER_STATE: WarningFilterState = {
  region: 'all',
  state: 'all',
  hazard: 'all',
  severity: 'all',
  validity: 'all',
  searchQuery: '',
};

export const AlertsPage: React.FC<AlertsPageProps> = ({
  selectedLocation,
}) => {
  const [warningsList, setWarningsList] = useState<WarningRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<WarningFeedDiagnostics | null>(null);
  const [isFeedUnavailable, setIsFeedUnavailable] = useState<boolean>(false);
  const [filter, setFilter] = useState<WarningFilterState>(INITIAL_FILTER_STATE);
  const [selectedDrawerWarning, setSelectedDrawerWarning] = useState<WarningRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertSurgeNotice, setAlertSurgeNotice] = useState<string | null>(null);

  const { state: sachetState, refresh: refreshSachetStore } = useProvider('SACHET');
  const sachetAvailability = getAlertFeedAvailability(sachetState);
  const effectiveUnavailable = isFeedUnavailable || sachetAvailability === 'UNAVAILABLE';

  const { isAudioAlertEnabled } = useAlertAudio({
    warnings: warningsList,
    onNewAlertTriggered: (newWarning) => {
      setAlertSurgeNotice(
        `New ${newWarning.severity?.toUpperCase() || 'OFFICIAL'} Alert: ${newWarning.title || 'Severe Weather Warning'}`
      );
      setTimeout(() => setAlertSurgeNotice(null), 8000);
    },
  });

  const loadWarnings = useCallback(async (force = false) => {
    setIsRefreshing(true);
    try {
      const { activeWarnings, diagnostics: diag } = await canonicalWarningService.fetchWarnings(force);
      setDiagnostics(diag);

      if (diag.status === 'UNAVAILABLE') {
        setIsFeedUnavailable(true);
        setWarningsList([]);
      } else {
        setIsFeedUnavailable(false);
        const mappedRecords = activeWarnings.map(weatherWarningToRecord);
        setWarningsList(mappedRecords);
      }
    } catch {
      setIsFeedUnavailable(true);
      setWarningsList([]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWarnings(false);
  }, [loadWarnings]);

  const regionalAlertsRef = useRef<HTMLDivElement>(null);

  const reconciled = useMemo(() => {
    return warningHelperService.reconcileNationalWarnings(warningsList, {
      isUnavailable: effectiveUnavailable,
    });
  }, [warningsList, effectiveUnavailable]);

  const filteredWarnings = useMemo(() => {
    return warningHelperService.filterWarnings(reconciled.activeWarnings, filter);
  }, [reconciled.activeWarnings, filter]);

  const stats = useMemo(() => {
    return warningHelperService.calculateStats(warningsList, effectiveUnavailable);
  }, [warningsList, effectiveUnavailable]);

  const overallStatus = useMemo(() => {
    return warningHelperService.getNationalOverallStatus(warningsList);
  }, [warningsList]);

  const handleRefresh = useCallback(() => {
    loadWarnings(true);
    refreshSachetStore(true).catch(() => {});
  }, [loadWarnings, refreshSachetStore]);

  const handleOpenWarningDetails = useCallback((warning: WarningRecord) => {
    setSelectedDrawerWarning(warning);
    setIsDrawerOpen(true);
  }, []);

  const handleSelectStateFromMap = useCallback((stateName: string) => {
    setFilter((prev) => ({
      ...prev,
      state: stateName === 'All India' ? 'all' : stateName,
    }));
  }, []);

  const handleOpenStateSummary = useCallback(
    (summary: StateWarningSummary) => {
      const matchedWarning = warningsList.find(
        (w) =>
          w.state.toLowerCase() === summary.stateName.toLowerCase() ||
          w.stateCode.toLowerCase() === summary.stateCode.toLowerCase()
      );

      if (matchedWarning) {
        handleOpenWarningDetails(matchedWarning);
      } else {
        setFilter((prev) => ({
          ...prev,
          state: summary.stateName,
        }));
      }
    },
    [warningsList, handleOpenWarningDetails]
  );

  const handleViewOnMap = useCallback((warning: WarningRecord) => {
    setFilter((prev) => ({
      ...prev,
      state: warning.state,
    }));

    const mapElement = document.getElementById('national-weather-alert-map-card');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilter(INITIAL_FILTER_STATE);
  }, []);

  const handleScrollToRegionalAlerts = useCallback(() => {
    if (regionalAlertsRef.current) {
      regionalAlertsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const headerStatus: ProvenanceStatus = isRefreshing && !diagnostics
    ? 'LOADING'
    : effectiveUnavailable
    ? 'UNAVAILABLE'
    : diagnostics?.status === 'STALE'
    ? 'STALE'
    : warningsList.length === 0
    ? 'ALL_CLEAR'
    : diagnostics?.status === 'LIVE'
    ? 'LIVE'
    : 'RECENT';

  const coordsText = selectedLocation?.coordinates
    ? `${selectedLocation.name} (${formatCoordinatePair(selectedLocation.coordinates.lat, selectedLocation.coordinates.lng, 2)})`
    : undefined;

  const updatedLabel = diagnostics?.lastSuccessfulFetchAt
    ? formatIndianDateTime(diagnostics.lastSuccessfulFetchAt)
    : effectiveUnavailable
    ? 'Unavailable'
    : stats.lastUpdatedIst;

  return (
    <div
      id="mausam-national-warning-portal"
      className="flex flex-col gap-5 pb-12 w-full max-w-[1520px] mx-auto"
    >
      <WarningHeader
        lastUpdated={updatedLabel}
        onRefresh={handleRefresh}
        isLoading={isRefreshing}
        status={headerStatus}
        coordinates={coordsText}
      />

      {effectiveUnavailable && (
        <div id="warning-feed-unavailable-banner">
          <SeverityBanner
            state="UNAVAILABLE"
            title="Official SACHET / IMD warning feed unreachable"
            description="The SACHET / NDMA CAP alert stream could not be reached. This does not confirm an all-clear; please retry sync or verify official IMD bulletins directly."
            source="NDMA SACHET CAP Gateway"
            action={
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] border border-[var(--m-watch)]/40 text-xs font-semibold text-[var(--m-watch)] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Retry Feed Sync</span>
              </button>
            }
          />
        </div>
      )}

      {alertSurgeNotice && (
        <div id="severe-alert-surge-banner">
          <SeverityBanner
            state="SEVERE"
            title={alertSurgeNotice}
            description="Audible warning alert threshold reached on active SACHET monitoring cycle."
            action={
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--m-danger)] bg-[var(--m-surface-1)] border border-[var(--m-danger)]/40 px-2.5 py-1 rounded">
                <Volume2 className="w-3.5 h-3.5" />
                {isAudioAlertEnabled ? 'Chime Played' : 'Muted'}
              </span>
            }
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <NationalAlertStatus
          overallStatus={overallStatus}
          stats={stats}
          reconciledCounts={{
            redStates: reconciled.redStates,
            orangeStates: reconciled.orangeStates,
            yellowStates: reconciled.yellowStates,
            affectedStateCount: reconciled.affectedStateCount,
            normalStateCount: reconciled.normalStateCount,
            totalStatesAndUTs: reconciled.totalStatesAndUTs,
            unmappedBulletinsCount: reconciled.unmappedOrNationalBulletins.length,
            latestIssuedAt: reconciled.latestIssuedAt,
          }}
          lastUpdated={updatedLabel}
          sourceAttribution={diagnostics?.provider || 'NDMA SACHET / IMD CAP Feed'}
          onViewRegionalAlerts={handleScrollToRegionalAlerts}
          isUnavailable={effectiveUnavailable}
        />
        <WarningTicker
          warnings={reconciled.activeWarnings}
          onSelectWarning={handleOpenWarningDetails}
          isUnavailable={effectiveUnavailable}
        />
      </div>

      {/* Weather News & Situation Reports — Contextual Reporting Separate from Official Warnings */}
      <WeatherNewsSection
        latestOfficialBulletinIso={diagnostics?.lastSuccessfulFetchAt || null}
        selectedRegion={filter.state !== 'all' ? filter.state : selectedLocation?.state || null}
      />

      <div
        id="section-national-warning-map-and-watchlist"
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
      >
        <div className="lg:col-span-7 w-full flex flex-col min-w-0">
          <NationalWarningMap
            selectedState={filter.state !== 'all' ? filter.state : null}
            onSelectState={handleSelectStateFromMap}
            onOpenStateDrawer={handleOpenStateSummary}
            warnings={warningsList}
            isUnavailable={effectiveUnavailable}
          />
        </div>

        <div className="lg:col-span-5 w-full flex flex-col min-w-0">
          <StateWatchlistPanel
            selectedState={filter.state !== 'all' ? filter.state : null}
            onSelectState={handleSelectStateFromMap}
            onOpenStateDrawer={handleOpenStateSummary}
            warnings={warningsList}
            isUnavailable={effectiveUnavailable}
          />
        </div>
      </div>

      <div ref={regionalAlertsRef} className="flex flex-col gap-3">
        <WarningFilterBar
          filter={filter}
          onFilterChange={setFilter}
          onResetFilters={handleResetFilters}
          activeCount={filteredWarnings.length}
          totalCount={warningsList.length}
          isUnavailable={effectiveUnavailable}
        />
      </div>

      <section id="section-national-warning-bulletins" className="flex flex-col gap-4">
        <SectionHeading
          title="Active Meteorological Warning Bulletins"
          subtitle="Verified CAP advisories and district-level impacts across India"
          icon={<Megaphone className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--m-text-secondary)] font-mono tabular-nums bg-[var(--m-surface-2)] border border-[var(--m-border)] px-2.5 py-1.5 rounded-lg">
                Showing <strong className="text-[var(--m-text-primary)]">{effectiveUnavailable ? 'Unavailable' : filteredWarnings.length}</strong> of{' '}
                <span className="text-[var(--m-text-muted)]">{effectiveUnavailable ? 'Unavailable' : warningsList.length}</span> active
              </span>
              {filter.state !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilter((prev) => ({ ...prev, state: 'all' }))}
                  className="text-xs text-[var(--m-accent)] hover:underline flex items-center gap-1 cursor-pointer bg-[var(--m-surface-2)] border border-[var(--m-border)] px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <span>Filtered: {filter.state}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          }
        />

        <WarningList
          warnings={filteredWarnings}
          onViewDetails={handleOpenWarningDetails}
          onViewOnMap={handleViewOnMap}
          onResetFilters={handleResetFilters}
          selectedLocation={selectedLocation}
          isUnavailable={effectiveUnavailable}
          onRetry={handleRefresh}
        />
      </section>

      <SafetyGuidanceSection activeHazardFilter={filter.hazard} />

      <NationalClassificationMatrix />

      <EmergencyResponseSection selectedLocation={selectedLocation} />

      <WarningDetailDrawer
        warning={selectedDrawerWarning}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};
