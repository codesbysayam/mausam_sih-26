import React from 'react';
import { LocationRecord } from '../../types';
import { formatCoordinatePair } from '../../../shared/weatherContract';

interface PrintReportHeaderProps {
  reportTitle: string;
  reportSubtitle?: string;
  location: LocationRecord;
  lastUpdated?: string | Date;
}

export const PrintReportHeader: React.FC<PrintReportHeaderProps> = ({
  reportTitle,
  reportSubtitle = 'Official Indian Meteorological Department (IMD) Ground Telemetry Network',
  location,
  lastUpdated,
}) => {
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(lastUpdated instanceof Date ? lastUpdated : lastUpdated ? new Date(lastUpdated) : new Date());

  const coordsLabel = formatCoordinatePair(location.lat, location.lng, 4);

  return (
    <div
      id="mausam-official-print-bulletin-header"
      className="mausam-print-official-header hidden print:block mb-6 pb-4 border-b-2 border-[var(--m-accent)] select-none"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10pt] font-extrabold tracking-widest text-[var(--m-accent)] uppercase">
            Government of India • Ministry of Earth Sciences
          </div>
          <div className="text-[17pt] font-black tracking-tight text-[var(--m-on-accent)] uppercase leading-tight mt-0.5">
            India Meteorological Department
          </div>
          <div className="text-[12pt] font-bold text-[var(--m-accent)] uppercase tracking-wide mt-1">
            {reportTitle}
          </div>
          <div className="text-[9pt] text-[var(--m-text-muted)] mt-0.5">
            {reportSubtitle}
          </div>
        </div>

        <div className="text-right text-[8.5pt] font-mono text-[var(--m-text-muted)] border-l border-[#CBD5E1] pl-4 flex flex-col gap-0.5 shrink-0">
          <div>
            <strong className="text-[var(--m-on-accent)]">Station:</strong> {location.city}, {location.state}
          </div>
          <div>
            <strong className="text-[var(--m-on-accent)]">Coords:</strong> {coordsLabel}
          </div>
          <div>
            <strong className="text-[var(--m-on-accent)]">Station ID:</strong> {location.id || location.imdStation || 'AWS-IND-01'}
          </div>
          <div className="text-[8pt] text-[var(--m-text-muted)] mt-1 pt-1 border-t border-[#E2E8F0]">
            Generated: {formattedDate} IST
          </div>
        </div>
      </div>
    </div>
  );
};
