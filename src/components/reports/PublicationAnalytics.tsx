import React, { useMemo } from 'react';
import { MeteorologicalPublication } from '../../data/reportsAndArticles';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

interface PublicationAnalyticsProps {
  publications: MeteorologicalPublication[];
}

const MONTHS: Array<{ key: string; short: string; full: string; matchers: string[] }> = [
  { key: 'Jan', short: 'Jan', full: 'January', matchers: ['january', ' jan '] },
  { key: 'Feb', short: 'Feb', full: 'February', matchers: ['february', ' feb '] },
  { key: 'Mar', short: 'Mar', full: 'March', matchers: ['march', ' mar '] },
  { key: 'Apr', short: 'Apr', full: 'April', matchers: ['april', ' apr '] },
  { key: 'May', short: 'May', full: 'May', matchers: ['may'] },
  { key: 'Jun', short: 'Jun', full: 'June', matchers: ['june', ' jun '] },
  { key: 'Jul', short: 'Jul', full: 'July', matchers: ['july', ' jul '] },
  { key: 'Aug', short: 'Aug', full: 'August', matchers: ['august', ' aug '] },
  { key: 'Sep', short: 'Sep', full: 'September', matchers: ['september', ' sep '] },
  { key: 'Oct', short: 'Oct', full: 'October', matchers: ['october', ' oct '] },
  { key: 'Nov', short: 'Nov', full: 'November', matchers: ['november', ' nov '] },
  { key: 'Dec', short: 'Dec', full: 'December', matchers: ['december', ' dec '] },
];

export const PublicationAnalytics: React.FC<PublicationAnalyticsProps> = ({ publications }) => {
  const { monthlyData, peakMonth, categoryData, totalCount } = useMemo(() => {
    const countsByMonth = MONTHS.map((m) => {
      const count = publications.filter((p) => {
        const lower = ` ${p.date.toLowerCase()} `;
        return m.matchers.some((token) => lower.includes(token));
      }).length;
      return {
        month: m.short,
        count,
        full: m.full,
      };
    });

    // Keep Jan–Aug visible at minimum, plus any Sep–Dec that have entries
    const activeMonths = countsByMonth.filter((m, idx) => idx <= 7 || m.count > 0);
    const peak = activeMonths.reduce(
      (best, cur) => (cur.count > best.count ? cur : best),
      activeMonths[0] || { month: '—', count: 0, full: '—' }
    );

    const researchMonographs = publications.filter(
      (p) =>
        p.category === 'Scientific Monograph' ||
        p.type === 'Research Article' ||
        p.type === 'Technical Monograph'
    ).length;

    const officialBulletins = publications.filter(
      (p) =>
        p.category === 'National Weather Observation' ||
        p.category === 'Sub-Divisional Report' ||
        p.category === 'Agricultural Meteorology'
    ).length;

    const climatologicalStudies = publications.filter(
      (p) => p.category === 'Climatological Study'
    ).length;

    const environmentalAndCyclone = Math.max(
      0,
      publications.length - researchMonographs - officialBulletins - climatologicalStudies
    );

    const categories = [
      { name: 'Research Monographs', count: researchMonographs, color: '#35C7E8' },
      { name: 'Official Bulletins', count: officialBulletins, color: '#22C7A0' },
      { name: 'Climatological Studies', count: climatologicalStudies, color: '#F59E0B' },
      { name: 'Environmental & Technical', count: environmentalAndCyclone, color: '#0B72B9' },
    ];

    return {
      monthlyData: activeMonths,
      peakMonth: peak,
      categoryData: categories,
      totalCount: Math.max(1, publications.length),
    };
  }, [publications]);

  return (
    <DataPanel id="publication-analytics-section" className="space-y-5">
      <SectionHeading
        title="Publication Activity & Research Distribution"
        subtitle="Dynamically indexed issuance counts across active meteorological cycles and disciplines"
        icon={<BarChart3 className="w-4 h-4" />}
        badge={
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[#35C7E8] tabular-nums">
            {publications.length} Indexed
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Monthly Issuance Activity Bar Chart */}
        <div className="lg:col-span-2 m-panel-inset p-4">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-[#F3F6FA] uppercase tracking-wider">
              Monthly Publication Volume
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[#35C7E8] bg-[#35C7E8]/12 px-2.5 py-0.5 rounded border border-[#35C7E8]/30">
              Peak: {peakMonth.full} ({peakMonth.count}{' '}
              {peakMonth.count === 1 ? 'Report' : 'Reports'})
            </span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  stroke="#8295A8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#26394B' }}
                />
                <YAxis
                  stroke="#8295A8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#26394B' }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0B1927] border border-[#35C7E8]/40 p-2.5 rounded-lg text-xs font-mono tabular-nums shadow-xl">
                          <p className="text-[#F3F6FA] font-bold">{data.full}</p>
                          <p className="text-[#35C7E8] mt-1">{data.count} Publications Issued</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.month === peakMonth.month && entry.count > 0
                          ? '#35C7E8'
                          : entry.count > 0
                          ? '#0B72B9'
                          : '#172A3B'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Domain Breakdown Distribution */}
        <div className="m-panel-inset p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-bold text-[#F3F6FA] uppercase tracking-wider block mb-3.5">
              Domain Classification
            </span>

            <div className="space-y-3">
              {categoryData.map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-[#B5C3D1] truncate">{item.name}</span>
                    <span className="text-[#F3F6FA] font-bold">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#172A3B] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round((item.count / totalCount) * 100)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#26394B] text-[11px] font-mono text-[#8295A8] flex items-center justify-between">
            <span>Primary Focus</span>
            <span className="text-[#35C7E8] font-bold">Atmospheric &amp; Synoptic</span>
          </div>
        </div>
      </div>
    </DataPanel>
  );
};
