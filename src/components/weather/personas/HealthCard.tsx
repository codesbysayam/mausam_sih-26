import React from 'react';
import { AuthoritativeAQI, AuthoritativePollen } from '../../../services/authoritativeService';
import { SourceStatus } from '../../ui/ObservatoryPrimitives';
import { HeartPulse, ShieldAlert } from 'lucide-react';

interface HealthCardProps {
  aqi: AuthoritativeAQI;
  pollen: AuthoritativePollen;
  uvIndex: number | null;
  uvRiskLabel: string;
  uvAdvice: string;
  humidity: number | null;
  ambientTemp?: number | null;
  city: string;
}

export const HealthCard: React.FC<HealthCardProps> = ({
  aqi,
  pollen,
  uvIndex,
  uvRiskLabel,
  uvAdvice,
  humidity,
  ambientTemp = null,
  city,
}) => {
  const aqiVal = typeof aqi?.aqi === 'number' && Number.isFinite(aqi.aqi) ? aqi.aqi : null;
  const pollenVal =
    typeof pollen?.overallIndex === 'number' && Number.isFinite(pollen.overallIndex)
      ? pollen.overallIndex
      : null;
  const uvVal = typeof uvIndex === 'number' && Number.isFinite(uvIndex) ? uvIndex : null;
  const humVal = typeof humidity === 'number' && Number.isFinite(humidity) ? Math.round(humidity) : null;
  const tempVal = typeof ambientTemp === 'number' && Number.isFinite(ambientTemp) ? ambientTemp : null;
  const dewPoint =
    tempVal !== null && humVal !== null ? Math.round(tempVal - (100 - humVal) / 5) : null;

  const aqiBadgeColor =
    aqiVal === null
      ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
      : aqi.category === 'Good' || aqi.category === 'Satisfactory'
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : aqi.category === 'Moderate'
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : aqi.category === 'Poor'
      ? 'bg-[var(--m-alert-soft)] text-[var(--m-alert)] border-[var(--m-alert)]/35'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  const uvBadgeColor =
    uvVal === null
      ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
      : uvVal <= 2
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : uvVal <= 5
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : uvVal <= 7
      ? 'bg-[var(--m-alert-soft)] text-[var(--m-alert)] border-[var(--m-alert)]/35'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  const pollenBadgeColor =
    pollenVal === null
      ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
      : pollen.riskCategory === 'Low'
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : pollen.riskCategory === 'Moderate'
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] text-[var(--m-ok)] flex items-center justify-center border border-[var(--m-border)]">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
                Health &amp; Environmental Air
              </h3>
              <p className="text-[11px] text-[var(--m-text-muted)]">
                CPCB NAQI &amp; Aero-Allergen Feed • {city}
              </p>
            </div>
          </div>
          <SourceStatus status={aqiVal !== null ? 'LIVE' : 'UNAVAILABLE'} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 font-mono tabular-nums">
          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)]">CPCB AQI</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${aqiBadgeColor}`}>
                {aqiVal !== null ? aqi.category : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[var(--m-text-primary)]">{aqiVal ?? '—'}</span>
              <span className="text-[10px] font-sans text-[var(--m-text-muted)]">Index</span>
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1 truncate">
              Dominant: <strong className="text-[var(--m-text-primary)]">{aqi?.dominantPollutant || '—'}</strong>
            </span>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)]">Pollen</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${pollenBadgeColor}`}>
                {pollenVal !== null ? pollen.riskCategory : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[var(--m-text-primary)]">{pollenVal ?? '—'}</span>
              <span className="text-[10px] font-sans text-[var(--m-text-muted)]">grains/m³</span>
            </div>
            <span className="text-[10px] text-[var(--m-text-muted)] block mt-1 truncate">
              T: {pollen?.treePollen ?? '—'} • G: {pollen?.grassPollen ?? '—'}
            </span>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)]">UV Index</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${uvBadgeColor}`}>
                {uvVal !== null ? uvRiskLabel : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[var(--m-text-primary)]">
                {uvVal !== null ? uvVal.toFixed(1) : '—'}
              </span>
              <span className="text-[10px] text-[var(--m-text-muted)]">/ 11+</span>
            </div>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)] block mt-1 truncate">
              {uvVal === null ? 'Unavailable' : uvVal >= 6 ? 'High Solar Flux' : 'Moderate Flux'}
            </span>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[var(--m-text-muted)]">Humidity</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35">
                {humVal === null ? '—' : humVal > 70 ? 'High' : humVal > 40 ? 'Normal' : 'Dry'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[var(--m-text-primary)]">{humVal ?? '—'}</span>
              <span className="text-[10px] text-[var(--m-text-muted)]">% RH</span>
            </div>
            <span className="text-[10px] text-[var(--m-text-muted)] block mt-1 truncate">
              Dew Pt: {dewPoint !== null ? `${dewPoint}°C` : '—'}
            </span>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[var(--m-ok)] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="text-[var(--m-text-primary)]">
              <strong>Health Guidance:</strong> {aqi?.healthAdvice || 'No special health advisories.'}
            </p>
            <p className="text-[11px] text-[var(--m-text-muted)]">
              <strong>Allergy:</strong> {pollen?.allergyTip || 'Unavailable'} • <strong>UV:</strong> {uvAdvice}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[var(--m-text-muted)]">
        <span>Source: <strong className="text-[var(--m-text-secondary)]">{aqi?.source || 'CPCB & Open-Meteo Air Quality'}</strong></span>
        <span className="font-mono">
          {aqi?.lastUpdated
            ? `${new Date(aqi.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST`
            : '—'}
        </span>
      </div>
    </div>
  );
};
