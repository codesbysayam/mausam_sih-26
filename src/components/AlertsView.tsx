import React, { useState } from 'react';
import { INITIAL_ALERTS } from '../data/weatherData';
import { WeatherAlert } from '../types';
import { AudioAlertToggle } from './common/AudioAlertToggle';

export const AlertsView: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'severe' | 'warning'>('all');
  const [alerts] = useState<WeatherAlert[]>(INITIAL_ALERTS);

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'severe') return a.severity === 'severe';
    if (filter === 'warning') return a.severity === 'warning';
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto select-none font-sans">
      {/* Top Banner */}
      <div className="bg-[var(--m-surface-2)] card-border rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#E74C3C] text-[20px]">
              crisis_alert
            </span>
            <h2 className="font-h3 text-base font-bold text-[var(--m-text-primary)]">
              Meteorological &amp; Environmental Warning Bulletins
            </h2>
          </div>
          <p className="text-xs text-[var(--m-text-secondary)]">
            Official advisories synced directly with IMD &amp; Central Pollution Control Board feeds
          </p>
        </div>

        {/* Controls: Audio Alert & Severity Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <AudioAlertToggle variant="pill" showLabel={true} />

          <div className="flex gap-1.5 p-1 bg-[var(--m-surface-1)] rounded-lg card-border">
          {(['all', 'severe', 'warning'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                filter === f
                  ? 'bg-[var(--m-accent)] text-[#FFFFFF] shadow-sm'
                  : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              {f === 'all' ? 'All Bulletins' : f}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="flex flex-col gap-4">
        {filteredAlerts.map((alert) => {
          const isSevere = alert.severity === 'severe';
          return (
            <div
              key={alert.id}
              className={`bg-[var(--m-surface-2)] card-border rounded-xl p-6 shadow-xl border-l-4 transition-all ${
                isSevere
                  ? 'border-l-[#E74C3C] bg-gradient-to-r from-[#E74C3C]/10 to-transparent'
                  : 'border-l-[#FFB703] bg-gradient-to-r from-[#FFB703]/10 to-transparent'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={{
                      color: isSevere ? '#E74C3C' : '#FFB703',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    warning
                  </span>
                  <div>
                    <span
                      className="text-[10px] uppercase font-bold tracking-wider"
                      style={{ color: isSevere ? '#E74C3C' : '#FFB703' }}
                    >
                      {alert.agency}
                    </span>
                    <h3 className="font-h4 text-base font-bold text-[var(--m-text-primary)]">
                      {alert.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--m-text-secondary)]">
                  <span>Issued: {alert.issuedAt}</span>
                  <span>•</span>
                  <span className="text-[var(--m-accent)] font-bold">Valid Until: {alert.validUntil}</span>
                </div>
              </div>

              <p className="text-sm text-[var(--m-text-primary)] leading-relaxed mb-4">
                {alert.description}
              </p>

              {/* Action Item & Affected Zones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[rgba(226, 219, 200,0.12)]">
                <div className="bg-[var(--m-surface-1)] p-3 rounded-lg card-border">
                  <p className="text-[10px] uppercase text-[var(--m-text-secondary)] font-bold mb-1">
                    Action Item / Directive
                  </p>
                  <p className="text-xs text-[#2ECC71] font-medium">
                    {alert.actionItem}
                  </p>
                </div>

                <div className="bg-[var(--m-surface-1)] p-3 rounded-lg card-border">
                  <p className="text-[10px] uppercase text-[var(--m-text-secondary)] font-bold mb-1">
                    Affected Districts
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {alert.affectedDistricts.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded bg-[var(--m-surface-2)] text-[var(--m-text-primary)] text-xs card-border"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
