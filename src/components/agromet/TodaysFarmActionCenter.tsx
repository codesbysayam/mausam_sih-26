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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/35 text-[var(--m-ok)] text-[10px] font-mono font-semibold uppercase">
            <CheckCircle2 className="w-3 h-3" />
            RECOMMENDED
          </span>
        );
      case 'CAUTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/35 text-[var(--m-watch)] text-[10px] font-mono font-semibold uppercase">
            <AlertTriangle className="w-3 h-3" />
            CAUTION
          </span>
        );
      case 'DEFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/35 text-[var(--m-accent)] text-[10px] font-mono font-semibold uppercase">
            <Clock className="w-3 h-3" />
            DEFER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/35 text-[var(--m-danger)] text-[10px] font-mono font-semibold uppercase">
            <XCircle className="w-3 h-3" />
            HOLD
          </span>
        );
    }
  };

  const overallBadgeStyle =
    evaluation.overallStatus === 'OPTIMAL'
      ? 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/35 text-[var(--m-ok)]'
      : evaluation.overallStatus === 'CAUTION'
      ? 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/35 text-[var(--m-watch)]'
      : evaluation.overallStatus === 'RESTRICTED'
      ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/35 text-[var(--m-danger)]'
      : 'bg-[var(--m-surface-2)] border-[var(--m-border-strong)] text-[var(--m-text-secondary)]';

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
              <p className="text-xs text-[var(--m-text-secondary)] mt-0.5 leading-snug">
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
                      <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)] shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      {getStatusBadge(op.status)}
                    </div>

                    <div>
                      <h3 className="text-xs font-mono font-bold text-[var(--m-text-primary)] uppercase tracking-wider">
                        {op.name}
                      </h3>
                      <div className="text-[11px] font-mono text-[var(--m-accent)] mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{op.recommendedWindow}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2.5 border-t border-[var(--m-border)] text-xs">
                    <p className="text-[var(--m-text-secondary)] leading-relaxed text-[11px]">{op.reason}</p>
                    <div className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg px-2.5 py-2 text-[10px] font-mono text-[var(--m-text-muted)] flex items-start gap-1.5">
                      <Info className="w-3 h-3 text-[var(--m-watch)] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[var(--m-text-primary)]">Trigger:</strong> {op.weatherTrigger}
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
