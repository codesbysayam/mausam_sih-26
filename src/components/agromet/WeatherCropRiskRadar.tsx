import React from 'react';
import {
  AlertTriangle,
  Flame,
  DropletOff,
  CloudRain,
  Gauge,
  Wind,
  Bug,
  Activity,
  CheckCircle2,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import {
  CropType,
  PhenologicalStage,
  evaluateWeatherCropRisks,
  RiskFactorItem,
} from '../../services/agronomicEngine';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface WeatherCropRiskRadarProps {
  weather?: WeatherDataBundle;
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  district: string;
}

export const WeatherCropRiskRadar: React.FC<WeatherCropRiskRadarProps> = ({
  weather,
  selectedCrop,
  selectedStage,
  district,
}) => {
  const risks = evaluateWeatherCropRisks(weather, selectedCrop, selectedStage);

  const iconMap: Record<string, React.ElementType> = {
    heat: Flame,
    water_stress: DropletOff,
    excess_rain: CloudRain,
    high_humidity: Gauge,
    wind_damage: Wind,
    pest_pressure: Bug,
    disease_pressure: Activity,
  };

  const getLevelBadge = (level: RiskFactorItem['level']) => {
    if (level === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/35 text-[var(--m-danger)] text-[10px] font-mono font-semibold">
          <ShieldAlert className="w-3 h-3" />
          CRITICAL
        </span>
      );
    }
    if (level === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-alert-soft)] border border-[var(--m-alert)]/35 text-[var(--m-alert)] text-[10px] font-mono font-semibold">
          <AlertTriangle className="w-3 h-3" />
          HIGH
        </span>
      );
    }
    if (level === 'MODERATE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/35 text-[var(--m-watch)] text-[10px] font-mono font-semibold">
          <AlertTriangle className="w-3 h-3" />
          MODERATE
        </span>
      );
    }
    if (level === 'UNAVAILABLE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-muted)] text-[10px] font-mono font-semibold">
          <WifiOff className="w-3 h-3" />
          UNAVAILABLE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/35 text-[var(--m-ok)] text-[10px] font-mono font-semibold">
        <CheckCircle2 className="w-3 h-3" />
        LOW
      </span>
    );
  };

  const getProgressBarColor = (color: RiskFactorItem['color']) => {
    if (color === 'rose') return 'bg-[#EF4444]';
    if (color === 'orange') return 'bg-[#F97316]';
    if (color === 'amber') return 'bg-[#F59E0B]';
    if (color === 'slate') return 'bg-[#38536A]';
    return 'bg-[#22C7A0]';
  };

  return (
    <DataPanel id="agromet-risk-radar" className="space-y-4">
      <SectionHeading
        title="Weather-Crop Risk Radar (7-Factor Diagnostic)"
        subtitle={`Multi-hazard environmental vulnerability assessment for ${selectedCrop} in ${district}`}
        icon={<AlertTriangle className="w-4 h-4" />}
        badge={<SourceStatus status={risks.length > 0 ? 'LIVE' : 'UNAVAILABLE'} />}
      />

      {risks.length === 0 ? (
        <UnavailableState
          title="7-Factor Crop Risk Radar Unavailable"
          reason="Live surface temperature and meteorological telemetry are unavailable to compute crop vulnerability scores."
          source={weather?.current?.observationSource || 'Surface Observation Feed'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {risks.map((item) => {
            const Icon = iconMap[item.id] || AlertTriangle;
            const barColor = getProgressBarColor(item.color);

            return (
              <div
                key={item.id}
                id={`risk-factor-card-${item.id}`}
                className="m-panel-inset p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)] shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    {getLevelBadge(item.level)}
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold text-[var(--m-text-primary)] uppercase tracking-wider">
                      {item.name}
                    </h3>
                    <div className="text-[11px] font-mono text-[var(--m-text-muted)] mt-0.5 truncate" title={item.driver}>
                      {item.driver}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-[var(--m-text-muted)]">
                    <span>Vulnerability Index</span>
                    <span className="text-[var(--m-text-primary)] font-bold">
                      {item.score !== null ? `${item.score}/100` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--m-surface-2)] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${item.score ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[var(--m-border)] text-[11px] text-[var(--m-text-secondary)] leading-relaxed">
                  <strong className="text-[var(--m-accent)] font-mono text-[10px] block uppercase mb-0.5">
                    Management Action
                  </strong>
                  {item.managementAction}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DataPanel>
  );
};
