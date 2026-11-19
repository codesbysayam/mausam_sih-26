import React from 'react';
import { WeatherAlert } from '../../types';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';

interface WeatherWarningProps {
  alerts: WeatherAlert[];
  regionName?: string;
}

export const WeatherWarning: React.FC<WeatherWarningProps> = ({
  alerts = [],
  regionName = 'Odisha Sub-division',
}) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'extreme':
      case 'severe':
        return <StatusBadge label="Red Alert (Take Action)" variant="danger" icon="warning" />;
      case 'moderate':
        return <StatusBadge label="Orange Alert (Be Prepared)" variant="alert" icon="info" />;
      case 'minor':
      case 'advisory':
        return <StatusBadge label="Yellow Alert (Be Aware)" variant="warning" icon="lightbulb" />;
      default:
        return <StatusBadge label="Green (No Warning)" variant="good" icon="check" />;
    }
  };

  return (
    <div className="mausam-card">
      <SectionHeader
        title="National Weather Warnings &amp; Bulletins"
        subtitle={`Active warnings and advisory bulletins issued for ${regionName}`}
        icon="notifications_active"
      />

      {alerts.length === 0 ? (
        <div className="p-4 bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] rounded flex items-center gap-3">
          <span className="material-symbols-outlined text-[#2ECC71] text-[24px]">
            verified
          </span>
          <div>
            <h4 className="text-white font-bold text-sm">
              GREEN WARNING CODE — NO SEVERE WEATHER WARNING
            </h4>
            <p className="text-xs text-[var(--m-text-secondary)] mt-0.5">
              Atmospheric conditions remain stable across the designated district. Routine diurnal variations observed.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((alert, idx) => (
            <div
              key={alert.id || idx}
              className={`p-4 bg-[var(--m-surface-2)] border rounded ${
                alert.severity === 'Severe' || alert.severity === 'Extreme'
                  ? 'border-[#E74C3C] border-l-4'
                  : alert.severity === 'Moderate'
                  ? 'border-[#FF8C42] border-l-4'
                  : 'border-[var(--m-border-strong)]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--m-border-strong)] gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {alert.title}
                  </span>
                  {getSeverityBadge(alert.severity)}
                </div>

                <div className="text-xs text-[var(--m-text-secondary)]">
                  Issued by: <strong className="text-[var(--m-text-primary)]">IMD Severe Weather Centre</strong>
                </div>
              </div>

              <div className="py-2.5 text-xs text-[var(--m-text-primary)] leading-relaxed">
                {alert.description}
              </div>

              <div className="pt-2 border-t border-[var(--m-border-strong)] flex flex-wrap items-center justify-between text-xs text-[var(--m-text-secondary)] gap-2">
                <div>
                  Affected Area: <strong className="text-white">{alert.affectedArea || regionName}</strong>
                </div>
                <div>
                  Validity: <strong className="text-white">{alert.validUntil || '24 Hours'}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
