import React, { useState } from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  Clock,
  Droplets,
  Sprout,
  Bug,
  Tractor,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface TodaysFarmActionsProps {
  bulletin: ExtendedAgrometBulletin;
  selectedCrop: string;
}

export const TodaysFarmActions: React.FC<TodaysFarmActionsProps> = ({
  bulletin,
  selectedCrop,
}) => {
  const [showTechnicalComparison, setShowTechnicalComparison] = useState(false);

  const rainToday = bulletin.rainfall5DaysList?.[0]?.amountMm ?? 15;
  const soilMoisture = bulletin.soilMoisture?.overallPct ?? 68;

  const actions = [
    {
      id: 'act-irrigation',
      category: 'IRRIGATION',
      icon: Droplets,
      priority: 'HIGH PRIORITY',
      priorityColor: '#EF4444',
      action: 'Delay Irrigation for 24–48 Hours',
      reason: `Anticipated showers (${rainToday} mm) and current soil moisture at ${soilMoisture}% satisfy root water demand. Pumping now risks waterlogging and electrical cost waste.`,
      bestTime: 'Postpone until Day 3 morning',
      technicalText: 'High soil matric potential and impending convective precipitation render supplemental irrigation superfluous.',
      simpleText: 'Ground is already wet and rain is coming. Save your water and electricity.',
      statusTag: 'Hold Water',
    },
    {
      id: 'act-nutrients',
      category: 'NUTRIENTS & FERTILIZERS',
      icon: Sprout,
      priority: 'MEDIUM PRIORITY',
      priorityColor: '#F59E0B',
      action: 'Apply Top-Dressing Only After Rain Subsides',
      reason: `Wait for foliage and soil surface to dry before broadcasting Urea or spraying Potassium Nitrate. Prevents nitrogen runoff washing away into field ditches.`,
      bestTime: 'Post-rain sunny window (Day 2 or 3, 08:30 – 11:00 AM)',
      technicalText: 'Surface runoff triggers nitrate ion leaching and foliar scorch if broadcast under saturated conditions.',
      simpleText: 'Do not throw fertilizer in the rain or it will wash away into drains.',
      statusTag: 'Wait for Dry Foliage',
    },
    {
      id: 'act-pest',
      category: 'PEST & DISEASE PROTECTION',
      icon: Bug,
      priority: 'HIGH PRIORITY',
      priorityColor: '#EF4444',
      action: `Scout Lower Canopy for Fungal Sheath & Leaf Blight in ${selectedCrop.split(' ')[0]}`,
      reason: 'Morning relative humidity >80% with 28-32°C temps creates ideal conditions for fungal spores. Inspect bottom 15 cm of tillers.',
      bestTime: 'Early Morning Scout (07:00 – 09:30 AM)',
      technicalText: 'Microclimatic vapor saturation index exceeds critical incubation threshold for Rhizoctonia solani and Xanthomonas oryzae.',
      simpleText: 'Damp and warm mornings cause leaf rot and fungus. Check bottom leaves for dark brown spots.',
      statusTag: 'Scout Today',
    },
    {
      id: 'act-fieldwork',
      category: 'FIELD WORK & SPRAYING',
      icon: Tractor,
      priority: 'ACTIONABLE WINDOW',
      priorityColor: '#38BDF8',
      action: 'Unclog Drainage Furrows & Avoid Heavy Machinery in Wet Soils',
      reason: 'Ensure bund outlets allow excess runoff to escape freely. Keep heavy tractors off soft mud to avoid compaction rutting.',
      bestTime: 'Afternoon bund inspection (14:00 – 17:00 PM)',
      technicalText: 'Soil shear strength is compromised by moisture saturation; heavy axle loads induce deep subsoil hardpan compaction.',
      simpleText: 'Clear ditches so excess rain flows out. Do not drive heavy tractors into soggy fields.',
      statusTag: 'Drainage Check',
    },
  ];

  return (
    <section id="todays-farm-actions-section" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--m-border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-ping"></span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-accent)]">
              Decisive Field Action Plan
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            What Should I Do Today?
          </h2>
        </div>

        {/* Translation Toggle */}
        <button
          type="button"
          onClick={() => setShowTechnicalComparison(!showTechnicalComparison)}
          className="px-3 py-1.5 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] hover:border-[var(--m-accent)]/50 text-xs font-mono text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] transition-all flex items-center gap-2 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[var(--m-accent)]" />
          <span>{showTechnicalComparison ? 'Hide Technical Translation' : 'Advisory Explained (Simple vs Tech)'}</span>
        </button>
      </div>

      {/* Priority Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((act) => {
          const IconComp = act.icon;
          return (
            <div
              key={act.id}
              className="p-5 rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[#10B981]/50 transition-all flex flex-col justify-between space-y-4 shadow-xl"
            >
              {/* Card Header: Category & Priority */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: `${act.priorityColor}15`,
                      color: act.priorityColor,
                    }}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[var(--m-text-primary)] tracking-wider">
                    {act.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                    style={{
                      color: act.priorityColor,
                      backgroundColor: `${act.priorityColor}12`,
                      borderColor: `${act.priorityColor}35`,
                    }}
                  >
                    {act.priority}
                  </span>
                </div>
              </div>

              {/* Action Headline */}
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {act.action}
                </h3>
                <p className="text-xs text-[var(--m-text-muted)] leading-relaxed">
                  {act.reason}
                </p>
              </div>

              {/* Best Timing & Context */}
              <div className="p-3 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-[var(--m-accent)]">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-bold">Best Window:</span>
                </div>
                <span className="text-[var(--m-text-primary)] text-right">{act.bestTime}</span>
              </div>

              {/* Optional Simple Translation Box */}
              {showTechnicalComparison && (
                <div className="p-3 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-accent)]/20 space-y-2 text-xs">
                  <div className="flex items-start gap-1.5 text-[var(--m-text-muted)]">
                    <span className="font-mono font-bold text-[10px] uppercase text-[var(--m-text-muted)] block shrink-0 mt-0.5">
                      TECH:
                    </span>
                    <p className="italic text-[11px]">{act.technicalText}</p>
                  </div>
                  <div className="flex items-start gap-1.5 text-[var(--m-ok)] pt-1 border-t border-[var(--m-border)]">
                    <span className="font-mono font-bold text-[10px] uppercase text-[var(--m-ok)] block shrink-0 mt-0.5">
                      SIMPLE:
                    </span>
                    <p className="font-medium text-[11px]">{act.simpleText}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Farm Priority Queue */}
      <div className="p-4 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-white font-bold">
          <ShieldAlert className="w-4 h-4 text-[var(--m-danger)]" />
          <span>Today&apos;s Priority Execution Sequence:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-[var(--m-danger-soft)] text-[var(--m-danger)] border border-[var(--m-danger)]/30 font-bold">
            1. Hold Irrigation
          </span>
          <span className="text-[var(--m-text-muted)]">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-[var(--m-danger-soft)] text-[var(--m-danger)] border border-[var(--m-danger)]/30 font-bold">
            2. Morning Canopy Scout
          </span>
          <span className="text-[var(--m-text-muted)]">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-[var(--m-watch-soft)] text-[var(--m-watch)] border border-[var(--m-watch)]/30 font-bold">
            3. Clear Field Drainage
          </span>
        </div>
      </div>
    </section>
  );
};
