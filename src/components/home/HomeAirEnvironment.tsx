import React from 'react';
import { CurrentWeather, LocationRecord } from '../../types';
import { Activity, ArrowRight, Flower2, Sun } from 'lucide-react';
import { getAqiMeaning } from '../../services/humanWeatherEngine';
import { INDIA_WEATHER_DATA } from '../../data/indiaWeatherData';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface HomeAirEnvironmentProps {
  weather: CurrentWeather;
  location?: LocationRecord;
  onNavigateToAqi?: () => void;
  lastUpdated?: string;
}

export const HomeAirEnvironment: React.FC<HomeAirEnvironmentProps> = ({
  weather,
  location,
  onNavigateToAqi,
  lastUpdated,
}) => {
  const rawAqi =
    typeof weather.aqi === 'number' && Number.isFinite(weather.aqi)
      ? weather.aqi
      : typeof weather.aqiIndex === 'number' && Number.isFinite(weather.aqiIndex)
      ? weather.aqiIndex
      : null;

  const safeAqi = rawAqi !== null ? Math.round(rawAqi) : null;
  const aqiInfo = safeAqi !== null ? getAqiMeaning(safeAqi) : null;

  const pm25 =
    typeof weather.aqiPm25 === 'number' && Number.isFinite(weather.aqiPm25)
      ? Math.round(weather.aqiPm25 * 10) / 10
      : null;
  const pm10 =
    typeof weather.aqiPm10 === 'number' && Number.isFinite(weather.aqiPm10)
      ? Math.round(weather.aqiPm10 * 10) / 10
      : null;
  const no2 = typeof weather.no2 === 'number' && Number.isFinite(weather.no2) ? weather.no2 : null;
  const so2 = typeof weather.so2 === 'number' && Number.isFinite(weather.so2) ? weather.so2 : null;
  const co = typeof weather.co === 'number' && Number.isFinite(weather.co) ? weather.co : null;
  const o3 = typeof weather.o3 === 'number' && Number.isFinite(weather.o3) ? weather.o3 : null;
  const uv = typeof weather.uvIndex === 'number' && Number.isFinite(weather.uvIndex) ? weather.uvIndex : null;

  const uvRisk =
    uv === null
      ? 'Unavailable'
      : uv >= 11
      ? 'Extreme'
      : uv >= 8
      ? 'Very High'
      : uv >= 6
      ? 'High'
      : uv >= 3
      ? 'Moderate'
      : 'Low';

  const pollen =
    typeof weather.pollenCount === 'number' && Number.isFinite(weather.pollenCount)
      ? weather.pollenCount
      : null;

  const obsTime = lastUpdated || weather.lastUpdated || null;
  const aqiProvenance =
    safeAqi !== null
      ? weather.observationStatus === 'LIVE'
        ? 'LIVE'
        : 'RECENT'
      : weather.observationStatus === 'LOADING'
      ? 'LOADING'
      : 'UNAVAILABLE';

  const stationName = location?.city
    ? `CAAQMS / CAMS Sector · ${location.city}`
    : 'Ambient Air Quality Grid';

  const dominantLabel =
    pm25 !== null && pm10 !== null
      ? pm25 / 60 >= pm10 / 100
        ? 'PM2.5'
        : 'PM10'
      : pm25 !== null
      ? 'PM2.5'
      : pm10 !== null
      ? 'PM10'
      : 'Unavailable';

  const sortedByAQI = [...INDIA_WEATHER_DATA]
    .filter((s) => typeof s.aqi === 'number')
    .sort((a, b) => (b.aqi ?? 0) - (a.aqi ?? 0));

  const mostPolluted = sortedByAQI.slice(0, 4);
  const cleanest = [...sortedByAQI].reverse().slice(0, 4);

  const pollutants = [
    { label: 'PM 2.5', value: pm25, unit: 'µg/m³', limit: 60, limitLabel: 'CPCB: 60', barColor: '#22C7A0' },
    { label: 'PM 10', value: pm10, unit: 'µg/m³', limit: 100, limitLabel: 'CPCB: 100', barColor: '#F59E0B' },
    { label: 'NO₂', value: no2, unit: 'µg/m³', limit: 80, limitLabel: 'CPCB: 80', barColor: '#C5A46D' },
    { label: 'SO₂', value: so2, unit: 'µg/m³', limit: 80, limitLabel: 'CPCB: 80', barColor: '#22C7A0' },
    { label: 'CO', value: co, unit: 'mg/m³', limit: 4, limitLabel: 'CPCB: 4', barColor: '#C5A46D' },
    { label: 'Ozone (O₃)', value: o3, unit: 'µg/m³', limit: 180, limitLabel: 'CPCB: 180', barColor: '#22C7A0' },
  ];

  return (
    <DataPanel id="homepage-air-environment" className="flex flex-col gap-4 h-full">
      <SectionHeading
        title="Air Quality & Exposure"
        subtitle="CPCB NAQI particulate telemetry & atmospheric radiation"
        icon={<Activity className="w-4 h-4" />}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <SourceStatus status={aqiProvenance} updatedAt={obsTime} />
            {onNavigateToAqi && (
              <button
                type="button"
                onClick={onNavigateToAqi}
                className="text-xs text-[var(--m-accent)] hover:text-[var(--m-accent)] font-semibold flex items-center gap-1 cursor-pointer m-focus-ring"
              >
                <span>Full AQI Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        }
      />

      {/* Main Environmental Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 5 Cols: Main AQI Summary */}
        <div className="lg:col-span-5 m-panel-inset p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--m-text-secondary)]">
              National Air Quality Index
            </span>
            <span
              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border"
              style={
                aqiInfo
                  ? {
                      backgroundColor: `${aqiInfo.severityColor}15`,
                      color: aqiInfo.severityColor,
                      borderColor: `${aqiInfo.severityColor}40`,
                    }
                  : {
                      backgroundColor: 'rgba(226, 219, 200, 0.12)',
                      color: '#898B83',
                      borderColor: '#2F3534',
                    }
              }
            >
              {aqiInfo ? aqiInfo.category : 'UNAVAILABLE'}
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-1">
            <span
              className="text-4xl sm:text-5xl font-bold font-mono tracking-tight tabular-nums"
              style={{ color: aqiInfo ? aqiInfo.severityColor : '#898B83' }}
            >
              {safeAqi !== null ? safeAqi : '—'}
            </span>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-[var(--m-text-primary)] block">
                {aqiInfo ? aqiInfo.headline : 'AQI Telemetry Unavailable'}
              </span>
              <span className="text-xs text-[var(--m-accent)] font-medium">
                Dominant Pollutant: {dominantLabel}
              </span>
            </div>
          </div>

          <div className="text-xs text-[var(--m-text-secondary)] space-y-1 bg-[var(--m-surface-1)] p-2.5 rounded-lg border border-[var(--m-border)]">
            <div className="flex justify-between text-[11px] gap-2">
              <span className="text-[var(--m-text-muted)]">Sector:</span>
              <span className="text-[var(--m-text-primary)] font-medium truncate">{stationName}</span>
            </div>
            <div className="flex justify-between text-[11px] gap-2">
              <span className="text-[var(--m-text-muted)]">Standard:</span>
              <span className="text-[var(--m-text-primary)]">CPCB NAQI</span>
            </div>
          </div>

          <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
            {aqiInfo
              ? aqiInfo.healthImpact
              : 'Real-time particulate station feed is currently awaiting synchronization for this location.'}
          </p>
        </div>

        {/* Right 7 Cols: Individual Pollutants */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {pollutants.map((p) => {
            const pct =
              p.value !== null ? Math.min(100, Math.max(4, (p.value / p.limit) * 100)) : 0;
            return (
              <div
                key={p.label}
                className="m-panel-inset p-3 flex flex-col justify-between gap-2"
              >
                <div className="flex justify-between items-center text-[10px] font-mono font-semibold text-[var(--m-text-muted)] uppercase">
                  <span>{p.label}</span>
                  <span className="text-[var(--m-text-secondary)]">{p.limitLabel}</span>
                </div>
                <div className="font-mono tabular-nums">
                  <span className="text-lg font-bold text-[var(--m-text-primary)]">
                    {p.value !== null ? p.value : '—'}
                  </span>{' '}
                  {p.value !== null && (
                    <span className="text-[10px] font-sans text-[var(--m-text-muted)]">{p.unit}</span>
                  )}
                </div>
                <div className="w-full bg-[var(--m-surface-2)] h-1 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: p.value !== null ? p.barColor : 'transparent',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pollen & UV Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="m-panel-inset p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-ok)] shrink-0">
              <Flower2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-[var(--m-text-muted)] block">Pollen Index</span>
              <span className="text-xs font-semibold text-[var(--m-text-primary)]">
                {pollen !== null ? `${pollen} grains/m³` : 'Sensor unavailable'}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[var(--m-text-muted)] font-mono shrink-0">
            {pollen !== null ? 'Observed' : 'No Station'}
          </span>
        </div>

        <div className="m-panel-inset p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-watch)] shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-[var(--m-text-muted)] block">Solar UV Index</span>
              <span className="text-xs font-semibold text-[var(--m-text-primary)] tabular-nums">
                {uv !== null ? `UV ${uv.toFixed(1)} · ${uvRisk}` : 'Unavailable'}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[var(--m-watch)] font-mono shrink-0">
            Irradiance
          </span>
        </div>
      </div>

      {/* Reference Cities Snapshot (Explicitly Labeled) */}
      <div className="pt-3 border-t border-[var(--m-border)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <h3 className="text-[11px] font-mono font-semibold text-[var(--m-text-secondary)] uppercase tracking-wider">
            National Capital Reference Summary (Static Snapshot)
          </h3>
          <SourceStatus status="REFERENCE" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="m-panel-inset p-3">
            <span className="text-[10px] font-mono font-semibold text-[var(--m-danger)] uppercase tracking-wider block mb-2">
              Highest Reference AQI
            </span>
            <div className="space-y-1.5 text-xs font-mono tabular-nums">
              {mostPolluted.map((c) => (
                <div key={c.id} className="flex justify-between items-center py-0.5 border-b border-[var(--m-border)]/60 last:border-b-0">
                  <span className="text-[var(--m-text-secondary)] font-sans">{c.city || c.name}</span>
                  <span className="text-[var(--m-danger)] font-semibold">{c.aqi} AQI</span>
                </div>
              ))}
            </div>
          </div>

          <div className="m-panel-inset p-3">
            <span className="text-[10px] font-mono font-semibold text-[var(--m-ok)] uppercase tracking-wider block mb-2">
              Cleanest Reference AQI
            </span>
            <div className="space-y-1.5 text-xs font-mono tabular-nums">
              {cleanest.map((c) => (
                <div key={c.id} className="flex justify-between items-center py-0.5 border-b border-[var(--m-border)]/60 last:border-b-0">
                  <span className="text-[var(--m-text-secondary)] font-sans">{c.city || c.name}</span>
                  <span className="text-[var(--m-ok)] font-semibold">{c.aqi} AQI</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DataPanel>
  );
};

