import React from 'react';
import { MeteorologicalPublication } from '../../data/reportsAndArticles';
import { Bookmark, ArrowRight, Sparkles, BarChart2, Calendar, Clock } from 'lucide-react';
import { DataPanel } from '../ui/ObservatoryPrimitives';
import { getCategoryTheme, estimateReadingTime } from './reportUtils';

interface FeaturedReportCardProps {
  publication: MeteorologicalPublication;
  onOpenReport: (pub: MeteorologicalPublication) => void;
  onBookmark: (id: string) => void;
  isSaved: boolean;
}

export const FeaturedReportCard: React.FC<FeaturedReportCardProps> = ({
  publication,
  onOpenReport,
  onBookmark,
  isSaved,
}) => {
  const theme = getCategoryTheme(publication);
  const readingTime = estimateReadingTime(publication);

  return (
    <DataPanel
      id="featured-report-card"
      variant="surface-1"
      className="border-[var(--m-accent)]/35 p-5 sm:p-7"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-3xl space-y-3.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/40 text-[var(--m-accent)] text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Featured Publication
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
            >
              {publication.type}
            </span>

            <span className="text-xs text-[var(--m-text-muted)] font-mono tabular-nums">
              Doc ID: {publication.documentNumber}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-[var(--m-text-primary)] tracking-tight leading-snug">
            <button
              type="button"
              onClick={() => onOpenReport(publication)}
              className="text-left hover:text-[var(--m-accent)] transition-colors cursor-pointer"
            >
              {publication.title}
            </button>
          </h3>

          <p className="text-xs sm:text-sm text-[var(--m-text-secondary)] leading-relaxed line-clamp-3">
            {publication.abstract}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-[var(--m-text-secondary)] font-mono tabular-nums">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>{publication.date}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              <BarChart2 className="w-3.5 h-3.5 text-[var(--m-ok)]" />
              <span>{publication.category}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              <Clock className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>{readingTime}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-row lg:flex-col items-stretch lg:items-end justify-between sm:justify-start gap-2.5 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-[var(--m-border)]">
          <button
            type="button"
            onClick={() => onOpenReport(publication)}
            className="min-h-[44px] sm:min-h-[40px] px-5 py-2.5 rounded-lg bg-[var(--m-accent)] hover:bg-[#35C7E8] text-white hover:text-[#07111D] font-bold text-xs font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer m-focus-ring"
          >
            <span>Read Full Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onBookmark(publication.id)}
            className={`min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-mono transition-colors border flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring ${
              isSaved
                ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/40'
                : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
            }`}
            title={isSaved ? 'Remove Bookmark' : 'Save Report'}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#F59E0B]' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>
    </DataPanel>
  );
};
