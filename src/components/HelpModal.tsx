import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-xl bg-[var(--m-surface-2)] card-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 card-header-divider flex justify-between items-center bg-[var(--m-surface-1)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--m-accent)] text-[20px]">
              menu_book
            </span>
            <h3 className="text-xs text-[var(--m-text-primary)] font-semibold">
              MAUSAM Operational Guide &amp; Sensor Calibration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] p-1.5 rounded hover:bg-[var(--m-surface-3)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 max-h-[460px] overflow-y-auto text-xs text-[var(--m-text-primary)] leading-relaxed">
          <div className="bg-[var(--m-surface-1)] p-3.5 rounded-lg card-border">
            <h4 className="text-xs text-[var(--m-accent)] font-semibold mb-1">
              Particulate Matter (PM2.5) Standards
            </h4>
            <p className="text-[var(--m-text-secondary)]">
              MAUSAM measures airborne particles below 2.5 micrometers. Readings above 100 µg/m³ trigger fitness profile adaptations to recommend indoor workouts or masks during outdoor transit.
            </p>
          </div>

          <div className="bg-[var(--m-surface-1)] p-3.5 rounded-lg card-border">
            <h4 className="text-xs text-[#2ECC71] font-semibold mb-1">
              Physiological Fitness Engine
            </h4>
            <p className="text-[var(--m-text-secondary)]">
              The fitness scoring model combines dry-bulb temperature, dew point, wet-bulb globe temperature (WBGT), solar irradiance (UV index), and PM2.5 to calculate optimal aerobic windows and precise hydration rates.
            </p>
          </div>

          <div className="bg-[var(--m-surface-1)] p-3.5 rounded-lg card-border">
            <h4 className="text-xs text-[#FFB703] font-semibold mb-1">
              Doppler Radar &amp; Telemetry Playback
            </h4>
            <p className="text-[var(--m-text-secondary)]">
              Use the timeline slider at the bottom of the radar view to scrub through past scans, current Doppler sweeps, and short-term atmospheric nowcasts.
            </p>
          </div>

          <div className="bg-[var(--m-surface-1)] p-3.5 rounded-lg card-border">
            <h4 className="text-xs text-[var(--m-text-primary)] font-semibold mb-1">
              Atmospheric Assistant (Ask MAUSAM)
            </h4>
            <p className="text-[var(--m-text-secondary)]">
              Ask MAUSAM analyzes real-time multi-sensor telemetry, synoptic forecasts, active warnings, and air quality indexes to deliver context-aware meteorological guidance for travel, agriculture, outdoor safety, and daily decision-making.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 card-header-divider border-t border-[rgba(226, 219, 200,0.12)] bg-[var(--m-surface-1)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--m-accent)] text-[#FFFFFF] text-xs font-semibold hover:bg-[var(--m-accent-hover)] transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
