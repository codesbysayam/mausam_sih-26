import React, { useEffect, useCallback, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Compass,
  Wind,
  Gauge,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';
import { formatCoordinatePair } from '../../../shared/weatherContract';

export interface CycloneTimeLapseFrame {
  id: string;
  time: string;
  formattedTime: string;
  relativeTime: string;
  latitude: number;
  longitude: number;
  classification: string;
  windSpeed: string;
  centralPressure: string;
  locationName: string;
  isLive: boolean;
}

export interface CycloneTimeLapseControllerProps {
  frames: CycloneTimeLapseFrame[];
  activeFrameIndex: number;
  onChangeFrame: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  loop?: boolean;
  onToggleLoop?: () => void;
  className?: string;
  isCollapsible?: boolean;
  initialCollapsed?: boolean;
}

export const CycloneTimeLapseController: React.FC<CycloneTimeLapseControllerProps> = ({
  frames,
  activeFrameIndex,
  onChangeFrame,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  loop = true,
  onToggleLoop,
  className = '',
  isCollapsible = true,
  initialCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initialCollapsed);

  const currentFrame = frames[activeFrameIndex] || frames[frames.length - 1];
  const isLatest = activeFrameIndex === frames.length - 1;
  const isEarliest = activeFrameIndex === 0;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onChangeFrame(Math.max(0, activeFrameIndex - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onChangeFrame(Math.min(frames.length - 1, activeFrameIndex + 1));
      } else if (e.code === 'Home') {
        e.preventDefault();
        onChangeFrame(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        onChangeFrame(frames.length - 1);
      }
    },
    [activeFrameIndex, frames.length, onChangeFrame, onTogglePlay]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!frames || frames.length === 0) {
    return null;
  }

  const progressPercent =
    frames.length > 1 ? (activeFrameIndex / (frames.length - 1)) * 100 : 100;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`m-panel select-none overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#26394B] bg-[#08131F]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#35C7E8]/12 border border-[#35C7E8]/35 text-[#7DD3FC] text-[11px] font-mono font-semibold">
            <Radio className="w-3 h-3 text-[#35C7E8]" />
            <span>6-HOUR TRACK TIME-LAPSE</span>
          </div>
          <span className="text-[11px] font-mono text-[#8295A8] hidden md:inline">
            IMD Synoptic Surveillance
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 border tabular-nums ${
              currentFrame.isLive
                ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#FCA5A5]'
                : 'bg-[#101F2E] border-[#26394B] text-[#F3F6FA]'
            }`}
          >
            <span>{currentFrame.relativeTime}</span>
            <span className="text-[#B5C3D1] font-normal">({currentFrame.formattedTime})</span>
          </div>

          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-8 h-8 rounded-lg text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
              title={isCollapsed ? 'Expand Playback Controls' : 'Collapse Playback Controls'}
              aria-label={isCollapsed ? 'Expand Playback Controls' : 'Collapse Playback Controls'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3.5 sm:p-4 flex flex-col gap-3 font-mono text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2.5 border-b border-[#26394B] tabular-nums">
            <div className="flex items-center gap-1.5 text-[#F3F6FA]">
              <Compass className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span className="text-[11px] font-semibold">
                {formatCoordinatePair(currentFrame.latitude, currentFrame.longitude, 2)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[#FCD34D]">
              <Wind className="w-3.5 h-3.5 text-[#F97316]" />
              <span className="text-[11px] font-semibold">{currentFrame.windSpeed}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[#F3F6FA]">
              <Gauge className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span className="text-[11px] font-semibold">{currentFrame.centralPressure}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[#B5C3D1] truncate">
              <span className="text-[10px] text-[#8295A8] uppercase">Loc:</span>
              <span className="text-[11px] text-[#7DD3FC] truncate" title={currentFrame.locationName}>
                {currentFrame.locationName}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="relative w-full h-7 flex items-center">
              <div className="w-full h-2 bg-[#08131F] border border-[#26394B] rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-[#35C7E8] transition-all duration-100"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <input
                type="range"
                min={0}
                max={frames.length - 1}
                step={1}
                value={activeFrameIndex}
                onChange={(e) => onChangeFrame(parseInt(e.target.value, 10))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                aria-label="Cyclone track time-lapse timeline scrubber"
              />

              <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none z-10">
                {frames.map((frame, idx) => (
                  <div
                    key={frame.id}
                    className={`w-2.5 h-2.5 rounded-full border transition-transform ${
                      idx === activeFrameIndex
                        ? 'bg-[#F3F6FA] border-[#35C7E8] scale-125'
                        : idx < activeFrameIndex
                        ? 'bg-[#35C7E8] border-[#07111D]'
                        : 'bg-[#08131F] border-[#38536A]'
                    }`}
                    title={`${frame.relativeTime} (${frame.formattedTime})`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#8295A8] tabular-nums">
              <span>{frames[0]?.relativeTime} ({frames[0]?.formattedTime})</span>
              <span className="font-semibold text-[#F3F6FA]">
                {frames[frames.length - 1]?.relativeTime} ({frames[frames.length - 1]?.formattedTime})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChangeFrame(0)}
                disabled={isEarliest}
                className="w-9 h-9 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-[#B5C3D1] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
                title="Jump to Start"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onChangeFrame(Math.max(0, activeFrameIndex - 1))}
                disabled={isEarliest}
                className="w-9 h-9 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-[#B5C3D1] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
                title="Previous Frame"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                className={`px-3.5 min-h-[38px] rounded-lg border flex items-center justify-center gap-1.5 font-semibold transition-colors cursor-pointer m-focus-ring ${
                  isPlaying
                    ? 'bg-[#EF4444] hover:bg-[#DC2626] border-[#F87171] text-white'
                    : 'bg-[#0B72B9] hover:bg-[#095C96] border-[#35C7E8]/50 text-white'
                }`}
                title={isPlaying ? 'Pause Animation' : 'Play Animation'}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span className="text-xs">PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span className="text-xs">PLAY</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onChangeFrame(Math.min(frames.length - 1, activeFrameIndex + 1))}
                disabled={isLatest}
                className="w-9 h-9 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-[#B5C3D1] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
                title="Next Frame"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onChangeFrame(frames.length - 1)}
                disabled={isLatest}
                className="w-9 h-9 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-[#B5C3D1] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
                title="Jump to Latest"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onToggleLoop && (
                <button
                  type="button"
                  onClick={onToggleLoop}
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs transition-colors cursor-pointer m-focus-ring ${
                    loop
                      ? 'bg-[#35C7E8]/12 border-[#35C7E8]/45 text-[#7DD3FC]'
                      : 'bg-[#08131F] border-[#26394B] text-[#8295A8]'
                  }`}
                  title={loop ? 'Loop Enabled' : 'Loop Disabled'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex items-center bg-[#08131F] border border-[#26394B] rounded-lg p-0.5 tabular-nums">
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onChangeSpeed(spd)}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-[#0B72B9] text-white'
                        : 'text-[#8295A8] hover:text-[#F3F6FA]'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
