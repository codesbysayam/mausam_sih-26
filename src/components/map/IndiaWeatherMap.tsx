import React, { useMemo, useState, useEffect, useRef } from 'react';
import India from '@svg-maps/india';
import {
  Map as MapIcon,
  Globe,
  Compass,
  Lock,
  Unlock,
  Plus,
  Minus,
  RotateCcw,
  Tag,
  MapPin,
  Maximize2,
  Minimize2,
  Thermometer,
  CloudRain,
  Wind,
  Droplets,
  Gauge,
  AlertTriangle,
  ExternalLink,
  Crosshair,
  BarChart3,
  Copy,
  Check,
  MousePointerClick,
} from 'lucide-react';
import { WeatherMapMetric, MapLayerControl } from './MapLayerControl';
import { MapLegend } from './MapLegend';
import { INDIA_WEATHER_DATA } from '../../data/indiaWeatherData';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
} from '../ui/ObservatoryPrimitives';

export interface StateWeatherData {
  id: string;
  name: string;
  temperature?: number;
  humidity?: number;
  aqi?: number;
  pollen?: number;
  rainfall?: number;
  condition?: string;
  city?: string;
  updatedAt?: string;
  pressure?: number;
  windSpeed?: number;
  windDir?: string;
  warningLevel?: 'normal' | 'watch' | 'alert' | 'severe';
  warningMessage?: string;
  dataSource?: string;
  dewPoint?: number;
  cloudCover?: number;
  tempMin?: number;
  tempMax?: number;
  pm25?: number;
  pm10?: number;
}

interface IndiaWeatherMapProps {
  data?: StateWeatherData[];
  metric?: WeatherMapMetric | string;
  onMetricChange?: (metric: WeatherMapMetric) => void;
  selectedState?: string | null;
  onStateSelect?: (state: StateWeatherData) => void;
  onSelectState?: (state: StateWeatherData) => void;
}

const MAP_THEME = {
  defaultState: '#202424',
  hoverState: '#C5A46D',
  defaultStroke: 'rgba(197, 164, 109, 0.32)',
};

export type IndiaRegion = 'all' | 'north' | 'east' | 'west' | 'south' | 'central' | 'northeast';

const REGIONS: { id: IndiaRegion; label: string; stateIds: string[] }[] = [
  { id: 'all', label: 'All India', stateIds: [] },
  { id: 'north', label: 'North', stateIds: ['in-dl', 'in-pb', 'in-hr', 'in-rj', 'in-up', 'in-hp', 'in-jk', 'in-la', 'in-uk', 'in-ch'] },
  { id: 'east', label: 'East', stateIds: ['in-od', 'in-wb', 'in-br', 'in-jh'] },
  { id: 'west', label: 'West', stateIds: ['in-mh', 'in-gj', 'in-ga', 'in-dn'] },
  { id: 'south', label: 'South', stateIds: ['in-ka', 'in-tn', 'in-kl', 'in-ap', 'in-ts', 'in-py', 'in-ld', 'in-an'] },
  { id: 'central', label: 'Central', stateIds: ['in-mp', 'in-cg'] },
  { id: 'northeast', label: 'North-East', stateIds: ['in-as', 'in-ar', 'in-mn', 'in-ml', 'in-mz', 'in-nl', 'in-sk', 'in-tr'] },
];

const MAJOR_CENTROIDS: Record<string, { x: number; y: number; city: string }> = {
  'in-dl': { x: 232, y: 228, city: 'Delhi' },
  'in-od': { x: 382, y: 395, city: 'Bhubaneswar' },
  'in-wb': { x: 440, y: 360, city: 'Kolkata' },
  'in-mh': { x: 220, y: 410, city: 'Mumbai' },
  'in-ka': { x: 230, y: 530, city: 'Bengaluru' },
  'in-tn': { x: 270, y: 590, city: 'Chennai' },
  'in-ts': { x: 280, y: 440, city: 'Hyderabad' },
  'in-ap': { x: 290, y: 490, city: 'Amaravati' },
  'in-rj': { x: 175, y: 250, city: 'Jaipur' },
  'in-gj': { x: 140, y: 330, city: 'Gandhinagar' },
  'in-up': { x: 310, y: 260, city: 'Lucknow' },
  'in-br': { x: 390, y: 280, city: 'Patna' },
  'in-mp': { x: 260, y: 340, city: 'Bhopal' },
  'in-pb': { x: 195, y: 175, city: 'Chandigarh' },
  'in-hr': { x: 215, y: 205, city: 'Gurugram' },
  'in-hp': { x: 230, y: 150, city: 'Shimla' },
  'in-jk': { x: 200, y: 100, city: 'Srinagar' },
  'in-la': { x: 260, y: 80, city: 'Leh' },
  'in-uk': { x: 265, y: 190, city: 'Dehradun' },
  'in-as': { x: 510, y: 275, city: 'Guwahati' },
  'in-kl': { x: 225, y: 615, city: 'Thiruvananthapuram' },
  'in-cg': { x: 330, y: 380, city: 'Raipur' },
  'in-jh': { x: 380, y: 330, city: 'Ranchi' },
  'in-ga': { x: 180, y: 495, city: 'Panaji' },
};

export function normalizeMetric(m?: string): WeatherMapMetric {
  if (!m) return 'temperature';
  const lower = m.toLowerCase();
  if (lower.includes('temp')) return 'temperature';
  if (lower.includes('rain')) return 'rainfall';
  if (lower.includes('aqi') || lower.includes('air')) return 'aqi';
  if (lower.includes('humid') || lower.includes('rh')) return 'humidity';
  if (lower.includes('wind')) return 'wind';
  if (lower.includes('warn')) return 'warnings';
  return 'temperature';
}

function getMetricValue(state: StateWeatherData, metric: WeatherMapMetric): number | undefined {
  switch (metric) {
    case 'temperature':
      return state.temperature;
    case 'humidity':
      return state.humidity;
    case 'aqi':
      return state.aqi;
    case 'wind':
      return state.windSpeed;
    case 'rainfall':
      return state.rainfall;
    case 'warnings':
      return state.warningLevel === 'severe'
        ? 4
        : state.warningLevel === 'alert'
        ? 3
        : state.warningLevel === 'watch'
        ? 2
        : 1;
    default:
      return undefined;
  }
}

function getTemperatureColor(value?: number) {
  if (value === undefined) return MAP_THEME.defaultState;
  if (value <= 15) return '#91B6CC';
  if (value <= 22) return '#78AEB6';
  if (value <= 26) return '#5C9A79';
  if (value <= 30) return '#E6B96B';
  if (value <= 34) return '#D98548';
  return '#C94F4B';
}

function getAQIColor(value?: number) {
  if (value === undefined) return MAP_THEME.defaultState;
  if (value <= 50) return '#5C9A79';
  if (value <= 100) return '#89977B';
  if (value <= 200) return '#D8B14F';
  if (value <= 300) return '#D98548';
  if (value <= 400) return '#C94F4B';
  return '#8B2635';
}

function getHumidityColor(value?: number) {
  if (value === undefined) return MAP_THEME.defaultState;
  if (value < 40) return '#D98548';
  if (value < 55) return '#E6B96B';
  if (value < 70) return '#89977B';
  if (value < 85) return '#A7C5C5';
  return '#78AEB6';
}

function getRainfallColor(value?: number) {
  if (value === undefined) return MAP_THEME.defaultState;
  if (value === 0) return '#202424';
  if (value < 5) return '#A7C5C5';
  if (value < 15) return '#78AEB6';
  if (value < 30) return '#5C9A79';
  return '#D8B14F';
}

function getWindColor(value?: number) {
  if (value === undefined) return MAP_THEME.defaultState;
  if (value <= 10) return '#A7C5C5';
  if (value <= 20) return '#9CAF9A';
  if (value <= 35) return '#E6B96B';
  if (value <= 50) return '#D98548';
  return '#C94F4B';
}

function getWarningColor(level?: string) {
  if (!level) return '#5C9A79';
  switch (level.toLowerCase()) {
    case 'severe':
      return '#C94F4B';
    case 'alert':
      return '#D98548';
    case 'watch':
      return '#D8B14F';
    case 'normal':
    default:
      return '#5C9A79';
  }
}

function getStateColor(state: StateWeatherData, metric: WeatherMapMetric): string {
  if (metric === 'warnings') {
    return getWarningColor(state.warningLevel);
  }
  const value = getMetricValue(state, metric);
  switch (metric) {
    case 'temperature':
      return getTemperatureColor(value);
    case 'aqi':
      return getAQIColor(value);
    case 'humidity':
      return getHumidityColor(value);
    case 'rainfall':
      return getRainfallColor(value);
    case 'wind':
      return getWindColor(value);
    default:
      return MAP_THEME.defaultState;
  }
}

const STATE_ALIAS_MAP: Record<string, string> = {
  an: 'in-an',
  ap: 'in-ap',
  ar: 'in-ar',
  as: 'in-as',
  br: 'in-br',
  ch: 'in-ch',
  ct: 'in-cg',
  cg: 'in-cg',
  dn: 'in-dn',
  dd: 'in-dn',
  dl: 'in-dl',
  ga: 'in-ga',
  gj: 'in-gj',
  hr: 'in-hr',
  hp: 'in-hp',
  jk: 'in-jk',
  jh: 'in-jh',
  ka: 'in-ka',
  kl: 'in-kl',
  la: 'in-la',
  ld: 'in-ld',
  mp: 'in-mp',
  mh: 'in-mh',
  mn: 'in-mn',
  ml: 'in-ml',
  mz: 'in-mz',
  nl: 'in-nl',
  or: 'in-od',
  od: 'in-od',
  py: 'in-py',
  pb: 'in-pb',
  rj: 'in-rj',
  sk: 'in-sk',
  tn: 'in-tn',
  tg: 'in-ts',
  ts: 'in-ts',
  tr: 'in-tr',
  up: 'in-up',
  ut: 'in-uk',
  uk: 'in-uk',
  wb: 'in-wb',
  orissa: 'in-od',
  odisha: 'in-od',
  chhattisgarh: 'in-cg',
  telangana: 'in-ts',
  uttarakhand: 'in-uk',
  uttaranchal: 'in-uk',
  'dadra and nagar haveli': 'in-dn',
  'daman and diu': 'in-dn',
  'dadra and nagar haveli and daman and diu': 'in-dn',
  'andaman and nicobar islands': 'in-an',
  'jammu and kashmir': 'in-jk',
  ladakh: 'in-la',
  pondicherry: 'in-py',
  puducherry: 'in-py',
  delhi: 'in-dl',
  'national capital territory of delhi': 'in-dl',
};

export const IndiaWeatherMap: React.FC<IndiaWeatherMapProps> = ({
  data = INDIA_WEATHER_DATA,
  metric: controlledMetric,
  onMetricChange,
  selectedState: controlledSelectedState,
  onStateSelect,
  onSelectState,
}) => {
  const handleSelectCallback = onStateSelect || onSelectState;

  const [internalMetric, setInternalMetric] = useState<WeatherMapMetric>(() =>
    normalizeMetric(controlledMetric || 'temperature')
  );

  useEffect(() => {
    if (controlledMetric) {
      setInternalMetric(normalizeMetric(controlledMetric));
    }
  }, [controlledMetric]);

  const activeMetric: WeatherMapMetric = internalMetric;

  const handleMetricChange = (newMetric: WeatherMapMetric) => {
    setInternalMetric(newMetric);
    if (onMetricChange) {
      onMetricChange(newMetric);
    }
  };

  const [hoveredState, setHoveredState] = useState<StateWeatherData | null>(null);
  const [internalSelectedState, setInternalSelectedState] = useState<string>('Odisha');
  const [activeRegion, setActiveRegion] = useState<IndiaRegion>('all');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showStationPins, setShowStationPins] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isStationSaved, setIsStationSaved] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMapLocked, setIsMapLocked] = useState<boolean>(false);

  const mapSvgRef = useRef<SVGSVGElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (mapContainerRef.current?.requestFullscreen) {
        await mapContainerRef.current.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (controlledSelectedState) {
      setInternalSelectedState(controlledSelectedState);
    }
  }, [controlledSelectedState]);

  const stateMap = useMemo(() => {
    const map = new Map<string, StateWeatherData>();
    const safeData = data && data.length > 0 ? data : INDIA_WEATHER_DATA;

    safeData.forEach((s) => {
      const lowerId = s.id.toLowerCase();
      const lowerName = s.name.toLowerCase();
      const cleanId = lowerId.replace('in-', '');

      map.set(lowerId, s);
      map.set(lowerName, s);
      map.set(cleanId, s);

      if (lowerName.includes('odisha') || lowerName.includes('orissa')) {
        map.set('or', s);
        map.set('od', s);
        map.set('orissa', s);
      }
      if (lowerName.includes('chhattisgarh')) {
        map.set('ct', s);
        map.set('cg', s);
      }
      if (lowerName.includes('telangana')) {
        map.set('tg', s);
        map.set('ts', s);
      }
      if (lowerName.includes('uttarakhand') || lowerName.includes('uttaranchal')) {
        map.set('ut', s);
        map.set('uk', s);
      }
      if (lowerName.includes('dadra') || lowerName.includes('daman')) {
        map.set('dn', s);
        map.set('dd', s);
      }
      if (lowerName.includes('andaman')) map.set('an', s);
      if (lowerName.includes('puducherry') || lowerName.includes('pondicherry')) map.set('py', s);
      if (lowerName.includes('delhi')) map.set('dl', s);
    });

    return map;
  }, [data]);

  const findStateData = (location: any): StateWeatherData => {
    const rawId = (location.id || '').toLowerCase();
    const rawName = (location.name || '').toLowerCase();

    if (stateMap.has(rawId)) return stateMap.get(rawId)!;
    if (stateMap.has(rawName)) return stateMap.get(rawName)!;

    const aliasTarget = STATE_ALIAS_MAP[rawId] || STATE_ALIAS_MAP[rawName];
    if (aliasTarget && stateMap.has(aliasTarget)) {
      return stateMap.get(aliasTarget)!;
    }

    for (const [key, val] of stateMap.entries()) {
      if (rawName.includes(key) || key.includes(rawName)) {
        return val;
      }
    }

    return {
      id: location.id || 'IN-UNMAPPED',
      name: location.name || 'Unmapped State',
      condition: 'Unavailable',
    };
  };

  const isStateSelected = (location: any) => {
    const currentSelection = (controlledSelectedState || internalSelectedState || 'Odisha').toLowerCase().trim();
    const sId = (location.id || '').toLowerCase();
    const sName = (location.name || '').toLowerCase();
    const cleanId = sId.replace('in-', '');

    const targetAlias = STATE_ALIAS_MAP[currentSelection] || currentSelection;
    const locAlias = STATE_ALIAS_MAP[sId] || STATE_ALIAS_MAP[sName] || sId;

    return (
      currentSelection === sId ||
      currentSelection === sName ||
      currentSelection === cleanId ||
      targetAlias === locAlias ||
      sName.includes(currentSelection) ||
      currentSelection.includes(sName)
    );
  };

  const isStateInActiveRegion = (location: any) => {
    if (activeRegion === 'all') return true;
    const sId = (location.id || '').toLowerCase();
    const canonicalId = STATE_ALIAS_MAP[sId] || sId;
    const regionObj = REGIONS.find((r) => r.id === activeRegion);
    if (!regionObj) return true;
    return regionObj.stateIds.includes(canonicalId);
  };

  const activeObservationState = useMemo<StateWeatherData>(() => {
    if (hoveredState) return hoveredState;

    const currentSelection = (controlledSelectedState || internalSelectedState || 'Odisha').toLowerCase().trim();
    const targetAlias = STATE_ALIAS_MAP[currentSelection] || currentSelection;

    if (stateMap.has(currentSelection)) return stateMap.get(currentSelection)!;
    if (stateMap.has(targetAlias)) return stateMap.get(targetAlias)!;

    for (const [key, val] of stateMap.entries()) {
      if (key.includes(currentSelection) || currentSelection.includes(key)) {
        return val;
      }
    }

    return stateMap.get('odisha') || stateMap.get('in-od') || INDIA_WEATHER_DATA[0];
  }, [hoveredState, controlledSelectedState, internalSelectedState, stateMap]);

  const handleStateClick = (stateData: StateWeatherData) => {
    setInternalSelectedState(stateData.name);
    if (handleSelectCallback) {
      handleSelectCallback(stateData);
    }
  };

  const handleSetStationClick = () => {
    setIsStationSaved(true);
    if (handleSelectCallback) {
      handleSelectCallback(activeObservationState);
    }
    setTimeout(() => setIsStationSaved(false), 2500);
  };

  const handleCopyTelemetry = () => {
    const text =
      `IMD REFERENCE OBSERVATION — ${activeObservationState.name} (${activeObservationState.city || 'Regional Center'})\n` +
      `• Temperature: ${activeObservationState.temperature !== undefined ? `${activeObservationState.temperature}°C` : '—'}\n` +
      `• 24h Rainfall: ${activeObservationState.rainfall !== undefined ? `${activeObservationState.rainfall} mm` : '—'}\n` +
      `• Air Quality (NAQI): ${activeObservationState.aqi !== undefined ? `${activeObservationState.aqi} AQI` : '—'}\n` +
      `• Relative Humidity: ${activeObservationState.humidity !== undefined ? `${activeObservationState.humidity}%` : '—'}\n` +
      `• Condition: ${activeObservationState.condition || '—'}\n` +
      `• Source: ${activeObservationState.dataSource || 'IMD Reference Dataset'}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

  const handleZoomIn = () => {
    if (isMapLocked) return;
    setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  };
  const handleZoomOut = () => {
    if (isMapLocked) return;
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  };
  const handleResetZoom = () => {
    if (isMapLocked) return;
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setActiveRegion('all');
  };

  const handleRegionClick = (regionId: IndiaRegion) => {
    setActiveRegion(regionId);
    if (regionId === 'all') {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    const reg = REGIONS.find((r) => r.id === regionId);
    if (reg && reg.stateIds.length > 0) {
      const firstStateId = reg.stateIds[0];
      const found = stateMap.get(firstStateId);
      if (found) {
        setInternalSelectedState(found.name);
      }
      setZoomLevel(1.3);
      if (regionId === 'north') setPanOffset({ x: 0, y: 60 });
      if (regionId === 'south') setPanOffset({ x: 0, y: -80 });
      if (regionId === 'east') setPanOffset({ x: -60, y: -20 });
      if (regionId === 'west') setPanOffset({ x: 70, y: 0 });
      if (regionId === 'northeast') setPanOffset({ x: -110, y: 40 });
      if (regionId === 'central') setPanOffset({ x: -20, y: 0 });
    }
  };

  const getMetricBadge = (
    state: StateWeatherData,
    m: WeatherMapMetric
  ): { label: string; badgeClass: string } => {
    switch (m) {
      case 'temperature': {
        const val = state.temperature;
        if (val === undefined) return { label: 'Unavailable', badgeClass: 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]' };
        if (val >= 35) return { label: 'Heatwave Alert', badgeClass: 'bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/40' };
        if (val >= 31) return { label: 'Hot', badgeClass: 'bg-[#F97316]/15 text-[#FDBA74] border-[#F97316]/40' };
        if (val >= 27) return { label: 'Warm', badgeClass: 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40' };
        if (val >= 23) return { label: 'Optimal', badgeClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35' };
        return { label: 'Cool', badgeClass: 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35' };
      }
      case 'rainfall': {
        const val = state.rainfall;
        if (val === undefined) return { label: 'Unavailable', badgeClass: 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]' };
        if (val >= 30) return { label: 'Very Heavy Rain', badgeClass: 'bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/40' };
        if (val >= 15) return { label: 'Heavy Rain', badgeClass: 'bg-[#F97316]/15 text-[#FDBA74] border-[#F97316]/40' };
        if (val >= 5) return { label: 'Moderate Rain', badgeClass: 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40' };
        if (val > 0) return { label: 'Light Showers', badgeClass: 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35' };
        return { label: 'Dry (0 mm)', badgeClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35' };
      }
      case 'aqi': {
        const val = state.aqi;
        if (val === undefined) return { label: 'Unavailable', badgeClass: 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]' };
        if (val > 300) return { label: 'Severe AQI', badgeClass: 'bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/40' };
        if (val > 200) return { label: 'Poor AQI', badgeClass: 'bg-[#F97316]/15 text-[#FDBA74] border-[#F97316]/40' };
        if (val > 100) return { label: 'Moderate', badgeClass: 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40' };
        if (val > 50) return { label: 'Satisfactory', badgeClass: 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35' };
        return { label: 'Good AQI', badgeClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35' };
      }
      case 'humidity': {
        const val = state.humidity;
        if (val === undefined) return { label: 'Unavailable', badgeClass: 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]' };
        if (val > 80) return { label: 'Very Humid', badgeClass: 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40' };
        if (val < 40) return { label: 'Dry Air', badgeClass: 'bg-[#F97316]/15 text-[#FDBA74] border-[#F97316]/40' };
        return { label: 'Comfortable', badgeClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35' };
      }
      case 'wind': {
        const val = state.windSpeed;
        if (val === undefined) return { label: 'Unavailable', badgeClass: 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]' };
        if (val > 45) return { label: 'Gale / Storm', badgeClass: 'bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/40' };
        if (val > 25) return { label: 'Squally Winds', badgeClass: 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40' };
        return { label: 'Moderate Breeze', badgeClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35' };
      }
      case 'warnings': {
        const val = state.warningLevel || 'normal';
        if (val === 'severe') return { label: 'Red Alert', badgeClass: 'bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/40' };
        if (val === 'alert') return { label: 'Orange Alert', badgeClass: 'bg-[#F97316]/15 text-[#FDBA74] border-[#F97316]/40' };
        if (val === 'watch') return { label: 'Yellow Watch', badgeClass: 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40' };
        return { label: 'Routine Normal', badgeClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35' };
      }
    }
  };

  const metricBadge = getMetricBadge(activeObservationState, activeMetric);

  const renderMetricIcon = (m: WeatherMapMetric) => {
    switch (m) {
      case 'temperature':
        return <Thermometer className="w-5 h-5" />;
      case 'rainfall':
        return <CloudRain className="w-5 h-5" />;
      case 'aqi':
        return <Gauge className="w-5 h-5" />;
      case 'humidity':
        return <Droplets className="w-5 h-5" />;
      case 'wind':
        return <Wind className="w-5 h-5" />;
      case 'warnings':
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const renderActiveMetricValue = () => {
    switch (activeMetric) {
      case 'temperature':
        return activeObservationState.temperature !== undefined
          ? `${activeObservationState.temperature}°C (${Math.round(activeObservationState.temperature * 1.8 + 32)}°F)`
          : '—';
      case 'rainfall':
        return activeObservationState.rainfall !== undefined
          ? `${activeObservationState.rainfall} mm`
          : '—';
      case 'aqi':
        return activeObservationState.aqi !== undefined
          ? `${activeObservationState.aqi} AQI`
          : '—';
      case 'humidity':
        return activeObservationState.humidity !== undefined
          ? `${activeObservationState.humidity}% RH`
          : '—';
      case 'wind':
        return activeObservationState.windSpeed !== undefined
          ? `${activeObservationState.windSpeed} km/h ${activeObservationState.windDir ? `(${activeObservationState.windDir})` : ''}`
          : '—';
      case 'warnings':
        return `${(activeObservationState.warningLevel || 'NORMAL').toUpperCase()} ALERT`;
    }
  };

  return (
    <DataPanel id="national-synoptic-meteorological-map-card" className="flex flex-col gap-4">
      {/* Header with Title and Layer Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <SectionHeading
          title="National Synoptic Meteorological Map"
          subtitle="All-India State & Union Territory observational reference layers"
          icon={<MapIcon className="w-4 h-4" />}
          badge={<SourceStatus status="REFERENCE" labelOverride="IMD REFERENCE LAYER" />}
          className="border-b-0 pb-0"
        />

        <MapLayerControl
          activeMetric={activeMetric}
          onMetricChange={handleMetricChange}
        />
      </div>

      <div className="border-t border-[var(--m-border)]" />

      {/* Regional Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-xl">
        <div className="flex items-center gap-1.5 text-xs text-[var(--m-text-muted)] font-mono">
          <Compass className="w-4 h-4 text-[var(--m-accent)]" />
          <span className="font-semibold text-[var(--m-text-primary)] uppercase text-[11px]">Subdivision Focus</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {REGIONS.map((reg) => {
            const isRegActive = activeRegion === reg.id;
            return (
              <button
                key={reg.id}
                id={`btn-region-filter-${reg.id}`}
                type="button"
                onClick={() => handleRegionClick(reg.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer m-focus-ring border ${
                  isRegActive
                    ? 'bg-[var(--m-accent)] border-[var(--m-accent)]/50 text-[var(--m-on-accent)]'
                    : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                {reg.id === 'all' && <Globe className="w-3.5 h-3.5" />}
                <span>{reg.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="synoptic-state-select" className="text-[11px] font-mono text-[var(--m-text-muted)] hidden sm:inline">
            Jump to State
          </label>
          <select
            id="synoptic-state-select"
            value={activeObservationState.name}
            onChange={(e) => {
              const matched =
                stateMap.get(e.target.value.toLowerCase()) ||
                INDIA_WEATHER_DATA.find((s) => s.name === e.target.value);
              if (matched) handleStateClick(matched);
            }}
            className="min-h-[38px] bg-[var(--m-surface-inset)] text-[var(--m-text-primary)] text-xs font-mono border border-[var(--m-border)] rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--m-accent)] cursor-pointer"
          >
            {INDIA_WEATHER_DATA.map((st) => (
              <option key={st.id} value={st.name}>
                {st.name} ({st.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* SVG India Map Visualizer Canvas */}
        <div
          ref={mapContainerRef}
          className={`lg:col-span-2 relative bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-xl p-4 flex flex-col items-center justify-center min-h-[460px] overflow-hidden ${
            isFullscreen ? 'w-screen h-screen fixed inset-0 z-50 p-6 rounded-none' : ''
          }`}
        >
          {/* Active Layer Badge */}
          <div className="absolute top-3 left-3 bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] px-2.5 py-1 rounded-lg text-xs flex items-center gap-2 z-10">
            <span className="text-[var(--m-text-muted)] font-mono text-[10px] uppercase">Layer:</span>
            <strong className="text-[var(--m-accent)] uppercase font-mono text-[11px]">
              {activeMetric}
            </strong>
          </div>

          {/* Map Viewport & Overlay Action Buttons */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
            <div className="bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] rounded-lg p-1 flex flex-col gap-1">
              <button
                id="btn-toggle-map-lock"
                type="button"
                title={isMapLocked ? 'Unlock panning & zooming' : 'Lock view to current sector'}
                aria-label={isMapLocked ? 'Unlock map panning and zooming' : 'Lock map to current sector'}
                aria-pressed={isMapLocked}
                onClick={() => setIsMapLocked(!isMapLocked)}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                  isMapLocked
                    ? 'bg-[#F59E0B] text-[var(--m-on-accent)]'
                    : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                {isMapLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>

              <button
                id="btn-map-zoom-in"
                type="button"
                title={isMapLocked ? 'Unlock map to zoom' : 'Zoom In'}
                disabled={isMapLocked}
                onClick={handleZoomIn}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  isMapLocked
                    ? 'bg-[var(--m-surface-inset)]/50 text-[var(--m-text-muted)]/40 cursor-not-allowed'
                    : 'bg-[var(--m-surface-inset)] hover:bg-[var(--m-accent-hover)] text-[var(--m-text-primary)] cursor-pointer'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                id="btn-map-zoom-out"
                type="button"
                title={isMapLocked ? 'Unlock map to zoom' : 'Zoom Out'}
                disabled={isMapLocked}
                onClick={handleZoomOut}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  isMapLocked
                    ? 'bg-[var(--m-surface-inset)]/50 text-[var(--m-text-muted)]/40 cursor-not-allowed'
                    : 'bg-[var(--m-surface-inset)] hover:bg-[var(--m-accent-hover)] text-[var(--m-text-primary)] cursor-pointer'
                }`}
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                id="btn-map-reset-zoom"
                type="button"
                title={isMapLocked ? 'Unlock map to reset' : 'Reset View'}
                disabled={isMapLocked}
                onClick={handleResetZoom}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  isMapLocked
                    ? 'bg-[var(--m-surface-inset)]/50 text-[var(--m-text-muted)]/40 cursor-not-allowed'
                    : 'bg-[var(--m-surface-inset)] hover:bg-[var(--m-accent-hover)] text-[var(--m-text-primary)] cursor-pointer'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] rounded-lg p-1 flex flex-col gap-1">
              <button
                id="btn-toggle-map-labels"
                type="button"
                title={showLabels ? 'Hide Labels' : 'Show Labels'}
                onClick={() => setShowLabels(!showLabels)}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                  showLabels ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]' : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-toggle-station-pins"
                type="button"
                title={showStationPins ? 'Hide Station Pins' : 'Show Station Pins'}
                onClick={() => setShowStationPins(!showStationPins)}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                  showStationPins ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]' : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-toggle-map-fullscreen"
                type="button"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                onClick={handleToggleFullscreen}
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                  isFullscreen ? 'bg-[#EF4444] text-white' : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* On-Map Floating Sector Lock Badge */}
          {isMapLocked && (
            <div className="absolute top-12 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[#F59E0B] text-[#FCD34D] text-[11px] font-mono">
              <Lock className="w-3.5 h-3.5" />
              <span className="font-semibold">
                LOCKED: {activeRegion !== 'all' ? `${activeRegion.toUpperCase()} SECTOR` : `${(activeObservationState?.name || 'SYNOPTIC').toUpperCase()}`}
              </span>
              <button
                type="button"
                onClick={() => setIsMapLocked(false)}
                className="text-[var(--m-text-primary)] hover:underline text-[10px] ml-1 cursor-pointer font-sans"
              >
                Unlock
              </button>
            </div>
          )}

          <div
            className="w-full flex items-center justify-center transition-transform duration-300 ease-out"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
            }}
          >
            <svg
              ref={mapSvgRef}
              xmlns="http://www.w3.org/2000/svg"
              viewBox={(India as any)?.viewBox || (India as any)?.default?.viewBox || '0 0 612 696'}
              className="w-full max-h-[460px] select-none"
              aria-label="National Meteorological Map of India"
            >
              {(Array.isArray((India as any)?.locations)
                ? (India as any).locations
                : Array.isArray((India as any)?.default?.locations)
                ? (India as any).default.locations
                : []
              ).map((loc: any) => {
                const stateData = findStateData(loc);
                const isSelected = isStateSelected(loc);
                const inRegion = isStateInActiveRegion(loc);
                const isHovered = hoveredState?.id === stateData.id || hoveredState?.name === stateData.name;
                const baseFill = getStateColor(stateData, activeMetric);
                const fillColor = inRegion ? baseFill : '#111314';

                return (
                  <path
                    key={loc.id}
                    id={`state-path-${loc.id}`}
                    name={loc.name}
                    d={loc.path}
                    fill={isHovered ? MAP_THEME.hoverState : isSelected ? '#C5A46D' : fillColor}
                    stroke={isSelected ? '#F0EEE7' : isHovered ? '#C5A46D' : inRegion ? '#2F3534' : '#191C1D'}
                    strokeWidth={isSelected ? 2.4 : isHovered ? 1.8 : 0.8}
                    opacity={inRegion ? 1 : 0.45}
                    style={{
                      cursor: 'pointer',
                      transition: 'fill 150ms ease, stroke 150ms ease, stroke-width 150ms ease, opacity 200ms ease',
                    }}
                    onMouseEnter={() => setHoveredState(stateData)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => handleStateClick(stateData)}
                  >
                    <title>
                      {stateData.name}: {stateData.temperature !== undefined ? `${stateData.temperature}°C` : '—'} | {stateData.condition || 'Reference'} | AQI {stateData.aqi ?? '—'} | Rain {stateData.rainfall !== undefined ? `${stateData.rainfall}mm` : '—'}
                    </title>
                  </path>
                );
              })}

              {showStationPins &&
                Object.entries(MAJOR_CENTROIDS).map(([stateKey, point]) => {
                  const stateData = stateMap.get(stateKey);
                  if (!stateData) return null;
                  const isSelected = isStateSelected({ id: stateKey, name: stateData.name });
                  const inRegion = isStateInActiveRegion({ id: stateKey });
                  if (!inRegion && activeRegion !== 'all') return null;

                  const metricVal = getMetricValue(stateData, activeMetric);
                  const pinColor = getStateColor(stateData, activeMetric);

                  return (
                    <g
                      key={`pin-${stateKey}`}
                      transform={`translate(${point.x}, ${point.y})`}
                      className="cursor-pointer pointer-events-auto"
                      onClick={() => handleStateClick(stateData)}
                      onMouseEnter={() => setHoveredState(stateData)}
                      onMouseLeave={() => setHoveredState(null)}
                    >
                      <circle
                        r={isSelected ? 6 : 4.5}
                        fill={pinColor}
                        stroke="#F0EEE7"
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      {showLabels && (
                        <text
                          x={7}
                          y={3}
                          fontSize="8.5"
                          fill="#F0EEE7"
                          fontWeight="bold"
                          className="select-none font-mono drop-shadow-md"
                        >
                          {point.city}{' '}
                          {metricVal !== undefined
                            ? `(${metricVal}${activeMetric === 'temperature' ? '°' : activeMetric === 'rainfall' ? 'm' : ''})`
                            : ''}
                        </text>
                      )}
                    </g>
                  );
                })}
            </svg>
          </div>

          {hoveredState && (
            <div className="absolute top-12 right-14 bg-[var(--m-surface-inset)]/95 border border-[var(--m-accent)] rounded-xl p-3 pointer-events-none text-xs z-20 min-w-[195px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--m-text-primary)] text-xs">{hoveredState.name}</span>
                <span className="text-[10px] text-[var(--m-accent)] bg-[var(--m-accent-soft)] px-1.5 py-0.5 rounded font-mono">
                  {hoveredState.condition || 'Reference'}
                </span>
              </div>
              <div className="text-[var(--m-text-muted)] text-[10px] mt-0.5">
                Center: {hoveredState.city || 'Regional Center'}
              </div>

              <div className="mt-2 pt-2 border-t border-[var(--m-border)] flex flex-col gap-1 font-mono text-[11px] tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[var(--m-text-muted)]">Temperature</span>
                  <span className="text-[var(--m-text-primary)] font-semibold">
                    {hoveredState.temperature !== undefined ? `${hoveredState.temperature}°C` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--m-text-muted)]">Air Quality</span>
                  <span className="text-[#FCD34D] font-semibold">
                    {hoveredState.aqi !== undefined ? `${hoveredState.aqi} AQI` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--m-text-muted)]">Rainfall (24h)</span>
                  <span className="text-[var(--m-accent)] font-semibold">
                    {hoveredState.rainfall !== undefined ? `${hoveredState.rainfall} mm` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--m-text-muted)]">Humidity</span>
                  <span className="text-[var(--m-text-primary)] font-semibold">
                    {hoveredState.humidity !== undefined ? `${hoveredState.humidity}%` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--m-text-muted)]">Bio-Pollen</span>
                  <span className="text-[#6EE7B7] font-semibold">
                    {hoveredState.pollen !== undefined ? `Level ${hoveredState.pollen}/5` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* State Telemetry Details Panel */}
        <div className="flex flex-col gap-3 h-full justify-between">
          <div className="m-panel-inset p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--m-border)] pb-3">
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-[var(--m-accent)] font-semibold uppercase tracking-wider block">
                  Selected State Telemetry
                </span>
                <h3 className="text-[var(--m-text-primary)] font-bold text-lg leading-tight mt-0.5 truncate">
                  {activeObservationState.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-[var(--m-text-muted)]">
                    Center: <strong className="text-[var(--m-text-primary)]">{activeObservationState.city || 'Regional'}</strong>
                  </span>
                  <span className="text-[var(--m-text-muted)]">·</span>
                  <span className="text-[#6EE7B7]">{activeObservationState.condition || 'Reference'}</span>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold uppercase tracking-wider shrink-0 ${metricBadge.badgeClass}`}
              >
                {metricBadge.label}
              </span>
            </div>

            <div className="bg-[var(--m-surface-inset)] p-3.5 rounded-lg border border-[var(--m-border)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--m-text-muted)] uppercase font-semibold block">
                  Active Metric ({activeMetric})
                </span>
                <div className="text-xl font-bold font-mono text-[var(--m-text-primary)] mt-0.5 tabular-nums">
                  {renderActiveMetricValue()}
                </div>
              </div>

              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--m-on-accent)] shrink-0"
                style={{ backgroundColor: getStateColor(activeObservationState, activeMetric) }}
              >
                {renderMetricIcon(activeMetric)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
              <button
                type="button"
                onClick={() => handleMetricChange('temperature')}
                className="text-left bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] hover:border-[var(--m-accent)] transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center text-[10px] text-[var(--m-text-muted)]">
                  <span>Temperature</span>
                  <ExternalLink className="w-3 h-3 text-[var(--m-accent)]" />
                </div>
                <span className="text-[var(--m-text-primary)] font-bold font-mono text-sm">
                  {activeObservationState.temperature !== undefined ? `${activeObservationState.temperature}°C` : '—'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleMetricChange('rainfall')}
                className="text-left bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] hover:border-[var(--m-accent)] transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center text-[10px] text-[var(--m-text-muted)]">
                  <span>Rainfall</span>
                  <ExternalLink className="w-3 h-3 text-[var(--m-accent)]" />
                </div>
                <span className="text-[var(--m-accent)] font-bold font-mono text-sm">
                  {activeObservationState.rainfall !== undefined ? `${activeObservationState.rainfall} mm` : '—'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleMetricChange('aqi')}
                className="text-left bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] hover:border-[var(--m-accent)] transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center text-[10px] text-[var(--m-text-muted)]">
                  <span>Air Quality</span>
                  <ExternalLink className="w-3 h-3 text-[#FCD34D]" />
                </div>
                <span className="text-[#FCD34D] font-bold font-mono text-sm">
                  {activeObservationState.aqi !== undefined ? `${activeObservationState.aqi} AQI` : '—'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleMetricChange('humidity')}
                className="text-left bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] hover:border-[var(--m-accent)] transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center text-[10px] text-[var(--m-text-muted)]">
                  <span>Humidity (RH)</span>
                  <ExternalLink className="w-3 h-3 text-[var(--m-accent)]" />
                </div>
                <span className="text-[var(--m-text-primary)] font-bold font-mono text-sm">
                  {activeObservationState.humidity !== undefined ? `${activeObservationState.humidity}%` : '—'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleMetricChange('wind')}
                className="text-left bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] hover:border-[var(--m-accent)] transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center text-[10px] text-[var(--m-text-muted)]">
                  <span>Wind Velocity</span>
                  <ExternalLink className="w-3 h-3 text-[var(--m-accent)]" />
                </div>
                <span className="text-[var(--m-text-primary)] font-bold font-mono text-sm">
                  {activeObservationState.windSpeed !== undefined
                    ? `${activeObservationState.windSpeed} km/h ${activeObservationState.windDir || ''}`
                    : '—'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleMetricChange('warnings')}
                className="text-left bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] hover:border-[var(--m-accent)] transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center text-[10px] text-[var(--m-text-muted)]">
                  <span>Warning Level</span>
                  <ExternalLink className="w-3 h-3 text-[#FCA5A5]" />
                </div>
                <span
                  className={`font-bold font-mono text-xs uppercase ${
                    activeObservationState.warningLevel === 'severe'
                      ? 'text-[#FCA5A5]'
                      : activeObservationState.warningLevel === 'alert'
                      ? 'text-[#FDBA74]'
                      : activeObservationState.warningLevel === 'watch'
                      ? 'text-[#FCD34D]'
                      : 'text-[#6EE7B7]'
                  }`}
                >
                  {activeObservationState.warningLevel || 'NORMAL'}
                </span>
              </button>
            </div>

            {activeObservationState.warningMessage && (
              <div className="bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] text-xs">
                <span className="text-[10px] font-mono text-[var(--m-text-muted)] uppercase font-semibold block mb-0.5">
                  Reference Note
                </span>
                <p className="text-[var(--m-text-secondary)] text-[11px] leading-relaxed">
                  {activeObservationState.warningMessage}
                </p>
              </div>
            )}

            <div className="bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] text-[11px] flex flex-col gap-1 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[var(--m-text-muted)]">Cycle Tag</span>
                <span className="text-[var(--m-accent)] font-semibold">{activeObservationState.updatedAt || 'Reference Baseline'}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[var(--m-text-muted)] shrink-0">Data Source</span>
                <span className="text-[var(--m-text-primary)] truncate" title={activeObservationState.dataSource || 'IMD Reference Dataset'}>
                  {activeObservationState.dataSource || 'IMD Reference Dataset'}
                </span>
              </div>
            </div>

            {showDiagnostics && (
              <div className="p-2.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg text-[11px] flex flex-col gap-1.5 font-mono tabular-nums">
                <div className="flex justify-between text-[var(--m-text-muted)]">
                  <span>Barometric Pressure</span>
                  <span className="text-[var(--m-text-primary)] font-semibold">
                    {activeObservationState.pressure !== undefined ? `${activeObservationState.pressure} hPa` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--m-text-muted)]">
                  <span>Dew Point</span>
                  <span className="text-[var(--m-text-primary)] font-semibold">
                    {activeObservationState.dewPoint !== undefined ? `${activeObservationState.dewPoint}°C` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--m-text-muted)]">
                  <span>PM2.5 / PM10</span>
                  <span className="text-[#FCD34D] font-semibold">
                    {activeObservationState.pm25 !== undefined || activeObservationState.pm10 !== undefined
                      ? `${activeObservationState.pm25 ?? '—'} / ${activeObservationState.pm10 ?? '—'} µg/m³`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--m-text-muted)]">
                  <span>Cloud Cover</span>
                  <span className="text-[var(--m-text-primary)] font-semibold">
                    {activeObservationState.cloudCover !== undefined ? `${activeObservationState.cloudCover}%` : '—'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5 pt-1">
              <button
                id="btn-set-active-station"
                type="button"
                onClick={handleSetStationClick}
                className={`w-full py-2 px-3 min-h-[40px] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring ${
                  isStationSaved
                    ? 'bg-[#22C7A0] text-[var(--m-on-accent)]'
                    : 'bg-[var(--m-accent)] hover:bg-[#095C96] text-[var(--m-on-accent)]'
                }`}
              >
                {isStationSaved ? <Check className="w-4 h-4" /> : <Crosshair className="w-4 h-4" />}
                <span>
                  {isStationSaved
                    ? `Station Selected (${activeObservationState.name})`
                    : `Focus ${activeObservationState.name}`}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="btn-toggle-diagnostics"
                  type="button"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="py-2 px-2.5 min-h-[38px] bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                  <span>{showDiagnostics ? 'Hide Extra' : 'Diagnostics'}</span>
                </button>

                <button
                  id="btn-copy-telemetry"
                  type="button"
                  onClick={handleCopyTelemetry}
                  className={`py-2 px-2.5 min-h-[38px] text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    isCopied
                      ? 'bg-[#22C7A0]/15 border-[#22C7A0]/45 text-[#6EE7B7]'
                      : 'bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border-[var(--m-border)]'
                  }`}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Copy Data'}</span>
                </button>
              </div>
            </div>
          </div>

          <MapLegend metric={activeMetric} />

          <div className="p-3 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-xl text-[11px] text-[var(--m-text-muted)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-[var(--m-accent)] shrink-0" />
              <span>Click any state polygon or pin to inspect regional telemetry.</span>
            </div>
            <span className="text-[10px] text-[var(--m-accent)] font-mono shrink-0">36 States/UTs</span>
          </div>
        </div>
      </div>
    </DataPanel>
  );
};

export default IndiaWeatherMap;
