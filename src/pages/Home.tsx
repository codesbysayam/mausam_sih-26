import React, { useState, useMemo } from 'react';
import { WeatherDataBundle } from '../services/weatherService';
import { LocationRecord } from '../types';
import { LocatingPhase } from '../services/geolocationService';
import { locationService } from '../services/locationService';
import { StateWeatherData, IndiaWeatherMap } from '../components/map/IndiaWeatherMap';
import { WeatherMapMetric } from '../components/map/MapLayerControl';
import { INDIA_WEATHER_DATA } from '../data/indiaWeatherData';
import { useLanguage } from '../i18n/LanguageContext';
import { MainNavTab } from '../components/layout/MainNavigation';
import { PageHeader, ProvenanceStatus } from '../components/ui/ObservatoryPrimitives';
import { formatCoordinatePair } from '../../shared/weatherContract';

import { HomeAtmosphericHero } from '../components/home/HomeAtmosphericHero';
import { HomeHourlyTimeline } from '../components/home/HomeHourlyTimeline';
import { HomeSevenDayForecast } from '../components/home/HomeSevenDayForecast';
import { HomeWeatherInsight } from '../components/home/HomeWeatherInsight';
import { HomePersonalizedHub } from '../components/home/HomePersonalizedHub';
import { AstronomicalEphemeris } from '../components/weather/AstronomicalEphemeris';
import { HomeAirEnvironment } from '../components/home/HomeAirEnvironment';
import { HomeRadarPreview } from '../components/home/HomeRadarPreview';
import { HomeHistoricalClimateTrends } from '../components/home/HomeHistoricalClimateTrends';
import { HomeIndiaWeatherStatus } from '../components/home/HomeIndiaWeatherStatus';
import { HomeSevereWeatherStrip } from '../components/home/HomeSevereWeatherStrip';
import { HomeWhatsHappeningNow } from '../components/home/HomeWhatsHappeningNow';
import { HomeAtmosphericChangeDetector } from '../components/home/HomeAtmosphericChangeDetector';
import { DataExportActions } from '../components/common/DataExportActions';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useProviderStore } from '../store/providerStore';
import { getProviderStatusVisual } from '../services/providers/providerStatus';

import {
  Table,
  Search,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldAlert,
  SunMedium,
  Calendar,
  Radio,
  Sprout,
  Database,
  Crosshair,
  MapPin,
} from 'lucide-react';

interface HomePageProps {
  weatherBundle: WeatherDataBundle;
  selectedLocation: LocationRecord;
  onNavigateToTab: (tab: MainNavTab) => void;
  onSelectLocation: (loc: LocationRecord) => void;
  onStateSelect: (state: StateWeatherData) => void;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  onOpenLocationCenter?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  weatherBundle,
  selectedLocation,
  onNavigateToTab,
  onSelectLocation,
  onStateSelect,
  onDetectLocation,
  isLocating = false,
  locatePhase = 'idle',
  locationSource = 'MANUAL_SEARCH',
  onOpenLocationCenter,
}) => {
  const { tCondition } = useLanguage();
  const { current, hourly = [], daily = [], alerts = [], lastFetchedAt } = weatherBundle;
  const { providers, systemStatus } = useProviderStore();

  const [mapMetric, setMapMetric] = useState<WeatherMapMetric>('temperature');
  const [stateSearch, setStateSearch] = useState('');
  const [selectedStateModal, setSelectedStateModal] = useState<StateWeatherData | null>(null);
  const [showNationalDetails, setShowNationalDetails] = useState(false);

  const filteredStates = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();
    if (!q) return INDIA_WEATHER_DATA;
    return INDIA_WEATHER_DATA.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q))
    );
  }, [stateSearch]);

  const handleStateClick = (state: StateWeatherData) => {
    setSelectedStateModal(state);
    onStateSelect(state);
  };

  const handleQuickAction = (tabId: string) => {
    if (tabId === 'overview') onNavigateToTab('weather');
    else if (tabId === 'air') onNavigateToTab('aqi');
    else if (
      ['home', 'weather', 'forecast', 'warnings', 'radar', 'aqi', 'agromet', 'reports', 'debug'].includes(tabId)
    ) {
      onNavigateToTab(tabId as MainNavTab);
    }
  };

  const systemBadgeTone =
    systemStatus === 'LIVE'
      ? 'text-[#75D4A6] bg-[#2E7D5B]/15 border-[#2E7D5B]/45'
      : systemStatus === 'PARTIAL'
      ? 'text-[#F4B96B] bg-[#D98A2B]/15 border-[#D98A2B]/45'
      : 'text-[#F59B93] bg-[#B83227]/15 border-[#B83227]/45';

  const systemBadgeLabel =
    systemStatus === 'LIVE'
      ? 'All Feeds Operational'
      : systemStatus === 'PARTIAL'
      ? 'Partial Feed Availability'
      : 'Feeds Unavailable';

  const hasValidCurrentTemp =
    typeof current.temp === 'number' && Number.isFinite(current.temp);

  const headerProvenance: ProvenanceStatus =
    current.observationStatus === 'LOADING'
      ? 'LOADING'
      : !hasValidCurrentTemp
      ? 'UNAVAILABLE'
      : current.dataSource === 'IMD'
      ? 'OBSERVED'
      : current.observationStatus === 'STALE'
      ? 'STALE'
      : 'MODEL_DERIVED';

  const coordDisplay =
    typeof selectedLocation.lat === 'number' &&
    Number.isFinite(selectedLocation.lat) &&
    typeof selectedLocation.lng === 'number' &&
    Number.isFinite(selectedLocation.lng)
      ? formatCoordinatePair(selectedLocation.lat, selectedLocation.lng, 2)
      : undefined;

  const retrievedAtFormatted = lastFetchedAt
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(lastFetchedAt) + ' IST'
    : null;

  return (
    <div id="mausam-home-view" className="flex flex-col gap-6 w-full pb-14">
      {/* 1. EDITORIAL ATMOSPHERIC INTELLIGENCE HEADER */}
      <PageHeader
        eyebrow={`MAUSAM ATMOSPHERIC INTELLIGENCE · ${locationSource === 'DEVICE_GPS' ? 'DEVICE GPS' : 'SELECTED STATION'}`}
        title={
          selectedLocation.city
            ? `${selectedLocation.city}${selectedLocation.state ? `, ${selectedLocation.state}` : ''}`
            : selectedLocation.name
        }
        description="Read the atmosphere. Surface analysis, Doppler radar sweeps, astronomical ephemeris, and regional warning bulletins."
        coordinates={coordDisplay}
        status={headerProvenance}
        source={current.source || 'Open-Meteo Surface Analysis (Forecast Grid)'}
        updatedAt={current.lastUpdated || null}
        retrievedAt={retrievedAtFormatted}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {onDetectLocation && (
              <button
                type="button"
                onClick={() => onDetectLocation(true)}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border-strong)] text-xs font-semibold text-[var(--m-text-primary)] transition-colors cursor-pointer disabled:opacity-50 m-focus-ring"
              >
                <Crosshair className={`w-3.5 h-3.5 text-[#2C7BE5] ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating…' : 'Use GPS'}</span>
              </button>
            )}
            {onOpenLocationCenter && (
              <button
                type="button"
                onClick={onOpenLocationCenter}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg bg-[#2C7BE5] hover:bg-[#1E63C2] text-xs font-semibold text-[#F5F3ED] transition-colors cursor-pointer m-focus-ring"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Change City</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. OFFICIAL WARNINGS / SACHET ALERT CENTER */}
      <HomeSevereWeatherStrip
        alerts={alerts}
        selectedLocation={selectedLocation}
        lastUpdated={current.lastUpdated}
        onNavigateToWarnings={() => onNavigateToTab('warnings')}
      />

      {/* 3. PRIMARY LOCAL ATMOSPHERIC HERO */}
      <HomeAtmosphericHero
        weather={current}
        location={selectedLocation}
        lastUpdated={current.lastUpdated}
        onExploreMap={() => onNavigateToTab('radar')}
        onExploreWeather={() => onNavigateToTab('weather')}
        onExploreForecast={() => onNavigateToTab('forecast')}
        onDetectLocation={onDetectLocation}
        isLocating={isLocating}
        locatePhase={locatePhase}
      />

      {/* 4. MAP-FIRST RADAR PREVIEW WORKSPACE */}
      <ErrorBoundary fallbackTitle="Doppler Radar Preview">
        <HomeRadarPreview
          location={selectedLocation}
          onNavigateToRadar={() => onNavigateToTab('radar')}
        />
      </ErrorBoundary>

      {/* 5. HOURLY & 7-DAY FORECAST PROGRESSION */}
      <HomeHourlyTimeline
        hourly={hourly}
        onNavigateToHourly={() => onNavigateToTab('weather')}
      />

      <HomeSevenDayForecast
        daily={daily}
        onNavigateToForecast={() => onNavigateToTab('forecast')}
      />

      {/* 6. NOWCAST SUMMARY & ATMOSPHERIC CHANGE DETECTOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <HomeWhatsHappeningNow
          weatherBundle={weatherBundle}
          selectedLocation={selectedLocation}
          lastUpdated={current.lastUpdated}
          onNavigateToTab={onNavigateToTab}
        />
        <HomeAtmosphericChangeDetector
          current={current}
          selectedLocation={selectedLocation}
          lastUpdated={current.lastUpdated}
        />
      </div>

      {/* 7. ASTRONOMICAL EPHEMERIS (SUNRISE, SOLAR ZENITH, SUNSET) & LOCAL AIR QUALITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-6">
          <AstronomicalEphemeris
            location={selectedLocation}
            weather={current}
          />
        </div>
        <div className="lg:col-span-6">
          <HomeAirEnvironment
            weather={current}
            location={selectedLocation}
            lastUpdated={current.lastUpdated}
            onNavigateToAqi={() => onNavigateToTab('aqi')}
          />
        </div>
      </div>

      {/* 8. PRACTICAL GUIDANCE & ACTIVITY INTELLIGENCE */}
      <div className="grid grid-cols-1 gap-5">
        <HomeWeatherInsight weather={current} todayForecast={daily[0]} />
        <HomePersonalizedHub
          weather={current}
          hourly={hourly}
          daily={daily}
          alerts={alerts}
          onNavigateToWeather={() => onNavigateToTab('weather')}
        />
      </div>

      {/* 9. REGIONAL REFERENCE SNAPSHOT & COLLAPSIBLE 36-STATE DIRECTORY */}
      <HomeIndiaWeatherStatus onNavigate={handleQuickAction} lastUpdated={current.lastUpdated} />

      <section className="m-panel overflow-hidden">
        <button
          type="button"
          onClick={() => setShowNationalDetails((prev) => !prev)}
          aria-expanded={showNationalDetails}
          className="w-full px-4 py-3.5 min-h-[52px] flex items-center justify-between gap-3 text-left hover:bg-[#101F2E] transition-colors cursor-pointer m-focus-ring"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Table className="w-4 h-4 text-[#35C7E8] shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-semibold text-[#F3F6FA] block">
                National Regional Reference Map &amp; 36-State Table
              </span>
              <span className="text-xs text-[#8295A8] block truncate">
                Inspect state-by-state capital reference conditions and export CSV/Excel
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#35C7E8] shrink-0">
            <span>{showNationalDetails ? 'Collapse' : 'Expand'}</span>
            {showNationalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showNationalDetails && (
          <div className="p-4 sm:p-5 border-t border-[#26394B] flex flex-col gap-5">
            <ErrorBoundary fallbackTitle="National Weather Observation Map">
              <IndiaWeatherMap
                data={INDIA_WEATHER_DATA}
                metric={mapMetric}
                onMetricChange={setMapMetric}
                selectedState={selectedLocation.state || selectedLocation.name}
                onStateSelect={handleStateClick}
              />
            </ErrorBoundary>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#26394B]">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8295A8]" />
                <input
                  type="text"
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  placeholder="Filter by state or city..."
                  className="w-full h-10 bg-[#08131F] border border-[#26394B] focus:border-[#35C7E8] rounded-lg text-[#F3F6FA] text-xs pl-9 pr-8 focus:outline-none m-focus-ring"
                  aria-label="Filter by state or city name"
                />
                {stateSearch && (
                  <button
                    type="button"
                    onClick={() => setStateSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8295A8] hover:text-[#F3F6FA] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <DataExportActions
                data={filteredStates}
                reportTitle="Mausam State & Union Territory Regional Reference"
              />
            </div>

            <div className="table-wrapper rounded-lg border border-[#26394B]">
              <table className="w-full text-xs text-left border-collapse tabular-nums">
                <thead className="bg-[#08131F] text-[#8295A8] font-semibold uppercase text-[10px] tracking-wider border-b border-[#26394B]">
                  <tr>
                    <th className="p-3">State / UT</th>
                    <th className="p-3">Capital</th>
                    <th className="p-3">Ref Temp</th>
                    <th className="p-3">Condition</th>
                    <th className="p-3">Rain</th>
                    <th className="p-3">Humidity</th>
                    <th className="p-3">Ref AQI</th>
                    <th className="p-3">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {filteredStates.map((state) => {
                    const isWarning = state.rainfall >= 25 || state.temperature >= 38;
                    const isWatch = state.rainfall >= 15 || state.temperature >= 34;

                    const alertClass = isWarning
                      ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/35'
                      : isWatch
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/35'
                      : 'bg-[#22C7A0]/15 text-[#22C7A0] border-[#22C7A0]/35';

                    const alertLabel = isWarning ? 'Warning' : isWatch ? 'Watch' : 'Routine';

                    return (
                      <tr
                        key={state.id}
                        onClick={() => handleStateClick(state)}
                        className="hover:bg-[#101F2E] cursor-pointer transition-colors bg-[#0B1927]"
                      >
                        <td className="p-3 font-medium text-[#F4F7FA]">{state.name}</td>
                        <td className="p-3 text-[#B6C7D8]">{state.city || '—'}</td>
                        <td className="p-3 font-mono font-semibold text-[#38BDF8]">
                          {state.temperature}°C
                        </td>
                        <td className="p-3 text-[#B6C7D8]">{tCondition(state.condition)}</td>
                        <td className="p-3 font-mono text-[#B6C7D8]">
                          {state.rainfall > 0 ? `${state.rainfall} mm` : '0 mm'}
                        </td>
                        <td className="p-3 font-mono text-[#B6C7D8]">{state.humidity}%</td>
                        <td className="p-3 font-mono text-[#F4F7FA]">{state.aqi}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${alertClass}`}>
                            {alertLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 10. HISTORICAL CLIMATE NORMALS */}
      <ErrorBoundary fallbackTitle="Historical Climate Trends">
        <HomeHistoricalClimateTrends location={selectedLocation} />
      </ErrorBoundary>

      {/* 11. COMPACT REAL SYSTEM PROVENANCE STRIP (Full Telemetry lives in Data & Sources) */}
      <section className="m-panel px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${systemBadgeTone}`}>
            {systemBadgeLabel}
          </span>
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-[#8295A8]">
            {(['WEATHER', 'RADAR', 'AQI', 'NWP', 'SACHET', 'IMD'] as const).map((pid) => {
              const st = providers[pid];
              const vis = getProviderStatusVisual(st.status);
              return (
                <span key={pid} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#08131F] border border-[#26394B]">
                  <span className={`w-1.5 h-1.5 rounded-full ${vis.dotClass}`} />
                  <span className="text-[#F3F6FA]">{pid}</span>
                  <span className={vis.textClass}>{vis.label}</span>
                </span>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToTab('debug')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#35C7E8] hover:text-[#F3F6FA] shrink-0 cursor-pointer self-start md:self-auto m-focus-ring"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Data &amp; Sources Diagnostics</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* 12. WORKSPACE SHORTCUTS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          {
            tab: 'radar' as MainNavTab,
            title: 'Weather Map & Radar',
            desc: 'Interactive atmospheric layers, 6h radar playback & point inspector',
            icon: Radio,
            color: 'text-[#35C7E8]',
          },
          {
            tab: 'forecast' as MainNavTab,
            title: 'Forecast & NWP Ensemble',
            desc: 'WRF-4km, GEFS & ECMWF multi-model guidance and 7-day trends',
            icon: Calendar,
            color: 'text-[#22C7A0]',
          },
          {
            tab: 'weather' as MainNavTab,
            title: 'Local Weather Detail',
            desc: 'Full meteorological telemetry, solar dynamics & coastal metrics',
            icon: SunMedium,
            color: 'text-[#35C7E8]',
          },
          {
            tab: 'warnings' as MainNavTab,
            title: 'Official Alerts & CAP',
            desc: 'SACHET / NDMA warning bulletins and district-level impacts',
            icon: ShieldAlert,
            color: 'text-[#F59E0B]',
          },
          {
            tab: 'aqi' as MainNavTab,
            title: 'Air Quality & Exposure',
            desc: 'Hourly atmospheric chemistry, PM2.5/PM10 & health advisories',
            icon: Activity,
            color: 'text-[#FCD34D]',
          },
          {
            tab: 'agromet' as MainNavTab,
            title: 'Gramin Krishi Agromet',
            desc: 'Soil moisture, evapotranspiration, spray windows & crop advisories',
            icon: Sprout,
            color: 'text-[#22C7A0]',
          },
        ].map((tool) => {
          const ToolIcon = tool.icon;
          return (
            <button
              key={tool.tab}
              type="button"
              onClick={() => onNavigateToTab(tool.tab)}
              className="p-4 m-panel hover:border-[#38536A] hover:bg-[#101F2E] transition-colors text-left flex items-start gap-3 group cursor-pointer m-focus-ring"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#08131F] border border-[#26394B] ${tool.color}`}>
                <ToolIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F3F6FA] group-hover:text-[#35C7E8] transition-colors">
                    {tool.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8295A8] group-hover:text-[#F3F6FA] transition-colors" />
                </div>
                <p className="text-xs text-[#8295A8] mt-1 leading-snug">{tool.desc}</p>
              </div>
            </button>
          );
        })}
      </section>

      {/* State Selection Modal */}
      {selectedStateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          onClick={() => setSelectedStateModal(null)}
        >
          <div
            className="w-full max-w-lg m-panel-elevated p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#26394B] mb-4">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#35C7E8]">
                  Regional Reference Profile
                </span>
                <h3 className="text-lg font-bold text-[#F3F6FA]">{selectedStateModal.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStateModal(null)}
                aria-label="Close regional reference profile"
                className="w-9 h-9 rounded-lg bg-[#08131F] text-[#8295A8] hover:text-[#F3F6FA] flex items-center justify-center cursor-pointer border border-[#26394B] m-focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5 font-mono tabular-nums">
              <div className="p-3 m-panel-inset">
                <span className="text-[10px] font-sans text-[#8295A8] uppercase block">Capital City</span>
                <span className="text-sm font-sans font-bold text-[#F3F6FA]">
                  {selectedStateModal.city || selectedStateModal.name}
                </span>
              </div>
              <div className="p-3 m-panel-inset">
                <span className="text-[10px] font-sans text-[#8295A8] uppercase block">Reference Temp</span>
                <span className="text-lg font-bold text-[#35C7E8]">
                  {selectedStateModal.temperature}°C
                </span>
              </div>
              <div className="p-3 m-panel-inset">
                <span className="text-[10px] font-sans text-[#8295A8] uppercase block">Condition</span>
                <span className="text-sm font-sans font-semibold text-[#B5C3D1]">
                  {selectedStateModal.condition}
                </span>
              </div>
              <div className="p-3 m-panel-inset">
                <span className="text-[10px] font-sans text-[#8295A8] uppercase block">Reference AQI</span>
                <span className="text-sm font-bold text-[#FCD34D]">
                  AQI {selectedStateModal.aqi}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const matched =
                    locationService.findLocationByName(
                      selectedStateModal.city || selectedStateModal.name
                    ) || locationService.findLocationsByState(selectedStateModal.name)[0];
                  if (matched) {
                    onSelectLocation(matched);
                  }
                  setSelectedStateModal(null);
                  onNavigateToTab('weather');
                }}
                className="w-full min-h-[42px] rounded-xl bg-[#0B72B9] hover:bg-[#0D82D1] text-[#F3F6FA] text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition-colors m-focus-ring"
              >
                <span>Open Live Weather for {selectedStateModal.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

