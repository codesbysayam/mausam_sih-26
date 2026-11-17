import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { RegionalWarningStatus, WarningLevel } from '../../types/cyclone';

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

  // Compute counts strictly from existing warning dataset
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

  // Filter regions strictly matching search and severity
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

  // Compact Status Badge with high contrast & standard color tokens
  const renderCompactStatusBadge = (region: RegionalWarningStatus) => {
    if (region.status === 'DATA_UNAVAILABLE') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-slate-400 text-[11px] font-mono tracking-tight shrink-0"
          title="Official surveillance feed unavailable"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          <span>Unavailable</span>
        </span>
      );
    }

    switch (region.warningLevel) {
      case 'RED':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-500/15 border border-red-500/40 text-red-400 text-[11px] font-mono font-semibold tracking-tight shrink-0"
            title="Red Alert (Take Action)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span>Red Alert</span>
          </span>
        );
      case 'ORANGE':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-semibold tracking-tight shrink-0"
            title="Orange Alert (Be Prepared)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Orange Alert</span>
          </span>
        );
      case 'YELLOW':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-[11px] font-mono font-semibold tracking-tight shrink-0"
            title="Yellow Watch (Be Updated)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span>Yellow Watch</span>
          </span>
        );
      case 'WATCH':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[11px] font-mono font-medium tracking-tight shrink-0"
            title="Monitoring Watch"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Watch</span>
          </span>
        );
      case 'NO_WARNING':
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono font-medium tracking-tight shrink-0"
            title="No Active Severe Weather Warning"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>No Warning</span>
          </span>
        );
    }
  };

  // Render Alerted Districts as small, clean chips
  const renderDistrictChips = (districts: string[]) => {
    if (!districts || districts.length === 0) {
      return <span className="text-slate-500 text-xs font-mono">—</span>;
    }

    const visibleDistricts = districts.slice(0, 3);
    const remainingCount = districts.length - visibleDistricts.length;

    return (
      <div className="flex flex-wrap items-center gap-1">
        {visibleDistricts.map((district) => (
          <span
            key={district}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#132337] border border-[#203a5e] text-amber-200 text-[10px] font-mono tracking-tight"
            title={district}
          >
            {district}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="text-[10px] text-[#93A4B8] font-mono px-1 py-0.5 bg-[#0A1322] rounded border border-[#1E2E40]">
            +{remainingCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <section
      aria-label="State and UT Meteorological Warning Engine"
      className="w-full bg-[#0B1523] border border-[#1E3A5F] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-3.5 mb-14"
    >
      {/* 1. SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#1E2E40]/70">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <ShieldAlert className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-wide text-white font-mono flex items-center gap-2">
              State &amp; UT Meteorological Warning Engine
            </h2>
            <p className="text-[11px] sm:text-xs text-[#94A3B8] mt-0.5">
              Independent evaluation for all 28 States &amp; 8 Union Territories derived from official IMD &amp; SACHET feeds.
            </p>
          </div>
        </div>

        {/* Polished Compact Status Badge */}
        <div className="flex items-center self-start sm:self-auto shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#132337] border border-[#203a5e] text-[11px] font-mono text-[#93C5FD] shadow-xs">
            <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
            <strong className="text-white">{regionalWarnings.length}</strong> Regions Evaluated
          </span>
        </div>
      </div>

      {/* 2. FILTER / SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search Field (occupies ~45-50% width on desktop) */}
        <div className="relative w-full md:w-[48%] shrink-0">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search state, UT, district (e.g. Odisha, Srikakulam, Rewa)..."
            className="w-full h-9 bg-[#09111C] border border-[#1E2E40] rounded-lg pl-8 pr-3 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/40 transition-colors font-mono"
          />
        </div>

        {/* Segmented Filter Pills */}
        <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setSeverityFilter('ALL')}
            className={`h-9 px-3 rounded-lg border text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'ALL'
                ? 'bg-[#0284C7] border-[#0284C7] text-white shadow-xs'
                : 'bg-[#09111C] border-[#1E2E40] text-[#94A3B8] hover:text-white hover:border-[#2a4563]'
            }`}
          >
            <span>All</span>
            <span className="opacity-80 text-[11px]">({counts.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setSeverityFilter('RED')}
            className={`h-9 px-3 rounded-lg border text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'RED'
                ? 'bg-[#EF4444] border-[#EF4444] text-white font-bold shadow-xs'
                : 'bg-[#09111C] border-red-500/30 text-red-400 hover:bg-red-500/10'
            }`}
          >
            <span>Red</span>
            <span className="text-[11px]">({counts.red})</span>
          </button>

          <button
            type="button"
            onClick={() => setSeverityFilter('ORANGE')}
            className={`h-9 px-3 rounded-lg border text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'ORANGE'
                ? 'bg-[#F97316] border-[#F97316] text-white font-bold shadow-xs'
                : 'bg-[#09111C] border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <span>Orange</span>
            <span className="text-[11px]">({counts.orange})</span>
          </button>

          <button
            type="button"
            onClick={() => setSeverityFilter('YELLOW')}
            className={`h-9 px-3 rounded-lg border text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'YELLOW'
                ? 'bg-[#EAB308] border-[#EAB308] text-slate-950 font-bold shadow-xs'
                : 'bg-[#09111C] border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10'
            }`}
          >
            <span>Yellow</span>
            <span className="text-[11px]">({counts.yellow})</span>
          </button>

          <button
            type="button"
            onClick={() => setSeverityFilter('NO_WARNING')}
            className={`h-9 px-3 rounded-lg border text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              severityFilter === 'NO_WARNING'
                ? 'bg-[#10B981] border-[#10B981] text-white font-bold shadow-xs'
                : 'bg-[#09111C] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <span>No Warning</span>
            <span className="text-[11px]">({counts.noWarning})</span>
          </button>
        </div>
      </div>

      {/* 3. DESKTOP / TABLET MONITORING TABLE (hidden on mobile) */}
      <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-[#1E2E40]/80 bg-[#070D18]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#0A1322] text-[11px] font-mono uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2E40]">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Region</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold">Hazards</th>
              <th className="py-2.5 px-4 font-semibold">Alerted Districts</th>
              <th className="py-2.5 px-4 font-semibold text-right">Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1E2E40]/50">
            {filteredRegions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 font-mono text-xs">
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
                      className={`hover:bg-[#132337]/45 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-[#101F33]/80' : ''
                      } ${
                        region.warningLevel === 'RED'
                          ? 'bg-red-500/5'
                          : region.warningLevel === 'ORANGE'
                          ? 'bg-amber-500/5'
                          : ''
                      }`}
                    >
                      {/* Region: [AP] Andhra Pradesh / State */}
                      <td className="py-2.5 px-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-[#132337] border border-[#203a5e] text-sky-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                            {region.regionCode}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-100 text-xs sm:text-[13px] truncate">
                              {region.regionName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {region.regionType === 'STATE' ? 'State' : 'Union Territory'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Compact Status Badge */}
                      <td className="py-2.5 px-4 align-middle">
                        {renderCompactStatusBadge(region)}
                      </td>

                      {/* Hazards Column */}
                      <td className="py-2.5 px-4 align-middle">
                        {region.hazards && region.hazards.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {region.hazards.map((hazard, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#132337] border border-[#203a5e] text-[#93C5FD] text-[10px] font-mono tracking-tight"
                              >
                                {hazard}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs font-mono">—</span>
                        )}
                      </td>

                      {/* Alerted Districts: Clean chips */}
                      <td className="py-2.5 px-4 align-middle">
                        {renderDistrictChips(region.affectedDistricts)}
                      </td>

                      {/* Consistent Right-Aligned Link */}
                      <td className="py-2.5 px-4 align-middle text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRegionCode(isExpanded ? null : region.regionCode);
                          }}
                          className="inline-flex items-center justify-end gap-1 text-xs font-mono text-[#38BDF8] hover:text-[#7DD3FC] underline underline-offset-2 transition-colors cursor-pointer ml-auto"
                          aria-expanded={isExpanded}
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Inspect'}</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Inspect Row */}
                    {isExpanded && (
                      <tr className="bg-[#09111C]/95">
                        <td colSpan={5} className="py-3.5 px-5 border-b border-[#1E2E40]">
                          <div className="flex flex-col gap-3 font-mono text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1E2E40]/80">
                              <span className="font-semibold text-white">
                                {region.regionName} ({region.regionCode}) — Official Meteorological Assessment
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                                <Clock className="w-3 h-3 text-[#38BDF8]" />
                                <span>Valid Until: {region.validUntil || 'Active Forecast Window'}</span>
                              </div>
                            </div>

                            {/* Districts List */}
                            {region.affectedDistricts && region.affectedDistricts.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                                  Alerted Districts ({region.affectedDistricts.length}):
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {region.affectedDistricts.map((d) => (
                                    <span
                                      key={d}
                                      className="px-2 py-0.5 rounded bg-[#132337] border border-[#25486F] text-amber-200 text-[11px]"
                                    >
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Bulletins & Source Records */}
                            <div>
                              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                                Official Source Records:
                              </span>
                              {region.sourceWarnings && region.sourceWarnings.length > 0 ? (
                                <div className="flex flex-col gap-1.5 mt-1">
                                  {region.sourceWarnings.map((w: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="p-2 rounded-lg bg-[#0D1826] border border-[#1E2E40] flex flex-col gap-0.5"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <strong className="text-white text-xs">{w.headline || w.event}</strong>
                                        <span className="px-1.5 py-0.2 rounded bg-[#1A2E44] text-[10px] text-[#38BDF8] shrink-0">
                                          {w.source || 'IMD'}
                                        </span>
                                      </div>
                                      <span className="text-[#94A3B8] text-[10px]">
                                        ID: {w.id || 'N/A'} • Valid until: {w.validUntil || 'Continuous monitoring'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-slate-500 text-[11px] italic mt-1 flex items-center gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500/80" />
                                  <span>No active severe weather warnings for {region.regionName} in current synoptic cycle.</span>
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

      {/* 4. MOBILE CARD LIST (stacked on mobile screens, hidden on md+) */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {filteredRegions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-mono text-xs bg-[#070D18] rounded-xl border border-[#1E2E40]">
            No regions match the selected filter.
          </div>
        ) : (
          filteredRegions.map((region) => {
            const isExpanded = expandedRegionCode === region.regionCode;

            return (
              <div
                key={region.regionCode}
                className={`bg-[#070D18] border border-[#1E2E40] rounded-xl p-3 flex flex-col gap-2.5 transition-colors ${
                  region.warningLevel === 'RED'
                    ? 'border-red-500/40 bg-red-500/5'
                    : region.warningLevel === 'ORANGE'
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : ''
                }`}
              >
                {/* Card Header: Region & Compact Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-[#132337] border border-[#203a5e] text-sky-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      {region.regionCode}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-100 text-xs truncate">
                        {region.regionName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {region.regionType === 'STATE' ? 'State' : 'Union Territory'}
                      </span>
                    </div>
                  </div>
                  <div>{renderCompactStatusBadge(region)}</div>
                </div>

                {/* Hazards (if any) */}
                {region.hazards && region.hazards.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-slate-400 font-mono mr-1">Hazards:</span>
                    {region.hazards.map((h, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#132337] border border-[#203a5e] text-[#93C5FD] text-[10px] font-mono"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Districts (small clean chips) */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-mono">Alerted Districts:</span>
                  <div>{renderDistrictChips(region.affectedDistricts)}</div>
                </div>

                {/* Card Footer: Right-aligned Inspect Link */}
                <div className="pt-2 border-t border-[#1E2E40]/60 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setExpandedRegionCode(isExpanded ? null : region.regionCode)}
                    className="inline-flex items-center gap-1 text-xs font-mono text-[#38BDF8] hover:text-[#7DD3FC] underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'Inspect Details'}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Expanded Details on Mobile */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-[#1E2E40] text-xs font-mono flex flex-col gap-2 bg-[#09111C] p-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
                      <Clock className="w-3 h-3 text-[#38BDF8]" />
                      <span>Valid: {region.validUntil || 'Active Forecast Window'}</span>
                    </div>

                    {region.affectedDistricts && region.affectedDistricts.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          All Districts ({region.affectedDistricts.length}):
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {region.affectedDistricts.map((d) => (
                            <span
                              key={d}
                              className="px-1.5 py-0.5 rounded bg-[#132337] text-amber-200 text-[10px]"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Source Records:
                      </span>
                      {region.sourceWarnings && region.sourceWarnings.length > 0 ? (
                        <div className="flex flex-col gap-1 mt-1">
                          {region.sourceWarnings.map((w: any, idx: number) => (
                            <div key={idx} className="p-1.5 rounded bg-[#070D18] border border-[#1E2E40] text-[10px]">
                              <p className="text-white font-medium">{w.headline || w.event}</p>
                              <span className="text-slate-400">{w.source || 'IMD'} • {w.id}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-[10px] italic mt-0.5">No active bulletins for this region.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
