import React from 'react';
import {
  Bug,
  AlertTriangle,
  Leaf,
  FlaskConical,
  Target,
  Thermometer,
} from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import { CropType, PhenologicalStage, getCropPhenologyProfile } from '../../services/agronomicEngine';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
} from '../ui/ObservatoryPrimitives';

interface BioticRiskMonitorProps {
  weather?: WeatherDataBundle;
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  district: string;
}

export const BioticRiskMonitor: React.FC<BioticRiskMonitorProps> = ({
  weather,
  selectedCrop,
  selectedStage,
  district,
}) => {
  const current = weather?.current;
  const temp = typeof current?.temp === 'number' ? current.temp : null;
  const humidity = typeof current?.humidity === 'number' ? current.humidity : null;
  const hasTelemetry = temp !== null && humidity !== null;

  const profile = getCropPhenologyProfile(selectedCrop, selectedStage, weather);
  const biotic = profile.pestDiseaseWatch;

  const isHighRisk = hasTelemetry && humidity > 80 && temp >= 22 && temp <= 32;
  const isModRisk = hasTelemetry && humidity > 68;
  const diseaseEnvLevel = !hasTelemetry
    ? 'UNAVAILABLE'
    : isHighRisk
    ? 'ELEVATED'
    : isModRisk
    ? 'MODERATE'
    : 'LOW';

  const diseaseEnvBadge = !hasTelemetry
    ? 'bg-[#101F2E] border-[#26394B] text-[#8295A8]'
    : isHighRisk
    ? 'bg-[#EF4444]/12 border-[#EF4444]/35 text-[#FCA5A5]'
    : isModRisk
    ? 'bg-[#F59E0B]/12 border-[#F59E0B]/35 text-[#FCD34D]'
    : 'bg-[#22C7A0]/12 border-[#22C7A0]/35 text-[#6EE7B7]';

  return (
    <DataPanel id="agromet-biotic-risk-monitor" className="space-y-4">
      <SectionHeading
        title="Pest & Disease Incubation Radar (Biotic Risk)"
        subtitle={`Pathogen microclimate thresholds & ICAR IPM protocols for ${selectedCrop} in ${district}`}
        icon={<Bug className="w-4 h-4" />}
        badge={<SourceStatus status={hasTelemetry ? 'LIVE' : 'REFERENCE'} labelOverride={hasTelemetry ? 'LIVE TELEMETRY' : 'IPM REFERENCE'} />}
        action={
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md border font-mono text-[11px] font-semibold ${diseaseEnvBadge}`}>
            DISEASE ENV: {diseaseEnvLevel}
          </span>
        }
      />

      <div className="m-panel-inset p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#26394B] pb-3.5">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-semibold text-[#35C7E8] uppercase tracking-wider block">
              Primary Target Organism &amp; Threat Vector
            </span>
            <h3 className="text-base font-bold text-[#F3F6FA]">{biotic.targetOrganism}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-[#B5C3D1] bg-[#07111D] px-3 py-2 rounded-lg border border-[#26394B]">
            <span>
              RH: <strong className="text-[#35C7E8]">{humidity !== null ? `${Math.round(humidity)}%` : '—'}</strong>
            </span>
            <span className="text-[#38536A]">·</span>
            <span>
              Temp: <strong className="text-[#F59E0B]">{temp !== null ? `${Math.round(temp * 10) / 10}°C` : '—'}</strong>
            </span>
            <span className="text-[#38536A]">·</span>
            <span>
              Dew Proxy:{' '}
              <strong className={hasTelemetry ? 'text-[#22C7A0]' : 'text-[#8295A8]'}>
                {!hasTelemetry ? '—' : humidity > 75 ? 'Active' : 'Low'}
              </strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-[#07111D] border border-[#26394B] rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#F59E0B] uppercase">
              <Thermometer className="w-3.5 h-3.5" />
              <span>Incubation Trigger</span>
            </div>
            <p className="text-xs text-[#B5C3D1] leading-relaxed">{biotic.favorableConditions}</p>
          </div>

          <div className="bg-[#07111D] border border-[#26394B] rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#35C7E8] uppercase">
              <Target className="w-3.5 h-3.5" />
              <span>Economic Threshold (ETL)</span>
            </div>
            <p className="text-xs text-[#B5C3D1] leading-relaxed">{biotic.etlThreshold}</p>
          </div>

          <div className="bg-[#07111D] border border-[#26394B] rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#22C7A0] uppercase">
              <Leaf className="w-3.5 h-3.5" />
              <span>IPM Bio-Control</span>
            </div>
            <p className="text-xs text-[#B5C3D1] leading-relaxed">{biotic.ipmBioControl}</p>
          </div>

          <div className="bg-[#07111D] border border-[#26394B] rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#EF4444] uppercase">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Chemical Intervention</span>
            </div>
            <p className="text-xs text-[#B5C3D1] leading-relaxed">{biotic.chemicalIntervention}</p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[#8295A8] flex items-start gap-2 pt-1">
          <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
          <span>
            Indicators represent meteorological risk favorability for spore incubation, not a confirmed outbreak. Verify via field scouting before chemical application.
          </span>
        </div>
      </div>
    </DataPanel>
  );
};
