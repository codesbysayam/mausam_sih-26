// ====================================================================
// MAUSAM Explore Workspace (Primary Spatial 3D Stage)
// Full-viewport 3D atmospheric scene (with seamless 2D Leaflet fallback)
// surrounded by floating contextual HUD controls: LayerDock, WeatherHUD,
// ForecastTimeline, FirstVisitGuide, and AlertCenterModal.
// ====================================================================

import React from 'react';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { RadarApiResponse } from '../../services/radarService';
import type { CyclonePayload } from '../../types/cyclone';
import { MainNavTab } from '../layout/MainNavigation';
import { useExperience } from '../../context/ExperienceContext';
import { useProvider } from '../../store/providerStore';
import { AtmosphereScene } from '../scene/AtmosphereScene';
import { AccessibleMapFallback } from './AccessibleMapFallback';
import { LayerDock } from './LayerDock';
import { WeatherHUD } from './WeatherHUD';
import { ForecastTimeline } from './ForecastTimeline';
import { FirstVisitGuide } from './FirstVisitGuide';
import { AlertCenterModal } from './AlertCenterModal';

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
  cyclonePayload,
  onSelectLocation,
  onOpenAnalyzeTab,
  onOpenAskMausam,
}) => {
  const {
    activeLayer,
    rendererMode,
    setRendererMode,
    webglUnavailableReason,
    reportWebGLUnavailable,
    qualityTier,
    reducedMotion,
    timelineIndex,
    cameraFlyTarget,
    setInspectedFeature,
    recenterIndia,
  } = useExperience();

  const { state: radarProvider } = useProvider<RadarApiResponse>('RADAR');

  return (
    <div id="mausam-explore-workspace" className="mausam-explore-stage">
      {/* Primary Atmospheric Stage: Interactive 3D WebGL Globe or 2D Map Fallback */}
      {rendererMode === '3d' ? (
        <AtmosphereScene
          selectedLocation={selectedLocation}
          weatherBundle={weatherBundle}
          cyclonePayload={cyclonePayload}
          activeLayer={activeLayer}
          timelineIndex={timelineIndex}
          qualityTier={qualityTier}
          reducedMotion={reducedMotion}
          cameraFlyTarget={cameraFlyTarget}
          onSelectFeature={(feature) => setInspectedFeature(feature)}
          onRecenterIndia={recenterIndia}
          onWebGLUnavailable={reportWebGLUnavailable}
        />
      ) : (
        <AccessibleMapFallback
          activeLayer={activeLayer}
          selectedLocation={selectedLocation}
          radarData={radarProvider.data}
          reason={webglUnavailableReason || 'User switched to 2D Interactive Map'}
          onSelectFeature={(feature) => setInspectedFeature(feature)}
          onSwitchBackTo3D={() => setRendererMode('3d')}
        />
      )}

      {/* Floating Atmospheric Layer Selector Dock */}
      <LayerDock />

      {/* Floating Collapsible Current Conditions & Spatial Inspector HUD */}
      <WeatherHUD
        selectedLocation={selectedLocation}
        weatherBundle={weatherBundle}
        onSelectLocation={onSelectLocation}
        onInspectInAnalyze={onOpenAnalyzeTab}
        onOpenAskMausam={onOpenAskMausam}
      />

      {/* Persistent Bottom Forecast / Radar Timeline */}
      <ForecastTimeline hourly={weatherBundle.hourly || []} radarData={radarProvider.data} />

      {/* Dismissible First-Visit Spatial Controls Guide & Guided Tours */}
      <FirstVisitGuide />

      {/* SACHET / IMD Hazard Alert Center Drawer */}
      <AlertCenterModal
        selectedLocation={selectedLocation}
        alerts={weatherBundle.alerts || []}
        onOpenFullWarningsPage={() => onOpenAnalyzeTab('warnings')}
      />
    </div>
  );
};
