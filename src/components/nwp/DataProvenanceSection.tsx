import React from 'react';
import { ShieldAlert, Database, Radio, Cpu, AlertTriangle, ExternalLink } from 'lucide-react';
import { NWPModelDataset } from '../../types/nwp';
import { DataPanel, SectionHeading, SourceStatus, ProvenanceStatus } from '../ui/ObservatoryPrimitives';

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

  const toStatus = (status?: string): ProvenanceStatus => {
    if (status === 'LIVE') return 'LIVE';
    if (status === 'RECENT') return 'RECENT';
    if (status === 'STALE') return 'STALE';
    return 'UNAVAILABLE';
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      <DataPanel className="flex flex-col gap-4">
        <SectionHeading
          title="Scientific Boundary Notice: Three Distinct Meteorological Layers"
          icon={<ShieldAlert className="w-4 h-4" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="m-panel-inset p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[var(--m-ok)]" />
              <span className="text-xs font-bold font-mono text-[var(--m-ok)] uppercase tracking-wide">
                Current Observation
              </span>
            </div>
            <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
              Ground instruments, automatic weather stations (AWS), radar reflectivity, and satellite telemetry recorded near real-time.
            </p>
          </div>

          <div className="m-panel-inset p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--m-accent)]" />
              <span className="text-xs font-bold font-mono text-[var(--m-accent)] uppercase tracking-wide">
                Model Forecast
              </span>
            </div>
            <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
              Numerical fluid-dynamics simulations calculated forward in time. Curves evolve with each initialization cycle.
            </p>
          </div>

          <div className="m-panel-inset p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--m-danger)]" />
              <span className="text-xs font-bold font-mono text-[var(--m-danger)] uppercase tracking-wide">
                Official Warning
              </span>
            </div>
            <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
              Statutory advisories issued by authorized authorities (IMD, NDMA, SDMAs) to protect life and property.
            </p>
          </div>
        </div>
      </DataPanel>

      <DataPanel className="flex flex-col gap-4">
        <SectionHeading
          title="Data Sources & Computational Methodology"
          icon={<Database className="w-4 h-4" />}
          action={
            lastFetchedAt ? (
              <span className="text-[11px] font-mono text-[var(--m-text-muted)] tabular-nums">
                Synchronized: {lastFetchedAt}
              </span>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="m-panel-inset p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold font-mono text-[var(--m-text-primary)]">WRF-ARW</span>
                <SourceStatus
                  status={toStatus(wrf?.status)}
                  labelOverride={!wrf || wrf.status === 'UNAVAILABLE' ? 'NOT CONFIGURED' : undefined}
                />
              </div>
              <div className="text-xs text-[var(--m-text-secondary)] mt-2.5 flex flex-col gap-1">
                <div><strong className="text-[var(--m-text-primary)]">Source:</strong> IMD / NCMRWF / ARW Core</div>
                <div><strong className="text-[var(--m-text-primary)]">Resolution:</strong> 3 km &amp; 9 km Dual Nest</div>
                <div><strong className="text-[var(--m-text-primary)]">Range:</strong> 72 Hours (3 Days)</div>
                <div><strong className="text-[var(--m-text-primary)]">Cadence:</strong> 00 &amp; 12 UTC cycles</div>
              </div>
            </div>

            <a
              href="https://internal.imd.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--m-accent)] hover:underline flex items-center gap-1 font-mono pt-2 border-t border-[var(--m-border)]"
            >
              <span>IMD Gateway Specs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="m-panel-inset p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold font-mono text-[var(--m-text-primary)]">NOAA GEFS v12</span>
                <SourceStatus status={toStatus(gefs?.status)} />
              </div>
              <div className="text-xs text-[var(--m-text-secondary)] mt-2.5 flex flex-col gap-1">
                <div><strong className="text-[var(--m-text-primary)]">Source:</strong> NOAA / NCEP / NOMADS</div>
                <div><strong className="text-[var(--m-text-primary)]">Resolution:</strong> 25 km (~0.25° Grid)</div>
                <div><strong className="text-[var(--m-text-primary)]">Range:</strong> 16 Days (384 Hours)</div>
                <div><strong className="text-[var(--m-text-primary)]">Ensemble:</strong> 31 Perturbed Members</div>
              </div>
            </div>

            <a
              href="https://www.emc.ncep.noaa.gov/emc/pages/numerical_forecast_systems/gefs.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--m-accent)] hover:underline flex items-center gap-1 font-mono pt-2 border-t border-[var(--m-border)]"
            >
              <span>NOAA GEFS Technical Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="m-panel-inset p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold font-mono text-[var(--m-text-primary)]">ECMWF IFS HRES</span>
                <SourceStatus status={toStatus(ecmwf?.status)} />
              </div>
              <div className="text-xs text-[var(--m-text-secondary)] mt-2.5 flex flex-col gap-1">
                <div><strong className="text-[var(--m-text-primary)]">Source:</strong> Open-Meteo → ECMWF IFS HRES</div>
                <div><strong className="text-[var(--m-text-primary)]">Resolution:</strong> 9 km Native / 0.1° Grid</div>
                <div><strong className="text-[var(--m-text-primary)]">Range:</strong> 15 Days (360 Hours)</div>
                <div><strong className="text-[var(--m-text-primary)]">Assimilation:</strong> Continuous 4D-Var</div>
              </div>
            </div>

            <a
              href="https://www.ecmwf.int/en/forecasts/datasets/open-data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--m-accent)] hover:underline flex items-center gap-1 font-mono pt-2 border-t border-[var(--m-border)]"
            >
              <span>ECMWF Open Data Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </DataPanel>
    </div>
  );
};
