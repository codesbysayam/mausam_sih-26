// ====================================================================
// MAUSAM Unified Editorial & Spatial Top Bar
// Adapts seamlessly between warm editorial paper (Analyze / Classic)
// and high-contrast dark spatial HUD (Explore 3D/2D map workspace).
// ====================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Navigation,
  AlertTriangle,
  ShieldCheck,
  SlidersHorizontal,
  HelpCircle,
  Globe,
  Compass,
  RotateCcw,
  Layers,
  X,
  WifiOff,
  Sun,
  Moon,
  Menu,
  Monitor,
  Presentation,
  Tv,
  Map as MapIcon,
  Loader2,
} from 'lucide-react';
import type { LocationRecord, WeatherAlert } from '../../types';
import {
  searchGlobalLocationsAsync,
  searchGlobalLocationsSync,
} from '../../services/globalGeocodingService';
import { GLOBAL_MAJOR_ANCHORS } from '../../config/globalMapConfig';
import { formatLocationShort, formatLocationTitle } from '../../utils/locationFormatter';
import { useLanguage } from '../../i18n/LanguageContext';
import { useProvider } from '../../store/providerStore';
import { getAlertFeedAvailability } from '../../services/providers/providerStatus';
import {
  DisplayProfile,
  ExperienceMode,
  QualityTier,
  useExperience,
} from '../../context/ExperienceContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { AnimatePresence, motion } from 'motion/react';
import { MOTION_DURATION, MOTION_EASE, MOTION_SPRING } from '../../motion';

interface FloatingBrandBarProps {
  selectedLocation: LocationRecord;
  onSelectLocation: (loc: LocationRecord) => void;
  onDetectLocation: (forceRefresh?: boolean) => Promise<any>;
  isLocating: boolean;
  onOpenLocationCenter: () => void;
  onOpenAskMausam: () => void;
  onOpenMobileMenu?: () => void;
  alerts: WeatherAlert[];
  onSwitchMode: (mode: ExperienceMode) => void;
}

export const FloatingBrandBar: React.FC<FloatingBrandBarProps> = ({
  selectedLocation,
  onSelectLocation,
  onDetectLocation,
  isLocating,
  onOpenLocationCenter,
  onOpenAskMausam,
  onOpenMobileMenu,
  alerts = [],
  onSwitchMode,
}) => {
  const {
    mode,
    surfaceTheme,
    setSurfaceTheme,
    displayProfile,
    setDisplayProfile,
    togglePresentationMode,
    rendererMode,
    setRendererMode,
    mapProjection,
    setMapProjection,
    qualityTier,
    setQualityTier,
    reducedMotion,
    setReducedMotion,
    recenterWorld,
    flyCameraTo,
    openControlsGuide,
    setIsAlertDrawerOpen,
  } = useExperience();

  const { language, setLanguage, availableLanguages } = useLanguage();
  const { state: sachetState } = useProvider('SACHET');
  const sachetAvailability = getAlertFeedAvailability(sachetState);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [remoteSearchResults, setRemoteSearchResults] = useState<LocationRecord[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const localSearchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return GLOBAL_MAJOR_ANCHORS.slice(0, 8);
    return searchGlobalLocationsSync(q).slice(0, 8);
  }, [searchQuery]);

  // Debounced live global Open-Meteo geocoding search for any city, country, island, or airport worldwide
  useEffect(() => {
    const q = searchQuery.trim();
    if (!isSearchOpen || q.length < 2) {
      setRemoteSearchResults([]);
      setIsSearchingGlobal(false);
      return;
    }

    let cancelled = false;
    setIsSearchingGlobal(true);

    const timer = window.setTimeout(async () => {
      try {
        const merged = await searchGlobalLocationsAsync(q);
        if (!cancelled) {
          setRemoteSearchResults(merged.slice(0, 10));
        }
      } catch {
        // Keep local matches silently on offline network
      } finally {
        if (!cancelled) setIsSearchingGlobal(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, isSearchOpen]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return localSearchResults;
    if (remoteSearchResults.length > 0) return remoteSearchResults;
    return localSearchResults;
  }, [searchQuery, localSearchResults, remoteSearchResults]);

  // Close popovers on outside click or Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Derive truthful SACHET / Warning trigger state (strictly distinguish UNAVAILABLE vs VERIFIED ZERO)
  const alertSummary = useMemo(() => {
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    if (sachetAvailability === 'UNAVAILABLE') {
      return {
        label: 'Alert Feed Offline',
        tone: 'text-[var(--m-watch)] border-[var(--m-watch)]/40 bg-[var(--m-watch-soft)]',
        kind: 'offline' as const,
      };
    }
    const activeCount = safeAlerts.length;
    if (activeCount > 0) {
      const hasSevere = safeAlerts.some((a) =>
        ['severe', 'extreme', 'red'].includes(String(a?.severity || '').toLowerCase())
      );
      return {
        label: `${activeCount} Alert${activeCount > 1 ? 's' : ''}`,
        tone: hasSevere
          ? 'text-[var(--m-danger)] border-[var(--m-danger)]/45 bg-[var(--m-danger-soft)]'
          : 'text-[var(--m-alert)] border-[var(--m-alert)]/45 bg-[var(--m-alert-soft)]',
        kind: 'warning' as const,
      };
    }
    return {
      label: 'No Active Alerts',
      tone: 'text-[var(--m-ok)] border-[var(--m-ok)]/35 bg-[var(--m-ok-soft)]',
      kind: 'clear' as const,
    };
  }, [sachetAvailability, alerts]);

  const handleSelectCity = (loc: LocationRecord) => {
    onSelectLocation(loc);
    flyCameraTo(loc.lat, loc.lng, 2.95, 5.8);
    setSearchQuery('');
    setRemoteSearchResults([]);
    setIsSearchOpen(false);
  };

  const isExplore = mode === 'explore';
  const locationPlaceholder = formatLocationShort(selectedLocation);

  // Measure actual rendered Explore header bottom edge (handles 1-row, 2-row, or 3-row wrapping)
  // so LayerDock and WeatherHUD never collide with FloatingBrandBar at any viewport or zoom level.
  useEffect(() => {
    if (typeof document === 'undefined' || !isExplore) return;
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const syncHeaderHeight = () => {
      const rect = headerEl.getBoundingClientRect();
      const bottomPx = Math.max(48, Math.ceil(rect.bottom));
      document.documentElement.style.setProperty('--explore-header-height', `${bottomPx}px`);
    };

    syncHeaderHeight();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncHeaderHeight) : null;
    ro?.observe(headerEl);
    window.addEventListener('resize', syncHeaderHeight);
    window.addEventListener('orientationchange', syncHeaderHeight);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', syncHeaderHeight);
      window.removeEventListener('orientationchange', syncHeaderHeight);
    };
  }, [isExplore]);

  return (
    <header
      ref={headerRef}
      className={
        isExplore
          ? 'explore-brand-bar fixed top-2.5 left-2.5 right-2.5 z-40 pointer-events-none flex flex-wrap items-center justify-between gap-2 safe-area-top'
          : 'sticky top-0 z-40 w-full bg-[var(--m-surface-1)]/95 backdrop-blur-md border-b border-[var(--m-border)] safe-area-top'
      }
      role="banner"
    >
      <div
        className={
          isExplore
            ? 'explore-brand-bar-inner w-full flex flex-wrap items-center justify-between gap-2'
            : 'mausam-page min-h-[64px] py-2 flex flex-wrap items-center justify-between gap-2.5'
        }
      >
        {/* Left Cluster: Mobile Menu + Brand + Location Search & GPS */}
        <div className="explore-brand-cluster pointer-events-auto flex items-center gap-2 sm:gap-2.5 min-w-0 max-w-full">
          {onOpenMobileMenu && (
            <button
              type="button"
              id="header-mobile-menu-button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className={`md:hidden ${
                isExplore
                  ? 'spatial-hud-surface'
                  : 'bg-[var(--m-surface-2)] border border-[var(--m-border)]'
              } rounded-[11px] min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--m-text-primary)] transition-colors cursor-pointer shrink-0 m-focus-ring`}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isExplore) {
                recenterWorld();
              } else {
                onSwitchMode('analyze');
                if (window.location.pathname !== '/') {
                  window.history.pushState({ tab: 'home' }, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }
            }}
            className={`${
              isExplore ? 'spatial-hud-surface rounded-[11px] px-3' : 'rounded-[7px] px-1.5 hover:bg-[var(--m-surface-2)]'
            } min-h-[44px] sm:min-h-[40px] flex items-center gap-2.5 transition-colors cursor-pointer m-focus-ring`}
            title={isExplore ? 'Reset Global World Map view (R)' : 'Return to MAUSAM Overview'}
          >
            <span className="w-7 h-7 rounded-[7px] bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/35 flex items-center justify-center text-[var(--m-accent)] shrink-0">
              <Compass className="w-4 h-4" />
            </span>
            <span className="flex flex-col text-left leading-none">
              <span
                className="text-[14px] font-bold tracking-[0.06em] text-[var(--m-text-primary)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                MAUSAM
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[var(--m-text-muted)] hidden sm:block mt-0.5">
                Atmospheric Observatory
              </span>
            </span>
          </button>

          {/* Quick Search + Location Anchor */}
          <div ref={searchWrapperRef} className="relative flex items-center flex-1 sm:flex-initial min-w-0">
            <div
              className={`${
                isExplore
                  ? 'spatial-hud-surface explore-search-box'
                  : 'bg-[var(--m-surface-2)]/75 border border-[var(--m-border)] focus-within:border-[var(--m-accent)] focus-within:bg-[var(--m-surface-1)] explore-search-box'
              } rounded-[11px] flex items-center min-h-[44px] sm:min-h-[40px] px-2.5 gap-1.5 transition-colors`}
            >
              <Search className="w-3.5 h-3.5 text-[var(--m-text-muted)] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    e.preventDefault();
                    handleSelectCity(searchResults[0]);
                  }
                }}
                placeholder={`${locationPlaceholder} · Search world…`}
                aria-label="Search any city, country, region, airport, or coordinates worldwide"
                className="w-full bg-transparent text-xs font-medium text-[var(--m-text-primary)] placeholder:text-[var(--m-text-secondary)] focus:outline-none truncate"
              />
              {isSearchingGlobal && (
                <Loader2 className="w-3.5 h-3.5 text-[var(--m-accent)] animate-spin shrink-0" />
              )}
              <button
                type="button"
                onClick={async () => {
                  const res = await onDetectLocation(true);
                  if (res && typeof res.lat === 'number' && typeof res.lng === 'number') {
                    flyCameraTo(res.lat, res.lng, 2.9, 6.2);
                  }
                }}
                title="Detect GPS location"
                aria-label="Detect my location via GPS"
                className="min-w-[36px] min-h-[36px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center rounded-md text-[var(--m-accent)] hover:bg-[var(--m-accent-soft)] transition-colors cursor-pointer shrink-0 m-focus-ring"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: MOTION_DURATION.FAST, ease: MOTION_EASE.ENTRANCE }}
                  className="absolute top-12 left-0 w-[min(340px,calc(100vw-24px))] max-h-[min(70dvh,400px)] overflow-hidden spatial-hud-surface-elevated rounded-[11px] p-1.5 z-50"
                >
                  <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[var(--m-border)]">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--m-text-muted)]">
                      {searchQuery.trim()
                        ? isSearchingGlobal
                          ? 'Searching Worldwide…'
                          : 'Global Matches'
                        : 'Global Observatory Hubs'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        onOpenLocationCenter();
                      }}
                      className="text-[11px] font-semibold text-[var(--m-accent)] hover:underline cursor-pointer min-h-[32px] px-1"
                    >
                      Directory →
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin">
                    {searchResults.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-[var(--m-text-muted)]">
                        {isSearchingGlobal
                          ? 'Searching global geocoder…'
                          : 'No matching city, country, or coordinates found. Try "Tokyo", "London", or "35.68, 139.65".'}
                      </div>
                    ) : (
                      searchResults.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelectCity(loc)}
                          className="w-full text-left px-2.5 min-h-[44px] sm:min-h-[40px] py-1.5 rounded-lg hover:bg-[var(--m-surface-2)] flex items-center justify-between gap-2 transition-colors cursor-pointer m-focus-ring"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[var(--m-text-primary)] truncate">
                              {loc.city || loc.name || formatLocationShort(loc)}
                            </div>
                            <div className="text-[11px] text-[var(--m-text-muted)] truncate">
                              {[loc.state, loc.country].filter(Boolean).join(' · ') || formatLocationTitle(loc)}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--m-text-muted)] shrink-0 tabular-nums">
                            {Math.abs(loc.lat).toFixed(1)}°{loc.lat >= 0 ? 'N' : 'S'}, {Math.abs(loc.lng).toFixed(1)}°{loc.lng >= 0 ? 'E' : 'W'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Segmented Mode Switcher: Explore (3D Observatory) / Analyze (Workstation) / Classic (Accessible) */}
        <nav
          aria-label="MAUSAM Experience Mode"
          className={`${
            isExplore
              ? 'spatial-hud-surface'
              : 'bg-[var(--m-surface-2)] border border-[var(--m-border)]'
          } explore-mode-switcher pointer-events-auto rounded-[11px] p-1 flex items-center gap-0.5`}
        >
          {(
            [
              { id: 'explore', label: 'Explore' },
              { id: 'analyze', label: 'Analyze' },
              { id: 'classic', label: 'Classic' },
            ] as Array<{ id: ExperienceMode; label: string }>
          ).map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSwitchMode(item.id)}
                aria-pressed={active}
                className={`relative px-3 min-h-[36px] sm:min-h-[32px] rounded-[7px] text-xs font-semibold transition-colors cursor-pointer m-focus-ring ${
                  active
                    ? 'text-[var(--m-on-accent)]'
                    : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)]/60'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="mausam-mode-pill"
                    transition={MOTION_SPRING.INDICATOR}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[7px] bg-[var(--m-accent)] z-0"
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Cluster: Warnings Status, Ask MAUSAM, Settings & Help */}
        <div className="explore-actions-cluster pointer-events-auto flex items-center gap-1.5">
          {isExplore && (
            <button
              type="button"
              onClick={recenterWorld}
              title="Reset Global World Map view (Shortcut: R)"
              aria-label="Reset Global World Map view"
              className="spatial-hud-surface rounded-[11px] min-h-[40px] px-2.5 hidden md:inline-flex items-center gap-1.5 text-xs text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] transition-colors cursor-pointer m-focus-ring"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>World</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAlertDrawerOpen(true)}
            className={`explore-alert-btn rounded-[11px] min-h-[40px] px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-xs font-semibold border transition-colors cursor-pointer m-focus-ring shrink-0 ${alertSummary.tone}`}
            title="Open SACHET / IMD Hazard Alerts"
          >
            {alertSummary.kind === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : alertSummary.kind === 'offline' ? (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="tabular-nums whitespace-nowrap">
              <span className="hidden sm:inline">{alertSummary.label}</span>
              <span className="sm:hidden">
                {alertSummary.kind === 'warning'
                  ? alertSummary.label
                  : alertSummary.kind === 'offline'
                  ? 'Offline'
                  : 'No Alerts'}
              </span>
            </span>
          </button>

          <button
            type="button"
            id="header-ask-mausam-button"
            onClick={onOpenAskMausam}
            className={`${
              isExplore
                ? 'spatial-hud-surface text-[var(--m-text-primary)]'
                : 'bg-[var(--m-surface-1)] border border-[var(--m-border-strong)] text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)]'
            } rounded-[11px] min-h-[40px] px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer m-focus-ring shrink-0`}
            title="Open Ask MAUSAM Brief"
          >
            <span className="text-[var(--m-accent)] whitespace-nowrap">Ask MAUSAM</span>
          </button>

          <PWAInstallButton isExplore={isExplore} />

          {/* Quick Projector / Presentation Mode Trigger on Laptop+ */}
          <button
            type="button"
            id="header-presentation-mode-button"
            onClick={togglePresentationMode}
            aria-pressed={displayProfile === 'projector'}
            title="Toggle Projector Presentation Mode"
            className={`hidden lg:inline-flex items-center gap-1.5 rounded-[11px] min-h-[40px] px-2.5 text-xs font-semibold border transition-colors cursor-pointer m-focus-ring shrink-0 whitespace-nowrap ${
              displayProfile === 'projector'
                ? 'bg-[var(--m-accent)] text-[#111314] border-[var(--m-accent)]'
                : isExplore
                ? 'spatial-hud-surface text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
                : 'bg-[var(--m-surface-1)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)]'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Present</span>
          </button>

          {/* Render & Accessibility Settings Popover */}
          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSettingsOpen((v) => !v)}
              aria-expanded={isSettingsOpen}
              aria-label="Visual quality, theme, screen display mode, 2D map fallback, and language settings"
              className={`${
                isExplore
                  ? 'spatial-hud-surface'
                  : 'bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] hover:bg-[var(--m-surface-2)]'
              } rounded-[11px] min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer m-focus-ring`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: MOTION_DURATION.FAST, ease: MOTION_EASE.ENTRANCE }}
                  className="absolute right-0 top-12 w-[min(300px,calc(100vw-16px))] max-h-[calc(100dvh-84px)] overflow-y-auto spatial-hud-surface-elevated rounded-[11px] p-3.5 z-50 flex flex-col gap-3 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-2">
                    <span className="font-semibold text-[var(--m-text-primary)]">
                      Display &amp; Accessibility
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      aria-label="Close display settings"
                      className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer m-focus-ring"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Workspace Surface Theme Switcher (Observatory Dark default vs Warm Paper) */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider font-semibold">
                      Workspace Surface Theme
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSurfaceTheme('dark')}
                        aria-pressed={surfaceTheme === 'dark'}
                        className={`min-h-[36px] px-2.5 rounded-lg font-medium border flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring ${
                          surfaceTheme === 'dark'
                            ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)] font-semibold'
                            : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)]'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Observatory Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSurfaceTheme('paper')}
                        aria-pressed={surfaceTheme === 'paper'}
                        className={`min-h-[36px] px-2.5 rounded-lg font-medium border flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring ${
                          surfaceTheme === 'paper'
                            ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)] font-semibold'
                            : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)]'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Warm Paper</span>
                      </button>
                    </div>
                  </div>

                  {/* Screen & Display Profile: Standard / Projector / Smart TV */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--m-border)]">
                    <span className="text-[11px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider font-semibold">
                      Screen &amp; Display Mode
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'standard', label: 'Standard', icon: Monitor },
                          { id: 'projector', label: 'Projector', icon: Presentation },
                          { id: 'tv', label: 'Smart TV', icon: Tv },
                        ] as Array<{
                          id: DisplayProfile;
                          label: string;
                          icon: React.ComponentType<{ className?: string }>;
                        }>
                      ).map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setDisplayProfile(id);
                            if (id === 'projector') setIsSettingsOpen(false);
                          }}
                          aria-pressed={displayProfile === id}
                          className={`min-h-[40px] px-2 rounded-lg font-medium border flex flex-col items-center justify-center gap-0.5 cursor-pointer m-focus-ring ${
                            displayProfile === id
                              ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)] font-semibold'
                              : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-[11px]">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Global Projection & Map Renderer */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--m-border)]">
                    <span className="text-[11px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider font-semibold">
                      Global Map Projection
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRendererMode('3d');
                          setMapProjection('globe');
                        }}
                        aria-pressed={rendererMode === '3d' && mapProjection === 'globe'}
                        className={`min-h-[40px] px-2 rounded-lg font-medium border flex flex-col items-center justify-center gap-0.5 cursor-pointer m-focus-ring ${
                          rendererMode === '3d' && mapProjection === 'globe'
                            ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)] font-semibold'
                            : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)]'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Globe</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRendererMode('3d');
                          setMapProjection('mercator');
                        }}
                        aria-pressed={rendererMode === '3d' && mapProjection === 'mercator'}
                        className={`min-h-[40px] px-2 rounded-lg font-medium border flex flex-col items-center justify-center gap-0.5 cursor-pointer m-focus-ring ${
                          rendererMode === '3d' && mapProjection === 'mercator'
                            ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)] font-semibold'
                            : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)]'
                        }`}
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Flat Map</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRendererMode('2d')}
                        aria-pressed={rendererMode === '2d'}
                        className={`min-h-[40px] px-2 rounded-lg font-medium border flex flex-col items-center justify-center gap-0.5 cursor-pointer m-focus-ring ${
                          rendererMode === '2d'
                            ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)] font-semibold'
                            : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)]'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span className="text-[10px]">2D Fallback</span>
                      </button>
                    </div>
                  </div>

                  {/* Render Quality */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider font-semibold">
                      3D Quality Tier
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {(['auto', 'high', 'balanced', 'low'] as QualityTier[]).map((qt) => (
                        <button
                          key={qt}
                          type="button"
                          onClick={() => setQualityTier(qt)}
                          className={`min-h-[36px] sm:min-h-[32px] rounded text-[11px] capitalize font-medium border cursor-pointer m-focus-ring ${
                            qualityTier === qt
                              ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)] font-semibold'
                              : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)]'
                          }`}
                        >
                          {qt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reduced Motion Toggle */}
                  <label className="flex items-center justify-between gap-2 cursor-pointer pt-1 min-h-[36px]">
                    <span className="text-[var(--m-text-secondary)] font-medium">Reduced Motion</span>
                    <input
                      type="checkbox"
                      checked={reducedMotion}
                      onChange={(e) => setReducedMotion(e.target.checked)}
                      className="accent-[var(--m-accent)] w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {/* Language Switcher */}
                  <div className="flex flex-col gap-1 pt-2 border-t border-[var(--m-border)]">
                    <label
                      htmlFor="spatial-lang-select"
                      className="text-[11px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider font-semibold"
                    >
                      Language
                    </label>
                    <select
                      id="spatial-lang-select"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg px-2.5 min-h-[40px] sm:min-h-[36px] text-xs text-[var(--m-text-primary)] focus:outline-none focus:border-[var(--m-accent)]"
                    >
                      {availableLanguages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.nativeName} ({lang.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isExplore && (
            <button
              type="button"
              onClick={openControlsGuide}
              title="Observatory controls & guided tours (Shortcut: ?)"
              aria-label="Open controls guide and guided tours"
              className="spatial-hud-surface rounded-[11px] min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] transition-colors cursor-pointer m-focus-ring"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
