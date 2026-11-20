import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import {
  fetchWeatherNews,
  WeatherNewsCategory,
  WeatherNewsPayload,
} from '../../services/warningNewsService';
import { formatIndianDateTime } from '../../utils/dateUtils';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface WeatherNewsSectionProps {
  /** ISO timestamp of the newest official IMD/SACHET bulletin for precedence comparison */
  latestOfficialBulletinIso?: string | null;
  selectedRegion?: string | null;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

const CATEGORY_TABS: { id: WeatherNewsCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'cyclone', label: 'Cyclone' },
  { id: 'rainfall', label: 'Rainfall' },
  { id: 'thunderstorm', label: 'Thunderstorm' },
  { id: 'flood', label: 'Flood' },
  { id: 'aqi', label: 'Air Quality' },
  { id: 'agriculture', label: 'Agriculture' },
];

export const WeatherNewsSection: React.FC<WeatherNewsSectionProps> = ({
  latestOfficialBulletinIso,
  selectedRegion,
  compact = false,
  title = 'Weather News & Situation Reports',
  subtitle = 'Contextual media reporting aggregated via RSS — never treated as an official warning',
}) => {
  const [payload, setPayload] = useState<WeatherNewsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<WeatherNewsCategory>('all');
  const [regionFilter, setRegionFilter] = useState<string>('');

  const loadNews = useCallback(async (force = false) => {
    setIsLoading(true);
    try {
      const data = await fetchWeatherNews({ force });
      setPayload(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews(false);
  }, [loadNews]);

  const effectiveRegion = regionFilter.trim() || (selectedRegion && selectedRegion !== 'all' ? selectedRegion : '');

  const filteredArticles = useMemo(() => {
    if (!payload?.articles) return [];
    return payload.articles.filter((art) => {
      const matchCat = activeCategory === 'all' || art.category === activeCategory;
      const matchReg =
        !effectiveRegion ||
        art.regionTags.some((r) => r.toLowerCase().includes(effectiveRegion.toLowerCase())) ||
        art.title.toLowerCase().includes(effectiveRegion.toLowerCase());
      return matchCat && matchReg;
    });
  }, [payload, activeCategory, effectiveRegion]);

  // Determine whether the latest official IMD/SACHET bulletin is newer than the newest media article
  const officialNewerThanMedia = useMemo(() => {
    if (!latestOfficialBulletinIso) return false;
    const officialMs = new Date(latestOfficialBulletinIso).getTime();
    if (Number.isNaN(officialMs)) return false;
    const newestArticleMs = payload?.articles?.[0]?.publishedAt
      ? new Date(payload.articles[0].publishedAt).getTime()
      : 0;
    return officialMs > newestArticleMs;
  }, [latestOfficialBulletinIso, payload]);

  const officialMs = useMemo(() => {
    if (!latestOfficialBulletinIso) return null;
    const ms = new Date(latestOfficialBulletinIso).getTime();
    return Number.isNaN(ms) ? null : ms;
  }, [latestOfficialBulletinIso]);

  const displayedArticles = compact ? filteredArticles.slice(0, 6) : filteredArticles.slice(0, 12);

  return (
    <DataPanel id="weather-news-situation-reports" className="flex flex-col gap-4">
      <SectionHeading
        title={title}
        subtitle={subtitle}
        icon={<Newspaper className="w-4 h-4" />}
        badge={
          <SourceStatus
            status={
              isLoading && !payload
                ? 'LOADING'
                : payload?.status === 'UNAVAILABLE'
                ? 'UNAVAILABLE'
                : payload?.status === 'STALE'
                ? 'STALE'
                : 'REFERENCE'
            }
            labelOverride={
              isLoading && !payload
                ? 'FETCHING RSS'
                : payload?.status === 'UNAVAILABLE'
                ? 'RSS UNAVAILABLE'
                : payload?.status === 'STALE'
                ? 'MEDIA CACHE STALE'
                : 'MEDIA CONTEXT ONLY'
            }
          />
        }
        action={
          <button
            type="button"
            onClick={() => loadNews(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs font-mono text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync News</span>
          </button>
        }
      />

      {/* Official IMD Precedence Notice */}
      <div className="rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-start gap-2 text-[var(--m-text-secondary)]">
          <ShieldAlert className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
          <span>
            <strong className="text-[var(--m-text-primary)]">Official Precedence Rule:</strong>{' '}
            Media articles provide situational context only and cannot issue, downgrade, or cancel official alerts.
            {officialNewerThanMedia && latestOfficialBulletinIso && (
              <span className="text-[var(--m-accent)] font-mono ml-1.5">
                Newer official bulletin issued {formatIndianDateTime(latestOfficialBulletinIso)}.
              </span>
            )}
          </span>
        </div>
        <a
          href="https://mausam.imd.gov.in/responsive/cyclone_bulletin_archive.php"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[var(--m-accent)] hover:underline shrink-0"
        >
          <span>Official IMD Bulletin Archive</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Category & Region Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1.5 min-h-[34px] rounded-lg text-[11px] font-mono font-semibold border transition-colors cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] border-[var(--m-accent)]'
                    : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] border-[var(--m-border)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[200px]">
          <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--m-text-muted)] pointer-events-none" />
          <input
            type="text"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            placeholder={selectedRegion && selectedRegion !== 'all' ? `Region: ${selectedRegion}` : 'Filter by state or topic...'}
            className="w-full min-h-[34px] pl-8 pr-3 py-1 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-xs text-[var(--m-text-primary)] placeholder-[var(--m-text-muted)] focus:outline-none focus:border-[var(--m-accent)]"
          />
        </div>
      </div>

      {/* Articles Grid or Honest Unavailable State */}
      {isLoading && !payload ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="m-panel-inset p-4 h-36 animate-pulse flex flex-col justify-between"
            >
              <div className="h-3 w-24 bg-[var(--m-surface-2)] rounded" />
              <div className="h-4 w-full bg-[var(--m-surface-2)] rounded" />
              <div className="h-3 w-2/3 bg-[var(--m-surface-2)] rounded" />
            </div>
          ))}
        </div>
      ) : payload?.status === 'UNAVAILABLE' || !payload ? (
        <div className="space-y-3">
          <UnavailableState
            title="Weather News RSS Feed Temporarily Unavailable"
            reason={
              payload?.error ||
              'The server-side weather news aggregation endpoint could not reach upstream RSS wires. No sample news cards are shown.'
            }
            source="MAUSAM Server RSS Aggregator"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {(payload?.officialSources || []).map((src) => (
              <a
                key={src.url}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="m-panel-inset p-3 flex flex-col justify-between gap-1.5 hover:border-[var(--m-accent)] transition-colors"
              >
                <span className="text-[10px] font-mono uppercase text-[var(--m-accent)]">{src.category}</span>
                <span className="text-xs font-semibold text-[var(--m-text-primary)] leading-snug">{src.title}</span>
                <span className="text-[10px] font-mono text-[var(--m-text-muted)] flex items-center justify-between">
                  <span>{src.authority}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : displayedArticles.length === 0 ? (
        <div className="m-panel-inset p-6 text-center text-xs text-[var(--m-text-muted)] font-mono">
          No weather news articles matched the active category/region filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedArticles.map((art) => {
            const artMs = art.publishedAt ? new Date(art.publishedAt).getTime() : null;
            const isSupersededForecast =
              art.category === 'cyclone' &&
              officialMs !== null &&
              artMs !== null &&
              artMs < officialMs - 6 * 3600 * 1000;

            return (
              <article
                key={art.id}
                className="m-panel-inset p-3.5 flex flex-col justify-between gap-2.5 hover:border-[var(--m-border-strong)] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-accent)]">
                        {art.category}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--m-text-secondary)] truncate max-w-[140px]">
                        {art.publisher}
                      </span>
                    </div>

                    {art.isStale ? (
                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--m-watch-soft)] text-[var(--m-watch)] border border-[var(--m-watch)]/35">
                        STALE (&gt;{payload.freshnessWindowHours}h)
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--m-surface-2)] text-[var(--m-text-muted)] border border-[var(--m-border)]">
                        MEDIA REPORT
                      </span>
                    )}
                  </div>

                  <a
                    href={art.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs sm:text-[13px] font-semibold text-[var(--m-text-primary)] hover:text-[var(--m-accent)] transition-colors leading-snug line-clamp-3"
                  >
                    {art.title}
                  </a>

                  {isSupersededForecast && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/30 text-[10px] font-mono text-[var(--m-watch)]">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Earlier coverage — superseded by newer official IMD bulletin</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--m-border)] flex flex-col gap-1 text-[10px] font-mono text-[var(--m-text-muted)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 truncate">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>
                        Published:{' '}
                        {art.publishedAt ? formatIndianDateTime(art.publishedAt) : 'Timestamp unavailable'}
                      </span>
                    </span>
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--m-accent)] hover:underline shrink-0"
                      aria-label={`Open article from ${art.publisher}`}
                    >
                      <span>Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-[9px] opacity-80">
                    <span>Fetched: {formatIndianDateTime(art.fetchedAt)}</span>
                    <span>{art.regionTags.slice(0, 2).join(' · ')}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </DataPanel>
  );
};
