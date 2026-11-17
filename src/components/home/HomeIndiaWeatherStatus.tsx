import React from 'react';
import { Radio } from 'lucide-react';
import { INDIA_WEATHER_DATA } from '../../data/indiaWeatherData';

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
      value: avgTemp !== null ? avgTemp : 'N/A',
      unit: avgTemp !== null ? '°C' : '',
      subtext: avgTemp !== null ? `Across 36 capitals (${minTemp}° – ${maxTemp}°C)` : 'Aggregation unavailable',
      source: '36-Region Reference Dataset',
      status: 'REF',
      statusColor: '#38BDF8',
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
      statusColor: '#38BDF8',
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
      statusColor: severeAlerts > 0 ? '#F59E0B' : '#22C7A0',
      tab: 'warnings',
    },
    {
      id: 'status-card-aqi',
      title: 'MEAN REGIONAL AQI',
      value: avgAQI !== null ? `${avgAQI}` : 'N/A',
      unit: avgAQI !== null ? 'AQI' : '',
      subtext: avgAQI !== null ? '36-Capital Reference Mean' : 'Aggregation unavailable',
      source: 'Reference Summary',
      status: 'REF',
      statusColor: '#38BDF8',
      tab: 'aqi',
    },
    {
      id: 'status-card-wind',
      title: 'MEAN SURFACE WIND',
      value: avgWind !== null ? `${avgWind}` : 'N/A',
      unit: avgWind !== null ? 'km/h' : '',
      subtext: maxWind !== null ? `Reference max ${maxWind} km/h` : 'Aggregation unavailable',
      source: 'Regional Baseline',
      status: 'REF',
      statusColor: '#38BDF8',
      tab: 'weather',
    },
    {
      id: 'status-card-humidity',
      title: 'MEAN HUMIDITY',
      value: avgHumidity !== null ? `${avgHumidity}` : 'N/A',
      unit: avgHumidity !== null ? '% RH' : '',
      subtext: avgHumidity !== null ? 'Mean national snapshot RH' : 'Aggregation unavailable',
      source: 'Regional Baseline',
      status: 'REF',
      statusColor: '#38BDF8',
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
      statusColor: '#22C7A0',
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
      statusColor: '#8EA3B8',
      tab: 'radar',
    },
  ];

  return (
    <section
      id="india-weather-status-panel"
      className="bg-[#101B26] border border-white/12 rounded-xl p-4 sm:p-5"
      aria-label="National Regional Reference Overview"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#162331] border border-white/10 flex items-center justify-center text-[#38BDF8]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#F4F7FA] tracking-tight">
              National Regional Reference Summary
            </h2>
            <p className="text-xs text-[#8EA3B8]">
              Aggregated baseline across 36 State &amp; Union Territory capitals (separate from your selected city&apos;s live telemetry)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-[#162331] border border-white/10 px-3 py-1.5 rounded-lg text-xs">
          <span className="font-mono text-[#38BDF8] font-semibold uppercase">Reference Snapshot</span>
          <span className="text-white/20">•</span>
          <span className="text-[#B6C7D8] font-mono text-[11px] tabular-nums">{displayTime}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            id={card.id}
            type="button"
            onClick={() => onNavigate?.(card.tab)}
            className="text-left bg-[#162331] hover:bg-[#1B2C3D] border border-white/10 hover:border-[#38BDF8]/40 rounded-xl p-3.5 transition-colors cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-wider text-[#B6C7D8] uppercase">
                {card.title}
              </span>
              <span
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                style={{
                  color: card.statusColor,
                  backgroundColor: `${card.statusColor}18`,
                  border: `1px solid ${card.statusColor}33`,
                }}
              >
                {card.status}
              </span>
            </div>

            <div className="my-1">
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#F4F7FA] tracking-tight">
                  {card.value}
                </span>
                {card.unit && (
                  <span className="text-xs font-medium text-[#8EA3B8]">{card.unit}</span>
                )}
              </div>
              <p className="text-[11px] text-[#8EA3B8] mt-0.5 truncate">{card.subtext}</p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/8 flex items-center justify-between text-[10px] text-[#8EA3B8] font-mono">
              <span className="truncate">{card.source}</span>
              <span className="shrink-0 text-[#38BDF8] group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

