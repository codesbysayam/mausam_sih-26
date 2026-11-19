import React from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import { Bug, AlertTriangle, ShieldCheck, Leaf, Eye, Activity, Sparkles, Droplets } from 'lucide-react';

interface PestDiseaseWatchProps {
  bulletin: ExtendedAgrometBulletin;
  selectedCrop: string;
}

export const PestDiseaseWatch: React.FC<PestDiseaseWatchProps> = ({ bulletin, selectedCrop }) => {
  const watch = bulletin.pestDiseaseWatch;

  return (
    <section className="rounded-3xl bg-gradient-to-b from-[var(--m-surface-1)] to-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 sm:p-8 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--m-border)] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-[var(--m-danger)]" />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">
              Pest &amp; Disease Watch
            </h3>
          </div>
          <p className="text-xs text-[var(--m-text-muted)] mt-0.5">
            Atmospheric epidemiology and biosecurity surveillance for <strong className="text-white">{selectedCrop}</strong> in {bulletin.district}.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/40 text-xs font-mono font-bold text-[var(--m-danger)] self-start sm:self-auto">
          <Activity className="w-3.5 h-3.5" />
          <span>Surveillance Mode: Active</span>
        </div>
      </div>

      {/* Main Grid: Left = Risk Meter & Threat | Right = Drivers & Action Directive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT (5 Cols): Large Risk Indicator & Meter */}
        <div className="lg:col-span-5 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 flex flex-col justify-between shadow-inner">
          <div>
            <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase font-bold block mb-1">
              EPIDEMIOLOGY RISK RATING
            </span>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl sm:text-4xl font-black font-mono text-[var(--m-watch)] tracking-tight">
                {watch.overallRisk.toUpperCase()}
              </span>
              <span className="text-xs text-[var(--m-text-muted)] font-mono font-semibold">Threat Level</span>
            </div>

            {/* Continuous Risk Meter: LOW ─── MODERATE ─── HIGH ─── SEVERE */}
            <div className="my-4">
              <div className="h-3 w-full bg-[var(--m-surface-2)] rounded-full p-0.5 relative overflow-hidden flex items-center">
                <div className="w-full h-full bg-gradient-to-r from-[#2ECC71] via-[#F59E0B] to-[#EF4444] rounded-full" />
                {/* Pointer indicator */}
                <div
                  className="absolute top-0 bottom-0 w-3 bg-white rounded-full shadow-lg border border-[var(--m-border)] transition-all duration-500"
                  style={{
                    left:
                      watch.overallRisk === 'Low'
                        ? '15%'
                        : watch.overallRisk === 'Moderate'
                        ? '45%'
                        : watch.overallRisk === 'High'
                        ? '75%'
                        : '92%',
                  }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-[var(--m-text-muted)] font-mono font-bold uppercase mt-2">
                <span className="text-[#2ECC71]">LOW</span>
                <span className="text-[var(--m-watch)]">MODERATE</span>
                <span className="text-[var(--m-alert)]">HIGH</span>
                <span className="text-[var(--m-danger)]">SEVERE</span>
              </div>
            </div>
          </div>

          {/* Primary Concern */}
          <div className="mt-4 pt-4 border-t border-[var(--m-border)]">
            <span className="text-[10px] text-[var(--m-danger)] uppercase font-mono font-bold block mb-1">
              WATCH FOR TARGET PATHOGEN
            </span>
            <h4 className="text-lg font-bold text-white tracking-tight">
              {watch.primaryConcern}
            </h4>
            {watch.scientificName && (
              <span className="text-xs text-[var(--m-accent)] italic font-mono block mt-0.5">
                {watch.scientificName}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT (7 Cols): Environmental Drivers & Action Plan */}
        <div className="lg:col-span-7 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 flex flex-col justify-between shadow-inner">
          <div>
            <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase font-bold block mb-3">
              MICROCLIMATE EPIDEMIOLOGICAL DRIVERS
            </span>

            {/* 4 Driver Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)]">
                <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase block">HUMIDITY</span>
                <span className="text-sm font-bold text-[var(--m-danger)] font-mono block mt-0.5">HIGH (85%)</span>
                <span className="text-[9px] text-[var(--m-text-muted)]">Spore germination</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)]">
                <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase block">RAINFALL</span>
                <span className="text-sm font-bold text-[var(--m-accent)] font-mono block mt-0.5">ELEVATED</span>
                <span className="text-[9px] text-[var(--m-text-muted)]">Leaf wetness &gt;6h</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)]">
                <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase block">TEMPERATURE</span>
                <span className="text-sm font-bold text-[var(--m-watch)] font-mono block mt-0.5">FAVORABLE</span>
                <span className="text-[9px] text-[var(--m-text-muted)]">24–31°C canopy</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)]">
                <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase block">CROP STAGE</span>
                <span className="text-sm font-bold text-[#2ECC71] font-mono block mt-0.5">SENSITIVE</span>
                <span className="text-[9px] text-[var(--m-text-muted)]">Tillering phase</span>
              </div>
            </div>

            {/* Action Box */}
            <div className="p-4 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] space-y-2">
              <div className="flex items-center gap-2 text-xs text-[var(--m-accent)] font-bold font-mono uppercase">
                <Eye className="w-4 h-4 text-[var(--m-accent)]" />
                <span>Recommended Field Action</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--m-text-primary)] font-medium leading-relaxed">
                &ldquo;Inspect lower leaf surfaces and collar leaves during early morning hours (07:30–09:30 AM). Mark and isolate localized field hotspots.&rdquo;
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-[var(--m-border)] flex items-center justify-between text-xs text-[var(--m-text-muted)]">
            <span>Economic Threshold Level (ETL):</span>
            <span className="text-[var(--m-watch)] font-mono font-bold">{watch.etlThreshold}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
