import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type PlaybackSpeed = 0.5 | 1 | 1.5 | 2;

export type PlaybackStatus = 'unavailable' | 'idle' | 'playing' | 'paused' | 'ended';

export const VALID_PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [0.5, 1, 1.5, 2] as const;

export interface TimestampedFrame {
  id?: string | number;
  path?: string;
  time?: number | string | null;
  timestamp?: number | string | null;
}

export interface UseFramePlaybackOptions<T> {
  /** Ordered or unordered list of frames (automatically sorted chronologically if sortByTime !== false) */
  frames: readonly T[];
  /** Base interval at 1x speed in milliseconds (default: 900ms, min clamp: 120ms) */
  baseIntervalMs?: number;
  /** Optional extra hold duration on the final frame before looping back to index 0 (default: 0ms) */
  endDwellMs?: number;
  /** Initial playback speed (default: 1) */
  initialSpeed?: PlaybackSpeed;
  /** Initial loop state (default: true) */
  initialLoop?: boolean;
  /** Initial frame index or 'first' | 'latest' (default: 'first') */
  initialPosition?: number | 'first' | 'latest';
  /** Start playing automatically when >= 2 frames are ready (disabled automatically under prefers-reduced-motion) */
  autoPlay?: boolean;
  /** Changing this key cleanly pauses and resets playback (e.g. location/layer/timespan change) */
  resetKey?: string | number;
  /** Automatically sort frames chronologically using timestamp/time fields (default: true) */
  sortByTime?: boolean;
  /** Automatically pause playback when the browser tab becomes hidden (default: true) */
  pauseWhenHidden?: boolean;
  /** Pause playback automatically when user scrubs via seek() (default: false) */
  pauseOnSeek?: boolean;
  /** Optional custom stable frame key extractor for preserving position across live data refreshes */
  getFrameKey?: (frame: T, index: number) => string;
  /** Optional callback fired whenever the active index changes */
  onIndexChange?: (index: number, frame: T | null) => void;
}

export interface FramePlaybackController<T> {
  frames: T[];
  currentIndex: number;
  currentFrame: T | null;
  frameCount: number;
  isPlaying: boolean;
  status: PlaybackStatus;
  speed: PlaybackSpeed;
  intervalMs: number;
  loop: boolean;
  progress: number;
  canPlay: boolean;
  isAtStart: boolean;
  isAtEnd: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  stepBy: (delta: number) => void;
  reset: () => void;
  jumpToLatest: () => void;
  seek: (index: number) => void;
  changeSpeed: (speed: PlaybackSpeed) => void;
  setLoop: (nextLoop: boolean) => void;
  toggleLoop: () => void;
}

/**
 * Extracts a numeric epoch timestamp in milliseconds from a frame object if present.
 */
export function extractFrameEpochMs(frame: unknown): number | null {
  if (!frame || typeof frame !== 'object') return null;
  const candidate = frame as TimestampedFrame;
  const raw = candidate.timestamp ?? candidate.time;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Convert Unix seconds to milliseconds when below year 2286 threshold in seconds
    return raw < 1e11 ? raw * 1000 : raw;
  }

  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

/**
 * Extracts a deterministic identity key for a frame so live rolling-window refreshes
 * (such as new 10-minute radar sweeps) keep the playhead anchored to the same sweep.
 */
export function extractFrameKey(frame: unknown, fallbackIndex: number): string {
  if (frame && typeof frame === 'object') {
    const candidate = frame as TimestampedFrame;
    if (candidate.id !== undefined && candidate.id !== null && String(candidate.id).trim() !== '') {
      return `id:${String(candidate.id)}`;
    }
    const epoch = extractFrameEpochMs(candidate);
    if (epoch !== null && candidate.path) {
      return `t:${epoch}:p:${candidate.path}`;
    }
    if (epoch !== null) {
      return `t:${epoch}`;
    }
    if (typeof candidate.path === 'string' && candidate.path.trim() !== '') {
      return `p:${candidate.path}`;
    }
  }
  return `idx:${fallbackIndex}`;
}

/**
 * Sorts frames chronologically while preserving original order for frames without parseable timestamps.
 */
export function sortFramesChronologically<T>(frames: readonly T[]): T[] {
  if (frames.length <= 1) return [...frames];
  const decorated = frames.map((frame, originalIndex) => ({
    frame,
    originalIndex,
    epochMs: extractFrameEpochMs(frame),
  }));

  const hasAnyTimestamp = decorated.some((d) => d.epochMs !== null);
  if (!hasAnyTimestamp) return [...frames];

  decorated.sort((a, b) => {
    if (a.epochMs !== null && b.epochMs !== null && a.epochMs !== b.epochMs) {
      return a.epochMs - b.epochMs;
    }
    if (a.epochMs !== null && b.epochMs === null) return -1;
    if (a.epochMs === null && b.epochMs !== null) return 1;
    return a.originalIndex - b.originalIndex;
  });

  return decorated.map((d) => d.frame);
}

/**
 * Clamps a frame index safely to valid bounds.
 */
export function clampFrameIndex(index: number, frameCount: number): number {
  if (frameCount <= 0 || !Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.trunc(index), frameCount - 1));
}

/**
 * Computes interval duration for a validated playback speed.
 */
export function computePlaybackIntervalMs(
  speed: PlaybackSpeed,
  baseIntervalMs = 900
): number {
  const safeSpeed: PlaybackSpeed = VALID_PLAYBACK_SPEEDS.includes(speed) ? speed : 1;
  const safeBase = Number.isFinite(baseIntervalMs) && baseIntervalMs >= 120 ? baseIntervalMs : 900;
  return Math.max(120, Math.round(safeBase / safeSpeed));
}

/**
 * Pure single-step forward transition with explicit loop ON/OFF semantics.
 */
export function advanceFrameIndex(
  currentIndex: number,
  frameCount: number,
  loop: boolean
): { nextIndex: number; reachedEnd: boolean } {
  if (frameCount <= 1) {
    return { nextIndex: 0, reachedEnd: true };
  }
  const clamped = clampFrameIndex(currentIndex, frameCount);
  if (clamped + 1 < frameCount) {
    return { nextIndex: clamped + 1, reachedEnd: false };
  }
  if (loop) {
    return { nextIndex: 0, reachedEnd: false };
  }
  return { nextIndex: frameCount - 1, reachedEnd: true };
}

/**
 * Pure bidirectional step helper supporting arbitrary positive or negative offsets.
 */
export function stepFrameIndex(
  currentIndex: number,
  delta: number,
  frameCount: number,
  loop: boolean
): number {
  if (frameCount <= 1 || !Number.isFinite(delta) || delta === 0) {
    return clampFrameIndex(currentIndex, frameCount);
  }
  const clamped = clampFrameIndex(currentIndex, frameCount);
  const step = Math.trunc(delta);
  if (loop) {
    return ((clamped + step) % frameCount + frameCount) % frameCount;
  }
  return clampFrameIndex(clamped + step, frameCount);
}

function resolveInitialIndex(
  position: number | 'first' | 'latest' | undefined,
  frameCount: number
): number {
  if (frameCount <= 0) return 0;
  if (position === 'latest') return frameCount - 1;
  if (typeof position === 'number') return clampFrameIndex(position, frameCount);
  return 0;
}

/**
 * Reconciles the active frame index when the underlying frame list refreshes
 * (e.g., a new RainViewer sweep arrives and the oldest sweep expires) without losing
 * the user's selected timestamp.
 */
export function reconcilePlaybackIndex<T>(
  prevFrames: readonly T[],
  prevIndex: number,
  nextFrames: readonly T[],
  initialPosition?: number | 'first' | 'latest',
  getKey: (frame: T, index: number) => string = extractFrameKey
): number {
  if (nextFrames.length === 0) return 0;
  if (prevFrames.length === 0) {
    return resolveInitialIndex(initialPosition, nextFrames.length);
  }

  const clampedPrev = clampFrameIndex(prevIndex, prevFrames.length);
  const prevFrame = prevFrames[clampedPrev];
  if (prevFrame !== undefined) {
    const targetKey = getKey(prevFrame, clampedPrev);
    const matchedIdx = nextFrames.findIndex((frame, idx) => getKey(frame, idx) === targetKey);
    if (matchedIdx >= 0) {
      return matchedIdx;
    }
  }

  return clampFrameIndex(clampedPrev, nextFrames.length);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Reusable, cleanup-safe, stale-closure-free time-series frame playback hook
 * for all MAUSAM radar, forecast, and cyclone maps.
 */
export function useFramePlayback<T>(
  options: UseFramePlaybackOptions<T>
): FramePlaybackController<T> {
  const {
    frames: rawFrames,
    baseIntervalMs = 900,
    endDwellMs = 0,
    initialSpeed = 1,
    initialLoop = true,
    initialPosition = 'first',
    autoPlay = false,
    resetKey,
    sortByTime = true,
    pauseWhenHidden = true,
    pauseOnSeek = false,
    getFrameKey = extractFrameKey,
    onIndexChange,
  } = options;

  const orderedFrames = useMemo(
    () => (sortByTime ? sortFramesChronologically(rawFrames) : [...rawFrames]),
    [rawFrames, sortByTime]
  );

  const frameCount = orderedFrames.length;
  const canPlay = frameCount > 1;

  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    resolveInitialIndex(initialPosition, frameCount)
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(
    () => Boolean(autoPlay && canPlay && !prefersReducedMotion())
  );
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(
    VALID_PLAYBACK_SPEEDS.includes(initialSpeed) ? initialSpeed : 1
  );
  const [loop, setLoopState] = useState<boolean>(initialLoop);

  const intervalMs = computePlaybackIntervalMs(speed, baseIntervalMs);
  const safeEndDwellMs = Number.isFinite(endDwellMs) && endDwellMs > 0 ? Math.round(endDwellMs) : 0;

  // Refs prevent stale closures inside timers and guarantee a single active timer handle
  const isMountedRef = useRef<boolean>(true);
  const indexRef = useRef<number>(currentIndex);
  const loopRef = useRef<boolean>(loop);
  const frameCountRef = useRef<number>(frameCount);
  const orderedFramesRef = useRef<T[]>(orderedFrames);
  const prevFramesRef = useRef<T[]>(orderedFrames);
  const onIndexChangeRef = useRef(onIndexChange);
  const getFrameKeyRef = useRef(getFrameKey);
  const prevResetKeyRef = useRef(resetKey);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  indexRef.current = currentIndex;
  loopRef.current = loop;
  frameCountRef.current = frameCount;
  orderedFramesRef.current = orderedFrames;
  onIndexChangeRef.current = onIndexChange;
  getFrameKeyRef.current = getFrameKey;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const commitIndex = useCallback((nextIdx: number) => {
    if (!isMountedRef.current) return;
    const clamped = clampFrameIndex(nextIdx, frameCountRef.current);
    indexRef.current = clamped;
    setCurrentIndex(clamped);
    onIndexChangeRef.current?.(clamped, orderedFramesRef.current[clamped] ?? null);
  }, []);

  // Track mount status across React StrictMode double-invocations & unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  // Reset playback cleanly when location, layer, or timespan changes
  useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      clearTimer();
      setIsPlaying(false);
      setHasInteracted(false);
      prevFramesRef.current = orderedFramesRef.current;
      commitIndex(resolveInitialIndex(initialPosition, frameCountRef.current));
    }
  }, [resetKey, initialPosition, clearTimer, commitIndex]);

  // Reconcile index cleanly across live frame list updates (hydrating, rolling sweeps, shrinking)
  useEffect(() => {
    const prevFrames = prevFramesRef.current;
    prevFramesRef.current = orderedFrames;

    if (frameCount <= 1) {
      clearTimer();
      setIsPlaying(false);
      if (indexRef.current !== 0) {
        commitIndex(0);
      }
      return;
    }

    if (prevFrames !== orderedFrames) {
      const reconciled = reconcilePlaybackIndex(
        prevFrames,
        indexRef.current,
        orderedFrames,
        initialPosition,
        getFrameKeyRef.current
      );
      if (reconciled !== indexRef.current) {
        commitIndex(reconciled);
      }
    }
  }, [orderedFrames, frameCount, initialPosition, clearTimer, commitIndex]);

  // Pause automatically when browser tab is hidden to eliminate background timer drift
  useEffect(() => {
    if (!pauseWhenHidden || typeof document === 'undefined') return;
    const handleVisibility = () => {
      if (document.hidden) {
        clearTimer();
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pauseWhenHidden, clearTimer]);

  // Single recursive setTimeout loop — zero overlapping timers, exact per-frame cadence + optional end dwell
  useEffect(() => {
    clearTimer();
    if (!isPlaying || !canPlay) return;

    let cancelled = false;

    const scheduleNextTick = () => {
      if (cancelled || !isMountedRef.current) return;
      const onLastFrame = indexRef.current >= frameCountRef.current - 1;
      const delay = onLastFrame && loopRef.current ? intervalMs + safeEndDwellMs : intervalMs;

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (cancelled || !isMountedRef.current) return;

        const { nextIndex, reachedEnd } = advanceFrameIndex(
          indexRef.current,
          frameCountRef.current,
          loopRef.current
        );

        commitIndex(nextIndex);

        if (reachedEnd) {
          setIsPlaying(false);
          return;
        }

        scheduleNextTick();
      }, delay);
    };

    scheduleNextTick();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [isPlaying, canPlay, intervalMs, safeEndDwellMs, clearTimer, commitIndex]);

  const play = useCallback(() => {
    if (frameCountRef.current <= 1) return;
    setHasInteracted(true);
    // If paused at the last frame with loop OFF, restart smoothly from frame 0
    if (!loopRef.current && indexRef.current >= frameCountRef.current - 1) {
      commitIndex(0);
    }
    setIsPlaying(true);
  }, [commitIndex]);

  const pause = useCallback(() => {
    clearTimer();
    setHasInteracted(true);
    setIsPlaying(false);
  }, [clearTimer]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const stepBy = useCallback(
    (delta: number) => {
      if (frameCountRef.current <= 1) return;
      clearTimer();
      setHasInteracted(true);
      setIsPlaying(false);
      const nextIdx = stepFrameIndex(indexRef.current, delta, frameCountRef.current, true);
      commitIndex(nextIdx);
    },
    [clearTimer, commitIndex]
  );

  const next = useCallback(() => {
    stepBy(1);
  }, [stepBy]);

  const previous = useCallback(() => {
    stepBy(-1);
  }, [stepBy]);

  const reset = useCallback(() => {
    clearTimer();
    setHasInteracted(false);
    setIsPlaying(false);
    commitIndex(0);
  }, [clearTimer, commitIndex]);

  const jumpToLatest = useCallback(() => {
    if (frameCountRef.current <= 0) return;
    clearTimer();
    setHasInteracted(true);
    setIsPlaying(false);
    commitIndex(frameCountRef.current - 1);
  }, [clearTimer, commitIndex]);

  const seek = useCallback(
    (index: number) => {
      setHasInteracted(true);
      if (pauseOnSeek) {
        clearTimer();
        setIsPlaying(false);
      }
      commitIndex(index);
    },
    [pauseOnSeek, clearTimer, commitIndex]
  );

  const changeSpeed = useCallback((nextSpeed: PlaybackSpeed) => {
    if (VALID_PLAYBACK_SPEEDS.includes(nextSpeed)) {
      setSpeed(nextSpeed);
    }
  }, []);

  const setLoop = useCallback((nextLoop: boolean) => {
    setLoopState(nextLoop);
  }, []);

  const toggleLoop = useCallback(() => {
    setLoopState((prev) => !prev);
  }, []);

  const safeIndex = clampFrameIndex(currentIndex, frameCount);
  const currentFrame = frameCount > 0 ? orderedFrames[safeIndex] ?? null : null;
  const progress = frameCount > 1 ? safeIndex / (frameCount - 1) : frameCount === 1 ? 1 : 0;
  const isAtStart = safeIndex === 0;
  const isAtEnd = frameCount > 0 ? safeIndex >= frameCount - 1 : true;
  const activePlaying = isPlaying && canPlay;

  const status: PlaybackStatus = !canPlay
    ? 'unavailable'
    : activePlaying
    ? 'playing'
    : !loop && isAtEnd && hasInteracted
    ? 'ended'
    : hasInteracted
    ? 'paused'
    : 'idle';

  return {
    frames: orderedFrames,
    currentIndex: safeIndex,
    currentFrame,
    frameCount,
    isPlaying: activePlaying,
    status,
    speed,
    intervalMs,
    loop,
    progress,
    canPlay,
    isAtStart,
    isAtEnd,
    play,
    pause,
    togglePlay,
    next,
    previous,
    stepBy,
    reset,
    jumpToLatest,
    seek,
    changeSpeed,
    setLoop,
    toggleLoop,
  };
}

export default useFramePlayback;
