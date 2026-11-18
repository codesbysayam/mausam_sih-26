// ====================================================================
// MAUSAM Single Floating Top Brand & Mode Bar
// Replaces stacked GovernmentHeader + MainNavigation in Explore mode
// with one streamlined atmospheric control bar.
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
} from 'lucide-react';
import type { LocationRecord, WeatherAlert } from '../../types';
import { locationService } from '../../services/locationService';
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

  // Close popovers on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Derive truthful SACHET / Warning trigger state (distinguish UNAVAILABLE vs ALL CLEAR)
  const alertSummary = useMemo(() => {
    const safeAlerts = Array.isArray(alerts) ? alerts : [];
    if (sachetAvailability === 'UNAVAILABLE') {
      return {
        label: 'Feed Offline',
        tone: 'text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10',
        isWarning: false,
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
          ? 'text-[#FCA5A5] border-[#EF4444]/50 bg-[#EF4444]/15'
          : 'text-[#FDBA74] border-[#F97316]/45 bg-[#F97316]/12',
        isWarning: true,
      };
    }
    return {
      label: 'All Clear',
      tone: 'text-[#22C7A0] border-[#22C7A0]/35 bg-[#22C7A0]/10',
      isWarning: false,
    };
  }, [sachetAvailability, alerts]);

  const handleSelectCity = (loc: LocationRecord) => {
    onSelectLocation(loc);
    flyCameraTo(loc.lat, loc.lng, 2.95);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return (
    <header
      className="fixed top-2.5 left-2.5 right-2.5 z-40 pointer-events-none flex flex-wrap items-center justify-between gap-2 safe-area-top"
      role="banner"
    >
      {/* Left Cluster: Compact Brand + Search & GPS */}
      <div className="pointer-events-auto flex items-center gap-2 min-w-0 max-w-full">
        <button
          type="button"
          onClick={() => {
            onSwitchMode('explore');
            recenterIndia();
          }}
          className="spatial-hud-surface rounded-xl px-3 min-h-[44px] sm:min-h-[40px] flex items-center gap-2.5 hover:border-[#38536A] transition-colors cursor-pointer spatial-focus-ring"
          title="Recenter MAUSAM 3D Atmosphere over India"
        >
          <span className="w-6 h-6 rounded-md bg-[#35C7E8]/15 border border-[#35C7E8]/40 flex items-center justify-center text-[#35C7E8] shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </span>
          <span className="flex flex-col text-left leading-none">
            <span className="text-[13px] font-bold tracking-[0.08em] text-[#F3F6FA]">MAUSAM</span>
            <span className="text-[10px] text-[#8295A8] hidden sm:block mt-0.5">
              Atmospheric Intelligence
            </span>
          </span>
        </button>

        {/* Quick Search + Location Anchor */}
        <div ref={searchWrapperRef} className="relative flex items-center">
          <div className="spatial-hud-surface rounded-xl flex items-center min-h-[44px] sm:min-h-[40px] px-2.5 gap-1.5 w-[178px] sm:w-[250px] md:w-[280px]">
            <Search className="w-3.5 h-3.5 text-[#8295A8] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder={selectedLocation.displayName}
              aria-label="Search Indian city, district, or PIN code"
              className="w-full bg-transparent text-xs text-[#F3F6FA] placeholder-[#B5C3D1] focus:outline-none truncate"
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
              className="min-w-[36px] min-h-[36px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center rounded-md text-[#35C7E8] hover:bg-[#35C7E8]/15 transition-colors cursor-pointer shrink-0 spatial-focus-ring"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isSearchOpen && (
            <div className="absolute top-12 left-0 w-[290px] sm:w-[320px] spatial-hud-surface-elevated rounded-xl p-1.5 z-50">
              <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[#26394B]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8295A8]">
                  {searchQuery.trim() ? 'Matching Stations' : 'Observational Anchors'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    onOpenLocationCenter();
                  }}
                  className="text-[11px] font-medium text-[#35C7E8] hover:underline cursor-pointer min-h-[32px] px-1"
                >
                  All 36 Regions →
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin">
                {searchResults.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-[#8295A8]">No matching Indian city or PIN.</div>
                ) : (
                  searchResults.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectCity(loc)}
                      className="w-full text-left px-2.5 min-h-[44px] sm:min-h-[40px] py-1.5 rounded-lg hover:bg-[#35C7E8]/12 flex items-center justify-between gap-2 transition-colors cursor-pointer spatial-focus-ring"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#F3F6FA] truncate">
                          {loc.city || loc.displayName}
                        </div>
                        <div className="text-[10px] text-[#8295A8] truncate">
                          {loc.district}, {loc.state}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#8295A8] shrink-0 tabular-nums">
                        {loc.lat.toFixed(1)}°N
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Segmented Mode Switcher: Explore / Analyze / Classic */}
      <nav
        aria-label="MAUSAM Experience Mode"
        className="pointer-events-auto spatial-hud-surface rounded-xl p-1 flex items-center gap-0.5"
      >
        {(['explore', 'analyze', 'classic'] as ExperienceMode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSwitchMode(m)}
              aria-pressed={active}
              className={`px-3 min-h-[36px] sm:min-h-[32px] rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer spatial-focus-ring ${
                active
                  ? 'bg-[#35C7E8] text-[#07111D]'
                  : 'text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E]'
              }`}
            >
              {m}
            </button>
          );
        })}
      </nav>

      {/* Right Cluster: Warnings Status, Ask MAUSAM, Settings & Help */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        {mode === 'explore' && (
          <button
            type="button"
            onClick={recenterIndia}
            title="Recenter India view (Shortcut: R)"
            aria-label="Recenter India view"
            className="spatial-hud-surface rounded-xl min-h-[40px] px-2.5 hidden md:inline-flex items-center gap-1.5 text-xs text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A] transition-colors cursor-pointer spatial-focus-ring"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#35C7E8]" />
            <span>India</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsAlertDrawerOpen(true)}
          className={`spatial-hud-surface rounded-xl min-h-[44px] sm:min-h-[40px] px-3 inline-flex items-center gap-1.5 text-xs font-semibold border transition-colors cursor-pointer spatial-focus-ring ${alertSummary.tone}`}
          title="Open SACHET / IMD Hazard Alerts"
        >
          {alertSummary.isWarning ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="tabular-nums">{alertSummary.label}</span>
        </button>

        <button
          type="button"
          onClick={onOpenAskMausam}
          className="spatial-hud-surface rounded-xl min-h-[40px] px-3 hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#F3F6FA] hover:border-[#38536A] transition-colors cursor-pointer spatial-focus-ring"
          title="Open Ask MAUSAM Brief"
        >
          <span className="text-[#35C7E8] font-semibold">Ask MAUSAM</span>
        </button>

        {/* Render & Accessibility Settings Popover */}
        <div ref={settingsRef} className="relative">
          <button
            type="button"
            onClick={() => setIsSettingsOpen((v) => !v)}
            aria-expanded={isSettingsOpen}
            aria-label="Visual quality, 2D map fallback, and language settings"
            className="spatial-hud-surface rounded-xl min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A] transition-colors cursor-pointer spatial-focus-ring"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {isSettingsOpen && (
            <div className="absolute right-0 top-12 w-72 spatial-hud-surface-elevated rounded-xl p-3.5 z-50 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#26394B] pb-2">
                <span className="font-semibold text-[#F3F6FA]">Display &amp; Accessibility</span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  aria-label="Close display settings"
                  className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#101F2E] cursor-pointer spatial-focus-ring"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 3D Globe vs 2D Interactive Map */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-[#8295A8] uppercase tracking-wider font-semibold">
                  Spatial Viewport
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['3d', '2d'] as RendererMode[]).map((rm) => (
                    <button
                      key={rm}
                      type="button"
                      onClick={() => setRendererMode(rm)}
                      className={`min-h-[40px] sm:min-h-[36px] px-2.5 rounded-lg font-medium border flex items-center justify-center gap-1.5 cursor-pointer spatial-focus-ring ${
                        rendererMode === rm
                          ? 'bg-[#35C7E8]/20 border-[#35C7E8] text-[#F3F6FA]'
                          : 'bg-[#08131F] border-[#26394B] text-[#B5C3D1] hover:border-[#38536A]'
                      }`}
                    >
                      {rm === '3d' ? <Globe className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                      <span>{rm === '3d' ? '3D Globe' : '2D Map'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Quality */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-[#8295A8] uppercase tracking-wider font-semibold">
                  3D Quality Tier
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {(['auto', 'high', 'balanced', 'low'] as QualityTier[]).map((qt) => (
                    <button
                      key={qt}
                      type="button"
                      onClick={() => setQualityTier(qt)}
                      className={`min-h-[36px] sm:min-h-[32px] rounded text-[11px] capitalize font-medium border cursor-pointer spatial-focus-ring ${
                        qualityTier === qt
                          ? 'bg-[#35C7E8]/20 border-[#35C7E8] text-[#F3F6FA]'
                          : 'bg-[#08131F] border-[#26394B] text-[#B5C3D1] hover:border-[#38536A]'
                      }`}
                    >
                      {qt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reduced Motion Toggle */}
              <label className="flex items-center justify-between gap-2 cursor-pointer pt-1 min-h-[36px]">
                <span className="text-[#B5C3D1]">Reduced Motion</span>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="accent-[#35C7E8] w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Language Switcher */}
              <div className="flex flex-col gap-1 pt-2 border-t border-[#26394B]">
                <label
                  htmlFor="spatial-lang-select"
                  className="text-[11px] text-[#8295A8] uppercase tracking-wider font-semibold"
                >
                  Language
                </label>
                <select
                  id="spatial-lang-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-[#08131F] border border-[#26394B] rounded-lg px-2.5 min-h-[40px] sm:min-h-[36px] text-xs text-[#F3F6FA] focus:outline-none focus:border-[#35C7E8]"
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

        {mode === 'explore' && (
          <button
            type="button"
            onClick={openControlsGuide}
            title="Spatial navigation guide & tours"
            aria-label="Open controls guide and guided tours"
            className="spatial-hud-surface rounded-xl min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A] transition-colors cursor-pointer spatial-focus-ring"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
