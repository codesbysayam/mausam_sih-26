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
      color: '#35C7E8',
      gradientFrom: '#35C7E8',
      gradientTo: '#0B72B9',
      domain: ['auto', 'auto'],
    },
    rain: {
      label: 'Precipitation Probability',
      unit: '%',
      color: '#0B72B9',
      gradientFrom: '#0B72B9',
      gradientTo: '#22C7A0',
      domain: [0, 100],
    },
    wind: {
      label: 'Wind Velocity',
      unit: 'km/h',
      color: '#22C7A0',
      gradientFrom: '#22C7A0',
      gradientTo: '#0B1927',
      domain: [0, 'auto'],
    },
    humidity: {
      label: 'Relative Humidity',
      unit: '%',
      color: '#7DD3FC',
      gradientFrom: '#7DD3FC',
      gradientTo: '#0B72B9',
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
            <div className="flex items-center bg-[#08131F] p-0.5 rounded-lg border border-[#26394B] text-xs">
              {(['temp', 'rain', 'wind', 'humidity'] as ChartMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActiveMetric(m)}
                  className={`px-2.5 py-1 rounded-md transition-colors text-[11px] font-semibold cursor-pointer ${
                    activeMetric === m
                      ? 'bg-[#0B72B9] text-[#F3F6FA]'
                      : 'text-[#8295A8] hover:text-[#F3F6FA]'
                  }`}
                >
                  {m === 'temp' ? 'Temp' : m === 'rain' ? 'Rain %' : m === 'wind' ? 'Wind' : 'Humidity'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className="px-2.5 py-1.5 bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] rounded-lg text-[11px] text-[#35C7E8] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChartIcon className="w-3.5 h-3.5" />
              <span>{showChart ? 'Hide Trend' : 'Show Trend'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTable(!showTable)}
              className="px-2.5 py-1.5 bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] rounded-lg text-[11px] text-[#35C7E8] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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
          <div className="w-7 h-7 rounded-md bg-[#EF4444]/12 border border-[#EF4444]/30 text-[#FCA5A5] flex items-center justify-center shrink-0">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[#8295A8] uppercase font-semibold">Peak Temp</div>
            <div className="text-xs font-bold text-[#F3F6FA] font-mono tabular-nums truncate">
              {highlights.maxTemp ? `${highlights.maxTemp.val}°C (${highlights.maxTemp.time})` : '—'}
            </div>
          </div>
        </div>

        <div className="m-panel-inset p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#35C7E8]/12 border border-[#35C7E8]/30 text-[#35C7E8] flex items-center justify-center shrink-0">
            <Thermometer className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[#8295A8] uppercase font-semibold">Lowest Temp</div>
            <div className="text-xs font-bold text-[#F3F6FA] font-mono tabular-nums truncate">
              {highlights.minTemp ? `${highlights.minTemp.val}°C (${highlights.minTemp.time})` : '—'}
            </div>
          </div>
        </div>

        <div className="m-panel-inset p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#0B72B9]/15 border border-[#0B72B9]/35 text-[#7DD3FC] flex items-center justify-center shrink-0">
            <CloudRain className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[#8295A8] uppercase font-semibold">Max Rain Prob</div>
            <div className="text-xs font-bold text-[#35C7E8] font-mono tabular-nums truncate">
              {highlights.maxRain ? `${highlights.maxRain.val}% (${highlights.maxRain.time})` : '—'}
            </div>
          </div>
        </div>

        <div className="m-panel-inset p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#22C7A0]/12 border border-[#22C7A0]/30 text-[#6EE7B7] flex items-center justify-center shrink-0">
            <Wind className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[#8295A8] uppercase font-semibold">Peak Wind</div>
            <div className="text-xs font-bold text-[#F3F6FA] font-mono tabular-nums truncate">
              {highlights.maxWind ? `${highlights.maxWind.val} km/h (${highlights.maxWind.time})` : '—'}
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 m-panel-inset p-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#F59E0B]/12 border border-[#F59E0B]/30 text-[#FCD34D] flex items-center justify-center shrink-0">
            <Droplets className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[#8295A8] uppercase font-semibold">Rain Window</div>
            <div className="text-xs font-semibold text-[#FCD34D] truncate" title={highlights.rainPeriod}>
              {highlights.rainPeriod}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Hourly Cards */}
      <div
        id="hourly-forecast-cards-scroll"
        className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#26394B]"
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
                className={`p-3 rounded-lg border flex flex-col items-center justify-between text-center transition-colors min-w-[112px] w-[116px] ${
                  item.isNow
                    ? 'bg-[#101F2E] border-[#35C7E8]'
                    : 'bg-[#08131F] border-[#26394B] hover:border-[#38536A]'
                }`}
              >
                <div className="w-full pb-1.5 border-b border-[#26394B]/60 flex flex-col items-center">
                  <div className="text-xs font-bold text-[#F3F6FA] font-mono tabular-nums">
                    {item.time}
                  </div>
                  <span
                    className={`text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${
                      item.isNow
                        ? 'bg-[#0B72B9] text-[#F3F6FA]'
                        : phase === 'Observed'
                        ? 'bg-[#0B1927] text-[#8295A8]'
                        : 'bg-[#0B1927] text-[#35C7E8]'
                    }`}
                  >
                    {phase}
                  </span>
                </div>

                <div className="my-2 flex flex-col items-center">
                  <div className="p-2 rounded-lg bg-[#0B1927] border border-[#26394B] mb-1.5">
                    <IconComponent className={`w-5 h-5 ${visual.iconColor}`} />
                  </div>
                  <div className="text-base font-bold text-[#F3F6FA] font-mono tabular-nums leading-none">
                    {tempVal !== null ? `${tempVal}°` : '—'}
                  </div>
                  <div className="text-[10px] text-[#8295A8] font-mono tabular-nums mt-0.5">
                    {feelsLikeVal !== null ? `Feels ${feelsLikeVal}°` : 'Feels —'}
                  </div>
                  <span className="text-[10px] text-[#B5C3D1] truncate max-w-[96px] mt-1">
                    {item.condition || '—'}
                  </span>
                </div>

                <div className="w-full pt-1.5 border-t border-[#26394B]/60 flex flex-col gap-1 text-[10px] text-[#8295A8] font-mono tabular-nums">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-0.5 font-sans">
                      <Droplets className="w-2.5 h-2.5 text-[#35C7E8]" />
                      Rain
                    </span>
                    <strong className="text-[#35C7E8]">{rainProb !== null ? `${rainProb}%` : '—'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-0.5 font-sans">
                      <Wind className="w-2.5 h-2.5 text-[#22C7A0]" />
                      Wind
                    </span>
                    <strong className="text-[#F3F6FA]">{windSpd !== null ? `${windSpd}k` : '—'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans">RH</span>
                    <strong className="text-[#B5C3D1]">{rh !== null ? `${rh}%` : '—'}</strong>
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
          <div className="flex items-center justify-between text-xs text-[#8295A8] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#F3F6FA] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#35C7E8]" />
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
                <XAxis dataKey="time" stroke="#8295A8" fontSize={10} tickLine={false} interval={2} />
                <YAxis
                  stroke="#8295A8"
                  fontSize={10}
                  tickLine={false}
                  domain={currentConf.domain as any}
                  unit={currentConf.unit === '%' ? '%' : ''}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1927',
                    borderColor: '#38536A',
                    borderRadius: '8px',
                    color: '#F3F6FA',
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
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#26394B] text-xs">
            <span className="font-bold text-[#F3F6FA] uppercase text-[11px] flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-[#35C7E8]" />
              24-Hour Numerical Schedule
            </span>
            <span className="text-[10px] text-[#8295A8]">Direct upstream model &amp; observation rows</span>
          </div>

          <table className="w-full text-left text-xs font-mono tabular-nums border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#26394B] text-[10px] text-[#8295A8] uppercase tracking-wider bg-[#0B1927]">
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
            <tbody className="divide-y divide-[#26394B]/60 text-[#B5C3D1]">
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
                    className={`hover:bg-[#101F2E] transition-colors ${
                      item.isNow ? 'bg-[#0B72B9]/12 font-semibold text-[#F3F6FA]' : ''
                    }`}
                  >
                    <td className="py-2 px-2.5 font-bold text-[#F3F6FA]">{item.time}</td>
                    <td className="py-2 px-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B1927] border border-[#26394B] text-[#7DD3FC]">
                        {phase}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-sans text-[11px] text-[#F3F6FA]">{item.condition || '—'}</td>
                    <td className="py-2 px-2 font-bold text-[#F3F6FA]">{tempVal}</td>
                    <td className="py-2 px-2">{feelsVal}</td>
                    <td className="py-2 px-2 text-[#35C7E8] font-semibold">{rainProb}</td>
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
