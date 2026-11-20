import React from 'react';
import { ExternalLink, Database, ShieldCheck } from 'lucide-react';

interface ModelSourceFooterProps {
  lastFetchedAt: string;
}

export const ModelSourceFooter: React.FC<ModelSourceFooterProps> = ({ lastFetchedAt }) => {
  const sources = [
    {
      model: 'WRF',
      provider: 'India Meteorological Department (IMD) / NCMRWF (when configured) • NCAR/UCAR',
      pipeline: 'Operational HPC ARW Core Convection-Permitting Grid (3 km)',
      license: 'IMD Open Access Policy / NCAR Open Community License',
      link: 'https://mausam.imd.gov.in',
    },
    {
      model: 'GEFS',
      provider: 'National Oceanic and Atmospheric Administration (NOAA) / NCEP',
      pipeline: 'NOAA NCEP GEFS v12 Global 31-Member Ensemble Stream (via Open-Meteo)',
      license: 'US Government Public Domain Work',
      link: 'https://www.ncep.noaa.gov',
    },
    {
      model: 'ECMWF',
      provider: 'European Centre for Medium-Range Weather Forecasts (ECMWF)',
      pipeline: 'ECMWF Open Data IFS HRES (0.1° / 9 km resolution via Open-Meteo delivery layer)',
      license: 'Creative Commons CC-BY 4.0 / ECMWF Open Data Terms',
      link: 'https://www.ecmwf.int',
    },
  ];

  return (
    <div className="flex flex-col gap-3 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-[11px] p-4 sm:p-5 text-xs font-mono text-[var(--m-text-muted)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[var(--m-border)]">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[var(--m-accent)]" />
          <h4 className="font-bold text-[var(--m-text-primary)] uppercase tracking-wider text-[11px]">
            Data Sources &amp; Upstream NWP Infrastructure
          </h4>
        </div>
        <span className="text-[10px] text-[var(--m-text-muted)]">
          Last Synchronized: {lastFetchedAt || 'Live Cycle'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sources.map((s, idx) => (
          <div key={idx} className="p-3 rounded-[7px] bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col justify-between gap-1.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--m-text-primary)] font-bold text-xs">{s.model}</span>
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--m-accent)] hover:text-[var(--m-accent-strong)] flex items-center gap-1 text-[10px]"
                >
                  <span>Portal</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <p className="text-[11px] text-[var(--m-text-secondary)] mt-1 leading-snug">{s.provider}</p>
              <p className="text-[10px] text-[var(--m-text-muted)] mt-0.5">{s.pipeline}</p>
            </div>
            <div className="pt-2 border-t border-[var(--m-border)] text-[9px] text-[var(--m-text-muted)] truncate">
              {s.license}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[var(--m-text-muted)] leading-relaxed mt-1">
        Scientific Grounding Notice: MAUSAM acts as an authoritative ingestion, normalization, and visualization workspace. Forecast models are not trained in browser or by MAUSAM; they represent verified numerical physics output from international meteorological centers.
      </p>
    </div>
  );
};
