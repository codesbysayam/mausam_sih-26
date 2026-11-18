import React from 'react';
import { RefreshCw } from 'lucide-react';
import { formatIndianDateTime } from '../../utils/dateUtils';
import { AudioAlertToggle } from '../common/AudioAlertToggle';
import { PageHeader, ProvenanceStatus } from '../ui/ObservatoryPrimitives';

interface WarningHeaderProps {
  lastUpdated?: string;
  onRefresh: () => void;
  isLoading?: boolean;
  source?: string;
  status?: ProvenanceStatus;
  coordinates?: string;
}

export const WarningHeader: React.FC<WarningHeaderProps> = ({
  lastUpdated,
  onRefresh,
  isLoading = false,
  source = 'NDMA SACHET CAP · IMD',
  status = 'RECENT',
  coordinates,
}) => {
  const displayTimestamp = lastUpdated || formatIndianDateTime(new Date());

  return (
    <PageHeader
      id="warning-page-official-header"
      eyebrow="NDMA SACHET · IMD SYNOPTIC ALERT DIVISION"
      title="National Weather Warning Bulletin"
      description="Official CAP disaster bulletins, district-level severe weather warnings, and public safety advisories across India."
      coordinates={coordinates}
      status={status}
      source={source}
      updatedAt={displayTimestamp}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AudioAlertToggle variant="header" />
          <button
            id="btn-refresh-warning-telemetry"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh National Warning Feed"
            aria-label="Refresh warning data"
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[42px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 m-focus-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#35C7E8] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing' : 'Refresh Feed'}</span>
          </button>
        </div>
      }
    />
  );
};
