import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WeatherDataBundle } from '../services/weatherService';
import { LocationRecord } from '../types';
import { ALL_INDIA_LOCATIONS } from '../data/allIndiaLocations';
import { LocationWeatherHero } from '../components/weather/LocationWeatherHero';
import { WeatherStatusStrip } from '../components/weather/WeatherStatusStrip';
import { WeatherTelemetryGrid } from '../components/weather/WeatherTelemetryGrid';
import { WeatherWidgets } from '../components/weather/WeatherWidgets';
import { HourlyWeatherTimeline } from '../components/weather/HourlyWeatherTimeline';
import { SevenDaySynopticForecast } from '../components/weather/SevenDaySynopticForecast';
import { AstronomicalEphemeris } from '../components/weather/AstronomicalEphemeris';
import { SolarDynamics } from '../components/weather/SolarDynamics';
import { PersonaWeatherHub } from '../components/weather/personas/PersonaWeatherHub';
import { WeatherDecisionCenter } from '../components/weather/WeatherDecisionCenter';
import { CoastalMarineSection } from '../components/weather/CoastalMarineSection';
import { LightningThunderstormSection } from '../components/weather/LightningThunderstormSection';
import { WeatherDataExplainer } from '../components/weather/WeatherDataExplainer';
import { buildHumanWeatherStory } from '../services/humanWeatherEngine';
import { LocatingPhase, GeolocationServiceError, NearestStationResult } from '../services/geolocationService';
import { PrintReportHeader } from '../components/common/PrintReportHeader';
import { useProvider } from '../store/providerStore';
import { formatCoordinatePair } from '../../shared/weatherContract';
import {
  PageHeader,
  DataPanel,
  SectionHeading,
  SourceStatus,
  ProvenanceStatus,
} from '../components/ui/ObservatoryPrimitives';
import {
  Activity,
  Radio,
  ArrowRight,
  Sparkles,
  Search,
  RefreshCw,
  Printer,
  Navigation,
  MapPin,
  X,
} from 'lucide-react';

interface WeatherPageProps {
  weatherBundle: WeatherDataBundle;
  selectedLocation: LocationRecord;
  onRefresh: () => void;
  onChangeLocationClick?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onSelectLocation?: (location: LocationRecord) => void;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  locateError?: GeolocationServiceError | null;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  accuracyMeters?: number | null;
  nearestStationInfo?: NearestStationResult | null;
  onOpenLocationCenter?: () => void;
  onOpenPrivacyModal?: () => void;
}

export const WeatherPage: React.FC<WeatherPageProps> = ({
  weatherBundle,
  selectedLocation,
  onRefresh,
  onChangeLocationClick,
  onNavigateToTab,
  onSelectLocation,
  onDetectLocation,
  isLocating = false,
  locationSource = 'MANUAL_SEARCH',
  onOpenLocationCenter,
}) => {
  const { current, hourly = [], daily = [], alerts = [], lastFetchedAt } = weatherBundle;
  const { state: radarProvider } = useProvider('RADAR');
  const { state: aqiProvider } = useProvider<any>('AQI');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return ALL_INDIA_LOCATIONS.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return ALL_INDIA_LOCATIONS.filter(
      (loc) =>
        loc.city.toLowerCase().includes(q) ||
        loc.state.toLowerCase().includes(q) ||
        (loc.district && loc.district.toLowerCase().includes(q)) ||
        (loc.imdStation && loc.imdStation.toLowerCase().includes(q)) ||
        (loc.id && loc.id.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [searchQuery]);

  const formattedLastUpdated = lastFetchedAt
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(lastFetchedAt) + ' IST'
    : null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const weatherStory = useMemo(() => {
    return buildHumanWeatherStory(current, hourly, daily, alerts, 'general');
  }, [current, hourly, daily, alerts]);

  const rawAqi =
    typeof aqiProvider.data?.aqi === 'number' && Number.isFinite(aqiProvider.data.aqi)
      ? Math.round(aqiProvider.data.aqi)
      : typeof current.aqi === 'number' && Number.isFinite(current.aqi)
      ? Math.round(current.aqi)
      : typeof current.aqiIndex === 'number' && Number.isFinite(current.aqiIndex)
      ? Math.round(current.aqiIndex)
      : null;

  const aqiCategory =
    rawAqi === null
      ? 'Unavailable'
      : rawAqi <= 50
      ? 'Good'
      : rawAqi <= 100
      ? 'Satisfactory'
      : rawAqi <= 200
      ? 'Moderate'
      : rawAqi <= 300
      ? 'Poor'
      : rawAqi <= 400
      ? 'Very Poor'
      : 'Severe';

  const aqiBadgeColor =
    rawAqi === null
      ? 'bg-[#08131F] text-[#8295A8] border-[#26394B]'
      : rawAqi <= 100
      ? 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35'
      : rawAqi <= 200
      ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
      : rawAqi <= 300
      ? 'bg-[#F97316]/12 text-[#FDBA74] border-[#F97316]/35'
      : 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35';

  const rawPm25 =
    typeof aqiProvider.data?.pm25 === 'number' && Number.isFinite(aqiProvider.data.pm25)
      ? aqiProvider.data.pm25
      : typeof current.aqiPm25 === 'number' && Number.isFinite(current.aqiPm25)
      ? current.aqiPm25
      : null;

  const rawPm10 =
    typeof aqiProvider.data?.pm10 === 'number' && Number.isFinite(aqiProvider.data.pm10)
      ? aqiProvider.data.pm10
      : typeof current.aqiPm10 === 'number' && Number.isFinite(current.aqiPm10)
      ? current.aqiPm10
      : null;

  const rawPollenCount =
    typeof current.pollenCount === 'number' && Number.isFinite(current.pollenCount)
      ? current.pollenCount
      : null;

  const rawUv =
    typeof current.uvIndex === 'number' && Number.isFinite(current.uvIndex) ? current.uvIndex : null;

  const obsStatus: ProvenanceStatus =
    current.observationStatus ||
    (current.temp !== null ? (weatherBundle.isLive ? 'LIVE' : 'RECENT') : 'UNAVAILABLE');

  const radarProvenance: ProvenanceStatus =
    radarProvider.status === 'LIVE'
      ? 'LIVE'
      : radarProvider.status === 'RECENT'
      ? 'RECENT'
      : radarProvider.status === 'LOADING'
      ? 'LOADING'
      : radarProvider.status === 'STALE'
      ? 'STALE'
      : 'UNAVAILABLE';

  return (
    <div id="weather-comprehensive-view-container" className="flex flex-col gap-5 w-full pb-12">
      <PrintReportHeader
        reportTitle="Current Synoptic Weather & Telemetry Report"
        reportSubtitle="MAUSAM • Surface Ground Telemetry & Atmospheric Observations"
        location={selectedLocation}
        lastUpdated={lastFetchedAt}
      />

      {/* Unified Single Observatory Header (eliminates stacked dual-header clutter) */}
      <PageHeader
        id="weather-page-header-banner"
        eyebrow={`ANALYZE MODE • ${locationSource === 'DEVICE_GPS' ? 'GPS LOCK' : 'SELECTED STATION'}`}
        title={`${selectedLocation.city}, ${selectedLocation.state}`}
        coordinates={`${formatCoordinatePair(selectedLocation.lat, selectedLocation.lng, 2)}${selectedLocation.elevation ? ` • ${selectedLocation.elevation}` : ''}`}
        description={`Station ${selectedLocation.imdStation || 'Point Grid Telemetry'}${selectedLocation.district && selectedLocation.district !== selectedLocation.city ? ` • ${selectedLocation.district} District` : ''}`}
        status={obsStatus}
        source={current.dataSource || current.observationSource || current.source || 'Open-Meteo'}
        updatedAt={formattedLastUpdated}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Inline Quick Station Search */}
            <div ref={searchRef} className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8295A8]" />
              <input
                id="weather-quick-station-search"
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Switch station..."
                className="w-full pl-8 pr-7 py-2 min-h-[38px] bg-[#08131F] border border-[#26394B] rounded-lg text-xs text-[#F3F6FA] placeholder-[#8295A8] focus:outline-none focus:border-[#35C7E8]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8295A8] hover:text-[#F3F6FA]"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {isSearchOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0B1927] border border-[#38536A] rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-[#26394B]">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#8295A8] bg-[#08131F]">
                    {searchQuery ? `Matches (${searchResults.length})` : 'Quick Stations'}
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#8295A8]">No matching stations</div>
                  ) : (
                    searchResults.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          onSelectLocation?.(loc);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-[#101F2E] transition-colors flex items-center justify-between gap-2 text-xs cursor-pointer ${
                          loc.id === selectedLocation.id ? 'bg-[#101F2E] text-[#35C7E8]' : 'text-[#F3F6FA]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{loc.city}</div>
                          <div className="text-[10px] text-[#8295A8] truncate">{loc.state}</div>
                        </div>
                        {loc.imdStation && (
                          <span className="text-[10px] font-mono text-[#8295A8] shrink-0">
                            {loc.imdStation}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {onDetectLocation && (
              <button
                type="button"
                onClick={() => onDetectLocation(true)}
                disabled={isLocating}
                className="px-3 py-2 min-h-[38px] bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] rounded-lg text-xs font-semibold text-[#F3F6FA] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Navigation className={`w-3.5 h-3.5 text-[#35C7E8] ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Use GPS'}</span>
              </button>
            )}

            {(onOpenLocationCenter || onChangeLocationClick) && (
              <button
                type="button"
                onClick={onOpenLocationCenter || onChangeLocationClick}
                className="px-3 py-2 min-h-[38px] bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] rounded-lg text-xs font-semibold text-[#F3F6FA] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#35C7E8]" />
                <span>Directory</span>
              </button>
            )}

            <button
              id="weather-page-refresh-btn"
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 min-h-[38px] bg-[#0B72B9] hover:bg-[#0D82D1] text-xs font-semibold text-[#F3F6FA] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              id="btn-print-weather-report"
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 min-h-[38px] bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] rounded-lg text-xs font-semibold text-[#B5C3D1] hover:text-[#F3F6FA] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print current observation report"
            >
              <Printer className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        }
      />

      {/* Primary Hero + Integrated Solar Countdown */}
      <LocationWeatherHero weather={current} location={selectedLocation} />

      {/* Narrative Summary Banner */}
      <DataPanel className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#08131F] border border-[#26394B] flex items-center justify-center text-[#35C7E8] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#35C7E8] block">
              Synoptic Context &amp; Guidance
            </span>
            <p className="text-sm text-[#F3F6FA] font-medium mt-0.5">{weatherStory.whatIsHappening}</p>
            <p className="text-xs text-[#8295A8] mt-1">
              Outlook: {weatherStory.whatWillHappen} • Action: {weatherStory.recommendedAction}
            </p>
          </div>
        </div>

        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('forecast')}
            className="px-3.5 py-2 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-xs font-semibold text-[#35C7E8] flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center cursor-pointer"
          >
            <span>NWP 7-Day Models</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </DataPanel>

      <WeatherStatusStrip weather={current} alerts={alerts} />
      <LightningThunderstormSection location={selectedLocation} weather={current} alerts={alerts} />
      <WeatherTelemetryGrid weather={current} />
      <HourlyWeatherTimeline hourly={hourly} />
      <WeatherDecisionCenter weather={current} hourly={hourly} alerts={alerts} />

      {/* 7-Day Forecast + Integrated Radar & Solar Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-9 flex flex-col">
          <SevenDaySynopticForecast daily={daily} />
        </div>

        <div className="lg:col-span-3 flex flex-col gap-4">
          <DataPanel id="station-radar-metadata-card" className="flex flex-col justify-between gap-4 h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#26394B]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#08131F] border border-[#26394B] flex items-center justify-center text-[#35C7E8]">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#F3F6FA]">
                    Radar Link
                  </h3>
                </div>
                <SourceStatus status={radarProvenance} />
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8295A8] block">Coverage Sector</span>
                  <strong className="text-xs text-[#35C7E8]">
                    {selectedLocation.radarCoverage || 'Regional S-Band DWR Network'}
                  </strong>
                </div>

                <div className="space-y-1.5 text-[11px] text-[#8295A8] font-mono tabular-nums m-panel-inset p-3">
                  <div className="flex justify-between">
                    <span className="font-sans">Scan Cadence</span>
                    <span className="text-[#F3F6FA]">10 min composite</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans">Active Provider</span>
                    <span className="text-[#F3F6FA]">{radarProvider.source || 'RainViewer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans">Station ID</span>
                    <span className="text-[#22C7A0]">{selectedLocation.imdStation || selectedLocation.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {onNavigateToTab && (
              <div className="pt-3 border-t border-[#26394B] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('radar')}
                  className="w-full py-2 px-3 rounded-lg bg-[#0B72B9] hover:bg-[#0D82D1] text-xs text-[#F3F6FA] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Doppler Radar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('reports')}
                  className="w-full py-2 px-3 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-xs text-[#B5C3D1] hover:text-[#F3F6FA] font-semibold transition-colors cursor-pointer"
                >
                  Submit Ground Observation
                </button>
              </div>
            )}
          </DataPanel>
        </div>
      </div>

      <WeatherWidgets weather={current} />
      <AstronomicalEphemeris location={selectedLocation} weather={current} />
      <SolarDynamics location={selectedLocation} weather={current} />
      <CoastalMarineSection location={selectedLocation} />

      {/* Environment, Air Quality & Pollen */}
      <DataPanel id="weather-air-quality-environmental-panel" className="flex flex-col gap-4">
        <SectionHeading
          title="Environment, Air Quality & Pollen"
          subtitle={`Particulate and radiation telemetry for ${selectedLocation.city}`}
          icon={<Activity className="w-4 h-4 text-[#22C7A0]" />}
          action={
            onNavigateToTab ? (
              <button
                type="button"
                onClick={() => onNavigateToTab('aqi')}
                className="text-xs font-semibold text-[#35C7E8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full AQI Grid</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#8295A8] uppercase font-semibold">National AQI</span>
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${aqiBadgeColor}`}>
                {aqiCategory}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 my-1 font-mono tabular-nums">
              <span className="text-3xl font-bold text-[#F3F6FA]">
                {rawAqi !== null ? rawAqi : '—'}
              </span>
              <span className="text-xs text-[#8295A8]">{rawAqi !== null ? 'NAQI Index' : 'Unavailable'}</span>
            </div>
            <span className="text-[11px] text-[#8295A8]">
              {rawAqi !== null ? 'Open-Meteo Air Quality Feed' : 'AQI feed currently unavailable'}
            </span>
          </div>

          <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
            <span className="text-[11px] text-[#8295A8] uppercase font-semibold">Particulate Concentrations</span>
            <div className="grid grid-cols-2 gap-2 my-1 font-mono tabular-nums">
              <div className="bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B]">
                <span className="text-[10px] text-[#8295A8] block">PM2.5</span>
                <span className="text-base font-bold text-[#F3F6FA]">
                  {rawPm25 !== null ? rawPm25 : '—'}{' '}
                  <span className="text-[10px] text-[#8295A8] font-normal">µg/m³</span>
                </span>
              </div>
              <div className="bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B]">
                <span className="text-[10px] text-[#8295A8] block">PM10</span>
                <span className="text-base font-bold text-[#F3F6FA]">
                  {rawPm10 !== null ? rawPm10 : '—'}{' '}
                  <span className="text-[10px] text-[#8295A8] font-normal">µg/m³</span>
                </span>
              </div>
            </div>
            <span className="text-[10px] text-[#8295A8]">Open-Meteo Particulates</span>
          </div>

          <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#8295A8] uppercase font-semibold">Aero-Allergen Pollen</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0B1927] text-[#B5C3D1] border border-[#26394B]">
                {current.pollen || 'Unavailable'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 my-1 font-mono tabular-nums">
              <span className="text-3xl font-bold text-[#F3F6FA]">
                {rawPollenCount !== null ? rawPollenCount : '—'}
              </span>
              <span className="text-xs text-[#8295A8]">grains/m³</span>
            </div>
            <span className="text-[11px] text-[#8295A8] font-mono tabular-nums">
              Tree: {current.treePollen ?? '—'} • Grass: {current.grassPollen ?? '—'}
            </span>
          </div>

          <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#8295A8] uppercase font-semibold">Solar UV Index</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F59E0B]/12 text-[#FCD34D] border border-[#F59E0B]/35">
                {rawUv !== null
                  ? rawUv >= 8
                    ? 'Very High'
                    : rawUv >= 6
                    ? 'High'
                    : rawUv >= 3
                    ? 'Moderate'
                    : 'Low'
                  : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 my-1 font-mono tabular-nums">
              <span className="text-3xl font-bold text-[#F3F6FA]">
                {rawUv !== null ? rawUv.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#8295A8]">/ 11+ Index</span>
            </div>
            <span className="text-[11px] text-[#8295A8]">
              {rawUv !== null ? 'Peak UV exposure occurs around solar noon' : 'UV telemetry unavailable'}
            </span>
          </div>
        </div>
      </DataPanel>

      <PersonaWeatherHub selectedLocation={selectedLocation} weatherBundle={weatherBundle} />
      <WeatherDataExplainer />
    </div>
  );
};
