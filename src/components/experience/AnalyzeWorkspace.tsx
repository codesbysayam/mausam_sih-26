// ====================================================================
// MAUSAM Analyze Workspace (Editorial Atmospheric Workstation)
// Serves the editorial overview (/) and every scientific meteorological
// route on the warm paper default canvas (or user-selected theme).
// ====================================================================

import React from 'react';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { LocatingPhase, GeolocationServiceError, NearestStationResult } from '../../services/geolocationService';
import type { StateWeatherData } from '../map/IndiaWeatherMap';
import { MainNavTab } from '../layout/MainNavigation';
import { PageContainer } from '../layout/PageContainer';
import { SkeletonPage } from '../common/Skeletons';
import { HomePage } from '../../pages/Home';
import { WeatherPage } from '../../pages/Weather';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { useExperience, AnalyzeOrFooterView } from '../../context/ExperienceContext';
import { useProviderStore } from '../../store/providerStore';
import { getProviderStatusVisual } from '../../services/providers/providerStatus';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Globe } from 'lucide-react';

const ForecastPage = lazyWithRetry(() => import('../../pages/Forecast'), 'ForecastPage');
const RadarPage = lazyWithRetry(() => import('../../pages/Radar'), 'RadarPage');
const AirQualityPage = lazyWithRetry(() => import('../../pages/AirQuality'), 'AirQualityPage');
const AlertsPage = lazyWithRetry(() => import('../../pages/Alerts'), 'AlertsPage');
const AgrometPage = lazyWithRetry(() => import('../../pages/Agromet'), 'AgrometPage');
const ReportsPage = lazyWithRetry(() => import('../../pages/Reports'), 'ReportsPage');
const PrivacyPolicy = lazyWithRetry(() => import('../../pages/PrivacyPolicy'), 'PrivacyPolicy');
const OpenDataApi = lazyWithRetry(() => import('../../pages/OpenDataApi'), 'OpenDataApi');
const TermsOfObservation = lazyWithRetry(() => import('../../pages/TermsOfObservation'), 'TermsOfObservation');
const ApiDebugPage = lazyWithRetry(() => import('../../pages/ApiDebug'), 'ApiDebugPage');
const DocsPage = lazyWithRetry(() => import('../../pages/DocsPage'), 'DocsPage');
const CycloneTrackerPage = lazyWithRetry(() => import('../../pages/CycloneTracker'), 'CycloneTrackerPage');

const ANALYZE_TABS: Array<{ id: MainNavTab; label: string }> = [
  { id: 'home', label: 'Overview' },
  { id: 'weather', label: 'Weather' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'radar', label: 'Radar' },
  { id: 'warnings', label: 'Warnings' },
  { id: 'cyclone-tracker', label: 'Cyclones' },
  { id: 'aqi', label: 'AQI' },
  { id: 'agromet', label: 'Agromet' },
  { id: 'reports', label: 'Reports' },
  { id: 'debug', label: 'Sources' },
];

interface AnalyzeWorkspaceProps {
  activeTab: AnalyzeOrFooterView;
  onNavigateTab: (tab: AnalyzeOrFooterView) => void;
  weatherBundle: WeatherDataBundle;
  selectedLocation: LocationRecord;
  isLoadingWeather: boolean;
  onRefreshWeather: () => void;
  onSelectLocation: (loc: LocationRecord) => void;
  onStateSelect: (state: StateWeatherData) => void;
  onDetectLocation: (forceRefresh?: boolean) => Promise<any>;
  isLocating: boolean;
  locatePhase: LocatingPhase;
  locateError: GeolocationServiceError | null;
  locationSource: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  accuracyMeters: number | null;
  nearestStationInfo: NearestStationResult | null;
  onOpenLocationCenter: () => void;
  onOpenPrivacyModal: () => void;
}

export const AnalyzeWorkspace: React.FC<AnalyzeWorkspaceProps> = ({
  activeTab,
  onNavigateTab,
  weatherBundle,
  selectedLocation,
  isLoadingWeather,
  onRefreshWeather,
  onSelectLocation,
  onStateSelect,
  onDetectLocation,
  isLocating,
  locatePhase,
  locateError,
  locationSource,
  accuracyMeters,
  nearestStationInfo,
  onOpenLocationCenter,
  onOpenPrivacyModal,
}) => {
  const { setMode } = useExperience();
  const { providers } = useProviderStore();
  const effectiveTab: AnalyzeOrFooterView = activeTab;

  return (
    <div
      id="mausam-analyze-workspace"
      className="pb-12 min-h-screen w-full bg-[var(--m-canvas)] text-[var(--m-text-primary)]"
    >
      {/* Editorial Domain Navigation Strip */}
      <div className="w-full bg-[var(--m-surface-1)] border-b border-[var(--m-border)]">
        <div className="mausam-page py-2 flex items-center justify-between gap-3">
          <nav
            aria-label="Primary Meteorological Sections"
            className="flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0 flex-1"
          >
            {ANALYZE_TABS.map((t) => {
              const isActive = effectiveTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onNavigateTab(t.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative px-3 min-h-[38px] rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer m-focus-ring ${
                    isActive
                      ? 'bg-[var(--m-surface-2)] text-[var(--m-text-primary)] font-semibold'
                      : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)]/60'
                  }`}
                >
                  {t.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-3 right-3 -bottom-2 h-[2px] bg-[var(--m-accent)] rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Compact Provider Status & Spatial Map Trigger */}
          <div className="hidden xl:flex items-center gap-3 shrink-0 pl-3 border-l border-[var(--m-border)]">
            <button
              type="button"
              onClick={() => onNavigateTab('debug')}
              className="flex items-center gap-2 text-[11px] font-mono text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer"
              title="Inspect live provider status and telemetry provenance"
            >
              {(['WEATHER', 'RADAR', 'SACHET'] as const).map((pid) => {
                const vis = getProviderStatusVisual(providers[pid].status);
                const statusColor =
                  vis.tone === 'live'
                    ? 'text-[var(--m-ok)]'
                    : vis.tone === 'stale' || vis.tone === 'unavailable'
                    ? 'text-[var(--m-watch)]'
                    : vis.tone === 'error'
                    ? 'text-[var(--m-danger)]'
                    : 'text-[var(--m-accent)]';
                return (
                  <span key={pid} className="inline-flex items-center gap-1">
                    <span>{pid}:</span>
                    <span className={`font-semibold ${statusColor}`}>{vis.label}</span>
                  </span>
                );
              })}
            </button>

            <button
              type="button"
              onClick={() => setMode('explore')}
              className="px-2.5 min-h-[34px] rounded-lg border border-[var(--m-border-strong)] bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-xs font-semibold text-[var(--m-text-primary)] inline-flex items-center gap-1.5 cursor-pointer m-focus-ring transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>3D Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Route View (Route-Isolated ErrorBoundary preserves top bar & tabs) */}
      <PageContainer id="mausam-main-page-container" fluid={effectiveTab === 'radar'}>
        <ErrorBoundary
          key={`analyze-route-${effectiveTab}`}
          scope="workspace"
          fallbackTitle={
            ANALYZE_TABS.find((t) => t.id === effectiveTab)?.label || 'Meteorological View'
          }
          onNavigateHome={() => onNavigateTab('home')}
        >
        {effectiveTab === 'home' && (
          <HomePage
            weatherBundle={weatherBundle}
            selectedLocation={selectedLocation}
            onNavigateToTab={(tab) => onNavigateTab(tab)}
            onSelectLocation={onSelectLocation}
            onStateSelect={onStateSelect}
            onDetectLocation={onDetectLocation}
            isLocating={isLocating}
            locatePhase={locatePhase}
            locationSource={locationSource}
            onOpenLocationCenter={onOpenLocationCenter}
          />
        )}

        {effectiveTab === 'weather' && (
          <WeatherPage
            weatherBundle={weatherBundle}
            selectedLocation={selectedLocation}
            onRefresh={onRefreshWeather}
            onSelectLocation={onSelectLocation}
            onChangeLocationClick={onOpenLocationCenter}
            onNavigateToTab={(tab) => onNavigateTab(tab as AnalyzeOrFooterView)}
            onDetectLocation={onDetectLocation}
            isLocating={isLocating}
            locatePhase={locatePhase}
            locateError={locateError}
            locationSource={locationSource}
            accuracyMeters={accuracyMeters}
            nearestStationInfo={nearestStationInfo}
            onOpenLocationCenter={onOpenLocationCenter}
            onOpenPrivacyModal={onOpenPrivacyModal}
          />
        )}

        <React.Suspense fallback={<SkeletonPage />}>
          {effectiveTab === 'forecast' && (
            <ForecastPage
              weatherBundle={weatherBundle}
              selectedLocation={selectedLocation}
              onRefresh={onRefreshWeather}
              onSelectLocation={onSelectLocation}
              onNavigateToTab={(tab) => onNavigateTab(tab as AnalyzeOrFooterView)}
              isLoadingWeather={isLoadingWeather}
              onDetectLocation={onDetectLocation}
              isLocating={isLocating}
              locatePhase={locatePhase}
              locationSource={locationSource}
              onOpenLocationCenter={onOpenLocationCenter}
            />
          )}

          {effectiveTab === 'warnings' && (
            <AlertsPage
              weatherBundle={weatherBundle}
              selectedLocation={selectedLocation}
            />
          )}

          {effectiveTab === 'radar' && (
            <RadarPage
              selectedLocation={selectedLocation}
              onDetectLocation={onDetectLocation}
              isLocating={isLocating}
              locatePhase={locatePhase}
              locationSource={locationSource}
              onOpenLocationCenter={onOpenLocationCenter}
            />
          )}

          {effectiveTab === 'cyclone-tracker' && <CycloneTrackerPage />}

          {effectiveTab === 'aqi' && (
            <AirQualityPage
              weatherBundle={weatherBundle}
              selectedLocation={selectedLocation}
              onSelectLocation={onSelectLocation}
              onStateSelect={onStateSelect}
              onDetectLocation={onDetectLocation}
              isLocating={isLocating}
              locatePhase={locatePhase}
              locationSource={locationSource}
              onOpenLocationCenter={onOpenLocationCenter}
            />
          )}

          {effectiveTab === 'agromet' && (
            <AgrometPage
              weatherBundle={weatherBundle}
              selectedLocation={selectedLocation}
              onNavigateToTab={(tab) => onNavigateTab(tab as AnalyzeOrFooterView)}
              onDetectLocation={onDetectLocation}
              isLocating={isLocating}
              locatePhase={locatePhase}
              locationSource={locationSource}
              onOpenLocationCenter={onOpenLocationCenter}
            />
          )}

          {effectiveTab === 'reports' && (
            <ReportsPage weatherBundle={weatherBundle} selectedLocation={selectedLocation} />
          )}

          {effectiveTab === 'privacy' && (
            <PrivacyPolicy onNavigateHome={() => onNavigateTab('home')} />
          )}

          {effectiveTab === 'api' && (
            <OpenDataApi onNavigateHome={() => onNavigateTab('home')} />
          )}

          {effectiveTab === 'terms' && (
            <TermsOfObservation onNavigateHome={() => onNavigateTab('home')} />
          )}

          {effectiveTab === 'docs' && (
            <DocsPage onNavigateHome={() => onNavigateTab('home')} />
          )}

          {effectiveTab === 'debug' && <ApiDebugPage />}

          {effectiveTab === 'not-found' && (
            <NotFoundPage
              onNavigateHome={() => onNavigateTab('home')}
              onNavigateTab={(tab) => onNavigateTab(tab)}
            />
          )}
        </React.Suspense>
        </ErrorBoundary>
      </PageContainer>
    </div>
  );
};
