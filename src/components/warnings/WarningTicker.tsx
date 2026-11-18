import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  WifiOff,
} from 'lucide-react';
import { WarningRecord } from '../../types/warningTypes';
import { AudioAlertToggle } from '../common/AudioAlertToggle';

interface WarningTickerProps {
  warnings: WarningRecord[];
  onSelectWarning: (warning: WarningRecord) => void;
  source?: string;
  isUnavailable?: boolean;
}

export const WarningTicker: React.FC<WarningTickerProps> = ({
  warnings,
  onSelectWarning,
  source = 'NDMA / SACHET CAP Feed',
  isUnavailable = false,
}) => {
  const activeAlerts = warnings.filter((w) => w.severity !== 'green');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nextAlert = useCallback(() => {
    if (activeAlerts.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % activeAlerts.length);
  }, [activeAlerts.length]);

  const prevAlert = useCallback(() => {
    if (activeAlerts.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + activeAlerts.length) % activeAlerts.length);
  }, [activeAlerts.length]);

  useEffect(() => {
    if (activeAlerts.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      nextAlert();
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeAlerts.length, isPaused, nextAlert]);

  if (isUnavailable) {
    return (
      <div
        id="warning-ticker-unavailable"
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 m-panel-inset border-[#F59E0B]/35 text-xs"
      >
        <div className="flex items-center gap-2 text-[#FCD34D]">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="font-mono font-bold uppercase tracking-wider text-[11px]">
            Warning Ticker Unverified:
          </span>
          <span className="text-[#B5C3D1]">
            Real-time CAP alert ticker paused while SACHET/NDMA gateway is unreachable.
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#8295A8]">{source}</span>
      </div>
    );
  }

  if (activeAlerts.length === 0) {
    return (
      <div
        id="warning-ticker-stable"
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 m-panel-inset border-[#22C7A0]/30 text-xs"
      >
        <div className="flex items-center gap-2 text-[#6EE7B7]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-mono font-bold uppercase tracking-wider text-[11px]">
            National Synoptic Baseline:
          </span>
          <span className="text-[#B5C3D1]">
            No critical severe weather alerts currently in effect across sub-divisions.
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#8295A8]">{source}</span>
      </div>
    );
  }

  const currentWarning = activeAlerts[currentIndex] || activeAlerts[0];

  const styleMap: Record<
    string,
    { border: string; tag: string }
  > = {
    red: {
      border: 'border-[#EF4444]/45',
      tag: 'bg-[#EF4444]/20 text-[#FCA5A5] border-[#EF4444]/40',
    },
    orange: {
      border: 'border-[#F97316]/45',
      tag: 'bg-[#F97316]/20 text-[#FDBA74] border-[#F97316]/40',
    },
    yellow: {
      border: 'border-[#EAB308]/45',
      tag: 'bg-[#EAB308]/20 text-[#FDE047] border-[#EAB308]/40',
    },
  };

  const style = styleMap[currentWarning.severity] || styleMap.yellow;

  return (
    <div
      id="live-national-warning-ticker"
      role="region"
      aria-label="Live Active Warnings Ticker"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className={`m-panel px-3.5 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${style.border}`}
    >
      <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
        <span
          className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 tabular-nums ${style.tag}`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>
            Alert {currentIndex + 1}/{activeAlerts.length}
          </span>
        </span>

        <div className="truncate text-xs text-[#B5C3D1] font-medium flex items-center gap-2 min-w-0">
          <span className="font-bold text-[#F3F6FA] truncate">
            {currentWarning.title}
          </span>
          <span className="text-[#8295A8] hidden sm:inline">—</span>
          <span className="text-[#8295A8] hidden sm:inline truncate">
            {currentWarning.state} ({currentWarning.affectedAreaText})
          </span>
          <span className="text-[#8295A8] hidden md:inline">·</span>
          <span className="text-[#B5C3D1] font-mono text-[11px] hidden md:inline tabular-nums">
            Valid until {currentWarning.validUntil}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <AudioAlertToggle variant="ticker" />

        <button
          id={`btn-ticker-view-${currentWarning.id}`}
          type="button"
          onClick={() => onSelectWarning(currentWarning)}
          className="px-3 py-1.5 min-h-[36px] sm:min-h-[32px] rounded-lg text-[11px] font-semibold text-[#F3F6FA] bg-[#08131F] hover:bg-[#101F2E] border border-[#38536A] transition-colors cursor-pointer m-focus-ring"
        >
          View Bulletin
        </button>

        {activeAlerts.length > 1 && (
          <div className="flex items-center gap-0.5 bg-[#08131F] border border-[#26394B] rounded-lg p-0.5">
            <button
              id="btn-ticker-prev"
              type="button"
              onClick={prevAlert}
              title="Previous Alert"
              aria-label="Previous Warning"
              className="w-8 h-8 sm:w-7 sm:h-7 rounded flex items-center justify-center text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="btn-ticker-next"
              type="button"
              onClick={nextAlert}
              title="Next Alert"
              aria-label="Next Warning"
              className="w-8 h-8 sm:w-7 sm:h-7 rounded flex items-center justify-center text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
