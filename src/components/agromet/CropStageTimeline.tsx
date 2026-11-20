import React from 'react';
import { Sprout, CheckCircle2 } from 'lucide-react';
import { PhenologicalStage, CROP_STAGES, CropType } from '../../services/agronomicEngine';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

interface CropStageTimelineProps {
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  onStageSelect: (stage: PhenologicalStage) => void;
  sowingDate?: Date;
}

export const CropStageTimeline: React.FC<CropStageTimelineProps> = ({
  selectedCrop,
  selectedStage,
  onStageSelect,
  sowingDate,
}) => {
  const currentIdx = CROP_STAGES.indexOf(selectedStage);
  const stageDurations = [7, 14, 21, 28, 21, 14, 10, 5];

  return (
    <DataPanel id="agromet-stage-timeline" className="space-y-4">
      <SectionHeading
        title="Crop Phenological Lifecycle Timeline"
        subtitle={`Interactive growth stages for ${selectedCrop}. Select a stage to recalibrate advisories.`}
        icon={<Sprout className="w-4 h-4" />}
        action={
          <div className="text-xs font-mono text-[var(--m-accent)] bg-[var(--m-surface-inset)] border border-[var(--m-border)] px-3 py-1.5 rounded-lg">
            Active Stage: <strong className="text-[var(--m-text-primary)]">{selectedStage}</strong>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {CROP_STAGES.map((stage, idx) => {
          const isSelected = stage === selectedStage;
          const isPassed = idx < currentIdx;

          let stageEstimatedDate = '';
          if (sowingDate) {
            let daysOffset = 0;
            for (let i = 0; i < idx; i++) {
              daysOffset += stageDurations[i] || 14;
            }
            const dateObj = new Date(sowingDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
            stageEstimatedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          }

          return (
            <button
              type="button"
              key={stage}
              id={`stage-step-btn-${idx}`}
              onClick={() => onStageSelect(stage)}
              aria-pressed={isSelected}
              className={`rounded-xl p-3 min-h-[76px] text-left transition-colors border flex flex-col justify-between space-y-2 cursor-pointer m-focus-ring ${
                isSelected
                  ? 'bg-[var(--m-surface-2)] border-[#22C7A0]'
                  : isPassed
                  ? 'bg-[var(--m-surface-inset)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
                  : 'bg-[var(--m-surface-inset)]/70 border-[var(--m-border)] hover:border-[var(--m-border-strong)] opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono tabular-nums font-bold w-5 h-5 rounded-md flex items-center justify-center ${
                    isSelected
                      ? 'bg-[#22C7A0] text-[var(--m-on-accent)]'
                      : isPassed
                      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)]'
                      : 'bg-[var(--m-surface-2)] text-[var(--m-text-muted)]'
                  }`}
                >
                  {idx + 1}
                </span>
                {isSelected && (
                  <span className="text-[9px] font-mono font-bold uppercase text-[var(--m-ok)] px-1.5 py-0.5 rounded bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/35">
                    Active
                  </span>
                )}
                {isPassed && !isSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--m-ok)]" />
                )}
              </div>

              <div>
                <div className={`text-xs font-mono font-bold leading-tight ${isSelected ? 'text-[var(--m-ok)]' : 'text-[var(--m-text-primary)]'}`}>
                  {stage}
                </div>
                <div className="text-[10px] font-mono text-[var(--m-text-muted)] mt-0.5 tabular-nums">
                  {stageEstimatedDate
                    ? `Est: ${stageEstimatedDate}`
                    : idx === 0
                    ? 'Start Phase'
                    : idx === 7
                    ? 'End Phase'
                    : `Phase ${idx + 1}`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </DataPanel>
  );
};
