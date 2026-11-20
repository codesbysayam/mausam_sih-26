import React from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  CloudRain,
  Droplets,
  Thermometer,
  Wind,
  Sun,
  Sprout,
  Compass,
  Layers,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface TodaysFarmOutlookProps {
  bulletin: ExtendedAgrometBulletin;
}

export const TodaysFarmOutlook: React.FC<TodaysFarmOutlookProps> = ({ bulletin }) => {
  const todayRain = bulletin.rainfall5DaysList[0]?.amountMm || 0;
  const todayProb = bulletin.rainfall5DaysList[0]?.probPercent || 40;
  const soil = bulletin.soilMoisture;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--m-surface-1)] via-[var(--m-surface-1)] to-[var(--m-surface-inset)] border border-[var(--m-border)] shadow-2xl p-6 sm:p-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[var(--m-border)] gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#2ECC71] animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
              Today on the Farm
            </h2>
          </div>
          <p className="text-sm text-[var(--m-text-muted)] mt-0.5">
            Everything that matters for today&apos;s field decisions in {bulletin.district}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-[var(--m-text-muted)] font-mono">
          <span className="px-2.5 py-1 rounded-md bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-[var(--m-accent)]">
            Synoptic Cycle: 08:30 IST
          </span>
          <span className="text-[#2ECC71] font-semibold">● Active Advisory</span>
        </div>
      </div>

      {/* Wide Centerpiece Composition: 50/50 Dual Wings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT (6 Cols): Large Primary Weather Condition */}
        <div className="lg:col-span-6 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 flex flex-col justify-between relative overflow-hidden shadow-inner">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-[var(--m-accent)] uppercase tracking-wider font-mono block">
                Atmospheric State
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Partly Cloudy with Convective Showers
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/30 text-[var(--m-accent)]">
              <CloudRain className="w-8 h-8" />
            </div>
          </div>

          {/* Primary Thermal & Rain Headline */}
          <div className="my-5 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-black font-mono text-white tracking-tighter">
                  31°
                </span>
                <span className="text-2xl font-bold font-mono text-[var(--m-text-muted)]">/ 24°C</span>
              </div>
              <span className="text-xs text-[var(--m-text-muted)] block mt-1">
                Diurnal Range • GDD Accumulation +14.2°C
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] text-right">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-mono block">Expected Rainfall</span>
              <div className="flex items-baseline justify-end gap-1 mt-0.5">
                <span className="text-3xl font-black font-mono text-[var(--m-accent)]">{todayRain}</span>
                <span className="text-xs font-bold text-[var(--m-accent)]">mm</span>
              </div>
              <span className="text-[11px] text-[#2ECC71] font-mono font-medium">{todayProb}% Probability</span>
            </div>
          </div>

          {/* Micro Weather Attributes Bar */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--m-border)] text-xs">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[var(--m-accent)]" />
              <div>
                <span className="text-[10px] text-[var(--m-text-muted)] block">Relative Humidity</span>
                <span className="font-bold text-white font-mono">75–85% (High)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-[#A855F7]" />
              <div>
                <span className="text-[10px] text-[var(--m-text-muted)] block">Surface Wind</span>
                <span className="font-bold text-white font-mono">12 km/h ESE</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-[var(--m-watch)]" />
              <div>
                <span className="text-[10px] text-[var(--m-text-muted)] block">Evaporation (ET₀)</span>
                <span className="font-bold text-white font-mono">4.2 mm/day</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT (6 Cols): Large Agricultural Condition Visualizer */}
        <div className="lg:col-span-6 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--m-border)]">
            <div>
              <span className="text-[11px] font-bold text-[#2ECC71] uppercase tracking-wider font-mono block">
                Field Health &amp; Agronomic Indicators
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Current Operational Suitability
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 text-xs font-bold font-mono">
              Favorable
            </span>
          </div>

          {/* 4 Graphic Agricultural Gauges */}
          <div className="grid grid-cols-2 gap-4 my-4">
            {/* 1. Soil Moisture Gauge */}
            <div className="p-4 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#2ECC71] uppercase flex items-center gap-1.5">
                  <Sprout className="w-3.5 h-3.5" />
                  Soil Moisture
                </span>
                <span className="text-[10px] text-[var(--m-text-muted)] font-mono">Topsoil 0–15cm</span>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white">{soil.overallPct}%</span>
                <span className="text-xs text-[#2ECC71] font-semibold">({soil.status})</span>
              </div>
              {/* Stepped Moisture Bar */}
              <div className="w-full bg-[var(--m-surface-2)] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2ECC71] to-[#10B981] rounded-full"
                  style={{ width: `${soil.overallPct}%` }}
                />
              </div>
            </div>

            {/* 2. Rainfall Influx */}
            <div className="p-4 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--m-accent)] uppercase flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5" />
                  Rain Status
                </span>
                <span className="text-[10px] text-[var(--m-text-muted)] font-mono">24h Influx</span>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white">{todayRain}</span>
                <span className="text-xs text-[var(--m-accent)] font-semibold">mm QPF</span>
              </div>
              <div className="w-full bg-[var(--m-surface-2)] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--m-accent)] to-[#2563EB] rounded-full"
                  style={{ width: `${Math.min(100, Math.max(10, (todayRain / 25) * 100))}%` }}
                />
              </div>
            </div>

            {/* 3. Field Condition */}
            <div className="p-4 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--m-watch)] uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Field Surface
                </span>
                <span className="text-[10px] text-[var(--m-text-muted)] font-mono">Workability</span>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-white">MOIST</span>
                <span className="text-xs text-[var(--m-text-muted)]">Trafficable</span>
              </div>
              <div className="text-[11px] text-[var(--m-text-muted)] truncate">
                Heavy machinery delay suggested
              </div>
            </div>

            {/* 4. Irrigation Requirement */}
            <div className="p-4 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--m-accent)] uppercase flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" />
                  Irrigation
                </span>
                <span className="text-[10px] text-[#2ECC71] font-mono">Water Saving</span>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-[#2ECC71]">LOW NEED</span>
                <span className="text-xs text-[var(--m-text-muted)]">Wait 24h</span>
              </div>
              <div className="text-[11px] text-[#2ECC71] truncate font-medium">
                Hold water • Rain incoming
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--m-border)] flex items-center justify-between text-xs text-[var(--m-text-muted)]">
            <span>Agronomic Impact:</span>
            <span className="text-white font-medium">Postpone irrigation &amp; scout high-humidity disease pockets.</span>
          </div>
        </div>
      </div>
    </section>
  );
};
