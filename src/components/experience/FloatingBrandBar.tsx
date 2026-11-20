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
} from 'lucide-react';
import type { LocationRecord, WeatherAlert } from '../../types';
import { locationService } from '../../services/locationService';
import { formatLocationShort, formatLocationTitle } from '../../utils/locationFormatter';
import { useLanguage } from '../../i18n/LanguageContext';
import { useProvider } from '../../store/providerStore';
import { getAlertFeedAvailability } from '../../services/providers/providerStatus';
import {
  ExperienceMode,
  QualityTier,
  RendererMode,
  useExperience,
} from '../../context/ExperienceContext';

interface FloatingBrandBarProps {
  selectedLocation: LocationRecord;
  onSelectLocation: (loc: LocationRecord) => void;
  onDetectLocation: (forceRefresh?: boolean) => Promise<any>;
  isLocating: boolean;
  onOpenLocationCenter: () => void;
  onOpenAskMausam: () => void;
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
  alerts = [],
  onSwitchMode,
}) => {
  const {
    mode,
    surfaceTheme,
    setSurfaceTheme,
    rendererMode,
    setRendererMode,
    qualityTier,
    setQualityTier,
    reducedMotion,
    setReducedMotion,
    recenterIndia,
    flyCameraTo,
    openControlsGuide,
    setIsAlertDrawerOpen,
  } = useExperience();

  const { language, setLanguage, availableLanguages } = useLanguage();
  const { state: sachetState } = useProvider('SACHET');
  const sachetAvailability = getAlertFeedAvailability(sachetState);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return locationService.getAllLocations().slice(0, 6);
    return locationService.searchLocations(q).slice(0, 8);
  }, [searchQuery]);

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
    flyCameraTo(loc.lat, loc.lng, 2.95);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const isExplore = mode === 'explore';
  const locationPlaceholder = formatLocationShort(selectedLocation);

  return (
    <header
      className={
        isExplore
          ? 'fixed top-2.5 left-2.5 right-2.5 z-40 pointer-events-none flex flex-wrap items-center justify-between gap-2 safe-area-top'
          : 'sticky top-0 z-40 w-full bg-[var(--m-surface-1)]/95 backdrop-blur-md border-b border-[var(--m-border)] safe-area-top'
      }
      role="banner"
    >
      <div
        className={
          isExplore
            ? 'w-full flex flex-wrap items-center justify-between gap-2'
            : 'mausam-page min-h-[64px] py-2 flex flex-wrap items-center justify-between gap-2.5'
        }
      >
        {/* Left Cluster: Brand + Location Search & GPS */}
        <div className="pointer-events-auto flex items-center gap-2.5 min-w-0 max-w-full">
          <button
            type="button"
            onClick={() => {
              if (isExplore) {
                recenterIndia();
              } else {
                onSwitchMode('analyze');
                if (window.location.pathname !== '/') {
                  window.history.pushState({ tab: 'home' }, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }
            }}
            className={`${
              isExplore ? 'spatial-hud-surface rounded-xl px-3' : 'rounded-lg px-1.5 hover:bg-[var(--m-surface-2)]'
            } min-h-[44px] sm:min-h-[40px] flex items-center gap-2.5 transition-colors cursor-pointer m-focus-ring`}
            title={isExplore ? 'Recenter 3D Atmospheric Observatory over India (R)' : 'Return to MAUSAM Overview'}
          >
            <span className="w-7 h-7 rounded-lg bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/30 flex items-center justify-center text-[var(--m-accent)] shrink-0">
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
          <div ref={searchWrapperRef} className="relative flex items-center">
            <div
              className={`${
                isExplore
                  ? 'spatial-hud-surface'
                  : 'bg-[var(--m-surface-2)]/75 border border-[var(--m-border)] focus-within:border-[var(--m-accent)] focus-within:bg-[var(--m-surface-1)]'
              } rounded-xl flex items-center min-h-[44px] sm:min-h-[40px] px-2.5 gap-1.5 w-[176px] sm:w-[240px] md:w-[270px] transition-colors`}
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
                placeholder={locationPlaceholder}
                aria-label="Search Indian city, district, or PIN code"
                className="w-full bg-transparent text-xs font-medium text-[var(--m-text-primary)] placeholder:text-[var(--m-text-secondary)] focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={async () => {
                  const res = await onDetectLocation(true);
                  if (res && typeof res.lat === 'number' && typeof res.lng === 'number') {
                    flyCameraTo(res.lat, res.lng, 2.9);
                  }
                }}
                title="Detect GPS location"
                aria-label="Detect my location via GPS"
                className="min-w-[36px] min-h-[36px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center rounded-md text-[var(--m-accent)] hover:bg-[var(--m-accent-soft)] transition-colors cursor-pointer shrink-0 m-focus-ring"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isSearchOpen && (
              <div className="absolute top-12 left-0 w-[290px] sm:w-[320px] spatial-hud-surface-elevated rounded-xl p-1.5 z-50">
                <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[var(--m-border)]">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--m-text-muted)]">
                    {searchQuery.trim() ? 'Matching Locations' : 'Observational Anchors'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      onOpenLocationCenter();
                    }}
                    className="text-[11px] font-semibold text-[var(--m-accent)] hover:underline cursor-pointer min-h-[32px] px-1"
                  >
                    All 36 Regions →
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin">
                  {searchResults.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-[var(--m-text-muted)]">
                      No matching Indian city or PIN.
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
                            {formatLocationShort(loc)}
                          </div>
                          <div className="text-[11px] text-[var(--m-text-muted)] truncate">
                            {formatLocationTitle(loc)}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--m-text-muted)] shrink-0 tabular-nums">
                          {Math.abs(loc.lat).toFixed(1)}°{loc.lat >= 0 ? 'N' : 'S'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Segmented Mode Switcher: Explore (3D Observatory) / Analyze (Workstation) / Classic (Accessible) */}
        <nav
          aria-label="MAUSAM Experience Mode"
          className={`${
            isExplore
              ? 'spatial-hud-surface'
              : 'bg-[var(--m-surface-2)] border border-[var(--m-border)]'
          } pointer-events-auto rounded-xl p-1 flex items-center gap-0.5`}
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
                className={`px-3 min-h-[36px] sm:min-h-[32px] rounded-lg text-xs font-semibold transition-colors cursor-pointer m-focus-ring ${
                  active
                    ? 'bg-[var(--m-text-primary)] text-[var(--m-canvas)]'
                    : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)]/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Cluster: Warnings Status, Ask MAUSAM, Settings & Help */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {isExplore && (
            <button
              type="button"
              onClick={recenterIndia}
              title="Recenter India view (Shortcut: R)"
              aria-label="Recenter India view"
              className="spatial-hud-surface rounded-xl min-h-[40px] px-2.5 hidden md:inline-flex items-center gap-1.5 text-xs text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] transition-colors cursor-pointer m-focus-ring"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>India</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAlertDrawerOpen(true)}
            className={`rounded-xl min-h-[44px] sm:min-h-[40px] px-3 inline-flex items-center gap-1.5 text-xs font-semibold border transition-colors cursor-pointer m-focus-ring ${alertSummary.tone}`}
            title="Open SACHET / IMD Hazard Alerts"
          >
            {alertSummary.kind === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : alertSummary.kind === 'offline' ? (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="tabular-nums">{alertSummary.label}</span>
          </button>

          <button
            type="button"
            id="header-ask-mausam-button"
            onClick={onOpenAskMausam}
            className={`${
              isExplore
                ? 'spatial-hud-surface text-[var(--m-text-primary)]'
                : 'bg-[var(--m-surface-1)] border border-[var(--m-border-strong)] text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)]'
            } rounded-xl min-h-[40px] px-3 hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer m-focus-ring`}
            title="Open Ask MAUSAM Brief"
          >
            <span className="text-[var(--m-accent)]">Ask MAUSAM</span>
          </button>

          {/* Render & Accessibility Settings Popover */}
          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSettingsOpen((v) => !v)}
              aria-expanded={isSettingsOpen}
              aria-label="Visual quality, theme, 2D map fallback, and language settings"
              className={`${
                isExplore
                  ? 'spatial-hud-surface'
                  : 'bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] hover:bg-[var(--m-surface-2)]'
              } rounded-xl min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer m-focus-ring`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-12 w-72 spatial-hud-surface-elevated rounded-xl p-3.5 z-50 flex flex-col gap-3 text-xs">
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

                {/* Analyze Surface Theme Switcher (Observatory Dark default vs Warm Paper) */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider font-semibold">
                    Analyze Surface Theme
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

                {/* 3D Observatory vs 2D Interactive Map */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--m-border)]">
                  <span className="text-[11px] font-mono text-[var(--m-text-muted)] uppercase tracking-wider font-semibold">
                    Explore Spatial Viewport
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['3d', '2d'] as RendererMode[]).map((rm) => (
                      <button
                        key={rm}
                        type="button"
                        onClick={() => setRendererMode(rm)}
                        className={`min-h-[40px] sm:min-h-[36px] px-2.5 rounded-lg font-medium border flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring ${
                          rendererMode === rm
                            ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)] font-semibold'
                            : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)]'
                        }`}
                      >
                        {rm === '3d' ? <Globe className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                        <span>{rm === '3d' ? '3D Observatory' : '2D Map'}</span>
                      </button>
                    ))}
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
              </div>
            )}
          </div>

          {isExplore && (
            <button
              type="button"
              onClick={openControlsGuide}
              title="Observatory controls & guided tours (Shortcut: ?)"
              aria-label="Open controls guide and guided tours"
              className="spatial-hud-surface rounded-xl min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] transition-colors cursor-pointer m-focus-ring"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
