// ====================================================================
// MAUSAM Floating Weather Conditions & Spatial Inspector HUD
// Compact, collapsible overlay over the 3D globe (desktop right-edge,
// mobile collapsible bottom sheet) displaying honest real-data metrics
// and bridging seamlessly into the Analyze workstation.
// ====================================================================

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  MapPin,
  ArrowUpRight,
  X,
} from 'lucide-react';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import { MainNavTab } from '../layout/MainNavigation';
import { useExperience } from '../../context/ExperienceContext';
import { locationService } from '../../services/locationService';

interface WeatherHUDProps {
  selectedLocation: LocationRecord;
  weatherBundle: WeatherDataBundle;
  onSelectLocation: (loc: LocationRecord) => void;
  onInspectInAnalyze: (tab: MainNavTab) => void;
  onOpenAskMausam: () => void;
}

export const WeatherHUD: React.FC<WeatherHUDProps> = ({
  selectedLocation,
  weatherBundle,
  onSelectLocation,
  onInspectInAnalyze,
  onOpenAskMausam,
}) => {
  const {
    activeLayer,
    timelineIndex,
    inspectedFeature,
    setInspectedFeature,
    flyCameraTo,
  } = useExperience();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const current = weatherBundle.current;
  const activeHour = weatherBundle.hourly?.[timelineIndex];
  const displayTemp =
    timelineIndex > 0 && typeof activeHour?.temp === 'number' ? activeHour.temp : current.temp;
  const displayCond =
    timelineIndex > 0 && activeHour?.condition ? activeHour.condition : current.condition;
  const displayWind =
    timelineIndex > 0 && typeof activeHour?.windSpeed === 'number'
      ? activeHour.windSpeed
      : current.windSpeed;
  const displayWindDir =
    timelineIndex > 0 && activeHour?.windDirection ? activeHour.windDirection : current.windDirection;
  const displayHumidity =
    timelineIndex > 0 && typeof activeHour?.humidity === 'number'
      ? activeHour.humidity
      : current.humidity;
  const displayRainProb =
    timelineIndex > 0 && typeof activeHour?.rainProb === 'number'
      ? activeHour.rainProb
      : current.precipitationProbability;

  const obsStatus =
    current.observationStatus ||
    (current.isLive ? 'LIVE' : typeof current.temp === 'number' ? 'RECENT' : 'UNAVAILABLE');
  const statusColorClass =
    obsStatus === 'LIVE'
      ? 'text-[#22C7A0]'
      : obsStatus === 'RECENT'
      ? 'text-[#35C7E8]'
      : obsStatus === 'LOADING' || obsStatus === 'STALE'
      ? 'text-[#F59E0B]'
      : 'text-[#EF4444]';

  const targetAnalyzeTab: MainNavTab =
    activeLayer === 'radar'
      ? 'radar'
      : activeLayer === 'aqi'
      ? 'aqi'
      : activeLayer === 'warnings'
      ? 'warnings'
      : activeLayer === 'cyclones'
      ? 'cyclone-tracker'
      : activeLayer === 'agromet'
      ? 'agromet'
      : 'weather';

  const handleAnchorInspectedState = () => {
    if (!inspectedFeature?.stateName) return;
    const matched =
      locationService.findLocationByName(inspectedFeature.title) ||
      locationService.findLocationsByState(inspectedFeature.stateName)[0];
    if (matched) {
      onSelectLocation(matched);
      flyCameraTo(matched.lat, matched.lng, 2.95);
    }
  };

  return (
    <>
      {/* Desktop / Tablet Right-Edge Collapsible HUD */}
      <aside
        aria-label="Current Location Atmospheric HUD"
        className="hidden md:flex fixed right-3 top-[68px] z-30 flex-col items-end gap-2 pointer-events-none"
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="pointer-events-auto spatial-hud-surface rounded-xl px-3 min-h-[40px] flex items-center gap-2 text-xs text-[#F3F6FA] hover:border-[#38536A] cursor-pointer spatial-focus-ring"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#35C7E8]" />
            <span className="font-mono font-semibold tabular-nums">
              {typeof displayTemp === 'number' && Number.isFinite(displayTemp) ? `${Math.round(displayTemp)}°C` : '—'}
            </span>
            <span className="text-[#8295A8] truncate max-w-[110px]">
              {selectedLocation.city || selectedLocation.displayName}
            </span>
          </button>
        ) : (
          <div className="pointer-events-auto w-[280px] spatial-hud-surface rounded-xl p-3.5 flex flex-col gap-3">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] text-[#35C7E8] font-medium">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{selectedLocation.state}</span>
                </div>
                <h2 className="text-sm font-bold text-[#F3F6FA] truncate mt-0.5">
                  {selectedLocation.city || selectedLocation.displayName}
                </h2>
                <div className="text-[10px] font-mono text-[#8295A8] tabular-nums">
                  {selectedLocation.lat.toFixed(2)}°N · {selectedLocation.lng.toFixed(2)}°E
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                aria-label="Collapse weather HUD"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#101F2E] cursor-pointer shrink-0 spatial-focus-ring"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Temperature & Condition */}
            <div className="flex items-baseline justify-between gap-2 pb-2.5 border-b border-[#26394B]">
              <div className="text-3xl font-bold font-mono text-[#F3F6FA] tabular-nums tracking-tight">
                {typeof displayTemp === 'number' && Number.isFinite(displayTemp) ? `${Math.round(displayTemp)}°C` : '—'}
              </div>
              <div className="text-right min-w-0">
                <div className="text-xs font-medium text-[#B5C3D1] truncate">
                  {displayCond || (obsStatus === 'LOADING' ? 'Syncing…' : 'Unavailable')}
                </div>
                <div className="text-[10px] text-[#8295A8] tabular-nums">
                  {timelineIndex > 0 && activeHour
                    ? `Forecast ${activeHour.time}`
                    : current.lastUpdated
                    ? `Observed ${current.lastUpdated}`
                    : 'Awaiting observation'}
                </div>
              </div>
            </div>

            {/* Compact 4-Metric Matrix */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <div className="text-[10px] text-[#8295A8] uppercase tracking-wider">Wind</div>
                <div className="font-mono font-semibold text-[#F3F6FA] tabular-nums">
                  {typeof displayWind === 'number' && Number.isFinite(displayWind)
                    ? `${Math.round(displayWind)} km/h ${displayWindDir || ''}`.trim()
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8295A8] uppercase tracking-wider">Rain Prob</div>
                <div className="font-mono font-semibold text-[#F3F6FA] tabular-nums">
                  {typeof displayRainProb === 'number' && Number.isFinite(displayRainProb)
                    ? `${Math.round(displayRainProb)}%`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8295A8] uppercase tracking-wider">Humidity</div>
                <div className="font-mono font-semibold text-[#F3F6FA] tabular-nums">
                  {typeof displayHumidity === 'number' && Number.isFinite(displayHumidity)
                    ? `${Math.round(displayHumidity)}%`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8295A8] uppercase tracking-wider">AQI (US/NAQI)</div>
                <div className="font-mono font-semibold text-[#F3F6FA] tabular-nums">
                  {typeof current.aqiIndex === 'number'
                    ? current.aqiIndex
                    : typeof current.aqi === 'number'
                    ? current.aqi
                    : '—'}
                </div>
              </div>
            </div>

            {/* Provenance line */}
            <div className="text-[10px] text-[#8295A8] leading-snug pt-2 border-t border-[#26394B] flex items-center justify-between gap-2">
              <span className="truncate">{current.dataSource || current.source || 'Open-Meteo / IMD'}</span>
              <span className={`font-mono shrink-0 ${statusColorClass}`}>{obsStatus}</span>
            </div>

            {/* Bridge Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onInspectInAnalyze(targetAnalyzeTab)}
                className="flex-1 min-h-[40px] px-3 rounded-lg bg-[#35C7E8]/15 border border-[#35C7E8]/40 text-xs font-semibold text-[#35C7E8] hover:bg-[#35C7E8]/25 flex items-center justify-center gap-1 transition-colors cursor-pointer spatial-focus-ring"
              >
                <span>Open Analyze</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onOpenAskMausam}
                className="min-h-[40px] px-3 rounded-lg bg-[#08131F] border border-[#26394B] text-xs font-medium text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A] transition-colors cursor-pointer spatial-focus-ring"
              >
                Brief
              </button>
            </div>
          </div>
        )}

        {/* Contextual Spatial Feature Inspector Card (Appears when user clicks any State or DWR marker on 3D globe) */}
        {inspectedFeature && (
          <div className="pointer-events-auto w-[280px] spatial-hud-surface-elevated rounded-xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#35C7E8]">
                  {inspectedFeature.kind === 'radar' ? 'Doppler Radar Station' : 'Regional Inspection'}
                </span>
                <h3 className="text-sm font-bold text-[#F3F6FA] truncate">{inspectedFeature.title}</h3>
                <div className="text-[11px] text-[#B5C3D1] truncate">{inspectedFeature.subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedFeature(null)}
                aria-label="Close spatial feature inspector"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#101F2E] cursor-pointer shrink-0 spatial-focus-ring"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {inspectedFeature.metrics.slice(0, 4).map((m) => (
                <div key={m.label} className="bg-[#08131F] rounded-lg px-2 py-1.5 border border-[#26394B]">
                  <div className="text-[10px] text-[#8295A8]">{m.label}</div>
                  <div className="font-mono font-semibold text-[#F3F6FA] tabular-nums truncate">{m.value}</div>
                </div>
              ))}
            </div>

            {inspectedFeature.warningMessage && (
              <p className="text-[11px] text-[#B5C3D1] leading-snug">{inspectedFeature.warningMessage}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              {inspectedFeature.kind === 'state' && inspectedFeature.stateName && (
                <button
                  type="button"
                  onClick={handleAnchorInspectedState}
                  className="flex-1 min-h-[36px] px-2.5 rounded-lg bg-[#35C7E8] text-[#07111D] text-xs font-semibold hover:opacity-95 cursor-pointer spatial-focus-ring"
                >
                  Anchor Location
                </button>
              )}
              {inspectedFeature.kind === 'radar' && (
                <button
                  type="button"
                  onClick={() => onInspectInAnalyze('radar')}
                  className="flex-1 min-h-[36px] px-2.5 rounded-lg bg-[#35C7E8] text-[#07111D] text-xs font-semibold hover:opacity-95 cursor-pointer spatial-focus-ring"
                >
                  Radar Scope →
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Viewport: Compact Floating Summary + Expandable Bottom Sheet */}
      <div className="md:hidden fixed left-2.5 right-2.5 bottom-[96px] z-30 pointer-events-none flex flex-col gap-2">
        <div className="pointer-events-auto spatial-hud-surface rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg font-bold font-mono text-[#F3F6FA] tabular-nums">
              {typeof displayTemp === 'number' && Number.isFinite(displayTemp) ? `${Math.round(displayTemp)}°C` : '—'}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#F3F6FA] truncate">
                {inspectedFeature ? inspectedFeature.title : selectedLocation.city || selectedLocation.displayName}
              </div>
              <div className="text-[10px] text-[#B5C3D1] truncate tabular-nums">
                {displayCond || 'Unavailable'} · Wind{' '}
                {typeof displayWind === 'number' && Number.isFinite(displayWind) ? `${Math.round(displayWind)} km/h` : '—'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onInspectInAnalyze(targetAnalyzeTab)}
              className="px-3 min-h-[44px] rounded-lg bg-[#35C7E8]/15 border border-[#35C7E8]/40 text-xs font-semibold text-[#35C7E8] cursor-pointer spatial-focus-ring"
            >
              Analyze
            </button>
            <button
              type="button"
              onClick={() => setIsMobileSheetOpen((v) => !v)}
              aria-label="Toggle weather details sheet"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#08131F] border border-[#26394B] text-[#B5C3D1] cursor-pointer spatial-focus-ring"
            >
              {isMobileSheetOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isMobileSheetOpen && (
          <div className="pointer-events-auto spatial-hud-surface-elevated rounded-xl p-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-[10px] text-[#8295A8]">Humidity</div>
              <div className="font-mono font-semibold text-[#F3F6FA] tabular-nums">
                {typeof displayHumidity === 'number' && Number.isFinite(displayHumidity)
                  ? `${Math.round(displayHumidity)}%`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8295A8]">Rain Prob</div>
              <div className="font-mono font-semibold text-[#F3F6FA] tabular-nums">
                {typeof displayRainProb === 'number' && Number.isFinite(displayRainProb)
                  ? `${Math.round(displayRainProb)}%`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8295A8]">AQI</div>
              <div className="font-mono font-semibold text-[#F3F6FA] tabular-nums">
                {typeof current.aqiIndex === 'number'
                  ? current.aqiIndex
                  : typeof current.aqi === 'number'
                  ? current.aqi
                  : '—'}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
