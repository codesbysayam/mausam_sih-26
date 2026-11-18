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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EF4444]/12 border border-[#EF4444]/35 text-[#FCA5A5] text-[10px] font-mono font-semibold">
          <ShieldAlert className="w-3 h-3" />
          CRITICAL
        </span>
      );
    }
    if (level === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F97316]/12 border border-[#F97316]/35 text-[#FDBA74] text-[10px] font-mono font-semibold">
          <AlertTriangle className="w-3 h-3" />
          HIGH
        </span>
      );
    }
    if (level === 'MODERATE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F59E0B]/12 border border-[#F59E0B]/35 text-[#FCD34D] text-[10px] font-mono font-semibold">
          <AlertTriangle className="w-3 h-3" />
          MODERATE
        </span>
      );
    }
    if (level === 'UNAVAILABLE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#101F2E] border border-[#26394B] text-[#8295A8] text-[10px] font-mono font-semibold">
          <WifiOff className="w-3 h-3" />
          UNAVAILABLE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#22C7A0]/12 border border-[#22C7A0]/35 text-[#6EE7B7] text-[10px] font-mono font-semibold">
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
                    <div className="w-8 h-8 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8] shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    {getLevelBadge(item.level)}
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold text-[#F3F6FA] uppercase tracking-wider">
                      {item.name}
                    </h3>
                    <div className="text-[11px] font-mono text-[#8295A8] mt-0.5 truncate" title={item.driver}>
                      {item.driver}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-[#8295A8]">
                    <span>Vulnerability Index</span>
                    <span className="text-[#F3F6FA] font-bold">
                      {item.score !== null ? `${item.score}/100` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-[#101F2E] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${item.score ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#26394B] text-[11px] text-[#B5C3D1] leading-relaxed">
                  <strong className="text-[#35C7E8] font-mono text-[10px] block uppercase mb-0.5">
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
