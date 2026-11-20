import React, { useState } from 'react';
import {
  CurrentWeather,
  HourlyForecastItem,
  WeatherAlert,
} from '../../types';
import { WeatherDecisionEngine } from '../../services/weatherDecisionEngine';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';
import {
  Umbrella,
  Flame,
  Activity,
  Car,
  Footprints,
  CloudLightning,
  Shield,
  HeartPulse,
  Compass,
  Clock,
  Eye,
  Sun,
  Info,
} from 'lucide-react';

interface WeatherDecisionCenterProps {
  weather: CurrentWeather;
  hourly?: HourlyForecastItem[];
  alerts?: WeatherAlert[];
}

export const WeatherDecisionCenter: React.FC<WeatherDecisionCenterProps> = ({
  weather,
  hourly = [],
  alerts = [],
}) => {
  const [activeTab, setActiveTab] = useState<'decision' | 'travel' | 'health'>('decision');

  const decisions = WeatherDecisionEngine.generateWhatShouldIDoNow(weather, hourly, alerts);
  const travel = WeatherDecisionEngine.generateTravelConditions(weather, hourly);
  const health = WeatherDecisionEngine.generateHealthWeather(weather);

  const rawAqi =
    typeof weather.aqi === 'number' && Number.isFinite(weather.aqi)
      ? Math.round(weather.aqi)
      : typeof weather.aqiIndex === 'number' && Number.isFinite(weather.aqiIndex)
      ? Math.round(weather.aqiIndex)
      : null;

  const rawPm25 =
    typeof weather.aqiPm25 === 'number' && Number.isFinite(weather.aqiPm25) ? weather.aqiPm25 : null;

  const rawUv =
    typeof weather.uvIndex === 'number' && Number.isFinite(weather.uvIndex) ? weather.uvIndex : null;

  const getIconForCategory = (key: string) => {
    switch (key) {
      case 'outdoor_activity':
        return <Activity className="w-4 h-4 text-[var(--m-accent)]" />;
      case 'running_walking':
        return <Footprints className="w-4 h-4 text-[var(--m-ok)]" />;
      case 'travel_commuting':
        return <Compass className="w-4 h-4 text-[var(--m-watch)]" />;
      case 'driving_conditions':
        return <Car className="w-4 h-4 text-[var(--m-accent)]" />;
      case 'rain_protection':
        return <Umbrella className="w-4 h-4 text-[var(--m-accent)]" />;
      case 'heat_exposure':
        return <Flame className="w-4 h-4 text-[var(--m-danger)]" />;
      case 'uv_exposure':
        return <Sun className="w-4 h-4 text-[var(--m-watch)]" />;
      case 'thunderstorm_safety':
        return <CloudLightning className="w-4 h-4 text-[var(--m-danger)]" />;
      case 'visibility_risk':
        return <Eye className="w-4 h-4 text-[#A78BFA]" />;
      case 'flood_waterlogging':
        return <Shield className="w-4 h-4 text-[var(--m-accent)]" />;
      case 'air_quality_exposure':
        return <HeartPulse className="w-4 h-4 text-[var(--m-ok)]" />;
      default:
        return <Info className="w-4 h-4 text-[var(--m-text-muted)]" />;
    }
  };

  return (
    <DataPanel id="weather-decision-center" className="space-y-4">
      <SectionHeading
        title="Operational Decision & Advisory Center"
        subtitle="Guidance computed strictly from available surface & forecast parameters"
        icon={<Compass className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-1 bg-[var(--m-surface-inset)] p-1 rounded-lg border border-[var(--m-border)]">
            <button
              type="button"
              onClick={() => setActiveTab('decision')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'decision'
                  ? 'bg-[var(--m-surface-2)] text-[var(--m-text-primary)] border border-[var(--m-border-strong)]'
                  : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              Action Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('travel')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'travel'
                  ? 'bg-[var(--m-surface-2)] text-[var(--m-text-primary)] border border-[var(--m-border-strong)]'
                  : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              Travel &amp; Roads
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-[var(--m-surface-2)] text-[var(--m-text-primary)] border border-[var(--m-border-strong)]'
                  : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              Health &amp; Exposure
            </button>
          </div>
        }
      />

      {activeTab === 'decision' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {decisions.map((item) => (
            <div
              key={item.key}
              id={`decision-card-${item.key}`}
              className="m-panel-inset p-3.5 flex flex-col justify-between gap-2.5 hover:border-[var(--m-border-strong)] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {getIconForCategory(item.key)}
                  <span className="text-xs font-bold text-[var(--m-text-primary)] truncate">{item.label}</span>
                </div>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md uppercase border shrink-0 ${item.badgeColor}`}
                >
                  {item.status}
                </span>
              </div>

              <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">{item.recommendation}</p>

              <div className="pt-2 border-t border-[var(--m-border)]/70 flex items-center justify-between text-[11px] text-[var(--m-text-muted)]">
                <span className="truncate font-mono tabular-nums">
                  Basis: <strong className="text-[var(--m-text-primary)] font-sans">{item.basisValue}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'travel' && (
        <div className="m-panel-inset p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--m-border)] pb-2.5">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-[var(--m-accent)]" />
              <span className="text-xs font-bold text-[var(--m-text-primary)] uppercase tracking-wider">
                Highway &amp; Commuter Conditions
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--m-ok)] bg-[var(--m-ok-soft)] px-2.5 py-1 rounded-md border border-[var(--m-ok)]/30 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Window: <strong className="font-sans">{travel.bestTravelWindow}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { label: 'Road Surface', val: travel.roadCondition },
              { label: 'Visibility', val: travel.visibilityStatus },
              { label: 'Fog Status', val: travel.fogStatus },
              { label: 'Crosswinds', val: travel.windStatus },
              { label: 'Waterlogging', val: travel.floodRisk },
              { label: 'Convection', val: travel.thunderstormRisk },
            ].map((cell) => (
              <div key={cell.label} className="bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)]">
                <div className="text-[10px] text-[var(--m-text-muted)] font-semibold uppercase">{cell.label}</div>
                <div className="text-xs font-bold text-[var(--m-text-primary)] mt-0.5">{cell.val}</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)] text-xs text-[var(--m-text-secondary)] flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--m-text-primary)]">Transit Directive: </strong>
              {travel.advisoryNote}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="m-panel-inset p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--m-border)] pb-2.5">
            <HeartPulse className="w-4 h-4 text-[var(--m-danger)]" />
            <span className="text-xs font-bold text-[var(--m-text-primary)] uppercase tracking-wider">
              Health &amp; Physiological Stress Index
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
              <div className="text-[10px] text-[var(--m-text-muted)] font-bold uppercase">Heat Index</div>
              <div className="text-base font-bold font-mono tabular-nums text-[var(--m-danger)]">
                {health.heatIndexC !== null ? `${health.heatIndexC}°C` : '—'}
                <span className="text-xs font-sans font-normal text-[var(--m-text-muted)] ml-1.5">
                  ({health.heatStressCategory})
                </span>
              </div>
              <p className="text-[11px] text-[var(--m-text-muted)] leading-tight">
                Perceived body load combining ambient temperature and relative humidity.
              </p>
            </div>

            <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
              <div className="text-[10px] text-[var(--m-text-muted)] font-bold uppercase">Humidex Discomfort</div>
              <div className="text-base font-bold font-mono tabular-nums text-[var(--m-watch)]">
                {health.humidexValue !== null ? health.humidexValue : '—'}
                <span className="text-xs font-sans font-normal text-[var(--m-text-muted)] ml-1.5">
                  ({health.humidityDiscomfort})
                </span>
              </div>
              <p className="text-[11px] text-[var(--m-text-muted)] leading-tight">
                Evaluates moisture load hindering evaporative cooling.
              </p>
            </div>

            <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
              <div className="text-[10px] text-[var(--m-text-muted)] font-bold uppercase">UV Solar Radiation</div>
              <div className="text-base font-bold font-mono tabular-nums text-[#C084FC]">
                {rawUv !== null ? rawUv.toFixed(1) : '—'}
                <span className="text-xs font-sans font-normal text-[var(--m-text-muted)] ml-1.5">
                  ({health.uvRiskLevel})
                </span>
              </div>
              <p className="text-[11px] text-[var(--m-text-muted)] leading-tight">
                Solar erythemal exposure index around midday hours.
              </p>
            </div>

            <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
              <div className="text-[10px] text-[var(--m-text-muted)] font-bold uppercase">Air Quality Exposure</div>
              <div className="text-base font-bold font-mono tabular-nums text-[var(--m-ok)]">
                {rawAqi !== null ? `AQI ${rawAqi}` : 'AQI —'}
                <span className="text-xs font-sans font-normal text-[var(--m-text-muted)] ml-1.5">
                  ({health.airQualityExposure})
                </span>
              </div>
              <p className="text-[11px] text-[var(--m-text-muted)] leading-tight">
                {rawPm25 !== null ? `Fine particulate PM2.5 at ${rawPm25} µg/m³.` : 'PM2.5 telemetry unavailable.'}
              </p>
            </div>
          </div>

          <div className="text-[11px] text-[var(--m-text-muted)] bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)] flex flex-wrap items-center justify-between gap-2">
            <span>Guidance aligned with WHO and IMD physiological exposure thresholds.</span>
            <span className="text-[var(--m-accent)] font-mono shrink-0">Source: Open-Meteo &amp; CPCB Feeds</span>
          </div>
        </div>
      )}
    </DataPanel>
  );
};
