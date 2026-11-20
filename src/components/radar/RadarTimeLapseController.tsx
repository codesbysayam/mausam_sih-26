import React, { useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  Repeat,
  Radar,
  Wind,
} from 'lucide-react';
import { RadarFrame, RadarMotionVector, RadarDataStatus } from '../../services/radarService';

export type RadarTimeSpan = '1h' | '3h' | '6h';

export interface RadarTimeLapseControllerProps {
  frames: RadarFrame[];
  activeFrameIndex: number;
  onChangeFrame: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  loop?: boolean;
  onToggleLoop?: () => void;
  timeSpan?: RadarTimeSpan;
  onChangeTimeSpan?: (span: RadarTimeSpan) => void;
  motionVector?: RadarMotionVector;
  dataStatus?: RadarDataStatus;
  className?: string;
  isCollapsible?: boolean;
  initialCollapsed?: boolean;
}

export const RadarTimeLapseController: React.FC<RadarTimeLapseControllerProps> = ({
  frames,
  activeFrameIndex,
  onChangeFrame,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  loop = true,
  onToggleLoop,
  timeSpan = '6h',
  onChangeTimeSpan,
  motionVector,
  dataStatus = 'RECENT',
  className = '',
  isCollapsible = true,
  initialCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(initialCollapsed);

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

  const handleContainerClick = (e: React.MouseEvent) => e.stopPropagation();
  const handleContainerMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  const latestLabel = dataStatus === 'LIVE' ? 'LATEST (LIVE)' : 'LATEST SCAN';

  if (isCollapsible && isCollapsed) {
    return (
      <div
        id="radar-time-lapse-collapsed-pill"
        onClick={handleContainerClick}
        onMouseDown={handleContainerMouseDown}
        onDoubleClick={(e) => e.stopPropagation()}
        className={`bg-[var(--m-surface-inset)]/95 backdrop-blur-md border border-[var(--m-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--m-text-primary)] shadow-xl flex items-center justify-between gap-2.5 max-w-[calc(100vw-24px)] ${className}`}
        role="region"
        aria-label="Radar Time-Lapse Playback Mini Bar"
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause Animation [Space]' : 'Play 6-Hour Time-Lapse [Space]'}
            className={`min-h-[32px] px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring ${
              isPlaying
                ? 'bg-[#F97316] hover:bg-[#EA580C] text-white'
                : 'bg-[var(--m-accent)] hover:bg-[#095c96] text-[var(--m-on-accent)]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">{isPlaying ? 'Pause' : 'Play 6h'}</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(Math.max(0, activeFrameIndex - 1))}
            disabled={isEarliest}
            title="Step Back 15 Minutes [Left Arrow]"
            aria-label="Step Back 15 Minutes"
            className="w-7 h-7 rounded-md bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(Math.min(frames.length - 1, activeFrameIndex + 1))}
            disabled={isLatest}
            title="Step Forward 15 Minutes [Right Arrow]"
            aria-label="Step Forward 15 Minutes"
            className="w-7 h-7 rounded-md bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 truncate">
          <div className="flex items-center gap-1.5 font-mono text-[11px] truncate tabular-nums">
            <span className="text-[var(--m-text-muted)] hidden sm:inline">
              F{activeFrameIndex + 1}/{frames.length}
            </span>
            <strong className="text-[var(--m-text-primary)]">
              {currentFrame.formattedTime.split(',')[0]}
            </strong>
            <span className="text-[var(--m-accent)] text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              {currentFrame.relativeLabel || (isLatest ? 'LATEST' : `${currentFrame.ageMinutes}m`)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-[var(--m-text-muted)] hidden sm:inline tabular-nums">
            {playbackSpeed}x
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-7 h-7 rounded-md bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-accent)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer"
            title="Expand 6-Hour Time-Lapse Console"
            aria-label="Expand 6-Hour Time-Lapse Console"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="radar-time-lapse-expanded-console"
      onClick={handleContainerClick}
      onMouseDown={handleContainerMouseDown}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`bg-[var(--m-surface-inset)]/95 backdrop-blur-md border border-[var(--m-border)] rounded-xl p-2.5 sm:p-3 text-xs text-[var(--m-text-primary)] shadow-xl ${className}`}
      role="region"
      aria-label="Radar 6-Hour Time-Lapse Playback Workstation"
    >
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--m-border)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[11px] font-semibold text-[var(--m-accent)]">
            <Radar className="w-3.5 h-3.5 shrink-0" />
            <span>6-Hour Radar Time-Lapse</span>
          </div>

          <span
            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
              isPlaying
                ? 'bg-[#F97316]/15 text-[#FDBA74] border-[#F97316]/40'
                : 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35'
            }`}
          >
            {isPlaying ? 'Animating' : 'Paused'}
          </span>

          {onChangeTimeSpan && (
            <div className="flex items-center bg-[var(--m-surface-inset)] p-0.5 rounded border border-[var(--m-border)]">
              {(['6h', '3h', '1h'] as RadarTimeSpan[]).map((span) => (
                <button
                  key={span}
                  type="button"
                  onClick={() => onChangeTimeSpan(span)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                    timeSpan === span
                      ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] font-bold'
                      : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                  }`}
                  title={`View weather progression over last ${span.replace('h', ' hours')}`}
                >
                  {span.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] font-mono text-[var(--m-text-muted)] hidden sm:inline tabular-nums">
            Frame <span className="font-bold text-[var(--m-text-primary)]">{activeFrameIndex + 1}</span>/
            <span className="font-bold text-[var(--m-text-primary)]">{frames.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
            <span className="font-mono font-bold text-[var(--m-text-primary)] text-[11px] tabular-nums">
              {currentFrame.formattedTime.split(',')[0]}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                isLatest
                  ? 'bg-[#22C7A0]/15 text-[#6EE7B7] border border-[#22C7A0]/35'
                  : 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35'
              }`}
            >
              {currentFrame.relativeLabel || (isLatest ? 'LATEST' : `${currentFrame.ageMinutes}m ago`)}
            </span>
          </div>

          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="w-6 h-6 rounded hover:bg-[var(--m-surface-1)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              title="Minimize playback bar"
              aria-label="Minimize playback bar"
              aria-expanded={true}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Timeline Slider & Tick Markers */}
      <div className="py-2">
        <div className="relative flex flex-col gap-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={activeFrameIndex}
              onChange={(e) => onChangeFrame(Number(e.target.value))}
              aria-label="6-hour radar time-lapse progression timeline"
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[var(--m-surface-inset)] border border-[var(--m-border)] accent-[var(--m-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--m-focus)]"
              style={{
                background: `linear-gradient(to right, #C5A46D 0%, #C5A46D ${progressPercent}%, #111314 ${progressPercent}%, #111314 100%)`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[9.5px] font-mono text-[var(--m-text-muted)] pt-0.5 px-1 select-none tabular-nums">
            <button
              type="button"
              onClick={() => onChangeFrame(0)}
              className="text-[var(--m-accent)] font-bold hover:underline cursor-pointer"
              title="Jump to -6 Hours"
            >
              -6h
            </button>
            <span className="hidden sm:inline">-5h</span>
            <span className="hidden xs:inline">-4h</span>
            <span className="text-[var(--m-text-secondary)] font-semibold">-3h</span>
            <span className="hidden xs:inline">-2h</span>
            <span className="hidden sm:inline">-1h</span>
            <button
              type="button"
              onClick={() => onChangeFrame(frames.length - 1)}
              className="text-[#6EE7B7] font-bold hover:underline cursor-pointer"
              title="Jump to latest available scan"
            >
              {latestLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--m-border)]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChangeFrame(0)}
            disabled={isEarliest}
            title="Jump to Start (6 Hours Ago) [Home]"
            aria-label="Jump to start"
            className="w-7 h-7 rounded bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(Math.max(0, activeFrameIndex - 1))}
            disabled={isEarliest}
            title="Step Back 15 Minutes [Left Arrow]"
            aria-label="Step back"
            className="w-7 h-7 rounded bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause Time-Lapse [Space]' : 'Play 6-Hour Time-Lapse Loop [Space]'}
            className={`px-3 py-1 rounded font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-[#F97316] hover:bg-[#EA580C] text-white'
                : 'bg-[var(--m-accent)] hover:bg-[#095c96] text-[var(--m-on-accent)]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play 6h Loop'}</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(Math.min(frames.length - 1, activeFrameIndex + 1))}
            disabled={isLatest}
            title="Step Forward 15 Minutes [Right Arrow]"
            aria-label="Step forward"
            className="w-7 h-7 rounded bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(frames.length - 1)}
            disabled={isLatest}
            title="Jump to Latest Scan [End]"
            aria-label="Jump to latest scan"
            className="w-7 h-7 rounded bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

          <span className="text-[9px] font-mono text-[var(--m-text-muted)] ml-1 hidden lg:inline">
            [Space] Play · [←/→] Step
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--m-text-muted)] uppercase tracking-wider font-semibold hidden md:inline">
            Speed:
          </span>
          <div className="flex items-center bg-[var(--m-surface-inset)] p-0.5 rounded border border-[var(--m-border)]">
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer tabular-nums ${
                  playbackSpeed === spd
                    ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] font-bold'
                    : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                }`}
                title={`Play time-lapse at ${spd}x speed`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {onToggleLoop && (
            <button
              type="button"
              onClick={onToggleLoop}
              title={loop ? 'Continuous Loop Enabled' : 'Loop Disabled (Stops at latest frame)'}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors border cursor-pointer ${
                loop
                  ? 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/45'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span className="hidden sm:inline">Loop</span>
            </button>
          )}
        </div>
      </div>

      {/* Motion Vector only rendered when genuinely computed and provided by backend */}
      {motionVector && (
        <div className="mt-2 pt-1.5 border-t border-[var(--m-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[9.5px] text-[var(--m-text-muted)]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[var(--m-accent)] font-bold flex items-center gap-1">
              <Wind className="w-3 h-3" />
              Storm Movement Vector:
            </span>
            <span className="font-mono text-[var(--m-text-primary)] bg-[var(--m-surface-inset)] px-1.5 py-0.5 rounded border border-[var(--m-border)] tabular-nums">
              Heading {motionVector.compassDir} ({motionVector.azimuthDeg}°) @ {motionVector.speedKmh} km/h
            </span>
            <span className="text-[var(--m-text-secondary)] hidden lg:inline">· {motionVector.stormDescription}</span>
          </div>

          <div className="text-[9px] font-mono text-[var(--m-text-muted)] shrink-0">
            RainViewer Global Mosaic + IMD DWR Network
          </div>
        </div>
      )}
    </div>
  );
};

export default RadarTimeLapseController;
