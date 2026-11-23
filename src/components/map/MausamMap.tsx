import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Lock, Unlock, Maximize2, Minimize2, Compass } from 'lucide-react';
import L from 'leaflet';
import { WeatherMapMetric } from './MapLayerControl';
import { StateWeatherData } from './IndiaWeatherMap';
import { INDIA_WEATHER_DATA } from '../../data/indiaWeatherData';
import { RadarStation } from '../../types/radar';
import {
  OFFICIAL_RADAR_STATIONS,
  RadarFrame,
  RadarMotionVector,
  RadarDataStatus,
} from '../../services/radarService';
import {
  RadarMapLegendPanel,
  PrecipLevelId,
  ALL_PRECIP_LEVEL_IDS,
} from '../radar/RadarMapLegendPanel';
import {
  RadarTimeLapseController,
  RadarTimeSpan,
} from '../radar/RadarTimeLapseController';
import {
  BasemapStyleSwitcher,
  MapErrorOverlay,
  MapLoadingOverlay,
  MapOpacitySlider,
} from '../maps';
import {
  INDIA_GEOGRAPHIC_BOUNDS,
  resolveBasemapSpec,
  type BasemapStyleId,
} from '../../utils/mapBasemaps';
import type { PlaybackSpeed } from '../../hooks/useFramePlayback';
import { formatCoordinatePair } from '../../../shared/weatherContract';

export interface MausamMapControls {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitIndia: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  toggleLock?: () => void;
  isLocked?: boolean;
}

export interface MausamMapProps {
  viewMode?: 'synoptic' | 'radar';
  activeMetric?: WeatherMapMetric;
  selectedState?: string | null;
  onSelectState?: (state: StateWeatherData) => void;
  selectedStation?: RadarStation | null;
  onSelectStation?: (station: RadarStation) => void;
  radarTileUrl?: string | null;
  radarOpacity?: number;
  onRadarOpacityChange?: (opacity: number) => void;
  basemapStyle?: BasemapStyleId;
  onBasemapStyleChange?: (style: BasemapStyleId) => void;
  userCoords?: { lat: number; lng: number } | null;
  onControlsReady?: (controls: MausamMapControls) => void;
  className?: string;
  heightClass?: string;
  isLocked?: boolean;
  onToggleLock?: () => void;
  sectorName?: string;
  showRadarLegend?: boolean;
  showBasemapSwitcher?: boolean;
  activePrecipLevels?: PrecipLevelId[];
  onPrecipLevelsChange?: (levels: PrecipLevelId[]) => void;
  // Time-Lapse Playback Controls on Radar Map
  showTimeLapseControl?: boolean;
  timeLapseFrames?: RadarFrame[];
  activeFrameIndex?: number;
  onChangeFrame?: (index: number) => void;
  onResetPlayback?: () => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  playbackSpeed?: number;
  onChangeSpeed?: (speed: PlaybackSpeed) => void;
  loop?: boolean;
  onToggleLoop?: () => void;
  timeSpan?: RadarTimeSpan;
  onChangeTimeSpan?: (span: RadarTimeSpan) => void;
  motionVector?: RadarMotionVector;
  dataStatus?: RadarDataStatus;
  inspectedCoords?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
}

/**
 * Centroid coordinates for Indian states and UTs
 */
const STATE_COORDINATES: Record<string, { lat: number; lng: number; code: string }> = {
  'andhra pradesh': { lat: 15.9129, lng: 79.74, code: 'AP' },
  'arunachal pradesh': { lat: 28.218, lng: 94.7278, code: 'AR' },
  'assam': { lat: 26.2006, lng: 92.9376, code: 'AS' },
  'bihar': { lat: 25.0961, lng: 85.3131, code: 'BR' },
  'chhattisgarh': { lat: 21.2787, lng: 81.8661, code: 'CG' },
  'goa': { lat: 15.2993, lng: 74.124, code: 'GA' },
  'gujarat': { lat: 22.2587, lng: 71.1924, code: 'GJ' },
  'haryana': { lat: 29.0588, lng: 76.0856, code: 'HR' },
  'himachal pradesh': { lat: 31.1048, lng: 77.1734, code: 'HP' },
  'jharkhand': { lat: 23.6102, lng: 85.2799, code: 'JH' },
  'karnataka': { lat: 15.3173, lng: 75.7139, code: 'KA' },
  'kerala': { lat: 10.8505, lng: 76.2711, code: 'KL' },
  'madhya pradesh': { lat: 22.9734, lng: 78.6569, code: 'MP' },
  'maharashtra': { lat: 19.7515, lng: 75.7139, code: 'MH' },
  'manipur': { lat: 24.6637, lng: 93.9063, code: 'MN' },
  'meghalaya': { lat: 25.467, lng: 91.3662, code: 'ML' },
  'mizoram': { lat: 23.1645, lng: 92.9376, code: 'MZ' },
  'nagaland': { lat: 26.1584, lng: 94.5624, code: 'NL' },
  'odisha': { lat: 20.9517, lng: 85.0985, code: 'OD' },
  'punjab': { lat: 31.1471, lng: 75.3412, code: 'PB' },
  'rajasthan': { lat: 27.0238, lng: 74.2179, code: 'RJ' },
  'sikkim': { lat: 27.533, lng: 88.5122, code: 'SK' },
  'tamil nadu': { lat: 11.1271, lng: 78.6569, code: 'TN' },
  'telangana': { lat: 18.1124, lng: 79.0193, code: 'TS' },
  'tripura': { lat: 23.9408, lng: 91.9882, code: 'TR' },
  'uttar pradesh': { lat: 26.8467, lng: 80.9462, code: 'UP' },
  'uttarakhand': { lat: 30.0668, lng: 79.0193, code: 'UK' },
  'west bengal': { lat: 22.9868, lng: 87.855, code: 'WB' },
  'delhi': { lat: 28.7041, lng: 77.1025, code: 'DL' },
  'jammu and kashmir': { lat: 33.7782, lng: 76.5762, code: 'JK' },
  'ladakh': { lat: 34.1526, lng: 77.5771, code: 'LA' },
  'chandigarh': { lat: 30.7333, lng: 76.7794, code: 'CH' },
  'puducherry': { lat: 11.9416, lng: 79.8083, code: 'PY' },
  'andaman and nicobar': { lat: 11.7401, lng: 92.6586, code: 'AN' },
  'lakshadweep': { lat: 10.5667, lng: 72.6417, code: 'LD' },
  'dadra and nagar haveli and daman and diu': { lat: 20.4283, lng: 72.8397, code: 'DD' },
};

const COMPASS_TO_DEG: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

function getAqiCategoryLabel(aqi: number | null | undefined): string {
  if (aqi === null || aqi === undefined || Number.isNaN(aqi)) return 'Unavailable';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const element = map.getContainer();

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false, animate: false });
    });

    observer.observe(element);

    const timer = setTimeout(() => {
      map.invalidateSize({ pan: false, animate: false });
    }, 200);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [map]);

  return null;
}

function MapController({
  center,
  zoom,
  onControlsReady,
  isLocked = false,
  onToggleLock,
}: {
  center: [number, number];
  zoom: number;
  onControlsReady?: (controls: MausamMapControls) => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
}) {
  const map = useMap();
  const isLockedRef = useRef(isLocked);
  const onToggleLockRef = useRef(onToggleLock);
  const onControlsReadyRef = useRef(onControlsReady);
  const controlsReadySentRef = useRef(false);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    onToggleLockRef.current = onToggleLock;
  }, [onToggleLock]);

  useEffect(() => {
    onControlsReadyRef.current = onControlsReady;
  }, [onControlsReady]);

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  useEffect(() => {
    if (!controlsReadySentRef.current && onControlsReadyRef.current) {
      controlsReadySentRef.current = true;
      onControlsReadyRef.current({
        zoomIn: () => {
          if (!isLockedRef.current) map.zoomIn();
        },
        zoomOut: () => {
          if (!isLockedRef.current) map.zoomOut();
        },
        resetView: () => {
          if (!isLockedRef.current) map.setView([18, 12], 2, { animate: true });
        },
        fitIndia: () => {
          if (!isLockedRef.current) {
            map.fitBounds(INDIA_GEOGRAPHIC_BOUNDS, { padding: [20, 20], animate: true });
          }
        },
        flyTo: (lat: number, lng: number, z = 7) => map.flyTo([lat, lng], z, { animate: true }),
        toggleLock: () => onToggleLockRef.current?.(),
        get isLocked() {
          return !!isLockedRef.current;
        },
      });
    }
  }, [map]);

  return null;
}

function MapInteractionLockController({ isLocked }: { isLocked: boolean }) {
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

function MapClickHandler({
  isLocked,
  onMapClick,
  onHoverCoords,
}: {
  isLocked: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onHoverCoords?: (coords: { lat: number; lng: number } | null) => void;
}) {
  useMapEvents({
    click(e) {
      if (isLocked || !onMapClick) return;
      onMapClick(Number(e.latlng.lat.toFixed(4)), Number(e.latlng.lng.toFixed(4)));
    },
    mousemove(e) {
      onHoverCoords?.({
        lat: Number(e.latlng.lat.toFixed(2)),
        lng: Number(e.latlng.lng.toFixed(2)),
      });
    },
    mouseout() {
      onHoverCoords?.(null);
    },
  });
  return null;
}

function getMetricBadge(
  state: StateWeatherData,
  metric: WeatherMapMetric
): { value: string; bg: string; text: string; arrowDeg?: number } {
  const isNum = (v: number | undefined | null): v is number =>
    v !== undefined && v !== null && !Number.isNaN(v);

  switch (metric) {
    case 'temperature': {
      if (!isNum(state.temperature)) return { value: '—', bg: '#191C1D', text: '#898B83' };
      const val = state.temperature;
      let bg = '#38BDF8';
      if (val >= 38) bg = '#EF4444';
      else if (val >= 32) bg = '#F97316';
      else if (val >= 25) bg = '#D97706';
      else if (val >= 18) bg = '#059669';
      return { value: `${val}°C`, bg, text: '#FFFFFF' };
    }
    case 'rainfall': {
      if (!isNum(state.rainfall)) return { value: '—', bg: '#191C1D', text: '#898B83' };
      const val = state.rainfall;
      let bg = '#334155';
      if (val >= 65) bg = '#7C3AED';
      else if (val >= 20) bg = '#2563EB';
      else if (val >= 5) bg = '#0284C7';
      else if (val > 0) bg = '#0D9488';
      return { value: `${val} mm`, bg, text: '#FFFFFF' };
    }
    case 'aqi': {
      if (!isNum(state.aqi)) return { value: '—', bg: '#191C1D', text: '#898B83' };
      const val = state.aqi;
      let bg = '#16A34A';
      if (val > 400) bg = '#991B1B';
      else if (val > 300) bg = '#DC2626';
      else if (val > 200) bg = '#EA580C';
      else if (val > 100) bg = '#CA8A04';
      else if (val > 50) bg = '#65A30D';
      return { value: `AQI ${val}`, bg, text: '#FFFFFF' };
    }
    case 'humidity': {
      if (!isNum(state.humidity)) return { value: '—', bg: '#191C1D', text: '#898B83' };
      const val = state.humidity;
      let bg = '#D97706';
      if (val >= 80) bg = '#1D4ED8';
      else if (val >= 60) bg = '#0284C7';
      else if (val >= 35) bg = '#0D9488';
      return { value: `${val}%`, bg, text: '#FFFFFF' };
    }
    case 'wind': {
      if (!isNum(state.windSpeed)) return { value: '—', bg: '#191C1D', text: '#898B83' };
      const val = state.windSpeed;
      let bg = '#0284C7';
      if (val >= 60) bg = '#DC2626';
      else if (val >= 40) bg = '#EA580C';
      else if (val >= 20) bg = '#059669';
      const dirKey = (state.windDir || 'SW').toUpperCase().trim();
      const arrowDeg = COMPASS_TO_DEG[dirKey] ?? 225;
      return { value: `${val} km/h`, bg, text: '#FFFFFF', arrowDeg };
    }
    case 'warnings': {
      const level = state.warningLevel || 'normal';
      let bg = '#059669';
      let label = 'Normal';
      if (level === 'severe') {
        bg = '#DC2626';
        label = 'Red';
      } else if (level === 'alert') {
        bg = '#EA580C';
        label = 'Orange';
      } else if (level === 'watch') {
        bg = '#CA8A04';
        label = 'Yellow';
      }
      return { value: label, bg, text: '#FFFFFF' };
    }
    default:
      return {
        value: isNum(state.temperature) ? `${state.temperature}°C` : '—',
        bg: '#C5A46D',
        text: '#FFFFFF',
      };
  }
}

export const MausamMap: React.FC<MausamMapProps> = ({
  viewMode = 'synoptic',
  activeMetric = 'temperature',
  selectedState = null,
  onSelectState,
  selectedStation = null,
  onSelectStation,
  radarTileUrl,
  radarOpacity: controlledRadarOpacity,
  onRadarOpacityChange,
  basemapStyle: controlledBasemapStyle,
  onBasemapStyleChange,
  userCoords,
  onControlsReady,
  className = '',
  heightClass = 'h-[clamp(300px,54dvh,680px)]',
  isLocked = false,
  onToggleLock,
  sectorName,
  showRadarLegend = true,
  showBasemapSwitcher = true,
  activePrecipLevels,
  onPrecipLevelsChange,
  showTimeLapseControl,
  timeLapseFrames,
  activeFrameIndex,
  onChangeFrame,
  onResetPlayback,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  loop,
  onToggleLoop,
  timeSpan = '6h',
  onChangeTimeSpan,
  motionVector,
  dataStatus,
  inspectedCoords = null,
  onMapClick,
}) => {
  const INDIA_CENTER: [number, number] = [22.8, 80.5];
  const DEFAULT_ZOOM = 4.8;
  const containerRef = useRef<HTMLDivElement>(null);

  const [showLockNotice, setShowLockNotice] = useState<boolean>(false);
  const [internalBasemapStyle, setInternalBasemapStyle] = useState<BasemapStyleId>('dark');
  const [useBasemapFallback, setUseBasemapFallback] = useState<boolean>(false);
  const [internalRadarOpacity, setInternalRadarOpacity] = useState<number>(0.8);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isRadarTileLoading, setIsRadarTileLoading] = useState<boolean>(false);
  const [radarTileError, setRadarTileError] = useState<string | null>(null);
  const basemapErrorsRef = useRef<number>(0);

  const basemapStyle = controlledBasemapStyle ?? internalBasemapStyle;
  const handleBasemapChange = useCallback(
    (next: BasemapStyleId) => {
      basemapErrorsRef.current = 0;
      setUseBasemapFallback(false);
      if (controlledBasemapStyle === undefined) {
        setInternalBasemapStyle(next);
      }
      onBasemapStyleChange?.(next);
    },
    [controlledBasemapStyle, onBasemapStyleChange]
  );

  const radarOpacity = controlledRadarOpacity ?? internalRadarOpacity;
  const handleOpacityChange = useCallback(
    (next: number) => {
      if (controlledRadarOpacity === undefined) {
        setInternalRadarOpacity(next);
      }
      onRadarOpacityChange?.(next);
    },
    [controlledRadarOpacity, onRadarOpacityChange]
  );

  const activeBasemap = useMemo(
    () => resolveBasemapSpec(basemapStyle, useBasemapFallback),
    [basemapStyle, useBasemapFallback]
  );

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el || typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked inside restricted iframes; silently keep normal view
    }
  }, []);

  const effectiveShowTimeLapse =
    showTimeLapseControl !== undefined
      ? showTimeLapseControl
      : viewMode === 'radar' && !!(timeLapseFrames && timeLapseFrames.length > 0);

  // Precipitation intensity layer filter state
  const [internalPrecipLevels, setInternalPrecipLevels] = useState<PrecipLevelId[]>(ALL_PRECIP_LEVEL_IDS);
  const effectivePrecipLevels = activePrecipLevels !== undefined ? activePrecipLevels : internalPrecipLevels;
  const handlePrecipLevelsChange = useCallback(
    (levels: PrecipLevelId[]) => {
      if (activePrecipLevels === undefined) {
        setInternalPrecipLevels(levels);
      }
      onPrecipLevelsChange?.(levels);
    },
    [activePrecipLevels, onPrecipLevelsChange]
  );

  const isPrecipFiltered = effectivePrecipLevels.length < ALL_PRECIP_LEVEL_IDS.length;

  const computedTileFilterClass = useMemo(() => {
    if (effectivePrecipLevels.length === ALL_PRECIP_LEVEL_IDS.length) return '';
    if (effectivePrecipLevels.length === 0) return 'radar-filter-zero';
    const hasTrace = effectivePrecipLevels.includes('trace');
    const hasLight = effectivePrecipLevels.includes('light');
    const hasMod = effectivePrecipLevels.includes('moderate');
    const hasHeavy = effectivePrecipLevels.includes('heavy');
    const hasIntense = effectivePrecipLevels.includes('intense');
    const hasExtreme = effectivePrecipLevels.includes('extreme');

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
  }, [effectivePrecipLevels]);

  const computedTileOpacity = useMemo(() => {
    if (effectivePrecipLevels.length === 0) return 0;
    if (effectivePrecipLevels.length === ALL_PRECIP_LEVEL_IDS.length) return radarOpacity;
    return Math.max(0.3, (effectivePrecipLevels.length / ALL_PRECIP_LEVEL_IDS.length) * radarOpacity);
  }, [effectivePrecipLevels, radarOpacity]);

  const isStateRainfallInFilter = useCallback(
    (rainfallMm: number = 0) => {
      if (effectivePrecipLevels.length === ALL_PRECIP_LEVEL_IDS.length) return true;
      if (rainfallMm < 0.5) return effectivePrecipLevels.includes('trace');
      if (rainfallMm < 4) return effectivePrecipLevels.includes('light');
      if (rainfallMm < 15) return effectivePrecipLevels.includes('moderate');
      if (rainfallMm < 50) return effectivePrecipLevels.includes('heavy');
      if (rainfallMm < 100) return effectivePrecipLevels.includes('intense');
      return effectivePrecipLevels.includes('extreme');
    },
    [effectivePrecipLevels]
  );

  const activeSectorLabel = useMemo<string>(() => {
    if (sectorName) return sectorName;
    if (viewMode === 'radar' && selectedStation) {
      return `${selectedStation.name} Radar Sector (${selectedStation.id})`;
    }
    if (viewMode === 'synoptic' && selectedState) {
      return `${selectedState} Synoptic Sector`;
    }
    return 'India Meteorological Sector';
  }, [sectorName, viewMode, selectedStation, selectedState]);

  const center = useMemo<[number, number]>(() => {
    if (viewMode === 'radar' && selectedStation) {
      return [selectedStation.latitude, selectedStation.longitude];
    }
    if (viewMode === 'synoptic' && selectedState) {
      const match = STATE_COORDINATES[selectedState.toLowerCase()];
      if (match) {
        return [match.lat, match.lng];
      }
    }
    return INDIA_CENTER;
  }, [viewMode, selectedStation, selectedState]);

  const zoom = useMemo<number>(() => {
    if (viewMode === 'radar' && selectedStation) {
      return 7;
    }
    if (viewMode === 'synoptic' && selectedState) {
      return 6;
    }
    return DEFAULT_ZOOM;
  }, [viewMode, selectedStation, selectedState]);

  // Reset tile error banner when radar URL changes
  useEffect(() => {
    if (radarTileUrl) {
      setRadarTileError(null);
    }
  }, [radarTileUrl]);

  const createStateMarkerIcon = useCallback(
    (state: StateWeatherData, isSelected: boolean) => {
      const metricInfo = getMetricBadge(state, activeMetric);
      const stateName = state.name;
      const key = stateName.toLowerCase();
      const code = STATE_COORDINATES[key]?.code || state.id.replace('IN-', '');
      const isRainfallMetric = activeMetric === 'rainfall';
      const isMatchingPrecipFilter = isRainfallMetric ? isStateRainfallInFilter(state.rainfall) : true;
      const filterStyle = !isMatchingPrecipFilter ? 'opacity: 0.22; filter: grayscale(85%);' : '';

      const windArrowHtml =
        activeMetric === 'wind' && typeof metricInfo.arrowDeg === 'number'
          ? `<span style="display:inline-flex;align-items:center;justify-content:center;transform:rotate(${metricInfo.arrowDeg}deg);font-size:10px;line-height:1;">↑</span>`
          : '';

      const html = `
        <div class="cursor-pointer group flex flex-col items-center select-none" style="transform: translate(-50%, -50%); ${filterStyle}">
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded shadow-lg text-[10px] font-bold font-mono transition-transform duration-150 ${
            isSelected
              ? 'ring-2 ring-white scale-110 shadow-[0_0_12px_rgba(197,164,109,0.85)]'
              : 'group-hover:scale-105'
          }" style="background-color: ${metricInfo.bg}; color: ${metricInfo.text}; border: 1px solid rgba(255,255,255,0.35);">
            <span class="opacity-90">${code}</span>
            <span class="opacity-40">|</span>
            ${windArrowHtml}
            <span>${metricInfo.value}</span>
          </div>
          <div class="w-1 h-1 rounded-full bg-white/80 mt-0.5 shadow-sm"></div>
        </div>
      `;

      return L.divIcon({
        className: 'custom-state-marker',
        html,
        iconSize: [72, 24],
        iconAnchor: [36, 12],
      });
    },
    [activeMetric, isStateRainfallInFilter]
  );

  const createRadarStationIcon = useCallback(
    (station: RadarStation, isSelected: boolean) => {
      const isS = station.band.includes('S-Band');
      const isC = station.band.includes('C-Band');
      const bandTag = isS ? 'S' : isC ? 'C' : 'X';
      const badgeBg = isSelected ? '#C5A46D' : '#111314';
      const borderCol = isSelected ? '#FFFFFF' : '#3B4246';

      const html = `
        <div class="cursor-pointer group flex flex-col items-center select-none" style="transform: translate(-50%, -50%);">
          <div class="relative flex items-center justify-center">
            ${
              isSelected
                ? '<div class="absolute -inset-1.5 rounded-full border border-[var(--m-accent)]/85 pointer-events-none"></div>'
                : ''
            }
            <div class="w-7 h-7 rounded-full flex items-center justify-center shadow-md font-bold text-[10px] text-white transition-transform ${
              isSelected ? 'scale-110 ring-2 ring-white' : 'group-hover:scale-105'
            }" style="background-color: ${badgeBg}; border: 2px solid ${borderCol};">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/>
                <path d="M4 6h.01"/>
                <path d="M2.29 9.62A10 10 0 0 0 21.42 17.5"/>
                <path d="M16.24 7.76A6 6 0 0 0 8.23 6.67"/>
                <path d="M12 18v4"/>
                <path d="M8 22h8"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
          </div>
          <div class="bg-[#0B1117]/92 text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/15 text-[#F5F3ED] font-semibold mt-0.5 whitespace-nowrap shadow-sm">
            ${station.id.replace('DWR-', '')} <span style="color:#C5A46D">${bandTag}</span>
          </div>
        </div>
      `;

      return L.divIcon({
        className: 'custom-radar-marker',
        html,
        iconSize: [44, 46],
        iconAnchor: [22, 23],
      });
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isFullscreen ? 'h-screen' : heightClass} bg-[var(--m-surface-inset)] rounded-none overflow-hidden select-none ${
        isLocked ? '[&_.leaflet-grab]:!cursor-default [&_.leaflet-container]:!cursor-default' : ''
      } ${className}`}
      style={{ zIndex: 0 }}
      onClick={() => {
        if (isLocked) {
          setShowLockNotice(true);
          setTimeout(() => setShowLockNotice(false), 2400);
        }
      }}
    >
      {/* Top-Right Control Cluster: Basemap Style, Radar Opacity, Lock View, Fullscreen */}
      <div className="absolute top-3 right-3 z-[420] flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto max-w-[calc(100%-24px)]">
        {showBasemapSwitcher && (
          <BasemapStyleSwitcher
            value={basemapStyle}
            onChange={handleBasemapChange}
            compact={true}
          />
        )}

        {viewMode === 'radar' && radarTileUrl && (
          <MapOpacitySlider
            opacity={radarOpacity}
            onChange={handleOpacityChange}
            label="Radar"
          />
        )}

        <button
          type="button"
          id="btn-map-floating-lock"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock?.();
          }}
          aria-label={isLocked ? 'Unlock map panning and zooming' : 'Lock map to current sector'}
          aria-pressed={isLocked}
          title={
            isLocked
              ? `Map view locked to ${activeSectorLabel}. Click to unlock.`
              : 'Lock view to current weather sector'
          }
          className={`h-9 flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap m-focus-ring ${
            isLocked
              ? 'bg-[var(--m-surface-inset)]/95 text-[#FCD34D] border border-[#F59E0B]/70'
              : 'bg-[var(--m-surface-inset)]/90 text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)] border border-[var(--m-border)]'
          }`}
        >
          {isLocked ? (
            <Lock className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Unlock className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="font-mono uppercase tracking-wider text-[10px] hidden sm:inline">
            {isLocked ? 'Locked' : 'Lock'}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFullscreen();
          }}
          aria-label={isFullscreen ? 'Exit fullscreen map' : 'Open fullscreen map'}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
          className="w-9 h-9 rounded-lg bg-[var(--m-surface-inset)]/90 hover:bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer m-focus-ring"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* On-Map Sector Lock Notification Strip (Top-Left) */}
      {isLocked && (
        <div className="absolute top-3 left-3 z-[420] bg-[var(--m-surface-inset)]/95 border border-[#F59E0B]/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--m-text-primary)] flex items-center gap-2 pointer-events-auto">
          <Lock className="w-3.5 h-3.5 text-[#FCD34D] shrink-0" />
          <span className="text-[#FCD34D] font-bold text-[10px] uppercase tracking-wider">LOCKED:</span>
          <span className="text-[11px] font-semibold text-white truncate max-w-[140px] sm:max-w-[240px]">
            {activeSectorLabel}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock?.();
            }}
            className="ml-1 text-[10px] text-[var(--m-accent)] hover:text-white underline font-sans cursor-pointer shrink-0 font-semibold"
          >
            Unlock
          </button>
        </div>
      )}

      {showLockNotice && isLocked && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[430] bg-[var(--m-surface-inset)]/95 border border-[#F59E0B] text-white text-xs px-3.5 py-1.5 rounded-lg shadow-xl flex items-center gap-2 pointer-events-none backdrop-blur-md">
          <Lock className="w-3.5 h-3.5 text-[#FCD34D] shrink-0" />
          <span className="text-[11px] font-medium text-[var(--m-text-primary)]">
            Sector View is Locked — Click &quot;Unlock&quot; to pan or zoom.
          </span>
        </div>
      )}

      {/* Subtle loading & error overlays for radar tile requests */}
      <MapLoadingOverlay
        visible={viewMode === 'radar' && isRadarTileLoading}
        label="Loading Doppler sweep tiles…"
      />
      <MapErrorOverlay
        message={radarTileError}
        onRetry={() => setRadarTileError(null)}
        severity="warning"
      />

      {/* Persistent Semi-Transparent Radar Legend Panel */}
      {showRadarLegend && (
        <RadarMapLegendPanel
          initialMetric="all"
          positionClass={isLocked ? 'top-14 left-3' : 'top-3 left-3'}
          activePrecipLevels={effectivePrecipLevels}
          onPrecipLevelsChange={handlePrecipLevelsChange}
          sectorName={activeSectorLabel}
          stationName={selectedStation?.name}
        />
      )}

      {/* Coordinate Cursor Readout (Desktop) */}
      {hoverCoords && (
        <div className="hidden md:flex items-center gap-1.5 absolute bottom-2 left-2 z-[405] px-2 py-1 rounded-md bg-[var(--m-surface-inset)]/90 border border-[var(--m-border)] text-[10px] font-mono tabular-nums text-[var(--m-text-secondary)] pointer-events-none">
          <Compass className="w-3 h-3 text-[var(--m-accent)]" />
          <span>{formatCoordinatePair(hoverCoords.lat, hoverCoords.lng, 2)}</span>
        </div>
      )}

      {/* Radar Time-Lapse Playback Control directly on the map surface */}
      {effectiveShowTimeLapse && timeLapseFrames && timeLapseFrames.length > 0 && (
        <div
          id="mausam-map-time-lapse-overlay"
          className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[580px] md:w-[680px] max-w-[calc(100vw-24px)] z-[410] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <RadarTimeLapseController
            frames={timeLapseFrames}
            activeFrameIndex={activeFrameIndex ?? timeLapseFrames.length - 1}
            onChangeFrame={onChangeFrame ?? (() => {})}
            onReset={onResetPlayback}
            isPlaying={isPlaying ?? false}
            onTogglePlay={onTogglePlay ?? (() => {})}
            playbackSpeed={playbackSpeed ?? 1}
            onChangeSpeed={onChangeSpeed ?? (() => {})}
            loop={loop ?? true}
            onToggleLoop={onToggleLoop}
            timeSpan={timeSpan}
            onChangeTimeSpan={onChangeTimeSpan}
            motionVector={motionVector}
            dataStatus={dataStatus}
            isFrameLoading={isRadarTileLoading}
            isCollapsible={true}
          />
        </div>
      )}

      {isPrecipFiltered && (
        <div className="absolute top-14 right-3 z-[415] bg-[var(--m-surface-inset)]/95 border border-[#F59E0B]/70 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-xs font-mono text-[var(--m-text-primary)] flex items-center gap-2 pointer-events-auto">
          <span className="text-[#FCD34D] font-bold text-[10px] uppercase">
            FILTER: {effectivePrecipLevels.length}/6 ON
          </span>
          <button
            type="button"
            onClick={() => handlePrecipLevelsChange(ALL_PRECIP_LEVEL_IDS)}
            className="text-[10px] text-[var(--m-accent)] hover:text-white underline font-sans cursor-pointer font-bold"
          >
            Reset
          </button>
        </div>
      )}

      <style>{`
        .radar-tile-layer img {
          transition: filter 0.25s ease, opacity 0.25s ease;
        }
        .radar-filter-zero img { opacity: 0 !important; }
        .radar-filter-heavy-plus img {
          filter: contrast(220%) saturate(190%) brightness(110%) drop-shadow(0 0 6px rgba(239,68,68,0.5));
        }
        .radar-filter-mod-plus img { filter: contrast(165%) saturate(160%) brightness(105%); }
        .radar-filter-trace-only img { filter: contrast(135%) saturate(135%) hue-rotate(170deg); }
        .radar-filter-custom img { filter: contrast(145%) saturate(150%); }
        .mausam-osm-dark-tiles { filter: invert(92%) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.75); }
      `}</style>

      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={1}
        maxZoom={18}
        worldCopyJump={true}
        zoomControl={false}
        scrollWheelZoom={!isLocked}
        className="w-full h-full"
        style={{ background: activeBasemap.isLightSurface ? '#E5E7EB' : '#0B1219' }}
      >
        <MapResizeFix />
        <MapClickHandler
          isLocked={isLocked}
          onMapClick={onMapClick}
          onHoverCoords={setHoverCoords}
        />
        <MapController
          center={center}
          zoom={zoom}
          onControlsReady={onControlsReady}
          isLocked={isLocked}
          onToggleLock={onToggleLock}
        />
        <MapInteractionLockController isLocked={isLocked} />

        {/* Verified Zero-Key Cartographic Basemap with Automatic OSM Failover */}
        <TileLayer
          key={`basemap-${activeBasemap.id}-${activeBasemap.styleId}`}
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
            key={`basemap-ref-${activeBasemap.id}`}
            url={activeBasemap.referenceUrl}
            maxZoom={activeBasemap.maxZoom}
            opacity={0.85}
            zIndex={200}
          />
        )}

        {/* Real RainViewer Doppler Radar Tile Overlay in Radar Mode */}
        {viewMode === 'radar' && radarTileUrl && (
          <TileLayer
            key={`radar-tile-${radarTileUrl}-${effectivePrecipLevels.join(',')}`}
            url={radarTileUrl}
            opacity={computedTileOpacity}
            zIndex={300}
            maxNativeZoom={7}
            maxZoom={18}
            className={`radar-tile-layer ${computedTileFilterClass}`}
            attribution="Weather radar data &copy; RainViewer"
            eventHandlers={{
              loading: () => setIsRadarTileLoading(true),
              load: () => {
                setIsRadarTileLoading(false);
                setRadarTileError(null);
              },
              tileerror: () => {
                setIsRadarTileLoading(false);
                setRadarTileError('Some radar tiles failed to load from upstream RainViewer.');
              },
            }}
          />
        )}

        {/* Radar Station Range Perimeter & Station Markers */}
        {viewMode === 'radar' && (
          <>
            {selectedStation && (
              <Circle
                center={[selectedStation.latitude, selectedStation.longitude]}
                radius={selectedStation.maxRangeKm * 1000}
                pathOptions={{
                  color: '#C5A46D',
                  fillColor: '#C5A46D',
                  fillOpacity: 0.08,
                  weight: 1.8,
                  dashArray: '4, 4',
                }}
              >
                <Tooltip direction="top" offset={[0, -20]} opacity={0.9} permanent={false}>
                  <div className="text-xs font-sans text-white p-1">
                    <span className="font-bold">{selectedStation.name}</span>
                    <br />
                    <span>Surveillance Coverage Radius: {selectedStation.maxRangeKm} km</span>
                  </div>
                </Tooltip>
              </Circle>
            )}

            {OFFICIAL_RADAR_STATIONS.map((station) => {
              const isSelected = selectedStation?.id === station.id;
              return (
                <Marker
                  key={station.id}
                  position={[station.latitude, station.longitude]}
                  icon={createRadarStationIcon(station, isSelected)}
                  eventHandlers={{
                    click: () => onSelectStation?.(station),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                    <div className="text-xs font-sans text-white py-0.5 px-1 font-semibold">
                      <span>{station.name}</span>
                      <span className="text-[var(--m-accent)] ml-1">({station.id})</span>
                      <div className="text-[10px] text-[var(--m-text-secondary)] font-normal">
                        {station.band} · Max Range: {station.maxRangeKm} km
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
          </>
        )}

        {/* Synoptic State Observations */}
        {viewMode === 'synoptic' && (
          <>
            {INDIA_WEATHER_DATA.map((state) => {
              const coords = STATE_COORDINATES[state.name.toLowerCase()];
              if (!coords) return null;
              const isSelected =
                selectedState?.toLowerCase() === state.name.toLowerCase() ||
                selectedState?.toLowerCase() === state.id.toLowerCase();

              return (
                <Marker
                  key={state.id}
                  position={[coords.lat, coords.lng]}
                  icon={createStateMarkerIcon(state, isSelected)}
                  eventHandlers={{
                    click: () => onSelectState?.(state),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.96}>
                    <div className="text-xs font-sans text-white p-1 min-w-[170px]">
                      <div className="font-bold border-b border-[var(--m-border)] pb-0.5 mb-1 text-[var(--m-text-primary)] flex items-center justify-between gap-2">
                        <span>{state.name}</span>
                        <span className="text-[10px] font-mono text-[var(--m-accent)]">{coords.code}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 text-[11px] text-[var(--m-text-secondary)] font-mono tabular-nums">
                        <span>Temp: <strong className="text-white">{state.temperature ?? '—'}°C</strong></span>
                        <span>Rain: <strong className="text-white">{state.rainfall ?? '—'} mm</strong></span>
                        <span>Wind: <strong className="text-white">{state.windSpeed ?? '—'} km/h</strong></span>
                        <span>RH: <strong className="text-white">{state.humidity ?? '—'}%</strong></span>
                      </div>
                      <div className="mt-1 pt-1 border-t border-white/10 text-[10px] font-mono flex items-center justify-between">
                        <span className="text-[var(--m-text-muted)]">NAQI:</span>
                        <strong className="text-white">
                          {state.aqi ?? '—'} ({getAqiCategoryLabel(state.aqi)})
                        </strong>
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
          </>
        )}

        {/* User GPS location marker */}
        {userCoords && (
          <Marker
            position={[userCoords.lat, userCoords.lng]}
            icon={L.divIcon({
              className: 'custom-user-marker',
              html: `
                <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
                  <div class="absolute w-6 h-6 rounded-full bg-[#22C7A0]/25 border border-[#22C7A0]/60"></div>
                  <div class="w-3.5 h-3.5 rounded-full bg-[#22C7A0] border-2 border-white shadow-lg"></div>
                </div>
              `,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Tooltip direction="top">
              <span className="text-xs font-bold text-white">Your Current Position</span>
            </Tooltip>
          </Marker>
        )}

        {/* Custom inspected coordinate pin */}
        {inspectedCoords && (
          <Marker
            position={[inspectedCoords.lat, inspectedCoords.lng]}
            icon={L.divIcon({
              className: 'custom-inspect-marker',
              html: `
                <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
                  <div class="w-6 h-6 rounded-full border-2 border-[var(--m-accent)] bg-[#0B1219]/60 flex items-center justify-center shadow-lg">
                    <div class="w-2 h-2 rounded-full bg-[var(--m-accent)]"></div>
                  </div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <span className="text-[11px] font-mono text-white">
                {formatCoordinatePair(inspectedCoords.lat, inspectedCoords.lng, 3)}
              </span>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MausamMap;
