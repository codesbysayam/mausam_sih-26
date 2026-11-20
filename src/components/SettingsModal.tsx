import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempUnit: 'C' | 'F';
  onToggleTempUnit: (unit: 'C' | 'F') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tempUnit,
  onToggleTempUnit,
}) => {
  const [telemetryInterval, setTelemetryInterval] = useState('30s');
  const [aqiAlertThreshold, setAqiAlertThreshold] = useState('100');
  const [soundAlerts, setSoundAlerts] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-md bg-[var(--m-surface-2)] card-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 card-header-divider flex justify-between items-center bg-[var(--m-surface-1)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--m-accent)] text-[20px]">
              settings
            </span>
            <h3 className="text-xs uppercase text-[var(--m-text-primary)] tracking-wider font-bold">
              Console Preferences &amp; Calibration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] p-1.5 rounded hover:bg-[var(--m-surface-3)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Settings */}
        <div className="p-6 flex flex-col gap-5">
          {/* Temperature Units */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-[var(--m-text-primary)]">
                Temperature Unit
              </p>
              <p className="text-xs text-[var(--m-text-secondary)]">
                Celsius (°C) vs Fahrenheit (°F)
              </p>
            </div>
            <div className="flex gap-1 bg-[var(--m-surface-1)] p-1 rounded-lg card-border">
              <button
                onClick={() => onToggleTempUnit('C')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  tempUnit === 'C'
                    ? 'bg-[var(--m-accent)] text-[#FFFFFF]'
                    : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                °C
              </button>
              <button
                onClick={() => onToggleTempUnit('F')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  tempUnit === 'F'
                    ? 'bg-[var(--m-accent)] text-[#FFFFFF]'
                    : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                °F
              </button>
            </div>
          </div>

          {/* Telemetry Refresh Rate */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-[var(--m-text-primary)]">
                Telemetry Polling Rate
              </p>
              <p className="text-xs text-[var(--m-text-secondary)]">
                Sensor stream update cadence
              </p>
            </div>
            <select
              value={telemetryInterval}
              onChange={(e) => setTelemetryInterval(e.target.value)}
              className="bg-[var(--m-surface-1)] card-border rounded-lg px-2.5 py-1.5 text-xs text-[var(--m-text-primary)] focus:outline-none focus:border-[var(--m-accent)]"
            >
              <option value="10s">10 seconds</option>
              <option value="30s">30 seconds (Default)</option>
              <option value="60s">1 minute</option>
              <option value="5m">5 minutes</option>
            </select>
          </div>

          {/* AQI Alert Threshold */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-[var(--m-text-primary)]">
                PM2.5 Warning Trigger
              </p>
              <p className="text-xs text-[var(--m-text-secondary)]">
                Threshold for push notifications
              </p>
            </div>
            <select
              value={aqiAlertThreshold}
              onChange={(e) => setAqiAlertThreshold(e.target.value)}
              className="bg-[var(--m-surface-1)] card-border rounded-lg px-2.5 py-1.5 text-xs text-[var(--m-text-primary)] focus:outline-none focus:border-[var(--m-accent)]"
            >
              <option value="50">50 µg/m³ (WHO)</option>
              <option value="100">100 µg/m³ (Standard)</option>
              <option value="150">150 µg/m³ (Severe)</option>
            </select>
          </div>

          {/* Audio Chimes */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-[var(--m-text-primary)]">
                Severe Weather Audio Beep
              </p>
              <p className="text-xs text-[var(--m-text-secondary)]">
                Audible chime for IMD warnings
              </p>
            </div>
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={(e) => setSoundAlerts(e.target.checked)}
              className="w-4 h-4 accent-[var(--m-accent)] cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 card-header-divider border-t border-[rgba(226, 219, 200,0.12)] bg-[var(--m-surface-1)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--m-accent)] text-[#FFFFFF] text-xs font-semibold hover:bg-[var(--m-accent-hover)] transition-colors cursor-pointer"
          >
            Save &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
};
