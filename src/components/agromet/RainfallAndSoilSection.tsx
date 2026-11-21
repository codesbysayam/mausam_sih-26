import React, { useState } from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  CloudRain,
  Sprout,
  Droplets,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface RainfallAndSoilSectionProps {
  bulletin: ExtendedAgrometBulletin;
}

export const RainfallAndSoilSection: React.FC<RainfallAndSoilSectionProps> = ({ bulletin }) => {
  const [activeRainDayIndex, setActiveRainDayIndex] = useState<number>(0);
  const rainList = bulletin.rainfall5DaysList;
  const soil = bulletin.soilMoisture;
  const cumulative = bulletin.cumulativeRainfallMm;

  const maxDailyRain = Math.max(...rainList.map((r) => r.amountMm), 25);

  return (
    <section className="space-y-6">
      {/* 1. Rainfall Influx: "RAIN COMING TO YOUR FARM" */}
      <div className="rounded-3xl bg-gradient-to-b from-[var(--m-surface-1)] to-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[var(--m-border)] gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-[var(--m-accent)]" />
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Rain Coming to Your Farm
              </h3>
            </div>
            <p className="text-xs text-[var(--m-text-muted)] mt-0.5">
              High-resolution NWP precipitation forecast with day-by-day accumulation and rain probability in {bulletin.district}.
            </p>
          </div>

          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-xs self-start sm:self-auto">
            <span className="text-[var(--m-text-muted)] font-mono uppercase">5-Day Total Accumulation:</span>
            <span className="text-base font-black font-mono text-[var(--m-accent)]">{cumulative} mm</span>
          </div>
        </div>

        {/* Vertical Rainfall Distribution Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-5">
          {rainList.map((item, idx) => {
            const isSelected = activeRainDayIndex === idx;
            const barHeightPct = Math.max(15, (item.amountMm / maxDailyRain) * 100);

            return (
              <button
                key={item.dayName}
                type="button"
                onClick={() => setActiveRainDayIndex(idx)}
                className={`rounded-2xl p-4 flex flex-col items-center justify-between transition-all text-center cursor-pointer focus:outline-none ${
                  isSelected
                    ? 'bg-[var(--m-surface-2)] border-2 border-[var(--m-accent)] shadow-xl scale-[1.02]'
                    : 'bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[var(--m-accent)]/40 hover:bg-[var(--m-surface-2)]'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-white block">
                    {idx === 0 ? 'TODAY' : idx === 1 ? 'TOMORROW' : item.dayName.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-[var(--m-text-muted)] font-mono block mb-3">
                    {item.dateStr}
                  </span>
                </div>

                {/* Vertical Rain Column Gauge */}
                <div className="w-full flex items-end justify-center h-28 bg-[var(--m-surface-inset)] rounded-xl p-1.5 mb-3 relative overflow-hidden">
                  <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-[var(--m-border)] pointer-events-none" />
                  
                  <div
                    className={`w-full max-w-[32px] rounded-lg transition-all duration-500 flex items-center justify-center ${
                      item.amountMm > 15
                        ? 'bg-gradient-to-t from-[#1D4ED8] to-[var(--m-accent)]'
                        : item.amountMm > 0
                        ? 'bg-gradient-to-t from-[var(--m-accent)] to-[var(--m-accent)]'
                        : 'bg-[var(--m-surface-2)]'
                    }`}
                    style={{ height: `${barHeightPct}%` }}
                  >
                    {item.amountMm > 0 && (
                      <span className="text-[10px] font-mono font-black text-white">
                        {item.amountMm}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantitative Labels */}
                <div>
                  <span className={`text-sm font-black font-mono block ${item.amountMm > 0 ? 'text-[var(--m-accent)]' : 'text-[var(--m-text-muted)]'}`}>
                    {item.amountMm > 0 ? `${item.amountMm} mm` : '0 mm'}
                  </span>
                  <span className="text-[10px] text-[var(--m-text-muted)] font-mono mt-0.5 block">
                    {item.probPercent}% prob
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Dual Panels: Soil Intelligence (Vertical Profile) & Irrigation Decision Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT (6 Cols): SOIL INTELLIGENCE */}
        <div className="lg:col-span-6 rounded-3xl bg-[var(--m-surface-1)] border border-[var(--m-border)] p-6 sm:p-8 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[var(--m-border)] gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#2ECC71]" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Soil Intelligence
                </h3>
              </div>
              <span className="text-[10px] text-[var(--m-text-muted)] font-mono text-right">
                {soil.available ? 'NWP Soil Moisture Model' : 'Soil Telemetry Unavailable'}
              </span>
            </div>

            {soil.available ? (
              <div className="space-y-3 mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[var(--m-surface-2)] to-[var(--m-surface-1)] border border-[#2ECC71]/40 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#2ECC71] uppercase tracking-wider font-mono">
                        TOPSOIL (0–15 cm)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#2ECC71]/20 text-[#2ECC71] font-mono font-bold">
                        {soil.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--m-text-secondary)] mt-1">
                      Modelled moisture for shallow germination and surface root intake.
                    </p>
                  </div>
                  <div className="text-right pl-3 shrink-0">
                    <span className="text-2xl font-black font-mono text-white">{soil.topsoilPct}%</span>
                    <span className="text-[10px] text-[#2ECC71] block font-mono">Model Est.</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--m-accent)] uppercase tracking-wider font-mono">
                        ROOT ZONE (15–45 cm)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] font-mono font-bold">
                        {soil.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--m-text-secondary)] mt-1">
                      Modelled moisture sustaining active crop root zone.
                    </p>
                  </div>
                  <div className="text-right pl-3 shrink-0">
                    <span className="text-2xl font-black font-mono text-white">{soil.rootZonePct}%</span>
                    <span className="text-[10px] text-[var(--m-accent)] block font-mono">Root Zone</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--m-text-muted)] uppercase tracking-wider font-mono">
                      SUBSOIL (45–100 cm)
                    </span>
                    <span className="text-xs text-[var(--m-text-muted)] block mt-0.5">
                      Deep profile buffer inferred from modelled volumetric soil moisture.
                    </span>
                  </div>
                  <div className="text-right pl-3 shrink-0">
                    <span className="text-xl font-bold font-mono text-[var(--m-text-muted)]">{soil.subsoilPct}%</span>
                    <span className="text-[10px] text-[var(--m-text-muted)] block font-mono">Buffer Est.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] space-y-2.5 mb-6">
                <div className="flex items-center gap-2 text-[var(--m-watch)] text-xs font-mono font-bold uppercase">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Direct Soil Moisture Telemetry Unavailable</span>
                </div>
                <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
                  {soil.sourceNote}. MAUSAM does not synthesize topsoil, root-zone, or subsoil saturation percentages without a verified moisture feed.
                </p>
                <p className="text-[11px] font-mono text-[var(--m-text-muted)]">
                  Field check: Inspect top 5–10 cm of soil manually and align pumping with the live 5-day NWP rainfall forecast above.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--m-border)] grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase block">SOIL MOISTURE</span>
              <span className="text-sm font-bold text-white font-mono">
                {soil.available ? `${soil.overallPct}%` : 'Unavailable'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase block">TREND</span>
              <span className="text-sm font-bold text-[#2ECC71] font-mono flex items-center gap-1 capitalize">
                <TrendingUp className="w-3.5 h-3.5" />
                {soil.available ? soil.trend : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase block">SOURCE BASIS</span>
              <span className="text-sm font-bold text-[var(--m-accent)] font-mono">
                {soil.available ? 'NWP Model' : 'Rain Forecast'}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT (6 Cols): IRRIGATION DECISION PANEL */}
        {(() => {
          const rain24 = Math.round((rainList[0]?.amountMm || 0) * 10) / 10;
          const rain48 = Math.round(((rainList[0]?.amountMm || 0) + (rainList[1]?.amountMm || 0)) * 10) / 10;
          const holdIrrigation = rain48 >= 8 || (soil.available && soil.overallPct > 70);
          const directive = holdIrrigation ? 'HOLD / WAIT' : soil.available ? 'LIGHT IRRIGATION' : 'CHECK TOPSOIL';
          const reason = holdIrrigation
            ? `48-hour rainfall outlook (${rain48} mm) ${soil.available ? `and modelled soil moisture (${soil.overallPct}%) ` : ''}indicate delaying pumping until showers pass.`
            : soil.available
            ? `Low 48-hour rainfall (${rain48} mm) and ${soil.overallPct}% modelled moisture support shallow morning irrigation.`
            : `Low 48-hour rainfall forecast (${rain48} mm). Verify topsoil moisture in-field before scheduling morning irrigation.`;

          return (
            <div className="lg:col-span-6 rounded-3xl bg-gradient-to-br from-[var(--m-surface-1)] to-[var(--m-surface-1)] border-2 border-[var(--m-accent)]/40 p-6 sm:p-8 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-[var(--m-border)]">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-[var(--m-accent)]" />
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                      Irrigation Decision Tool
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/40 text-xs font-mono font-black">
                    Weather-Derived
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border-strong)] mb-5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase font-bold block mb-1">
                      OPERATIONAL GUIDANCE
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[var(--m-accent)] tracking-tight">
                      {directive}
                    </span>
                    <p className="text-xs text-[var(--m-text-secondary)] mt-1">{reason}</p>
                  </div>
                  <div className="text-right shrink-0 pl-4 border-l border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase block">24h Rain Forecast</span>
                    <span className="text-xl font-bold font-mono text-white">{rain24} mm</span>
                    <span className="text-[10px] text-[#2ECC71] block font-mono mt-1">48h: {rain48} mm</span>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-xs font-bold text-[var(--m-text-muted)] font-mono uppercase tracking-wider block mb-2">
                    Decision Action Sequence
                  </span>
                  <div className="grid grid-cols-5 gap-1 text-center font-mono">
                    <div className="p-2 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-[10px] text-[var(--m-text-primary)] font-bold">
                      NOW
                    </div>
                    <div className={`p-2 rounded-lg text-[10px] font-bold border ${holdIrrigation ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-accent)]' : 'bg-[var(--m-surface-2)] border-[var(--m-border-strong)] text-[var(--m-text-primary)]'}`}>
                      {holdIrrigation ? 'WAIT' : 'INSPECT'}
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-[10px] text-[var(--m-text-primary)] font-bold">
                      {rain48 > 0 ? 'RAIN' : 'DRY'}
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-[10px] text-[var(--m-text-primary)] font-bold">
                      REASSESS
                    </div>
                    <div className={`p-2 rounded-lg text-[10px] font-bold border ${!holdIrrigation ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-accent)]' : 'bg-[var(--m-surface-2)] border-[var(--m-border-strong)] text-[var(--m-text-primary)]'}`}>
                      IRRIGATE
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--m-border)] flex items-center justify-between text-xs text-[var(--m-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                  Basis Window:
                </span>
                <span className="text-white font-mono font-bold">{bulletin.validPeriod}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
};
