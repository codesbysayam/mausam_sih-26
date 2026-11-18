import React from 'react';
import { MeteorologicalPublication } from '../../data/reportsAndArticles';
import { Sparkles, ArrowRight, Bookmark, Eye } from 'lucide-react';
import { DataPanel } from '../ui/ObservatoryPrimitives';
import { estimateReadingTime } from './reportUtils';

interface ReportOfTheDayProps {
  publication: MeteorologicalPublication;
  onOpenReport: (pub: MeteorologicalPublication) => void;
  onBookmark: (id: string) => void;
  isSaved: boolean;
}

export const ReportOfTheDay: React.FC<ReportOfTheDayProps> = ({
  publication,
  onOpenReport,
  onBookmark,
  isSaved,
}) => {
  const readingTime = estimateReadingTime(publication);

  return (
    <DataPanel id="report-of-the-day" variant="surface-2" className="p-5 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-3 max-w-3xl min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F59E0B]/12 border border-[#F59E0B]/35 text-[#FCD34D] text-[10px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              Report of the Day · Editorial Spotlight
            </span>
            <span className="text-[11px] font-mono text-[#B5C3D1] tabular-nums">
              {publication.date}
            </span>
            <span className="text-[11px] font-mono text-[#35C7E8] tabular-nums">
              · {readingTime}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-[#F3F6FA] tracking-tight leading-snug">
            <button
              type="button"
              onClick={() => onOpenReport(publication)}
              className="text-left hover:text-[#35C7E8] transition-colors cursor-pointer"
            >
              {publication.title}
            </button>
          </h2>

          <div className="m-panel-inset p-3.5 text-xs leading-relaxed text-[#B5C3D1]">
            <span className="text-[#35C7E8] font-bold font-mono uppercase text-[10px] block mb-1 tracking-wider">
              Operational &amp; Research Relevance
            </span>
            <p className="line-clamp-3">{publication.abstract}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[#8295A8] tabular-nums">
            <span>
              Issuing Authority:{' '}
              <strong className="text-[#F3F6FA]">{publication.issuingAuthority}</strong>
            </span>
            <span>
              Ref: <strong className="text-[#35C7E8]">{publication.documentNumber}</strong>
            </span>
          </div>
        </div>

        {/* Action button cluster */}
        <div className="flex flex-row md:flex-col items-stretch md:items-end justify-between sm:justify-start gap-2.5 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-[#26394B]">
          <button
            type="button"
            onClick={() => onOpenReport(publication)}
            className="min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-lg bg-[#0B72B9] hover:bg-[#35C7E8] text-white hover:text-[#07111D] font-bold text-xs font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer m-focus-ring"
          >
            <Eye className="w-4 h-4" />
            <span>Explore Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onBookmark(publication.id)}
            className={`min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-center gap-1.5 border cursor-pointer m-focus-ring ${
              isSaved
                ? 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40'
                : 'bg-[#08131F] text-[#B5C3D1] hover:text-[#F3F6FA] border-[#26394B] hover:border-[#38536A]'
            }`}
            title="Bookmark Report"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#F59E0B]' : ''}`} />
            <span>{isSaved ? 'Saved in Library' : 'Save to Library'}</span>
          </button>
        </div>
      </div>
    </DataPanel>
  );
};
