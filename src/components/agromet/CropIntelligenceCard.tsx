import React from 'react';
import { Sprout, Activity, Droplets, Bug, ListOrdered } from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import {
  CropType,
  PhenologicalStage,
  getCropPhenologyProfile,
} from '../../services/agronomicEngine';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface CropIntelligenceCardProps {
  weather?: WeatherDataBundle;
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  district: string;
}

export const CropIntelligenceCard: React.FC<CropIntelligenceCardProps> = ({
  weather,
  selectedCrop,
  selectedStage,
  district,
}) => {
  const profile = getCropPhenologyProfile(selectedCrop, selectedStage, weather);

  const sensitivityBadge =
    profile.weatherSensitivity === 'HIGH'
      ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/35 text-[var(--m-danger)]'
      : profile.weatherSensitivity === 'MODERATE'
      ? 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/35 text-[var(--m-watch)]'
      : 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/35 text-[var(--m-ok)]';

  const diseaseBadgeClass =
    profile.diseaseEnvironment === 'ELEVATED'
      ? 'text-[var(--m-danger)]'
      : profile.diseaseEnvironment === 'FAVORABLE'
      ? 'text-[var(--m-watch)]'
      : profile.diseaseEnvironment === 'LOW'
      ? 'text-[var(--m-ok)]'
      : 'text-[var(--m-text-muted)]';

  return (
    <DataPanel id="agromet-crop-intelligence" className="space-y-4">
      <SectionHeading
        title={`Crop Intelligence Profile · ${selectedCrop}`}
        subtitle={`Physiological thresholds and agronomic directives for ${selectedStage} stage in ${district}`}
        icon={<Sprout className="w-4 h-4" />}
        badge={<SourceStatus status="REFERENCE" labelOverride="ICAR PHENOLOGY" />}
        action={
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold ${sensitivityBadge}`}>
            {profile.weatherSensitivity} SENSITIVITY
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="m-panel-inset p-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--m-text-muted)] uppercase">
            <span>Current Phenology</span>
            <Activity className="w-4 h-4 text-[var(--m-accent)]" />
          </div>
          <div className="text-lg font-bold text-[var(--m-text-primary)] font-mono">{profile.stage}</div>
          <div className="text-xs font-mono tabular-nums text-[var(--m-text-muted)]">
            Optimum Temp: {profile.optimumTempRange[0]}°C – {profile.optimumTempRange[1]}°C
          </div>
        </div>

        <div className="m-panel-inset p-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--m-text-muted)] uppercase">
            <span>Hydraulic Demand</span>
            <Droplets className="w-4 h-4 text-[var(--m-accent)]" />
          </div>
          <div className="text-lg font-bold text-[var(--m-text-primary)] font-mono">{profile.waterRequirement}</div>
          <div className="text-xs font-mono tabular-nums text-[var(--m-text-muted)]">
            Reference ETc: {profile.criticalETdemandMm} mm/day
          </div>
        </div>

        <div className="m-panel-inset p-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--m-text-muted)] uppercase">
            <span>Pathogen Environment</span>
            <Bug className="w-4 h-4 text-[var(--m-watch)]" />
          </div>
          <div className={`text-lg font-bold font-mono ${diseaseBadgeClass}`}>
            {profile.diseaseEnvironment === 'UNAVAILABLE' ? 'TELEMETRY PENDING' : profile.diseaseEnvironment}
          </div>
          <div className="text-xs font-mono tabular-nums text-[var(--m-text-muted)]">
            Max Wind Tolerance: {profile.maxWindToleranceKmh} km/h
          </div>
        </div>
      </div>

      <div className="m-panel-inset p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--m-ok)] uppercase tracking-wider">
          <ListOrdered className="w-4 h-4" />
          <span>Priority Field Directives</span>
        </div>

        <div className="space-y-2">
          {profile.priorities.map((p, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-3"
            >
              <span className="shrink-0 w-6 h-6 rounded-md bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/35 text-[var(--m-ok)] font-mono tabular-nums text-xs font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed pt-0.5">{p}</p>
            </div>
          ))}
        </div>
      </div>
    </DataPanel>
  );
};
