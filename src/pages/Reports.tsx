import React, { useState, useMemo } from 'react';
import { WeatherDataBundle } from '../services/weatherService';
import { LocationRecord } from '../types';
import { OFFICIAL_PUBLICATIONS, MeteorologicalPublication } from '../data/reportsAndArticles';
import { ReportIntelligenceStrip } from '../components/reports/ReportIntelligenceStrip';
import { ReportOfTheDay } from '../components/reports/ReportOfTheDay';
import { FeaturedReportCard } from '../components/reports/FeaturedReportCard';
import { ResearchTimeline } from '../components/reports/ResearchTimeline';
import { ExploreByTopic } from '../components/reports/ExploreByTopic';
import { PublicationAnalytics } from '../components/reports/PublicationAnalytics';
import {
  ReportsSearchFilterBar,
  FilterCategory,
  SortOption,
  ViewMode,
} from '../components/reports/ReportsSearchFilterBar';
import { PublicationItem } from '../components/reports/PublicationItem';
import { RecentlyViewedReports } from '../components/reports/RecentlyViewedReports';
import { ReportPreviewDrawer } from '../components/reports/ReportPreviewDrawer';
import { ResearchSourcesSection } from '../components/reports/ResearchSourcesSection';
import { useSavedReports } from '../hooks/useSavedReports';
import { DataTable, ColumnDef } from '../components/common/DataTable';
import { PageHeader, DataPanel, MetricValue } from '../components/ui/ObservatoryPrimitives';
import { Search, Bookmark, ExternalLink, RotateCcw } from 'lucide-react';
import { formatCoordinatePair } from '../../shared/weatherContract';

interface ReportsPageProps {
  weatherBundle: WeatherDataBundle;
  selectedLocation: LocationRecord;
}

const isValidNumeric = (v: unknown): v is number =>
  typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);

export const ReportsPage: React.FC<ReportsPageProps> = ({
  weatherBundle,
  selectedLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('NEWEST');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedPublication, setSelectedPublication] = useState<MeteorologicalPublication | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    savedReportIds,
    toggleSaveReport,
    isReportSaved,
    recentlyViewedIds,
    addRecentlyViewed,
    clearRecentlyViewed,
  } = useSavedReports();

  const cur = weatherBundle?.current;
  const hasTemp = isValidNumeric(cur?.temp);
  const hasHumidity = isValidNumeric(cur?.humidity);
  const hasPressure = isValidNumeric(cur?.pressure);
  const hasWind = isValidNumeric(cur?.windSpeed);

  // Dynamically generate a district bulletin synchronized to verified location telemetry
  const dynamicDistrictBulletin: MeteorologicalPublication = useMemo(() => {
    const temp = hasTemp ? `${cur!.temp}°C` : 'Unavailable';
    const humidity = hasHumidity ? `${cur!.humidity}%` : 'Unavailable';
    const condition = cur?.condition || 'Telemetry pending';
    const pressure = hasPressure ? `${cur!.pressure} hPa` : 'Unavailable';
    const windSpeed = hasWind ? `${cur!.windSpeed} km/h` : 'Unavailable';
    const sourceLabel = cur?.dataSource || 'Open-Meteo / IMD Feed';

    const refDate = weatherBundle?.lastFetchedAt ? new Date(weatherBundle.lastFetchedAt) : new Date();
    const safeDate = Number.isNaN(refDate.getTime()) ? new Date() : refDate;
    const formattedDate = safeDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
    const isoDate = safeDate.toISOString().slice(0, 10);

    return {
      id: `district-bulletin-${selectedLocation.id || 'live'}`,
      title: `District Meteorological Bulletin — ${selectedLocation.city}, ${selectedLocation.state}`,
      category: 'Sub-Divisional Report',
      type: 'PDF Bulletin',
      date: formattedDate,
      size: '1.1 MB',
      issuingAuthority: `MAUSAM Regional Synthesis (${sourceLabel})`,
      documentNumber: `MAUSAM-RMC-${selectedLocation.state.slice(0, 3).toUpperCase()}-${isoDate}`,
      author: 'State Meteorological & Surface Synthesis Division',
      abstract: `Location-specific meteorological summary and telemetry report for ${selectedLocation.city} (${selectedLocation.state}) derived from ${sourceLabel} point observations and 7-day numerical forecast guidance.`,
      keywords: [selectedLocation.city, selectedLocation.state, 'Surface Telemetry', 'Local Nowcast', sourceLabel],
      synopticSummary: `Latest telemetry for ${selectedLocation.city} (${sourceLabel}) reports surface temperature of ${temp}, relative humidity at ${humidity}, mean sea-level pressure of ${pressure}, and surface wind at ${windSpeed} (${condition}).`,
      recommendations: [
        `Public and district authorities in ${selectedLocation.city} should monitor localized radar nowcasts during convective periods.`,
        'Agricultural workers in adjoining taluks should adjust field irrigation in accordance with 3-day precipitation probabilities.',
        'Transport and municipal authorities should keep drainage pathways clear during heavy rainfall periods.'
      ],
      sections: [
        {
          title: `1. Surface Telemetry at ${selectedLocation.city}`,
          content: `Sensor and point model values for ${selectedLocation.city} (Source: ${sourceLabel}${selectedLocation.stationId ? `, Station ID: ${selectedLocation.stationId}` : ''}):`,
          tableData: {
            headers: ['Atmospheric Metric', 'Current Reading', 'Unit / Reference', 'Status'],
            rows: [
              ['Surface Temperature', temp, '°C (2m Air)', hasTemp ? 'Telemetry Recorded' : 'Unavailable'],
              ['Relative Humidity', humidity, '% RH', hasHumidity ? 'Telemetry Recorded' : 'Unavailable'],
              ['Atmospheric Pressure', pressure, 'hPa (MSLP)', hasPressure ? 'Telemetry Recorded' : 'Unavailable'],
              ['Wind Velocity', windSpeed, 'km/h (10m)', hasWind ? 'Telemetry Recorded' : 'Unavailable'],
              ['General Condition', condition, 'Sky State', cur?.condition ? 'Current' : 'Unavailable']
            ]
          }
        },
        {
          title: '2. Sub-Divisional Quantitative Precipitation & Alert Status',
          content: `Evaluation of regional convective potential and 72-hour precipitation guidance across ${selectedLocation.district || selectedLocation.city} district.`
        }
      ]
    };
  }, [weatherBundle, selectedLocation, cur, hasTemp, hasHumidity, hasPressure, hasWind]);

  // Combine dynamic bulletin with official archive
  const allPublications: MeteorologicalPublication[] = useMemo(() => {
    const staticItems = OFFICIAL_PUBLICATIONS.filter((p) => p.id !== 'district-bulletin-regional');
    return [dynamicDistrictBulletin, ...staticItems];
  }, [dynamicDistrictBulletin]);

  // Publication intelligence summary counts
  const libraryCounts = useMemo(() => {
    const total = allPublications.length;
    const research = allPublications.filter(
      (p) =>
        p.type === 'Research Article' ||
        p.type === 'Technical Monograph' ||
        p.category === 'Scientific Monograph' ||
        p.category === 'Climatological Study'
    ).length;
    const official = allPublications.filter(
      (p) =>
        p.type === 'PDF Bulletin' ||
        p.type === 'GKMS Bulletin' ||
        p.type === 'Government Publication' ||
        p.category === 'National Weather Observation' ||
        p.category === 'Sub-Divisional Report' ||
        p.category === 'Agricultural Meteorology'
    ).length;
    const technical = allPublications.filter(
      (p) =>
        p.category === 'Environmental Registry' ||
        p.id.includes('radar') ||
        p.id.includes('satellite') ||
        p.id.includes('ncmrwf') ||
        p.id.includes('wmo')
    ).length;
    return { total, research, official, technical };
  }, [allPublications]);

  // Featured flagship report
  const featuredReport = useMemo(() => {
    return (
      allPublications.find((p) => p.id === 'monsoon-seasonal-rainfall-2026') ||
      allPublications.find((p) => p.id === 'monsoon-seasonal-distribution-2026') ||
      allPublications[0]
    );
  }, [allPublications]);

  // Report of the Day editorial highlight
  const reportOfTheDay = useMemo(() => {
    return (
      allPublications.find((p) => p.id === 'dwr-nowcasting-thunderstorm-dynamics') ||
      allPublications[1] ||
      allPublications[0]
    );
  }, [allPublications]);

  // Filter & Sort Logic
  const filteredPublications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = allPublications.filter((pub) => {
      const matchesSearch =
        q === '' ||
        pub.title.toLowerCase().includes(q) ||
        pub.category.toLowerCase().includes(q) ||
        pub.type.toLowerCase().includes(q) ||
        pub.abstract.toLowerCase().includes(q) ||
        pub.author.toLowerCase().includes(q) ||
        pub.documentNumber.toLowerCase().includes(q) ||
        pub.keywords.some((k) => k.toLowerCase().includes(q));

      let matchesCategory = true;
      if (selectedCategory === 'SAVED') {
        matchesCategory = savedReportIds.includes(pub.id);
      } else if (selectedCategory === 'OFFICIAL') {
        matchesCategory =
          pub.type === 'PDF Bulletin' ||
          pub.type === 'GKMS Bulletin' ||
          pub.type === 'Government Publication' ||
          pub.category === 'National Weather Observation' ||
          pub.category === 'Sub-Divisional Report';
      } else if (selectedCategory === 'RESEARCH') {
        matchesCategory =
          pub.type === 'Research Article' ||
          pub.type === 'Technical Monograph' ||
          pub.category === 'Scientific Monograph' ||
          pub.category === 'Climatological Study';
      } else if (selectedCategory === 'WEATHER') {
        matchesCategory =
          pub.category === 'National Weather Observation' ||
          pub.category === 'Sub-Divisional Report' ||
          pub.keywords.some((k) => k.toLowerCase().includes('weather') || k.toLowerCase().includes('telemetry'));
      } else if (selectedCategory === 'CLIMATOLOGY') {
        matchesCategory =
          pub.category === 'Climatological Study' ||
          pub.keywords.some((k) => k.toLowerCase().includes('climat') || k.toLowerCase().includes('heat'));
      } else if (selectedCategory === 'AGROMET') {
        matchesCategory =
          pub.category === 'Agricultural Meteorology' ||
          pub.type === 'GKMS Bulletin' ||
          pub.keywords.some((k) => k.toLowerCase().includes('agromet') || k.toLowerCase().includes('crop'));
      } else if (selectedCategory === 'AIR QUALITY') {
        matchesCategory =
          pub.category === 'Environmental Registry' ||
          pub.keywords.some((k) => k.toLowerCase().includes('air') || k.toLowerCase().includes('aqi') || k.toLowerCase().includes('pollen'));
      } else if (selectedCategory === 'RADAR') {
        matchesCategory =
          pub.id.includes('radar') ||
          pub.keywords.some((k) => k.toLowerCase().includes('radar') || k.toLowerCase().includes('nowcast'));
      } else if (selectedCategory === 'SATELLITE') {
        matchesCategory =
          pub.id.includes('satellite') ||
          pub.keywords.some((k) => k.toLowerCase().includes('satellite') || k.toLowerCase().includes('isro'));
      }

      let matchesDateRange = true;
      if (dateRange[0] || dateRange[1]) {
        const pubDate = new Date(pub.date);
        if (!isNaN(pubDate.getTime())) {
          if (dateRange[0]) {
            const start = new Date(dateRange[0]);
            start.setHours(0, 0, 0, 0);
            if (pubDate < start) matchesDateRange = false;
          }
          if (dateRange[1]) {
            const end = new Date(dateRange[1]);
            end.setHours(23, 59, 59, 999);
            if (pubDate > end) matchesDateRange = false;
          }
        }
      }

      return matchesSearch && matchesCategory && matchesDateRange;
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === 'TITLE') {
        return a.title.localeCompare(b.title);
      }
      if (sortOption === 'CATEGORY') {
        return a.category.localeCompare(b.category);
      }
      if (sortOption === 'OLDEST') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [allPublications, searchQuery, selectedCategory, sortOption, savedReportIds, dateRange]);

  const handleOpenPublication = (pub: MeteorologicalPublication) => {
    setSelectedPublication(pub);
    addRecentlyViewed(pub.id);
    setIsDrawerOpen(true);
  };

  const handleSelectTopic = (topicQuery: string) => {
    setSearchQuery(topicQuery);
    setSelectedCategory('ALL');
    const el = document.getElementById('reports-search-filter-system');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const updatedAtIST = useMemo(() => {
    if (!weatherBundle?.lastFetchedAt) return null;
    const d = new Date(weatherBundle.lastFetchedAt);
    if (Number.isNaN(d.getTime())) return null;
    return (
      d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    );
  }, [weatherBundle?.lastFetchedAt]);

  const publicationColumns: ColumnDef<MeteorologicalPublication>[] = useMemo(
    () => [
      {
        header: 'Publication / Title',
        align: 'left',
        render: (pub) => (
          <div className="flex flex-col gap-1 max-w-sm">
            <button
              type="button"
              onClick={() => handleOpenPublication(pub)}
              className="text-left font-bold text-[#F3F6FA] text-xs hover:text-[#35C7E8] transition-colors cursor-pointer"
            >
              {pub.title}
            </button>
            <div className="flex items-center gap-2 text-[10px] text-[#8295A8] font-mono tabular-nums">
              <span>{pub.documentNumber}</span>
              <span>·</span>
              <span className="text-[#B5C3D1] truncate">{pub.author}</span>
            </div>
          </div>
        ),
      },
      {
        header: 'Category & Domain',
        align: 'left',
        render: (pub) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-[#35C7E8]">{pub.category}</span>
            <span className="text-[10px] text-[#8295A8]">{pub.type}</span>
          </div>
        ),
      },
      {
        header: 'Date & Size',
        align: 'left',
        render: (pub) => (
          <div className="flex flex-col gap-0.5 text-[11px] font-mono tabular-nums text-[#B5C3D1]">
            <span>{pub.date}</span>
            <span className="text-[10px] text-[#8295A8]">{pub.size}</span>
          </div>
        ),
      },
      {
        header: 'Action',
        align: 'right',
        render: (pub) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => toggleSaveReport(pub.id)}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer m-focus-ring ${
                isReportSaved(pub.id)
                  ? 'border-[#F59E0B]/40 bg-[#F59E0B]/12 text-[#F59E0B]'
                  : 'border-[#26394B] bg-[#08131F] text-[#8295A8] hover:text-[#F3F6FA] hover:border-[#38536A]'
              }`}
              title={isReportSaved(pub.id) ? 'Saved to library' : 'Save publication'}
              aria-label={isReportSaved(pub.id) ? 'Saved to library' : 'Save publication'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isReportSaved(pub.id) ? 'fill-[#F59E0B]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => handleOpenPublication(pub)}
              className="min-h-[40px] px-3 rounded-lg bg-[#101F2E] hover:bg-[#35C7E8] text-[#35C7E8] hover:text-[#07111D] border border-[#35C7E8]/40 text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 m-focus-ring"
            >
              <span>Read</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        ),
      },
    ],
    [isReportSaved, toggleSaveReport]
  );

  return (
    <div id="mausam-reports-library-page" className="space-y-5 pb-12">
      {/* 1. Unified Observatory PageHeader */}
      <PageHeader
        id="reports-hero"
        eyebrow="Official Meteorological Research & Bulletin Library"
        title="Reports & Research"
        description="Meteorological bulletins, climatological studies, agrometeorological advisories, and technical monographs curated across national earth-science institutes."
        coordinates={`${selectedLocation.city}, ${selectedLocation.state} · ${formatCoordinatePair(selectedLocation.lat, selectedLocation.lng, 2)}`}
        status={hasTemp ? 'LIVE' : 'REFERENCE'}
        statusLabel={hasTemp ? 'DISTRICT SYNTHESIS LIVE' : 'ARCHIVE + PENDING TELEMETRY'}
        source={cur?.dataSource ? `${cur.dataSource} · IMD / MoES Archive` : 'IMD / MoES Institutional Archive'}
        updatedAt={updatedAtIST}
        actions={
          <button
            type="button"
            onClick={() => handleOpenPublication(dynamicDistrictBulletin)}
            className="min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-lg bg-[#0B72B9] hover:bg-[#35C7E8] text-white hover:text-[#07111D] border border-[#35C7E8]/40 text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center gap-2 m-focus-ring"
          >
            <span>Open District Bulletin ({selectedLocation.city})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 pt-1">
          <MetricValue
            label="Total Publications"
            value={libraryCounts.total}
            valueClassName="text-lg font-bold text-[#F3F6FA]"
          />
          <MetricValue
            label="Research Papers"
            value={libraryCounts.research}
            valueClassName="text-lg font-bold text-[#35C7E8]"
          />
          <MetricValue
            label="Official Bulletins"
            value={libraryCounts.official}
            valueClassName="text-lg font-bold text-[#22C7A0]"
          />
          <MetricValue
            label="Technical Studies"
            value={libraryCounts.technical}
            valueClassName="text-lg font-bold text-[#F59E0B]"
          />
        </div>
      </PageHeader>

      {/* 2. Horizontal Intelligence Summary Strip */}
      <ReportIntelligenceStrip publications={allPublications} />

      {/* 3. Report of the Day (Editorial Spotlight) */}
      <ReportOfTheDay
        publication={reportOfTheDay}
        onOpenReport={handleOpenPublication}
        onBookmark={toggleSaveReport}
        isSaved={isReportSaved(reportOfTheDay.id)}
      />

      {/* 4. Flagship Featured Report Showcase */}
      <FeaturedReportCard
        publication={featuredReport}
        onOpenReport={handleOpenPublication}
        onBookmark={toggleSaveReport}
        isSaved={isReportSaved(featuredReport.id)}
      />

      {/* 5. Chronological Meteorological Research Timeline */}
      <ResearchTimeline
        publications={allPublications}
        onOpenReport={handleOpenPublication}
      />

      {/* 6. Explore by Domain Taxonomy */}
      <ExploreByTopic
        publications={allPublications}
        onSelectTopic={handleSelectTopic}
        activeQuery={searchQuery}
      />

      {/* 7. Bibliometric Intelligence & Research Distribution */}
      <PublicationAnalytics publications={allPublications} />

      {/* 8. Research Library Control System (Search, Filters, Sort, View Toggle) */}
      <div className="space-y-4">
        <ReportsSearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortOption={sortOption}
          onSortChange={setSortOption}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalFilteredCount={filteredPublications.length}
          totalAvailableCount={allPublications.length}
          savedCount={savedReportIds.length}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        {/* Recently Viewed Strip */}
        <RecentlyViewedReports
          recentIds={recentlyViewedIds}
          allPublications={allPublications}
          onOpenReport={handleOpenPublication}
          onClear={clearRecentlyViewed}
        />

        {/* Publication Results (List / Grid / Table View) */}
        {filteredPublications.length === 0 ? (
          <DataPanel variant="inset" className="text-center py-14 px-4 space-y-3">
            <div className="w-11 h-11 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8] mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F3F6FA]">
              No matching meteorological publications found
            </h3>
            <p className="text-xs text-[#8295A8] max-w-md mx-auto">
              Try adjusting your search terms, exploring a different domain topic, or resetting your filter category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setDateRange([null, null]);
              }}
              className="min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-lg bg-[#0B72B9] hover:bg-[#35C7E8] text-white hover:text-[#07111D] text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 m-focus-ring"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Library Filters</span>
            </button>
          </DataPanel>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPublications.map((pub) => (
              <PublicationItem
                key={pub.id}
                publication={pub}
                viewMode="grid"
                onOpenReport={handleOpenPublication}
                onBookmark={toggleSaveReport}
                isSaved={isReportSaved(pub.id)}
              />
            ))}
          </div>
        ) : viewMode === 'table' ? (
          <DataPanel className="p-4">
            <DataTable
              data={filteredPublications}
              columns={publicationColumns}
              keyExtractor={(pub) => pub.id}
              emptyMessage="No publications match your filter criteria."
            />
          </DataPanel>
        ) : (
          <div className="space-y-3">
            {filteredPublications.map((pub) => (
              <PublicationItem
                key={pub.id}
                publication={pub}
                viewMode="list"
                onOpenReport={handleOpenPublication}
                onBookmark={toggleSaveReport}
                isSaved={isReportSaved(pub.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 9. Institutional Authorities & Data Provenance */}
      <ResearchSourcesSection />

      {/* 10. Slide-in Document Reader Drawer */}
      <ReportPreviewDrawer
        publication={selectedPublication}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onBookmark={toggleSaveReport}
        isSaved={selectedPublication ? isReportSaved(selectedPublication.id) : false}
      />
    </div>
  );
};
