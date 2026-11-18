import React from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { WarningRecord } from '../../types/warningTypes';
import { WarningCard } from './WarningCard';
import { LocationRecord } from '../../types';
import { DataPanel, UnavailableState } from '../ui/ObservatoryPrimitives';

interface WarningListProps {
  warnings: WarningRecord[];
  onViewDetails: (warning: WarningRecord) => void;
  onViewOnMap: (warning: WarningRecord) => void;
  onResetFilters: () => void;
  selectedLocation?: LocationRecord;
  isUnavailable?: boolean;
  onRetry?: () => void;
}

export const WarningList: React.FC<WarningListProps> = ({
  warnings,
  onViewDetails,
  onViewOnMap,
  onResetFilters,
  selectedLocation,
  isUnavailable = false,
  onRetry,
}) => {
  if (isUnavailable) {
    return (
      <UnavailableState
        title="Active warning bulletins unavailable"
        reason="The SACHET / NDMA CAP feed could not be reached. Individual bulletins cannot be verified until upstream connectivity is restored."
        source="NDMA SACHET CAP RSS"
        onRetry={onRetry}
        retryLabel="Retry Feed Sync"
      />
    );
  }

  if (warnings.length === 0) {
    return (
      <DataPanel
        id="warning-list-empty-state"
        className="py-10 px-6 text-center flex flex-col items-center justify-center gap-3 w-full"
      >
        <div className="w-11 h-11 rounded-xl bg-[#08131F] border border-[#22C7A0]/35 flex items-center justify-center text-[#6EE7B7]">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-[#F3F6FA] tracking-tight">
          No Warnings Match Current Filter Criteria
        </h3>

        <p className="text-xs text-[#B5C3D1] max-w-md leading-relaxed">
          No active meteorological warnings match the selected state, region, or hazard parameters.
        </p>

        <button
          id="btn-empty-reset-filters"
          type="button"
          onClick={onResetFilters}
          className="mt-1 px-4 py-2 min-h-[40px] rounded-lg bg-[#0B72B9] hover:bg-[#095C96] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 m-focus-ring"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Filters</span>
        </button>
      </DataPanel>
    );
  }

  return (
    <div
      id="national-warning-bulletins-grid"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch w-full min-w-0"
    >
      {warnings.map((warning) => {
        const isLocTarget =
          selectedLocation &&
          (warning.state.toLowerCase() === (selectedLocation.state || '').toLowerCase() ||
            warning.affectedDistricts.some(
              (d) =>
                d.toLowerCase() === (selectedLocation.district || '').toLowerCase() ||
                d.toLowerCase() === (selectedLocation.city || '').toLowerCase()
            ));

        return (
          <div key={warning.id} className="w-full flex flex-col">
            <WarningCard
              warning={warning}
              onViewDetails={onViewDetails}
              onViewOnMap={onViewOnMap}
              isLocationTarget={Boolean(isLocTarget)}
            />
          </div>
        );
      })}
    </div>
  );
};
