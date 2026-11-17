import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LocationRecord, WeatherStation } from './types';
import { locationService } from './services/locationService';
import { weatherService, WeatherDataBundle } from './services/weatherService';
import { INITIAL_WEATHER, INITIAL_ALERTS, HOURLY_FORECAST, DAILY_FORECAST } from './data/weatherData';
import { GovernmentHeader } from './components/layout/GovernmentHeader';
import { MainNavigation, MainNavTab } from './components/layout/MainNavigation';
import { PageContainer } from './components/layout/PageContainer';
import { FooterNavigation, FooterView } from './components/layout/FooterNavigation';
import { StateWeatherData } from './components/map/IndiaWeatherMap';
import { HomePage } from './pages/Home';
import { WeatherPage } from './pages/Weather';
import { SkeletonPage } from './components/common/Skeletons';

// Resilient lazy-loader with automatic retry and auto-reload to prevent Vite chunk/dynamic import reload errors
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
        console.warn(`[MAUSAM Dynamic Import] Attempt ${attempt + 1} failed for ${key}:`, err?.message || err);
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }

    // If retries failed and it's a dynamic import failure, refresh once to sync with latest build
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

const ForecastPage = lazyWithRetry(() => import('./pages/Forecast'), 'ForecastPage');
const RadarPage = lazyWithRetry(() => import('./pages/Radar'), 'RadarPage');
const AirQualityPage = lazyWithRetry(() => import('./pages/AirQuality'), 'AirQualityPage');
const AlertsPage = lazyWithRetry(() => import('./pages/Alerts'), 'AlertsPage');
const AgrometPage = lazyWithRetry(() => import('./pages/Agromet'), 'AgrometPage');
const ReportsPage = lazyWithRetry(() => import('./pages/Reports'), 'ReportsPage');
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');
const OpenDataApi = lazyWithRetry(() => import('./pages/OpenDataApi'), 'OpenDataApi');
const TermsOfObservation = lazyWithRetry(() => import('./pages/TermsOfObservation'), 'TermsOfObservation');
const ApiDebugPage = lazyWithRetry(() => import('./pages/ApiDebug'), 'ApiDebugPage');
const DocsPage = lazyWithRetry(() => import('./pages/DocsPage'), 'DocsPage');
const CycloneTrackerPage = lazyWithRetry(() => import('./pages/CycloneTracker'), 'CycloneTrackerPage');

import { AskMausamDrawer } from './components/AskMausamDrawer';
import { ReportDetailModal } from './components/ReportDetailModal';
import { OFFICIAL_PUBLICATIONS, MeteorologicalPublication } from './data/reportsAndArticles';
import { useLanguage } from './i18n/LanguageContext';
import { useLocation } from './context/LocationContext';
import { LocationCenterModal } from './components/location/LocationCenterModal';
import { LocationPrivacyModal } from './components/location/LocationPrivacyModal';
import { NetworkStatusBanner } from './components/common/NetworkStatusBanner';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useSwipeGesture } from './hooks/useSwipeGesture';
import { useAlertAudio } from './hooks/useAlertAudio';
import { Volume2, AlertTriangle } from 'lucide-react';
import { NotFoundPage } from './pages/NotFoundPage';
import { DraggableAskMausamButton } from './components/common/DraggableAskMausamButton';
import './styles/mausam.css';

export type AppView = MainNavTab | FooterView | 'not-found';

const SWIPEABLE_TABS: MainNavTab[] = ['home', 'weather', 'forecast', 'warnings', 'radar', 'cyclone-tracker', 'aqi', 'agromet', 'reports'];

function getTabFromPathname(path: string): AppView {
  const cleanPath = path.toLowerCase().replace(/\/+$/, '');
  if (cleanPath === '' || cleanPath === '/' || cleanPath === '/index.html' || cleanPath.endsWith('/index.html')) return 'home';
  if (cleanPath === '/docs' || cleanPath === '/documentation' || cleanPath === '/doc') return 'docs';
  if (cleanPath === '/privacy' || cleanPath === '/privacy-policy') return 'privacy';
  if (cleanPath === '/api' || cleanPath === '/open-data-api') return 'api';
  if (cleanPath === '/terms' || cleanPath === '/terms-of-observation' || cleanPath === '/terms-and-conditions') return 'terms';
  if (cleanPath === '/debug' || cleanPath === '/api-debug' || cleanPath === '/sources' || cleanPath === '/data-sources') return 'debug';
  if (cleanPath === '/forecast') return 'forecast';
  if (cleanPath === '/warnings' || cleanPath === '/alerts') return 'warnings';
  if (cleanPath === '/radar' || cleanPath === '/maps') return 'radar';
  if (cleanPath === '/cyclone-tracker' || cleanPath === '/cyclone' || cleanPath === '/cyclones') return 'cyclone-tracker';
  if (cleanPath === '/aqi' || cleanPath === '/air') return 'aqi';
  if (cleanPath === '/agromet') return 'agromet';
  if (cleanPath === '/reports') return 'reports';
  if (cleanPath === '/weather') return 'weather';
  if (cleanPath === '/not-found' || cleanPath === '/404') return 'not-found';
  return 'not-found';
}

function getPathForView(view: AppView): string {
  switch (view) {
    case 'docs':
      return '/docs';
    case 'privacy':
      return '/privacy';
    case 'api':
      return '/api';
    case 'terms':
      return '/terms';
    case 'debug':
      return '/api-debug';
    case 'forecast':
      return '/forecast';
    case 'warnings':
      return '/warnings';
    case 'radar':
      return '/radar';
    case 'cyclone-tracker':
      return '/cyclone-tracker';
    case 'aqi':
      return '/aqi';
    case 'agromet':
      return '/agromet';
    case 'reports':
      return '/reports';
    case 'weather':
      return '/weather';
    case 'not-found':
      return '/not-found';
    case 'home':
    default:
      return '/';
  }
}

export default function App() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AppView>(() =>
    getTabFromPathname(window.location.pathname)
  );

  console.log('[MAUSAM] App component executing / rendering, activeTab:', activeTab);

  useEffect(() => {
    console.log('[MAUSAM] App component mounted successfully to DOM');
  }, []);

  // Single source of truth for location & geolocation state via LocationContext
  const {
    location: selectedLocation,
    locationSource,
    isLocating,
    locatePhase,
    locateError,
    accuracyMeters,
    lastUpdatedTime: lastDetectedAt,
    nearestStationInfo,
    refreshLocation: detectLocation,
    changeLocation: handleSelectLocation,
    clearSavedLocation,
    openLocationModal,
    closeLocationModal,
    isLocationModalOpen: isLocationCenterOpen,
    openPrivacyModal,
    closePrivacyModal,
    isPrivacyModalOpen,
  } = useLocation();

  const setIsLocationCenterOpen = (open: boolean) => (open ? openLocationModal() : closeLocationModal());
  const setIsPrivacyModalOpen = (open: boolean) => (open ? openPrivacyModal() : closePrivacyModal());

  const [weatherBundle, setWeatherBundle] = useState<WeatherDataBundle>({
    current: INITIAL_WEATHER,
    hourly: HOURLY_FORECAST,
    daily: DAILY_FORECAST,
    trends: [],
    alerts: INITIAL_ALERTS,
    lastFetchedAt: new Date(),
    isLive: true,
  });

  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isAskMausamOpen, setIsAskMausamOpen] = useState(false);
  const [selectedFooterPublication, setSelectedFooterPublication] = useState<MeteorologicalPublication | null>(null);
  const [globalAlertSurge, setGlobalAlertSurge] = useState<{ newCount: number; oldCount: number } | null>(null);

  // Floating Ask MAUSAM trigger visibility on scroll
  const [isFloatingBtnVisible, setIsFloatingBtnVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      const prevScrollY = lastScrollYRef.current;
      const deltaY = currentScrollY - prevScrollY;

      // When scrolling down by more than 10px and past top threshold, hide button to keep UI clean
      if (deltaY > 10 && currentScrollY > 60) {
        setIsFloatingBtnVisible(false);
      } else if (deltaY < -5 || currentScrollY <= 60) {
        // When scrolling back up or near top of page, show immediately
        setIsFloatingBtnVisible(true);
      }

      lastScrollYRef.current = currentScrollY;

      // Reappear once the user stops scrolling
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsFloatingBtnVisible(true);
      }, 750);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Official meteorological audio alert monitor: triggers for genuinely new active alerts
  const { isAudioAlertEnabled } = useAlertAudio({
    warnings: weatherBundle.alerts,
    onNewAlertTriggered: (newAlert) => {
      setGlobalAlertSurge({
        newCount: weatherBundle.alerts?.length || 1,
        oldCount: 0,
      });
      setTimeout(() => setGlobalAlertSurge(null), 8000);
    },
  });

  // Real-time network and API status listener
  const { isOnline, isApiReachable, retryConnection } = useNetworkStatus();

  const handleOpenFooterArticle = useCallback((pubId: string) => {
    const pub = OFFICIAL_PUBLICATIONS.find(p => p.id === pubId);
    if (pub) {
      setSelectedFooterPublication(pub);
    }
  }, []);

  // Sync state with browser popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPathname(window.location.pathname);
      setActiveTab(tab);
      if (typeof window !== 'undefined' && (window as any).MausamSEO) {
        (window as any).MausamSEO.updateMeta(window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToTab = useCallback((tab: AppView, pushHistory = true) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const targetPath = getPathForView(tab);
    if (pushHistory) {
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
    if (typeof window !== 'undefined') {
      if ((window as any).MausamSEO?.updateMeta) {
        (window as any).MausamSEO.updateMeta(targetPath);
      }
      if ((window as any).MausamAnalytics?.trackPageView) {
        (window as any).MausamAnalytics.trackPageView(targetPath);
      }
    }
  }, []);

  // Load weather data for the active location
  const loadWeatherData = useCallback(async (location: LocationRecord, forceRefresh = false) => {
    setIsLoadingWeather(true);
    try {
      const bundle = await weatherService.getWeatherData(location, forceRefresh);
      setWeatherBundle(bundle);
    } catch (err) {
      console.warn('Weather sync error, using cached telemetry:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    loadWeatherData(selectedLocation);
  }, [selectedLocation, loadWeatherData]);

  // Handle state click from India Map or State Table
  const handleStateSelect = (state: StateWeatherData) => {
    const matched =
      locationService.findLocationByName(state.city || state.name) ||
      locationService.findLocationsByState(state.name)[0];

    if (matched) {
      handleSelectLocation(matched);
      navigateToTab('weather');
    }
  };

  const currentStationForAi: WeatherStation = {
    id: selectedLocation.id,
    name: selectedLocation.displayName,
    code: selectedLocation.imdStation || 'AWS-BBI',
    state: selectedLocation.state,
    district: selectedLocation.district,
    lat: selectedLocation.lat,
    lng: selectedLocation.lng,
    elevation: selectedLocation.elevation || '45m ASL',
    status: 'active',
    pm25: weatherBundle.current.aqiPm25 || 42,
    temp: weatherBundle.current.temp,
    condition: weatherBundle.current.condition,
    weatherType: weatherBundle.current.weatherType,
    isCoastal: selectedLocation.coastalStatus === 'coastal',
  };

  const currentTabIdx = SWIPEABLE_TABS.indexOf(activeTab as MainNavTab);
  const handleSwipeLeft = useCallback(() => {
    if (currentTabIdx >= 0 && currentTabIdx < SWIPEABLE_TABS.length - 1) {
      navigateToTab(SWIPEABLE_TABS[currentTabIdx + 1]);
    }
  }, [currentTabIdx, navigateToTab]);

  const handleSwipeRight = useCallback(() => {
    if (currentTabIdx > 0) {
      navigateToTab(SWIPEABLE_TABS[currentTabIdx - 1]);
    }
  }, [currentTabIdx, navigateToTab]);

  const swipeContainerRef = useSwipeGesture<HTMLElement>({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    disabled: currentTabIdx === -1,
  });

  return (
    <div className="mausam-app min-h-screen bg-[#0B1219] text-[#F4F7FA] flex flex-col font-sans w-full overflow-x-hidden">
      {/* Network Connectivity Status Listener Banner */}
      <NetworkStatusBanner
        isOnline={isOnline}
        isApiReachable={isApiReachable}
        lastSyncedAt={weatherBundle.lastFetchedAt}
        onRetry={async () => {
          await retryConnection();
          await loadWeatherData(selectedLocation, true);
        }}
      />

      {/* 1. Streamlined Observatory Header & Search */}
      <GovernmentHeader
        selectedLocation={selectedLocation}
        onSelectLocation={handleSelectLocation}
        onOpenAskMausam={() => setIsAskMausamOpen(true)}
        activeTab={activeTab}
        onNavigateTab={(tab) => navigateToTab(tab as AppView)}
        activeAlertCount={weatherBundle.alerts?.length || 0}
        onDetectLocation={detectLocation}
        onRefreshAll={async () => {
          await loadWeatherData(selectedLocation, true);
        }}
        isRefreshing={isLoadingWeather}
        isLocating={isLocating}
        locatePhase={locatePhase}
        locationSource={locationSource}
        onOpenLocationCenter={() => setIsLocationCenterOpen(true)}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
      />

      {/* 2. Workstation Tab Strip (Desktop/Tablet) */}
      <MainNavigation
        activeTab={activeTab}
        onTabChange={(tab) => navigateToTab(tab)}
        activeAlertCount={weatherBundle.alerts?.length || 0}
      />

      {/* 3. Main Body Content */}
      <main id="main-content" ref={swipeContainerRef} className="relative flex-1 w-full min-w-0">
        {/* Slim indeterminate progress bar while weather data is syncing */}
        {isLoadingWeather && (
          <div
            id="weather-sync-progress-bar"
            className="mausam-progress-indeterminate absolute top-0 left-0 right-0"
            role="progressbar"
            aria-label="Updating live meteorological telemetry"
            aria-busy="true"
          >
            <div className="mausam-progress-indeterminate-bar" />
          </div>
        )}

        <PageContainer id="mausam-main-page-container" fluid={activeTab === 'radar'}>
          {/* HOME: National Weather Overview */}
          {activeTab === 'home' && (
            <HomePage
              weatherBundle={weatherBundle}
              selectedLocation={selectedLocation}
              onNavigateToTab={(tab) => navigateToTab(tab as AppView)}
              onSelectLocation={handleSelectLocation}
              onStateSelect={handleStateSelect}
              onDetectLocation={detectLocation}
              isLocating={isLocating}
              locatePhase={locatePhase}
              locationSource={locationSource}
              onOpenLocationCenter={() => setIsLocationCenterOpen(true)}
            />
          )}

          {/* WEATHER: Detailed Location-Specific Weather */}
          {activeTab === 'weather' && (
            <WeatherPage
              weatherBundle={weatherBundle}
              selectedLocation={selectedLocation}
              onRefresh={() => loadWeatherData(selectedLocation, true)}
              onSelectLocation={handleSelectLocation}
              onChangeLocationClick={() => setIsLocationCenterOpen(true)}
              onNavigateToTab={(tab) => navigateToTab(tab as AppView)}
              onDetectLocation={detectLocation}
              isLocating={isLocating}
              locatePhase={locatePhase}
              locateError={locateError}
              locationSource={locationSource}
              accuracyMeters={accuracyMeters}
              nearestStationInfo={nearestStationInfo}
              onOpenLocationCenter={() => setIsLocationCenterOpen(true)}
              onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
            />
          )}

          {/* LAZY LOADED ROUTED MODULES (Suspense boundary with zero-layout-shift SkeletonPage) */}
          <React.Suspense fallback={<SkeletonPage />}>
            {/* FORECAST: Medium-Range Numerical Weather Forecast */}
            {activeTab === 'forecast' && (
              <ForecastPage
                weatherBundle={weatherBundle}
                selectedLocation={selectedLocation}
                onRefresh={() => loadWeatherData(selectedLocation, true)}
                onSelectLocation={handleSelectLocation}
                onNavigateToTab={(tab) => navigateToTab(tab as AppView)}
                isLoadingWeather={isLoadingWeather}
                onDetectLocation={detectLocation}
                isLocating={isLocating}
                locatePhase={locatePhase}
                locationSource={locationSource}
                onOpenLocationCenter={() => setIsLocationCenterOpen(true)}
              />
            )}

            {/* WARNINGS: Multi-Hazard Severe Weather Warnings & Matrix */}
            {activeTab === 'warnings' && (
              <AlertsPage
                weatherBundle={weatherBundle}
                selectedLocation={selectedLocation}
              />
            )}

            {/* RADAR & MAPS: Doppler Weather Radar & Satellite Imagery */}
            {activeTab === 'radar' && (
              <RadarPage
                selectedLocation={selectedLocation}
                onDetectLocation={detectLocation}
                isLocating={isLocating}
                locatePhase={locatePhase}
                locationSource={locationSource}
                onOpenLocationCenter={() => setIsLocationCenterOpen(true)}
              />
            )}

            {/* CYCLONE TRACKER: Real-Time Synoptic Disturbance & IMD Cyclone Track */}
            {activeTab === 'cyclone-tracker' && (
              <CycloneTrackerPage />
            )}

            {/* AQI & AIR: National Air Quality Index & Aero-Allergen Pollen */}
            {activeTab === 'aqi' && (
              <AirQualityPage
                weatherBundle={weatherBundle}
                selectedLocation={selectedLocation}
                onSelectLocation={handleSelectLocation}
                onStateSelect={handleStateSelect}
                onDetectLocation={detectLocation}
                isLocating={isLocating}
                locatePhase={locatePhase}
                locationSource={locationSource}
                onOpenLocationCenter={() => setIsLocationCenterOpen(true)}
              />
            )}

            {/* AGROMET: Gramin Krishi Mausam Sewa Agricultural Bulletins */}
            {activeTab === 'agromet' && (
              <AgrometPage
                weatherBundle={weatherBundle}
                selectedLocation={selectedLocation}
                onNavigateToTab={(tab) => navigateToTab(tab as AppView)}
                onDetectLocation={detectLocation}
                isLocating={isLocating}
                locatePhase={locatePhase}
                locationSource={locationSource}
                onOpenLocationCenter={() => setIsLocationCenterOpen(true)}
              />
            )}

            {/* REPORTS: Citizen Meteorological Reports & Observation Feeds */}
            {activeTab === 'reports' && (
              <ReportsPage
                weatherBundle={weatherBundle}
                selectedLocation={selectedLocation}
              />
            )}

            {/* PRIVACY POLICY */}
            {activeTab === 'privacy' && (
              <PrivacyPolicy onNavigateHome={() => navigateToTab('home')} />
            )}

            {/* OPEN DATA API */}
            {activeTab === 'api' && (
              <OpenDataApi onNavigateHome={() => navigateToTab('home')} />
            )}

            {/* TERMS OF OBSERVATION */}
            {activeTab === 'terms' && (
              <TermsOfObservation onNavigateHome={() => navigateToTab('home')} />
            )}

            {/* MAUSAM PROJECT DOCUMENTATION */}
            {activeTab === 'docs' && (
              <DocsPage onNavigateHome={() => navigateToTab('home')} />
            )}

            {/* IMD API INTEGRATION DIAGNOSTICS */}
            {activeTab === 'debug' && <ApiDebugPage />}

            {/* NOT FOUND (404) PAGE */}
            {activeTab === 'not-found' && (
              <NotFoundPage
                onNavigateHome={() => navigateToTab('home')}
                onNavigateTab={(tab) => navigateToTab(tab)}
              />
            )}
          </React.Suspense>
        </PageContainer>
      </main>

      {/* 4. Official Institutional Footer with unified FooterNavigation component */}
      <footer className="w-full bg-[#0E1721] border-t border-white/10 py-8 mt-10 text-xs text-[#8EA3B8]">
        <div className="max-w-[1560px] mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#F4F7FA] font-bold text-sm">
                  {t('mausamPortal', 'MAUSAM PORTAL')}
                </span>
                <span className="text-[#38BDF8] text-[10px] font-mono font-semibold uppercase tracking-wider">
                  India
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {t('footerTagline', 'National Atmospheric Intelligence & Citizen Weather Platform. Calibrated with Doppler weather radars, Automatic Weather Stations (AWS), and satellite telemetry.')}
              </p>
            </div>

            <div>
              <span className="font-bold text-white uppercase text-[11px] block mb-2">
                {t('dataProvidersTitle', 'Data Providers & Networks')}
              </span>
              <ul className="space-y-1 text-[11px]">
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenFooterArticle('dwr-all-india-20260826')}
                    className="text-left text-[#B2BDCD] hover:text-[#4FA8E0] hover:underline transition-colors cursor-pointer block"
                    title="Read official All-India Weather Summary Report"
                  >
                    • {t('imdCredit', 'India Meteorological Department (IMD)')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenFooterArticle('ncmrwf-unified-model-nwp')}
                    className="text-left text-[#B2BDCD] hover:text-[#4FA8E0] hover:underline transition-colors cursor-pointer block"
                    title="Read NCMRWF Unified Model NWP Monograph"
                  >
                    • {t('ncmrwfCredit', 'NCMRWF Global & Regional Models')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenFooterArticle('cpcb-air-quality-annual-2026')}
                    className="text-left text-[#B2BDCD] hover:text-[#4FA8E0] hover:underline transition-colors cursor-pointer block"
                    title="Read CPCB / SAFAR National Ambient Air Quality Publication"
                  >
                    • {t('cpcbCredit', 'Central Pollution Control Board (CPCB)')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenFooterArticle('isro-mosdac-satellite-meteorology')}
                    className="text-left text-[#B2BDCD] hover:text-[#4FA8E0] hover:underline transition-colors cursor-pointer block"
                    title="Read ISRO MOSDAC Satellite Radiometry & Telemetry Monograph"
                  >
                    • {t('isroCredit', 'ISRO MOSDAC Earth Observation')}
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-bold text-white uppercase text-[11px] block mb-2">
                {t('citizenServicesTitle', 'Citizen Meteorological Services')}
              </span>
              <ul className="space-y-1 text-[11px]">
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenFooterArticle('doppler-radar-nowcasting-techniques')}
                    className="text-left text-[#B2BDCD] hover:text-[#4FA8E0] hover:underline transition-colors cursor-pointer block"
                    title="Read Doppler Radar Nowcasting & Thunderstorm Warning Research"
                  >
                    • Nowcasting &amp; Thunderstorm Warnings
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenFooterArticle('agromet-advisory-gkms-odisha-india')}
                    className="text-left text-[#B2BDCD] hover:text-[#4FA8E0] hover:underline transition-colors cursor-pointer block"
                    title="Read Gramin Krishi Mausam Sewa (GKMS) Agromet Advisory Bulletin"
                  >
                    • Gramin Krishi Mausam Sewa (Agromet)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenFooterArticle('cpcb-air-quality-annual-2026')}
                    className="text-left text-[#B2BDCD] hover:text-[#4FA8E0] hover:underline transition-colors cursor-pointer block"
                    title="Read National Air Quality Index (NAQI) & Urban Pollutant Analysis"
                  >
                    • National Air Quality Index (NAQI)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenFooterArticle('aero-allergen-pollen-surveillance')}
                    className="text-left text-[#B2BDCD] hover:text-[#4FA8E0] hover:underline transition-colors cursor-pointer block"
                    title="Read Aero-Allergen & Pollen Surveillance Research Monograph"
                  >
                    • Aero-Allergen Pollen Surveillance
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-bold text-white uppercase text-[11px] block mb-2">
                {t('standardProtocolsTitle', 'Standard Protocols')}
              </span>
              <p className="text-[11px] leading-relaxed">
                <button
                  type="button"
                  onClick={() => handleOpenFooterArticle('wmo-instrument-calibration-ndma-standards')}
                  className="text-left text-[#B2BDCD] hover:text-[#4FA8E0] hover:underline transition-colors cursor-pointer block leading-relaxed"
                  title="Read WMO-No. 8 Instrument Calibration & NDMA Standards Document"
                >
                  {t('footerStandardNotice', 'Adheres to World Meteorological Organization (WMO) standards for meteorological instrument calibration and NDMA hazard classification.')}
                </button>
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-center md:text-left">
            <div>
              {t('allRightsReserved', '© 2026 MAUSAM National Meteorological Platform • India Meteorological Department')}
            </div>
            
            {/* Unified FooterNavigation component */}
            <FooterNavigation
              activeTab={activeTab}
              onNavigate={(view) => navigateToTab(view)}
            />
          </div>
        </div>
      </footer>

      {/* Global Publication / Article Modal */}
      <ReportDetailModal
        publication={selectedFooterPublication}
        isOpen={Boolean(selectedFooterPublication)}
        onClose={() => setSelectedFooterPublication(null)}
      />

      {/* Centralized Location Switching & Geolocation Modal */}
      <LocationCenterModal
        isOpen={isLocationCenterOpen}
        onClose={() => setIsLocationCenterOpen(false)}
        selectedLocation={selectedLocation}
        onSelectLocation={handleSelectLocation}
        onDetectLocation={detectLocation}
        isLocating={isLocating}
        locatePhase={locatePhase}
        locateError={locateError}
        locationSource={locationSource}
        accuracyMeters={accuracyMeters}
        lastDetectedAt={lastDetectedAt}
        nearestStationInfo={nearestStationInfo}
        onOpenPrivacyModal={() => {
          setIsLocationCenterOpen(false);
          setIsPrivacyModalOpen(true);
        }}
        onClearSavedLocation={clearSavedLocation}
      />

      {/* Privacy Policy & Geolocation Transparency Modal */}
      <LocationPrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onClearSavedLocation={clearSavedLocation}
      />

      {/* Floating Moveable Ask MAUSAM Quick Trigger */}
      <DraggableAskMausamButton
        onClick={() => setIsAskMausamOpen(true)}
        isVisible={isFloatingBtnVisible}
        bottomOffsetPx={activeTab === 'radar' ? 92 : 20}
      />

      {/* Severe Weather Alert Surge Floating Toast */}
      {globalAlertSurge && (
        <div
          id="global-severe-alert-surge-toast"
          role="alert"
          aria-live="assertive"
          className="fixed bottom-16 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-6 z-50 sm:w-full max-w-sm bg-[#1A0D10] border border-[#EF4444]/60 text-white p-4 rounded-xl shadow-2xl flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#FCA5A5]">
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Severe Warning Surge
              </span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalAlertSurge(null)}
              className="text-[#8EA3B8] hover:text-white text-xs cursor-pointer p-1"
              aria-label="Dismiss alert toast"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-[#E3F2FD] leading-relaxed">
            Active severe weather alerts increased from{' '}
            <span className="font-bold text-white">{globalAlertSurge.oldCount}</span> to{' '}
            <span className="font-bold text-[#FF8A80]">{globalAlertSurge.newCount}</span> for your sector.
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-[#3A1417]">
            <div className="flex items-center gap-1.5 text-[11px] text-[#8EA3B8]">
              <Volume2 className="w-3.5 h-3.5 text-[#FF8A80]" />
              <span>{isAudioAlertEnabled ? 'Emergency alert audio played' : 'Audio alert muted'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGlobalAlertSurge(null);
                navigateToTab('warnings');
              }}
              className="text-xs font-bold text-[#38BDF8] hover:underline cursor-pointer"
            >
              View Warnings →
            </button>
          </div>
        </div>
      )}

      {/* Ask MAUSAM Atmospheric Intelligence Drawer */}
      <AskMausamDrawer
        isOpen={isAskMausamOpen}
        onClose={() => setIsAskMausamOpen(false)}
        weather={weatherBundle.current}
        weatherBundle={weatherBundle}
        selectedLocation={selectedLocation}
        currentStation={currentStationForAi}
        onSelectLocation={handleSelectLocation}
        onNavigateTab={navigateToTab}
      />
    </div>
  );
}
