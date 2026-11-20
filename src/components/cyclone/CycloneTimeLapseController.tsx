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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--m-border)] bg-[var(--m-surface-inset)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/35 text-[var(--m-accent)] text-[11px] font-mono font-semibold">
            <Radio className="w-3 h-3 text-[var(--m-accent)]" />
            <span>6-HOUR TRACK TIME-LAPSE</span>
          </div>
          <span className="text-[11px] font-mono text-[var(--m-text-muted)] hidden md:inline">
            IMD Synoptic Surveillance
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 border tabular-nums ${
              currentFrame.isLive
                ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/40 text-[var(--m-danger)]'
                : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-primary)]'
            }`}
          >
            <span>{currentFrame.relativeTime}</span>
            <span className="text-[var(--m-text-secondary)] font-normal">({currentFrame.formattedTime})</span>
          </div>

          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-8 h-8 rounded-lg text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2.5 border-b border-[var(--m-border)] tabular-nums">
            <div className="flex items-center gap-1.5 text-[var(--m-text-primary)]">
              <Compass className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span className="text-[11px] font-semibold">
                {formatCoordinatePair(currentFrame.latitude, currentFrame.longitude, 2)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[var(--m-watch)]">
              <Wind className="w-3.5 h-3.5 text-[var(--m-alert)]" />
              <span className="text-[11px] font-semibold">{currentFrame.windSpeed}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[var(--m-text-primary)]">
              <Gauge className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span className="text-[11px] font-semibold">{currentFrame.centralPressure}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[var(--m-text-secondary)] truncate">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase">Loc:</span>
              <span className="text-[11px] text-[var(--m-accent)] truncate" title={currentFrame.locationName}>
                {currentFrame.locationName}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="relative w-full h-7 flex items-center">
              <div className="w-full h-2 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-[var(--m-accent)] transition-all duration-100"
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
                        ? 'bg-[var(--m-text-primary)] border-[var(--m-accent)] scale-125'
                        : idx < activeFrameIndex
                        ? 'bg-[var(--m-accent)] border-[var(--m-border)]'
                        : 'bg-[var(--m-surface-inset)] border-[var(--m-border-strong)]'
                    }`}
                    title={`${frame.relativeTime} (${frame.formattedTime})`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[var(--m-text-muted)] tabular-nums">
              <span>{frames[0]?.relativeTime} ({frames[0]?.formattedTime})</span>
              <span className="font-semibold text-[var(--m-text-primary)]">
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
                className="w-9 h-9 rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
                title="Jump to Start"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onChangeFrame(Math.max(0, activeFrameIndex - 1))}
                disabled={isEarliest}
                className="w-9 h-9 rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
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
                    : 'bg-[var(--m-accent)] hover:bg-[var(--m-accent-hover)] border-[var(--m-accent)]/50 text-[var(--m-on-accent)]'
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
                className="w-9 h-9 rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
                title="Next Frame"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onChangeFrame(frames.length - 1)}
                disabled={isLatest}
                className="w-9 h-9 rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
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
                      ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/45 text-[var(--m-accent)]'
                      : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-muted)]'
                  }`}
                  title={loop ? 'Loop Enabled' : 'Loop Disabled'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex items-center bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-0.5 tabular-nums">
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onChangeSpeed(spd)}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                        : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
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
