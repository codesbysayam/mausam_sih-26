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
        className={`bg-[#0B1927]/95 backdrop-blur-md border border-[#26394B] rounded-xl px-3 py-1.5 text-xs text-[#F3F6FA] shadow-xl flex items-center justify-between gap-2.5 max-w-[calc(100vw-24px)] ${className}`}
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
                : 'bg-[#0B72B9] hover:bg-[#095c96] text-white'
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
            className="w-7 h-7 rounded-md bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(Math.min(frames.length - 1, activeFrameIndex + 1))}
            disabled={isLatest}
            title="Step Forward 15 Minutes [Right Arrow]"
            aria-label="Step Forward 15 Minutes"
            className="w-7 h-7 rounded-md bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 truncate">
          <div className="flex items-center gap-1.5 font-mono text-[11px] truncate tabular-nums">
            <span className="text-[#8295A8] hidden sm:inline">
              F{activeFrameIndex + 1}/{frames.length}
            </span>
            <strong className="text-[#F3F6FA]">
              {currentFrame.formattedTime.split(',')[0]}
            </strong>
            <span className="text-[#35C7E8] text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#08131F] border border-[#26394B]">
              {currentFrame.relativeLabel || (isLatest ? 'LATEST' : `${currentFrame.ageMinutes}m`)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-[#8295A8] hidden sm:inline tabular-nums">
            {playbackSpeed}x
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-7 h-7 rounded-md bg-[#08131F] hover:bg-[#101F2E] text-[#35C7E8] hover:text-white border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer"
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
      className={`bg-[#0B1927]/95 backdrop-blur-md border border-[#26394B] rounded-xl p-2.5 sm:p-3 text-xs text-[#F3F6FA] shadow-xl ${className}`}
      role="region"
      aria-label="Radar 6-Hour Time-Lapse Playback Workstation"
    >
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#26394B]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[11px] font-semibold text-[#35C7E8]">
            <Radar className="w-3.5 h-3.5 shrink-0" />
            <span>6-Hour Radar Time-Lapse</span>
          </div>

          <span
            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
              isPlaying
                ? 'bg-[#F97316]/15 text-[#FDBA74] border-[#F97316]/40'
                : 'bg-[#35C7E8]/12 text-[#7DD3FC] border-[#35C7E8]/35'
            }`}
          >
            {isPlaying ? 'Animating' : 'Paused'}
          </span>

          {onChangeTimeSpan && (
            <div className="flex items-center bg-[#08131F] p-0.5 rounded border border-[#26394B]">
              {(['6h', '3h', '1h'] as RadarTimeSpan[]).map((span) => (
                <button
                  key={span}
                  type="button"
                  onClick={() => onChangeTimeSpan(span)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                    timeSpan === span
                      ? 'bg-[#0B72B9] text-white font-bold'
                      : 'text-[#8295A8] hover:text-[#F3F6FA]'
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
          <div className="text-[11px] font-mono text-[#8295A8] hidden sm:inline tabular-nums">
            Frame <span className="font-bold text-[#F3F6FA]">{activeFrameIndex + 1}</span>/
            <span className="font-bold text-[#F3F6FA]">{frames.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B]">
            <span className="font-mono font-bold text-[#F3F6FA] text-[11px] tabular-nums">
              {currentFrame.formattedTime.split(',')[0]}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                isLatest
                  ? 'bg-[#22C7A0]/15 text-[#6EE7B7] border border-[#22C7A0]/35'
                  : 'bg-[#35C7E8]/15 text-[#7DD3FC] border border-[#35C7E8]/35'
              }`}
            >
              {currentFrame.relativeLabel || (isLatest ? 'LATEST' : `${currentFrame.ageMinutes}m ago`)}
            </span>
          </div>

          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="w-6 h-6 rounded hover:bg-[#101F2E] text-[#8295A8] hover:text-[#F3F6FA] flex items-center justify-center transition-colors cursor-pointer"
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
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[#08131F] border border-[#26394B] accent-[#35C7E8] focus:outline-none focus:ring-1 focus:ring-[#35C7E8]"
              style={{
                background: `linear-gradient(to right, #0B72B9 0%, #35C7E8 ${progressPercent}%, #08131F ${progressPercent}%, #08131F 100%)`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[9.5px] font-mono text-[#8295A8] pt-0.5 px-1 select-none tabular-nums">
            <button
              type="button"
              onClick={() => onChangeFrame(0)}
              className="text-[#35C7E8] font-bold hover:underline cursor-pointer"
              title="Jump to -6 Hours"
            >
              -6h
            </button>
            <span className="hidden sm:inline">-5h</span>
            <span className="hidden xs:inline">-4h</span>
            <span className="text-[#B5C3D1] font-semibold">-3h</span>
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
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#26394B]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChangeFrame(0)}
            disabled={isEarliest}
            title="Jump to Start (6 Hours Ago) [Home]"
            aria-label="Jump to start"
            className="w-7 h-7 rounded bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-white border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(Math.max(0, activeFrameIndex - 1))}
            disabled={isEarliest}
            title="Step Back 15 Minutes [Left Arrow]"
            aria-label="Step back"
            className="w-7 h-7 rounded bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-white border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
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
                : 'bg-[#0B72B9] hover:bg-[#095c96] text-white'
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
            className="w-7 h-7 rounded bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-white border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeFrame(frames.length - 1)}
            disabled={isLatest}
            title="Jump to Latest Scan [End]"
            aria-label="Jump to latest scan"
            className="w-7 h-7 rounded bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-white border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

          <span className="text-[9px] font-mono text-[#8295A8] ml-1 hidden lg:inline">
            [Space] Play · [←/→] Step
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8295A8] uppercase tracking-wider font-semibold hidden md:inline">
            Speed:
          </span>
          <div className="flex items-center bg-[#08131F] p-0.5 rounded border border-[#26394B]">
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer tabular-nums ${
                  playbackSpeed === spd
                    ? 'bg-[#0B72B9] text-white font-bold'
                    : 'text-[#8295A8] hover:text-[#F3F6FA]'
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
                  ? 'bg-[#0B72B9]/20 text-[#35C7E8] border-[#35C7E8]/45'
                  : 'bg-[#08131F] text-[#8295A8] border-[#26394B] hover:text-[#F3F6FA]'
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
        <div className="mt-2 pt-1.5 border-t border-[#26394B] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[9.5px] text-[#8295A8]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#35C7E8] font-bold flex items-center gap-1">
              <Wind className="w-3 h-3" />
              Storm Movement Vector:
            </span>
            <span className="font-mono text-[#F3F6FA] bg-[#08131F] px-1.5 py-0.5 rounded border border-[#26394B] tabular-nums">
              Heading {motionVector.compassDir} ({motionVector.azimuthDeg}°) @ {motionVector.speedKmh} km/h
            </span>
            <span className="text-[#B5C3D1] hidden lg:inline">· {motionVector.stormDescription}</span>
          </div>

          <div className="text-[9px] font-mono text-[#8295A8] shrink-0">
            RainViewer Global Mosaic + IMD DWR Network
          </div>
        </div>
      )}
    </div>
  );
};

export default RadarTimeLapseController;
