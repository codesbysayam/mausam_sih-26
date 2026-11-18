import React from 'react';
import { Activity, Compass, Mountain, CheckCircle2 } from 'lucide-react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelRun, NWPForecastPoint } from '../../types/nwp';
import { DataPanel, SectionHeading, MetricValue } from '../ui/ObservatoryPrimitives';

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
      <DataPanel className="flex flex-col gap-4">
        <SectionHeading
          title="Regional Model Analysis — WRF-ARW"
          subtitle="Non-hydrostatic mesoscale configuration"
          icon={<Mountain className="w-4 h-4" />}
          badge={
            <span className="text-[10px] font-mono text-[#B5C3D1] bg-[#08131F] px-2 py-0.5 rounded border border-[#26394B]">
              MESOSCALE CORE
            </span>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="m-panel-inset p-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#8295A8]">Domain Coverage</span>
            <span className="text-sm font-bold text-[#F3F6FA]">South Asia / India</span>
            <span className="text-[11px] text-[#8295A8]">Non-hydrostatic terrain matching</span>
          </div>

          <div className="m-panel-inset p-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#8295A8]">Mesoscale Grid</span>
            <span className="text-sm font-bold text-[#F3F6FA]">3 km &amp; 9 km Nested</span>
            <span className="text-[11px] text-[#8295A8]">Explicit convection physics</span>
          </div>

          <div className="m-panel-inset p-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#8295A8]">Horizon</span>
            <span className="text-sm font-bold text-[#F3F6FA]">0–72 Hours (3 Days)</span>
            <span className="text-[11px] text-[#8295A8]">Rapid-update mesoscale cycle</span>
          </div>

          <div className="m-panel-inset p-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-[#8295A8]">Feed Status</span>
            <span className="text-sm font-bold text-[#B5C3D1]">
              {isUnavailable ? 'Gateway Unconfigured' : 'Operational Feed Synced'}
            </span>
            <span className="text-[11px] text-[#8295A8]">IMD HPC ARW output</span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#26394B]">
          <span className="text-[11px] font-semibold text-[#B5C3D1] block mb-2">
            Primary Regional Focus:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              'Convective Rainfall',
              'Thunderstorm Squalls',
              'Updraft Dynamics',
              'Terrain Interactions',
              'Short-Range Weather',
            ].map((pill) => (
              <div
                key={pill}
                className="p-2 rounded-lg bg-[#08131F] border border-[#26394B] text-[#7DD3FC] font-medium flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#35C7E8]" />
                <span>{pill}</span>
              </div>
            ))}
          </div>
        </div>
      </DataPanel>
    );
  }

  if (modelId === 'GEFS') {
    const stats = runData?.ensembleStats;
    const members = stats?.membersCount;
    const tempSpread = stats?.tempSpread;

    return (
      <DataPanel className="flex flex-col gap-4">
        <SectionHeading
          title="Ensemble Analysis — NOAA / NCEP GEFS v12"
          subtitle="Multi-member trajectory uncertainty evaluation"
          icon={<Activity className="w-4 h-4" />}
          badge={
            members ? (
              <span className="text-[10px] font-mono text-[#6EE7B7] bg-[#22C7A0]/12 px-2 py-0.5 rounded border border-[#22C7A0]/35">
                {members} MEMBERS
              </span>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="m-panel-inset p-3.5">
            <MetricValue
              label="Ensemble Members"
              value={members && members > 0 ? members : null}
              unit="Members"
              hint="Control + perturbed runs"
            />
          </div>

          <div className="m-panel-inset p-3.5">
            <MetricValue
              label="24h Ensemble Mean"
              value={tempSpread?.mean ?? firstPoint?.temperature2m}
              unit="°C"
              precision={1}
              valueClassName="text-xl sm:text-2xl font-bold text-[#FCD34D]"
              hint="Mean member trajectory"
            />
          </div>

          <div className="m-panel-inset p-3.5 flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-[#8295A8] uppercase tracking-wider">
              24h Temp Spread
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#35C7E8] tabular-nums">
              {tempSpread ? `${tempSpread.min}° – ${tempSpread.max}°C` : '—'}
            </span>
            <span className="text-[11px] text-[#8295A8]">
              {tempSpread ? '24h uncertainty envelope' : 'Unavailable'}
            </span>
          </div>

          <div className="m-panel-inset p-3.5">
            <MetricValue
              label="Rain Probability"
              value={firstPoint?.precipitationProbability}
              unit="%"
              valueClassName="text-xl sm:text-2xl font-bold text-[#6EE7B7]"
              hint="Members exceeding 0.1 mm"
            />
          </div>
        </div>

        <p className="text-xs text-[#B5C3D1] leading-relaxed">
          GEFS executes multiple concurrent simulations initialized with small atmospheric perturbations. Narrow member convergence signals high confidence; divergence signals chaotic uncertainty.
        </p>
      </DataPanel>
    );
  }

  return (
    <DataPanel className="flex flex-col gap-4">
      <SectionHeading
        title="Medium-Range Analysis — ECMWF IFS HRES"
        subtitle="Global deterministic synoptic core"
        icon={<Compass className="w-4 h-4" />}
        badge={
          <span className="text-[10px] font-mono text-[#6EE7B7] bg-[#22C7A0]/12 px-2 py-0.5 rounded border border-[#22C7A0]/35">
            GLOBAL 4D-VAR
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="m-panel-inset p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-[#8295A8]">Spatial Resolution</span>
          <span className="text-base font-bold font-mono text-[#F3F6FA]">9 km Native Grid</span>
          <span className="text-[11px] text-[#8295A8]">0.1° / 0.25° Delivery Matrix</span>
        </div>

        <div className="m-panel-inset p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-[#8295A8]">Forecast Horizon</span>
          <span className="text-base font-bold font-mono text-[#F3F6FA]">0–360h (15 Days)</span>
          <span className="text-[11px] text-[#8295A8]">Medium-range evolution</span>
        </div>

        <div className="m-panel-inset p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-[#8295A8]">Data Assimilation</span>
          <span className="text-base font-bold font-mono text-[#35C7E8]">Continuous 4D-Var</span>
          <span className="text-[11px] text-[#8295A8]">Global satellite radiances</span>
        </div>

        <div className="m-panel-inset p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-mono text-[#8295A8]">Synoptic Focus</span>
          <span className="text-base font-bold font-mono text-[#6EE7B7]">Planetary &amp; Trough</span>
          <span className="text-[11px] text-[#8295A8]">500 hPa wave &amp; pressure skill</span>
        </div>
      </div>

      <p className="text-xs text-[#B5C3D1] leading-relaxed">
        The ECMWF Integrated Forecasting System (IFS) tracks synoptic low-pressure systems, western disturbances, monsoon troughs, and planetary jet streams across medium-range horizons.
      </p>
    </DataPanel>
  );
};
