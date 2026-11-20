import React, { useState } from 'react';
import { HOURLY_FORECAST } from '../data/weatherData';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const HourlyView: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<'temp' | 'aqi' | 'rainProb' | 'windSpeed'>('temp');

  const chartColor =
    selectedMetric === 'temp'
      ? '#C5A46D'
      : selectedMetric === 'aqi'
      ? '#FFB703'
      : selectedMetric === 'rainProb'
      ? '#C5A46D'
      : '#2ECC71';

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto select-none font-sans">
      {/* Top Header Card */}
      <div className="bg-[var(--m-surface-2)] card-border rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[var(--m-accent)] text-[20px]">schedule</span>
            <h2 className="font-h3 text-base font-bold text-[var(--m-text-primary)]">
              24-Hour Atmospheric Hourly Matrix
            </h2>
          </div>
          <p className="text-xs text-[var(--m-text-secondary)]">
            Synoptic Station Stream • High-frequency sensor matrix at 1-hour temporal resolution
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex gap-1.5 p-1 bg-[var(--m-surface-1)] rounded-lg card-border">
          {[
            { id: 'temp', label: 'Temperature (°C)' },
            { id: 'aqi', label: 'PM2.5 (µg/m³)' },
            { id: 'rainProb', label: 'Precipitation (%)' },
            { id: 'windSpeed', label: 'Wind (km/h)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedMetric(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedMetric === tab.id
                  ? 'bg-[var(--m-accent)] text-[#FFFFFF] shadow-sm'
                  : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hourly Trend Chart */}
      <div className="bg-[var(--m-surface-2)] card-border rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-h4 text-sm font-semibold text-[var(--m-text-primary)]">
            Telemetry Curve ({selectedMetric.toUpperCase()})
          </h3>
          <span className="text-xs text-[var(--m-accent)] font-medium">
            {selectedMetric === 'temp'
              ? 'Peak 31.0°C at 13:00 • Minimum 21.5°C at Dawn'
              : selectedMetric === 'aqi'
              ? 'Elevated until 18:00 Local • Nighttime dispersion expected'
              : selectedMetric === 'rainProb'
              ? 'Clearing trend throughout the evening'
              : 'Moderate breeze dying down after dusk'}
          </span>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HOURLY_FORECAST} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 219, 200,0.12)" />
              <XAxis
                dataKey="time"
                stroke="#898B83"
                tick={{ fill: '#898B83', fontSize: 11 }}
              />
              <YAxis
                stroke="#898B83"
                tick={{ fill: '#898B83', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111314',
                  borderColor: 'rgba(226, 219, 200,0.12)',
                  borderRadius: 8,
                  color: '#F0EEE7',
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke={chartColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#metricGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Detailed Cards Scroll Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
        {HOURLY_FORECAST.slice(0, 7).map((item, idx) => {
          const hasTemp = typeof item.temp === 'number' && Number.isFinite(item.temp);
          const hasAqi = typeof item.aqi === 'number' && Number.isFinite(item.aqi);
          const hasRain = typeof item.rainProb === 'number' && Number.isFinite(item.rainProb);
          const hasWind = typeof item.windSpeed === 'number' && Number.isFinite(item.windSpeed);
          return (
            <div
              key={item.time}
              className={`bg-[var(--m-surface-1)] card-border rounded-xl p-3.5 flex flex-col items-center text-center gap-2 hover:border-[var(--m-accent)] transition-all cursor-pointer ${
                idx === 2 ? 'ring-1 ring-[var(--m-focus)] bg-[var(--m-surface-2)]' : ''
              }`}
            >
              <span className="text-xs text-[var(--m-text-secondary)]">
                {item.time} {idx === 2 ? '(NOW)' : ''}
              </span>
              <span
                className="material-symbols-outlined text-[28px] my-1 text-[var(--m-text-primary)]"
              >
                {item.icon || 'cloud'}
              </span>
              <span className="text-xl font-bold text-[var(--m-text-primary)]">
                {hasTemp ? `${Math.round(item.temp)}°C` : '—'}
              </span>
              <div className="w-full h-px bg-[rgba(226, 219, 200,0.12)] my-0.5"></div>
              <div className="w-full flex justify-between text-[11px] text-[var(--m-text-secondary)]">
                <span>AQI</span>
                <span
                  className="font-bold"
                  style={{ color: hasAqi ? (item.aqi > 100 ? '#FFB703' : '#2ECC71') : '#898B83' }}
                >
                  {hasAqi ? item.aqi : '—'}
                </span>
              </div>
              <div className="w-full flex justify-between text-[11px] text-[var(--m-text-secondary)]">
                <span>Rain</span>
                <span className="text-[var(--m-accent)]">{hasRain ? `${item.rainProb}%` : '—'}</span>
              </div>
              <div className="w-full flex justify-between text-[11px] text-[var(--m-text-secondary)]">
                <span>Wind</span>
                <span>{hasWind ? `${item.windSpeed} km/h` : '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
