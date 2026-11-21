import React, { useState } from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  GitBranch,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Thermometer,
  CloudRain,
  Droplets,
  ShieldAlert,
} from 'lucide-react';

interface WeatherCropResponseProps {
  bulletin: ExtendedAgrometBulletin;
  selectedCrop: string;
}

export const WeatherCropResponse: React.FC<WeatherCropResponseProps> = ({
  bulletin,
  selectedCrop,
}) => {
  const [activeMetric, setActiveMetric] = useState<'all' | 'rain' | 'soil' | 'risk'>('all');

  const activeCrop =
    bulletin.crops.find((c) => c.cropName === selectedCrop) || bulletin.crops[0];
  const todayRain = bulletin.rainfall5DaysList[0]?.amountMm ?? 0;
  const irrigationAction = bulletin.actionPlan.find((a) => a.category === 'irrigation');

  const chartData = bulletin.sevenDayCalendar.map((d) => ({
    day: `${d.day} (${d.date})`,
    temp: d.tempMax > 0 ? Math.round(d.tempMax) : null,
    rain: Math.round(d.rainMm * 10) / 10,
    soilMoisture: bulletin.soilMoisture.available ? bulletin.soilMoisture.overallPct : null,
    cropRisk: Math.min(
      100,
      Math.max(
        15,
        Math.round(
          bulletin.riskAnalysis.overallScore * 0.55 + d.rainMm * 1.4 + d.rainProb * 0.25
        )
      )
    ),
  }));

  return (
    <section id="weather-crop-response-section" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--m-border)]">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--m-accent)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-accent)]">
              Weather-Derived Agronomic Synthesis
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            How Forecast Weather Affects Your Crop
          </h2>
        </div>
        <span className="text-xs font-mono text-[var(--m-text-muted)]">
          Derived from live NWP forecast for {selectedCrop} · {bulletin.district}
        </span>
      </div>

      {/* 1. VISUAL FLOW CONNECTOR: WEATHER -> SOIL -> CROP -> RISK -> ACTION */}
      <div className="rounded-3xl bg-[var(--m-surface-1)] border border-[var(--m-border)] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Derived Agronomic Causal Chain
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/30">
            Weather-Derived Guidance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {/* STEP 1: WEATHER */}
          <div className="p-4 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-accent)]/40 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[var(--m-accent)]">01 • WEATHER</span>
              <CloudRain className="w-3.5 h-3.5 text-[var(--m-accent)]" />
            </div>
            <h4 className="text-sm font-bold text-white">
              {todayRain > 0 ? `${todayRain} mm Today` : 'Dry / Low Rain'}
            </h4>
            <p className="text-[11px] text-[var(--m-text-muted)] leading-relaxed">
              5-day total forecast: {Math.round(bulletin.cumulativeRainfallMm * 10) / 10} mm across {bulletin.district}.
            </p>
          </div>

          {/* STEP 2: SOIL */}
          <div className="p-4 rounded-2xl bg-[var(--m-surface-inset)] border border-[#10B981]/40 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[var(--m-ok)]">02 • SOIL</span>
              <Droplets className="w-3.5 h-3.5 text-[var(--m-ok)]" />
            </div>
            <h4 className="text-sm font-bold text-white">
              {bulletin.soilMoisture.available
                ? `${bulletin.soilMoisture.overallPct}% (${bulletin.soilMoisture.status})`
                : 'Telemetry Unavailable'}
            </h4>
            <p className="text-[11px] text-[var(--m-text-muted)] leading-relaxed">
              {bulletin.soilMoisture.available
                ? 'Modelled root-zone soil moisture from Open-Meteo.'
                : 'Inspect field topsoil manually before pumping.'}
            </p>
          </div>

          {/* STEP 3: CROP */}
          <div className="p-4 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-watch)]/40 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[var(--m-watch)]">03 • CROP STAGE</span>
              <Activity className="w-3.5 h-3.5 text-[var(--m-watch)]" />
            </div>
            <h4 className="text-sm font-bold text-white">{activeCrop?.stage || 'Active Field Stage'}</h4>
            <p className="text-[11px] text-[var(--m-text-muted)] leading-relaxed">
              Reference guidance for {activeCrop?.cropName || selectedCrop} in {bulletin.state}.
            </p>
          </div>

          {/* STEP 4: RISK */}
          <div className="p-4 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-danger)]/40 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[var(--m-danger)]">04 • RISK</span>
              <ShieldAlert className="w-3.5 h-3.5 text-[var(--m-danger)]" />
            </div>
            <h4 className="text-sm font-bold text-white">
              {bulletin.riskAnalysis.riskLevel} ({bulletin.riskAnalysis.overallScore}/100)
            </h4>
            <p className="text-[11px] text-[var(--m-text-muted)] leading-relaxed">
              {bulletin.pestDiseaseWatch.primaryConcern}.
            </p>
          </div>

          {/* STEP 5: ACTION */}
          <div className="p-4 rounded-2xl bg-[var(--m-surface-inset)] border border-[#8B5CF6]/40 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#A78BFA]">05 • ACTION</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#A78BFA]" />
            </div>
            <h4 className="text-sm font-bold text-white">
              {irrigationAction?.action || 'Follow Live Forecast'}
            </h4>
            <p className="text-[11px] text-[var(--m-text-muted)] leading-relaxed">
              {irrigationAction?.when || 'Review with official IMD GKMS advisory.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE 7-DAY WEATHER X CROP RESPONSE CHART */}
      <div className="rounded-3xl bg-[var(--m-surface-1)] border border-[var(--m-border)] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--m-border)]">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              7-Day Weather × Crop Response Matrix
            </h3>
            <p className="text-xs font-mono text-[var(--m-text-muted)] mt-0.5">
              Simulated inter-relationship between Rainfall, Soil Hydrology, Temperature &amp; Pathogen Pressure
            </p>
          </div>

          {/* Metric Toggle Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveMetric('all')}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeMetric === 'all'
                  ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border border-[var(--m-border)]'
              }`}
            >
              All Signals
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('rain')}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeMetric === 'rain'
                  ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border border-[var(--m-border)]'
              }`}
            >
              Rainfall (mm)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('soil')}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeMetric === 'soil'
                  ? 'bg-[#10B981] text-[var(--m-on-accent)]'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border border-[var(--m-border)]'
              }`}
            >
              Soil Moisture (%)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('risk')}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeMetric === 'risk'
                  ? 'bg-[#EF4444] text-white'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border border-[var(--m-border)]'
              }`}
            >
              Crop Risk Index
            </button>
          </div>
        </div>

        {/* Recharts Multi-Axis Graph */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1E2E40" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                stroke="#2F3534"
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                stroke="#2F3534"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#898B83', fontSize: 11, fontFamily: 'monospace' }}
                stroke="#2F3534"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#080E16',
                  borderColor: '#1E2E40',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '10px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
              {(activeMetric === 'all' || activeMetric === 'rain') && (
                <Bar
                  yAxisId="left"
                  dataKey="rain"
                  name="Rainfall (mm)"
                  fill="#C5A46D"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
              )}
              {(activeMetric === 'all' || activeMetric === 'soil') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="soilMoisture"
                  name="Soil Moisture (%)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10B981' }}
                />
              )}
              {(activeMetric === 'all' || activeMetric === 'risk') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cropRisk"
                  name="Crop Risk Index"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: '#EF4444' }}
                />
              )}
              {activeMetric === 'all' && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temp"
                  name="Air Temp (°C)"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#F59E0B' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
