// ====================================================================
// MAUSAM Explore Workspace (Primary Planet-Wide Spatial Stage)
// Full-viewport MapLibre GL JS global globe / flat map powered by
// OpenFreeMap vector tiles (with seamless 2D Leaflet fallback when
// WebGL is unavailable) surrounded by MAUSAM's dark-charcoal & muted-gold
// contextual HUD controls: LayerDock, WeatherHUD, ForecastTimeline,
// FirstVisitGuide, and AlertCenterModal.
// ====================================================================

import React, { useEffect } from 'react';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { RadarApiResponse } from '../../services/radarService';
import type { CyclonePayload } from '../../types/cyclone';
import { MainNavTab } from '../layout/MainNavigation';
import { useExperience } from '../../context/ExperienceContext';
import { useProvider } from '../../store/providerStore';
import { GlobalWorldMap } from '../map/GlobalWorldMap';
import { AccessibleMapFallback } from './AccessibleMapFallback';
import { LayerDock } from './LayerDock';
import { WeatherHUD } from './WeatherHUD';
import { ForecastTimeline } from './ForecastTimeline';
import { FirstVisitGuide } from './FirstVisitGuide';

interface ExploreWorkspaceProps {
  selectedLocation: LocationRecord;
  weatherBundle: WeatherDataBundle;
  cyclonePayload?: CyclonePayload | null;
  onSelectLocation: (loc: LocationRecord) => void;
  onOpenAnalyzeTab: (tab: MainNavTab) => void;
  onOpenAskMausam: () => void;
}

export const ExploreWorkspace: React.FC<ExploreWorkspaceProps> = ({
  selectedLocation,
  weatherBundle,
  onSelectLocation,
  onOpenAnalyzeTab,
  onOpenAskMausam,
}) => {
  const {
    activeLayer,
    rendererMode,
    setRendererMode,
    mapProjection,
    setMapProjection,
    webglUnavailableReason,
    reportWebGLUnavailable,
    reducedMotion,
    isWindFlowPaused,
    timelineIndex,
    playbackSpeed,
    cameraFlyTarget,
    regionFlyTarget,
    setInspectedFeature,
    recenterWorld,
    showControlsGuide,
    openControlsGuide,
    dismissControlsGuide,
  } = useExperience();

  const { state: radarProvider } = useProvider<RadarApiResponse>('RADAR');

  // Global Explore keyboard shortcuts (? = toggle controls guide, R = reset global view, Escape = dismiss overlays)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        if (showControlsGuide) dismissControlsGuide();
        else openControlsGuide();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        recenterWorld();
      } else if (e.key === 'Escape') {
        if (showControlsGuide) {
          dismissControlsGuide();
        } else {
          setInspectedFeature(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showControlsGuide, openControlsGuide, dismissControlsGuide, setInspectedFeature, recenterWorld]);

  return (
    <div id="mausam-explore-workspace" data-theme="dark-workspace" className="mausam-explore-stage">
      {/* Primary Planet-Wide Atmospheric Stage: Global MapLibre Globe / Flat Map or 2D Leaflet Fallback */}
      {rendererMode === '3d' ? (
        <GlobalWorldMap
          selectedLocation={selectedLocation}
          weatherBundle={weatherBundle}
          radarData={radarProvider.data}
          activeLayer={activeLayer}
          projection={mapProjection}
          onProjectionChange={setMapProjection}
          timelineIndex={timelineIndex}
          playbackSpeed={playbackSpeed}
          reducedMotion={reducedMotion}
          windFlowPaused={isWindFlowPaused}
          cameraFlyTarget={cameraFlyTarget}
          regionFlyTarget={regionFlyTarget}
          onSelectLocation={onSelectLocation}
          onSelectFeature={(feature) => setInspectedFeature(feature)}
          onWebGLUnavailable={reportWebGLUnavailable}
        />
      ) : (
        <AccessibleMapFallback
          activeLayer={activeLayer}
          selectedLocation={selectedLocation}
          radarData={radarProvider.data}
          timelineIndex={timelineIndex}
          reason={webglUnavailableReason || 'User switched to 2D Interactive Map'}
          onSelectFeature={(feature) => setInspectedFeature(feature)}
          onSwitchBackTo3D={() => setRendererMode('3d')}
        />
      )}

      {/* Floating Atmospheric Layer Selector & Global Stations Dock */}
      <LayerDock onSelectLocation={onSelectLocation} />

      {/* Floating Collapsible Current Conditions & Spatial Inspector HUD */}
      <WeatherHUD
        selectedLocation={selectedLocation}
        weatherBundle={weatherBundle}
        onSelectLocation={onSelectLocation}
        onInspectInAnalyze={onOpenAnalyzeTab}
        onOpenAskMausam={onOpenAskMausam}
      />

      {/* Persistent Bottom Forecast / Radar Timeline */}
      <ForecastTimeline
        hourly={weatherBundle.hourly || []}
        radarData={radarProvider.data}
        locationKey={selectedLocation.id}
      />

      {/* Dismissible First-Visit Spatial Controls Guide & Guided Tours */}
      <FirstVisitGuide />
    </div>
  );
};
