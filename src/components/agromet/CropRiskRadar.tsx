import React from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  ShieldAlert,
  Bug,
  AlertTriangle,
  CheckCircle2,
  Biohazard,
  ThermometerSnowflake,
  Wind,
  Droplets,
  HelpCircle,
  Pill,
  Leaf,
} from 'lucide-react';

interface CropRiskRadarProps {
  bulletin: ExtendedAgrometBulletin;
  selectedCrop: string;
}

export const CropRiskRadar: React.FC<CropRiskRadarProps> = ({
  bulletin,
  selectedCrop,
}) => {
  const riskFactors = [
    {
      id: 'fungal',
      name: 'Fungal & Bacterial Pathogen',
      level: 'HIGH RISK',
      score: 82,
      color: '#EF4444',
      icon: Biohazard,
      driver: 'Morning RH >80% & dense tillering canopy',
      recommendation: 'Spray Streptocycline (30g) + Copper Oxychloride (500g) in 200L water if lesions appear on sheaths.',
    },
    {
      id: 'insect',
      name: 'Insect & Sucking Pest Pressure',
      level: 'MODERATE',
      score: 54,
      color: '#F59E0B',
      icon: Bug,
      driver: 'Overcast skies favor Whitefly & Stem Borer oviposition',
      recommendation: 'Install 5 pheromone traps/acre; monitor ETL (6-8 adults/leaf).',
    },
    {
      id: 'waterlogging',
      name: 'Waterlogging & Root Asphyxiation',
      level: 'LOW RISK',
      score: 28,
      color: '#10B981',
      icon: Droplets,
      driver: 'Normal field drainage channels operational',
      recommendation: 'Ensure perimeter bunds have unblocked spillway outlets.',
    },
    {
      id: 'thermal',
      name: 'Heat Shock & Scorching',
      level: 'LOW RISK',
      score: 22,
      color: '#10B981',
      icon: ThermometerSnowflake,
      driver: 'Max temperature 31-33°C remains within safety margin',
      recommendation: 'No thermal mitigation required for current crop stage.',
    },
    {
      id: 'wind',
      name: 'Lodging & Mechanical Wind Drag',
      level: 'LOW RISK',
      score: 18,
      color: '#10B981',
      icon: Wind,
      driver: 'Surface wind gusts <15 km/h',
      recommendation: 'Safe conditions; no propping needed for current crop height.',
    },
  ];

  return (
    <section id="crop-risk-monitor-section" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--m-border)]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[var(--m-danger)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-danger)]">
              Biotic &amp; Abiotic Vulnerability Radar
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Crop Risk &amp; Pest Monitor
          </h2>
        </div>
        <span className="text-xs font-mono text-[var(--m-text-muted)]">
          Multi-hazard agronomic risk index for {selectedCrop}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Risk Matrix Factor Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {riskFactors.map((factor) => {
            const IconComp = factor.icon;
            return (
              <div
                key={factor.id}
                className="p-4 rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[var(--m-danger)]/40 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${factor.color}15`,
                        color: factor.color,
                      }}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      {factor.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                      style={{
                        color: factor.color,
                        backgroundColor: `${factor.color}12`,
                        borderColor: `${factor.color}30`,
                      }}
                    >
                      {factor.level}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {factor.score}/100
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-[var(--m-surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${factor.score}%`,
                      backgroundColor: factor.color,
                    }}
                  ></div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[var(--m-text-muted)] gap-1">
                  <span className="text-[var(--m-text-muted)] font-mono">
                    Driver: {factor.driver}
                  </span>
                </div>

                <p className="text-[11px] text-[var(--m-text-primary)] bg-[var(--m-surface-inset)] p-2.5 rounded-xl border border-[var(--m-border)]">
                  <strong className="text-white font-mono">Action: </strong>
                  {factor.recommendation}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected Crop Specific Bio-Control Prescription (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-[var(--m-surface-1)] border border-[var(--m-border)] p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--m-border)]">
              <span className="text-xs font-mono font-bold text-white uppercase">
                Plant Protection Rx for {selectedCrop.split(' ')[0]}
              </span>
              <span className="text-[10px] font-mono text-[var(--m-danger)] bg-[var(--m-danger-soft)] px-2 py-0.5 rounded border border-[var(--m-danger)]/30 font-bold">
                ETL Active
              </span>
            </div>

            {/* Pathogen Detail */}
            <div className="p-3.5 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-[var(--m-danger)] font-mono font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Primary Target Pathogen</span>
              </div>
              <p className="text-white font-bold">
                Bacterial Leaf Blight &amp; Sheath Rot (Rhizoctonia solani)
              </p>
              <p className="text-[11px] text-[var(--m-text-muted)] leading-relaxed">
                Symptoms: Greyish-green water-soaked lesions expanding on lower leaf sheaths above water line.
              </p>
            </div>

            {/* Organic Remedy */}
            <div className="p-3.5 rounded-2xl bg-[var(--m-surface-inset)] border border-[#10B981]/30 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-[var(--m-ok)] font-mono font-bold">
                <Leaf className="w-3.5 h-3.5" />
                <span>Organic &amp; Biological Defense</span>
              </div>
              <p className="text-[var(--m-text-primary)] leading-relaxed">
                Spray Pseudomonas fluorescens @ 10g/L or Trichoderma viride @ 5g/L during cloudy morning intervals.
              </p>
            </div>

            {/* Chemical Control */}
            <div className="p-3.5 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-accent)]/30 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-[var(--m-accent)] font-mono font-bold">
                <Pill className="w-3.5 h-3.5" />
                <span>Chemical Intervention (If ETL &gt; 10% tillers)</span>
              </div>
              <p className="text-[var(--m-text-primary)] leading-relaxed">
                Hexaconazole 5% EC @ 2ml/L water or Streptocycline 30g + Copper Oxychloride 500g per 200L water.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--m-border)] text-[10px] font-mono text-[var(--m-text-muted)] flex items-center justify-between">
            <span>Protocol: ICAR-CRRI IPM Guidelines</span>
            <span className="text-[var(--m-ok)]">Verified</span>
          </div>
        </div>
      </div>
    </section>
  );
};
