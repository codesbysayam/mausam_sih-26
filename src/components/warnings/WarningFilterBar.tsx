import React from 'react';
import { FilterX, Globe2, Search, X } from 'lucide-react';
import {
  WarningFilterState,
  IndiaMetRegion,
  HazardCategory,
} from '../../types/warningTypes';
import { renderHazardIcon } from './hazardIcon';
import { DataPanel } from '../ui/ObservatoryPrimitives';

interface WarningFilterBarProps {
  filter: WarningFilterState;
  onFilterChange: (newFilter: WarningFilterState) => void;
  onResetFilters: () => void;
  activeCount: number;
  totalCount: number;
  isUnavailable?: boolean;
}

const REGION_OPTIONS: { id: IndiaMetRegion; label: string }[] = [
  { id: 'all', label: 'All India' },
  { id: 'north', label: 'Northwest' },
  { id: 'east', label: 'East & Northeast' },
  { id: 'central', label: 'Central' },
  { id: 'south', label: 'South Peninsular' },
  { id: 'west', label: 'West & Islands' },
];

const HAZARD_TABS: { id: HazardCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Hazards', icon: 'apps' },
  { id: 'heavy_rain', label: 'Rainfall', icon: 'rainy' },
  { id: 'flood', label: 'Flood', icon: 'flood' },
  { id: 'thunderstorm', label: 'Thunderstorm', icon: 'thunderstorm' },
  { id: 'cyclone', label: 'Cyclone', icon: 'cyclone' },
  { id: 'heatwave', label: 'Heatwave', icon: 'local_fire_department' },
  { id: 'dense_fog', label: 'Fog', icon: 'foggy' },
  { id: 'strong_wind', label: 'Wind', icon: 'air' },
  { id: 'coastal_warning', label: 'Coastal', icon: 'tsunami' },
];

export const WarningFilterBar: React.FC<WarningFilterBarProps> = ({
  filter,
  onFilterChange,
  onResetFilters,
  activeCount,
  totalCount,
  isUnavailable = false,
}) => {
  const isFiltered =
    filter.region !== 'all' ||
    filter.state !== 'all' ||
    filter.hazard !== 'all' ||
    filter.severity !== 'all' ||
    filter.searchQuery.trim() !== '';

  const handleUpdate = <K extends keyof WarningFilterState>(
    key: K,
    value: WarningFilterState[K]
  ) => {
    onFilterChange({
      ...filter,
      [key]: value,
    });
  };

  return (
    <DataPanel id="warning-filter-bar-container" className="flex flex-col gap-3.5">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--m-text-muted)] pointer-events-none" />
          <input
            id="input-warning-search"
            type="text"
            value={filter.searchQuery}
            onChange={(e) => handleUpdate('searchQuery', e.target.value)}
            placeholder="Search by state, district, hazard keyword, or bulletin ID..."
            aria-label="Search weather warnings"
            className="w-full min-h-[42px] pl-9 pr-9 py-2 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg text-xs text-[var(--m-text-primary)] placeholder-[var(--m-text-muted)] focus:outline-none focus:border-[var(--m-accent)] transition-colors"
          />
          {filter.searchQuery && (
            <button
              id="btn-clear-warning-search"
              type="button"
              onClick={() => handleUpdate('searchQuery', '')}
              aria-label="Clear search input"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <div className="text-xs text-[var(--m-text-secondary)] font-mono tabular-nums px-3 py-2 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
            <span>Showing </span>
            <strong className="text-[var(--m-text-primary)]">{isUnavailable ? '—' : activeCount}</strong>
            <span className="text-[var(--m-text-muted)]"> / {isUnavailable ? '—' : totalCount}</span>
          </div>

          {isFiltered && (
            <button
              id="btn-reset-filters"
              type="button"
              onClick={onResetFilters}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-[var(--m-border)]">
        <div
          id="severity-filter-pills"
          role="tablist"
          aria-label="Filter warnings by alert level"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
        >
          <button
            id="tab-sev-all"
            type="button"
            onClick={() => handleUpdate('severity', 'all')}
            className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
              filter.severity === 'all'
                ? 'bg-[var(--m-accent)] text-white border-[var(--m-accent)]'
                : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border-[var(--m-border)]'
            }`}
          >
            All Warnings
          </button>

          <button
            id="tab-sev-red"
            type="button"
            onClick={() => handleUpdate('severity', 'red')}
            className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
              filter.severity === 'red'
                ? 'bg-[#EF4444] text-white border-[#FCA5A5]'
                : 'bg-[var(--m-surface-inset)] text-[var(--m-danger)] hover:bg-[var(--m-danger-soft)] border-[var(--m-danger)]/35'
            }`}
          >
            Red Alert
          </button>

          <button
            id="tab-sev-orange"
            type="button"
            onClick={() => handleUpdate('severity', 'orange')}
            className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
              filter.severity === 'orange'
                ? 'bg-[#F97316] text-white border-[#FDBA74]'
                : 'bg-[var(--m-surface-inset)] text-[var(--m-alert)] hover:bg-[var(--m-alert-soft)] border-[var(--m-alert)]/35'
            }`}
          >
            Orange Alert
          </button>

          <button
            id="tab-sev-yellow"
            type="button"
            onClick={() => handleUpdate('severity', 'yellow')}
            className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
              filter.severity === 'yellow'
                ? 'bg-[#EAB308] text-[#07111D] border-[#FDE047]'
                : 'bg-[var(--m-surface-inset)] text-[var(--m-watch)] hover:bg-[var(--m-watch-soft)] border-[var(--m-watch)]/35'
            }`}
          >
            Yellow Watch
          </button>

          <button
            id="tab-sev-green"
            type="button"
            onClick={() => handleUpdate('severity', 'green')}
            className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
              filter.severity === 'green'
                ? 'bg-[#22C7A0] text-[#07111D] border-[#6EE7B7]'
                : 'bg-[var(--m-surface-inset)] text-[var(--m-ok)] hover:bg-[var(--m-ok-soft)] border-[var(--m-ok)]/35'
            }`}
          >
            Normal / Green
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="select-met-region"
            className="text-xs text-[var(--m-text-secondary)] font-semibold flex items-center gap-1"
          >
            <Globe2 className="w-4 h-4 text-[var(--m-accent)]" />
            <span className="hidden sm:inline">Region:</span>
          </label>
          <select
            id="select-met-region"
            value={filter.region}
            onChange={(e) => handleUpdate('region', e.target.value as IndiaMetRegion)}
            className="min-h-[38px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-text-primary)] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--m-accent)] cursor-pointer"
          >
            {REGION_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        id="hazard-category-pills-row"
        role="tablist"
        aria-label="Filter warnings by hazard category"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-[var(--m-border)] scrollbar-none"
      >
        {HAZARD_TABS.map((tab) => {
          const isActive = filter.hazard === tab.id;
          return (
            <button
              key={tab.id}
              id={`btn-hazard-pill-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleUpdate('hazard', tab.id)}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer border whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--m-surface-2)] text-[var(--m-text-primary)] border-[var(--m-accent)]'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] border-[var(--m-border)]'
              }`}
            >
              <span className="text-[var(--m-accent)]">
                {renderHazardIcon(tab.icon, 'w-3.5 h-3.5')}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </DataPanel>
  );
};
