import React from 'react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelRun } from '../../types/nwp';
import { History, CheckCircle, Clock } from 'lucide-react';

interface ModelRunHistoryProps {
  modelId: NWPModelId;
  runData?: NWPModelRun;
}

export const ModelRunHistory: React.FC<ModelRunHistoryProps> = ({
  modelId,
  runData,
}) => {
  const isUnavailable = !runData || runData.status === 'UNAVAILABLE';

  // Compute synoptic cycles based on current runTime
  const cycles = React.useMemo(() => {
    if (isUnavailable || !runData?.runTime) {
      return [
        { label: '12 UTC', status: 'Unconfigured', isCurrent: false },
        { label: '06 UTC', status: 'Unconfigured', isCurrent: false },
        { label: '00 UTC', status: 'Unconfigured', isCurrent: false },
      ];
    }

    try {
      const d = new Date(runData.runTime);
      const currentHour = d.getUTCHours();
      const currentCycle = `${String(currentHour).padStart(2, '0')} UTC`;

      // Previous synoptic cycle 6 or 12 hours earlier
      const prevHour1 = (currentHour + 18) % 24;
      const prevCycle1 = `${String(prevHour1).padStart(2, '0')} UTC`;

      const prevHour2 = (currentHour + 12) % 24;
      const prevCycle2 = `${String(prevHour2).padStart(2, '0')} UTC`;

      return [
        { label: currentCycle, status: 'Current Active Run', isCurrent: true, date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) },
        { label: prevCycle1, status: 'Archived Cycle', isCurrent: false },
        { label: prevCycle2, status: 'Archived Cycle', isCurrent: false },
      ];
    } catch {
      return [
        { label: '12 UTC', status: 'Active Run', isCurrent: true },
        { label: '06 UTC', status: 'Previous', isCurrent: false },
        { label: '00 UTC', status: 'Previous', isCurrent: false },
      ];
    }
  }, [runData, isUnavailable]);

  return (
    <div className="nwp-card flex flex-col gap-3 rounded-2xl p-4 sm:p-5 shadow-md w-full">
      <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#29B6F6]" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
            Model Run History — {modelId} Synoptic Cycles
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#AFC4D8]">
          Operational Cycle Cadence
        </span>
      </div>

      <div className="p-4 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col sm:flex-row items-center justify-between gap-4">
        {cycles.map((c, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center text-center gap-1.5 min-w-[100px]">
              <span className={`text-xs font-mono font-bold ${c.isCurrent ? 'text-white' : 'text-[#AFC4D8]'}`}>
                {c.label}
              </span>

              {/* Node indicator */}
              <div className="relative flex items-center justify-center my-1">
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    c.isCurrent
                      ? 'bg-[#1565C0] border-[#29B6F6] ring-4 ring-[#1565C0]/30'
                      : 'bg-[#0B263D] border-[#1D5278]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${c.isCurrent ? 'bg-white' : 'bg-slate-500'}`} />
                </span>
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  c.isCurrent
                    ? 'bg-[#00E676]/15 text-[#00E676] font-semibold border border-[#00E676]/30'
                    : 'text-slate-400 bg-[#0B263D]'
                }`}
              >
                {c.isCurrent ? 'Current Run' : 'Previous Cycle'}
              </span>
            </div>

            {i < cycles.length - 1 && (
              <div className="hidden sm:block flex-1 h-0.5 bg-gradient-to-r from-[#1D5278] to-[#1D5278]/40" />
            )}
          </React.Fragment>
        ))}
      </div>

      <p className="text-[11px] text-[#AFC4D8] font-sans">
        Numerical prediction models are re-initialized every 6 or 12 hours with fresh satellite, radiosonde, and surface station data to minimize cumulative model drift.
      </p>
    </div>
  );
};
