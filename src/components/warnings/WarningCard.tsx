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
          border: 'border-[var(--m-danger)]/45',
          badge: 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/40',
          label: 'RED ALERT',
        };
      case 'orange':
        return {
          border: 'border-[var(--m-alert)]/45',
          badge: 'bg-[var(--m-alert-soft)] text-[var(--m-alert)] border-[var(--m-alert)]/40',
          label: 'ORANGE ALERT',
        };
      case 'yellow':
        return {
          border: 'border-[var(--m-watch)]/45',
          badge: 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/40',
          label: 'YELLOW WATCH',
        };
      case 'purple':
        return {
          border: 'border-[var(--m-accent)]/45',
          badge: 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/40',
          label: 'ADVISORY',
        };
      default:
        return {
          border: 'border-[var(--m-ok)]/40',
          badge: 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35',
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
      className={`m-panel p-5 flex flex-col min-w-0 h-full transition-colors hover:border-[var(--m-border-strong)] ${theme.border}`}
    >
      <header className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--m-border)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-tight truncate">
              {warning.state}
            </h4>
            <span className="text-xs text-[var(--m-text-muted)] font-mono truncate">
              · {warning.subdivision}
            </span>
          </div>
          {isLocationTarget && (
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35">
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
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--m-accent)] uppercase tracking-wider">
          {renderHazardIcon(warning.hazardIcon, 'w-4 h-4 shrink-0')}
          <span>{warning.hazardLabel}</span>
        </div>

        <h3 className="mt-2 text-sm sm:text-base font-bold text-[var(--m-text-primary)] tracking-tight leading-snug">
          {warning.title}
        </h3>

        <div className="mt-3 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-3 text-xs font-mono tabular-nums grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
          <span className="text-[var(--m-text-muted)] whitespace-nowrap">Bulletin No.</span>
          <span className="text-[var(--m-text-primary)] font-semibold text-right break-words min-w-0" title={warning.bulletinNo}>
            {warning.bulletinNo}
          </span>

          <span className="text-[var(--m-text-muted)] whitespace-nowrap">Issued At</span>
          <span className="text-[var(--m-text-primary)] font-semibold text-right break-words min-w-0">
            {warning.issuedAt}
          </span>

          <span className="text-[var(--m-text-muted)] whitespace-nowrap">Valid Until</span>
          <span className="text-[var(--m-text-primary)] font-semibold text-right break-words min-w-0">
            {warning.validUntil}
          </span>
        </div>

        <div className="mt-3">
          <div className="text-[10px] font-mono font-semibold text-[var(--m-text-muted)] uppercase tracking-wider mb-1.5">
            Affected Districts &amp; Zones
          </div>
          <div className="flex flex-wrap gap-1.5">
            {warning.affectedDistricts.slice(0, 4).map((dist, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[11px] text-[var(--m-text-secondary)] font-medium max-w-full truncate"
              >
                {dist}
              </span>
            ))}
            {warning.affectedDistricts.length > 4 && (
              <span className="px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[11px] text-[var(--m-text-muted)] font-mono">
                +{warning.affectedDistricts.length - 4} more
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex-1 min-w-0">
          <p className="text-xs sm:text-sm leading-relaxed text-[var(--m-text-secondary)] break-words">
            {warning.description}
          </p>
        </div>
      </div>

      <footer className="mt-4 pt-3.5 border-t border-[var(--m-border)] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <button
            id={`btn-map-focus-${warning.id}`}
            type="button"
            onClick={() => onViewOnMap(warning)}
            className="h-[42px] w-[42px] rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title="Focus Subdivision on Map"
            aria-label="Focus on Map"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <button
            id={`btn-share-warning-${warning.id}`}
            type="button"
            onClick={handleShare}
            className="h-[42px] w-[42px] rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title={copied ? 'Copied Alert to Clipboard' : 'Copy Official Bulletin text'}
            aria-label="Share bulletin"
          >
            {copied ? <Check className="w-4 h-4 text-[var(--m-ok)]" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>

        <button
          id={`btn-view-details-${warning.id}`}
          type="button"
          onClick={() => onViewDetails(warning)}
          className="h-[42px] px-4 rounded-lg bg-[var(--m-accent)] hover:bg-[var(--m-accent-hover)] text-[var(--m-on-accent)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 m-focus-ring"
        >
          <span>View Advisory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </footer>
    </article>
  );
};
