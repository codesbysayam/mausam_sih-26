// ====================================================================
// MAUSAM Spatial Experience Context
// Coordinates Explore (3D), Analyze (Scientific Workstation), and
// Classic (Accessible Linear) modes with continuous location, layer,
// timeline, quality tier, 2D map fallback, and guided tour state.
// ====================================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MainNavTab } from '../components/layout/MainNavigation';
import type { FooterView } from '../components/layout/FooterNavigation';

export type ExperienceMode = 'explore' | 'analyze' | 'classic';
export type SurfaceTheme = 'paper' | 'dark';

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
    label: 'Temperature & Surface',
    shortLabel: 'Surface',
    icon: 'thermostat',
    unit: '°C',
    source: 'IMD Regional Grid / Open-Meteo',
    description: '2m surface air temperature across all 36 Indian States & UTs.',
    legendMin: '12°C',
    legendMid: '27°C',
    legendMax: '42°C',
    gradientCss: 'linear-gradient(90deg, #35C7E8 0%, #22C7A0 42%, #F59E0B 74%, #EF4444 100%)',
    accentHex: '#35C7E8',
  },
  {
    id: 'wind',
    category: 'Atmosphere',
    label: 'Wind Streams',
    shortLabel: 'Wind',
    icon: 'air',
    unit: 'km/h',
    source: 'Synoptic Wind Vectors / Open-Meteo',
    description: '10m boundary-layer wind streamlines & speed vectors over subcontinent and adjoining seas.',
    legendMin: '5 km/h',
    legendMid: '22 km/h',
    legendMax: '55+ km/h',
    gradientCss: 'linear-gradient(90deg, #26394B 0%, #22C7A0 48%, #35C7E8 78%, #F59E0B 100%)',
    accentHex: '#22C7A0',
  },
  {
    id: 'rain',
    category: 'Precipitation',
    label: 'Rainfall Intensity',
    shortLabel: 'Rain',
    icon: 'rainy',
    unit: 'mm',
    source: 'IMD / Open-Meteo QPF',
    description: 'Surface precipitation accumulation and convective rainfall zones.',
    legendMin: '0 mm',
    legendMid: '15 mm',
    legendMax: '40+ mm',
    gradientCss: 'linear-gradient(90deg, #101F2E 0%, #0B72B9 45%, #35C7E8 75%, #F59E0B 100%)',
    accentHex: '#0B72B9',
  },
  {
    id: 'radar',
    category: 'Precipitation',
    label: 'Doppler Radar Network',
    shortLabel: 'Radar',
    icon: 'radar',
    unit: 'km range',
    source: 'IMD 33-Station DWR & RainViewer',
    description: 'Operational S/C/X-Band Doppler radar coverage rings across India.',
    legendMin: 'X-Band 100km',
    legendMid: 'C-Band 150km',
    legendMax: 'S-Band 250km',
    gradientCss: 'linear-gradient(90deg, #172A3D 0%, #35C7E8 55%, #22C7A0 100%)',
    accentHex: '#35C7E8',
  },
  {
    id: 'satellite',
    category: 'Precipitation',
    label: 'Cloud & INSAT Veil',
    shortLabel: 'Clouds',
    icon: 'cloud',
    unit: '% cover',
    source: 'ISRO INSAT-3D / Open-Meteo Cloud Cover',
    description: 'Tropospheric cloud deck opacity and moisture corridors.',
    legendMin: '0%',
    legendMid: '50%',
    legendMax: '100%',
    gradientCss: 'linear-gradient(90deg, #08131F 0%, #647C94 50%, #F3F6FA 100%)',
    accentHex: '#B5C3D1',
  },
  {
    id: 'aqi',
    category: 'Environment',
    label: 'Air Quality Index',
    shortLabel: 'AQI',
    icon: 'masks',
    unit: 'NAQI',
    source: 'CPCB CAAQMS / Open-Meteo Chemistry',
    description: 'Ambient particulate burden (PM2.5 / PM10 / AQI) across urban basins.',
    legendMin: 'Good (0–50)',
    legendMid: 'Mod (101–200)',
    legendMax: 'Poor (201+)',
    gradientCss: 'linear-gradient(90deg, #22C7A0 0%, #F59E0B 45%, #F97316 72%, #EF4444 100%)',
    accentHex: '#22C7A0',
  },
  {
    id: 'warnings',
    category: 'Hazards',
    label: 'Official Warnings',
    shortLabel: 'Alerts',
    icon: 'warning',
    unit: 'Severity',
    source: 'NDMA SACHET CAP / IMD Warnings',
    description: 'State and district color-coded severity watches, orange alerts, and red warnings.',
    legendMin: 'Normal',
    legendMid: 'Watch / Alert',
    legendMax: 'Red Warning',
    gradientCss: 'linear-gradient(90deg, #22C7A0 0%, #F59E0B 42%, #F97316 72%, #EF4444 100%)',
    accentHex: '#F59E0B',
  },
  {
    id: 'cyclones',
    category: 'Hazards',
    label: 'Cyclone Basin Monitor',
    shortLabel: 'Cyclones',
    icon: 'cyclone',
    unit: 'kt / hPa',
    source: 'RSMC New Delhi / IMD Cyclone Bulletins',
    description: 'North Indian Ocean tropical disturbance positions, tracks, and basin watch.',
    legendMin: 'Calm Basin',
    legendMid: 'Depression',
    legendMax: 'Cyclonic Storm',
    gradientCss: 'linear-gradient(90deg, #0B72B9 0%, #F59E0B 50%, #EF4444 100%)',
    accentHex: '#F97316',
  },
  {
    id: 'agromet',
    category: 'Agriculture',
    label: 'Agromet & Moisture',
    shortLabel: 'Agromet',
    icon: 'agriculture',
    unit: 'RH % / Rain',
    source: 'IMD GKMS / Open-Meteo Soil & ET₀',
    description: 'Regional moisture balance, evapotranspiration, and crop-stage advisory posture.',
    legendMin: 'Arid <45%',
    legendMid: 'Moist 65%',
    legendMax: 'Wet >85%',
    gradientCss: 'linear-gradient(90deg, #F59E0B 0%, #22C7A0 55%, #0B72B9 100%)',
    accentHex: '#22C7A0',
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
    id: 'wind-india',
    label: 'Explore wind over India',
    shortLabel: 'Wind Corridors',
    steps: [
      {
        id: 'wind-peninsula',
        title: 'Arabian Sea & Western Ghats Fetch',
        summary: 'Moisture-laden westerlies accelerate along the Konkan and Malabar coast.',
        layer: 'wind',
        cameraTarget: { lat: 14.5, lng: 73.2, distance: 3.1 },
      },
      {
        id: 'wind-plains',
        title: 'Indo-Gangetic Convergence',
        summary: 'Boundary-layer winds channel across northern and eastern plains.',
        layer: 'wind',
        cameraTarget: { lat: 26.2, lng: 81.8, distance: 3.2 },
      },
    ],
  },
  {
    id: 'rain-radar',
    label: 'Follow rainfall & radar',
    shortLabel: 'Radar & Rain',
    steps: [
      {
        id: 'radar-national',
        title: '33-Station IMD Doppler Network',
        summary: 'S-Band and C-Band coastal and interior radars guard peninsula and Himalayan corridors.',
        layer: 'radar',
        cameraTarget: { lat: 21.2, lng: 80.5, distance: 3.5 },
      },
      {
        id: 'rain-east-coast',
        title: 'Bay of Bengal & East Coast Precipitation',
        summary: 'Inspect Paradip, Gopalpur, and Kolkata radar sectors for convective cells.',
        layer: 'rain',
        cameraTarget: { lat: 20.3, lng: 86.2, distance: 2.9 },
      },
    ],
  },
  {
    id: 'active-alerts',
    label: 'Inspect active alerts',
    shortLabel: 'Hazard Focus',
    steps: [
      {
        id: 'alerts-national',
        title: 'Subcontinent Warning Posture',
        summary: 'Elevated coastal and Himalayan advisories appear in amber, orange, and red.',
        layer: 'warnings',
        cameraTarget: { lat: 21.8, lng: 79.2, distance: 3.6 },
      },
    ],
  },
  {
    id: 'agromet-outlook',
    label: 'Local Agromet outlook',
    shortLabel: 'Agromet Outlook',
    steps: [
      {
        id: 'agromet-overview',
        title: 'Regional Moisture & Crop Zones',
        summary: 'Inspect regional humidity, rainfall spells, and GKMS sowing/irrigation windows.',
        layer: 'agromet',
        cameraTarget: { lat: 22.8, lng: 78.6, distance: 3.4 },
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
  activeLayer: SpatialLayerId;
  setActiveLayer: (layer: SpatialLayerId) => void;
  activeLayerDef: SpatialLayerDefinition;
  rendererMode: RendererMode;
  setRendererMode: (mode: RendererMode) => void;
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
  cameraFlyTarget: { lat: number; lng: number; distance?: number; nonce: number } | null;
  flyCameraTo: (lat: number, lng: number, distance?: number) => void;
  recenterIndia: () => void;
  isAlertDrawerOpen: boolean;
  setIsAlertDrawerOpen: (open: boolean) => void;
}

const GUIDE_DISMISSED_KEY = 'mausam_bruno_guide_dismissed_v1';
const SURFACE_THEME_KEY = 'mausam_surface_theme_v2';

const ExperienceContext = createContext<ExperienceContextValue | undefined>(undefined);

function detectInitialReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readInitialSurfaceTheme(): SurfaceTheme {
  if (typeof window === 'undefined') return 'paper';
  try {
    const saved = window.localStorage.getItem(SURFACE_THEME_KEY);
    if (saved === 'dark' || saved === 'paper') return saved;
  } catch {
    // Ignore storage read errors
  }
  return 'paper';
}

export const ExperienceProvider: React.FC<{
  initialMode?: ExperienceMode;
  children: React.ReactNode;
}> = ({ initialMode = 'analyze', children }) => {
  const [mode, setModeState] = useState<ExperienceMode>(initialMode);
  const [surfaceTheme, setSurfaceThemeState] = useState<SurfaceTheme>(readInitialSurfaceTheme);
  const [activeLayer, setActiveLayer] = useState<SpatialLayerId>('wind');
  const [rendererMode, setRendererMode] = useState<RendererMode>('3d');
  const [webglUnavailableReason, setWebglUnavailableReason] = useState<string | null>(null);
  const [qualityTier, setQualityTier] = useState<QualityTier>('auto');
  const [reducedMotion, setReducedMotion] = useState<boolean>(detectInitialReducedMotion);
  const [timelineIndex, setTimelineIndex] = useState<number>(0);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false);
  const [inspectedFeature, setInspectedFeature] = useState<InspectedSpatialFeature | null>(null);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState<boolean>(false);

  const setSurfaceTheme = useCallback((nextTheme: SurfaceTheme) => {
    setSurfaceThemeState(nextTheme);
    try {
      window.localStorage.setItem(SURFACE_THEME_KEY, nextTheme);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const [showControlsGuide, setShowControlsGuide] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(GUIDE_DISMISSED_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [tourStepIndex, setTourStepIndex] = useState<number>(0);
  const [cameraFlyTarget, setCameraFlyTarget] = useState<{
    lat: number;
    lng: number;
    distance?: number;
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
    try {
      window.localStorage.setItem(GUIDE_DISMISSED_KEY, '1');
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const openControlsGuide = useCallback(() => {
    setShowControlsGuide(true);
  }, []);

  const flyCameraTo = useCallback((lat: number, lng: number, distance = 3.25) => {
    setCameraFlyTarget({ lat, lng, distance, nonce: Date.now() + Math.random() });
  }, []);

  const recenterIndia = useCallback(() => {
    setCameraFlyTarget({ lat: 21.5, lng: 79.0, distance: 3.45, nonce: Date.now() + Math.random() });
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
      activeLayer,
      setActiveLayer,
      activeLayerDef,
      rendererMode,
      setRendererMode,
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
      flyCameraTo,
      recenterIndia,
      isAlertDrawerOpen,
      setIsAlertDrawerOpen,
    }),
    [
      mode,
      setMode,
      surfaceTheme,
      setSurfaceTheme,
      activeLayer,
      activeLayerDef,
      rendererMode,
      webglUnavailableReason,
      reportWebGLUnavailable,
      qualityTier,
      reducedMotion,
      timelineIndex,
      isTimelinePlaying,
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
      flyCameraTo,
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
