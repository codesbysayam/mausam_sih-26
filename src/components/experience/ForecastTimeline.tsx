// ====================================================================
// MAUSAM Persistent Forecast Timeline Dock
// Synchronizes bottom scrubber across real hourly forecast slots
// (or Doppler radar past/nowcast frames when Radar layer is active).
// ====================================================================

import React, { useEffect, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import type { HourlyForecastItem } from '../../types';
import type { RadarApiResponse } from '../../services/radarService';
import { useExperience } from '../../context/ExperienceContext';

interface ForecastTimelineProps {
  hourly: HourlyForecastItem[];
  radarData?: RadarApiResponse | null;
}

export const ForecastTimeline: React.FC<ForecastTimelineProps> = ({ hourly, radarData }) => {
  const {
    activeLayer,
    timelineIndex,
    setTimelineIndex,
    isTimelinePlaying,
    setIsTimelinePlaying,
  } = useExperience();

  const isRadarMode = activeLayer === 'radar' && (radarData?.pastFrames?.length || 0) > 0;

  const radarFrames = useMemo(() => {
    if (!isRadarMode || !radarData) return [];
    return [...(radarData.pastFrames || []), ...(radarData.nowcastFrames || [])];
  }, [isRadarMode, radarData]);

  const hourlySlots = useMemo(() => (hourly || []).slice(0, 24), [hourly]);
  const totalSlots = isRadarMode ? radarFrames.length : hourlySlots.length;
  const safeIdx = totalSlots > 0 ? Math.min(timelineIndex, totalSlots - 1) : 0;

  // Auto-advance playback when playing
  useEffect(() => {
    if (!isTimelinePlaying || totalSlots <= 1) return;
    const timer = setInterval(() => {
      setTimelineIndex((prev) => (prev + 1 >= totalSlots ? 0 : prev + 1));
    }, 1100);
    return () => clearInterval(timer);
  }, [isTimelinePlaying, totalSlots, setTimelineIndex]);

  const activeLabel = useMemo(() => {
    if (isRadarMode && radarFrames[safeIdx]) {
      const f = radarFrames[safeIdx];
      return {
        time: f.formattedTime || f.relativeLabel || 'Radar Scan',
        kind: (f.ageMinutes ?? 0) <= 0 ? 'NOWCAST' : 'OBSERVED',
        detail: f.relativeLabel || `${f.ageMinutes}m ago`,
      };
    }
    const h = hourlySlots[safeIdx];
    if (!h) {
      return {
        time: 'Now',
        kind: 'OBSERVED',
        detail: 'Waiting for forecast horizon',
      };
    }
    return {
      time: h.time,
      kind: safeIdx === 0 || h.isNow ? 'CURRENT' : 'FORECAST',
      detail: `${Math.round(h.temp)}°C · Rain ${Math.round(h.rainProb)}% · ${Math.round(h.windSpeed)} km/h`,
    };
  }, [isRadarMode, radarFrames, hourlySlots, safeIdx]);

  if (totalSlots === 0) {
    return (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 spatial-hud-surface rounded-xl px-4 py-2 text-xs text-[#7F93A8]">
        Forecast timeline waiting for atmospheric feed...
      </div>
    );
  }

  return (
    <section
      aria-label="Atmospheric Time Progression"
      className="fixed bottom-2.5 left-2.5 right-2.5 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(720px,calc(100vw-40px))] z-30 pointer-events-auto safe-area-bottom"
    >
      <div className="spatial-hud-surface rounded-xl px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* Playback Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setTimelineIndex((p) => (p > 0 ? p - 1 : totalSlots - 1))}
              aria-label="Previous time step"
              className="p-1.5 rounded-lg text-[#B8C7D9] hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsTimelinePlaying((v) => !v)}
              aria-label={isTimelinePlaying ? 'Pause atmospheric playback' : 'Play atmospheric playback'}
              className="w-7 h-7 rounded-lg bg-[#35C7E8] text-[#05101C] flex items-center justify-center hover:opacity-95 cursor-pointer"
            >
              {isTimelinePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={() => setTimelineIndex((p) => (p + 1) % totalSlots)}
              aria-label="Next time step"
              className="p-1.5 rounded-lg text-[#B8C7D9] hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            {safeIdx !== 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsTimelinePlaying(false);
                  setTimelineIndex(0);
                }}
                title="Jump to current observation"
                aria-label="Reset to Now"
                className="p-1.5 rounded-lg text-[#35C7E8] hover:bg-[#35C7E8]/15 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active Timestamp & Meteorological Status */}
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 ${
                activeLabel.kind === 'CURRENT' || activeLabel.kind === 'OBSERVED'
                  ? 'bg-[#26B982]/15 text-[#26B982]'
                  : 'bg-[#35C7E8]/15 text-[#35C7E8]'
              }`}
            >
              {activeLabel.kind}
            </span>
            <span className="font-semibold text-white tabular-nums shrink-0">{activeLabel.time}</span>
            <span className="text-[#B8C7D9] truncate hidden sm:inline tabular-nums">
              · {activeLabel.detail}
            </span>
          </div>
        </div>

        {/* Continuous Scrubber Slider */}
        <div className="flex items-center gap-2.5">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSlots - 1)}
            value={safeIdx}
            onChange={(e) => {
              setIsTimelinePlaying(false);
              setTimelineIndex(Number(e.target.value));
            }}
            aria-label="Scrub atmospheric timeline"
            className="w-full h-1.5 accent-[#35C7E8] cursor-pointer"
          />
          <span className="text-[10px] font-mono text-[#7F93A8] tabular-nums shrink-0">
            {safeIdx + 1}/{totalSlots}
          </span>
        </div>
      </div>
    </section>
  );
};
