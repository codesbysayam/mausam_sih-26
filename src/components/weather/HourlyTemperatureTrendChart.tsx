import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Thermometer, TrendingUp, TrendingDown } from 'lucide-react';
import type { HourlyForecastItem, LocationRecord } from '../../types';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';
import { formatLocationShort } from '../../utils/locationFormatter';

interface HourlyTemperatureTrendChartProps {
  hourly: HourlyForecastItem[];
  location?: LocationRecord;
  source?: string;
  lastUpdated?: string;
}

interface ChartPoint {
  time: string;
  temp: number | null;
  feelsLike: number | null;
  rainProb: number | null;
  windSpeed: number | null;
  humidity: number | null;
  condition: string;
  isNow: boolean;
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const CustomTempTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="rounded-lg border border-[var(--m-border-strong)] bg-[var(--m-surface-1)] px-3 py-2.5 shadow-lg text-xs min-w-[178px]">
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[var(--m-border)]">
        <span className="font-mono font-bold text-[var(--m-text-primary)] tabular-nums">
          {label} IST
        </span>
        {pt.isNow && (
          <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35">
            Current Slot
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[var(--m-text-muted)]">Air Temp</span>
          <span className="font-bold text-[var(--m-accent)]">
            {pt.temp !== null ? `${pt.temp.toFixed(1)} °C` : 'Not reported'}
          </span>
        </div>
        {pt.feelsLike !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans text-[var(--m-text-muted)]">Feels Like</span>
            <span className="text-[var(--m-text-secondary)]">{pt.feelsLike.toFixed(1)} °C</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[var(--m-text-muted)]">Rain Prob</span>
          <span className="text-[var(--m-text-primary)]">
            {pt.rainProb !== null ? `${Math.round(pt.rainProb)} %` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[var(--m-text-muted)]">Wind (10m)</span>
          <span className="text-[var(--m-text-primary)]">
            {pt.windSpeed !== null ? `${Math.round(pt.windSpeed)} km/h` : '—'}
          </span>
        </div>
        {pt.humidity !== null && (
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans text-[var(--m-text-muted)]">Humidity</span>
            <span className="text-[var(--m-text-secondary)]">{Math.round(pt.humidity)} %</span>
          </div>
        )}
      </div>

      {pt.condition && pt.condition !== '—' && (
        <div className="mt-1.5 pt-1.5 border-t border-[var(--m-border)] text-[11px] font-sans text-[var(--m-text-secondary)]">
          {pt.condition}
        </div>
      )}
    </div>
  );
};

export const HourlyTemperatureTrendChart: React.FC<HourlyTemperatureTrendChartProps> = ({
  hourly = [],
  location,
  source,
  lastUpdated,
}) => {
  const series = useMemo<ChartPoint[]>(() => {
    return (hourly || []).slice(0, 24).map((item) => {
      const rainProb = isFiniteNumber(item.precipitationProbability)
        ? item.precipitationProbability
        : isFiniteNumber(item.rainProb)
        ? item.rainProb
        : null;

      return {
        time: item.time || '—',
        temp: isFiniteNumber(item.temp) ? Number(item.temp.toFixed(1)) : null,
        feelsLike: isFiniteNumber(item.feelsLike) ? Number(item.feelsLike.toFixed(1)) : null,
        rainProb,
        windSpeed: isFiniteNumber(item.windSpeed) ? item.windSpeed : null,
        humidity: isFiniteNumber(item.humidity) ? item.humidity : null,
        condition: item.condition || '—',
        isNow: Boolean(item.isNow),
      };
    });
  }, [hourly]);

  const stats = useMemo(() => {
    const validTemps = series.filter((pt): pt is ChartPoint & { temp: number } => pt.temp !== null);
    if (validTemps.length === 0) return null;

    let high = validTemps[0];
    let low = validTemps[0];
    let sum = 0;

    for (const pt of validTemps) {
      sum += pt.temp;
      if (pt.temp > high.temp) high = pt;
      if (pt.temp < low.temp) low = pt;
    }

    const avg = sum / validTemps.length;
    const hasFeelsLike = series.some((pt) => pt.feelsLike !== null);
    const nowSlot = series.find((pt) => pt.isNow)?.time ?? null;

    return {
      high,
      low,
      avg: Number(avg.toFixed(1)),
      span: Number((high.temp - low.temp).toFixed(1)),
      minDomain: Math.floor(low.temp - 2),
      maxDomain: Math.ceil(high.temp + 2),
      hasFeelsLike,
      nowSlot,
      validCount: validTemps.length,
    };
  }, [series]);

  const locationLabel = location ? formatLocationShort(location) : 'Selected Location';

  if (!stats) {
    return (
      <DataPanel id="forecast-hourly-temperature-chart">
        <UnavailableState
          title="Hourly Temperature Trend Unavailable"
          reason="Verified 24-hour hourly temperature guidance is not currently available for this location."
          source={source || 'Open-Meteo Hourly Model Grid'}
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel id="forecast-hourly-temperature-chart" className="flex flex-col gap-4">
      <SectionHeading
        title="24-Hour Temperature Trend"
        subtitle={`Hourly 2m air temperature trajectory for ${locationLabel} (IST · °C)`}
        icon={<Thermometer className="w-4 h-4" />}
        action={
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--m-danger)]" />
              <span className="text-[var(--m-text-muted)]">High</span>
              <strong className="text-[var(--m-text-primary)]">
                {stats.high.temp.toFixed(1)}°C
              </strong>
              <span className="text-[10px] text-[var(--m-text-muted)] hidden sm:inline">
                ({stats.high.time})
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              <TrendingDown className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span className="text-[var(--m-text-muted)]">Low</span>
              <strong className="text-[var(--m-text-primary)]">
                {stats.low.temp.toFixed(1)}°C
              </strong>
              <span className="text-[10px] text-[var(--m-text-muted)] hidden sm:inline">
                ({stats.low.time})
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              <span className="text-[var(--m-text-muted)]">Diurnal Δ</span>
              <strong className="text-[var(--m-text-primary)]">{stats.span.toFixed(1)}°C</strong>
            </div>
          </div>
        }
      />

      {/* Legend + Provenance Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--m-text-muted)]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--m-text-secondary)]">
            <span className="w-4 h-0.5 bg-[var(--m-accent)] inline-block" />
            2m Air Temp (°C)
          </span>
          {stats.hasFeelsLike && (
            <span className="inline-flex items-center gap-1.5 font-medium text-[var(--m-text-secondary)]">
              <span className="w-4 h-0 border-t-2 border-dashed border-[#78AEB6] inline-block" />
              Apparent / Feels Like (°C)
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] tabular-nums">
          Source: {source || 'Open-Meteo Model Grid'} · {stats.validCount} hourly slots
          {lastUpdated ? ` · Synced ${lastUpdated}` : ''}
        </span>
      </div>

      {/* Responsive Recharts Line Chart */}
      <div className="m-panel-inset p-3 sm:p-4">
        <div className="w-full h-[240px] sm:h-[270px]" role="img" aria-label={`Hourly temperature trend line chart for ${locationLabel}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series}
              margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
            >
              <CartesianGrid
                stroke="var(--m-border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke="var(--m-text-muted)"
                tick={{ fill: 'var(--m-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--m-border)' }}
                minTickGap={22}
              />
              <YAxis
                stroke="var(--m-text-muted)"
                tick={{ fill: 'var(--m-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                domain={[stats.minDomain, stats.maxDomain]}
                tickFormatter={(v: number) => `${v}°`}
                width={42}
              />
              <Tooltip
                content={<CustomTempTooltip />}
                cursor={{ stroke: 'var(--m-accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              {stats.nowSlot && (
                <ReferenceLine
                  x={stats.nowSlot}
                  stroke="var(--m-accent)"
                  strokeOpacity={0.45}
                  strokeDasharray="3 3"
                />
              )}
              <Line
                type="monotone"
                dataKey="temp"
                name="Air Temperature"
                stroke="var(--m-accent)"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: 'var(--m-surface-1)', stroke: 'var(--m-accent)', strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: 'var(--m-accent)', stroke: 'var(--m-surface-1)', strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
              {stats.hasFeelsLike && (
                <Line
                  type="monotone"
                  dataKey="feelsLike"
                  name="Feels Like"
                  stroke="#78AEB6"
                  strokeWidth={1.75}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4, fill: '#78AEB6', stroke: 'var(--m-surface-1)', strokeWidth: 1.5 }}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DataPanel>
  );
};

export default HourlyTemperatureTrendChart;
