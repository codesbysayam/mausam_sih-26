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
    <div className="flex flex-col gap-3 bg-[#0A1322] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            NOAA/NCEP GEFS Ensemble Workspace ({membersCount} Members)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 self-start sm:self-auto">
          PROBABILISTIC ENSEMBLE SPREAD
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Temperature Spread */}
        <div className="p-3.5 rounded-xl bg-[#060B12] border border-[#1E2E40] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400">
            24h Ensemble Temp Spread
          </span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-amber-300">
              {tempSpread ? `${tempSpread.min}°C – ${tempSpread.max}°C` : '—'}
            </span>
            <span className="text-[11px] text-slate-300 block font-mono">
              Mean: {tempSpread?.mean !== undefined ? `${tempSpread.mean}°C` : '—'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {tempSpread ? `Spread envelope: ${(tempSpread.max - tempSpread.min).toFixed(1)}°C` : 'Awaiting members'}
          </span>
        </div>

        {/* Rain Probability */}
        <div className="p-3.5 rounded-xl bg-[#060B12] border border-[#1E2E40] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400">
            Peak Rain Probability (48h)
          </span>
          <div className="mt-1">
            <span className="text-xl font-bold font-mono text-sky-300">
              {maxRainProb}%
            </span>
            <span className="text-[11px] text-slate-300 block font-mono">
              {pointsWithRain.length > 0 ? `${pointsWithRain.length} hours above 30% risk` : 'Low precipitation risk'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Derived across all {membersCount} ensemble members
          </span>
        </div>

        {/* Ensemble Uncertainty Guidance */}
        <div className="p-3.5 rounded-xl bg-[#060B12] border border-[#1E2E40] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400">
            Scenario Divergence
          </span>
          <div className="mt-1">
            <span className="text-base font-bold font-mono text-emerald-300">
              Coherent Short-Range
            </span>
            <span className="text-[11px] text-slate-300 block font-mono">
              Spread widens past 96 hours
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Standard atmospheric chaotic growth
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-[#0F1B2B] border border-[#1E3A5F] flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          <strong>Ensemble spread represents forecast uncertainty.</strong> A narrower spread indicates higher confidence where all members agree on the synoptic pattern. A wider spread indicates greater disagreement between perturbed initial states, highlighting alternative scenarios such as track shifts or delayed frontal passage.
        </p>
      </div>
    </div>
  );
};
