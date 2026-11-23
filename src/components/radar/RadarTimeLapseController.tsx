import React, { useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  Repeat,
  Radar,
  Wind,
  Loader2,
} from 'lucide-react';
import { RadarFrame, RadarMotionVector, RadarDataStatus } from '../../services/radarService';
import { VALID_PLAYBACK_SPEEDS, type PlaybackSpeed } from '../../hooks/useFramePlayback';

export type RadarTimeSpan = '1h' | '3h' | '6h';

export interface RadarTimeLapseControllerProps {
  frames: RadarFrame[];
  activeFrameIndex: number;
  onChangeFrame: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset?: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: PlaybackSpeed) => void;
  loop?: boolean;
  onToggleLoop?: () => void;
  timeSpan?: RadarTimeSpan;
  onChangeTimeSpan?: (span: RadarTimeSpan) => void;
  motionVector?: RadarMotionVector;
  dataStatus?: RadarDataStatus;
  isFrameLoading?: boolean;
  className?: string;
  isCollapsible?: boolean;
  initialCollapsed?: boolean;
}

function getFrameKind(frame: RadarFrame | undefined): 'OBSERVED' | 'NOWCAST' | 'UNAVAILABLE' {
  if (!frame || !frame.time || !Number.isFinite(frame.time)) return 'UNAVAILABLE';
  if (typeof frame.ageMinutes === 'number' && frame.ageMinutes < 0) return 'NOWCAST';
  if (frame.relativeLabel && frame.relativeLabel.trim().startsWith('+')) return 'NOWCAST';
  return 'OBSERVED';
}

function shortClockLabel(frame: RadarFrame | undefined): string {
  if (!frame) return '—';
  if (frame.formattedTime && frame.formattedTime.trim()) {
    return frame.formattedTime.split(',')[0].trim();
  }
  if (frame.time && Number.isFinite(frame.time)) {
    return (
      new Date(frame.time * 1000).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    );
  }
  return '—';
}

export const RadarTimeLapseController: React.FC<RadarTimeLapseControllerProps> = ({
  frames,
  activeFrameIndex,
  onChangeFrame,
  isPlaying,
  onTogglePlay,
  onReset,
  playbackSpeed,
  onChangeSpeed,
  loop = true,
  onToggleLoop,
  timeSpan = '6h',
  onChangeTimeSpan,
  motionVector,
  dataStatus = 'RECENT',
  isFrameLoading = false,
  className = '',
  isCollapsible = true,
  initialCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(initialCollapsed);

  const safeIndex =
    frames.length > 0 ? Math.max(0, Math.min(activeFrameIndex, frames.length - 1)) : 0;
  const currentFrame = frames[safeIndex];
  const firstFrame = frames[0];
  const midFrame = frames.length > 2 ? frames[Math.floor(frames.length / 2)] : undefined;
  const lastFrame = frames[frames.length - 1];
  const isLatest = frames.length > 0 && safeIndex === frames.length - 1;
  const isEarliest = safeIndex === 0;
  const canPlay = frames.length > 1;
  const frameKind = getFrameKind(currentFrame);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.code === 'Space' && canPlay) {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === 'ArrowLeft' && canPlay) {
        e.preventDefault();
        onChangeFrame(safeIndex <= 0 ? frames.length - 1 : safeIndex - 1);
      } else if (e.code === 'ArrowRight' && canPlay) {
        e.preventDefault();
        onChangeFrame(safeIndex >= frames.length - 1 ? 0 : safeIndex + 1);
      } else if (e.code === 'Home' && canPlay) {
        e.preventDefault();
        onChangeFrame(0);
      } else if (e.code === 'End' && canPlay) {
        e.preventDefault();
        onChangeFrame(frames.length - 1);
      }
    },
    [safeIndex, frames.length, canPlay, onChangeFrame, onTogglePlay]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!frames || frames.length === 0) {
    return null;
  }

  const progressPercent =
    frames.length > 1 ? (safeIndex / (frames.length - 1)) * 100 : 100;

  const handleContainerClick = (e: React.MouseEvent) => e.stopPropagation();
  const handleContainerMouseDown = (e: React.MouseEvent) => e.stopPropagation();

  const latestLabel =
    getFrameKind(lastFrame) === 'NOWCAST'
      ? `Nowcast (${shortClockLabel(lastFrame)})`
      : dataStatus === 'LIVE'
      ? `Latest (${shortClockLabel(lastFrame)})`
      : shortClockLabel(lastFrame);

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
            disabled={!canPlay}
            title={isPlaying ? 'Pause Animation [Space]' : 'Play Radar Loop [Space]'}
            className={`min-h-[34px] px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 m-focus-ring whitespace-nowrap ${
              isPlaying
                ? 'bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0B0D10]'
                : 'bg-[var(--m-accent)] hover:brightness-110 text-[var(--m-on-accent)]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(safeIndex <= 0 ? frames.length - 1 : safeIndex - 1)}
            disabled={!canPlay}
            title="Previous Frame [Left Arrow]"
            aria-label="Previous Frame"
            className="w-8 h-8 rounded-md bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(safeIndex >= frames.length - 1 ? 0 : safeIndex + 1)}
            disabled={!canPlay}
            title="Next Frame [Right Arrow]"
            aria-label="Next Frame"
            className="w-8 h-8 rounded-md bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 truncate">
          <div className="flex items-center gap-1.5 font-mono text-[11px] truncate tabular-nums">
            <span className="text-[var(--m-text-muted)] hidden sm:inline">
              {safeIndex + 1}/{frames.length}
            </span>
            <strong className="text-[var(--m-text-primary)]">
              {shortClockLabel(currentFrame)}
            </strong>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                frameKind === 'NOWCAST'
                  ? 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/35'
                  : 'bg-[#10B981]/15 text-[#6EE7B7] border-[#10B981]/35'
              }`}
            >
              {frameKind}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-[var(--m-text-muted)] hidden sm:inline tabular-nums">
            {playbackSpeed}×
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-8 h-8 rounded-md bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-[var(--m-accent)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer"
            title="Expand Time-Lapse Console"
            aria-label="Expand Time-Lapse Console"
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
      aria-label="Radar Time-Lapse Playback Workstation"
    >
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--m-border)]">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[11px] font-semibold text-[var(--m-accent)] whitespace-nowrap">
            <Radar className="w-3.5 h-3.5 shrink-0" />
            <span>Radar Time-Lapse</span>
          </div>

          <span
            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider whitespace-nowrap ${
              frameKind === 'NOWCAST'
                ? 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40'
                : frameKind === 'OBSERVED'
                ? 'bg-[#10B981]/15 text-[#6EE7B7] border-[#10B981]/35'
                : 'bg-[var(--m-surface-1)] text-[var(--m-text-muted)] border-[var(--m-border)]'
            }`}
          >
            {frameKind}
          </span>

          {onChangeTimeSpan && (
            <div className="flex items-center bg-[var(--m-surface-1)] p-0.5 rounded border border-[var(--m-border)]">
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
                  title={`Filter radar history window to last ${span.replace('h', ' hours')}`}
                >
                  {span.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isFrameLoading && (
            <Loader2
              className="w-3.5 h-3.5 text-[var(--m-accent)] animate-spin shrink-0"
              aria-label="Loading radar frame tiles"
            />
          )}
          <div className="text-[11px] font-mono text-[var(--m-text-muted)] hidden sm:inline tabular-nums whitespace-nowrap">
            Frame <span className="font-bold text-[var(--m-text-primary)]">{safeIndex + 1}</span>/
            <span className="font-bold text-[var(--m-text-primary)]">{frames.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--m-surface-1)] border border-[var(--m-border)]">
            <span className="font-mono font-bold text-[var(--m-text-primary)] text-[11px] tabular-nums whitespace-nowrap">
              {shortClockLabel(currentFrame)}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono whitespace-nowrap ${
                frameKind === 'NOWCAST'
                  ? 'bg-[#F59E0B]/15 text-[#FCD34D] border border-[#F59E0B]/35'
                  : isLatest
                  ? 'bg-[#22C7A0]/15 text-[#6EE7B7] border border-[#22C7A0]/35'
                  : 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35'
              }`}
            >
              {currentFrame.relativeLabel ||
                (isLatest ? 'LATEST' : `${currentFrame.ageMinutes}m ago`)}
            </span>
          </div>

          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="w-7 h-7 rounded hover:bg-[var(--m-surface-1)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              title="Minimize playback bar"
              aria-label="Minimize playback bar"
              aria-expanded={true}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Timeline Slider & True Frame Timestamps */}
      <div className="py-2">
        <div className="relative flex flex-col gap-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={Math.max(0, frames.length - 1)}
              value={safeIndex}
              disabled={!canPlay}
              onChange={(e) => onChangeFrame(Number(e.target.value))}
              aria-label="Radar time-lapse progression timeline"
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[var(--m-surface-1)] border border-[var(--m-border)] accent-[var(--m-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--m-focus)] disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, #C5A46D 0%, #C5A46D ${progressPercent}%, #111314 ${progressPercent}%, #111314 100%)`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[9.5px] font-mono text-[var(--m-text-muted)] pt-0.5 px-0.5 select-none tabular-nums gap-2">
            <button
              type="button"
              onClick={() => onChangeFrame(0)}
              className="text-[var(--m-accent)] font-semibold hover:underline cursor-pointer truncate"
              title="Jump to first available frame"
            >
              {shortClockLabel(firstFrame)}
            </button>
            {midFrame && (
              <span className="hidden sm:inline text-[var(--m-text-secondary)] truncate">
                {shortClockLabel(midFrame)}
              </span>
            )}
            <button
              type="button"
              onClick={() => onChangeFrame(frames.length - 1)}
              className="text-[#6EE7B7] font-semibold hover:underline cursor-pointer truncate text-right"
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
            onClick={() => (onReset ? onReset() : onChangeFrame(0))}
            disabled={isEarliest && !isPlaying}
            title="Reset to first frame [Home]"
            aria-label="Reset to first frame"
            className="w-8 h-8 rounded bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(safeIndex <= 0 ? frames.length - 1 : safeIndex - 1)}
            disabled={!canPlay}
            title="Previous frame [Left Arrow]"
            aria-label="Previous frame"
            className="w-8 h-8 rounded bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!canPlay}
            title={isPlaying ? 'Pause Time-Lapse [Space]' : 'Play Radar Loop [Space]'}
            className={`h-8 px-3 rounded font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap ${
              isPlaying
                ? 'bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0B0D10]'
                : 'bg-[var(--m-accent)] hover:brightness-110 text-[var(--m-on-accent)]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play Loop'}</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(safeIndex >= frames.length - 1 ? 0 : safeIndex + 1)}
            disabled={!canPlay}
            title="Next frame [Right Arrow]"
            aria-label="Next frame"
            className="w-8 h-8 rounded bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(frames.length - 1)}
            disabled={!canPlay || isLatest}
            title="Jump to Latest Scan [End]"
            aria-label="Jump to latest scan"
            className="w-8 h-8 rounded bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-white border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Radar playback speed"
            className="flex items-center bg-[var(--m-surface-1)] p-0.5 rounded border border-[var(--m-border)]"
          >
            {VALID_PLAYBACK_SPEEDS.map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSpeed(spd)}
                aria-pressed={playbackSpeed === spd}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer tabular-nums whitespace-nowrap ${
                  playbackSpeed === spd
                    ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] font-bold'
                    : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                }`}
                title={`Play time-lapse at ${spd}× speed`}
              >
                {spd}×
              </button>
            ))}
          </div>

          {onToggleLoop && (
            <button
              type="button"
              onClick={onToggleLoop}
              aria-pressed={loop}
              title={loop ? 'Continuous Loop Enabled' : 'Loop Disabled (Stops at latest frame)'}
              className={`h-7 px-2 rounded text-[10px] font-bold flex items-center gap-1 transition-colors border cursor-pointer whitespace-nowrap ${
                loop
                  ? 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/45'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-muted)] border-[var(--m-border)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span className="hidden sm:inline">{loop ? 'Loop' : 'Once'}</span>
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
            <span className="font-mono text-[var(--m-text-primary)] bg-[var(--m-surface-1)] px-1.5 py-0.5 rounded border border-[var(--m-border)] tabular-nums">
              Heading {motionVector.compassDir} ({motionVector.azimuthDeg}°) @ {motionVector.speedKmh} km/h
            </span>
            <span className="text-[var(--m-text-secondary)] hidden lg:inline">
              · {motionVector.stormDescription}
            </span>
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
