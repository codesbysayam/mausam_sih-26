import React from 'react';
import { TelemetryDetail } from '../types';

interface TelemetryDetailModalProps {
  telemetry: TelemetryDetail | null;
  onClose: () => void;
}

export const TelemetryDetailModal: React.FC<TelemetryDetailModalProps> = ({
  telemetry,
  onClose,
}) => {
  if (!telemetry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-md bg-[var(--m-surface-2)] card-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 card-header-divider flex justify-between items-center bg-[var(--m-surface-1)]">
          <div>
            <span className="text-xs text-[#4FA8E0] font-semibold block">
              Sensor Metric Diagnostic
            </span>
            <h3 className="font-h4 text-base font-bold text-[var(--m-text-primary)]">
              {telemetry.title}
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
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-baseline">
            <div className="flex items-baseline gap-2">
              <span
                className="text-4xl font-bold"
                style={{ color: telemetry.statusColor }}
              >
                {telemetry.value}
              </span>
              <span className="text-sm text-[var(--m-text-secondary)]">
                {telemetry.unit}
              </span>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded border font-semibold"
              style={{
                borderColor: telemetry.statusColor,
                color: telemetry.statusColor,
              }}
            >
              {telemetry.status}
            </span>
          </div>

          <p className="text-sm text-[var(--m-text-primary)] leading-relaxed">
            {telemetry.description}
          </p>

          <div className="bg-[var(--m-surface-1)] p-3.5 rounded-lg card-border">
            <span className="text-[11px] text-[var(--m-text-secondary)] font-semibold block mb-1">
              Reference Standards &amp; Safe Exposure Band
            </span>
            <p className="text-xs text-[#4FA8E0] font-medium">
              {telemetry.normRange}
            </p>
          </div>

          {/* Mini Sparkline Bars */}
          <div>
            <span className="text-[11px] text-[var(--m-text-secondary)] font-semibold block mb-2">
              Recent 6-Hour Trend
            </span>
            <div className="flex items-end gap-2 h-14 bg-[var(--m-surface-1)] p-2 rounded-lg card-border">
              {telemetry.history.map((val, i) => {
                const max = Math.max(...telemetry.history);
                const heightPct = Math.max(15, Math.round((val / max) * 100));
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: telemetry.statusColor,
                        opacity: i === telemetry.history.length - 1 ? 1 : 0.6,
                      }}
                    ></div>
                    <span className="text-[10px] text-[var(--m-text-secondary)] mt-0.5 font-medium">
                      -{telemetry.history.length - 1 - i}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 card-header-divider border-t border-[rgba(225,230,235,0.12)] bg-[var(--m-surface-1)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--m-accent)] text-[#FFFFFF] text-xs font-semibold hover:bg-[#0A5A94] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
