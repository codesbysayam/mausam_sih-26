import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LocationRecord } from '../../types';
import {
  Radio,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Layers,
  ChevronDown,
  Crosshair,
  X,
  Zap,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  IMD_DOPPLER_RADAR_NETWORK,
  findNearestRadarStation,
} from '../../data/radarStations';
import {
  RadarMapLegendPanel,
  PrecipLevelId,
  ALL_PRECIP_LEVEL_IDS,
} from '../radar/RadarMapLegendPanel';
import {
  BasemapStyleSwitcher,
  MapErrorOverlay,
  MapLoadingOverlay,
  MapOpacitySlider,
  MapPlaybackControls,
} from '../maps';
import { useFramePlayback } from '../../hooks/useFramePlayback';
import {
  formatEpochIST,
  type NormalizedRadarPlaybackFrame,
} from '../../services/map/mapFrameService';
import {
  resolveBasemapSpec,
  type BasemapStyleId,
} from '../../utils/mapBasemaps';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';
import { formatCoordinatePair } from '../../../shared/weatherContract';

interface RainViewerRawFrame {
  time: number;
  path: string;
}

interface RainViewerData {
  host?: string;
  radar?: {
    past?: RainViewerRawFrame[];
    nowcast?: RainViewerRawFrame[];
  };
}

interface HomeRadarPreviewProps {
  location: LocationRecord;
  onNavigateToRadar?: () => void;
}

/**
 * Real geodetic distance (Haversine) and azimuth bearing from DWR station to probed point.
 */
function calculateDistanceBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c);

  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const bearing = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

  const compassDirections = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const compass = compassDirections[Math.round(bearing / 22.5) % 16];

  return { distanceKm, bearing, compass };
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize({ animate: false, pan: false });
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: false, pan: false });
    }, 200);

    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        map.invalidateSize({ animate: false, pan: false });
      });
    });

    observer.observe(container);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function MapProbeHandler({
  isLocked,
  onProbe,
}: {
  isLocked: boolean;
  onProbe: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      if (isLocked) return;
      onProbe({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapViewController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const prevCenterRef = useRef(center);
  const prevZoomRef = useRef(zoom);

  useEffect(() => {
    if (
      prevCenterRef.current[0] !== center[0] ||
      prevCenterRef.current[1] !== center[1] ||
      prevZoomRef.current !== zoom
    ) {
      prevCenterRef.current = center;
      prevZoomRef.current = zoom;
      map.flyTo(center, zoom, { animate: true, duration: 0.7 });
    }
  }, [center, zoom, map]);

  return null;
}

function MapLockHandler({ isLocked }: { isLocked: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    try {
      if (isLocked) {
        map.dragging?.disable();
        map.touchZoom?.disable();
        map.doubleClickZoom?.disable();
        map.scrollWheelZoom?.disable();
        map.boxZoom?.disable();
        map.keyboard?.disable();
      } else {
        map.dragging?.enable();
        map.touchZoom?.enable();
        map.doubleClickZoom?.enable();
        map.scrollWheelZoom?.enable();
        map.boxZoom?.enable();
        map.keyboard?.enable();
      }
    } catch {
      // Safe fallback
    }
  }, [map, isLocked]);

  return null;
}

const getStationDivIcon = () =>
  typeof window !== 'undefined' && L?.divIcon
    ? L.divIcon({
        className: 'custom-radar-station-pin',
        html: `
          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid rgba(197, 164, 109, 0.85); background: rgba(197, 164, 109, 0.25);"></div>
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #C5A46D; border: 2px solid #FFFFFF; box-shadow: 0 0 8px rgba(197, 164, 109, 0.9);"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })
    : undefined;

const getProbeDivIcon = () =>
  typeof window !== 'undefined' && L?.divIcon
    ? L.divIcon({
        className: 'custom-probe-pin',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid #22C7A0; background: rgba(34, 199, 160, 0.25);"></div>
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #22C7A0; border: 1.5px solid #FFFFFF; box-shadow: 0 0 8px rgba(34, 199, 160, 0.85);"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
    : undefined;

export const HomeRadarPreview: React.FC<HomeRadarPreviewProps> = ({
  location,
  onNavigateToRadar,
}) => {
  const stationDivIcon = useMemo(() => getStationDivIcon(), []);
  const probeDivIcon = useMemo(() => getProbeDivIcon(), []);
  const mapStageRef = useRef<HTMLDivElement>(null);

  const lat = typeof location.lat === 'number' ? location.lat : 18.0;
  const lng = typeof location.lng === 'number' ? location.lng : 12.0;

  const nearestRadarInfo = useMemo(() => findNearestRadarStation(lat, lng), [lat, lng]);

  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'station' | 'all-india'>('station');
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleId>('dark');
  const [useBasemapFallback, setUseBasemapFallback] = useState<boolean>(false);
  const [radarOpacity, setRadarOpacity] = useState<number>(0.76);
  const [isMapLocked, setIsMapLocked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTileLoading, setIsTileLoading] = useState<boolean>(false);
  const [tileError, setTileError] = useState<string | null>(null);
  const basemapErrorsRef = useRef<number>(0);

  useEffect(() => {
    setSelectedStationId(null);
  }, [lat, lng]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const el = mapStageRef.current;
    if (!el || typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen denial inside sandboxed iframe
    }
  }, []);

  const currentStation = useMemo(() => {
    if (selectedStationId) {
      const found = IMD_DOPPLER_RADAR_NETWORK.find((s) => s.id === selectedStationId);
      if (found) return found;
    }
    return nearestRadarInfo.station;
  }, [selectedStationId, nearestRadarInfo]);

  const mapCenter = useMemo<[number, number]>(
    () => (viewMode === 'all-india' ? [22.0, 80.0] : [currentStation.lat, currentStation.lng]),
    [viewMode, currentStation]
  );
  const mapZoom = viewMode === 'all-india' ? 5 : 7;

  // Real RainViewer Radar Frames (Strictly Timestamped OBSERVED + NOWCAST)
  const [radarStatus, setRadarStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);
  const [playbackFrames, setPlaybackFrames] = useState<NormalizedRadarPlaybackFrame[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showSweepInspector, setShowSweepInspector] = useState<boolean>(false);
  const [echoFeedback, setEchoFeedback] = useState<string | null>(null);

  // Strictly real geodetic probe (no fabricated dBZ estimates!)
  const [probedPoint, setProbedPoint] = useState<{
    lat: number;
    lng: number;
    distanceKm: number;
    bearing: number;
    compass: string;
    withinCoverage: boolean;
  } | null>(null);

  const fetchRadarData = useCallback(async (signal?: AbortSignal, isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      setRadarStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'));

      let data: RainViewerData | null = null;

      try {
        const proxyRes = await fetch('/api/radar?mode=metadata', { signal });
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json?.radar?.past?.length || json?.radar?.nowcast?.length) {
            data = json;
          }
        }
      } catch (proxyErr: any) {
        if (proxyErr?.name === 'AbortError') return;
      }

      if (!data) {
        try {
          const response = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
            signal,
          });
          if (response.ok) {
            data = await response.json();
          }
        } catch (directErr: any) {
          if (directErr?.name === 'AbortError') return;
        }
      }

      const pastRaw = Array.isArray(data?.radar?.past) ? data!.radar!.past! : [];
      const nowcastRaw = Array.isArray(data?.radar?.nowcast) ? data!.radar!.nowcast! : [];

      if (pastRaw.length === 0 && nowcastRaw.length === 0) {
        setPlaybackFrames([]);
        setRadarTimestamp(null);
        setRadarStatus('error');
        setFetchError('Live radar composite temporarily unavailable from upstream RainViewer.');
        return;
      }

      const hostUrl = data?.host || 'https://tilecache.rainviewer.com';
      const nowSec = Math.floor(Date.now() / 1000);

      const mapRaw = (
        f: RainViewerRawFrame,
        origin: 'past' | 'nowcast',
        idx: number
      ): NormalizedRadarPlaybackFrame => {
        const ageMinutes = Math.round((nowSec - f.time) / 60);
        const formattedTime = formatEpochIST(f.time);
        const relativeLabel =
          origin === 'nowcast'
            ? `+${Math.max(1, Math.abs(ageMinutes))}m nowcast`
            : ageMinutes <= 1
            ? 'Just now'
            : `${ageMinutes}m ago`;

        return {
          id: `${origin}:${f.time}:${idx}`,
          time: f.time,
          path: f.path,
          tileUrl: `${hostUrl}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
          formattedTime,
          relativeLabel,
          ageMinutes,
          dataType: origin === 'nowcast' ? 'NOWCAST' : 'OBSERVED',
          raw: {
            time: f.time,
            path: f.path,
            tileUrl: `${hostUrl}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
            formattedTime,
            relativeLabel,
            ageMinutes,
          },
        };
      };

      const normalized: NormalizedRadarPlaybackFrame[] = [
        ...pastRaw.map((f, i) => mapRaw(f, 'past', i)),
        ...nowcastRaw.map((f, i) => mapRaw(f, 'nowcast', i)),
      ];

      setPlaybackFrames(normalized);

      const latestPast = pastRaw[pastRaw.length - 1] || nowcastRaw[0];
      if (latestPast?.time) {
        setRadarTimestamp(latestPast.time);
      }

      setRadarStatus('ready');
      setFetchError(null);

      if (isManual && latestPast) {
        setEchoFeedback(`Synced latest composite sweep: ${formatEpochIST(latestPast.time)}`);
        setTimeout(() => setEchoFeedback(null), 3200);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setRadarStatus('error');
      setFetchError('Unable to sync radar metadata from upstream.');
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchRadarData(controller.signal);

    const intervalId = setInterval(() => {
      const refreshController = new AbortController();
      fetchRadarData(refreshController.signal);
    }, 5 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [fetchRadarData]);

  // Reusable, cleanup-safe playback controller
  const playback = useFramePlayback<NormalizedRadarPlaybackFrame>({
    frames: playbackFrames,
    baseIntervalMs: 800,
    initialSpeed: 1,
    initialLoop: true,
    initialPosition: 'latest',
    resetKey: `${currentStation.id}:${viewMode}`,
    sortByTime: true,
    pauseWhenHidden: true,
  });

  const activeFrame = playback.currentFrame;
  const displayedTimestamp = activeFrame?.time || radarTimestamp;
  const isLatestFrame =
    playback.frameCount > 0 && playback.currentIndex === playback.frameCount - 1;

  const activeTileUrl = activeFrame?.tileUrl ?? null;

  const activeBasemap = useMemo(
    () => resolveBasemapSpec(basemapStyle, useBasemapFallback),
    [basemapStyle, useBasemapFallback]
  );

  // Precipitation intensity level filter
  const [activePrecipLevels, setActivePrecipLevels] = useState<PrecipLevelId[]>(ALL_PRECIP_LEVEL_IDS);
  const isPrecipFiltered = activePrecipLevels.length < ALL_PRECIP_LEVEL_IDS.length;

  const computedTileFilterClass = useMemo(() => {
    if (activePrecipLevels.length === ALL_PRECIP_LEVEL_IDS.length) return '';
    if (activePrecipLevels.length === 0) return 'radar-filter-zero';
    const hasTrace = activePrecipLevels.includes('trace');
    const hasLight = activePrecipLevels.includes('light');
    const hasMod = activePrecipLevels.includes('moderate');
    const hasHeavy = activePrecipLevels.includes('heavy');
    const hasIntense = activePrecipLevels.includes('intense');
    const hasExtreme = activePrecipLevels.includes('extreme');

    if (!hasTrace && !hasLight && !hasMod && (hasHeavy || hasIntense || hasExtreme)) {
      return 'radar-filter-heavy-plus';
    }
    if (!hasTrace && !hasLight && (hasMod || hasHeavy || hasIntense || hasExtreme)) {
      return 'radar-filter-mod-plus';
    }
    if (!hasHeavy && !hasIntense && !hasExtreme && (hasTrace || hasLight)) {
      return 'radar-filter-trace-only';
    }
    return 'radar-filter-custom';
  }, [activePrecipLevels]);

  const computedTileOpacity = useMemo(() => {
    if (activePrecipLevels.length === 0) return 0;
    if (activePrecipLevels.length === ALL_PRECIP_LEVEL_IDS.length) return radarOpacity;
    return Math.max(0.28, (activePrecipLevels.length / ALL_PRECIP_LEVEL_IDS.length) * radarOpacity);
  }, [activePrecipLevels, radarOpacity]);

  const formatFullTimestamp = (unixSeconds: number | null): string => {
    if (!unixSeconds) return 'Unavailable';
    const d = new Date(unixSeconds * 1000);
    return (
      d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }) +
      ' IST, ' +
      d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    );
  };

  const getEchoAgeText = (unixSeconds: number | null): string => {
    if (!unixSeconds) return 'Unavailable';
    const diffSec = Math.floor(Date.now() / 1000 - unixSeconds);
    if (diffSec < 0) return `Nowcast +${Math.ceil(Math.abs(diffSec) / 60)}m`;
    const mins = Math.floor(diffSec / 60);
    if (mins < 1) return 'Swept just now';
    if (mins === 1) return 'Swept 1 min ago';
    return `Swept ${mins} mins ago`;
  };

  const statusLabel = radarTimestamp ? 'RECENT' : 'UNAVAILABLE';

  const handleLatestEchoAction = () => {
    if (playback.frameCount === 0) return;
    if (!isLatestFrame) {
      playback.jumpToLatest();
      setShowSweepInspector(true);
      setEchoFeedback('Jumped to latest radar composite frame');
      setTimeout(() => setEchoFeedback(null), 2800);
      return;
    }
    setShowSweepInspector((prev) => !prev);
  };

  const handleMapProbe = (coords: { lat: number; lng: number }) => {
    const { distanceKm, bearing, compass } = calculateDistanceBearing(
      currentStation.lat,
      currentStation.lng,
      coords.lat,
      coords.lng
    );

    setProbedPoint({
      lat: Number(coords.lat.toFixed(4)),
      lng: Number(coords.lng.toFixed(4)),
      distanceKm,
      bearing,
      compass,
      withinCoverage: distanceKm <= currentStation.rangeKm,
    });
  };

  return (
    <DataPanel id="homepage-radar-preview" className="flex flex-col gap-4">
      <SectionHeading
        icon={<Radio className="w-4 h-4" />}
        title="Latest Radar Reflectivity"
        subtitle="RainViewer composite precipitation sweeps calibrated over IMD Doppler station nodes"
        badge={
          <SourceStatus
            status={radarTimestamp ? 'RECENT' : 'UNAVAILABLE'}
            labelOverride={radarTimestamp ? 'COMPOSITE READY' : 'FEED UNAVAILABLE'}
          />
        }
        action={
          onNavigateToRadar ? (
            <button
              id="btn-open-full-radar-scope"
              type="button"
              onClick={onNavigateToRadar}
              className="text-xs text-[var(--m-accent)] hover:text-[var(--m-text-primary)] bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] px-3 py-2 min-h-[38px] rounded-lg border border-[var(--m-border)] hover:border-[var(--m-border-strong)] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap m-focus-ring"
            >
              <span>Open Full Radar Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 5 Columns: Station Metadata, Reflectivity Scale, & Verified Attribution */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
                Target Doppler Radar Node
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
                  currentStation.id === nearestRadarInfo.station.id &&
                  nearestRadarInfo.isWithinCoverage
                    ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/30'
                    : 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/30'
                }`}
              >
                {currentStation.id === nearestRadarInfo.station.id &&
                nearestRadarInfo.isWithinCoverage
                  ? 'Within Coverage'
                  : 'Selected DWR'}
              </span>
            </div>

            <div className="relative mt-1">
              <select
                id="select-radar-station"
                aria-label="Select Doppler Radar Station"
                value={currentStation.id}
                onChange={(e) => {
                  setSelectedStationId(e.target.value);
                  setViewMode('station');
                  setProbedPoint(null);
                }}
                className="w-full bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-text-primary)] text-xs font-semibold rounded-lg px-3 py-2.5 min-h-[40px] pr-8 focus:outline-none focus:border-[var(--m-accent)] cursor-pointer appearance-none m-focus-ring"
              >
                {IMD_DOPPLER_RADAR_NETWORK.map((st) => (
                  <option key={st.id} value={st.id} className="bg-[var(--m-surface-1)] text-[var(--m-text-primary)]">
                    DWR {st.city} ({st.state}) — {st.band.split(' ')[0]}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[var(--m-text-muted)] absolute right-2.5 top-3 pointer-events-none" />
            </div>

            <p className="text-xs text-[var(--m-text-muted)] mt-1 leading-relaxed">
              Surveillance coverage radius: {currentStation.rangeKm} km ({currentStation.model}).
              Click anywhere on the map to measure geodetic range &amp; bearing from DWR {currentStation.city}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 m-panel-inset">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Operational Band</span>
              <span className="text-xs font-mono font-bold text-[var(--m-text-primary)] truncate block mt-0.5">
                {currentStation.band.split(' ')[0]}
              </span>
            </div>
            <div className="p-2.5 m-panel-inset">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Surveillance Radius</span>
              <span className="text-xs font-mono font-bold text-[var(--m-ok)] mt-0.5 block tabular-nums">
                {currentStation.rangeKm} km
              </span>
            </div>
            <div className="p-2.5 m-panel-inset">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Frame Type</span>
              <span className="text-xs font-mono font-bold text-[var(--m-accent)] mt-0.5 block">
                {activeFrame ? activeFrame.dataType : '—'}
              </span>
            </div>
            <div className="p-2.5 m-panel-inset">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">Composite Frames</span>
              <span
                className={`text-xs font-mono font-bold mt-0.5 block tabular-nums ${
                  playback.frameCount > 0 ? 'text-[var(--m-ok)]' : 'text-[var(--m-watch)]'
                }`}
              >
                {playback.frameCount > 0 ? `${playback.frameCount} SWEEPS` : 'UNAVAILABLE'}
              </span>
            </div>
          </div>

          {/* Reflectivity Scale */}
          <div className="p-3 m-panel-inset flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-[var(--m-text-secondary)] font-bold">REFLECTIVITY (dBZ)</span>
              <span className="text-[var(--m-text-muted)]">RainViewer Universal Scale</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--m-text-muted)] font-mono">Low</span>
              <div
                className="h-2 flex-1 rounded-sm opacity-90"
                style={{
                  background:
                    'linear-gradient(to right, #78AEB6 0%, #10B981 22%, #FACC15 46%, #FB923C 68%, #EF4444 85%, #C026D3 100%)',
                }}
              />
              <span className="text-[10px] text-[var(--m-text-muted)] font-mono">High</span>
            </div>
            <div className="flex justify-between text-[9px] text-[var(--m-text-muted)] font-mono">
              <span>Light (15–30)</span>
              <span>Moderate (30–40)</span>
              <span>Heavy (45+ dBZ)</span>
            </div>
          </div>

          {/* Source Attribution */}
          <div className="p-3 m-panel-inset flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-bold tracking-wider">
                Feed Provenance
              </span>
              <SourceStatus status={statusLabel} />
            </div>

            <div className="flex flex-col gap-1 text-[11px] font-mono pt-2 border-t border-[var(--m-border)]">
              <div className="flex justify-between gap-2">
                <span className="text-[var(--m-text-muted)]">Active Frame:</span>
                <span className="text-[var(--m-text-primary)] font-bold tabular-nums text-right">
                  {formatFullTimestamp(displayedTimestamp)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--m-text-muted)]">Radar Feed:</span>
                <span className="text-[var(--m-accent)] font-medium text-right">
                  RainViewer Composite Radar
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--m-text-muted)]">Basemap:</span>
                <span className="text-[var(--m-text-secondary)] font-medium text-right">
                  {activeBasemap.name}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[var(--m-text-muted)]">
                Auto-refresh every 5 min
              </span>
              <button
                type="button"
                onClick={() => fetchRadarData(undefined, true)}
                disabled={isRefreshing}
                className="text-[11px] text-[var(--m-accent)] hover:text-[var(--m-text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                title="Refresh radar metadata"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Upgraded Leaflet Radar Map + Unified Playback Controls */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          {/* Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 bg-[var(--m-surface-inset)] p-1 rounded-lg border border-[var(--m-border)]">
              <button
                type="button"
                onClick={() => setViewMode('station')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'station'
                    ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                    : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                DWR {currentStation.city}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all-india')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'all-india'
                    ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                    : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                All-India
              </button>

              <button
                type="button"
                id="btn-home-radar-lock"
                onClick={() => setIsMapLocked((prev) => !prev)}
                aria-pressed={isMapLocked}
                className={`px-2 py-1 rounded text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                  isMapLocked
                    ? 'bg-[var(--m-alert-soft)] text-[var(--m-alert)] border border-[var(--m-alert)]/60'
                    : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] bg-[var(--m-surface-1)] border border-[var(--m-border)]'
                }`}
              >
                {isMapLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{isMapLocked ? 'Locked' : 'Lock'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <BasemapStyleSwitcher
                value={basemapStyle}
                onChange={(next) => {
                  basemapErrorsRef.current = 0;
                  setUseBasemapFallback(false);
                  setBasemapStyle(next);
                }}
                compact={true}
              />
              <button
                type="button"
                onClick={handleToggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen radar map'}
                className="w-9 h-9 rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center justify-center cursor-pointer m-focus-ring"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Map Canvas */}
          <div
            ref={mapStageRef}
            data-theme="dark-workspace"
            className={`${
              isFullscreen ? 'h-[100dvh]' : 'h-[clamp(280px,46dvh,480px)]'
            } rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] relative overflow-hidden shadow-inner flex flex-col ${
              isMapLocked ? '[&_.leaflet-grab]:!cursor-default [&_.leaflet-container]:!cursor-default' : ''
            }`}
          >
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              minZoom={2}
              maxZoom={11}
              worldCopyJump={true}
              zoomControl={false}
              scrollWheelZoom={false}
              style={{ width: '100%', height: '100%', background: activeBasemap.isLightSurface ? '#E5E7EB' : '#0B1219' }}
              className="z-0"
            >
              <MapResizeHandler />
              <MapViewController center={mapCenter} zoom={mapZoom} />
              <MapLockHandler isLocked={isMapLocked} />
              <MapProbeHandler isLocked={isMapLocked} onProbe={handleMapProbe} />

              <TileLayer
                key={`home-basemap-${activeBasemap.id}-${activeBasemap.styleId}`}
                url={activeBasemap.baseUrl}
                attribution={activeBasemap.attribution}
                maxZoom={activeBasemap.maxZoom}
                className={activeBasemap.className || ''}
                eventHandlers={{
                  tileerror: () => {
                    basemapErrorsRef.current += 1;
                    if (basemapErrorsRef.current >= 3 && !useBasemapFallback) {
                      setUseBasemapFallback(true);
                    }
                  },
                }}
              />
              {activeBasemap.referenceUrl && !useBasemapFallback && (
                <TileLayer
                  key={`home-basemap-ref-${activeBasemap.id}`}
                  url={activeBasemap.referenceUrl}
                  maxZoom={activeBasemap.maxZoom}
                  opacity={0.82}
                  zIndex={200}
                />
              )}

              {activeTileUrl && (
                <TileLayer
                  key={`home-radar-${activeFrame?.id || playback.currentIndex}-${activePrecipLevels.join(',')}`}
                  url={activeTileUrl}
                  opacity={computedTileOpacity}
                  className={`radar-tile-layer ${computedTileFilterClass}`}
                  maxNativeZoom={7}
                  maxZoom={11}
                  zIndex={300}
                  attribution="Weather data &copy; RainViewer"
                  eventHandlers={{
                    loading: () => setIsTileLoading(true),
                    load: () => {
                      setIsTileLoading(false);
                      setTileError(null);
                    },
                    tileerror: () => {
                      setIsTileLoading(false);
                      setTileError('Radar tile frame failed to load from upstream.');
                    },
                  }}
                />
              )}

              {/* DWR Station Range Ring & Marker */}
              {viewMode === 'station' && (
                <Circle
                  center={[currentStation.lat, currentStation.lng]}
                  radius={currentStation.rangeKm * 1000}
                  pathOptions={{
                    color: '#C5A46D',
                    fillColor: '#C5A46D',
                    fillOpacity: 0.05,
                    weight: 1.5,
                    dashArray: '4, 5',
                  }}
                />
              )}

              {viewMode === 'station' && stationDivIcon && (
                <Marker position={[currentStation.lat, currentStation.lng]} icon={stationDivIcon}>
                  <Popup className="custom-radar-popup">
                    <div className="text-xs p-1">
                      <strong className="block text-[var(--m-accent)]">DWR {currentStation.city}</strong>
                      <div className="text-[#333] text-[10px] mt-0.5">
                        {currentStation.model} · {currentStation.band}
                      </div>
                      <div className="text-[#666] text-[9px]">
                        Surveillance Radius: {currentStation.rangeKm} km
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Strictly Geodetic Probed Coordinate Marker */}
              {probedPoint && probeDivIcon && (
                <Marker position={[probedPoint.lat, probedPoint.lng]} icon={probeDivIcon}>
                  <Popup>
                    <div className="text-xs p-1 max-w-[220px]">
                      <strong className="block text-[#0F766E]">Geodetic Range Probe</strong>
                      <div className="text-[10px] text-[#333] mt-0.5 font-mono">
                        {formatCoordinatePair(probedPoint.lat, probedPoint.lng, 3)}
                      </div>
                      <div className="text-[10px] text-[#222] mt-1 font-mono font-semibold">
                        {probedPoint.distanceKm} km @ {probedPoint.bearing}° {probedPoint.compass} from DWR {currentStation.city}
                      </div>
                      <div className="text-[9px] text-[#555] mt-0.5">
                        {probedPoint.withinCoverage
                          ? `Within ${currentStation.rangeKm} km DWR coverage`
                          : `Outside ${currentStation.rangeKm} km station radius`}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              <ZoomControl position="topright" />
            </MapContainer>

            {/* Top-Left Timestamp & Sweep Inspector Trigger */}
            <button
              type="button"
              id="badge-latest-echo-trigger"
              onClick={handleLatestEchoAction}
              title="Inspect composite sweep metadata or jump to latest frame"
              className="absolute top-3 left-3 bg-[#101820]/95 border border-[#354653] hover:border-[var(--m-accent)] px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 z-[520] backdrop-blur-sm cursor-pointer transition-colors group shadow-lg max-w-[calc(100%-96px)]"
            >
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                  activeFrame?.dataType === 'NOWCAST'
                    ? 'bg-[#F59E0B]/20 text-[#FCD34D]'
                    : 'bg-[#10B981]/20 text-[#6EE7B7]'
                }`}
              >
                {activeFrame?.dataType || 'SYNC'}
              </span>
              <span className="text-[#F5F3ED] font-mono text-[11px] font-bold truncate tabular-nums">
                {activeFrame ? activeFrame.formattedTime : 'Syncing…'}
              </span>
              <Crosshair className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0 opacity-80 group-hover:opacity-100" />
            </button>

            {/* Bottom-Left Overlay Opacity Slider */}
            <div className="absolute bottom-3 left-3 z-[450]">
              <MapOpacitySlider
                opacity={radarOpacity}
                onChange={setRadarOpacity}
                label="Opacity"
              />
            </div>

            <MapLoadingOverlay visible={isTileLoading} label="Loading radar frame…" />
            <MapErrorOverlay message={tileError} onRetry={() => setTileError(null)} />

            {echoFeedback && (
              <div className="absolute top-12 left-3 bg-[var(--m-accent)] text-[var(--m-on-accent)] px-3 py-1 rounded text-xs font-semibold z-[530] flex items-center gap-1.5 pointer-events-none shadow-md">
                <Zap className="w-3.5 h-3.5" />
                <span>{echoFeedback}</span>
              </div>
            )}

            {/* Honest Sweep Metadata Inspector (Zero Fabricated Reflectivity Values) */}
            {showSweepInspector && (
              <div
                id="panel-latest-echo-inspector"
                className="absolute top-14 left-3 w-76 max-w-[calc(100%-24px)] bg-[#101820]/96 border border-[var(--m-accent)]/50 rounded-xl p-3.5 z-[550] backdrop-blur-md flex flex-col gap-2.5 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--m-border)]">
                  <span className="text-xs font-bold text-[var(--m-text-primary)] font-mono uppercase tracking-wider">
                    Radar Sweep Telemetry
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSweepInspector(false)}
                    className="text-[var(--m-text-muted)] hover:text-white p-0.5 rounded cursor-pointer"
                    aria-label="Close inspector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                  <div className="bg-[var(--m-surface-inset)] p-2 rounded border border-[var(--m-border)]">
                    <span className="text-[var(--m-text-muted)] text-[9px] block">SWEEP TIME</span>
                    <span className="text-[var(--m-text-primary)] font-bold">
                      {activeFrame ? activeFrame.formattedTime : '—'}
                    </span>
                  </div>
                  <div className="bg-[var(--m-surface-inset)] p-2 rounded border border-[var(--m-border)]">
                    <span className="text-[var(--m-text-muted)] text-[9px] block">FRESHNESS</span>
                    <span className="text-[#22C7A0] font-bold">
                      {getEchoAgeText(displayedTimestamp)}
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] text-[11px] text-[var(--m-text-secondary)] space-y-1">
                  <div className="font-semibold text-[var(--m-text-primary)]">
                    DWR {currentStation.city} ({currentStation.state})
                  </div>
                  <div className="font-mono text-[10px] text-[var(--m-text-muted)]">
                    {formatCoordinatePair(currentStation.lat, currentStation.lng, 3)} · Range {currentStation.rangeKm} km
                  </div>
                  <p className="text-[10px] text-[var(--m-text-muted)] leading-relaxed">
                    Displays verified RainViewer composite reflectivity tiles. Exact point dBZ readouts require raw Level-II volumetric sweeps.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchRadarData(undefined, true)}
                  disabled={isRefreshing}
                  className="w-full bg-[var(--m-accent)] text-[var(--m-on-accent)] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Check for Newer Sweep</span>
                </button>
              </div>
            )}

            {/* Initial Loading Overlay */}
            {radarStatus === 'loading' && playback.frameCount === 0 && (
              <div className="absolute inset-0 bg-[var(--m-surface-inset)]/85 z-[600] flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                <RefreshCw className="w-7 h-7 text-[var(--m-accent)] animate-spin" />
                <span className="text-sm font-semibold text-[var(--m-text-primary)]">
                  Loading radar imagery…
                </span>
                <span className="text-xs text-[var(--m-text-muted)]">
                  Connecting to RainViewer composite radar feed
                </span>
              </div>
            )}

            {/* Error State Overlay */}
            {radarStatus === 'error' && playback.frameCount === 0 && (
              <div className="absolute inset-0 bg-[var(--m-surface-inset)]/90 z-[600] flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                <AlertCircle className="w-8 h-8 text-[#EF4444]" />
                <span className="text-sm font-bold text-[var(--m-text-primary)]">
                  Radar imagery unavailable
                </span>
                <p className="text-xs text-[var(--m-text-muted)] max-w-sm">
                  {fetchError || 'Unable to retrieve latest radar mosaic from source.'}
                </p>
                <button
                  type="button"
                  onClick={() => fetchRadarData(undefined, true)}
                  className="mt-1 px-3.5 py-1.5 bg-[var(--m-accent)] text-[var(--m-on-accent)] text-xs font-bold rounded-lg cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            )}

            <RadarMapLegendPanel
              initialMetric="all"
              positionClass="bottom-3 right-3"
              activePrecipLevels={activePrecipLevels}
              onPrecipLevelsChange={setActivePrecipLevels}
              sectorName={`${currentStation.city} (${currentStation.state}) Sector`}
              stationName={`DWR ${currentStation.city}`}
              timestamp={activeFrame?.time}
            />

            {isPrecipFiltered && (
              <div className="absolute top-14 right-3 z-[500] bg-[var(--m-surface-inset)]/95 border border-[#F59E0B]/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono text-[var(--m-text-primary)] flex items-center gap-2">
                <span className="text-[#FCD34D] font-bold text-[10px] uppercase">
                  FILTER: {activePrecipLevels.length}/6
                </span>
                <button
                  type="button"
                  onClick={() => setActivePrecipLevels(ALL_PRECIP_LEVEL_IDS)}
                  className="text-[10px] text-[var(--m-accent)] underline cursor-pointer font-bold"
                >
                  Reset
                </button>
              </div>
            )}

            <style>{`
              .radar-tile-layer img { transition: filter 0.25s ease, opacity 0.25s ease; }
              .radar-filter-zero img { opacity: 0 !important; }
              .radar-filter-heavy-plus img { filter: contrast(220%) saturate(190%) brightness(110%); }
              .radar-filter-mod-plus img { filter: contrast(165%) saturate(160%) brightness(105%); }
              .radar-filter-trace-only img { filter: contrast(135%) saturate(135%) hue-rotate(170deg); }
              .radar-filter-custom img { filter: contrast(145%) saturate(150%); }
              .mausam-osm-dark-tiles { filter: invert(92%) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.75); }
            `}</style>
          </div>

          {/* Unified, Cleanup-Safe Radar Time-Lapse Playback Controls */}
          <MapPlaybackControls
            playback={playback}
            currentTimestampLabel={activeFrame ? activeFrame.formattedTime : 'Awaiting radar sweeps'}
            firstTimestampLabel={
              playback.frames[0] ? playback.frames[0].formattedTime : undefined
            }
            lastTimestampLabel={
              playback.frames[playback.frameCount - 1]
                ? playback.frames[playback.frameCount - 1].formattedTime
                : undefined
            }
            frameKindBadge={activeFrame?.dataType}
            frameDetail={activeFrame?.relativeLabel}
            sourceLabel="RainViewer Radar"
            isFrameLoading={isTileLoading}
            emptyMessage="Radar composite sweeps unavailable from upstream."
          />
        </div>
      </div>
    </DataPanel>
  );
};
