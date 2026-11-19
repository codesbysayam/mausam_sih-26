import React from 'react';
import { MeteorologicalPublication } from '../../data/reportsAndArticles';
import { Calendar, ArrowRight, Bookmark, Eye } from 'lucide-react';
import { getCategoryTheme, estimateReadingTime } from './reportUtils';

interface PublicationItemProps {
  publication: MeteorologicalPublication;
  viewMode: 'list' | 'grid';
  onOpenReport: (pub: MeteorologicalPublication) => void;
  onBookmark: (id: string) => void;
  isSaved: boolean;
}

export const PublicationItem: React.FC<PublicationItemProps> = ({
  publication,
  viewMode,
  onOpenReport,
  onBookmark,
  isSaved,
}) => {
  const theme = getCategoryTheme(publication);
  const readingTime = estimateReadingTime(publication);
  const Icon = theme.icon;

  if (viewMode === 'grid') {
    return (
      <article className="m-panel hover:border-[var(--m-accent)]/50 p-5 flex flex-col justify-between transition-colors group">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
              >
                <Icon className="w-3 h-3" />
                {theme.label}
              </span>
              <span className="text-[10px] font-mono text-[var(--m-text-muted)]">
                {publication.type}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBookmark(publication.id);
              }}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer m-focus-ring ${
                isSaved
                  ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/40'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
              }`}
              title={isSaved ? 'Remove from Saved' : 'Save publication'}
              aria-label={isSaved ? 'Remove from Saved' : 'Save publication'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#F59E0B]' : ''}`} />
            </button>
          </div>

          <h3 className="text-base font-bold text-[var(--m-text-primary)] leading-snug tracking-tight">
            <button
              type="button"
              onClick={() => onOpenReport(publication)}
              className="text-left hover:text-[var(--m-accent)] transition-colors cursor-pointer"
            >
              {publication.title}
            </button>
          </h3>

          <p className="text-xs text-[var(--m-text-secondary)] mt-2.5 line-clamp-3 leading-relaxed">
            {publication.abstract}
          </p>
        </div>

        <div className="mt-5 pt-3.5 border-t border-[var(--m-border)] space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--m-text-muted)] tabular-nums">
            <div className="flex items-center gap-1.5 text-[var(--m-text-secondary)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>{publication.date}</span>
            </div>
            <span className="text-[var(--m-accent)]">{readingTime}</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] font-mono text-[var(--m-text-muted)] truncate max-w-[160px]">
              {publication.issuingAuthority}
            </span>

            <button
              type="button"
              onClick={() => onOpenReport(publication)}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[var(--m-surface-2)] hover:bg-[#35C7E8] text-[var(--m-accent)] hover:text-[#07111D] border border-[var(--m-accent)]/40 text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="m-panel hover:border-[var(--m-accent)]/50 p-4 sm:p-5 transition-colors group flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border mt-0.5"
          style={{
            backgroundColor: `${theme.accentColor}15`,
            borderColor: `${theme.accentColor}35`,
            color: theme.accentColor,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
            >
              {theme.label}
            </span>

            <span className="text-[10px] font-mono text-[var(--m-text-muted)] px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)] tabular-nums">
              REF: {publication.documentNumber}
            </span>

            <span className="text-[11px] font-mono text-[var(--m-text-secondary)] tabular-nums">
              {publication.date}
            </span>

            <span className="text-[11px] font-mono text-[var(--m-accent)] tabular-nums">
              · {readingTime}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-[var(--m-text-primary)] leading-snug tracking-tight">
            <button
              type="button"
              onClick={() => onOpenReport(publication)}
              className="text-left hover:text-[var(--m-accent)] transition-colors cursor-pointer"
            >
              {publication.title}
            </button>
          </h3>

          <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed line-clamp-2">
            {publication.abstract}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[var(--m-text-muted)] pt-1">
            <span>
              Author / Directorate:{' '}
              <strong className="text-[var(--m-text-primary)]">{publication.author}</strong>
            </span>
            <span>·</span>
            <span>
              Issuing Authority:{' '}
              <strong className="text-[var(--m-text-primary)]">{publication.issuingAuthority}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-end border-[var(--m-border)]">
        <button
          type="button"
          onClick={() => onBookmark(publication.id)}
          className={`min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring ${
            isSaved
              ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/40'
              : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
          }`}
          title={isSaved ? 'Remove bookmark' : 'Bookmark publication'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#F59E0B]' : ''}`} />
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenReport(publication)}
          className="min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-lg bg-[var(--m-accent)] hover:bg-[#35C7E8] text-white hover:text-[#07111D] text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Read Report</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
};
