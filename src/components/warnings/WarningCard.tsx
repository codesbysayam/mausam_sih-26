import React, { useState } from 'react';
import { ArrowRight, Check, Crosshair, Share2 } from 'lucide-react';
import { WarningRecord } from '../../types/warningTypes';
import { renderHazardIcon } from './hazardIcon';

interface WarningCardProps {
  warning: WarningRecord;
  onViewDetails: (warning: WarningRecord) => void;
  onViewOnMap: (warning: WarningRecord) => void;
  isLocationTarget?: boolean;
}

export const WarningCard: React.FC<WarningCardProps> = ({
  warning,
  onViewDetails,
  onViewOnMap,
  isLocationTarget = false,
}) => {
  const [copied, setCopied] = useState(false);

  const getSeverityTheme = () => {
    switch (warning.severity) {
      case 'red':
        return {
          border: 'border-[#EF4444]/45',
          badge: 'bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/40',
          label: 'RED ALERT',
        };
      case 'orange':
        return {
          border: 'border-[#F97316]/45',
          badge: 'bg-[#F97316]/15 text-[#FDBA74] border-[#F97316]/40',
          label: 'ORANGE ALERT',
        };
      case 'yellow':
        return {
          border: 'border-[#EAB308]/45',
          badge: 'bg-[#EAB308]/15 text-[#FDE047] border-[#EAB308]/40',
          label: 'YELLOW WATCH',
        };
      case 'purple':
        return {
          border: 'border-[#35C7E8]/45',
          badge: 'bg-[#35C7E8]/15 text-[#7DD3FC] border-[#35C7E8]/40',
          label: 'ADVISORY',
        };
      default:
        return {
          border: 'border-[#22C7A0]/40',
          badge: 'bg-[#22C7A0]/15 text-[#6EE7B7] border-[#22C7A0]/35',
          label: 'GREEN CODE',
        };
    }
  };

  const theme = getSeverityTheme();

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `[IMD Weather Warning] ${warning.severity.toUpperCase()} ALERT: ${warning.title} (${warning.subdivision}, ${warning.state}). Valid until: ${warning.validUntil}. Issued by ${warning.source}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article
      id={`warning-card-${warning.id}`}
      className={`m-panel p-5 flex flex-col min-w-0 h-full transition-colors hover:border-[#38536A] ${theme.border}`}
    >
      <header className="flex items-start justify-between gap-3 pb-3 border-b border-[#26394B]">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-[#F3F6FA] uppercase tracking-tight truncate">
              {warning.state}
            </h4>
            <span className="text-xs text-[#8295A8] font-mono truncate">
              · {warning.subdivision}
            </span>
          </div>
          {isLocationTarget && (
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#0B72B9]/25 text-[#35C7E8] border border-[#35C7E8]/35">
                Selected Region
              </span>
            </div>
          )}
        </div>

        <span
          className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap ${theme.badge}`}
        >
          {theme.label}
        </span>
      </header>

      <div className="flex-1 flex flex-col min-w-0 pt-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#35C7E8] uppercase tracking-wider">
          {renderHazardIcon(warning.hazardIcon, 'w-4 h-4 shrink-0')}
          <span>{warning.hazardLabel}</span>
        </div>

        <h3 className="mt-2 text-sm sm:text-base font-bold text-[#F3F6FA] tracking-tight leading-snug">
          {warning.title}
        </h3>

        <div className="mt-3 bg-[#08131F] border border-[#26394B] rounded-lg p-3 text-xs font-mono tabular-nums grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
          <span className="text-[#8295A8] whitespace-nowrap">Bulletin No.</span>
          <span className="text-[#F3F6FA] font-semibold text-right break-words min-w-0" title={warning.bulletinNo}>
            {warning.bulletinNo}
          </span>

          <span className="text-[#8295A8] whitespace-nowrap">Issued At</span>
          <span className="text-[#F3F6FA] font-semibold text-right break-words min-w-0">
            {warning.issuedAt}
          </span>

          <span className="text-[#8295A8] whitespace-nowrap">Valid Until</span>
          <span className="text-[#F3F6FA] font-semibold text-right break-words min-w-0">
            {warning.validUntil}
          </span>
        </div>

        <div className="mt-3">
          <div className="text-[10px] font-mono font-semibold text-[#8295A8] uppercase tracking-wider mb-1.5">
            Affected Districts &amp; Zones
          </div>
          <div className="flex flex-wrap gap-1.5">
            {warning.affectedDistricts.slice(0, 4).map((dist, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[11px] text-[#B5C3D1] font-medium max-w-full truncate"
              >
                {dist}
              </span>
            ))}
            {warning.affectedDistricts.length > 4 && (
              <span className="px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[11px] text-[#8295A8] font-mono">
                +{warning.affectedDistricts.length - 4} more
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex-1 min-w-0">
          <p className="text-xs sm:text-sm leading-relaxed text-[#B5C3D1] break-words">
            {warning.description}
          </p>
        </div>
      </div>

      <footer className="mt-4 pt-3.5 border-t border-[#26394B] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <button
            id={`btn-map-focus-${warning.id}`}
            type="button"
            onClick={() => onViewOnMap(warning)}
            className="h-[42px] w-[42px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title="Focus Subdivision on Map"
            aria-label="Focus on Map"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <button
            id={`btn-share-warning-${warning.id}`}
            type="button"
            onClick={handleShare}
            className="h-[42px] w-[42px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title={copied ? 'Copied Alert to Clipboard' : 'Copy Official Bulletin text'}
            aria-label="Share bulletin"
          >
            {copied ? <Check className="w-4 h-4 text-[#6EE7B7]" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>

        <button
          id={`btn-view-details-${warning.id}`}
          type="button"
          onClick={() => onViewDetails(warning)}
          className="h-[42px] px-4 rounded-lg bg-[#0B72B9] hover:bg-[#095C96] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 m-focus-ring"
        >
          <span>View Advisory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </footer>
    </article>
  );
};
