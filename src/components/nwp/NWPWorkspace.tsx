import React, { useState } from 'react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelStatus } from '../../types/nwp';
import { evaluateNWPStatus } from '../../services/nwp/nwpFreshness';
import { LocationRecord } from '../../types';
import { useNWPWorkspace } from '../../hooks/useNWPWorkspace';
import { LocationContextBar } from './LocationContextBar';
import { NWPPageHero } from './NWPPageHero';
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

  const lat = typeof location.lat === 'number' ? location.lat : 20.36;
  const lon = typeof location.lng === 'number' ? location.lng : 85.81;
  const locationName = `${location.city || 'Chandaka'}, ${location.state || 'Odisha'}`;

  // Master NWP Workspace Hook: handles parallel fetching, independent model state, and UI-only model selection
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

  // Evaluate real data status for each model
  const modelStatuses: Record<NWPModelId, { status: NWPModelStatus; ageLabel: string }> = {
    WRF: { status: 'UNAVAILABLE', ageLabel: 'Unconfigured' },
    GEFS: { status: 'UNAVAILABLE', ageLabel: 'Checking' },
    ECMWF: { status: 'UNAVAILABLE', ageLabel: 'Checking' },
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

  return (
    <div
      id="nwp-workspace-container"
      className="flex flex-col gap-6 w-full max-w-[1520px] mx-auto pb-24 transition-colors duration-200"
    >
      {/* 1. Location / Context Bar */}
      <LocationContextBar
        location={location}
        source={source}
        isLocating={isLocating}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onOpenLocationCenter={onOpenLocationCenter}
        onDetectLocation={onDetectLocation}
      />

      {/* 2. NWP Page Header (Page Hero) */}
      <NWPPageHero
        location={location}
        lastUpdated={lastRefresh || 'Live Syncing'}
        forecastHorizon={
          currentRun?.forecastHours
            ? `0–${Math.round(currentRun.forecastHours / 24)} Days (${currentRun.forecastHours}h)`
            : selectedModel === 'WRF'
            ? '0–3 Days (72h)'
            : '0–15 Days (360h)'
        }
        onOpenCompare={() => setIsCompareMode(!isCompareMode)}
        isCompareMode={isCompareMode}
      />

      {/* 3. Model Selector */}
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

      {/* Main Workspace Body: Single Model View or Cross-Model Comparison Mode */}
      {isCompareMode ? (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* 12. Model Comparison Table & Agreement */}
          <ModelComparison dataset={dataset || undefined} />

          {/* 16. Three Model Explanation */}
          <ThreeModelExplanation />

          {/* 17. How to Read NWP Guide */}
          <HowToReadNWP />

          {/* 18. Data Provenance & Methodology */}
          <DataProvenanceSection dataset={dataset || undefined} lastFetchedAt={lastRefresh || ''} />
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* 4. Model Overview & WRF Informational State */}
          <ModelOverview
            modelId={selectedModel}
            runData={currentRun}
            ageLabel={modelStatuses[selectedModel].ageLabel}
          />

          {/* 5. Forecast Status Strip */}
          <ForecastStatusStrip
            modelId={selectedModel}
            runData={currentRun}
            ageLabel={modelStatuses[selectedModel].ageLabel}
          />

          {/* 6. Key Forecast Metrics */}
          <KeyForecastMetrics
            currentPoint={firstPoint}
            nextPoint={secondPoint}
            isUnavailable={isUnavailable}
            modelName={selectedModel}
          />

          {/* 7. Hourly Forecast Table */}
          <HourlyForecastTable
            points={currentPoints}
            modelName={selectedModel}
          />

          {/* 8. Temperature Outlook Chart */}
          <TemperatureChart
            points={currentPoints}
            modelName={selectedModel}
          />

          {/* 9. Precipitation Outlook */}
          <PrecipitationPanel points={currentPoints} />

          {/* 10. Wind & Pressure Outlook */}
          <WindPressureCharts points={currentPoints} />

          {/* 11. Model-Specific Analysis */}
          <ModelSpecificAnalysis
            modelId={selectedModel}
            runData={currentRun}
            points={currentPoints}
          />

          {/* 12. Model Comparison Section */}
          <ModelComparison dataset={dataset || undefined} />

          {/* 14. Model Run Information / History */}
          <ModelRunHistory
            modelId={selectedModel}
            runData={currentRun}
          />

          {/* 15. What This Model Does */}
          <WhatThisModelDoes modelId={selectedModel} />

          {/* 16. Three Model Explanation */}
          <ThreeModelExplanation />

          {/* 17. How To Read Model Forecasts */}
          <HowToReadNWP />

          {/* 18. Data vs Warning Separation & Data Sources & Methodology */}
          <DataProvenanceSection dataset={dataset || undefined} lastFetchedAt={lastRefresh || ''} />
        </div>
      )}

      {/* Page Footer */}
      <NWPFooter />

      {/* Model Explanation Slide-Over/Modal */}
      <ModelExplanation
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
      />
    </div>
  );
};
