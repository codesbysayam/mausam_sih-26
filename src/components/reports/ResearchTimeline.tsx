import React, { useState, useMemo } from 'react';
import { MeteorologicalPublication } from '../../data/reportsAndArticles';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';
import { getCategoryTheme } from './reportUtils';

interface ResearchTimelineProps {
  publications: MeteorologicalPublication[];
  onOpenReport: (pub: MeteorologicalPublication) => void;
}

interface TimelineGroup {
  period: string;
  count: number;
  items: MeteorologicalPublication[];
}

export const ResearchTimeline: React.FC<ResearchTimelineProps> = ({
  publications,
  onOpenReport,
}) => {
  const timelineGroups: TimelineGroup[] = useMemo(() => {
    const monthDefs = [
      { period: 'CURRENT / AUG 2026', tokens: ['august', 'aug'] },
      { period: 'JUL 2026', tokens: ['july', 'jul'] },
      { period: 'JUN 2026', tokens: ['june', 'jun'] },
      { period: 'MAY 2026', tokens: ['may'] },
      { period: '2025–2026 ARCHIVE', tokens: ['2025'] },
    ];

    const matchedIds = new Set<string>();
    const groups: TimelineGroup[] = monthDefs
      .map((def) => {
        const items = publications.filter((p) => {
          const lower = p.date.toLowerCase();
          const matches = def.tokens.some((t) => lower.includes(t));
          if (matches) matchedIds.add(p.id);
          return matches;
        });
        return {
          period: def.period,
          count: items.length,
          items,
        };
      })
      .filter((g) => g.items.length > 0);

    const remaining = publications.filter((p) => !matchedIds.has(p.id));
    if (remaining.length > 0) {
      groups.unshift({
        period: 'LATEST LIVE SYNTHESIS',
        count: remaining.length,
        items: remaining,
      });
    }

    return groups;
  }, [publications]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const activeGroup =
    timelineGroups.find((g) => g.period === selectedPeriod) || timelineGroups[0];

  if (!activeGroup) return null;

  return (
    <DataPanel id="meteorological-research-timeline" className="space-y-5">
      <SectionHeading
        title="Meteorological Research Timeline"
        subtitle="Chronological index of operational weather bulletins and research releases"
        icon={<Clock className="w-4 h-4" />}
        action={
          <div className="text-xs font-mono text-[#8295A8] flex items-center gap-2 tabular-nums">
            <span>Active Epoch:</span>
            <span className="px-2.5 py-1 rounded-md bg-[#08131F] text-[#35C7E8] border border-[#26394B] font-bold">
              {activeGroup.period} ({activeGroup.items.length})
            </span>
          </div>
        }
      />

      {/* Horizontal Timeline Period Switcher */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-3 scrollbar-none border-b border-[#26394B]">
        {timelineGroups.map((group) => {
          const isSelected = activeGroup.period === group.period;
          return (
            <button
              key={group.period}
              type="button"
              onClick={() => setSelectedPeriod(group.period)}
              className={`min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-colors shrink-0 flex items-center gap-2 cursor-pointer m-focus-ring tabular-nums ${
                isSelected
                  ? 'bg-[#0B72B9] text-white border border-[#35C7E8]/50'
                  : 'bg-[#08131F] text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A] border border-[#26394B]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{group.period}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  isSelected ? 'bg-black/25 text-white' : 'bg-[#101F2E] text-[#8295A8]'
                }`}
              >
                {group.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Period Publications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {activeGroup.items.map((pub) => {
          const theme = getCategoryTheme(pub);
          return (
            <button
              key={pub.id}
              type="button"
              onClick={() => onOpenReport(pub)}
              className="text-left p-4 rounded-xl bg-[#08131F] border border-[#26394B] hover:border-[#35C7E8]/50 transition-colors flex flex-col justify-between cursor-pointer group m-focus-ring"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                  >
                    {theme.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#8295A8] tabular-nums shrink-0">
                    {pub.date}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-[#F3F6FA] group-hover:text-[#35C7E8] transition-colors line-clamp-2 leading-snug">
                  {pub.title}
                </h4>

                <p className="text-xs text-[#B5C3D1] mt-2 line-clamp-2 leading-relaxed">
                  {pub.abstract}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#26394B] flex items-center justify-between text-xs text-[#8295A8] w-full">
                <span className="font-mono text-[11px] truncate max-w-[170px]">
                  {pub.author}
                </span>
                <span className="text-[#35C7E8] flex items-center gap-1 font-mono font-bold text-[11px] shrink-0">
                  <span>READ</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </DataPanel>
  );
};
