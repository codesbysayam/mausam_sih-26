// ====================================================================
// MAUSAM Spatial Experience Context
// Coordinates Explore (3D), Analyze (Scientific Workstation), and
// Classic (Accessible Linear) modes with continuous location, layer,
// timeline, quality tier, 2D map fallback, and guided tour state.
// ====================================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MainNavTab } from '../components/layout/MainNavigation';
import type { FooterView } from '../components/layout/FooterNavigation';
import { safeStorageGet, safeStorageSet } from '../utils/safeStorage';
import type { GlobalMapProjection, WorldRegionKey } from '../config/globalMapConfig';

export type ExperienceMode = 'explore' | 'analyze' | 'classic';
export type SurfaceTheme = 'paper' | 'dark';
export type DisplayProfile = 'standard' | 'projector' | 'tv';

export type SpatialLayerId =
  | 'conditions'
  | 'wind'
  | 'rain'
  | 'radar'
  | 'satellite'
  | 'aqi'
  | 'warnings'
  | 'cyclones'
  | 'agromet';

export type LayerCategory =
  | 'Atmosphere'
  | 'Precipitation'
  | 'Environment'
  | 'Hazards'
  | 'Agriculture';

export type RendererMode = '3d' | '2d';
export type QualityTier = 'auto' | 'high' | 'balanced' | 'low';

export interface SpatialLayerDefinition {
  id: SpatialLayerId;
  category: LayerCategory;
  label: string;
  shortLabel: string;
  icon: string;
  unit: string;
  source: string;
  coverage: 'global' | 'regional-india';
  description: string;
  legendMin: string;
  legendMid: string;
  legendMax: string;
  gradientCss: string;
  accentHex: string;
}

export const SPATIAL_LAYERS: SpatialLayerDefinition[] = [
  {
    id: 'conditions',
    category: 'Atmosphere',
    label: 'Surface Temperature',
    shortLabel: 'Surface',
    icon: 'thermostat',
    unit: '°C',
    source: 'Open-Meteo Global Model Grid',
    coverage: 'global',
    description: '2m surface air temperature across all continents and major observatories.',
    legendMin: '-10°C',
    legendMid: '18°C',
    legendMax: '42°C',
    gradientCss: 'linear-gradient(90deg, #6086B8 0%, #89977B 42%, #E6B96B 74%, #E27B55 100%)',
    accentHex: '#E6B96B',
  },
  {
    id: 'wind',
    category: 'Atmosphere',
    label: 'Global Wind Streams',
    shortLabel: 'Wind',
    icon: 'air',
    unit: 'km/h',
    source: 'Open-Meteo Global 10m Wind Vectors',
    coverage: 'global',
    description: 'Planet-wide 10m wind streamlines & directional U/V flow across continents and oceans.',
    legendMin: '5 km/h',
    legendMid: '25 km/h',
    legendMax: '55+ km/h',
    gradientCss: 'linear-gradient(90deg, #292E2D 0%, #9CAF9A 48%, #F0EEE7 78%, #E6B96B 100%)',
    accentHex: '#9CAF9A',
  },
  {
    id: 'rain',
    category: 'Precipitation',
    label: 'Global Rainfall & Radar',
    shortLabel: 'Rain',
    icon: 'rainy',
    unit: 'mm',
    source: 'RainViewer Global Composite / Open-Meteo',
    coverage: 'global',
    description: 'Timestamped global precipitation radar echoes and rainfall accumulation.',
    legendMin: '0 mm',
    legendMid: '15 mm',
    legendMax: '40+ mm',
    gradientCss: 'linear-gradient(90deg, #202424 0%, #78AEB6 50%, #A7C5C5 78%, #E6B96B 100%)',
    accentHex: '#78AEB6',
  },
  {
    id: 'radar',
    category: 'Precipitation',
    label: 'Global Radar Composite',
    shortLabel: 'Radar',
    icon: 'radar',
    unit: 'dBZ',
    source: 'RainViewer Global Radar / IMD DWR',
    coverage: 'global',
    description: 'Multi-frame observed & nowcast radar reflectivity where radar coverage exists worldwide.',
    legendMin: 'Light',
    legendMid: 'Moderate',
    legendMax: 'Severe',
    gradientCss: 'linear-gradient(90deg, #292E2D 0%, #A7C5C5 55%, #C5A46D 100%)',
    accentHex: '#A7C5C5',
  },
  {
    id: 'satellite',
    category: 'Precipitation',
    label: 'Global Cloud Cover',
    shortLabel: 'Clouds',
    icon: 'cloud',
    unit: '% cover',
    source: 'Open-Meteo Global Cloud Analysis',
    coverage: 'global',
    description: 'Planetary tropospheric cloud deck opacity and synoptic moisture bands.',
    legendMin: '0%',
    legendMid: '50%',
    legendMax: '100%',
    gradientCss: 'linear-gradient(90deg, #191C1D 0%, #898B83 50%, #F0EEE7 100%)',
    accentHex: '#C3C9C5',
  },
  {
    id: 'aqi',
    category: 'Environment',
    label: 'Air Quality Index',
    shortLabel: 'AQI',
    icon: 'masks',
    unit: 'AQI',
    source: 'Open-Meteo Global Chemistry / CPCB India',
    coverage: 'global',
    description: 'Ambient particulate burden (PM2.5 / PM10 / US EPA AQI) globally + CPCB stations in India.',
    legendMin: 'Good (0–50)',
    legendMid: 'Mod (101–200)',
    legendMax: 'Poor (201+)',
    gradientCss: 'linear-gradient(90deg, #5C9A79 0%, #D8B14F 45%, #D98548 72%, #C94F4B 100%)',
    accentHex: '#5C9A79',
  },
  {
    id: 'warnings',
    category: 'Hazards',
    label: 'Official Warnings (India)',
    shortLabel: 'Alerts',
    icon: 'warning',
    unit: 'Severity',
    source: 'NDMA SACHET CAP / IMD (India Regional)',
    coverage: 'regional-india',
    description: 'Verified IMD & NDMA SACHET color-coded hazard advisories (India coverage).',
    legendMin: 'Normal',
    legendMid: 'Watch / Alert',
    legendMax: 'Red Warning',
    gradientCss: 'linear-gradient(90deg, #5C9A79 0%, #D8B14F 42%, #D98548 72%, #C94F4B 100%)',
    accentHex: '#D8B14F',
  },
  {
    id: 'cyclones',
    category: 'Hazards',
    label: 'Cyclone Monitor (NIO)',
    shortLabel: 'Cyclones',
    icon: 'cyclone',
    unit: 'kt / hPa',
    source: 'RSMC New Delhi (North Indian Ocean)',
    coverage: 'regional-india',
    description: 'RSMC New Delhi tropical disturbance tracking across Bay of Bengal & Arabian Sea.',
    legendMin: 'Calm Basin',
    legendMid: 'Depression',
    legendMax: 'Cyclonic Storm',
    gradientCss: 'linear-gradient(90deg, #78AEB6 0%, #D8B14F 50%, #C94F4B 100%)',
    accentHex: '#D98548',
  },
  {
    id: 'agromet',
    category: 'Agriculture',
    label: 'Agromet & Soil Moisture',
    shortLabel: 'Agromet',
    icon: 'agriculture',
    unit: 'RH % / ET₀',
    source: 'Open-Meteo Global Soil / IMD GKMS India',
    coverage: 'global',
    description: 'Global soil moisture & evapotranspiration with official GKMS advisories in India.',
    legendMin: 'Arid <45%',
    legendMid: 'Moist 65%',
    legendMax: 'Wet >85%',
    gradientCss: 'linear-gradient(90deg, #E6B96B 0%, #89977B 55%, #78AEB6 100%)',
    accentHex: '#89977B',
  },
];

export interface GuidedTourStep {
  id: string;
  title: string;
  summary: string;
  layer: SpatialLayerId;
  cameraTarget: { lat: number; lng: number; distance: number };
}

export interface GuidedTour {
  id: string;
  label: string;
  shortLabel: string;
  steps: GuidedTourStep[];
}

export const GUIDED_TOURS: GuidedTour[] = [
  {
    id: 'wind-global',
    label: 'Explore global wind corridors',
    shortLabel: 'Global Winds',
    steps: [
      {
        id: 'wind-atlantic',
        title: 'North Atlantic & European Westerlies',
        summary: 'Mid-latitude surface winds stream across the North Atlantic toward Western Europe.',
        layer: 'wind',
        cameraTarget: { lat: 48.0, lng: -12.0, distance: 2.6 },
      },
      {
        id: 'wind-asia-pacific',
        title: 'Indo-Pacific Monsoon & Trade Winds',
        summary: 'Observe directional flow across the Indian Ocean, East Asia, and Western Pacific.',
        layer: 'wind',
        cameraTarget: { lat: 20.0, lng: 102.0, distance: 2.8 },
      },
    ],
  },
  {
    id: 'rain-radar',
    label: 'Follow global radar & rain',
    shortLabel: 'Global Radar',
    steps: [
      {
        id: 'radar-world',
        title: 'RainViewer Global Radar Composite',
        summary: 'Scrub timestamped precipitation echoes across North America, Europe, Asia, and Oceania.',
        layer: 'radar',
        cameraTarget: { lat: 25.0, lng: 20.0, distance: 3.5 },
      },
      {
        id: 'rain-east-asia',
        title: 'East Asia & Pacific Precipitation',
        summary: 'Inspect active convective rain bands across Japan, Korea, and coastal East Asia.',
        layer: 'rain',
        cameraTarget: { lat: 35.6, lng: 139.6, distance: 2.9 },
      },
    ],
  },
  {
    id: 'active-alerts',
    label: 'Inspect South Asia hazard posture',
    shortLabel: 'India Warnings',
    steps: [
      {
        id: 'alerts-national',
        title: 'IMD & NDMA SACHET Warning Network',
        summary: 'Official India regional hazard watches, orange alerts, and red warnings.',
        layer: 'warnings',
        cameraTarget: { lat: 21.8, lng: 79.2, distance: 3.0 },
      },
    ],
  },
  {
    id: 'agromet-outlook',
    label: 'Global surface temperature & moisture',
    shortLabel: 'Surface Thermal',
    steps: [
      {
        id: 'agromet-overview',
        title: 'Planetary Surface Thermal Field',
        summary: 'Compare real Open-Meteo 2m surface temperatures from equatorial tropics to polar zones.',
        layer: 'conditions',
        cameraTarget: { lat: 18.0, lng: 12.0, distance: 3.6 },
      },
    ],
  },
];

export interface InspectedSpatialFeature {
  kind: 'state' | 'radar' | 'cyclone' | 'location';
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  metrics: Array<{ label: string; value: string }>;
  warningLevel?: 'normal' | 'watch' | 'alert' | 'severe';
  warningMessage?: string;
  source?: string;
  stateName?: string;
}

export type AnalyzeOrFooterView = MainNavTab | FooterView | 'not-found';

interface ExperienceContextValue {
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
  surfaceTheme: SurfaceTheme;
  setSurfaceTheme: (theme: SurfaceTheme) => void;
  displayProfile: DisplayProfile;
  setDisplayProfile: (profile: DisplayProfile) => void;
  isPresentationMode: boolean;
  isTvMode: boolean;
  togglePresentationMode: () => void;
  toggleTvMode: () => void;
  activeLayer: SpatialLayerId;
  setActiveLayer: (layer: SpatialLayerId) => void;
  activeLayerDef: SpatialLayerDefinition;
  rendererMode: RendererMode;
  setRendererMode: (mode: RendererMode) => void;
  mapProjection: GlobalMapProjection;
  setMapProjection: (projection: GlobalMapProjection) => void;
  toggleMapProjection: () => void;
  webglUnavailableReason: string | null;
  reportWebGLUnavailable: (reason: string) => void;
  qualityTier: QualityTier;
  setQualityTier: (tier: QualityTier) => void;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
  timelineIndex: number;
  setTimelineIndex: React.Dispatch<React.SetStateAction<number>>;
  isTimelinePlaying: boolean;
  setIsTimelinePlaying: React.Dispatch<React.SetStateAction<boolean>>;
  isTimelineLooping: boolean;
  setIsTimelineLooping: React.Dispatch<React.SetStateAction<boolean>>;
  playbackSpeed: 0.5 | 1 | 1.5 | 2;
  setPlaybackSpeed: React.Dispatch<React.SetStateAction<0.5 | 1 | 1.5 | 2>>;
  isWindFlowPaused: boolean;
  setIsWindFlowPaused: React.Dispatch<React.SetStateAction<boolean>>;
  inspectedFeature: InspectedSpatialFeature | null;
  setInspectedFeature: (feature: InspectedSpatialFeature | null) => void;
  showControlsGuide: boolean;
  dismissControlsGuide: () => void;
  openControlsGuide: () => void;
  activeTourId: string | null;
  tourStepIndex: number;
  startTour: (tourId: string) => void;
  nextTourStep: () => void;
  stopTour: () => void;
  cameraFlyTarget: { lat: number; lng: number; zoom?: number; distance?: number; nonce: number } | null;
  regionFlyTarget: { region: WorldRegionKey; nonce: number } | null;
  flyCameraTo: (lat: number, lng: number, distance?: number, zoom?: number) => void;
  flyToWorldRegion: (region: WorldRegionKey) => void;
  recenterWorld: () => void;
  recenterIndia: () => void;
  isAlertDrawerOpen: boolean;
  setIsAlertDrawerOpen: (open: boolean) => void;
}

const GUIDE_DISMISSED_KEY = 'mausam_bruno_guide_dismissed_v2';
const SURFACE_THEME_KEY = 'mausam_surface_theme_v3';
const DISPLAY_PROFILE_KEY = 'mausam_display_profile_v1';

const ExperienceContext = createContext<ExperienceContextValue | undefined>(undefined);

function detectInitialReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readInitialSurfaceTheme(): SurfaceTheme {
  const saved = safeStorageGet('local', SURFACE_THEME_KEY);
  if (saved === 'dark' || saved === 'paper') return saved;
  return 'dark';
}

function readInitialDisplayProfile(): DisplayProfile {
  const saved = safeStorageGet('local', DISPLAY_PROFILE_KEY);
  if (saved === 'standard' || saved === 'projector' || saved === 'tv') {
    return saved;
  }
  return 'standard';
}

export const ExperienceProvider: React.FC<{
  initialMode?: ExperienceMode;
  children: React.ReactNode;
}> = ({ initialMode = 'explore', children }) => {
  const [mode, setModeState] = useState<ExperienceMode>(initialMode);
  const [surfaceTheme, setSurfaceThemeState] = useState<SurfaceTheme>(readInitialSurfaceTheme);
  const [displayProfile, setDisplayProfileState] = useState<DisplayProfile>(readInitialDisplayProfile);
  const [activeLayer, setActiveLayer] = useState<SpatialLayerId>('wind');
  const [rendererMode, setRendererMode] = useState<RendererMode>('3d');
  const [mapProjection, setMapProjection] = useState<GlobalMapProjection>('globe');
  const [webglUnavailableReason, setWebglUnavailableReason] = useState<string | null>(null);
  const [qualityTier, setQualityTier] = useState<QualityTier>('balanced');
  const [reducedMotion, setReducedMotion] = useState<boolean>(detectInitialReducedMotion);
  const [timelineIndex, setTimelineIndex] = useState<number>(0);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false);
  const [isTimelineLooping, setIsTimelineLooping] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [isWindFlowPaused, setIsWindFlowPaused] = useState<boolean>(false);
  const [inspectedFeature, setInspectedFeature] = useState<InspectedSpatialFeature | null>(null);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState<boolean>(false);

  const toggleMapProjection = useCallback(() => {
    setMapProjection((prev) => (prev === 'globe' ? 'mercator' : 'globe'));
  }, []);

  const setSurfaceTheme = useCallback((nextTheme: SurfaceTheme) => {
    setSurfaceThemeState(nextTheme);
    safeStorageSet('local', SURFACE_THEME_KEY, nextTheme);
  }, []);

  const setDisplayProfile = useCallback((nextProfile: DisplayProfile) => {
    setDisplayProfileState(nextProfile);
    safeStorageSet('local', DISPLAY_PROFILE_KEY, nextProfile);
  }, []);

  const togglePresentationMode = useCallback(() => {
    setDisplayProfileState((prev) => {
      const next: DisplayProfile = prev === 'projector' ? 'standard' : 'projector';
      safeStorageSet('local', DISPLAY_PROFILE_KEY, next);
      return next;
    });
  }, []);

  const toggleTvMode = useCallback(() => {
    setDisplayProfileState((prev) => {
      const next: DisplayProfile = prev === 'tv' ? 'standard' : 'tv';
      safeStorageSet('local', DISPLAY_PROFILE_KEY, next);
      return next;
    });
  }, []);

  const isPresentationMode = displayProfile === 'projector';
  const isTvMode = displayProfile === 'tv';

  // Sync displayProfile classes cleanly to <html> and remove on unmount
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('presentation-mode', displayProfile === 'projector');
    root.classList.toggle('tv-mode', displayProfile === 'tv');
    root.setAttribute('data-display-profile', displayProfile);
    return () => {
      root.classList.remove('presentation-mode', 'tv-mode');
      root.removeAttribute('data-display-profile');
    };
  }, [displayProfile]);

  // Calm first load: frame the entire Earth cleanly without a blocking intro modal
  const [showControlsGuide, setShowControlsGuide] = useState<boolean>(false);

  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [tourStepIndex, setTourStepIndex] = useState<number>(0);
  const [cameraFlyTarget, setCameraFlyTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    distance?: number;
    nonce: number;
  } | null>(null);
  const [regionFlyTarget, setRegionFlyTarget] = useState<{
    region: WorldRegionKey;
    nonce: number;
  } | null>(null);

  const setMode = useCallback((nextMode: ExperienceMode) => {
    setModeState(nextMode);
    if (nextMode !== 'explore') {
      setIsTimelinePlaying(false);
    }
  }, []);

  const reportWebGLUnavailable = useCallback((reason: string) => {
    setWebglUnavailableReason(reason);
    setRendererMode('2d');
  }, []);

  const dismissControlsGuide = useCallback(() => {
    setShowControlsGuide(false);
    safeStorageSet('local', GUIDE_DISMISSED_KEY, '1');
  }, []);

  const openControlsGuide = useCallback(() => {
    setShowControlsGuide(true);
  }, []);

  const flyCameraTo = useCallback((lat: number, lng: number, distance = 3.25, zoom?: number) => {
    setCameraFlyTarget({ lat, lng, distance, zoom, nonce: Date.now() + Math.random() });
  }, []);

  const flyToWorldRegion = useCallback((region: WorldRegionKey) => {
    setRegionFlyTarget({ region, nonce: Date.now() + Math.random() });
  }, []);

  const recenterWorld = useCallback(() => {
    setRegionFlyTarget({ region: 'global', nonce: Date.now() + Math.random() });
  }, []);

  const recenterIndia = useCallback(() => {
    setRegionFlyTarget({ region: 'southAsia', nonce: Date.now() + Math.random() });
  }, []);

  const startTour = useCallback(
    (tourId: string) => {
      const tour = GUIDED_TOURS.find((t) => t.id === tourId);
      if (!tour || tour.steps.length === 0) return;
      setModeState('explore');
      setActiveTourId(tourId);
      setTourStepIndex(0);
      const first = tour.steps[0];
      setActiveLayer(first.layer);
      flyCameraTo(first.cameraTarget.lat, first.cameraTarget.lng, first.cameraTarget.distance);
      dismissControlsGuide();
    },
    [dismissControlsGuide, flyCameraTo]
  );

  const stopTour = useCallback(() => {
    setActiveTourId(null);
    setTourStepIndex(0);
  }, []);

  const nextTourStep = useCallback(() => {
    if (!activeTourId) return;
    const tour = GUIDED_TOURS.find((t) => t.id === activeTourId);
    if (!tour) {
      stopTour();
      return;
    }
    const nextIdx = tourStepIndex + 1;
    if (nextIdx >= tour.steps.length) {
      stopTour();
      return;
    }
    const step = tour.steps[nextIdx];
    setTourStepIndex(nextIdx);
    setActiveLayer(step.layer);
    flyCameraTo(step.cameraTarget.lat, step.cameraTarget.lng, step.cameraTarget.distance);
  }, [activeTourId, tourStepIndex, flyCameraTo, stopTour]);

  // Listen for OS prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const activeLayerDef = useMemo(
    () => SPATIAL_LAYERS.find((l) => l.id === activeLayer) || SPATIAL_LAYERS[0],
    [activeLayer]
  );

  const value = useMemo<ExperienceContextValue>(
    () => ({
      mode,
      setMode,
      surfaceTheme,
      setSurfaceTheme,
      displayProfile,
      setDisplayProfile,
      isPresentationMode,
      isTvMode,
      togglePresentationMode,
      toggleTvMode,
      activeLayer,
      setActiveLayer,
      activeLayerDef,
      rendererMode,
      setRendererMode,
      mapProjection,
      setMapProjection,
      toggleMapProjection,
      webglUnavailableReason,
      reportWebGLUnavailable,
      qualityTier,
      setQualityTier,
      reducedMotion,
      setReducedMotion,
      timelineIndex,
      setTimelineIndex,
      isTimelinePlaying,
      setIsTimelinePlaying,
      isTimelineLooping,
      setIsTimelineLooping,
      playbackSpeed,
      setPlaybackSpeed,
      isWindFlowPaused,
      setIsWindFlowPaused,
      inspectedFeature,
      setInspectedFeature,
      showControlsGuide,
      dismissControlsGuide,
      openControlsGuide,
      activeTourId,
      tourStepIndex,
      startTour,
      nextTourStep,
      stopTour,
      cameraFlyTarget,
      regionFlyTarget,
      flyCameraTo,
      flyToWorldRegion,
      recenterWorld,
      recenterIndia,
      isAlertDrawerOpen,
      setIsAlertDrawerOpen,
    }),
    [
      mode,
      setMode,
      surfaceTheme,
      setSurfaceTheme,
      displayProfile,
      setDisplayProfile,
      isPresentationMode,
      isTvMode,
      togglePresentationMode,
      toggleTvMode,
      activeLayer,
      activeLayerDef,
      rendererMode,
      mapProjection,
      toggleMapProjection,
      webglUnavailableReason,
      reportWebGLUnavailable,
      qualityTier,
      reducedMotion,
      timelineIndex,
      isTimelinePlaying,
      isTimelineLooping,
      playbackSpeed,
      isWindFlowPaused,
      inspectedFeature,
      showControlsGuide,
      dismissControlsGuide,
      openControlsGuide,
      activeTourId,
      tourStepIndex,
      startTour,
      nextTourStep,
      stopTour,
      cameraFlyTarget,
      regionFlyTarget,
      flyCameraTo,
      flyToWorldRegion,
      recenterWorld,
      recenterIndia,
      isAlertDrawerOpen,
    ]
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
};

export function useExperience(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext);
  if (!ctx) {
    throw new Error('useExperience must be used inside ExperienceProvider');
  }
  return ctx;
}
