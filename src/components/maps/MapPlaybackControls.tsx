import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  Clock,
  Loader2,
  FastForward,
} from 'lucide-react';
import {
  VALID_PLAYBACK_SPEEDS,
  type FramePlaybackController,
  type PlaybackSpeed,
} from '../../hooks/useFramePlayback';

export interface MapPlaybackControlsProps<T> {
  playback: FramePlaybackController<T>;
  currentTimestampLabel: string;
  firstTimestampLabel?: string;
  lastTimestampLabel?: string;
  frameKindBadge?: string;
  frameDetail?: string;
  sourceLabel?: string;
  isFrameLoading?: boolean;
  emptyMessage?: string;
  compact?: boolean;
  className?: string;
}

const BADGE_STYLES: Record<string, string> = {
  OBSERVED: 'bg-[#10B981]/15 text-[#6EE7B7] border-[#10B981]/35',
  CURRENT: 'bg-[#10B981]/15 text-[#6EE7B7] border-[#10B981]/35',
  NOWCAST: 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/35',
  FORECAST: 'bg-[#38BDF8]/15 text-[#7DD3FC] border-[#38BDF8]/35',
  'MODEL VALID': 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35',
  HISTORICAL: 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] border-[var(--m-border)]',
  UNAVAILABLE: 'bg-[var(--m-surface-1)] text-[var(--m-text-muted)] border-[var(--m-border)]',
};

export function MapPlaybackControls<T>({
  playback,
  currentTimestampLabel,
  firstTimestampLabel,
  lastTimestampLabel,
  frameKindBadge,
  frameDetail,
  sourceLabel,
  isFrameLoading = false,
  emptyMessage = 'Time-lapse frames unavailable for this layer.',
  compact = false,
  className = '',
}: MapPlaybackControlsProps<T>) {
  const {
    currentIndex,
    frameCount,
    isPlaying,
    speed,
    loop,
    canPlay,
    togglePlay,
    next,
    previous,
    reset,
    jumpToLatest,
    seek,
    changeSpeed,
    toggleLoop,
  } = playback;

  if (frameCount === 0) {
    return (
      <div
        role="region"
        aria-label="Map Timeline Playback Controls"
        className={`rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-[var(--m-text-muted)] ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 shrink-0 text-[var(--m-text-muted)]" />
          <span className="truncate">{emptyMessage}</span>
        </div>
        {sourceLabel && (
          <span className="font-mono text-[10px] shrink-0 hidden sm:inline">{sourceLabel}</span>
        )}
      </div>
    );
  }

  const badgeTone =
    (frameKindBadge && BADGE_STYLES[frameKindBadge.toUpperCase()]) ||
    BADGE_STYLES['MODEL VALID'];

  return (
    <div
      role="region"
      aria-label="Map Timeline Playback Controls"
      className={`rounded-xl bg-[var(--m-surface-inset)]/95 backdrop-blur-md border border-[var(--m-border)] ${
        compact ? 'p-2.5 gap-2' : 'p-3 sm:p-3.5 gap-2.5'
      } flex flex-col ${className}`}
    >
      {/* Top row: Transport buttons + Speed + Loop + Current Timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={reset}
            disabled={currentIndex === 0 && !isPlaying}
            aria-label="Reset playback to first frame"
            title="Reset to first frame"
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={previous}
            disabled={!canPlay}
            aria-label="Previous frame"
            title="Previous frame"
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!canPlay}
            aria-label={isPlaying ? 'Pause loop' : 'Play loop'}
            title={canPlay ? (isPlaying ? 'Pause' : 'Play') : 'Requires at least 2 frames to animate'}
            className={`w-11 h-10 sm:w-10 sm:h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed m-focus-ring ${
              isPlaying
                ? 'bg-[#F59E0B] text-[#0B0D10] hover:bg-[#FBBF24]'
                : 'bg-[var(--m-accent)] text-[var(--m-on-accent)] hover:brightness-110'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={next}
            disabled={!canPlay}
            aria-label="Next frame"
            title="Next frame"
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={jumpToLatest}
            disabled={!canPlay || currentIndex === frameCount - 1}
            aria-label="Jump to latest frame"
            title="Jump to latest frame"
            className="hidden sm:inline-flex items-center justify-center h-9 px-2 rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--m-border)] text-[10px] font-mono font-semibold text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer whitespace-nowrap m-focus-ring"
          >
            <FastForward className="w-3.5 h-3.5 mr-1" />
            Latest
          </button>
        </div>

        {/* Center/Right: Timestamp & provenance */}
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial sm:justify-end">
          {isFrameLoading && (
            <Loader2
              className="w-3.5 h-3.5 text-[var(--m-accent)] animate-spin shrink-0"
              aria-label="Loading frame tiles"
            />
          )}
          {frameKindBadge && (
            <span
              className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${badgeTone}`}
            >
              {frameKindBadge}
            </span>
          )}
          <div className="text-left sm:text-right min-w-0">
            <div className="text-xs font-mono font-semibold tabular-nums text-[var(--m-text-primary)] truncate">
              {currentTimestampLabel}
            </div>
            {frameDetail && (
              <div className="text-[10px] font-mono text-[var(--m-text-muted)] truncate">
                {frameDetail}
              </div>
            )}
          </div>
        </div>

        {/* Speed & Loop controls */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
          <div
            role="group"
            aria-label="Playback speed"
            className="inline-flex items-center bg-[var(--m-surface-1)] p-0.5 rounded-lg border border-[var(--m-border)]"
          >
            {VALID_PLAYBACK_SPEEDS.map((s: PlaybackSpeed) => {
              const active = speed === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSpeed(s)}
                  aria-pressed={active}
                  className={`h-7 px-2 rounded-md text-[10px] font-mono font-semibold tabular-nums transition-colors cursor-pointer whitespace-nowrap m-focus-ring ${
                    active
                      ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                      : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                  }`}
                >
                  {s}×
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={toggleLoop}
            aria-pressed={loop}
            title={loop ? 'Looping enabled (wraps to first frame)' : 'Looping off (stops at last frame)'}
            className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-[10px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap m-focus-ring ${
              loop
                ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/40 text-[var(--m-accent)]'
                : 'bg-[var(--m-surface-1)] border-[var(--m-border)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{loop ? 'Loop' : 'Once'}</span>
          </button>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, frameCount - 1)}
          step={1}
          value={currentIndex}
          disabled={!canPlay}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Timeline frame scrubber"
          aria-valuemin={1}
          aria-valuemax={frameCount}
          aria-valuenow={currentIndex + 1}
          aria-valuetext={`${currentTimestampLabel} (${currentIndex + 1} of ${frameCount})`}
          className="w-full h-2 rounded-lg accent-[var(--m-accent)] cursor-pointer disabled:opacity-50"
        />
        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-[var(--m-text-muted)] gap-2">
          <span className="truncate">{firstTimestampLabel || 'Start'}</span>
          <span className="text-[var(--m-text-secondary)] font-semibold shrink-0">
            Frame {currentIndex + 1} / {frameCount}
            {sourceLabel ? ` · ${sourceLabel}` : ''}
          </span>
          <span className="truncate text-right">{lastTimestampLabel || 'Latest'}</span>
        </div>
      </div>
    </div>
  );
}

export default MapPlaybackControls;
