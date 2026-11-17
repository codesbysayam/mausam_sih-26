import React from 'react';
import { NWPModelDataset } from '../../types/nwp';
import { ShieldAlert, Database, Radio, Cpu, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';

interface DataProvenanceSectionProps {
  dataset?: NWPModelDataset;
  lastFetchedAt?: string;
}

export const DataProvenanceSection: React.FC<DataProvenanceSectionProps> = ({
  dataset,
  lastFetchedAt,
}) => {
  const wrf = dataset?.models.WRF;
  const gefs = dataset?.models.GEFS;
  const ecmwf = dataset?.models.ECMWF;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 23. DATA VS WARNING SEPARATION: THREE VISUALLY DISTINCT LABELS */}
      <div className="nwp-card flex flex-col gap-3 rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex items-center gap-2 pb-2 border-b border-[#1D5278]/60">
          <ShieldAlert className="w-4 h-4 text-[#29B6F6]" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
            Scientific Boundary Notice: Three Distinct Meteorological Layers
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Label 1: Observation */}
          <div className="p-3.5 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#00E676]" />
              <span className="text-xs font-bold font-mono text-[#00E676] uppercase tracking-wide">
                CURRENT OBSERVATION
              </span>
            </div>
            <p className="text-xs text-[#AFC4D8] font-sans leading-relaxed">
              What ground instruments, automatic weather stations (AWS), radar, and satellites currently observe and record in real-time.
            </p>
          </div>

          {/* Label 2: Model Forecast */}
          <div className="p-3.5 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#29B6F6]" />
              <span className="text-xs font-bold font-mono text-[#29B6F6] uppercase tracking-wide">
                MODEL FORECAST
              </span>
            </div>
            <p className="text-xs text-[#AFC4D8] font-sans leading-relaxed">
              What numerical fluid dynamic supercomputer simulations calculate mathematically into the future. Models can diverge and change with each cycle.
            </p>
          </div>

          {/* Label 3: Official Warning */}
          <div className="p-3.5 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF8A80]" />
              <span className="text-xs font-bold font-mono text-[#FF8A80] uppercase tracking-wide">
                OFFICIAL WARNING
              </span>
            </div>
            <p className="text-xs text-[#AFC4D8] font-sans leading-relaxed">
              What legal statutory government authorities (IMD, NDMA, SDMAs) have formally issued to protect life and property. Always takes precedence over raw model curves.
            </p>
          </div>
        </div>
      </div>

      {/* 24. DATA SOURCES & METHODOLOGY */}
      <div className="nwp-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#29B6F6]" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
              Data Sources &amp; Computational Methodology
            </h3>
          </div>
          {lastFetchedAt && (
            <span className="text-[10px] font-mono text-[#AFC4D8]">
              Synchronized: {lastFetchedAt}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* WRF Source Card */}
          <div className="p-4 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-white">WRF-ARW</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102D44] border border-[#1D5278] text-slate-300">
                  {wrf?.status === 'UNAVAILABLE' ? 'SOURCE NOT CONFIGURED' : 'CONFIGURED'}
                </span>
              </div>
              <div className="text-xs text-[#AFC4D8] font-sans mt-2 flex flex-col gap-1">
                <div><strong>Source:</strong> IMD / NCMRWF / NOAA ARW Core</div>
                <div><strong>Resolution:</strong> 3 km &amp; 9 km Dual Nest</div>
                <div><strong>Forecast Range:</strong> 72 Hours (3 Days)</div>
                <div><strong>Run Cadence:</strong> 00 &amp; 12 UTC cycles</div>
              </div>
            </div>

            <a
              href="https://internal.imd.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#29B6F6] hover:underline flex items-center gap-1 font-mono pt-2 border-t border-[#1D5278]/50"
            >
              <span>IMD Gateway Specs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* GEFS Source Card */}
          <div className="p-4 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-white">NOAA GEFS v12</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E676]/15 border border-[#00E676]/35 text-[#00E676] font-semibold">
                  {gefs?.status === 'LIVE' ? '● LIVE' : gefs?.status || 'RECENT'}
                </span>
              </div>
              <div className="text-xs text-[#AFC4D8] font-sans mt-2 flex flex-col gap-1">
                <div><strong>Source:</strong> NOAA / NCEP / NOMADS</div>
                <div><strong>Resolution:</strong> 25 km (~0.25° Global Grid)</div>
                <div><strong>Forecast Range:</strong> 16 Days (384 Hours)</div>
                <div><strong>Ensemble Size:</strong> 31 Perturbed Members</div>
              </div>
            </div>

            <a
              href="https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/gefs.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#29B6F6] hover:underline flex items-center gap-1 font-mono pt-2 border-t border-[#1D5278]/50"
            >
              <span>NOAA GEFS Technical Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* ECMWF Source Card */}
          <div className="p-4 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-white">ECMWF IFS HRES</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E676]/15 border border-[#00E676]/35 text-[#00E676] font-semibold">
                  {ecmwf?.status === 'LIVE' ? '● LIVE' : ecmwf?.status || 'RECENT'}
                </span>
              </div>
              <div className="text-xs text-[#AFC4D8] font-sans mt-2 flex flex-col gap-1">
                <div><strong>Source:</strong> Open-Meteo → ECMWF IFS HRES</div>
                <div><strong>Resolution:</strong> 9 km Native / 0.1° Delivery Layer</div>
                <div><strong>Forecast Range:</strong> 15 Days (360 Hours)</div>
                <div><strong>Data Assimilation:</strong> Continuous 4D-Var</div>
              </div>
            </div>

            <a
              href="https://www.ecmwf.int/en/forecasts/datasets/open-data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#29B6F6] hover:underline flex items-center gap-1 font-mono pt-2 border-t border-[#1D5278]/50"
            >
              <span>ECMWF Open Data Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
