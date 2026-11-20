import React from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  Sprout,
  Droplets,
  Flame,
  Bug,
  Tractor,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface DetailedCropAdvisoryProps {
  bulletin: ExtendedAgrometBulletin;
  selectedCrop: string;
}

export const DetailedCropAdvisory: React.FC<DetailedCropAdvisoryProps> = ({
  bulletin,
  selectedCrop,
}) => {
  // Find current crop data
  const cropData =
    bulletin.crops.find((c) => c.cropName === selectedCrop) ||
    bulletin.crops[0] || {
      cropName: selectedCrop,
      stage: 'Active Growth & Vegetative',
      irrigationAdvice: 'Maintain light irrigation according to rain intervals; avoid standing water.',
      fertilizerAdvice: 'Apply split nitrogen after morning dew dries; use neem-coated urea.',
      pestDiseaseAdvice: 'Monitor lower canopy for leaf blight and sucking pests; use biological controls.',
      harvestingAdvice: 'Inspect field bunds and ensure clean harvesting drying yards.',
      riskLevel: 'Moderate',
      riskAlert: 'Monitor localized humidity spikes and convective showers.',
    };

  const timeline72Hours = [
    {
      timeLabel: 'NOW (0 – 12H)',
      action: 'Hold Irrigation & Inspect Bunds',
      detail: 'Keep pump motors turned off. Walk field perimeter to ensure excess water spillways are clear before afternoon showers.',
      status: 'Immediate',
      color: '#EF4444',
    },
    {
      timeLabel: 'NEXT 24H (Day 2)',
      action: 'Canopy Disease Scout',
      detail: 'Inspect bottom 15cm of leaf sheaths for water-soaked lesions. If symptoms exceed ETL (10%), prepare Streptocycline spray.',
      status: 'Monitoring',
      color: '#F59E0B',
    },
    {
      timeLabel: 'NEXT 48H (Day 3)',
      action: 'Top-Dressing & Foliar Spray',
      detail: 'As sun emerges and foliage dries, broadcast remaining Urea split dose @ 35 kg/acre. Morning drift allows safe spraying.',
      status: 'Fertilization',
      color: '#10B981',
    },
    {
      timeLabel: 'NEXT 72H (Day 4)',
      action: 'Soil Aeration & Inter-Cultivation',
      detail: 'Tractor and manual weeders can enter fields safely as topsoil dries to ~55% field capacity without compaction damage.',
      status: 'Field Operations',
      color: '#C5A46D',
    },
  ];

  return (
    <section id="detailed-crop-advisory-section" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--m-border)]">
        <div>
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-[var(--m-ok)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-ok)]">
              Agronomic Management Matrix
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Detailed Crop Advisory: {cropData.cropName}
          </h2>
        </div>
        <span className="text-xs font-mono text-[var(--m-accent)] bg-[var(--m-accent-soft)] px-3 py-1 rounded-xl border border-[var(--m-accent)]/30">
          Stage: {cropData.stage}
        </span>
      </div>

      {/* 1. FIELD PRIORITIES (01 WATER, 02 NUTRIENTS, 03 DISEASE, 04 OPERATIONS) */}
      <div className="space-y-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-text-muted)] block">
          Core Field Priorities
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority 01: Water */}
          <div className="p-5 rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[var(--m-accent)]/50 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[var(--m-accent)] bg-[var(--m-accent-soft)] px-2 py-0.5 rounded">
                    01
                  </span>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Water Management
                  </h4>
                </div>
                <Droplets className="w-4 h-4 text-[var(--m-accent)]" />
              </div>
              <p className="text-xs text-[var(--m-text-primary)] leading-relaxed">
                {cropData.irrigationAdvice}
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--m-border)] text-[10px] font-mono text-[var(--m-text-muted)] flex items-center justify-between">
              <span>Goal: Root Aeration &amp; Water Conservation</span>
              <span className="text-[var(--m-accent)]">Calibrated</span>
            </div>
          </div>

          {/* Priority 02: Nutrients */}
          <div className="p-5 rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[#10B981]/50 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[var(--m-ok)] bg-[var(--m-ok-soft)] px-2 py-0.5 rounded">
                    02
                  </span>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Nutrient &amp; Fertilizer Management
                  </h4>
                </div>
                <Sprout className="w-4 h-4 text-[var(--m-ok)]" />
              </div>
              <p className="text-xs text-[var(--m-text-primary)] leading-relaxed">
                {cropData.fertilizerAdvice}
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--m-border)] text-[10px] font-mono text-[var(--m-text-muted)] flex items-center justify-between">
              <span>Goal: Optimal Assimilation &amp; Zero Leaching</span>
              <span className="text-[var(--m-ok)]">Calibrated</span>
            </div>
          </div>

          {/* Priority 03: Pest & Disease */}
          <div className="p-5 rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[var(--m-danger)]/50 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[var(--m-danger)] bg-[var(--m-danger-soft)] px-2 py-0.5 rounded">
                    03
                  </span>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Disease Watch &amp; Biosecurity
                  </h4>
                </div>
                <Bug className="w-4 h-4 text-[var(--m-danger)]" />
              </div>
              <p className="text-xs text-[var(--m-text-primary)] leading-relaxed">
                {cropData.pestDiseaseAdvice}
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--m-border)] text-[10px] font-mono text-[var(--m-text-muted)] flex items-center justify-between">
              <span>Goal: Integrated Pest Management (IPM)</span>
              <span className="text-[var(--m-danger)]">High Vigilance</span>
            </div>
          </div>

          {/* Priority 04: Operations & Harvest */}
          <div className="p-5 rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[var(--m-watch)]/50 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[var(--m-watch)] bg-[var(--m-watch-soft)] px-2 py-0.5 rounded">
                    04
                  </span>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Field Operations &amp; Harvest Readiness
                  </h4>
                </div>
                <Tractor className="w-4 h-4 text-[var(--m-watch)]" />
              </div>
              <p className="text-xs text-[var(--m-text-primary)] leading-relaxed">
                {cropData.harvestingAdvice}
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--m-border)] text-[10px] font-mono text-[var(--m-text-muted)] flex items-center justify-between">
              <span>Goal: Yield Protection &amp; Soil Health</span>
              <span className="text-[var(--m-watch)]">Scheduled</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NEXT 72 HOURS ACTION TIMELINE (NOW -> 24H -> 48H -> 72H) */}
      <div className="rounded-3xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--m-accent)]" />
            <h3 className="text-base font-bold text-white">
              Next 72-Hour Sequential Execution Timeline
            </h3>
          </div>
          <span className="text-xs font-mono text-[var(--m-ok)] bg-[var(--m-ok-soft)] px-2.5 py-0.5 rounded border border-[#10B981]/30">
            Step-by-Step Action
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          {timeline72Hours.map((step, idx) => (
            <div
              key={step.timeLabel}
              className="p-4 rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] space-y-2.5 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[var(--m-accent)]">
                  {step.timeLabel}
                </span>
                <span
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: step.color,
                    backgroundColor: `${step.color}15`,
                  }}
                >
                  {step.status}
                </span>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-white">
                {step.action}
              </h4>

              <p className="text-[11px] text-[var(--m-text-muted)] leading-relaxed">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
