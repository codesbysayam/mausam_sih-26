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
    <div id="mausam-classic-workspace" className="pt-[68px] sm:pt-[64px] pb-8 min-h-screen w-full bg-[#07111D]">
      <div className="max-w-[1560px] mx-auto px-3 lg:px-6 mb-4">
        <div className="m-panel px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-[#B5C3D1]">
            <span className="font-mono uppercase text-[10px] text-[#35C7E8] font-semibold">
              Classic Observatory View
            </span>
            <span className="text-[#38536A]">·</span>
            <span>Low-GPU linear workstation preserving all live observations, radar &amp; regional grids.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRendererMode('3d');
                setMode('explore');
              }}
              className="px-3 min-h-[36px] rounded-lg bg-[#35C7E8]/12 border border-[#35C7E8]/35 text-[#7DD3FC] font-semibold flex items-center gap-1.5 hover:bg-[#35C7E8]/20 cursor-pointer m-focus-ring"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>3D Explore</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToAnalyze('forecast')}
              className="px-3 min-h-[36px] rounded-lg bg-[#101F2E] border border-[#26394B] text-[#F3F6FA] font-medium flex items-center gap-1 hover:bg-[#172A3B] hover:border-[#38536A] cursor-pointer m-focus-ring"
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
