import React from 'react';
import { Database, Clock, Info } from 'lucide-react';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

interface AgrometDataProvenanceFooterProps {
  lastUpdatedStr: string;
  stationName: string;
}

export const AgrometDataProvenanceFooter: React.FC<AgrometDataProvenanceFooterProps> = ({
  lastUpdatedStr,
  stationName,
}) => {
  const sources = [
    {
      name: 'IMD AWS & Surface Network',
      role: 'Hourly surface weather telemetry, rainfall accumulation, and anemometer feeds.',
      badge: 'GOV MET SERVICE',
    },
    {
      name: 'Gramin Krishi Mausam Sewa (GKMS)',
      role: 'District-level AMFU reference advisories, phenological matrices, and IPM pest guidance.',
      badge: 'AGROMET NODE',
    },
    {
      name: 'NCMRWF & Open-Meteo NWP',
      role: 'Numerical weather prediction, 72h hourly windows, and 7-day daily ensemble output.',
      badge: 'NWP ENSEMBLE',
    },
    {
      name: 'ICAR & SAU Research Reference',
      role: 'Crop water requirement indices (ETc), stage thresholds, and bio-control protocols.',
      badge: 'ICAR REFERENCE',
    },
  ];

  return (
    <footer id="agromet-data-provenance">
      <DataPanel className="space-y-4">
        <SectionHeading
          title="Agromet Data Provenance & Observation Methodology"
          subtitle={`Institutional integrations and agronomic reference models (${stationName})`}
          icon={<Database className="w-4 h-4" />}
          action={
            <div className="text-[11px] font-mono text-[#8295A8] flex items-center gap-1.5 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span>
                Observation Time:{' '}
                <strong className="text-[#F3F6FA]">
                  {lastUpdatedStr ? lastUpdatedStr : 'Pending Sync'}
                </strong>
              </span>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="m-panel-inset p-4 space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono font-bold text-[#6EE7B7] bg-[#22C7A0]/12 px-2 py-0.5 rounded border border-[#22C7A0]/30 inline-block">
                  {src.badge}
                </span>
                <h3 className="text-xs font-mono font-bold text-[#F3F6FA]">{src.name}</h3>
              </div>
              <p className="text-[11px] text-[#8295A8] leading-relaxed">{src.role}</p>
            </div>
          ))}
        </div>

        <div className="m-panel-inset p-4 flex items-start gap-3 text-[11px] font-mono text-[#8295A8] leading-relaxed">
          <Info className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[#F3F6FA]">Notice:</strong> Agromet advisories combine live weather observations with ICAR/AMFU reference thresholds. Verify local soil moisture, irrigation canal supply, and crop scouting before capital-intensive field operations.
          </span>
        </div>
      </DataPanel>
    </footer>
  );
};
