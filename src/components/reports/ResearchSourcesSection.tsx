import React from 'react';
import { ShieldCheck, Building2, FileCheck } from 'lucide-react';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

export const ResearchSourcesSection: React.FC = () => {
  const sources = [
    {
      id: 'imd',
      name: 'India Meteorological Department (IMD)',
      ministry: 'Ministry of Earth Sciences, Govt. of India',
      role: 'National Weather Forecasting Centre, Climatological Baselines, Doppler Radar Network & Synoptic Bulletins.',
      tag: 'PRIMARY METEOROLOGICAL AUTHORITY',
      color: '#C5A46D',
    },
    {
      id: 'ncmrwf',
      name: 'NCMRWF (MoES)',
      ministry: 'National Centre for Medium Range Weather Forecasting',
      role: 'Unified Model (NCUM 12km), Ensemble Prediction Systems (NEPS), and 4D-Var Data Assimilation.',
      tag: 'NWP & SUPERCOMPUTING',
      color: '#C5A46D',
    },
    {
      id: 'cpcb',
      name: 'Central Pollution Control Board (CPCB / SAFAR)',
      ministry: 'MoEFCC / MoES Joint Surveillance',
      role: 'Continuous Ambient Air Quality Monitoring Stations (CAAQMS), NAQI Sub-Index Calculations & Bio-Aeroallergens.',
      tag: 'AIR QUALITY REGISTRY',
      color: '#22C7A0',
    },
    {
      id: 'isro',
      name: 'ISRO / SAC / MOSDAC',
      ministry: 'Department of Space, Govt. of India',
      role: 'INSAT-3D, INSAT-3DR Geostationary Imager & Sounder Payloads, OceanSat Scatterometer & Sea Surface Temperatures.',
      tag: 'EARTH OBSERVATION SATELLITES',
      color: '#C5A46D',
    },
    {
      id: 'wmo',
      name: 'World Meteorological Organization (WMO)',
      ministry: 'United Nations Specialized Agency',
      role: 'WMO-No. 8 Guide to Meteorological Instruments & Methods of Observation Traceability Standard Compliance.',
      tag: 'GLOBAL OBSERVATION STANDARD',
      color: '#22C7A0',
    },
    {
      id: 'ndma',
      name: 'National Disaster Management Authority (NDMA)',
      ministry: 'Ministry of Home Affairs, Govt. of India',
      role: 'Standard Operating Procedures for Extreme Weather Hazards, Cyclone Mitigation & Heat Action Plans.',
      tag: 'EARLY WARNING PROTOCOLS',
      color: '#F59E0B',
    },
  ];

  return (
    <DataPanel id="research-sources-section" className="space-y-5">
      <SectionHeading
        title="Official Data & Research Authorities"
        subtitle="Institutional provenance for publications, synoptic baselines, and regulatory directives"
        icon={<Building2 className="w-4 h-4" />}
        action={
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[var(--m-ok)] bg-[var(--m-ok-soft)] px-3 py-1.5 rounded-lg border border-[var(--m-ok)]/35">
            <ShieldCheck className="w-4 h-4" />
            <span>Authenticated Institutional Registry</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sources.map((src) => (
          <div
            key={src.id}
            className="p-4 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] transition-colors flex flex-col justify-between space-y-3"
          >
            <div>
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border inline-block mb-2.5"
                style={{
                  color: src.color,
                  backgroundColor: `${src.color}18`,
                  borderColor: `${src.color}40`,
                }}
              >
                {src.tag}
              </span>

              <h4 className="text-sm font-bold text-[var(--m-text-primary)] leading-snug">
                {src.name}
              </h4>

              <p className="text-[11px] font-mono text-[var(--m-accent)] mt-0.5">
                {src.ministry}
              </p>

              <p className="text-xs text-[var(--m-text-secondary)] mt-2 leading-relaxed">
                {src.role}
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--m-border)] flex items-center justify-between text-[10px] font-mono text-[var(--m-text-muted)]">
              <span className="flex items-center gap-1 text-[var(--m-ok)]">
                <FileCheck className="w-3 h-3" /> Verified Authority
              </span>
              <span>Institutional Reference</span>
            </div>
          </div>
        ))}
      </div>
    </DataPanel>
  );
};
