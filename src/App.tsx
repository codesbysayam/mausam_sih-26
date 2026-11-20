import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LocationRecord, WeatherStation } from './types';
import type { CyclonePayload } from './types/cyclone';
import { locationService } from './services/locationService';
import { weatherService, WeatherDataBundle } from './services/weatherService';
import { cycloneService } from './services/cycloneService';
import { MainNavTab } from './components/layout/MainNavigation';
import { FooterNavigation, FooterView } from './components/layout/FooterNavigation';
import { StateWeatherData } from './components/map/IndiaWeatherMap';
import { AskMausamDrawer } from './components/AskMausamDrawer';
import { ReportDetailModal } from './components/ReportDetailModal';
import { OFFICIAL_PUBLICATIONS, MeteorologicalPublication } from './data/reportsAndArticles';
import { useLanguage } from './i18n/LanguageContext';
import { useLocation } from './context/LocationContext';
import { ExperienceMode, useExperience } from './context/ExperienceContext';
import { LocationCenterModal } from './components/location/LocationCenterModal';
import { LocationPrivacyModal } from './components/location/LocationPrivacyModal';
import { NetworkStatusBanner } from './components/common/NetworkStatusBanner';
import { FloatingBrandBar } from './components/experience/FloatingBrandBar';
import { ExploreWorkspace } from './components/experience/ExploreWorkspace';
import { AnalyzeWorkspace } from './components/experience/AnalyzeWorkspace';
import { ClassicWorkspace } from './components/experience/ClassicWorkspace';
import { AlertCenterModal } from './components/experience/AlertCenterModal';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useAlertAudio } from './hooks/useAlertAudio';
import { Volume2, AlertTriangle, X } from 'lucide-react';
import './styles/mausam.css';

export type AppView = MainNavTab | FooterView | 'not-found';

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
  const { mode, setMode, surfaceTheme, flyCameraTo } = useExperience();
  const weatherRequestIdRef = useRef(0);

  const [activeTab, setActiveTab] = useState<AppView>(() =>
    getTabFromPathname(window.location.pathname)
  );

  // Sync active mode theme to documentElement & theme-color meta:
  // Explore -> dark-workspace (3D atmospheric stage)
  // Classic -> classic (light, high-contrast, low-GPU linear edition)
  // Analyze -> Observatory dark default (or user-selected paper theme)
  const activeTheme =
    mode === 'explore' ? 'dark-workspace' : mode === 'classic' ? 'classic' : surfaceTheme;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', activeTheme);
    const isDarkSurface = activeTheme === 'dark' || activeTheme === 'dark-workspace';
    document.documentElement.classList.toggle('dark', isDarkSurface);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute(
        'content',
        activeTheme === 'classic' ? '#F4F6F7' : activeTheme === 'paper' ? '#F7F6F1' : '#07111B'
      );
    }
  }, [activeTheme]);

  // If landing directly on a deep sub-route (e.g. /forecast or /radar), synchronize initial mode cleanly
  useEffect(() => {
    const initialTab = getTabFromPathname(window.location.pathname);
    if (initialTab !== 'home') {
      setMode('analyze');
    }
  }, [setMode]);

  const {
    location: selectedLocation,
    locationSource,
    isLocating,
    locatePhase,
    locateError,
    accuracyMeters,
    refreshLocation: detectLocation,
    changeLocation: handleSelectLocation,
    clearSavedLocation,
    openLocationModal,
    closeLocationModal,
    isLocationModalOpen: isLocationCenterOpen,
    openPrivacyModal,
    closePrivacyModal,
    isPrivacyModalOpen,
    lastUpdatedTime: lastDetectedAt,
    nearestStationInfo,
  } = useLocation();

  const setIsLocationCenterOpen = (open: boolean) => (open ? openLocationModal() : closeLocationModal());
  const setIsPrivacyModalOpen = (open: boolean) => (open ? openPrivacyModal() : closePrivacyModal());

  const [weatherBundle, setWeatherBundle] = useState<WeatherDataBundle>(() =>
    weatherService.createInitialLoadingBundle(selectedLocation)
  );

  const [cyclonePayload, setCyclonePayload] = useState<CyclonePayload | null>(() =>
    cycloneService.getCachedPayload()
  );
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isAskMausamOpen, setIsAskMausamOpen] = useState(false);
  const [selectedFooterPublication, setSelectedFooterPublication] =
    useState<MeteorologicalPublication | null>(null);
  const [globalAlertSurge, setGlobalAlertSurge] = useState<{ newCount: number; oldCount: number } | null>(null);

  // Sync cyclone payload for real-time 3D cyclone/basin markers
  useEffect(() => {
    let active = true;
    const unsub = cycloneService.subscribe((data) => {
      if (active) setCyclonePayload(data);
    });
    cycloneService.fetchCycloneData(false).catch(() => {});
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const { isAudioAlertEnabled } = useAlertAudio({
    warnings: weatherBundle.alerts,
    onNewAlertTriggered: () => {
      setGlobalAlertSurge({
        newCount: weatherBundle.alerts?.length || 1,
        oldCount: 0,
      });
      setTimeout(() => setGlobalAlertSurge(null), 8000);
    },
  });

  const { isOnline, isApiReachable, retryConnection } = useNetworkStatus();

  const handleOpenFooterArticle = useCallback((pubId: string) => {
    const pub = OFFICIAL_PUBLICATIONS.find((p) => p.id === pubId);
    if (pub) setSelectedFooterPublication(pub);
  }, []);

  // Browser back/forward synchronization
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPathname(window.location.pathname);
      setActiveTab(tab);
      if (tab !== 'home') {
        setMode('analyze');
      }
      if (typeof window !== 'undefined' && (window as any).MausamSEO) {
        (window as any).MausamSEO.updateMeta(window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setMode]);

  const navigateToTab = useCallback(
    (tab: AppView, pushHistory = true) => {
      setActiveTab(tab);
      setMode('analyze');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const targetPath = getPathForView(tab);
      if (pushHistory && window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
      if (typeof window !== 'undefined') {
        if ((window as any).MausamSEO?.updateMeta) {
          (window as any).MausamSEO.updateMeta(targetPath);
        }
        if ((window as any).MausamAnalytics?.trackPageView) {
          (window as any).MausamAnalytics.trackPageView(targetPath);
        }
      }
    },
    [setMode]
  );

  const handleSwitchMode = useCallback(
    (nextMode: ExperienceMode) => {
      setMode(nextMode);
      if (nextMode === 'explore' || nextMode === 'classic') {
        setActiveTab('home');
        if (window.location.pathname !== '/') {
          window.history.pushState({ tab: 'home' }, '', '/');
        }
      } else if (nextMode === 'analyze') {
        const nextTab = activeTab;
        const path = getPathForView(nextTab);
        if (window.location.pathname !== path) {
          window.history.pushState({ tab: nextTab }, '', path);
        }
      }
    },
    [activeTab, setMode]
  );

  const loadWeatherData = useCallback(async (location: LocationRecord, forceRefresh = false) => {
    const requestId = ++weatherRequestIdRef.current;
    setIsLoadingWeather(true);
    try {
      const bundle = await weatherService.getWeatherData(location, forceRefresh);
      if (requestId !== weatherRequestIdRef.current) return;
      setWeatherBundle({
        ...bundle,
        hourly: Array.isArray(bundle.hourly) ? bundle.hourly : [],
        daily: Array.isArray(bundle.daily) ? bundle.daily : [],
        trends: Array.isArray(bundle.trends) ? bundle.trends : [],
        alerts: Array.isArray(bundle.alerts) ? bundle.alerts : [],
      });
    } catch (err) {
      if (requestId !== weatherRequestIdRef.current) return;
      console.warn('Weather sync error, marking telemetry unavailable:', err);
      setWeatherBundle(
        weatherService.createUnavailableBundle(
          location,
          err instanceof Error ? err.message : 'Unable to reach meteorological telemetry service.'
        )
      );
    } finally {
      if (requestId === weatherRequestIdRef.current) {
        setIsLoadingWeather(false);
      }
    }
  }, []);

  useEffect(() => {
    loadWeatherData(selectedLocation);
  }, [selectedLocation, loadWeatherData]);

  const handleStateSelect = useCallback(
    (state: StateWeatherData) => {
      const matched =
        locationService.findLocationByName(state.city || state.name) ||
        locationService.findLocationsByState(state.name)[0];

      if (matched) {
        handleSelectLocation(matched);
        flyCameraTo(matched.lat, matched.lng, 2.95);
        if (mode !== 'explore') {
          navigateToTab('weather');
        }
      }
    },
    [flyCameraTo, handleSelectLocation, mode, navigateToTab]
  );

  const currentStationForAi: WeatherStation = {
    id: selectedLocation.id,
    name: selectedLocation.displayName,
    code: selectedLocation.imdStation || 'AWS-STATION',
    state: selectedLocation.state,
    district: selectedLocation.district,
    lat: selectedLocation.lat,
    lng: selectedLocation.lng,
    elevation: selectedLocation.elevation || '—',
    status: 'active',
    pm25: weatherBundle.current.aqiPm25 ?? null,
    temp: weatherBundle.current.temp ?? null,
    condition: weatherBundle.current.condition,
    weatherType: weatherBundle.current.weatherType,
    isCoastal: selectedLocation.coastalStatus === 'coastal',
  };

  return (
    <div
      data-theme={activeTheme}
      className="mausam-app min-h-screen bg-[var(--m-canvas)] text-[var(--m-text-primary)] flex flex-col font-sans w-full overflow-x-hidden transition-colors duration-200"
    >
      {/* Network Offline / Degraded Banner */}
      <NetworkStatusBanner
        isOnline={isOnline}
        isApiReachable={isApiReachable}
        lastSyncedAt={weatherBundle.lastFetchedAt}
        onRetry={async () => {
          await retryConnection();
          await loadWeatherData(selectedLocation, true);
        }}
      />

      {/* Single Unified Floating Brand, Search & Experience Mode Bar */}
      <FloatingBrandBar
        selectedLocation={selectedLocation}
        onSelectLocation={(loc) => {
          handleSelectLocation(loc);
          flyCameraTo(loc.lat, loc.lng, 2.95);
        }}
        onDetectLocation={detectLocation}
        isLocating={isLocating}
        onOpenLocationCenter={() => setIsLocationCenterOpen(true)}
        onOpenAskMausam={() => setIsAskMausamOpen(true)}
        alerts={weatherBundle.alerts || []}
        onSwitchMode={handleSwitchMode}
      />

      {/* Active Experience Workspace */}
      <main id="main-content" className="relative flex-1 w-full min-w-0">
        {isLoadingWeather && (
          <div
            id="weather-sync-progress-bar"
            className="mausam-progress-indeterminate fixed top-0 left-0 right-0 z-50"
            role="progressbar"
            aria-label="Updating live meteorological telemetry"
            aria-busy="true"
          >
            <div className="mausam-progress-indeterminate-bar" />
          </div>
        )}

        {mode === 'explore' && (
          <ExploreWorkspace
            selectedLocation={selectedLocation}
            weatherBundle={weatherBundle}
            cyclonePayload={cyclonePayload}
            onSelectLocation={handleSelectLocation}
            onOpenAnalyzeTab={(tab) => navigateToTab(tab)}
            onOpenAskMausam={() => setIsAskMausamOpen(true)}
          />
        )}

        {mode === 'analyze' && (
          <AnalyzeWorkspace
            activeTab={activeTab}
            onNavigateTab={(tab) => navigateToTab(tab)}
            weatherBundle={weatherBundle}
            selectedLocation={selectedLocation}
            isLoadingWeather={isLoadingWeather}
            onRefreshWeather={() => loadWeatherData(selectedLocation, true)}
            onSelectLocation={handleSelectLocation}
            onStateSelect={handleStateSelect}
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

        {mode === 'classic' && (
          <ClassicWorkspace
            weatherBundle={weatherBundle}
            selectedLocation={selectedLocation}
            onNavigateToAnalyze={(tab) => navigateToTab(tab)}
            onSelectLocation={handleSelectLocation}
            onStateSelect={handleStateSelect}
            onDetectLocation={detectLocation}
            isLocating={isLocating}
            locatePhase={locatePhase}
            locationSource={locationSource}
            onOpenLocationCenter={() => setIsLocationCenterOpen(true)}
          />
        )}
      </main>

      {/* Official Institutional Footer (Rendered in Analyze & Classic modes so 3D Explore stage remains uncropped) */}
      {mode !== 'explore' && (
        <footer className="site-footer w-full text-xs text-[var(--m-text-muted)]">
          <div className="site-footer__inner">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-[var(--m-border)]">
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[var(--m-text-primary)] font-bold text-sm tracking-tight">
                    {t('mausamPortal', 'MAUSAM')}
                  </span>
                  <span className="text-[var(--m-accent)] text-[10px] font-mono font-semibold uppercase tracking-wider">
                    Atmospheric Intelligence
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--m-text-secondary)]">
                  {t(
                    'footerTagline',
                    'National atmospheric intelligence, numerical weather guidance, radar nowcasting, and environmental observation platform for India.'
                  )}
                </p>
              </div>

              <div>
                <span className="font-mono font-semibold text-[var(--m-text-primary)] uppercase text-[11px] tracking-wider block mb-2.5">
                  {t('dataProvidersTitle', 'Data Providers & Networks')}
                </span>
                <ul className="space-y-1 text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleOpenFooterArticle('dwr-all-india-20260826')}
                      className="text-left text-[var(--m-text-secondary)] hover:text-[var(--m-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer block min-h-[36px] sm:min-h-[28px]"
                    >
                      {t('imdCredit', 'India Meteorological Department (IMD)')}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleOpenFooterArticle('ncmrwf-unified-model-nwp')}
                      className="text-left text-[var(--m-text-secondary)] hover:text-[var(--m-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer block min-h-[36px] sm:min-h-[28px]"
                    >
                      {t('ncmrwfCredit', 'NCMRWF Global & Regional Models')}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleOpenFooterArticle('cpcb-air-quality-annual-2026')}
                      className="text-left text-[var(--m-text-secondary)] hover:text-[var(--m-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer block min-h-[36px] sm:min-h-[28px]"
                    >
                      {t('cpcbCredit', 'Central Pollution Control Board (CPCB)')}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleOpenFooterArticle('isro-mosdac-satellite-meteorology')}
                      className="text-left text-[var(--m-text-secondary)] hover:text-[var(--m-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer block min-h-[36px] sm:min-h-[28px]"
                    >
                      {t('isroCredit', 'ISRO MOSDAC Earth Observation')}
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <span className="font-mono font-semibold text-[var(--m-text-primary)] uppercase text-[11px] tracking-wider block mb-2.5">
                  {t('citizenServicesTitle', 'Citizen Meteorological Services')}
                </span>
                <ul className="space-y-1 text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleOpenFooterArticle('doppler-radar-nowcasting-techniques')}
                      className="text-left text-[var(--m-text-secondary)] hover:text-[var(--m-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer block min-h-[36px] sm:min-h-[28px]"
                    >
                      Nowcasting &amp; Thunderstorm Warnings
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleOpenFooterArticle('agromet-advisory-gkms-odisha-india')}
                      className="text-left text-[var(--m-text-secondary)] hover:text-[var(--m-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer block min-h-[36px] sm:min-h-[28px]"
                    >
                      Gramin Krishi Mausam Sewa (Agromet)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleOpenFooterArticle('cpcb-air-quality-annual-2026')}
                      className="text-left text-[var(--m-text-secondary)] hover:text-[var(--m-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer block min-h-[36px] sm:min-h-[28px]"
                    >
                      National Air Quality Index (NAQI)
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => handleOpenFooterArticle('aero-allergen-pollen-surveillance')}
                      className="text-left text-[var(--m-text-secondary)] hover:text-[var(--m-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer block min-h-[36px] sm:min-h-[28px]"
                    >
                      Aero-Allergen Pollen Surveillance
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <span className="font-mono font-semibold text-[var(--m-text-primary)] uppercase text-[11px] tracking-wider block mb-2.5">
                  {t('standardProtocolsTitle', 'Standard Protocols')}
                </span>
                <p className="text-xs leading-relaxed">
                  <button
                    type="button"
                    onClick={() => handleOpenFooterArticle('wmo-instrument-calibration-ndma-standards')}
                    className="text-left text-[var(--m-text-secondary)] hover:text-[var(--m-accent)] hover:underline underline-offset-4 transition-colors cursor-pointer block leading-relaxed"
                  >
                    {t(
                      'footerStandardNotice',
                      'Adheres to World Meteorological Organization (WMO) standards for meteorological reporting and NDMA hazard classification.'
                    )}
                  </button>
                </p>
              </div>
            </div>

            <div className="pt-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-center md:text-left">
              <div className="text-[var(--m-text-muted)]">
                {t(
                  'allRightsReserved',
                  '© 2026 MAUSAM Atmospheric Intelligence • Open-Meteo & Institutional Reference Feeds'
                )}
              </div>

              <FooterNavigation activeTab={activeTab} onNavigate={(view) => navigateToTab(view)} />
            </div>
          </div>
        </footer>
      )}

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
        onSelectLocation={(loc) => {
          handleSelectLocation(loc);
          flyCameraTo(loc.lat, loc.lng, 2.95);
        }}
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

      {/* Severe Weather Alert Surge Floating Toast */}
      {globalAlertSurge && (
        <div
          id="global-severe-alert-surge-toast"
          role="alert"
          aria-live="assertive"
          className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 z-50 sm:w-full max-w-sm bg-[var(--m-surface-1)] border border-[var(--m-danger)]/50 text-[var(--m-text-primary)] p-4 rounded-xl shadow-2xl flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--m-danger)]">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Severe Warning Surge
              </span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalAlertSurge(null)}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer"
              aria-label="Dismiss alert toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
            Active severe weather alerts increased from{' '}
            <span className="font-mono font-bold text-[var(--m-text-primary)] tabular-nums">{globalAlertSurge.oldCount}</span> to{' '}
            <span className="font-mono font-bold text-[var(--m-danger)] tabular-nums">{globalAlertSurge.newCount}</span> for your sector.
          </p>

          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--m-border)]">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--m-text-muted)]">
              <Volume2 className="w-3.5 h-3.5 text-[var(--m-danger)]" />
              <span>{isAudioAlertEnabled ? 'Emergency alert audio played' : 'Audio alert muted'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGlobalAlertSurge(null);
                navigateToTab('warnings');
              }}
              className="text-xs font-semibold text-[var(--m-accent)] hover:underline cursor-pointer min-h-[36px] px-1"
            >
              View Warnings →
            </button>
          </div>
        </div>
      )}

      {/* Global SACHET / IMD Hazard Alert Center Drawer (works in Analyze, Explore & Classic) */}
      <AlertCenterModal
        selectedLocation={selectedLocation}
        alerts={weatherBundle.alerts || []}
        onOpenFullWarningsPage={() => navigateToTab('warnings')}
      />

      {/* Ask MAUSAM Atmospheric Intelligence Drawer */}
      <AskMausamDrawer
        isOpen={isAskMausamOpen}
        onClose={() => setIsAskMausamOpen(false)}
        weather={weatherBundle.current}
        weatherBundle={weatherBundle}
        selectedLocation={selectedLocation}
        currentStation={currentStationForAi}
        onSelectLocation={(loc) => {
          handleSelectLocation(loc);
          flyCameraTo(loc.lat, loc.lng, 2.95);
        }}
        onNavigateTab={(tab) => navigateToTab(tab as AppView)}
      />
    </div>
  );
}
