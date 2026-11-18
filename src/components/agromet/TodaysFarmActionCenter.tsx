import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Droplets,
  SprayCan,
  Sprout,
  Tractor,
  Wheat,
  Clock,
  Zap,
  Info,
} from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import {
  CropType,
  PhenologicalStage,
  evaluateFarmOperations,
} from '../../services/agronomicEngine';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface TodaysFarmActionCenterProps {
  weather?: WeatherDataBundle;
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  district: string;
}

export const TodaysFarmActionCenter: React.FC<TodaysFarmActionCenterProps> = ({
  weather,
  selectedCrop,
  selectedStage,
  district,
}) => {
  const evaluation = evaluateFarmOperations(weather, selectedCrop, selectedStage);

  const iconMap: Record<string, React.ElementType> = {
    Droplets,
    SprayCan,
    Sprout,
    Tractor,
    Wheat,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECOMMENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#22C7A0]/12 border border-[#22C7A0]/35 text-[#6EE7B7] text-[10px] font-mono font-semibold uppercase">
            <CheckCircle2 className="w-3 h-3" />
            RECOMMENDED
          </span>
        );
      case 'CAUTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F59E0B]/12 border border-[#F59E0B]/35 text-[#FCD34D] text-[10px] font-mono font-semibold uppercase">
            <AlertTriangle className="w-3 h-3" />
            CAUTION
          </span>
        );
      case 'DEFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#35C7E8]/12 border border-[#35C7E8]/35 text-[#7DD3FC] text-[10px] font-mono font-semibold uppercase">
            <Clock className="w-3 h-3" />
            DEFER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EF4444]/12 border border-[#EF4444]/35 text-[#FCA5A5] text-[10px] font-mono font-semibold uppercase">
            <XCircle className="w-3 h-3" />
            HOLD
          </span>
        );
    }
  };

  const overallBadgeStyle =
    evaluation.overallStatus === 'OPTIMAL'
      ? 'bg-[#22C7A0]/12 border-[#22C7A0]/35 text-[#6EE7B7]'
      : evaluation.overallStatus === 'CAUTION'
      ? 'bg-[#F59E0B]/12 border-[#F59E0B]/35 text-[#FCD34D]'
      : evaluation.overallStatus === 'RESTRICTED'
      ? 'bg-[#EF4444]/12 border-[#EF4444]/35 text-[#FCA5A5]'
      : 'bg-[#101F2E] border-[#38536A] text-[#B5C3D1]';

  const OverallIcon =
    evaluation.overallStatus === 'OPTIMAL'
      ? CheckCircle2
      : evaluation.overallStatus === 'CAUTION'
      ? AlertTriangle
      : ShieldAlert;

  return (
    <DataPanel id="agromet-action-center" className="space-y-4">
      <SectionHeading
        title="Today's Farm Action Center"
        subtitle={`Tactical directives for ${selectedCrop} (${selectedStage}) in ${district}`}
        icon={<Zap className="w-4 h-4" />}
        badge={<SourceStatus status={evaluation.isDataAvailable ? 'LIVE' : 'UNAVAILABLE'} />}
      />

      {!evaluation.isDataAvailable ? (
        <UnavailableState
          title="Tactical Operations Guidance Unavailable"
          reason={evaluation.overallReason}
          source={weather?.current?.observationSource || 'Surface Observation Feed'}
        />
      ) : (
        <>
          <div className={`rounded-xl border px-4 py-3 flex items-start sm:items-center gap-3 ${overallBadgeStyle}`}>
            <OverallIcon className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <div className="text-xs font-mono font-bold uppercase tracking-wider">
                Field Operations: {evaluation.overallStatus}
              </div>
              <p className="text-xs text-[#B5C3D1] mt-0.5 leading-snug">
                {evaluation.overallReason}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {evaluation.operations.map((op) => {
              const Icon = iconMap[op.icon] || Droplets;

              return (
                <div
                  key={op.id}
                  id={`farm-action-${op.id}`}
                  className="m-panel-inset p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8] shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      {getStatusBadge(op.status)}
                    </div>

                    <div>
                      <h3 className="text-xs font-mono font-bold text-[#F3F6FA] uppercase tracking-wider">
                        {op.name}
                      </h3>
                      <div className="text-[11px] font-mono text-[#35C7E8] mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{op.recommendedWindow}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2.5 border-t border-[#26394B] text-xs">
                    <p className="text-[#B5C3D1] leading-relaxed text-[11px]">{op.reason}</p>
                    <div className="bg-[#07111D] border border-[#26394B] rounded-lg px-2.5 py-2 text-[10px] font-mono text-[#8295A8] flex items-start gap-1.5">
                      <Info className="w-3 h-3 text-[#F59E0B] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#F3F6FA]">Trigger:</strong> {op.weatherTrigger}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DataPanel>
  );
};
