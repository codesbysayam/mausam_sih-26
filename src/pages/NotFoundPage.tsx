import React from 'react';
import { Home, CloudSun, AlertCircle } from 'lucide-react';
import { MainNavTab } from '../components/layout/MainNavigation';
import { DataPanel } from '../components/ui/ObservatoryPrimitives';

interface NotFoundPageProps {
  onNavigateHome: () => void;
  onNavigateTab: (tab: MainNavTab) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateHome,
  onNavigateTab,
}) => {
  return (
    <div
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6"
      aria-labelledby="not-found-title"
    >
      <DataPanel variant="surface-1" className="w-full max-w-xl p-6 sm:p-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#08131F] border border-[#26394B] text-xs font-mono font-semibold text-[#35C7E8] mb-5">
          <AlertCircle className="w-3.5 h-3.5 text-[#F59E0B]" aria-hidden="true" />
          <span>HTTP 404 · ROUTE UNRESOLVED</span>
        </div>

        <h1
          id="not-found-title"
          className="text-6xl sm:text-7xl font-extrabold text-[#F3F6FA] tracking-tight font-mono tabular-nums mb-2"
        >
          404
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-[#F3F6FA] mb-3">
          Weather station not found.
        </h2>

        <p className="text-sm text-[#8295A8] max-w-md mx-auto leading-relaxed mb-8">
          The requested meteorological telemetry endpoint or page does not exist on this observatory server. Please verify the URL or return to the national observation grid.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            id="not-found-home-btn"
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-6 min-h-[44px] sm:min-h-[40px] rounded-xl bg-[#0B72B9] hover:bg-[#0B72B9]/85 text-[#F3F6FA] font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Back to MAUSAM</span>
          </button>

          <button
            type="button"
            id="not-found-weather-btn"
            onClick={() => onNavigateTab('weather')}
            className="w-full sm:w-auto px-6 min-h-[44px] sm:min-h-[40px] rounded-xl bg-[#101F2E] hover:bg-[#172A3D] text-[#B5C3D1] hover:text-[#F3F6FA] font-semibold text-sm border border-[#26394B] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <CloudSun className="w-4 h-4 text-[#35C7E8]" aria-hidden="true" />
            <span>Check Weather</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[#26394B] flex flex-wrap items-center justify-center gap-3 text-xs text-[#8295A8]">
          <button
            type="button"
            onClick={() => onNavigateTab('warnings')}
            className="hover:text-[#35C7E8] transition-colors min-h-[36px] px-2 cursor-pointer"
          >
            Disaster Warnings
          </button>
          <span className="text-[#38536A]" aria-hidden="true">•</span>
          <button
            type="button"
            onClick={() => onNavigateTab('radar')}
            className="hover:text-[#35C7E8] transition-colors min-h-[36px] px-2 cursor-pointer"
          >
            Doppler Radar
          </button>
          <span className="text-[#38536A]" aria-hidden="true">•</span>
          <button
            type="button"
            onClick={() => onNavigateTab('aqi')}
            className="hover:text-[#35C7E8] transition-colors min-h-[36px] px-2 cursor-pointer"
          >
            Air Quality (AQI)
          </button>
        </div>
      </DataPanel>
    </div>
  );
};
