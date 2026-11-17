// ====================================================================
// MAUSAM Classic Workspace (Accessible Low-Power Linear Fallback)
// Streamlined, single-chrome accessible alternative without stacked
// navigation bars or redundant decorative containers. Preserves full
// national/local weather telemetry, 2D regional grid, and domain access.
// ====================================================================

import React from 'react';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { LocatingPhase } from '../../services/geolocationService';
import type { StateWeatherData } from '../map/IndiaWeatherMap';
import { MainNavTab } from '../layout/MainNavigation';
import { PageContainer } from '../layout/PageContainer';
import { HomePage } from '../../pages/Home';
import { useExperience } from '../../context/ExperienceContext';
import { Globe, ArrowUpRight } from 'lucide-react';

interface ClassicWorkspaceProps {
  weatherBundle: WeatherDataBundle;
  selectedLocation: LocationRecord;
  onNavigateToAnalyze: (tab: MainNavTab) => void;
  onSelectLocation: (loc: LocationRecord) => void;
  onStateSelect: (state: StateWeatherData) => void;
  onDetectLocation: (forceRefresh?: boolean) => Promise<any>;
  isLocating: boolean;
  locatePhase: LocatingPhase;
  locationSource: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  onOpenLocationCenter: () => void;
}

export const ClassicWorkspace: React.FC<ClassicWorkspaceProps> = ({
  weatherBundle,
  selectedLocation,
  onNavigateToAnalyze,
  onSelectLocation,
  onStateSelect,
  onDetectLocation,
  isLocating,
  locatePhase,
  locationSource,
  onOpenLocationCenter,
}) => {
  const { setMode, setRendererMode } = useExperience();

  return (
    <div id="mausam-classic-workspace" className="pt-[64px] pb-6 min-h-screen w-full bg-[#07111D]">
      <div className="max-w-[1560px] mx-auto px-3 lg:px-6 mb-4">
        <div className="spatial-hud-surface rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#B8C7D9]">
            <span className="font-mono uppercase text-[10px] text-[#35C7E8] font-semibold">
              Classic Accessible View
            </span>
            <span>·</span>
            <span>Low-GPU linear presentation preserving all real-time weather feeds &amp; regional stations.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRendererMode('3d');
                setMode('explore');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#35C7E8]/15 border border-[#35C7E8]/40 text-[#35C7E8] font-semibold flex items-center gap-1.5 hover:bg-[#35C7E8]/25 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Return to 3D Globe</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToAnalyze('forecast')}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-[#84A8CC]/20 text-[#F4F7FB] font-medium flex items-center gap-1 hover:bg-white/10 cursor-pointer"
            >
              <span>NWP Models</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <PageContainer id="mausam-main-page-container">
        <HomePage
          weatherBundle={weatherBundle}
          selectedLocation={selectedLocation}
          onNavigateToTab={(tab) => onNavigateToAnalyze(tab)}
          onSelectLocation={onSelectLocation}
          onStateSelect={onStateSelect}
          onDetectLocation={onDetectLocation}
          isLocating={isLocating}
          locatePhase={locatePhase}
          locationSource={locationSource}
          onOpenLocationCenter={onOpenLocationCenter}
        />
      </PageContainer>
    </div>
  );
};
