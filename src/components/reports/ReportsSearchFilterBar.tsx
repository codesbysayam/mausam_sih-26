import React from 'react';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Table,
  Bookmark,
  X,
} from 'lucide-react';
import { DateRangePicker } from '../DateRangePicker';
import { DataPanel } from '../ui/ObservatoryPrimitives';

export type FilterCategory =
  | 'ALL'
  | 'WEATHER'
  | 'CLIMATOLOGY'
  | 'AGROMET'
  | 'AIR QUALITY'
  | 'RADAR'
  | 'SATELLITE'
  | 'RESEARCH'
  | 'OFFICIAL'
  | 'SAVED';

export type SortOption = 'NEWEST' | 'OLDEST' | 'TITLE' | 'CATEGORY';

export type ViewMode = 'list' | 'grid' | 'table';

interface ReportsSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: FilterCategory;
  onCategoryChange: (cat: FilterCategory) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalFilteredCount: number;
  totalAvailableCount: number;
  savedCount: number;
  dateRange?: [Date | null, Date | null];
  onDateRangeChange?: (range: [Date | null, Date | null]) => void;
}

export const ReportsSearchFilterBar: React.FC<ReportsSearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalFilteredCount,
  totalAvailableCount,
  savedCount,
  dateRange = [null, null],
  onDateRangeChange,
}) => {
  const categories: { id: FilterCategory; label: string; countSuffix?: number }[] = [
    { id: 'ALL', label: 'All Publications' },
    { id: 'OFFICIAL', label: 'Official Bulletins' },
    { id: 'RESEARCH', label: 'Research Articles' },
    { id: 'WEATHER', label: 'Weather Synoptics' },
    { id: 'CLIMATOLOGY', label: 'Climatology' },
    { id: 'AGROMET', label: 'Agromet' },
    { id: 'AIR QUALITY', label: 'Air Quality' },
    { id: 'RADAR', label: 'Radar & Nowcasting' },
    { id: 'SATELLITE', label: 'Satellite' },
    { id: 'SAVED', label: 'Saved Library', countSuffix: savedCount },
  ];

  const isDateFilterActive = dateRange[0] !== null || dateRange[1] !== null;

  return (
    <DataPanel id="reports-search-filter-system" className="space-y-4">
      {/* Top Search Input & Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search Input */}
        <div className="relative w-full flex-1">
          <Search className="w-4 h-4 text-[#8295A8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="reports-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search publications by title, keywords, division, ref ID or author..."
            className="w-full min-h-[44px] sm:min-h-[40px] bg-[#08131F] border border-[#26394B] focus:border-[#35C7E8] rounded-lg pl-10 pr-10 py-2 text-xs sm:text-sm text-[#F3F6FA] placeholder-[#8295A8] focus:outline-none transition-colors font-mono m-focus-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#8295A8] hover:text-[#F3F6FA] cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Date Range Picker, Sort & View Mode Controls */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0 justify-between lg:justify-end flex-wrap sm:flex-nowrap">
          {onDateRangeChange && (
            <div className="shrink-0">
              <DateRangePicker
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                onChange={onDateRangeChange}
                placeholder="Filter by Date Range"
                align="right"
              />
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="min-h-[44px] sm:min-h-[40px] flex items-center gap-1.5 bg-[#08131F] border border-[#26394B] rounded-lg px-3 py-1.5 text-xs font-mono text-[#8295A8] shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#35C7E8]" />
            <label htmlFor="reports-sort-select" className="sr-only">
              Sort Publications
            </label>
            <select
              id="reports-sort-select"
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-[#F3F6FA] font-mono text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="NEWEST" className="bg-[#0B1927] text-[#F3F6FA]">
                Newest First
              </option>
              <option value="OLDEST" className="bg-[#0B1927] text-[#F3F6FA]">
                Oldest First
              </option>
              <option value="TITLE" className="bg-[#0B1927] text-[#F3F6FA]">
                Title (A–Z)
              </option>
              <option value="CATEGORY" className="bg-[#0B1927] text-[#F3F6FA]">
                By Category
              </option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-[#08131F] border border-[#26394B] rounded-lg p-1 shrink-0 gap-1">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md transition-colors cursor-pointer m-focus-ring ${
                viewMode === 'list'
                  ? 'bg-[#35C7E8] text-[#07111D]'
                  : 'text-[#8295A8] hover:text-[#F3F6FA]'
              }`}
              title="Row List View"
              aria-label="Row List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md transition-colors cursor-pointer m-focus-ring ${
                viewMode === 'table'
                  ? 'bg-[#35C7E8] text-[#07111D]'
                  : 'text-[#8295A8] hover:text-[#F3F6FA]'
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md transition-colors cursor-pointer m-focus-ring ${
                viewMode === 'grid'
                  ? 'bg-[#35C7E8] text-[#07111D]'
                  : 'text-[#8295A8] hover:text-[#F3F6FA]'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Category Chips with Horizontal Scroll */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring tabular-nums ${
                isSelected
                  ? 'bg-[#35C7E8] text-[#07111D] border border-[#35C7E8]'
                  : 'bg-[#08131F] text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A] border border-[#26394B]'
              }`}
            >
              {cat.id === 'SAVED' && (
                <Bookmark
                  className={`w-3.5 h-3.5 ${isSelected ? 'fill-[#07111D]' : 'text-[#F59E0B]'}`}
                />
              )}
              <span>{cat.label}</span>
              {typeof cat.countSuffix === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isSelected ? 'bg-black/20 text-[#07111D]' : 'bg-[#101F2E] text-[#8295A8]'
                  }`}
                >
                  {cat.countSuffix}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Result Status Indicator & Active Reset */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#26394B] text-xs font-mono text-[#8295A8] flex-wrap gap-2 tabular-nums">
        <div className="flex items-center gap-2 flex-wrap">
          <span>Displaying:</span>
          <strong className="text-[#F3F6FA]">
            {totalFilteredCount} of {totalAvailableCount} publications
          </strong>
          {(searchQuery || selectedCategory !== 'ALL' || isDateFilterActive) && (
            <span className="text-[#35C7E8]">· Filter Active</span>
          )}
          {isDateFilterActive && (
            <span className="bg-[#35C7E8]/12 text-[#35C7E8] px-2 py-0.5 rounded text-[10px] border border-[#35C7E8]/30">
              Date Filtered
            </span>
          )}
        </div>

        {(searchQuery || selectedCategory !== 'ALL' || isDateFilterActive) && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onCategoryChange('ALL');
              if (onDateRangeChange) onDateRangeChange([null, null]);
            }}
            className="min-h-[36px] px-2 text-[#35C7E8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Reset all filters</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </DataPanel>
  );
};
