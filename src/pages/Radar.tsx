import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LocationRecord } from '../types';
import { LocatingPhase } from '../services/geolocationService';
import { LocationStatusBar } from '../components/location/LocationStatusBar';
import { WeatherMapMetric } from '../components/map/MapLayerControl';
import { StateWeatherData } from '../components/map/IndiaWeatherMap';
import { INDIA_WEATHER_DATA } from '../data/indiaWeatherData';
import { RadarStation, RadarProductType } from '../types/radar';
import {
  OFFICIAL_RADAR_STATIONS,
  RadarApiResponse,
  RadarFrame,
} from '../services/radarService';
import { MausamMap, MausamMapControls } from '../components/map/MausamMap';
import { MapToolbar } from '../components/map/MapToolbar';
import { MapLegendBar } from '../components/map/MapLegendBar';
import { MapLayerRail, MapLayerSelection } from '../components/map/MapLayerRail';
import { MapLocationInspector } from '../components/map/MapLocationInspector';
import { RadarStationNetwork } from '../components/radar/RadarStationNetwork';
import { RadarProductSelector } from '../components/radar/RadarProductSelector';
import { RadarTechnicalSpecs } from '../components/radar/RadarTechnicalSpecs';
import { RadarTimeSpan } from '../components/radar/RadarTimeLapseController';
import { useProvider } from '../store/providerStore';
import { formatTimestampIST, getProviderStatusVisual } from '../services/providers/providerStatus';

export interface RadarPageProps {
  selectedLocation?: LocationRecord;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  onOpenLocationCenter?: () => void;
}

export const RadarPage: React.FC<RadarPageProps> = ({
  selectedLocation,
  onDetectLocation,
  isLocating = false,
  locatePhase = 'idle',
  locationSource = 'MANUAL_SEARCH',
  onOpenLocationCenter,
}) => {
  const mapWorkspaceRef = useRef<HTMLDivElement>(null);
  const [mapControls, setMapControls] = useState<MausamMapControls | null>(null);

  // Independent RADAR provider state (strictly isolated from Weather/SACHET/AQI/NWP)
  const { state: radarProvider, refresh: refreshRadarProvider } = useProvider<RadarApiResponse>('RADAR');
  const radarData = radarProvider.data;
  const isLoadingRadar = radarProvider.status === 'LOADING';

  // Mode Selection: 'synoptic' or 'radar'
  const [viewMode, setViewMode] = useState<'synoptic' | 'radar'>('radar');
  const [activeMetric, setActiveMetric] = useState<WeatherMapMetric>('rainfall');
  const [isMapLocked, setIsMapLocked] = useState<boolean>(false);
  const handleToggleLock = useCallback(() => setIsMapLocked((prev) => !prev), []);

  // Custom point inspection coordinates (map click anywhere)
  const [inspectedCoords, setInspectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Active Radar Product
  const [selectedProduct, setSelectedProduct] = useState<RadarProductType | 'PRECIP'>('PRECIP');

  // Selected Radar Station
  const [selectedStation, setSelectedStation] = useState<RadarStation>(() => {
    return (
      OFFICIAL_RADAR_STATIONS.find((s) => s.id === 'DWR-MUM') ||
      OFFICIAL_RADAR_STATIONS[0]
    );
  });

  // Selected State in Synoptic Mode
  const [selectedStateName, setSelectedStateName] = useState<string>('Odisha');

  // Time-lapse playback state
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [isPlayingRadar, setIsPlayingRadar] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [timeSpan, setTimeSpan] = useState<RadarTimeSpan>('6h');

  const selectedStateData = useMemo<StateWeatherData>(() => {
    const clean = selectedStateName.toLowerCase().trim();
    const found = INDIA_WEATHER_DATA.find(
      (s) =>
        s.name.toLowerCase() === clean ||
        s.id.toLowerCase() === clean ||
        clean.includes(s.name.toLowerCase())
    );
    return found || INDIA_WEATHER_DATA[0];
  }, [selectedStateName]);

  const currentSectorName = useMemo<string>(() => {
    if (inspectedCoords) {
      return `Point (${inspectedCoords.lat.toFixed(2)}°N, ${inspectedCoords.lng.toFixed(2)}°E)`;
    }
    if (viewMode === 'radar' && selectedStation) {
      return `${selectedStation.name} Radar Sector (${selectedStation.id})`;
    }
    if (viewMode === 'synoptic' && selectedStateName) {
      return `${selectedStateName} Regional Sector`;
    }
    return 'India Weather Sector';
  }, [inspectedCoords, viewMode, selectedStation, selectedStateName]);

  const activeTimelineFrames = useMemo<RadarFrame[]>(() => {
    if (!radarData) return [];
    const sourceFrames =
      radarData.sixHourFrames && radarData.sixHourFrames.length > 0
        ? radarData.sixHourFrames
        : radarData.pastFrames;

    if (!sourceFrames || sourceFrames.length === 0) return [];
    if (timeSpan === '1h') return sourceFrames.slice(-5);
    if (timeSpan === '3h') return sourceFrames.slice(-13);
    return sourceFrames;
  }, [radarData, timeSpan]);

  // Snap to latest radar frame whenever new frames arrive
  useEffect(() => {
    if (activeTimelineFrames.length > 0) {
      setActiveFrameIndex(activeTimelineFrames.length - 1);
    }
  }, [activeTimelineFrames.length, radarProvider.fetchedAt]);

  // Sync selected location with radar station and state
  useEffect(() => {
    if (!selectedLocation) return;
    setSelectedStateName(selectedLocation.state);

    const exactMatch = OFFICIAL_RADAR_STATIONS.find(
      (st) =>
        st.name.toLowerCase().includes(selectedLocation.city.toLowerCase()) ||
        st.id.toLowerCase().includes(selectedLocation.city.toLowerCase()) ||
        st.surroundingPlaces?.some((p) =>
          p.name.toLowerCase().includes(selectedLocation.city.toLowerCase())
        )
    );

    if (exactMatch) {
      setSelectedStation(exactMatch);
      return;
    }

    const stateMatch = OFFICIAL_RADAR_STATIONS.find(
      (st) => st.state && st.state.toLowerCase() === selectedLocation.state.toLowerCase()
    );
    if (stateMatch) {
      setSelectedStation(stateMatch);
    }
  }, [selectedLocation]);

  // Frame animation timer
  useEffect(() => {
    if (!isPlayingRadar || !activeTimelineFrames || activeTimelineFrames.length <= 1) {
      return;
    }

    const intervalDuration = Math.max(150, Math.round(750 / playbackSpeed));
    const interval = setInterval(() => {
      setActiveFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= activeTimelineFrames.length) {
          return isLooping ? 0 : prev;
        }
        return next;
      });
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [isPlayingRadar, activeTimelineFrames, playbackSpeed, isLooping]);

  useEffect(() => {
    if (!isLooping && isPlayingRadar && activeFrameIndex >= activeTimelineFrames.length - 1) {
      setIsPlayingRadar(false);
    }
  }, [isLooping, isPlayingRadar, activeFrameIndex, activeTimelineFrames.length]);

  const currentTileUrl = useMemo<string | null>(() => {
    if (!radarData || !radarData.available || !activeTimelineFrames.length) {
      return null;
    }
    const frame =
      activeTimelineFrames[activeFrameIndex] ||
      activeTimelineFrames[activeTimelineFrames.length - 1];
    if (!frame || !radarData.host) return null;
    return `${radarData.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
  }, [radarData, activeTimelineFrames, activeFrameIndex]);

  const lastFetchTime = useMemo<string>(() => {
    if (radarProvider.lastSuccessfulFetch) {
      return formatTimestampIST(radarProvider.lastSuccessfulFetch);
    }
    if (radarProvider.status === 'LOADING') return 'Syncing feed...';
    return 'Awaiting sync';
  }, [radarProvider.lastSuccessfulFetch, radarProvider.status]);

  const currentObsTimestamp = useMemo<string>(() => {
    if (viewMode === 'radar') {
      if (activeTimelineFrames?.[activeFrameIndex]) {
        return activeTimelineFrames[activeFrameIndex].formattedTime;
      }
      return lastFetchTime;
    }
    return selectedStateData?.updatedAt
      ? `Reference Snapshot (${selectedStateData.updatedAt})`
      : lastFetchTime;
  }, [viewMode, activeTimelineFrames, activeFrameIndex, lastFetchTime, selectedStateData]);

  const currentDataStatus = useMemo<'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE'>(() => {
    if (viewMode === 'radar') {
      if (radarProvider.status === 'ERROR' || radarProvider.status === 'UNAVAILABLE') {
        return 'UNAVAILABLE';
      }
      if (radarData?.status === 'LIVE') return 'LIVE';
      if (radarData?.status === 'RECENT') return 'RECENT';
      if (radarData?.status === 'STALE') return 'STALE';
      return radarProvider.data?.available ? 'RECENT' : 'UNAVAILABLE';
    }
    return 'RECENT';
  }, [viewMode, radarProvider.status, radarProvider.data, radarData]);

  const providerBadge = getProviderStatusVisual(radarProvider.status);

  const handleSelectLayer = useCallback((selection: MapLayerSelection) => {
    setViewMode(selection.viewMode);
    setActiveMetric(selection.metric);
  }, []);

  const handleSelectStationFromDirectory = useCallback((station: RadarStation) => {
    setSelectedStation(station);
    setInspectedCoords(null);
    setViewMode('radar');
    mapWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setInspectedCoords({ lat, lng });
  }, []);

  const handleZoomIn = () => mapControls?.zoomIn();
  const handleZoomOut = () => mapControls?.zoomOut();
  const handleResetView = () => mapControls?.resetView();
  const handleMyLocation = () => {
    if (selectedLocation?.lat && selectedLocation?.lng) {
      mapControls?.flyTo(selectedLocation.lat, selectedLocation.lng, 8);
      setInspectedCoords({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full text-[#F4F7FA]">
      {/* 1. COMPACT WORKSTATION HEADER & LOCATION BAR */}
      <section className="bg-[#101B26] border border-white/12 rounded-xl px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#F4F7FA]">
              Weather Map &amp; Doppler Radar
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${providerBadge.textClass} ${providerBadge.bgClass} ${providerBadge.borderClass}`}
            >
              Radar: {providerBadge.label}
              {radarProvider.latencyMs !== null ? ` • ${radarProvider.latencyMs}ms` : ''}
            </span>
          </div>
          <p className="text-xs text-[#8EA3B8] mt-0.5">
            Switch atmospheric layers, scrub 6-hour radar scans, or click any point on the map to inspect local conditions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="text-[11px] font-mono text-[#B6C7D8] bg-[#162331] px-2.5 py-1.5 rounded-lg border border-white/10 tabular-nums">
            Updated: {lastFetchTime}
          </div>
          <button
            type="button"
            onClick={() => refreshRadarProvider(true)}
            disabled={isLoadingRadar}
            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#1499E8] hover:bg-[#0E83CA] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                isLoadingRadar ? 'animate-spin' : ''
              }`}
            >
              refresh
            </span>
            <span>{isLoadingRadar ? 'Syncing...' : 'Refresh Radar'}</span>
          </button>
        </div>
      </section>

      {radarProvider.error && viewMode === 'radar' && (
        <div className="bg-[#162331] border border-[#F59E0B]/40 rounded-xl px-4 py-2.5 text-xs text-[#F59E0B] flex items-center justify-between gap-3">
          <span>
            Radar composite feed unavailable ({radarProvider.error}). Station markers and point meteorology inspection remain active.
          </span>
          <button
            type="button"
            onClick={() => refreshRadarProvider(true)}
            className="px-2.5 py-1 rounded bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] font-semibold shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {selectedLocation && (
        <LocationStatusBar
          location={selectedLocation}
          locationSource={locationSource}
          source={locationSource}
          isLocating={isLocating}
          onDetectLocation={onDetectLocation ? () => onDetectLocation(true) : undefined}
          onOpenLocationCenter={onOpenLocationCenter}
          onChangeLocationClick={onOpenLocationCenter}
        />
      )}

      {/* 2. WINDY-INSPIRED MAP-FIRST WORKSPACE: LAYER RAIL + MAP CANVAS + POINT INSPECTOR */}
      <section ref={mapWorkspaceRef} className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch">
          {/* Left Layer Rail (horizontal scroll bar on mobile/tablet, grouped rail on desktop) */}
          <MapLayerRail
            viewMode={viewMode}
            activeMetric={activeMetric}
            onSelectLayer={handleSelectLayer}
          />

          {/* Expansive Map Canvas */}
          <div className="flex-1 min-w-0 flex flex-col">
            <MapToolbar
              activeMetric={activeMetric}
              onSelectMetric={(m) => {
                setViewMode('synoptic');
                setActiveMetric(m);
              }}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
              onMyLocation={handleMyLocation}
              hasUserLocation={!!(selectedLocation?.lat && selectedLocation?.lng)}
              isLocked={isMapLocked}
              onToggleLock={handleToggleLock}
              sectorName={currentSectorName}
              hideMetricSelector={true}
            />

            <div className="relative border-x border-white/12 bg-[#0B1219] flex-1 min-h-[460px] md:min-h-[540px] lg:min-h-[640px]">
              <MausamMap
                viewMode={viewMode}
                activeMetric={activeMetric}
                selectedState={selectedStateName}
                onSelectState={(state) => {
                  setSelectedStateName(state.name);
                  setInspectedCoords(null);
                }}
                selectedStation={selectedStation}
                onSelectStation={(st) => {
                  setSelectedStation(st);
                  setInspectedCoords(null);
                }}
                radarTileUrl={currentTileUrl}
                userCoords={
                  selectedLocation?.lat && selectedLocation?.lng
                    ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
                    : null
                }
                inspectedCoords={inspectedCoords}
                onMapClick={handleMapClick}
                onControlsReady={setMapControls}
                isLocked={isMapLocked}
                onToggleLock={handleToggleLock}
                sectorName={currentSectorName}
                heightClass="h-full min-h-[460px] md:min-h-[540px] lg:min-h-[640px]"
                showRadarLegend={viewMode === 'radar'}
                showTimeLapseControl={viewMode === 'radar'}
                timeLapseFrames={activeTimelineFrames}
                activeFrameIndex={activeFrameIndex}
                onChangeFrame={(idx) => {
                  setIsPlayingRadar(false);
                  setActiveFrameIndex(idx);
                }}
                isPlaying={isPlayingRadar}
                onTogglePlay={() => setIsPlayingRadar((prev) => !prev)}
                playbackSpeed={playbackSpeed}
                onChangeSpeed={setPlaybackSpeed}
                loop={isLooping}
                onToggleLoop={() => setIsLooping((prev) => !prev)}
                timeSpan={timeSpan}
                onChangeTimeSpan={(span) => {
                  setTimeSpan(span);
                  setIsPlayingRadar(false);
                }}
                motionVector={radarData?.motionVector}
                dataStatus={currentDataStatus}
              />
            </div>

            <MapLegendBar
              viewMode={viewMode}
              activeMetric={activeMetric}
              sourceName={
                viewMode === 'radar'
                  ? 'RainViewer Global Radar Composite / IMD DWR Reference'
                  : 'Regional Reference Layer + Open-Meteo Point Query'
              }
              observationTime={currentObsTimestamp}
              dataStatus={currentDataStatus}
            />
          </div>

          {/* Right Location & Point Inspector */}
          <div className="w-full lg:w-80 shrink-0">
            <MapLocationInspector
              inspectedCoords={inspectedCoords}
              onClearInspectedCoords={() => setInspectedCoords(null)}
              viewMode={viewMode}
              station={selectedStation}
              stateData={selectedStateData}
              observationTime={currentObsTimestamp}
              dataStatus={currentDataStatus}
            />
          </div>
        </div>
      </section>

      {/* 3. DOPPLER STATION NETWORK DIRECTORY */}
      <section>
        <RadarStationNetwork
          selectedStationId={selectedStation.id}
          onSelectStation={handleSelectStationFromDirectory}
        />
      </section>

      {/* 4. RADAR PRODUCT INFORMATION */}
      <section>
        <RadarProductSelector
          selectedProduct={selectedProduct}
          onSelectProduct={setSelectedProduct}
          radarSourceLabel="RainViewer precipitation radar"
          isRadarMode={viewMode === 'radar'}
        />
      </section>

      {/* 5. COLLAPSIBLE TECHNICAL DETAILS */}
      <section>
        <RadarTechnicalSpecs
          station={selectedStation}
          radarSourceLabel="RainViewer precipitation radar / IMD Doppler Network"
        />
      </section>
    </div>
  );
};

export default RadarPage;

