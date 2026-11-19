import React from 'react';
import { CurrentWeather, LocationRecord, WeatherAlert } from '../../types';
import { DataPanel, SectionHeading, SeverityBanner } from '../ui/ObservatoryPrimitives';
import { ShieldCheck, Zap, Clock } from 'lucide-react';

interface LightningThunderstormSectionProps {
  location: LocationRecord;
  weather: CurrentWeather;
  alerts?: WeatherAlert[];
}

export const LightningThunderstormSection: React.FC<LightningThunderstormSectionProps> = ({
  location,
  weather,
  alerts = [],
}) => {
  const condLower = (weather.condition || '').toLowerCase();
  const isThunder =
    condLower.includes('thunder') ||
    condLower.includes('lightning') ||
    weather.wmoCode === 95 ||
    weather.wmoCode === 96 ||
    weather.wmoCode === 99;

  const lightningAlert = alerts.find(
    (a) =>
      (a.title || '').toLowerCase().includes('lightning') ||
      (a.title || '').toLowerCase().includes('thunderstorm') ||
      (a.description || '').toLowerCase().includes('lightning')
  );

  const hasActiveWarning = isThunder || !!lightningAlert;
  const stationLabel = location.displayName || location.city;

  return (
    <DataPanel id="lightning-thunderstorm-section" className="space-y-4">
      <SectionHeading
        title="Thunderstorm & Convective Hazard Monitor"
        subtitle="Derived strictly from WMO convective weather codes and SACHET / NDMA CAP bulletins"
        icon={<Zap className={`w-4 h-4 ${hasActiveWarning ? 'text-[var(--m-danger)]' : 'text-[var(--m-watch)]'}`} />}
        action={
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--m-text-muted)]">
            <Clock className="w-3.5 h-3.5 text-[var(--m-accent)]" />
            <span>Updated: {weather.lastUpdated || '—'}</span>
          </div>
        }
      />

      {hasActiveWarning ? (
        <div className="space-y-3">
          <SeverityBanner
            state="SEVERE"
            title={lightningAlert?.title || `Convective / Thunderstorm Activity Indicated (${stationLabel})`}
            description={
              lightningAlert?.description ||
              `WMO weather observation indicates thunderstorm or lightning potential near ${stationLabel}${location.district ? ` (${location.district})` : ''}. Move inside a permanent enclosed structure.`
            }
            source={lightningAlert?.agency || 'WMO Weather Code / SACHET CAP Feed'}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                title: '1. Seek Enclosed Shelter',
                body: 'Move inside a solid concrete building or fully enclosed metal-top vehicle.',
                tone: 'text-[var(--m-danger)]',
              },
              {
                title: '2. Avoid Isolated Trees',
                body: 'Stay clear of tall isolated trees, metal poles, and open agricultural fields.',
                tone: 'text-[var(--m-watch)]',
              },
              {
                title: '3. Leave Water Bodies',
                body: 'Vacate ponds, rivers, reservoirs, flooded fields, and shoreline water.',
                tone: 'text-[var(--m-watch)]',
              },
              {
                title: '4. Unplug Electronics',
                body: 'Disconnect sensitive mains appliances and avoid grounded plumbing contact.',
                tone: 'text-[var(--m-accent)]',
              },
            ].map((card) => (
              <div key={card.title} className="m-panel-inset p-3 space-y-1">
                <div className={`text-xs font-bold ${card.tone}`}>{card.title}</div>
                <p className="text-[11px] text-[var(--m-text-secondary)] leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="m-panel-inset p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[var(--m-ok)] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[var(--m-text-primary)]">
                No thunderstorm weather code or CAP lightning bulletin active for {stationLabel}
              </div>
              <div className="text-[11px] text-[var(--m-text-muted)]">
                Note: Real-time ground strike-distance telemetry requires dedicated DAMINI flash-sensor integration.
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-[var(--m-ok-soft)] text-[var(--m-ok)] border border-[var(--m-ok)]/30 shrink-0 self-start sm:self-auto">
            NO CAP LIGHTNING ALERT
          </span>
        </div>
      )}
    </DataPanel>
  );
};
