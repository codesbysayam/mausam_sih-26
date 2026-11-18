import React from 'react';
import { MeteorologicalPublication } from '../../data/reportsAndArticles';
import { History } from 'lucide-react';
import { getCategoryTheme } from './reportUtils';

interface RecentlyViewedReportsProps {
  recentIds: string[];
  allPublications: MeteorologicalPublication[];
  onOpenReport: (pub: MeteorologicalPublication) => void;
  onClear: () => void;
}

export const RecentlyViewedReports: React.FC<RecentlyViewedReportsProps> = ({
  recentIds,
  allPublications,
  onOpenReport,
  onClear,
}) => {
  const recentPubs = recentIds
    .map((id) => allPublications.find((p) => p.id === id))
    .filter((p): p is MeteorologicalPublication => Boolean(p));

  if (recentPubs.length === 0) return null;

  return (
    <div
      id="recently-viewed-reports-strip"
      className="m-panel-inset p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 text-xs font-mono text-[#8295A8] shrink-0">
        <History className="w-3.5 h-3.5 text-[#35C7E8]" />
        <span className="font-bold uppercase text-[#F3F6FA]">Recently Viewed:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-none">
        {recentPubs.map((pub) => {
          const theme = getCategoryTheme(pub);
          return (
            <button
              key={pub.id}
              type="button"
              onClick={() => onOpenReport(pub)}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#0B1927] hover:bg-[#101F2E] border border-[#26394B] hover:border-[#35C7E8]/50 text-xs font-mono text-[#B5C3D1] hover:text-[#F3F6FA] transition-colors flex items-center gap-2 shrink-0 cursor-pointer max-w-[240px] m-focus-ring"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: theme.accentColor }}
              />
              <span className="truncate">{pub.title}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="min-h-[36px] px-2 text-[11px] font-mono text-[#8295A8] hover:text-[#F3F6FA] shrink-0 cursor-pointer hover:underline self-end sm:self-center"
        title="Clear recent history"
      >
        Clear
      </button>
    </div>
  );
};
