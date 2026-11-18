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
      className="border-[#35C7E8]/35 p-5 sm:p-7"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-3xl space-y-3.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-[#35C7E8]/15 border border-[#35C7E8]/40 text-[#35C7E8] text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Featured Publication
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
            >
              {publication.type}
            </span>

            <span className="text-xs text-[#8295A8] font-mono tabular-nums">
              Doc ID: {publication.documentNumber}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-[#F3F6FA] tracking-tight leading-snug">
            <button
              type="button"
              onClick={() => onOpenReport(publication)}
              className="text-left hover:text-[#35C7E8] transition-colors cursor-pointer"
            >
              {publication.title}
            </button>
          </h3>

          <p className="text-xs sm:text-sm text-[#B5C3D1] leading-relaxed line-clamp-3">
            {publication.abstract}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-[#B5C3D1] font-mono tabular-nums">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08131F] border border-[#26394B]">
              <Calendar className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span>{publication.date}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08131F] border border-[#26394B]">
              <BarChart2 className="w-3.5 h-3.5 text-[#22C7A0]" />
              <span>{publication.category}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08131F] border border-[#26394B]">
              <Clock className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span>{readingTime}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-row lg:flex-col items-stretch lg:items-end justify-between sm:justify-start gap-2.5 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#26394B]">
          <button
            type="button"
            onClick={() => onOpenReport(publication)}
            className="min-h-[44px] sm:min-h-[40px] px-5 py-2.5 rounded-lg bg-[#0B72B9] hover:bg-[#35C7E8] text-white hover:text-[#07111D] font-bold text-xs font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer m-focus-ring"
          >
            <span>Read Full Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onBookmark(publication.id)}
            className={`min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-mono transition-colors border flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring ${
              isSaved
                ? 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40'
                : 'bg-[#08131F] text-[#B5C3D1] hover:text-[#F3F6FA] border-[#26394B] hover:border-[#38536A]'
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
