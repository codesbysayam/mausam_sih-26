import React from 'react';
import { History } from 'lucide-react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelRun } from '../../types/nwp';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';

interface ModelRunHistoryProps {
  modelId: NWPModelId;
  runData?: NWPModelRun;
}

export const ModelRunHistory: React.FC<ModelRunHistoryProps> = ({
  modelId,
  runData,
}) => {
  const isUnavailable = !runData || runData.status === 'UNAVAILABLE' || !runData.runTime;

  const cycles = React.useMemo(() => {
    if (isUnavailable || !runData?.runTime) return null;

    const d = new Date(runData.runTime);
    if (isNaN(d.getTime())) return null;

    const currentHour = d.getUTCHours();
    const currentCycle = `${String(currentHour).padStart(2, '0')} UTC`;
    const prevCycle1 = `${String((currentHour + 18) % 24).padStart(2, '0')} UTC`;
    const prevCycle2 = `${String((currentHour + 12) % 24).padStart(2, '0')} UTC`;

    return [
      { label: currentCycle, status: 'Current Run', isCurrent: true },
      { label: prevCycle1, status: 'Previous Cycle', isCurrent: false },
      { label: prevCycle2, status: 'Previous Cycle', isCurrent: false },
    ];
  }, [runData, isUnavailable]);

  return (
    <DataPanel className="flex flex-col gap-3 w-full">
      <SectionHeading
        title={`Model Run History — ${modelId} Synoptic Cycles`}
        subtitle="Operational initialization cadence (00Z / 06Z / 12Z / 18Z)"
        icon={<History className="w-4 h-4" />}
      />

      {!cycles ? (
        <UnavailableState
          title={`${modelId} Run History Unavailable`}
          reason={`No active synoptic initialization timestamp is currently available for ${modelId}.`}
        />
      ) : (
        <div className="m-panel-inset p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {cycles.map((c, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center text-center gap-1.5 min-w-[110px]">
                <span className={`text-xs font-mono font-bold tabular-nums ${c.isCurrent ? 'text-[var(--m-text-primary)]' : 'text-[var(--m-text-muted)]'}`}>
                  {c.label}
                </span>

                <div className="relative flex items-center justify-center my-1">
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      c.isCurrent
                        ? 'bg-[var(--m-accent)] border-[var(--m-accent)] ring-4 ring-[var(--m-focus)]/25'
                        : 'bg-[var(--m-surface-1)] border-[var(--m-border)]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.isCurrent ? 'bg-white' : 'bg-[var(--m-text-muted)]'}`} />
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    c.isCurrent
                      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] font-semibold border-[var(--m-ok)]/35'
                      : 'text-[var(--m-text-muted)] bg-[var(--m-surface-1)] border-[var(--m-border)]'
                  }`}
                >
                  {c.status}
                </span>
              </div>

              {i < cycles.length - 1 && (
                <div className="hidden sm:block flex-1 h-px bg-[var(--m-surface-2)]" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--m-text-muted)]">
        Numerical prediction models re-initialize every 6 or 12 hours using fresh satellite, radiosonde, and surface observations.
      </p>
    </DataPanel>
  );
};
