import React, { useState, useMemo } from 'react';
import { NWPModelDataset, ModelAgreement } from '../../types/nwp';
import { alignModelComparison } from '../../services/nwp/nwpNormalizer';
import { GitCompare, Clock, ShieldCheck, AlertCircle, Activity } from 'lucide-react';

interface ModelComparisonProps {
  dataset?: NWPModelDataset;
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({ dataset }) => {
  const [selectedLeadHour, setSelectedLeadHour] = useState<number>(0);

  const wrfRun = dataset?.models.WRF;
  const gefsRun = dataset?.models.GEFS;
  const ecmwfRun = dataset?.models.ECMWF;

  const comparisonRows = useMemo(() => {
    return alignModelComparison(
      wrfRun?.points || [],
      gefsRun?.points || [],
      ecmwfRun?.points || []
    );
  }, [wrfRun, gefsRun, ecmwfRun]);

  // Comparison hour options supported by data
  const comparisonHours = [
    { label: 'NOW', lead: 0 },
    { label: '+6H', lead: 6 },
    { label: '+12H', lead: 12 },
    { label: '+24H', lead: 24 },
    { label: '+48H', lead: 48 },
  ];

  const currentRow = comparisonRows.find((r) => r.leadHours === selectedLeadHour) || comparisonRows[0];

  // Calculate actual model agreements based on live output values
  const agreements: ModelAgreement[] = useMemo(() => {
    if (!currentRow) return [];

    const availableTemps: { model: string; val: number }[] = [];
    const availableRains: { model: string; val: number }[] = [];
    const availableWinds: { model: string; val: number }[] = [];

    if (currentRow.wrf?.temperature2m !== undefined) availableTemps.push({ model: 'WRF', val: currentRow.wrf.temperature2m });
    if (currentRow.gefs?.temperature2m !== undefined) availableTemps.push({ model: 'GEFS', val: currentRow.gefs.temperature2m });
    if (currentRow.ecmwf?.temperature2m !== undefined) availableTemps.push({ model: 'ECMWF', val: currentRow.ecmwf.temperature2m });

    if (currentRow.wrf?.precipitation !== undefined) availableRains.push({ model: 'WRF', val: currentRow.wrf.precipitation });
    if (currentRow.gefs?.precipitation !== undefined) availableRains.push({ model: 'GEFS', val: currentRow.gefs.precipitation });
    if (currentRow.ecmwf?.precipitation !== undefined) availableRains.push({ model: 'ECMWF', val: currentRow.ecmwf.precipitation });

    if (currentRow.wrf?.windSpeed10m !== undefined) availableWinds.push({ model: 'WRF', val: currentRow.wrf.windSpeed10m });
    if (currentRow.gefs?.windSpeed10m !== undefined) availableWinds.push({ model: 'GEFS', val: currentRow.gefs.windSpeed10m });
    if (currentRow.ecmwf?.windSpeed10m !== undefined) availableWinds.push({ model: 'ECMWF', val: currentRow.ecmwf.windSpeed10m });

    // Temp agreement
    const tempVals = availableTemps.map((t) => t.val);
    const tempSpread = tempVals.length > 1 ? Math.round((Math.max(...tempVals) - Math.min(...tempVals)) * 10) / 10 : 0;
    const tempLevel: 'HIGH' | 'MODERATE' | 'LOW' =
      tempVals.length < 2 ? 'HIGH' : tempSpread <= 1.5 ? 'HIGH' : tempSpread <= 3.5 ? 'MODERATE' : 'LOW';

    // Rain agreement
    const rainVals = availableRains.map((r) => r.val);
    const rainSpread = rainVals.length > 1 ? Math.round((Math.max(...rainVals) - Math.min(...rainVals)) * 10) / 10 : 0;
    const rainLevel: 'HIGH' | 'MODERATE' | 'LOW' =
      rainVals.length < 2 ? 'HIGH' : rainSpread <= 1.0 ? 'HIGH' : rainSpread <= 4.0 ? 'MODERATE' : 'LOW';

    // Wind agreement
    const windVals = availableWinds.map((w) => w.val);
    const windSpread = windVals.length > 1 ? Math.round((Math.max(...windVals) - Math.min(...windVals)) * 10) / 10 : 0;
    const windLevel: 'HIGH' | 'MODERATE' | 'LOW' =
      windVals.length < 2 ? 'HIGH' : windSpread <= 5.0 ? 'HIGH' : windSpread <= 12.0 ? 'MODERATE' : 'LOW';

    return [
      {
        variable: 'Temperature',
        spread: tempSpread,
        level: tempLevel,
        availableModels: availableTemps.map((t) => t.model),
      },
      {
        variable: 'Rainfall',
        spread: rainSpread,
        level: rainLevel,
        availableModels: availableRains.map((r) => r.model),
      },
      {
        variable: 'Wind',
        spread: windSpread,
        level: windLevel,
        availableModels: availableWinds.map((w) => w.model),
      },
    ];
  }, [currentRow]);

  // Ensemble uncertainty metrics (from GEFS)
  const gefsStats = gefsRun?.ensembleStats;
  const tempSpread = gefsStats?.tempSpread;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 16. MODEL COMPARISON */}
      <div className="nwp-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1D5278]/60">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-[#29B6F6]" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
                Compare Model Guidance
              </h3>
              <p className="text-[11px] text-[#AFC4D8] font-sans">
                Side-by-side evaluation of WRF (Regional), GEFS (Ensemble), and ECMWF (Global)
              </p>
            </div>
          </div>

          {/* Comparison-hour selector: NOW, +6H, +12H, +24H, +48H */}
          <div className="flex items-center gap-1 bg-[#081F33] p-1 rounded-xl border border-[#1D5278] text-xs font-mono self-start sm:self-auto">
            {comparisonHours.map((opt) => (
              <button
                key={opt.lead}
                type="button"
                onClick={() => setSelectedLeadHour(opt.lead)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer text-xs font-medium ${
                  selectedLeadHour === opt.lead
                    ? 'bg-[#1565C0] text-white font-bold shadow-xs'
                    : 'text-[#AFC4D8] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Comparison Table */}
        <div className="w-full overflow-x-auto rounded-xl border border-[#1D5278] bg-[#061A2B] no-scrollbar">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-[#081F33] text-[10px] uppercase tracking-wider text-[#AFC4D8] border-b border-[#1D5278]">
              <tr>
                <th className="py-2.5 px-4">Parameter</th>
                <th className="py-2.5 px-4 text-center">WRF (Regional)</th>
                <th className="py-2.5 px-4 text-center">GEFS (Ensemble)</th>
                <th className="py-2.5 px-4 text-center">ECMWF (Global)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1D5278]/40 text-slate-200">
              {/* Temperature */}
              <tr className="hover:bg-[#102D44]/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-white">Temperature</td>
                <td className="py-3 px-4 text-center font-bold text-slate-400">
                  {currentRow?.wrf?.temperature2m !== undefined ? `${currentRow.wrf.temperature2m}°C` : '—'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-amber-300">
                  {currentRow?.gefs?.temperature2m !== undefined ? `${currentRow.gefs.temperature2m}°C` : 'DATA UNAVAILABLE'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-amber-300">
                  {currentRow?.ecmwf?.temperature2m !== undefined ? `${currentRow.ecmwf.temperature2m}°C` : 'DATA UNAVAILABLE'}
                </td>
              </tr>

              {/* Rainfall */}
              <tr className="hover:bg-[#102D44]/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-white">Rainfall</td>
                <td className="py-3 px-4 text-center font-bold text-slate-400">
                  {currentRow?.wrf?.precipitation !== undefined ? `${currentRow.wrf.precipitation} mm` : '—'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[#00E676]">
                  {currentRow?.gefs?.precipitation !== undefined ? `${currentRow.gefs.precipitation} mm` : 'DATA UNAVAILABLE'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[#00E676]">
                  {currentRow?.ecmwf?.precipitation !== undefined ? `${currentRow.ecmwf.precipitation} mm` : 'DATA UNAVAILABLE'}
                </td>
              </tr>

              {/* Wind */}
              <tr className="hover:bg-[#102D44]/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-white">Wind</td>
                <td className="py-3 px-4 text-center font-bold text-slate-400">
                  {currentRow?.wrf?.windSpeed10m !== undefined ? `${currentRow.wrf.windSpeed10m} km/h` : '—'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[#29B6F6]">
                  {currentRow?.gefs?.windSpeed10m !== undefined ? `${currentRow.gefs.windSpeed10m} km/h` : 'DATA UNAVAILABLE'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[#29B6F6]">
                  {currentRow?.ecmwf?.windSpeed10m !== undefined ? `${currentRow.ecmwf.windSpeed10m} km/h` : 'DATA UNAVAILABLE'}
                </td>
              </tr>

              {/* Pressure */}
              <tr className="hover:bg-[#102D44]/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-white">Pressure</td>
                <td className="py-3 px-4 text-center font-bold text-slate-400">
                  {currentRow?.wrf?.pressureMSL !== undefined ? `${currentRow.wrf.pressureMSL} hPa` : '—'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-purple-300">
                  {currentRow?.gefs?.pressureMSL !== undefined ? `${currentRow.gefs.pressureMSL} hPa` : 'DATA UNAVAILABLE'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-purple-300">
                  {currentRow?.ecmwf?.pressureMSL !== undefined ? `${currentRow.ecmwf.pressureMSL} hPa` : 'DATA UNAVAILABLE'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 17. MODEL AGREEMENT & 18. FORECAST UNCERTAINTY (2 Columns on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Model Agreement */}
        <div className="nwp-card flex flex-col justify-between gap-3 rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00E676]" />
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
                Model Agreement
              </h4>
            </div>
            <span className="text-[10px] text-[#AFC4D8] font-sans">
              Based on currently available model guidance.
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {agreements.map((ag) => {
              const badgeClass =
                ag.level === 'HIGH'
                  ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                  : ag.level === 'MODERATE'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-[#E74C3C]/15 border-[#E74C3C]/40 text-[#FF8A80]';

              return (
                <div
                  key={ag.variable}
                  className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex items-center justify-between gap-3"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white font-sans">{ag.variable}</span>
                    <span className="text-[10px] text-[#AFC4D8] font-mono">
                      Spread: {ag.spread} {ag.variable === 'Temperature' ? '°C' : ag.variable === 'Rainfall' ? 'mm' : 'km/h'}
                      {' '}({ag.availableModels.join(' vs ')})
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-md border text-[11px] font-mono font-bold ${badgeClass}`}>
                    {ag.level} AGREEMENT
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-500 font-sans mt-1">
            * Agreement is mathematically calculated from physical differences between operational simulation points at the selected forecast lead time.
          </p>
        </div>

        {/* Card 2: Forecast Uncertainty (Ensemble Spread) */}
        <div className="nwp-card flex flex-col justify-between gap-3 rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#29B6F6]" />
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
                Forecast Uncertainty
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#00E676]">
              NOAA GEFS ENSEMBLE
            </span>
          </div>

          {tempSpread ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-[#081F33] border border-[#1D5278] text-center">
                  <span className="text-[9px] uppercase font-mono text-[#AFC4D8] block">Mean</span>
                  <span className="text-sm font-bold font-mono text-white">{tempSpread.mean}°C</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#081F33] border border-[#1D5278] text-center">
                  <span className="text-[9px] uppercase font-mono text-[#AFC4D8] block">Minimum</span>
                  <span className="text-sm font-bold font-mono text-[#29B6F6]">{tempSpread.min}°C</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#081F33] border border-[#1D5278] text-center">
                  <span className="text-[9px] uppercase font-mono text-[#AFC4D8] block">Maximum</span>
                  <span className="text-sm font-bold font-mono text-amber-300">{tempSpread.max}°C</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#081F33] border border-[#1D5278] text-center">
                  <span className="text-[9px] uppercase font-mono text-[#AFC4D8] block">Spread</span>
                  <span className="text-sm font-bold font-mono text-[#00E676]">
                    {Math.round((tempSpread.max - tempSpread.min) * 10) / 10}°C
                  </span>
                </div>
              </div>

              {/* Uncertainty Visual Bar */}
              <div className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#AFC4D8]">Member Trajectory Dispersion:</span>
                  <span className="text-white font-bold">{Math.round((tempSpread.max - tempSpread.min) * 10) / 10}°C Spread</span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#061A2B] border border-[#1D5278] relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#29B6F6] via-[#00E676] to-amber-400 rounded-full"
                    style={{ width: `${Math.min(Math.max((tempSpread.max - tempSpread.min) * 12, 20), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-mono text-[#AFC4D8] bg-[#081F33] rounded-xl border border-[#1D5278]">
              ENSEMBLE DATA UNAVAILABLE
            </div>
          )}

          <p className="text-[10px] text-slate-500 font-sans mt-1">
            * Ensemble spread quantifies chaotic divergence in numerical solutions. Low spread indicates higher synoptic predictability.
          </p>
        </div>
      </div>
    </div>
  );
};
