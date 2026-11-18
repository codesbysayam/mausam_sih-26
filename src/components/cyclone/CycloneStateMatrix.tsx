import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
} from 'lucide-react';
import { RegionalWarningStatus } from '../../types/cyclone';
import {
  DataPanel,
  SectionHeading,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface CycloneStateMatrixProps {
  regionalWarnings: RegionalWarningStatus[];
}

type FilterType = 'ALL' | 'RED' | 'ORANGE' | 'YELLOW' | 'NO_WARNING';

export const CycloneStateMatrix: React.FC<CycloneStateMatrixProps> = ({
  regionalWarnings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<FilterType>('ALL');
  const [expandedRegionCode, setExpandedRegionCode] = useState<string | null>(null);

  const counts = useMemo(() => {
    const res = {
      total: regionalWarnings.length,
      red: 0,
      orange: 0,
      yellow: 0,
      watch: 0,
      noWarning: 0,
      unavailable: 0,
    };
    regionalWarnings.forEach((r) => {
      if (r.status === 'DATA_UNAVAILABLE') {
        res.unavailable++;
      } else if (r.warningLevel === 'RED') {
        res.red++;
      } else if (r.warningLevel === 'ORANGE') {
        res.orange++;
      } else if (r.warningLevel === 'YELLOW') {
        res.yellow++;
      } else if (r.warningLevel === 'WATCH') {
        res.watch++;
      } else {
        res.noWarning++;
      }
    });
    return res;
  }, [regionalWarnings]);

  const filteredRegions = useMemo(() => {
    return regionalWarnings.filter((region) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        region.regionName.toLowerCase().includes(query) ||
        region.regionCode.toLowerCase().includes(query) ||
        region.affectedDistricts.some((d) => d.toLowerCase().includes(query)) ||
        region.hazards.some((h) => h.toLowerCase().includes(query));

      if (!matchesSearch) return false;
      if (severityFilter === 'ALL') return true;
      if (severityFilter === 'RED') return region.warningLevel === 'RED';
      if (severityFilter === 'ORANGE') return region.warningLevel === 'ORANGE';
      if (severityFilter === 'YELLOW') return region.warningLevel === 'YELLOW';
      if (severityFilter === 'NO_WARNING') {
        return (
          region.warningLevel === 'NO_WARNING' ||
          region.warningLevel === 'WATCH' ||
          region.status === 'NO_ACTIVE_WARNING'
        );
      }
      return true;
    });
  }, [regionalWarnings, searchQuery, severityFilter]);

  const renderCompactStatusBadge = (region: RegionalWarningStatus) => {
    if (region.status === 'DATA_UNAVAILABLE') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#08131F] border border-[#26394B] text-[#8295A8] text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0">
          Unavailable
        </span>
      );
    }

    switch (region.warningLevel) {
      case 'RED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#FCA5A5] text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0">
            Red Alert
          </span>
        );
      case 'ORANGE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F97316]/15 border border-[#F97316]/40 text-[#FDBA74] text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0">
            Orange Alert
          </span>
        );
      case 'YELLOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#FCD34D] text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0">
            Yellow Watch
          </span>
        );
      case 'WATCH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#35C7E8]/12 border border-[#35C7E8]/35 text-[#7DD3FC] text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0">
            Watch
          </span>
        );
      case 'NO_WARNING':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#22C7A0]/12 border border-[#22C7A0]/35 text-[#6EE7B7] text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0">
            No Warning
          </span>
        );
    }
  };

  const renderDistrictChips = (districts: string[]) => {
    if (!districts || districts.length === 0) {
      return <span className="text-[#8295A8] text-xs font-mono">—</span>;
    }

    const visibleDistricts = districts.slice(0, 3);
    const remainingCount = districts.length - visibleDistricts.length;

    return (
      <div className="flex flex-wrap items-center gap-1">
        {visibleDistricts.map((district) => (
          <span
            key={district}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[#FCD34D] text-[10px] font-mono"
            title={district}
          >
            {district}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="text-[10px] text-[#B5C3D1] font-mono px-1.5 py-0.5 bg-[#08131F] rounded border border-[#26394B] tabular-nums">
            +{remainingCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <DataPanel className="flex flex-col gap-4 mb-10">
      <SectionHeading
        title="State & UT Meteorological Warning Engine"
        subtitle="Independent evaluation for all 28 States & 8 Union Territories derived from IMD & SACHET feeds"
        icon={<ShieldAlert className="w-4 h-4" />}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#08131F] border border-[#26394B] text-[11px] font-mono text-[#7DD3FC] tabular-nums">
            <Layers className="w-3 h-3 text-[#35C7E8]" />
            <span>{regionalWarnings.length} Regions</span>
          </span>
        }
      />

      {regionalWarnings.length === 0 ? (
        <UnavailableState
          title="Regional Warning Matrix Unavailable"
          reason="Per-state warning statuses could not be populated because the upstream regional feed returned no records."
          source="IMD CAP / NDMA SACHET"
        />
      ) : (
        <>
          {/* Filter / Search Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            <div className="relative w-full lg:w-[44%] shrink-0">
              <Search className="w-4 h-4 text-[#8295A8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search state, UT, district (e.g. Odisha, Rewa)..."
                aria-label="Search state, UT, or district"
                className="w-full min-h-[40px] bg-[#08131F] border border-[#26394B] rounded-lg pl-9 pr-3 text-xs text-[#F3F6FA] placeholder-[#8295A8] focus:outline-none focus:border-[#35C7E8] transition-colors font-mono"
              />
            </div>

            <div className="w-full lg:w-auto flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0 font-mono tabular-nums">
              {(
                [
                  { id: 'ALL', label: 'All', count: counts.total, active: 'bg-[#0B72B9] border-[#35C7E8] text-white', idle: 'bg-[#08131F] border-[#26394B] text-[#B5C3D1]' },
                  { id: 'RED', label: 'Red', count: counts.red, active: 'bg-[#EF4444] border-[#F87171] text-white', idle: 'bg-[#08131F] border-[#EF4444]/35 text-[#FCA5A5]' },
                  { id: 'ORANGE', label: 'Orange', count: counts.orange, active: 'bg-[#F97316] border-[#FB923C] text-white', idle: 'bg-[#08131F] border-[#F97316]/35 text-[#FDBA74]' },
                  { id: 'YELLOW', label: 'Yellow', count: counts.yellow, active: 'bg-[#F59E0B] border-[#FCD34D] text-[#07111D]', idle: 'bg-[#08131F] border-[#F59E0B]/35 text-[#FCD34D]' },
                  { id: 'NO_WARNING', label: 'No Warning', count: counts.noWarning, active: 'bg-[#22C7A0] border-[#6EE7B7] text-[#07111D]', idle: 'bg-[#08131F] border-[#22C7A0]/35 text-[#6EE7B7]' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSeverityFilter(tab.id)}
                  className={`min-h-[38px] px-3 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 m-focus-ring ${
                    severityFilter === tab.id ? tab.active : `${tab.idle} hover:border-[#38536A]`
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="opacity-85 text-[11px]">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop / Tablet Table */}
          <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-[#26394B] bg-[#08131F]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#07111D] text-[11px] font-mono uppercase tracking-wider text-[#8295A8] border-b border-[#26394B]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Region</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Hazards</th>
                  <th className="py-3 px-4 font-semibold">Alerted Districts</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#26394B]/60">
                {filteredRegions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#8295A8] font-mono text-xs">
                      No regions match the selected filter or search query.
                    </td>
                  </tr>
                ) : (
                  filteredRegions.map((region) => {
                    const isExpanded = expandedRegionCode === region.regionCode;

                    return (
                      <React.Fragment key={region.regionCode}>
                        <tr
                          onClick={() => setExpandedRegionCode(isExpanded ? null : region.regionCode)}
                          className={`hover:bg-[#101F2E]/70 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-[#101F2E]' : ''
                          }`}
                        >
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-md bg-[#101F2E] border border-[#26394B] text-[#7DD3FC] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                                {region.regionCode}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-[#F3F6FA] text-xs sm:text-[13px] truncate">
                                  {region.regionName}
                                </span>
                                <span className="text-[10px] text-[#8295A8] font-mono">
                                  {region.regionType === 'STATE' ? 'State' : 'Union Territory'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 align-middle">
                            {renderCompactStatusBadge(region)}
                          </td>

                          <td className="py-3 px-4 align-middle">
                            {region.hazards && region.hazards.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {region.hazards.map((hazard, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#101F2E] border border-[#26394B] text-[#7DD3FC] text-[10px] font-mono"
                                  >
                                    {hazard}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#8295A8] text-xs font-mono">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 align-middle">
                            {renderDistrictChips(region.affectedDistricts)}
                          </td>

                          <td className="py-3 px-4 align-middle text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRegionCode(isExpanded ? null : region.regionCode);
                              }}
                              className="inline-flex items-center justify-end gap-1 text-xs font-mono text-[#35C7E8] hover:text-[#7DD3FC] transition-colors cursor-pointer ml-auto"
                              aria-expanded={isExpanded}
                            >
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#07111D]">
                            <td colSpan={5} className="py-4 px-5 border-b border-[#26394B]">
                              <div className="flex flex-col gap-3 font-mono text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#26394B]">
                                  <span className="font-semibold text-[#F3F6FA]">
                                    {region.regionName} ({region.regionCode}) — Meteorological Assessment
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[11px] text-[#B5C3D1]">
                                    <Clock className="w-3 h-3 text-[#35C7E8]" />
                                    <span>Valid Until: {region.validUntil || 'Active Forecast Window'}</span>
                                  </div>
                                </div>

                                {region.affectedDistricts && region.affectedDistricts.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-[#8295A8] uppercase tracking-wider">
                                      Alerted Districts ({region.affectedDistricts.length})
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {region.affectedDistricts.map((d) => (
                                        <span
                                          key={d}
                                          className="px-2 py-0.5 rounded bg-[#101F2E] border border-[#26394B] text-[#FCD34D] text-[11px]"
                                        >
                                          {d}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div>
                                  <span className="text-[10px] font-semibold text-[#8295A8] uppercase tracking-wider">
                                    Official Source Records
                                  </span>
                                  {region.sourceWarnings && region.sourceWarnings.length > 0 ? (
                                    <div className="flex flex-col gap-1.5 mt-1.5">
                                      {region.sourceWarnings.map((w: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B] flex flex-col gap-0.5"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <strong className="text-[#F3F6FA] text-xs">{w.headline || w.event}</strong>
                                            <span className="px-1.5 py-0.5 rounded bg-[#101F2E] border border-[#26394B] text-[10px] text-[#35C7E8] shrink-0">
                                              {w.source || 'IMD'}
                                            </span>
                                          </div>
                                          <span className="text-[#8295A8] text-[10px]">
                                            ID: {w.id || '—'} · Valid until: {w.validUntil || 'Continuous monitoring'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-[#8295A8] text-[11px] mt-1 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#22C7A0]" />
                                      <span>No active severe weather warnings for {region.regionName}.</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {filteredRegions.length === 0 ? (
              <div className="py-8 text-center text-[#8295A8] font-mono text-xs bg-[#08131F] rounded-xl border border-[#26394B]">
                No regions match the selected filter.
              </div>
            ) : (
              filteredRegions.map((region) => {
                const isExpanded = expandedRegionCode === region.regionCode;

                return (
                  <div
                    key={region.regionCode}
                    className="bg-[#08131F] border border-[#26394B] rounded-xl p-3.5 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-[#101F2E] border border-[#26394B] text-[#7DD3FC] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                          {region.regionCode}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-[#F3F6FA] text-xs truncate">
                            {region.regionName}
                          </span>
                          <span className="text-[10px] text-[#8295A8] font-mono">
                            {region.regionType === 'STATE' ? 'State' : 'Union Territory'}
                          </span>
                        </div>
                      </div>
                      {renderCompactStatusBadge(region)}
                    </div>

                    {region.hazards && region.hazards.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-[#8295A8] font-mono mr-1">Hazards:</span>
                        {region.hazards.map((h, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#101F2E] border border-[#26394B] text-[#7DD3FC] text-[10px] font-mono"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#8295A8] font-mono">Alerted Districts</span>
                      <div>{renderDistrictChips(region.affectedDistricts)}</div>
                    </div>

                    <div className="pt-2 border-t border-[#26394B] flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedRegionCode(isExpanded ? null : region.regionCode)}
                        className="min-h-[38px] inline-flex items-center gap-1 text-xs font-mono text-[#35C7E8] hover:text-[#7DD3FC] cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Inspect Details'}</span>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pt-2.5 border-t border-[#26394B] text-xs font-mono flex flex-col gap-2 bg-[#07111D] p-3 rounded-lg">
                        <div className="flex items-center gap-1.5 text-[10px] text-[#B5C3D1]">
                          <Clock className="w-3 h-3 text-[#35C7E8]" />
                          <span>Valid: {region.validUntil || 'Active Forecast Window'}</span>
                        </div>

                        {region.affectedDistricts && region.affectedDistricts.length > 0 && (
                          <div>
                            <span className="text-[10px] font-semibold text-[#8295A8] uppercase">
                              All Districts ({region.affectedDistricts.length})
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {region.affectedDistricts.map((d) => (
                                <span
                                  key={d}
                                  className="px-1.5 py-0.5 rounded bg-[#101F2E] border border-[#26394B] text-[#FCD34D] text-[10px]"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] font-semibold text-[#8295A8] uppercase">
                            Source Records
                          </span>
                          {region.sourceWarnings && region.sourceWarnings.length > 0 ? (
                            <div className="flex flex-col gap-1 mt-1">
                              {region.sourceWarnings.map((w: any, idx: number) => (
                                <div key={idx} className="p-2 rounded bg-[#0B1927] border border-[#26394B] text-[10px]">
                                  <p className="text-[#F3F6FA] font-medium">{w.headline || w.event}</p>
                                  <span className="text-[#8295A8]">{w.source || 'IMD'} · {w.id || '—'}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[#8295A8] text-[10px] mt-0.5">No active bulletins for this region.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </DataPanel>
  );
};
