import React from 'react';

export interface EditorialPageHeaderProps {
  eyebrow?: string;
  title: string;
  summary?: string;
  source?: string;
  /** True when the underlying data is from a numerical model grid (e.g., Open-Meteo) */
  isModelData?: boolean;
  /** True when the underlying data is an actual surface station observation */
  isStationObservation?: boolean;
  /** Formatted valid time for model data */
  validAt?: string | null;
  /** ISO datetime attribute for model valid time */
  validAtIso?: string | null;
  /** Formatted observation time for station observations */
  observedAt?: string | null;
  /** ISO datetime attribute for observation time */
  observedAtIso?: string | null;
  /** Formatted request retrieval timestamp */
  fetchedAt?: string | null;
  /** ISO datetime attribute for retrieval time */
  fetchedAtIso?: string | null;
  statusNote?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const EditorialPageHeader: React.FC<EditorialPageHeaderProps> = ({
  eyebrow,
  title,
  summary,
  source,
  isModelData = false,
  isStationObservation = false,
  validAt,
  validAtIso,
  observedAt,
  observedAtIso,
  fetchedAt,
  fetchedAtIso,
  statusNote,
  actions,
  className = '',
}) => {
  const showModelTime = isModelData || (!isStationObservation && Boolean(validAt));
  const showStationTime = isStationObservation && Boolean(observedAt);
  const effectiveValidTime = validAt ?? (isModelData ? observedAt : null);

  return (
    <header className={`editorial-page-header ${className}`.trim()}>
      <div className="editorial-page-header__top">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="mausam-eyebrow">{eyebrow}</p>}
          <h1 className="editorial-page-header__title">{title}</h1>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>

      {summary && <p className="editorial-page-header__summary">{summary}</p>}

      {(source || effectiveValidTime || observedAt || fetchedAt || statusNote) && (
        <div className="editorial-page-header__meta data-provenance">
          {source && <span>Source: {source}</span>}

          {showModelTime && (
            effectiveValidTime ? (
              <time dateTime={validAtIso ?? undefined}>Model valid: {effectiveValidTime}</time>
            ) : (
              <span>Valid time unavailable</span>
            )
          )}

          {showStationTime && observedAt && (
            <time dateTime={observedAtIso ?? undefined}>Observed: {observedAt}</time>
          )}

          {!showModelTime && !showStationTime && observedAt && (
            <time dateTime={observedAtIso ?? undefined}>Valid: {observedAt}</time>
          )}

          {fetchedAt && (
            <time dateTime={fetchedAtIso ?? undefined}>Retrieved: {fetchedAt}</time>
          )}

          {statusNote && <span>{statusNote}</span>}
        </div>
      )}
    </header>
  );
};

export default EditorialPageHeader;
