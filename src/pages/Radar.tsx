import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, Navigation, MapPin } from 'lucide-react';
import { LocationRecord } from '../types';
import { LocatingPhase } from '../services/geolocationService';
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
import { formatTimestampIST } from '../services/providers/providerStatus';
import { formatCoordinatePair } from '../../shared/weatherContract';
import { formatLocationShort } from '../utils/locationFormatter';
import {
  PageHeader,
  ProvenanceStatus,
  SeverityBanner,
} from '../components/ui/ObservatoryPrimitives';

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
      return `Point (${formatCoordinatePair(inspectedCoords.lat, inspectedCoords.lng, 2)})`;
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
      ? `Reference Baseline (${selectedStateData.updatedAt})`
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

  const headerProvenanceStatus: ProvenanceStatus = useMemo(() => {
    if (viewMode === 'synoptic') return 'REFERENCE';
    if (isLoadingRadar && !radarData?.available) return 'LOADING';
    if (radarProvider.status === 'ERROR' || radarProvider.status === 'UNAVAILABLE') return 'UNAVAILABLE';
    if (currentDataStatus === 'LIVE') return 'LIVE';
    if (currentDataStatus === 'STALE') return 'STALE';
    if (currentDataStatus === 'UNAVAILABLE') return 'UNAVAILABLE';
    return 'RECENT';
  }, [viewMode, isLoadingRadar, radarData?.available, radarProvider.status, currentDataStatus]);

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
  const hasSelectedCoords =
    typeof selectedLocation?.lat === 'number' &&
    Number.isFinite(selectedLocation.lat) &&
    typeof selectedLocation?.lng === 'number' &&
    Number.isFinite(selectedLocation.lng);

  const handleMyLocation = () => {
    if (hasSelectedCoords && selectedLocation) {
      mapControls?.flyTo(selectedLocation.lat, selectedLocation.lng, 8);
      setInspectedCoords({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    }
  };

  const coordinateSummary = selectedLocation
    ? `${formatLocationShort(selectedLocation)} · ${formatCoordinatePair(selectedLocation.lat, selectedLocation.lng, 2)}`
    : undefined;

  return (
    <div className="flex flex-col gap-5 w-full text-[var(--m-text-primary)]">
      {/* Unified Observatory PageHeader */}
      <PageHeader
        eyebrow="Doppler Surveillance & Synoptic Map"
        title="Weather Map & Doppler Radar"
        description="Switch atmospheric layers, scrub 6-hour composite radar scans, or inspect live point meteorology across India."
        coordinates={coordinateSummary}
        status={headerProvenanceStatus}
        source={
          viewMode === 'radar'
            ? 'RainViewer Radar Mosaic · IMD DWR Network'
            : 'Regional Reference Baseline · Open-Meteo Point Query'
        }
        updatedAt={
          radarProvider.latencyMs !== null
            ? `${lastFetchTime} · ${radarProvider.latencyMs}ms`
            : lastFetchTime
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {onDetectLocation && (
              <button
                type="button"
                onClick={() => onDetectLocation(true)}
                disabled={isLocating}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-xs font-semibold text-[var(--m-text-primary)] flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0 m-focus-ring"
                title={
                  locationSource === 'DEVICE_GPS'
                    ? 'Active device GPS lock — click to re-sync coordinates'
                    : 'Detect current device coordinates via GPS'
                }
              >
                <Navigation className={`w-3.5 h-3.5 text-[var(--m-accent)] ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating…' : 'Detect GPS'}</span>
              </button>
            )}

            {onOpenLocationCenter && (
              <button
                type="button"
                onClick={onOpenLocationCenter}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-xs font-semibold text-[var(--m-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 m-focus-ring"
              >
                <MapPin className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                <span>Switch Location</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => refreshRadarProvider(true)}
              disabled={isLoadingRadar}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--m-accent)] hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-opacity disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0 m-focus-ring"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRadar ? 'animate-spin' : ''}`} />
              <span>{isLoadingRadar ? 'Syncing…' : 'Refresh Radar'}</span>
            </button>
          </div>
        }
      />

      {radarProvider.error && viewMode === 'radar' && (
        <SeverityBanner
          state="UNAVAILABLE"
          title="Radar Composite Feed Unavailable"
          description={`Upstream feed reported (${radarProvider.error}). Station range overlays and Open-Meteo point meteorology inspection remain active.`}
          source="RainViewer Composite Feed"
          action={
            <button
              type="button"
              onClick={() => refreshRadarProvider(true)}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[var(--m-watch-soft)] hover:opacity-90 border border-[var(--m-watch)]/35 text-xs font-semibold text-[var(--m-watch)] transition-opacity cursor-pointer whitespace-nowrap shrink-0 m-focus-ring"
            >
              Retry Sync
            </button>
          }
        />
      )}

      {/* Map-First Workstation: Dark Spatial Scope for Cartographic / Doppler Contrast */}
      <section
        ref={mapWorkspaceRef}
        data-theme="dark-workspace"
        className="flex flex-col gap-3 p-3 rounded-2xl bg-[var(--m-canvas)] border border-[var(--m-border)] text-[var(--m-text-primary)]"
      >
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
              hasUserLocation={hasSelectedCoords}
              isLocked={isMapLocked}
              onToggleLock={handleToggleLock}
              sectorName={currentSectorName}
              hideMetricSelector={true}
            />

            <div className="relative border-x border-[var(--m-border)] bg-[var(--m-surface-inset)] flex-1 min-h-[440px] md:min-h-[540px] lg:min-h-[640px]">
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
                  hasSelectedCoords && selectedLocation
                    ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
                    : null
                }
                inspectedCoords={inspectedCoords}
                onMapClick={handleMapClick}
                onControlsReady={setMapControls}
                isLocked={isMapLocked}
                onToggleLock={handleToggleLock}
                sectorName={currentSectorName}
                heightClass="h-full min-h-[440px] md:min-h-[540px] lg:min-h-[640px]"
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
                  : 'Regional Reference Baseline + Open-Meteo Point Query'
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

      {/* Doppler Station Network Directory */}
      <RadarStationNetwork
        selectedStationId={selectedStation.id}
        onSelectStation={handleSelectStationFromDirectory}
      />

      {/* Radar Product Information */}
      <RadarProductSelector
        selectedProduct={selectedProduct}
        onSelectProduct={setSelectedProduct}
        radarSourceLabel="RainViewer precipitation radar"
        isRadarMode={viewMode === 'radar'}
      />

      {/* Collapsible Technical Details */}
      <RadarTechnicalSpecs
        station={selectedStation}
        radarSourceLabel="RainViewer precipitation radar / IMD Doppler Network"
      />
    </div>
  );
};

export default RadarPage;
