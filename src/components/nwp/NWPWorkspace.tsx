import React, { useState } from 'react';
import { GitCompare, Navigation, RefreshCw, SlidersHorizontal, HelpCircle } from 'lucide-react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelStatus } from '../../types/nwp';
import { evaluateNWPStatus } from '../../services/nwp/nwpFreshness';
import { LocationRecord } from '../../types';
import { useNWPWorkspace } from '../../hooks/useNWPWorkspace';
import { PageHeader, ProvenanceStatus } from '../ui/ObservatoryPrimitives';
import { ModelSelector } from './ModelSelector';
import { ModelOverview } from './ModelOverview';
import { ForecastStatusStrip } from './ForecastStatusStrip';
import { KeyForecastMetrics } from './KeyForecastMetrics';
import { HourlyForecastTable } from './HourlyForecastTable';
import { TemperatureChart } from './TemperatureChart';
import { PrecipitationPanel } from './PrecipitationPanel';
import { WindPressureCharts } from './WindPressureCharts';
import { ModelSpecificAnalysis } from './ModelSpecificAnalysis';
import { ModelComparison } from './ModelComparison';
import { ModelRunHistory } from './ModelRunHistory';
import { WhatThisModelDoes } from './WhatThisModelDoes';
import { ThreeModelExplanation } from './ThreeModelExplanation';
import { HowToReadNWP } from './HowToReadNWP';
import { DataProvenanceSection } from './DataProvenanceSection';
import { NWPFooter } from './NWPFooter';
import { ModelExplanation } from './ModelExplanation';

interface NWPWorkspaceProps {
  location: LocationRecord;
  source?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  isLocating?: boolean;
  onRefreshLocation?: () => void;
  onOpenLocationCenter?: () => void;
  onDetectLocation?: () => void;
}

export const NWPWorkspace: React.FC<NWPWorkspaceProps> = ({
  location,
  source = 'DEVICE_GPS',
  isLocating = false,
  onRefreshLocation,
  onOpenLocationCenter,
  onDetectLocation,
}) => {
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const hasValidCoords = typeof location.lat === 'number' && typeof location.lng === 'number';
  const lat = hasValidCoords ? location.lat : 20.2961;
  const lon = hasValidCoords ? location.lng : 85.8245;
  const locationName = `${location.city || 'Selected Station'}${location.state ? `, ${location.state}` : ''}`;

  const {
    dataset,
    selectedModel,
    setSelectedModel,
    activeModelRun,
    isLoading,
    lastRefresh,
    refreshAll,
  } = useNWPWorkspace(lat, lon, locationName);

  const handleRefresh = () => {
    if (onRefreshLocation) onRefreshLocation();
    refreshAll();
  };

  const modelStatuses: Record<NWPModelId, { status: NWPModelStatus; ageLabel: string }> = {
    WRF: { status: 'UNAVAILABLE', ageLabel: 'Unconfigured' },
    GEFS: { status: 'UNAVAILABLE', ageLabel: isLoading ? 'Checking' : 'Unavailable' },
    ECMWF: { status: 'UNAVAILABLE', ageLabel: isLoading ? 'Checking' : 'Unavailable' },
  };

  (['WRF', 'GEFS', 'ECMWF'] as const).forEach((m) => {
    const run = dataset?.models[m];
    const evalResult = evaluateNWPStatus(m, run?.runTime, run?.fetchedAt, run?.points?.length || 0);
    modelStatuses[m] = {
      status: run?.status || evalResult.status,
      ageLabel: evalResult.ageLabel,
    };
  });

  const currentRun = activeModelRun;
  const currentPoints = currentRun?.points || [];
  const firstPoint = currentPoints[0];
  const secondPoint = currentPoints[1];
  const isUnavailable = !currentRun || currentRun.status === 'UNAVAILABLE';
  const activeStatus = modelStatuses[selectedModel]?.status || 'UNAVAILABLE';

  const headerStatus: ProvenanceStatus = isLoading && !currentRun
    ? 'LOADING'
    : activeStatus === 'LIVE'
    ? 'LIVE'
    : activeStatus === 'RECENT'
    ? 'RECENT'
    : activeStatus === 'STALE'
    ? 'STALE'
    : 'UNAVAILABLE';

  const headerStatusLabel =
    selectedModel === 'WRF' && isUnavailable
      ? 'SOURCE NOT CONFIGURED'
      : headerStatus === 'LOADING'
      ? 'SYNCING NWP'
      : headerStatus === 'LIVE'
      ? `${selectedModel} LIVE`
      : headerStatus === 'RECENT'
      ? `${selectedModel} RECENT`
      : headerStatus === 'STALE'
      ? `${selectedModel} STALE`
      : `${selectedModel} UNAVAILABLE`;

  const coordLabel = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`;
  const horizonLabel = currentRun?.forecastHours
    ? `0–${Math.round(currentRun.forecastHours / 24)}d (${currentRun.forecastHours}h)`
    : selectedModel === 'WRF'
    ? '0–3d (72h)'
    : '0–15d (360h)';

  return (
    <div
      id="nwp-workspace-container"
      className="flex flex-col gap-5 w-full max-w-[1520px] mx-auto pb-24"
    >
      {/* Unified Observatory PageHeader (consolidates LocationContextBar + NWPPageHero) */}
      <PageHeader
        id="nwp-page-hero"
        eyebrow="Numerical Weather Prediction"
        title={`Atmospheric Model Forecast — ${locationName}`}
        description="Operational multi-model guidance comparing regional WRF-ARW, NOAA GEFS 31-member ensemble, and ECMWF IFS HRES."
        coordinates={coordLabel}
        status={headerStatus}
        statusLabel={headerStatusLabel}
        source={currentRun?.source || (selectedModel === 'ECMWF' ? 'Open-Meteo → ECMWF IFS HRES' : selectedModel === 'GEFS' ? 'NOAA NCEP GEFS v12' : 'IMD WRF-ARW Gateway')}
        updatedAt={lastRefresh ? `Synced ${lastRefresh}` : undefined}
        actions={
          <>
            {onDetectLocation && (
              <button
                type="button"
                onClick={onDetectLocation}
                disabled={isLocating}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-xs font-medium text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 m-focus-ring"
              >
                <Navigation className={`w-3.5 h-3.5 text-[var(--m-accent)] ${isLocating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Detect GPS</span>
              </button>
            )}
            {onOpenLocationCenter && (
              <button
                type="button"
                onClick={onOpenLocationCenter}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-xs font-medium text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] inline-flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                <span>Station Directory</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCompareMode((v) => !v)}
              className={`min-h-[40px] px-3 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring ${
                isCompareMode
                  ? 'bg-[var(--m-accent)] border-[var(--m-accent)] text-white'
                  : 'bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border-[var(--m-border)] text-[var(--m-text-primary)]'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isCompareMode ? 'Single Model' : 'Compare All'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-xs font-medium text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] inline-flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span className="hidden md:inline">Guide</span>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--m-accent)] hover:bg-[#0E82CF] border border-[var(--m-accent)]/40 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 m-focus-ring"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[var(--m-text-muted)] tabular-nums">
          <span>
            Locator: <strong className="text-[var(--m-text-primary)]">{source === 'DEVICE_GPS' ? 'Device GPS' : 'Station Directory'}</strong>
          </span>
          <span>·</span>
          <span>
            Horizon: <strong className="text-[var(--m-text-primary)]">{horizonLabel}</strong>
          </span>
        </div>
      </PageHeader>

      {/* Model Selector */}
      <ModelSelector
        selectedModel={selectedModel}
        onSelectModel={(m) => {
          setSelectedModel(m);
          setIsCompareMode(false);
        }}
        isCompareMode={isCompareMode}
        onToggleCompareMode={() => setIsCompareMode(!isCompareMode)}
        onOpenExplanation={() => setShowExplanation(true)}
        modelStatuses={modelStatuses}
        modelsData={dataset?.models}
      />

      {/* Main Workspace Body */}
      {isCompareMode ? (
        <div className="flex flex-col gap-5">
          <ModelComparison dataset={dataset || undefined} />
          <ThreeModelExplanation />
          <HowToReadNWP />
          <DataProvenanceSection dataset={dataset || undefined} lastFetchedAt={lastRefresh || ''} />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <ModelOverview
            modelId={selectedModel}
            runData={currentRun}
            ageLabel={modelStatuses[selectedModel].ageLabel}
          />
          <ForecastStatusStrip
            modelId={selectedModel}
            runData={currentRun}
            ageLabel={modelStatuses[selectedModel].ageLabel}
          />
          <KeyForecastMetrics
            currentPoint={firstPoint}
            nextPoint={secondPoint}
            isUnavailable={isUnavailable}
            modelName={selectedModel}
          />
          <HourlyForecastTable
            points={currentPoints}
            modelName={selectedModel}
          />
          <TemperatureChart
            points={currentPoints}
            modelName={selectedModel}
          />
          <PrecipitationPanel points={currentPoints} />
          <WindPressureCharts points={currentPoints} />
          <ModelSpecificAnalysis
            modelId={selectedModel}
            runData={currentRun}
            points={currentPoints}
          />
          <ModelComparison dataset={dataset || undefined} />
          <ModelRunHistory
            modelId={selectedModel}
            runData={currentRun}
          />
          <WhatThisModelDoes modelId={selectedModel} />
          <ThreeModelExplanation />
          <HowToReadNWP />
          <DataProvenanceSection dataset={dataset || undefined} lastFetchedAt={lastRefresh || ''} />
        </div>
      )}

      <NWPFooter />

      <ModelExplanation
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
      />
    </div>
  );
};
