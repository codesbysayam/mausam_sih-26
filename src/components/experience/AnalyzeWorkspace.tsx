// ====================================================================
// MAUSAM Analyze Workspace (Scientific Workstation Mode)
// Streams the full meteorological suite (Weather, NWP Ensemble Forecasts,
// Doppler Radar, SACHET Warnings, Cyclone Tracker, AQI, Agromet, Reports,
// and Provider Diagnostics) beneath the single FloatingBrandBar.
// ====================================================================

import React from 'react';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { LocatingPhase, GeolocationServiceError, NearestStationResult } from '../../services/geolocationService';
import type { StateWeatherData } from '../map/IndiaWeatherMap';
import { MainNavTab } from '../layout/MainNavigation';
import { PageContainer } from '../layout/PageContainer';
import { SkeletonPage } from '../common/Skeletons';
import { WeatherPage } from '../../pages/Weather';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { useExperience, AnalyzeOrFooterView } from '../../context/ExperienceContext';
import { useProviderStore } from '../../store/providerStore';
import { getProviderStatusVisual } from '../../services/providers/providerStatus';
import { Globe, ArrowLeft } from 'lucide-react';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<any>,
  key = 'default'
) {
  return React.lazy(async () => {
    const isClient = typeof window !== 'undefined';
    let lastError: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const m = await factory();
        const comp = m[key] || m.default || Object.values(m)[0];
        if (isClient) {
          window.sessionStorage.removeItem('mausam_lazy_retry_active');
        }
        return { default: comp as T };
      } catch (err: any) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    if (
      isClient &&
      !window.sessionStorage.getItem('mausam_lazy_retry_active') &&
      (lastError?.message?.includes('dynamically imported module') ||
        lastError?.message?.includes('Failed to fetch') ||
        lastError?.name === 'TypeError')
    ) {
      window.sessionStorage.setItem('mausam_lazy_retry_active', 'true');
      window.location.reload();
      return new Promise(() => {});
    }

    throw lastError;
  });
}

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
  { id: 'weather', label: 'Weather Detail' },
  { id: 'forecast', label: 'Forecast & NWP' },
  { id: 'radar', label: 'Doppler Radar' },
  { id: 'warnings', label: 'Warnings' },
  { id: 'cyclone-tracker', label: 'Cyclone Tracker' },
  { id: 'aqi', label: 'AQI & Air' },
  { id: 'agromet', label: 'Agromet' },
  { id: 'reports', label: 'Reports' },
  { id: 'debug', label: 'Data & Sources' },
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
  const effectiveTab: AnalyzeOrFooterView = activeTab === 'home' ? 'weather' : activeTab;

  return (
    <div id="mausam-analyze-workspace" className="pt-[68px] sm:pt-[64px] pb-8 min-h-screen w-full bg-[#07111D]">
      {/* Compact Scientific Workstation Strip */}
      <div className="max-w-[1560px] mx-auto px-3 lg:px-6 mb-4">
        <div className="m-panel px-2.5 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMode('explore')}
              className="px-2.5 min-h-[36px] rounded-lg bg-[#35C7E8]/12 border border-[#35C7E8]/35 text-xs font-semibold text-[#7DD3FC] hover:bg-[#35C7E8]/20 flex items-center gap-1.5 shrink-0 cursor-pointer m-focus-ring"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3D Explore</span>
            </button>

            <div className="h-4 w-px bg-[#26394B] mx-1 shrink-0" />

            {ANALYZE_TABS.map((t) => {
              const isActive = effectiveTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onNavigateTab(t.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 min-h-[36px] rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer m-focus-ring ${
                    isActive
                      ? 'bg-[#35C7E8] text-[#05101C] font-semibold'
                      : 'text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Real Provider Health Strip */}
          <div className="hidden xl:flex items-center gap-2.5 text-[10px] font-mono text-[#8295A8] shrink-0 pl-2 border-l border-[#26394B]">
            {(['SACHET', 'IMD', 'RADAR', 'NWP'] as const).map((pid) => {
              const vis = getProviderStatusVisual(providers[pid].status);
              return (
                <span key={pid} className="inline-flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${vis.dotClass}`} />
                  <span className="text-[#B5C3D1]">{pid}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Scientific Domain View */}
      <PageContainer id="mausam-main-page-container" fluid={effectiveTab === 'radar'}>
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
            <PrivacyPolicy onNavigateHome={() => setMode('explore')} />
          )}

          {effectiveTab === 'api' && (
            <OpenDataApi onNavigateHome={() => setMode('explore')} />
          )}

          {effectiveTab === 'terms' && (
            <TermsOfObservation onNavigateHome={() => setMode('explore')} />
          )}

          {effectiveTab === 'docs' && (
            <DocsPage onNavigateHome={() => setMode('explore')} />
          )}

          {effectiveTab === 'debug' && <ApiDebugPage />}

          {effectiveTab === 'not-found' && (
            <NotFoundPage
              onNavigateHome={() => setMode('explore')}
              onNavigateTab={(tab) => onNavigateTab(tab)}
            />
          )}
        </React.Suspense>
      </PageContainer>
    </div>
  );
};
