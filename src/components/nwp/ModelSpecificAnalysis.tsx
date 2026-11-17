import React from 'react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelRun, NWPForecastPoint } from '../../types/nwp';
import { ShieldCheck, CloudLightning, Activity, Compass, Mountain, CheckCircle2 } from 'lucide-react';

interface ModelSpecificAnalysisProps {
  modelId: NWPModelId;
  runData?: NWPModelRun;
  points: NWPForecastPoint[];
}

export const ModelSpecificAnalysis: React.FC<ModelSpecificAnalysisProps> = ({
  modelId,
  runData,
  points,
}) => {
  const isUnavailable = !runData || runData.status === 'UNAVAILABLE';
  const firstPoint = points[0];

  if (modelId === 'WRF') {
    return (
      <div className="nwp-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-[#29B6F6]" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
              Regional Model Analysis — WRF-ARW
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#AFC4D8] bg-[#081F33] px-2 py-0.5 rounded border border-[#1D5278]">
            MESOSCALE SIMULATION CORE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Domain Coverage</span>
            <span className="text-sm font-bold text-white">South Asia / India Subcontinent</span>
            <span className="text-[10px] text-slate-400">Non-hydrostatic terrain matching</span>
          </div>

          <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Mesoscale Resolution</span>
            <span className="text-sm font-bold text-white">3 km &amp; 9 km Dual Nested Grid</span>
            <span className="text-[10px] text-slate-400">Explicit convection parameterization</span>
          </div>

          <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Forecast Horizon</span>
            <span className="text-sm font-bold text-white">0–72 Hours (3 Days)</span>
            <span className="text-[10px] text-slate-400">Rapid-update mesoscale cycle</span>
          </div>

          <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Live Status</span>
            <span className="text-sm font-bold text-[#AFC4D8]">
              {isUnavailable ? 'Institutional Gateway Required' : 'Operational Feed Synced'}
            </span>
            <span className="text-[10px] text-slate-400">IMD HPC ARW model output</span>
          </div>
        </div>

        {/* Analytical Focus Pillars */}
        <div className="pt-2 border-t border-[#1D5278]/40">
          <span className="text-[11px] font-semibold text-slate-300 block mb-2 font-sans">
            Primary Regional Focus:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-[#081F33] border border-[#1D5278]/70 text-[#29B6F6] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Convective Rainfall</span>
            </div>
            <div className="p-2 rounded-lg bg-[#081F33] border border-[#1D5278]/70 text-[#29B6F6] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Thunderstorm Squalls</span>
            </div>
            <div className="p-2 rounded-lg bg-[#081F33] border border-[#1D5278]/70 text-[#29B6F6] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Updraft Dynamics</span>
            </div>
            <div className="p-2 rounded-lg bg-[#081F33] border border-[#1D5278]/70 text-[#29B6F6] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Terrain Interactions</span>
            </div>
            <div className="p-2 rounded-lg bg-[#081F33] border border-[#1D5278]/70 text-[#29B6F6] font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Short-Range Weather</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modelId === 'GEFS') {
    const stats = runData?.ensembleStats;
    const members = stats?.membersCount || 31;
    const tempSpread = stats?.tempSpread;

    return (
      <div className="nwp-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
              Ensemble Analysis — NOAA / NCEP GEFS v12
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
            31 ENSEMBLE PERTURBATIONS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Ensemble Members</span>
            <span className="text-xl font-bold font-mono text-white">{members} Members</span>
            <span className="text-[10px] text-slate-400">1 Control Run + 30 Perturbed States</span>
          </div>

          <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Ensemble Mean Temp</span>
            <span className="text-xl font-bold font-mono text-amber-300">
              {tempSpread ? `${tempSpread.mean}°C` : firstPoint?.temperature2m ? `${firstPoint.temperature2m}°C` : '—'}
            </span>
            <span className="text-[10px] text-slate-400">Mean across all member trajectories</span>
          </div>

          <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Temperature Spread</span>
            <span className="text-xl font-bold font-mono text-[#29B6F6]">
              {tempSpread ? `${tempSpread.min}° – ${tempSpread.max}°C` : 'Quantified per hour'}
            </span>
            <span className="text-[10px] text-slate-400">Uncertainty envelope</span>
          </div>

          <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Rainfall Probability</span>
            <span className="text-xl font-bold font-mono text-[#00E676]">
              {firstPoint?.precipitationProbability !== undefined ? `${firstPoint.precipitationProbability}%` : 'Calculated'}
            </span>
            <span className="text-[10px] text-slate-400">Ensemble fraction predicting rain</span>
          </div>
        </div>

        <p className="text-xs text-[#AFC4D8] leading-relaxed font-sans pt-1">
          GEFS runs 31 slightly different simulations initialized with microscopic perturbations in the atmosphere. When all 31 members produce similar outcomes, forecast confidence is high; when members diverge widely, forecast uncertainty increases.
        </p>
      </div>
    );
  }

  // ECMWF Medium-Range Analysis
  return (
    <div className="nwp-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 shadow-md">
      <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#29B6F6]" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
            Medium-Range Analysis — ECMWF IFS HRES
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
          GLOBAL 4D-VAR ASSIMILATION
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Spatial Resolution</span>
          <span className="text-base font-bold font-mono text-white">9 km Native Grid</span>
          <span className="text-[10px] text-slate-400">0.1° / 0.25° Delivery Matrix</span>
        </div>

        <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Forecast Horizon</span>
          <span className="text-base font-bold font-mono text-white">0–360h (15 Days)</span>
          <span className="text-[10px] text-slate-400">Medium-range atmospheric evolution</span>
        </div>

        <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Data Assimilation</span>
          <span className="text-base font-bold font-mono text-[#29B6F6]">Continuous 4D-Var</span>
          <span className="text-[10px] text-slate-400">Millions of global satellite observations</span>
        </div>

        <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Synoptic Skill</span>
          <span className="text-base font-bold font-mono text-[#00E676]">Global Gold Standard</span>
          <span className="text-[10px] text-slate-400">Superior 500 hPa planetary wave accuracy</span>
        </div>
      </div>

      <p className="text-xs text-[#AFC4D8] leading-relaxed font-sans pt-1">
        The European Centre for Medium-Range Weather Forecasts (ECMWF) Integrated Forecasting System (IFS) is regarded worldwide as the leading medium-range global numerical model, excelling at tracking deep low pressure systems, western disturbances, monsoon troughs, and global planetary jet streams.
      </p>
    </div>
  );
};
