import React from 'react';
import { NWPEnsembleStats, NWPForecastPoint } from '../../types/nwp';
import { Layers, AlertCircle, TrendingUp, HelpCircle } from 'lucide-react';

interface EnsemblePanelProps {
  stats?: NWPEnsembleStats;
  points: NWPForecastPoint[];
}

export const EnsemblePanel: React.FC<EnsemblePanelProps> = ({ stats, points }) => {
  const membersCount = stats?.membersCount || 31;
  const tempSpread = stats?.tempSpread;

  // Compute precip probability stats from points
  const pointsWithRain = points.slice(0, 48).filter((p) => (p.precipitationProbability || 0) > 30);
  const maxRainProb = points.length > 0 ? Math.max(...points.slice(0, 48).map((p) => p.precipitationProbability || 0)) : 0;

  return (
    <div className="flex flex-col gap-3 bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-[11px] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--m-border)]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--m-accent)]" />
          <h3 className="text-sm font-mono font-bold text-[var(--m-text-primary)] uppercase tracking-wider">
            NOAA/NCEP GEFS Ensemble Workspace ({membersCount} Members)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--m-accent)] bg-[var(--m-accent-soft)] px-2 py-0.5 rounded border border-[var(--m-accent)]/30 self-start sm:self-auto">
          PROBABILISTIC ENSEMBLE SPREAD
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Temperature Spread */}
        <div className="p-3.5 rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">
            24h Ensemble Temp Spread
          </span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-[var(--weather-sun)] tabular-nums">
              {tempSpread ? `${tempSpread.min}°C – ${tempSpread.max}°C` : '—'}
            </span>
            <span className="text-[11px] text-[var(--m-text-secondary)] block font-mono">
              Mean: {tempSpread?.mean !== undefined ? `${tempSpread.mean}°C` : '—'}
            </span>
          </div>
          <span className="text-[10px] text-[var(--m-text-muted)] font-mono">
            {tempSpread ? `Spread envelope: ${(tempSpread.max - tempSpread.min).toFixed(1)}°C` : 'Awaiting members'}
          </span>
        </div>

        {/* Rain Probability */}
        <div className="p-3.5 rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">
            Peak Rain Probability (48h)
          </span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-[var(--weather-rain)] tabular-nums">
              {maxRainProb}%
            </span>
            <span className="text-[11px] text-[var(--m-text-secondary)] block font-mono">
              {pointsWithRain.length > 0 ? `${pointsWithRain.length} hours above 30% risk` : 'Low precipitation risk'}
            </span>
          </div>
          <span className="text-[10px] text-[var(--m-text-muted)] font-mono">
            Derived across all {membersCount} ensemble members
          </span>
        </div>

        {/* Ensemble Uncertainty Guidance */}
        <div className="p-3.5 rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)]">
            Scenario Divergence
          </span>
          <div className="mt-1">
            <span className="text-base font-bold font-mono text-[var(--m-ok)]">
              Coherent Short-Range
            </span>
            <span className="text-[11px] text-[var(--m-text-secondary)] block font-mono">
              Spread widens past 96 hours
            </span>
          </div>
          <span className="text-[10px] text-[var(--m-text-muted)] font-mono">
            Standard atmospheric chaotic growth
          </span>
        </div>
      </div>

      <div className="p-3 rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-[var(--m-accent)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed font-sans">
          <strong className="text-[var(--m-text-primary)]">Ensemble spread represents forecast uncertainty.</strong> A narrower spread indicates higher confidence where all members agree on the synoptic pattern. A wider spread indicates greater disagreement between perturbed initial states, highlighting alternative scenarios such as track shifts or delayed frontal passage.
        </p>
      </div>
    </div>
  );
};
