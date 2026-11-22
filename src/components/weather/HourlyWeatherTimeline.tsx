import React, { useState, useMemo } from 'react';
import { HourlyForecastItem } from '../../types';
import { getWeatherVisualConfig } from '../../utils/weatherIcons';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';
import {
  Clock,
  Droplets,
  Wind,
  LineChart as ChartIcon,
  Table,
  ChevronDown,
  ChevronUp,
  Thermometer,
  CloudRain,
  Flame,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface HourlyWeatherTimelineProps {
  hourly: HourlyForecastItem[];
}

type ChartMetric = 'temp' | 'rain' | 'wind' | 'humidity';

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const HourlyWeatherTimeline: React.FC<HourlyWeatherTimelineProps> = ({
  hourly = [],
}) => {
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('temp');
  const [showChart, setShowChart] = useState(true);
  const [showTable, setShowTable] = useState(false);

  const displayItems = useMemo(() => {
    if (!hourly || hourly.length === 0) return [];
    return hourly.slice(0, 24);
  }, [hourly]);

  const highlights = useMemo(() => {
    if (displayItems.length === 0) {
      return {
        maxTemp: null,
        minTemp: null,
        maxRain: null,
        rainPeriod: 'Unavailable',
        maxWind: null,
      };
    }

    let maxT = { val: -Infinity, time: '' };
    let minT = { val: Infinity, time: '' };
    let maxR = { val: -1, time: '' };
    let maxW = { val: -1, time: '' };
    const rainHours: string[] = [];

    displayItems.forEach((item) => {
      if (isFiniteNum(item.temp)) {
        if (item.temp > maxT.val) maxT = { val: item.temp, time: item.time };
        if (item.temp < minT.val) minT = { val: item.temp, time: item.time };
      }

      const r = isFiniteNum(item.precipitationProbability)
        ? item.precipitationProbability
        : isFiniteNum(item.rainProb)
        ? item.rainProb
        : null;
      if (r !== null) {
        if (r > maxR.val) maxR = { val: r, time: item.time };
        if (r >= 35) rainHours.push(item.time);
      }

      if (isFiniteNum(item.windSpeed) && item.windSpeed > maxW.val) {
        maxW = { val: item.windSpeed, time: item.time };
      }
    });

    const rainPeriod =
      rainHours.length > 0
        ? `${rainHours[0]} – ${rainHours[rainHours.length - 1]} (${maxR.val}% peak)`
        : maxR.val >= 0
        ? 'No significant rain window'
        : 'Unavailable';

    return {
      maxTemp: maxT.val !== -Infinity ? { ...maxT, val: Math.round(maxT.val) } : null,
      minTemp: minT.val !== Infinity ? { ...minT, val: Math.round(minT.val) } : null,
      maxRain: maxR.val >= 0 ? maxR : null,
      rainPeriod,
      maxWind: maxW.val >= 0 ? { ...maxW, val: Math.round(maxW.val) } : null,
    };
  }, [displayItems]);

  const chartData = useMemo(() => {
    return displayItems.map((item) => ({
      time: item.time,
      temp: isFiniteNum(item.temp) ? Math.round(item.temp) : null,
      rain: isFiniteNum(item.precipitationProbability)
        ? item.precipitationProbability
        : isFiniteNum(item.rainProb)
        ? item.rainProb
        : null,
      wind: isFiniteNum(item.windSpeed) ? Math.round(item.windSpeed) : null,
      humidity: isFiniteNum(item.humidity) ? Math.round(item.humidity) : null,
      condition: item.condition,
    }));
  }, [displayItems]);

  const metricConfig = {
    temp: {
      label: 'Temperature',
      unit: '°C',
      color: '#C5A46D',
      gradientFrom: '#C5A46D',
      gradientTo: '#C5A46D',
      domain: ['auto', 'auto'],
    },
    rain: {
      label: 'Precipitation Probability',
      unit: '%',
      color: '#C5A46D',
      gradientFrom: '#C5A46D',
      gradientTo: '#22C7A0',
      domain: [0, 100],
    },
    wind: {
      label: 'Wind Velocity',
      unit: 'km/h',
      color: '#22C7A0',
      gradientFrom: '#22C7A0',
      gradientTo: '#111314',
      domain: [0, 'auto'],
    },
    humidity: {
      label: 'Relative Humidity',
      unit: '%',
      color: '#A7C5C5',
      gradientFrom: '#A7C5C5',
      gradientTo: '#C5A46D',
      domain: [0, 100],
    },
  };

  const currentConf = metricConfig[activeMetric];

  const getHourPhase = (index: number, isNow?: boolean): 'Observed' | 'Current' | 'Forecast' => {
    if (isNow) return 'Current';
    const nowIdx = displayItems.findIndex((i) => i.isNow);
    if (nowIdx === -1) return 'Forecast';
    if (index < nowIdx) return 'Observed';
    if (index === nowIdx) return 'Current';
    return 'Forecast';
  };

  if (displayItems.length === 0) {
    return (
      <DataPanel id="todays-hourly-weather-section">
        <UnavailableState
          title="24-Hour Hourly Forecast Unavailable"
          reason="Hourly numerical guidance is currently unavailable from the upstream weather provider."
          source="Open-Meteo Hourly Forecast"
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel id="todays-hourly-weather-section" className="flex flex-col gap-4">
      <SectionHeading
        title="24-Hour Hourly Trajectory"
        subtitle="Calibrated hourly guidance & trend curve"
        icon={<Clock className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[var(--m-surface-inset)] p-0.5 rounded-lg border border-[var(--m-border)] text-xs">
              {(['temp', 'rain', 'wind', 'humidity'] as ChartMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActiveMetric(m)}
                  className={`px-2.5 py-1 rounded-md transition-colors text-[11px] font-semibold cursor-pointer ${
                    activeMetric === m
                      ? 'bg-[var(--m-accent)] text-[var(--m-text-primary)]'
                      : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                  }`}
                >
                  {m === 'temp' ? 'Temp' : m === 'rain' ? 'Rain %' : m === 'wind' ? 'Wind' : 'Humidity'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className="px-2.5 py-1.5 bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] rounded-lg text-[11px] text-[var(--m-accent)] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChartIcon className="w-3.5 h-3.5" />
              <span>{showChart ? 'Hide Trend' : 'Show Trend'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTable(!showTable)}
              className="px-2.5 py-1.5 bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] rounded-lg text-[11px] text-[var(--m-accent)] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Table className="w-3.5 h-3.5" />
              <span>{showTable ? 'Hide Table' : 'Expand Table'}</span>
              {showTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        }
      />

      {/* Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="m-panel-inset p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/30 text-[var(--m-danger)] flex items-center justify-center shrink-0">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Peak Temp</div>
            <div className="text-xs font-bold text-[var(--m-text-primary)] font-mono tabular-nums truncate">
              {highlights.maxTemp ? `${highlights.maxTemp.val}°C (${highlights.maxTemp.time})` : '—'}
            </div>
          </div>
        </div>

        <div className="m-panel-inset p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/30 text-[var(--m-accent)] flex items-center justify-center shrink-0">
            <Thermometer className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Lowest Temp</div>
            <div className="text-xs font-bold text-[var(--m-text-primary)] font-mono tabular-nums truncate">
              {highlights.minTemp ? `${highlights.minTemp.val}°C (${highlights.minTemp.time})` : '—'}
            </div>
          </div>
        </div>

        <div className="m-panel-inset p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/35 text-[var(--m-accent)] flex items-center justify-center shrink-0">
            <CloudRain className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Max Rain Prob</div>
            <div className="text-xs font-bold text-[var(--m-accent)] font-mono tabular-nums truncate">
              {highlights.maxRain ? `${highlights.maxRain.val}% (${highlights.maxRain.time})` : '—'}
            </div>
          </div>
        </div>

        <div className="m-panel-inset p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/30 text-[var(--m-ok)] flex items-center justify-center shrink-0">
            <Wind className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Peak Wind</div>
            <div className="text-xs font-bold text-[var(--m-text-primary)] font-mono tabular-nums truncate">
              {highlights.maxWind ? `${highlights.maxWind.val} km/h (${highlights.maxWind.time})` : '—'}
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 m-panel-inset p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/30 text-[var(--m-watch)] flex items-center justify-center shrink-0">
            <Droplets className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold">Rain Window</div>
            <div className="text-xs font-semibold text-[var(--m-watch)] truncate" title={highlights.rainPeriod}>
              {highlights.rainPeriod}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Hourly Cards (Snap-scroll on mobile, scannable structured cards on desktop) */}
      <div
        id="hourly-forecast-cards-scroll"
        className="overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory"
      >
        <div className="flex gap-2.5 min-w-max">
          {displayItems.map((item, idx) => {
            const visual = getWeatherVisualConfig(item.condition);
            const IconComponent = visual.icon;
            const phase = getHourPhase(idx, item.isNow);
            const tempVal = isFiniteNum(item.temp) ? Math.round(item.temp) : null;
            const feelsLikeVal = isFiniteNum(item.feelsLike) ? Math.round(item.feelsLike) : null;
            const rainProb = isFiniteNum(item.precipitationProbability)
              ? Math.round(item.precipitationProbability)
              : isFiniteNum(item.rainProb)
              ? Math.round(item.rainProb)
              : null;
            const windSpd = isFiniteNum(item.windSpeed) ? Math.round(item.windSpeed) : null;
            const rh = isFiniteNum(item.humidity) ? Math.round(item.humidity) : null;

            return (
              <div
                key={item.time ? `hourly-card-${item.time}-${idx}` : `hourly-card-${idx}`}
                id={`hourly-card-${idx}`}
                className={`snap-start p-3 rounded-lg border flex flex-col items-center justify-between text-center transition-colors min-w-[126px] w-[132px] shrink-0 ${
                  item.isNow
                    ? 'bg-[var(--m-surface-2)] border-[var(--m-accent)]'
                    : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
                }`}
              >
                <div className="w-full pb-1.5 border-b border-[var(--m-border)]/60 flex flex-col items-center">
                  <div className="text-xs font-bold text-[var(--m-text-primary)] font-mono tabular-nums">
                    {item.time}
                  </div>
                  <span
                    className={`text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${
                      item.isNow
                        ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                        : phase === 'Observed'
                        ? 'bg-[var(--m-surface-1)] text-[var(--m-text-muted)]'
                        : 'bg-[var(--m-surface-1)] text-[var(--m-accent)]'
                    }`}
                  >
                    {phase}
                  </span>
                </div>

                <div className="my-2 flex flex-col items-center">
                  <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] mb-1.5">
                    <IconComponent className={`w-5 h-5 ${visual.iconColor}`} />
                  </div>
                  <div className="text-base font-bold text-[var(--m-text-primary)] font-mono tabular-nums leading-none">
                    {tempVal !== null ? `${tempVal}°C` : '—'}
                  </div>
                  <div className="text-[10px] text-[var(--m-text-muted)] font-mono tabular-nums mt-0.5">
                    {feelsLikeVal !== null ? `Feels ${feelsLikeVal}°C` : 'Feels —'}
                  </div>
                  <span className="text-[10px] text-[var(--m-text-secondary)] truncate max-w-[108px] mt-1">
                    {item.condition || '—'}
                  </span>
                </div>

                <div className="w-full pt-1.5 border-t border-[var(--m-border)]/60 flex flex-col gap-1 text-[10px] text-[var(--m-text-muted)] font-mono tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-0.5 font-sans">
                      <Droplets className="w-2.5 h-2.5 text-[var(--m-accent)]" />
                      Rain
                    </span>
                    <strong className="text-[var(--m-accent)]">{rainProb !== null ? `${rainProb}%` : '—'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-0.5 font-sans">
                      <Wind className="w-2.5 h-2.5 text-[var(--m-ok)]" />
                      Wind
                    </span>
                    <strong className="text-[var(--m-text-primary)]">{windSpd !== null ? `${windSpd} km/h` : '—'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans">RH</span>
                    <strong className="text-[var(--m-text-secondary)]">{rh !== null ? `${rh}%` : '—'}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trend Curve */}
      {showChart && chartData.length > 0 && (
        <div id="hourly-trend-chart-panel" className="m-panel-inset p-4">
          <div className="flex items-center justify-between text-xs text-[var(--m-text-muted)] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[var(--m-text-primary)] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              {currentConf.label} Curve ({currentConf.unit})
            </span>
            <span className="font-mono text-[10px]">24-Hour Continuous Trace</span>
          </div>

          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id={`hourlyGrad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentConf.gradientFrom} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={currentConf.gradientTo} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#898B83" fontSize={10} tickLine={false} interval={2} />
                <YAxis
                  stroke="#898B83"
                  fontSize={10}
                  tickLine={false}
                  domain={currentConf.domain as any}
                  unit={currentConf.unit === '%' ? '%' : ''}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111314',
                    borderColor: '#2F3534',
                    borderRadius: '8px',
                    color: '#F0EEE7',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [
                    val === null || val === undefined ? 'Unavailable' : `${val} ${currentConf.unit}`,
                    currentConf.label,
                  ]}
                  labelFormatter={(label: any) => `Time: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke={currentConf.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  connectNulls
                  fill={`url(#hourlyGrad-${activeMetric})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Numerical Table */}
      {showTable && (
        <div id="hourly-detailed-table-container" className="m-panel-inset p-3 overflow-x-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--m-border)] text-xs">
            <span className="font-bold text-[var(--m-text-primary)] uppercase text-[11px] flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              24-Hour Numerical Schedule
            </span>
            <span className="text-[10px] text-[var(--m-text-muted)]">Direct upstream model &amp; observation rows</span>
          </div>

          <table className="w-full text-left text-xs font-mono tabular-nums border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--m-border)] text-[10px] text-[var(--m-text-muted)] uppercase tracking-wider bg-[var(--m-surface-1)]">
                <th className="py-2 px-2.5">Time</th>
                <th className="py-2 px-2">Phase</th>
                <th className="py-2 px-2">Condition</th>
                <th className="py-2 px-2">Temp</th>
                <th className="py-2 px-2">Feels Like</th>
                <th className="py-2 px-2">Rain Prob</th>
                <th className="py-2 px-2">Precip</th>
                <th className="py-2 px-2">Wind</th>
                <th className="py-2 px-2">Humidity</th>
                <th className="py-2 px-2">UV</th>
                <th className="py-2 px-2">Cloud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m-border-strong)] text-[var(--m-text-secondary)]">
              {displayItems.map((item, idx) => {
                const phase = getHourPhase(idx, item.isNow);
                const tempVal = isFiniteNum(item.temp) ? `${Math.round(item.temp)}°C` : '—';
                const feelsVal = isFiniteNum(item.feelsLike) ? `${Math.round(item.feelsLike)}°C` : '—';
                const rainProb = isFiniteNum(item.precipitationProbability)
                  ? `${Math.round(item.precipitationProbability)}%`
                  : isFiniteNum(item.rainProb)
                  ? `${Math.round(item.rainProb)}%`
                  : '—';
                const precipMm = isFiniteNum(item.precipitation) ? `${item.precipitation.toFixed(1)} mm` : '—';
                const wind = isFiniteNum(item.windSpeed)
                  ? `${Math.round(item.windSpeed)} km/h${item.windDirection && item.windDirection !== '—' ? ` ${item.windDirection}` : ''}`
                  : '—';
                const rh = isFiniteNum(item.humidity) ? `${Math.round(item.humidity)}%` : '—';
                const uv = isFiniteNum(item.uv) ? item.uv.toFixed(1) : '—';
                const cloud = isFiniteNum(item.cloudCover) ? `${Math.round(item.cloudCover)}%` : '—';

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-[var(--m-surface-2)] transition-colors ${
                      item.isNow ? 'bg-[var(--m-accent-soft)] font-semibold text-[var(--m-text-primary)]' : ''
                    }`}
                  >
                    <td className="py-2 px-2.5 font-bold text-[var(--m-text-primary)]">{item.time}</td>
                    <td className="py-2 px-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-accent)]">
                        {phase}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-sans text-[11px] text-[var(--m-text-primary)]">{item.condition || '—'}</td>
                    <td className="py-2 px-2 font-bold text-[var(--m-text-primary)]">{tempVal}</td>
                    <td className="py-2 px-2">{feelsVal}</td>
                    <td className="py-2 px-2 text-[var(--m-accent)] font-semibold">{rainProb}</td>
                    <td className="py-2 px-2">{precipMm}</td>
                    <td className="py-2 px-2">{wind}</td>
                    <td className="py-2 px-2">{rh}</td>
                    <td className="py-2 px-2">{uv}</td>
                    <td className="py-2 px-2">{cloud}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  );
};
