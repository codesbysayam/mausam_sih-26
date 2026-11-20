import React from 'react';
import { Radio, ArrowRight } from 'lucide-react';
import { INDIA_WEATHER_DATA } from '../../data/indiaWeatherData';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface HomeIndiaWeatherStatusProps {
  onNavigate?: (tab: string) => void;
  lastUpdated?: string;
}

export const HomeIndiaWeatherStatus: React.FC<HomeIndiaWeatherStatusProps> = ({
  onNavigate,
  lastUpdated,
}) => {
  const totalStations = INDIA_WEATHER_DATA.length;
  const reportingStations = INDIA_WEATHER_DATA.filter((s) => s.temperature !== undefined).length;

  const validTemps = INDIA_WEATHER_DATA.map((s) => s.temperature).filter((t): t is number => t !== undefined);
  const avgTemp = validTemps.length > 0 ? (validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1) : null;
  const maxTemp = validTemps.length > 0 ? Math.max(...validTemps) : null;
  const minTemp = validTemps.length > 0 ? Math.min(...validTemps) : null;

  const validRain = INDIA_WEATHER_DATA.map((s) => s.rainfall).filter((r): r is number => r !== undefined);
  const stationsWithRain = validRain.filter((r) => r > 0).length;
  const maxRain = validRain.length > 0 ? Math.max(...validRain) : 0;

  const severeAlerts = INDIA_WEATHER_DATA.filter((s) => s.warningLevel === 'severe' || s.warningLevel === 'alert').length;

  const validAQI = INDIA_WEATHER_DATA.map((s) => s.aqi).filter((a): a is number => a !== undefined);
  const avgAQI = validAQI.length > 0 ? Math.round(validAQI.reduce((a, b) => a + b, 0) / validAQI.length) : null;

  const validWinds = INDIA_WEATHER_DATA.map((s) => s.windSpeed).filter((w): w is number => w !== undefined);
  const avgWind = validWinds.length > 0 ? Math.round(validWinds.reduce((a, b) => a + b, 0) / validWinds.length) : null;
  const maxWind = validWinds.length > 0 ? Math.max(...validWinds) : null;

  const validHumidity = INDIA_WEATHER_DATA.map((s) => s.humidity).filter((h): h is number => h !== undefined);
  const avgHumidity = validHumidity.length > 0 ? Math.round(validHumidity.reduce((a, b) => a + b, 0) / validHumidity.length) : null;

  const displayTime = INDIA_WEATHER_DATA[0]?.updatedAt || lastUpdated || 'Synoptic Reference';

  const cards = [
    {
      id: 'status-card-temp',
      title: 'NATIONAL MEAN TEMP',
      value: avgTemp !== null ? avgTemp : '—',
      unit: avgTemp !== null ? '°C' : '',
      subtext: avgTemp !== null ? `Across 36 capitals (${minTemp}° – ${maxTemp}°C)` : 'Aggregation unavailable',
      source: '36-Region Reference Dataset',
      status: 'REF',
      statusClass: 'text-[var(--m-accent)] bg-[var(--m-accent-soft)] border-[var(--m-accent)]/30',
      tab: 'weather',
    },
    {
      id: 'status-card-rain',
      title: 'RAINFALL ZONES',
      value: stationsWithRain > 0 ? `${stationsWithRain}` : 'Dry',
      unit: stationsWithRain > 0 ? 'Regions' : '',
      subtext: stationsWithRain > 0 ? `Reference peak: ${maxRain} mm` : 'No widespread rainfall in snapshot',
      source: 'Regional Baseline',
      status: 'REF',
      statusClass: 'text-[var(--m-accent)] bg-[var(--m-accent-soft)] border-[var(--m-accent)]/30',
      tab: 'radar',
    },
    {
      id: 'status-card-warnings',
      title: 'REGIONAL WATCH TIERS',
      value: `${severeAlerts}`,
      unit: severeAlerts === 1 ? 'Zone' : 'Zones',
      subtext: severeAlerts > 0 ? `${severeAlerts} elevated baseline regions` : 'Routine baseline conditions',
      source: 'Threshold Classifier',
      status: severeAlerts > 0 ? 'WATCH' : 'ROUTINE',
      statusClass: severeAlerts > 0
        ? 'text-[var(--m-watch)] bg-[var(--m-watch-soft)] border-[var(--m-watch)]/30'
        : 'text-[var(--m-ok)] bg-[var(--m-ok-soft)] border-[var(--m-ok)]/30',
      tab: 'warnings',
    },
    {
      id: 'status-card-aqi',
      title: 'MEAN REGIONAL AQI',
      value: avgAQI !== null ? `${avgAQI}` : '—',
      unit: avgAQI !== null ? 'AQI' : '',
      subtext: avgAQI !== null ? '36-Capital Reference Mean' : 'Aggregation unavailable',
      source: 'Reference Summary',
      status: 'REF',
      statusClass: 'text-[var(--m-accent)] bg-[var(--m-accent-soft)] border-[var(--m-accent)]/30',
      tab: 'aqi',
    },
    {
      id: 'status-card-wind',
      title: 'MEAN SURFACE WIND',
      value: avgWind !== null ? `${avgWind}` : '—',
      unit: avgWind !== null ? 'km/h' : '',
      subtext: maxWind !== null ? `Reference max ${maxWind} km/h` : 'Aggregation unavailable',
      source: 'Regional Baseline',
      status: 'REF',
      statusClass: 'text-[var(--m-accent)] bg-[var(--m-accent-soft)] border-[var(--m-accent)]/30',
      tab: 'weather',
    },
    {
      id: 'status-card-humidity',
      title: 'MEAN HUMIDITY',
      value: avgHumidity !== null ? `${avgHumidity}` : '—',
      unit: avgHumidity !== null ? '% RH' : '',
      subtext: avgHumidity !== null ? 'Mean national snapshot RH' : 'Aggregation unavailable',
      source: 'Regional Baseline',
      status: 'REF',
      statusClass: 'text-[var(--m-accent)] bg-[var(--m-accent-soft)] border-[var(--m-accent)]/30',
      tab: 'weather',
    },
    {
      id: 'status-card-stations',
      title: 'CENTRES INDEXED',
      value: `${reportingStations} / ${totalStations}`,
      unit: 'States & UTs',
      subtext: 'All-India State & UT Capitals',
      source: 'Regional Registry',
      status: 'INDEXED',
      statusClass: 'text-[var(--m-ok)] bg-[var(--m-ok-soft)] border-[var(--m-ok)]/30',
      tab: 'reports',
    },
    {
      id: 'status-card-last-update',
      title: 'REFERENCE CYCLE',
      value: displayTime.replace(' IST', ''),
      unit: displayTime.includes('IST') ? 'IST' : '',
      subtext: 'National baseline reference',
      source: 'Synoptic Snapshot',
      status: 'SNAPSHOT',
      statusClass: 'text-[var(--m-text-secondary)] bg-[var(--m-text-muted)]/12 border-[var(--m-border-strong)]',
      tab: 'radar',
    },
  ];

  return (
    <DataPanel id="india-weather-status-panel" className="flex flex-col gap-4">
      <SectionHeading
        icon={<Radio className="w-4 h-4" />}
        title="National Regional Reference Summary"
        subtitle="Aggregated baseline across 36 State & Union Territory capitals (separate from your selected city telemetry)"
        action={
          <SourceStatus
            status="REFERENCE"
            labelOverride="REFERENCE SNAPSHOT"
            updatedAt={displayTime}
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            id={card.id}
            type="button"
            onClick={() => onNavigate?.(card.tab)}
            className="text-left m-panel-inset hover:bg-[var(--m-surface-2)] hover:border-[var(--m-border-strong)] p-3.5 transition-colors cursor-pointer group flex flex-col justify-between m-focus-ring"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider text-[var(--m-text-secondary)] uppercase truncate">
                {card.title}
              </span>
              <span
                className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0 ${card.statusClass}`}
              >
                {card.status}
              </span>
            </div>

            <div className="my-1">
              <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold text-[var(--m-text-primary)] tracking-tight">
                  {card.value}
                </span>
                {card.unit && (
                  <span className="text-xs font-sans font-medium text-[var(--m-text-muted)]">{card.unit}</span>
                )}
              </div>
              <p className="text-[11px] text-[var(--m-text-muted)] mt-0.5 truncate">{card.subtext}</p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[var(--m-border)] flex items-center justify-between text-[10px] text-[var(--m-text-muted)] font-mono">
              <span className="truncate">{card.source}</span>
              <ArrowRight className="w-3 h-3 shrink-0 text-[var(--m-accent)] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </DataPanel>
  );
};

