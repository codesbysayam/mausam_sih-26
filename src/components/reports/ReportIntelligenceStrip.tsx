import React, { useMemo } from 'react';
import { Calendar, TrendingUp, Radio, Sparkles, Layers } from 'lucide-react';
import { MeteorologicalPublication } from '../../data/reportsAndArticles';

interface ReportIntelligenceStripProps {
  publications?: MeteorologicalPublication[];
}

export const ReportIntelligenceStrip: React.FC<ReportIntelligenceStripProps> = ({
  publications = [],
}) => {
  const summary = useMemo(() => {
    if (publications.length === 0) {
      return {
        latestCycle: '2026 Cycle',
        topDomain: 'Scientific Monographs',
        latestBulletin: 'All-India Synoptic',
      };
    }

    const sortedByDate = [...publications].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestPub = sortedByDate[0];

    const categoryCounts = new Map<MeteorologicalPublication['category'], number>();
    for (const p of publications) {
      categoryCounts.set(p.category, (categoryCounts.get(p.category) || 0) + 1);
    }
    let topDomain: MeteorologicalPublication['category'] = publications[0].category;
    let topCount = 0;
    categoryCounts.forEach((cnt, cat) => {
      if (cnt > topCount) {
        topCount = cnt;
        topDomain = cat;
      }
    });

    const latestBulletinPub =
      sortedByDate.find((p) => p.type === 'PDF Bulletin' || p.type === 'GKMS Bulletin') ||
      latestPub;

    return {
      latestCycle: latestPub?.date || 'Current Cycle',
      topDomain,
      latestBulletin: latestBulletinPub?.title.split('—')[0].trim() || 'Synoptic Bulletin',
    };
  }, [publications]);

  const items = [
    {
      label: 'LATEST RELEASE',
      value: summary.latestCycle,
      icon: Calendar,
      accent: 'text-[var(--m-accent)]',
    },
    {
      label: 'MOST ACTIVE DOMAIN',
      value: summary.topDomain,
      icon: TrendingUp,
      accent: 'text-[var(--m-accent)]',
    },
    {
      label: 'LATEST BULLETIN',
      value: summary.latestBulletin,
      icon: Radio,
      accent: 'text-[var(--m-ok)]',
    },
    {
      label: 'CORE RESEARCH FOCUS',
      value: 'Monsoon & Convection',
      icon: Sparkles,
      accent: 'text-[var(--m-watch)]',
    },
    {
      label: 'ARCHIVE PROVIDERS',
      value: 'IMD · CPCB · ISRO · NCMRWF',
      icon: Layers,
      accent: 'text-[var(--m-accent)]',
      spanFull: true,
    },
  ];

  return (
    <div
      id="reports-intelligence-strip"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`${
              item.spanFull ? 'col-span-2 md:col-span-1 lg:col-span-1' : ''
            } m-panel p-3.5 flex items-center gap-3 hover:border-[var(--m-border-strong)] transition-colors`}
          >
            <div
              className={`w-9 h-9 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center ${item.accent} shrink-0`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase font-semibold text-[var(--m-text-muted)] block tracking-wider truncate">
                {item.label}
              </span>
              <strong className="text-xs font-semibold text-[var(--m-text-primary)] block truncate font-mono tabular-nums">
                {item.value}
              </strong>
            </div>
          </div>
        );
      })}
    </div>
  );
};
