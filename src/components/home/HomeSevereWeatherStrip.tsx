import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  CloudRain,
  CloudLightning,
  Wind,
  Flame,
  CloudFog,
  Waves,
  Sun,
  Snowflake,
  ChevronRight,
  Shield,
  X,
  PhoneCall,
  ExternalLink,
  Clock,
  Compass,
  Radio,
  MapPin,
  RefreshCw,
  Info,
  Check,
} from 'lucide-react';
import { WeatherAlert, LocationRecord } from '../../types';
import {
  getApplicableWarning,
  ParsedAlertCenterData,
  HazardType,
} from '../../services/alertParser';
import { warningService } from '../../services/warnings/warningService';
import { WeatherWarning, LocationWarningResult } from '../../types/warnings';
import { formatISTTime } from '../../services/warnings/warningAdapter';
import { SkeletonAlertCenter } from '../common/Skeletons';
import { WarningLanguageSelector } from '../warnings/WarningLanguageSelector';
import {
  getRegionLanguageConfig,
  getLocalizedStateName,
  RegionLanguageConfig,
  SupportedLanguageMode,
} from '../../types/regionLanguages';
import {
  getAlertLabel,
  getLocalizedHazard,
  getLocalizedSeverity,
} from '../../services/warnings/translations/warningTranslations';
import {
  getLocalizedWarningContent,
  LocalizedWarningDisplay,
} from '../../services/warnings/translations/warningTextTranslator';

function formatCountdownRemaining(validUntilIso?: string | null): string {
  if (!validUntilIso) return 'Active synoptic cycle';
  const exp = new Date(validUntilIso).getTime();
  if (isNaN(exp)) return 'Active synoptic cycle';
  const diffMs = exp - Date.now();
  if (diffMs <= 0) return 'Expired';
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours > 0) {
    return `Valid for: ${hours}h ${mins}m`;
  }
  return `Valid for: ${mins}m`;
}

export interface HomeSevereWeatherStripProps {
  alerts?: WeatherAlert[];
  selectedLocation?: LocationRecord;
  lastUpdated?: string;
  onNavigateToWarnings?: () => void;
}

/**
 * Returns dynamic meteorological hazard icon according to verified IMD hazard classification
 */
const HazardIcon: React.FC<{ hazardType: HazardType; className?: string }> = ({
  hazardType,
  className = 'w-5 h-5',
}) => {
  switch (hazardType) {
    case 'heavy_rain':
      return <CloudRain className={className} />;
    case 'thunderstorm':
      return <CloudLightning className={className} />;
    case 'cyclone':
      return <Wind className={className} />;
    case 'heatwave':
      return <Flame className={className} />;
    case 'cold_wave':
      return <Snowflake className={className} />;
    case 'dense_fog':
      return <CloudFog className={className} />;
    case 'flood':
      return <Waves className={className} />;
    case 'strong_wind':
      return <Wind className={className} />;
    case 'routine':
      return <Sun className={className} />;
    case 'coastal':
      return <Compass className={className} />;
    default:
      return <AlertTriangle className={className} />;
  }
};

export const HomeSevereWeatherStrip: React.FC<HomeSevereWeatherStripProps> = ({
  selectedLocation,
  lastUpdated,
  onNavigateToWarnings,
}) => {
  const [data, setData] = useState<ParsedAlertCenterData | null>(null);
  const [locationResult, setLocationResult] = useState<LocationWarningResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState<boolean>(false);
  const [isWarningDetailModalOpen, setIsWarningDetailModalOpen] = useState<boolean>(false);
  const [selectedDetailWarning, setSelectedDetailWarning] = useState<WeatherWarning | null>(null);
  const [isAllWarningsModalOpen, setIsAllWarningsModalOpen] = useState<boolean>(false);
  const [selectedDistrictDetail, setSelectedDistrictDetail] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState<string>('');

  // Multilingual preference persistence
  const [languageMode, setLanguageMode] = useState<SupportedLanguageMode>(() => {
    try {
      const saved = localStorage.getItem('mausam_alert_language_mode');
      if (saved === 'en' || saved === 'hi' || saved === 'regional') {
        return saved;
      }
    } catch {}
    return 'regional';
  });

  const handleSelectLanguageMode = useCallback((mode: SupportedLanguageMode) => {
    setLanguageMode(mode);
    try {
      localStorage.setItem('mausam_alert_language_mode', mode);
      window.dispatchEvent(
        new CustomEvent<SupportedLanguageMode>('mausam_language_mode_change', {
          detail: mode,
        })
      );
    } catch {}
  }, []);

  // Listen to cross-component and storage language events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mausam_alert_language_mode' && e.newValue) {
        if (e.newValue === 'en' || e.newValue === 'hi' || e.newValue === 'regional') {
          setLanguageMode(e.newValue);
        }
      }
    };
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<SupportedLanguageMode>;
      if (
        customEvent.detail === 'en' ||
        customEvent.detail === 'hi' ||
        customEvent.detail === 'regional'
      ) {
        setLanguageMode(customEvent.detail);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('mausam_language_mode_change', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mausam_language_mode_change', handleCustomChange);
    };
  }, []);

  // Determine state/UT for language configuration registry
  const stateOrRegion =
    selectedLocation?.state ||
    locationResult?.primaryWarning?.state ||
    selectedLocation?.city ||
    'Odisha';

  const regionConfig: RegionLanguageConfig = useMemo(() => {
    return getRegionLanguageConfig(stateOrRegion);
  }, [stateOrRegion]);

  // Fallback language resolution (regional -> Hindi -> English)
  const effectiveLangCode = useMemo(() => {
    if (languageMode === 'en') return 'en';
    if (languageMode === 'hi') return 'hi';
    return regionConfig.regionalLanguageCode || regionConfig.primaryRegionalCode || 'en';
  }, [languageMode, regionConfig]);

  const activeWarning = selectedDetailWarning || locationResult?.primaryWarning;
  const localizedDisplay: LocalizedWarningDisplay = useMemo(() => {
    return getLocalizedWarningContent(activeWarning, effectiveLangCode, regionConfig);
  }, [activeWarning, effectiveLangCode, regionConfig]);

  const isEnglish = effectiveLangCode === 'en';
  const caseStyle = isEnglish ? 'uppercase' : '';

  // Fetch official verified warning data whenever location changes
  const fetchWarningData = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const [parsed, locRes] = await Promise.all([
          getApplicableWarning(selectedLocation, forceRefresh),
          warningService.getWarningForLocation(selectedLocation, forceRefresh),
        ]);
        setData(parsed);
        setLocationResult(locRes);
        if (locRes.primaryWarning) {
          setSelectedDetailWarning(locRes.primaryWarning);
        }
      } catch {
        // Handled internally in alertParser and warningService - never throws unhandled
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedLocation]
  );

  useEffect(() => {
    fetchWarningData(false);
  }, [fetchWarningData]);

  // Live countdown timer updating every 30 seconds, auto-refreshing on expiry
  useEffect(() => {
    const updateCountdown = () => {
      const activeWarn = selectedDetailWarning || locationResult?.primaryWarning;
      if (activeWarn?.validUntil) {
        const remaining = formatCountdownRemaining(activeWarn.validUntil);
        setCountdownText(remaining);
        if (remaining === 'Expired') {
          fetchWarningData(true);
        }
      } else {
        setCountdownText('Active synoptic cycle');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [selectedDetailWarning, locationResult, fetchWarningData]);

  // Status configuration for command-center indicator (v3.0.0 Observatory tokens, zero left-rail borders)
  const statusTheme = useMemo(() => {
    if (!data) {
      return {
        cardBorder: 'border-[#26394B]',
        bg: 'bg-[#0B1927]',
        badgeBg: 'bg-[#8295A8]/12 text-[#B5C3D1] border-[#38536A]',
        dotColor: 'bg-[#8295A8]',
        accentColor: 'text-[#8295A8]',
      };
    }

    switch (data.uiState) {
      case 'RED_ALERT':
        return {
          cardBorder: 'border-[#EF4444]/45',
          bg: 'bg-[#160B10]',
          badgeBg: 'bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/45',
          dotColor: 'bg-[#EF4444]',
          accentColor: 'text-[#FCA5A5]',
        };
      case 'ORANGE_ALERT':
        return {
          cardBorder: 'border-[#F97316]/45',
          bg: 'bg-[#161009]',
          badgeBg: 'bg-[#F97316]/15 text-[#FDBA74] border-[#F97316]/45',
          dotColor: 'bg-[#F97316]',
          accentColor: 'text-[#FDBA74]',
        };
      case 'WATCH_ADVISORY':
        return {
          cardBorder: 'border-[#F59E0B]/40',
          bg: 'bg-[#141209]',
          badgeBg: 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40',
          dotColor: 'bg-[#F59E0B]',
          accentColor: 'text-[#FCD34D]',
        };
      case 'NOT_APPLICABLE':
        return {
          cardBorder: 'border-[#35C7E8]/35',
          bg: 'bg-[#0B1927]',
          badgeBg: 'bg-[#35C7E8]/12 text-[#7DD3FC] border-[#35C7E8]/35',
          dotColor: 'bg-[#35C7E8]',
          accentColor: 'text-[#35C7E8]',
        };
      case 'DATA_UNAVAILABLE':
        return {
          cardBorder: 'border-[#26394B]',
          bg: 'bg-[#0B1927]',
          badgeBg: 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35',
          dotColor: 'bg-[#F59E0B]',
          accentColor: 'text-[#FCD34D]',
        };
      case 'NO_ACTIVE_WARNING':
      default:
        return {
          cardBorder: 'border-[#22C7A0]/35',
          bg: 'bg-[#0B1927]',
          badgeBg: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35',
          dotColor: 'bg-[#22C7A0]',
          accentColor: 'text-[#6EE7B7]',
        };
    }
  }, [data]);

  // Loading skeleton state
  if (isLoading && !data) {
    return <SkeletonAlertCenter />;
  }

  // Fallback safe reference
  const currentData = data || {
    uiState: 'DATA_UNAVAILABLE' as const,
    statusBadge: { label: 'DATA UNAVAILABLE' as const, color: 'neutral' as const, pulse: false },
    severity: 'neutral' as const,
    severityText: 'DATA UNAVAILABLE',
    scope: 'LOCAL' as const,
    scopeLabel: 'DATA FEED',
    hazardType: 'general' as const,
    hazardHeadline: 'WARNING DATA CURRENTLY UNAVAILABLE',
    regionSubdivision: selectedLocation?.city || 'Selected Location',
    affectedDistricts: [],
    affectedCount: 0,
    summary: 'Official real-time warning telemetry is temporarily unreachable. Surface observations and radar remain active.',
    metrics: {
      affectedText: 'Unavailable',
      severityText: 'Unavailable',
      validUntilText: 'Unavailable',
      issuedAtText: 'Unavailable',
    },
    timeline: null,
    actions: {
      canViewFullWarning: false,
      hasSafetyGuidance: false,
      recommendedActions: [],
    },
    trust: {
      source: 'IMD',
      updatedAt: 'Unavailable',
      status: 'UNAVAILABLE' as const,
      isLiveTelemetry: false,
    },
    additionalActiveCount: 0,
    isExpired: false,
    rawResponse: null,
  };

  const isActiveAlert =
    currentData.uiState === 'RED_ALERT' ||
    currentData.uiState === 'ORANGE_ALERT' ||
    currentData.uiState === 'WATCH_ADVISORY' ||
    currentData.uiState === 'OPERATIONAL' ||
    currentData.uiState === 'OPERATIONAL_WITH_FALLBACK';

  const isUnavailable =
    currentData.uiState === 'PROVIDER_UNAVAILABLE' ||
    currentData.uiState === 'DATA_UNAVAILABLE';

  // ─────────────────────────────────────────────────────────────
  // 9. NO-WARNING STATE / ALL CLEAR (Calm Green Visual Treatment)
  // Allowed ONLY when valid official feed responded with 0 warnings!
  // ─────────────────────────────────────────────────────────────
  if (!isActiveAlert && !isUnavailable && currentData.uiState !== 'NOT_APPLICABLE') {
    return (
      <section
        id="severe-weather-alert-center"
        aria-label="National Weather Alert Center"
        className={`w-full rounded-xl border ${statusTheme.cardBorder} ${statusTheme.bg} p-4 sm:p-5 transition-colors`}
      >
        <div className="flex flex-col gap-3.5">
          {/* Top Bar: Center Title + Language Selector + Badge */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-[#22C7A0]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className={`text-xs font-bold tracking-wider ${caseStyle} text-[#F3F6FA]`}>
                  {getAlertLabel('alertCenterTitle', effectiveLangCode)}
                </span>
              </div>
              <span className="hidden sm:inline-block text-[#38536A]">|</span>
              <span className={`text-[10px] sm:text-[11px] font-semibold text-[#8295A8] tracking-wide ${caseStyle}`}>
                {getAlertLabel('stateSubdivisionAlert', effectiveLangCode)}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <WarningLanguageSelector
                regionConfig={regionConfig}
                selectedMode={languageMode}
                onSelectMode={handleSelectLanguageMode}
              />

              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold font-mono tracking-wider ${caseStyle} bg-[#22C7A0]/12 text-[#6EE7B7] border border-[#22C7A0]/35 shrink-0`}>
                <Check className="w-3.5 h-3.5" />
                <span>{getAlertLabel('allClear', effectiveLangCode).split('-')[0].trim()}</span>
              </span>
            </div>
          </div>

          {/* Main Status Block: ALL CLEAR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-8 flex flex-col gap-1.5">
              <div className={`flex items-center gap-2 text-xs font-semibold text-[#6EE7B7] ${caseStyle} tracking-wider`}>
                <span>{getAlertLabel('allClear', effectiveLangCode).split('-')[0].trim()}</span>
                <span>·</span>
                <span>{getLocalizedStateName(regionConfig.regionName, effectiveLangCode)}</span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[#F3F6FA] tracking-tight">
                {getAlertLabel('allClear', effectiveLangCode)}
              </h3>

              <p className="text-xs sm:text-sm text-[#B5C3D1] leading-relaxed max-w-2xl">
                {getAlertLabel('allClearSub', effectiveLangCode)}
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#B5C3D1]">
                <span className="px-2.5 py-1 rounded-md bg-[#08131F] border border-[#26394B] text-[11px] font-mono">
                  {getAlertLabel('severity', effectiveLangCode)}: <strong className="text-[#6EE7B7]">{getLocalizedSeverity('GREEN', effectiveLangCode)}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#08131F] border border-[#26394B] text-[11px] font-mono">
                  {getAlertLabel('affected', effectiveLangCode)}: <strong className="text-[#F3F6FA]">0</strong>
                </span>
              </div>

              <button
                type="button"
                id="btn-view-warnings-bulletin"
                onClick={onNavigateToWarnings}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg bg-[#101F2E] hover:bg-[#172A3B] border border-[#22C7A0]/35 hover:border-[#22C7A0] text-[#6EE7B7] hover:text-[#F3F6FA] text-xs font-semibold tracking-wide transition-colors cursor-pointer m-focus-ring"
              >
                <span>{getAlertLabel('viewInWarnings', effectiveLangCode)}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Bottom Trust Panel */}
          <div className="pt-2.5 border-t border-[#26394B] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8295A8]">
            <div className="flex items-center gap-2">
              <span>Source: {currentData.trust.source}</span>
              <span>·</span>
              <span>Updated: {currentData.trust.updatedAt}</span>
              <span>·</span>
              <span className="text-[#6EE7B7] font-medium">Status: Verified Feed (0 Active Alerts)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchWarningData(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1 text-[11px] text-[#B5C3D1] hover:text-[#F3F6FA] transition-colors cursor-pointer"
                title="Refresh warning feed"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Verify</span>
              </button>
              <span>·</span>
              <span className="text-[10px] text-[#8295A8]">Monitored across 36 IMD Subdivisions</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // INTERNATIONAL: NOT COVERED BY IMD
  // ─────────────────────────────────────────────────────────────
  if (currentData.uiState === 'NOT_APPLICABLE') {
    return (
      <section
        id="severe-weather-alert-center"
        aria-label="National Weather Alert Center"
        className={`w-full rounded-xl border ${statusTheme.cardBorder} ${statusTheme.bg} p-4 sm:p-5 transition-colors`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#35C7E8]" />
              <h2 className="text-xs font-bold tracking-wider uppercase text-[#F3F6FA]">
                WEATHER ALERT CENTER
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold font-mono tracking-wider uppercase bg-[#35C7E8]/12 text-[#7DD3FC] border border-[#35C7E8]/30">
                IMD NOT APPLICABLE
              </span>
            </div>

            <div className="text-sm font-semibold text-[#F3F6FA] mt-0.5">
              {currentData.hazardHeadline}
            </div>
            <p className="text-xs text-[#B5C3D1] leading-relaxed">
              {currentData.summary}
            </p>
          </div>

          <button
            type="button"
            id="btn-view-warnings-bulletin"
            onClick={onNavigateToWarnings}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-[#101F2E] hover:bg-[#172A3B] border border-[#35C7E8]/40 text-[#35C7E8] hover:text-[#F3F6FA] text-xs font-semibold tracking-wide transition-colors cursor-pointer m-focus-ring"
          >
            <span>View All-India Bulletins</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#26394B] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8295A8]">
          <div className="flex items-center gap-2">
            <span>Source: IMD Synoptic Service</span>
            <span>·</span>
            <span>Updated: {currentData.trust.updatedAt}</span>
            <span>·</span>
            <span className="text-[#35C7E8] font-medium">Domain: Indian Sovereign Territory</span>
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // OFFICIAL WARNING FEED UNAVAILABLE: Offline or server error
  // (NEVER RED ALERT, NEVER GREEN ALL CLEAR)
  // ─────────────────────────────────────────────────────────────
  if (isUnavailable) {
    return (
      <section
        id="severe-weather-alert-center"
        aria-label="National Weather Alert Center"
        className={`w-full rounded-xl border ${statusTheme.cardBorder} ${statusTheme.bg} p-4 sm:p-5 transition-colors`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5 text-[#8295A8]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#F59E0B]" />
              <h2 className={`text-xs font-bold tracking-wider ${caseStyle} text-[#F3F6FA]`}>
                {getAlertLabel('alertCenterTitle', effectiveLangCode)}
              </h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold font-mono tracking-wider ${caseStyle} bg-[#F59E0B]/12 text-[#FCD34D] border border-[#F59E0B]/35`}>
                {getAlertLabel('feedUnavailableTitle', effectiveLangCode)}
              </span>
            </div>
            <div className="text-sm font-semibold text-[#F3F6FA] mt-1">
              Weather telemetry remains operational.
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8295A8] mt-0.5">
              <span>Last official warning sync: <strong className="text-[#B5C3D1] font-mono">{(!currentData.trust.updatedAt || currentData.trust.updatedAt === 'Recent' || currentData.trust.updatedAt === 'Live') ? 'Never synced in session' : currentData.trust.updatedAt}</strong></span>
              <span>·</span>
              <span>{getAlertLabel('source', effectiveLangCode)}: <strong className="text-[#B5C3D1]">{currentData.trust.source || 'SACHET/NDMA'}</strong></span>
              <span>·</span>
              <span>{getAlertLabel('status', effectiveLangCode)}: <strong className="text-[#FCD34D]">{getAlertLabel('temporarilyUnreachable', effectiveLangCode)}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchWarningData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-[#101F2E] hover:bg-[#172A3B] border border-[#38536A] text-xs font-semibold text-[#F3F6FA] transition-colors cursor-pointer m-focus-ring"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{getAlertLabel('retrySync', effectiveLangCode)}</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToWarnings}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-[#101F2E] hover:bg-[#172A3B] border border-[#38536A] text-xs font-semibold text-[#F3F6FA] transition-colors cursor-pointer m-focus-ring"
            >
              <span>View Warning Archive</span>
              <ChevronRight className="w-4 h-4 text-[#8295A8]" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ACTIVE WARNING STATE: WATCH (Yellow), ALERT (Orange), SEVERE (Red)
  // Meteorological Command-Center Architecture
  // ─────────────────────────────────────────────────────────────
  const isSevere = currentData.uiState === 'RED_ALERT';

  return (
    <>
      <section
        id="severe-weather-alert-center"
        aria-label="National Weather Alert Center"
        className={`w-full rounded-xl border ${statusTheme.cardBorder} ${statusTheme.bg} p-4 sm:p-5 lg:p-6 transition-colors`}
      >
        <div className="flex flex-col gap-4">
          {/* ──────────────── Top Row: Command Center Bar ──────────────── */}
          <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-[#26394B]">
            {/* Left: Center Title + Scope */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="p-1 rounded bg-[#0A1018] border border-[#1E2E40]">
                <AlertTriangle className={`w-4 h-4 ${statusTheme.accentColor}`} />
              </div>
              <h2 className={`text-xs font-bold tracking-wider ${caseStyle} text-[#E2E8F0]`}>
                {getAlertLabel('alertCenterTitle', effectiveLangCode)}
              </h2>
              <span className="hidden sm:inline-block text-[#334155]">|</span>
              <span className={`text-[10px] sm:text-[11px] font-semibold text-[#94A3B8] tracking-wide ${caseStyle}`}>
                {getAlertLabel('stateSubdivisionAlert', effectiveLangCode)}
              </span>
            </div>

            {/* Right: Language Selector + Data Status & Live Pulse Indicator */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <WarningLanguageSelector
                regionConfig={regionConfig}
                selectedMode={languageMode}
                onSelectMode={handleSelectLanguageMode}
              />

              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span>
                  {getAlertLabel('dataStatus', effectiveLangCode)}:{' '}
                  <strong className="text-white">
                    {currentData.trust.status === 'LIVE'
                      ? getAlertLabel('live', effectiveLangCode)
                      : currentData.trust.status}
                  </strong>
                </span>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold font-mono tracking-wider ${caseStyle} border shrink-0 ${statusTheme.badgeBg}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusTheme.dotColor}`} />
                <span>{localizedDisplay.severityLabel || currentData.statusBadge.label}</span>
              </span>
            </div>
          </div>

          {/* ──────────────── Main Command Grid: Hazard & Impact ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left Col (Col 1-7): Large Live Status + Dynamic Hazard Icon + Prominent Headline */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-3">
              <div>
                {/* Status Block Header + Dynamic Hazard Visual */}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2.5 rounded-xl bg-[#08131F] border border-[#26394B] ${statusTheme.accentColor} shrink-0`}>
                    <HazardIcon hazardType={currentData.hazardType} className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-mono font-bold tracking-wider ${caseStyle} ${statusTheme.accentColor}`}>
                        ● {localizedDisplay.severityLabel}
                      </span>
                      {currentData.additionalActiveCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#101F2E] border border-[#26394B] text-[#8295A8] font-mono tabular-nums">
                          +{currentData.additionalActiveCount} {getAlertLabel(currentData.additionalActiveCount > 1 ? 'additionalWarningPlural' : 'additionalWarningSingle', effectiveLangCode)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#B5C3D1]">
                      {localizedDisplay.stateOrRegionLabel}
                    </span>
                  </div>
                </div>

                {/* Provenance badge: Official Govt Notice vs Translated Summary */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${caseStyle} border ${
                      localizedDisplay.isOfficialQuote
                        ? 'bg-[#22C7A0]/15 text-[#22C7A0] border-[#22C7A0]/35'
                        : 'bg-[#35C7E8]/15 text-[#35C7E8] border-[#35C7E8]/35'
                    }`}
                  >
                    {localizedDisplay.isOfficialQuote ? '✓ ' : ''}
                    {localizedDisplay.badgeLabel}
                  </span>
                  <span className="text-[10px] font-mono text-[#8295A8]">
                    {localizedDisplay.hazardLabel}
                  </span>
                </div>

                {/* Big Visual Dominant Hazard Headline */}
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#F3F6FA] tracking-tight leading-snug">
                  {localizedDisplay.headline}
                </h3>

                {/* Preserved Original Official Text if user selected translated version */}
                {localizedDisplay.hasUntranslatedOriginal && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[#08131F] border border-[#26394B] text-xs text-[#8295A8]">
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold ${caseStyle} tracking-wider text-[#8295A8] mb-1`}>
                      <Info className="w-3.5 h-3.5 text-[#35C7E8] shrink-0" />
                      <span>
                        {getAlertLabel('originalNotice', effectiveLangCode)} ({localizedDisplay.officialLanguageName}):
                      </span>
                    </div>
                    <p className="italic text-[#F3F6FA] whitespace-pre-line text-xs sm:text-sm font-normal">
                      &ldquo;{localizedDisplay.officialText}&rdquo;
                    </p>
                  </div>
                )}

                {/* Short Official Summary */}
                {!localizedDisplay.hasUntranslatedOriginal && currentData.summary && currentData.summary !== localizedDisplay.headline && (
                  <p className="text-xs sm:text-sm text-[#B5C3D1] leading-relaxed mt-2 line-clamp-3">
                    {currentData.summary}
                  </p>
                )}
              </div>

              {/* Affected Area Visualization */}
              {localizedDisplay.affectedRegions.length > 0 && (
                <div className="pt-2">
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold ${caseStyle} tracking-wider text-[#8295A8] mb-1.5`}>
                    <MapPin className="w-3 h-3 text-[#8295A8]" />
                    <span>
                      {getAlertLabel('affectedRegionsDistricts', effectiveLangCode)} ({getAlertLabel('clickToInspect', effectiveLangCode)})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {localizedDisplay.affectedRegions.slice(0, 6).map((district, idx) => (
                      <button
                        key={`${district}-${idx}`}
                        type="button"
                        onClick={() => setSelectedDistrictDetail(district)}
                        className="px-2.5 min-h-[36px] sm:min-h-[30px] rounded bg-[#101F2E] hover:bg-[#172A3D] border border-[#26394B] hover:border-[#35C7E8] text-xs font-medium text-[#F3F6FA] transition-colors cursor-pointer"
                        title={`View warning notice for ${district}`}
                      >
                        {district}
                      </button>
                    ))}
                    {localizedDisplay.affectedRegions.length > 6 && (
                      <button
                        type="button"
                        onClick={onNavigateToWarnings}
                        className="px-2.5 min-h-[36px] sm:min-h-[30px] rounded bg-[#101F2E] hover:bg-[#172A3D] border border-[#26394B] text-xs font-semibold text-[#35C7E8] hover:underline cursor-pointer"
                      >
                        +{localizedDisplay.affectedRegions.length - 6} more
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Impact Snapshot Metrics + Timeline */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3 bg-[#08131F] p-3.5 sm:p-4 rounded-xl border border-[#26394B]">
              <div className="flex items-center justify-between pb-2 border-b border-[#26394B]">
                <span className={`text-[10px] font-bold tracking-wider ${caseStyle} text-[#8295A8]`}>
                  {getAlertLabel('impactSnapshot', effectiveLangCode)}
                </span>
                <span className="text-[10px] font-mono text-[#8295A8]">
                  {getAlertLabel('imdBulletin', effectiveLangCode)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
                  <span className={`block text-[10px] font-bold tracking-wider ${caseStyle} text-[#8295A8]`}>
                    {getAlertLabel('affected', effectiveLangCode)}
                  </span>
                  <span className="block text-xs sm:text-sm font-bold text-[#F3F6FA] truncate mt-0.5">
                    {localizedDisplay.stateOrRegionLabel}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
                  <span className={`block text-[10px] font-bold tracking-wider ${caseStyle} text-[#8295A8]`}>
                    {getAlertLabel('severity', effectiveLangCode)}
                  </span>
                  <span className={`block text-xs sm:text-sm font-bold truncate mt-0.5 ${statusTheme.accentColor}`}>
                    {localizedDisplay.severityLabel}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
                  <span className={`block text-[10px] font-bold tracking-wider ${caseStyle} text-[#8295A8]`}>
                    {getAlertLabel('validUntil', effectiveLangCode)}
                  </span>
                  <span className="block text-xs sm:text-sm font-mono tabular-nums font-semibold text-[#F3F6FA] truncate mt-0.5">
                    {currentData.metrics.validUntilText}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
                  <span className={`block text-[10px] font-bold tracking-wider ${caseStyle} text-[#8295A8]`}>
                    {getAlertLabel('issued', effectiveLangCode)}
                  </span>
                  <span className="block text-xs sm:text-sm font-mono tabular-nums font-semibold text-[#F3F6FA] truncate mt-0.5">
                    {currentData.metrics.issuedAtText}
                  </span>
                </div>
              </div>

              {currentData.timeline && currentData.timeline.isValid && (
                <div className="mt-1 pt-2 border-t border-[#26394B] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-[#8295A8]">
                    <span>{getAlertLabel('issued', effectiveLangCode)}: {currentData.timeline.issuedFormatted}</span>
                    <span>{getAlertLabel('validUntil', effectiveLangCode)}: {currentData.timeline.validUntilFormatted}</span>
                  </div>
                  <div className="relative w-full h-1.5 bg-[#101F2E] rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${statusTheme.dotColor}`}
                      style={{ width: `${Math.min(100, Math.max(5, currentData.timeline.progressPercent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-[#8295A8] font-mono tabular-nums">
                    <span>{getAlertLabel('cycleStart', effectiveLangCode)}</span>
                    <span className="text-[#F3F6FA] font-semibold">{getAlertLabel('now', effectiveLangCode)} ({currentData.timeline.progressPercent}%)</span>
                    <span>{getAlertLabel('expiry', effectiveLangCode)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Area & Data Trust Panel */}
          <div className="pt-3 border-t border-[#26394B] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                id="btn-view-full-warning"
                onClick={() => {
                  if (locationResult?.primaryWarning) {
                    setSelectedDetailWarning(locationResult.primaryWarning);
                  }
                  setIsWarningDetailModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[#101F2E] hover:bg-[#172A3D] border border-[#26394B] hover:border-[#38536A] text-xs font-bold text-[#F3F6FA] tracking-wide transition-colors cursor-pointer"
              >
                <span>{getAlertLabel('viewFullWarning', effectiveLangCode)}</span>
                <ChevronRight className="w-4 h-4 text-[#8295A8] shrink-0" />
              </button>

              {currentData.actions.hasSafetyGuidance && (
                <button
                  type="button"
                  id="btn-open-safety-guidance"
                  onClick={() => setIsSafetyModalOpen(true)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[44px] sm:min-h-[36px] rounded-lg text-xs font-bold tracking-wide transition-colors cursor-pointer ${
                    isSevere
                      ? 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/50 text-[#FCA5A5]'
                      : 'bg-[#F97316]/15 hover:bg-[#F97316]/25 border border-[#F97316]/50 text-[#FDBA74]'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>{getAlertLabel('safetyGuidance', effectiveLangCode)}</span>
                </button>
              )}

              {((locationResult?.additionalCount ?? currentData.additionalActiveCount) > 0) && (
                <button
                  type="button"
                  id="btn-open-additional-warnings"
                  onClick={() => setIsAllWarningsModalOpen(true)}
                  className="text-xs font-semibold text-[#35C7E8] hover:underline underline-offset-2 transition-colors cursor-pointer min-h-[36px] px-1"
                >
                  +{(locationResult?.additionalCount ?? currentData.additionalActiveCount)} {getAlertLabel((locationResult?.additionalCount ?? currentData.additionalActiveCount) > 1 ? 'additionalWarningPlural' : 'additionalWarningSingle', effectiveLangCode)}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8295A8]">
              <span>{getAlertLabel('source', effectiveLangCode)}: <strong className="text-[#F3F6FA]">{currentData.trust.source}</strong></span>
              <span>·</span>
              <span>{getAlertLabel('updated', effectiveLangCode)}: <strong className="text-[#B5C3D1] font-mono tabular-nums">{currentData.trust.updatedAt}</strong></span>
              <span>·</span>
              <span className="flex items-center gap-1 font-mono">
                {getAlertLabel('status', effectiveLangCode)}:{' '}
                <strong className={currentData.trust.status === 'LIVE' ? 'text-[#22C7A0]' : 'text-[#35C7E8]'}>
                  {currentData.trust.status === 'LIVE' ? getAlertLabel('live', effectiveLangCode) : currentData.trust.status}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => fetchWarningData(true)}
                disabled={isRefreshing}
                aria-label="Verify live warning status"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#101F2E] transition-colors cursor-pointer"
                title="Verify live warning status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Guidance Dialog Modal */}
      {isSafetyModalOpen && (
        <div
          id="safety-guidance-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsSafetyModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-[#0B1927] border border-[#26394B] shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col gap-4 text-[#B5C3D1]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#26394B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg bg-[#08131F] border border-[#EF4444]/40 ${statusTheme.accentColor}`}>
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F3F6FA]">
                    {getAlertLabel('safetyGuidanceModalTitle', effectiveLangCode)}
                  </h3>
                  <p className="text-xs text-[#8295A8]">
                    {localizedDisplay.headline} · {localizedDisplay.stateOrRegionLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-safety-modal"
                onClick={() => setIsSafetyModalOpen(false)}
                className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#101F2E] transition-colors cursor-pointer"
                aria-label={getAlertLabel('close', effectiveLangCode)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B5C3D1]">
                {getAlertLabel('safetyMeasuresTitle', effectiveLangCode)}
              </span>

              {localizedDisplay.safetyInstructions.length > 0 ? (
                localizedDisplay.safetyInstructions.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#101F2E] border border-[#26394B] text-xs text-[#B5C3D1]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#22C7A0] shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </div>
                ))
              ) : currentData.actions.recommendedActions.length > 0 ? (
                currentData.actions.recommendedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#101F2E] border border-[#26394B] text-xs text-[#B5C3D1]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#22C7A0] shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-[#101F2E] border border-[#26394B] text-xs text-[#8295A8]">
                  {getAlertLabel('disasterAdvisory', effectiveLangCode)}
                </div>
              )}

              <div className="mt-2 p-3 rounded-lg bg-[#08131F] border border-[#EF4444]/35 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#FCA5A5] flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                  {getAlertLabel('emergencyHelplines', effectiveLangCode)}
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-[#0B1927] border border-[#26394B]">
                    <div className="text-[10px] text-[#8295A8] uppercase">{getAlertLabel('nationalEmergency', effectiveLangCode)}</div>
                    <div className="text-sm font-mono tabular-nums font-bold text-[#F3F6FA]">112 ({getAlertLabel('tollFree', effectiveLangCode)})</div>
                  </div>
                  <div className="p-2 rounded bg-[#0B1927] border border-[#26394B]">
                    <div className="text-[10px] text-[#8295A8] uppercase">
                      {currentData.actions.emergencyHelpline?.title || getAlertLabel('stateDisasterHelpline', effectiveLangCode)}
                    </div>
                    <div className="text-sm font-mono tabular-nums font-bold text-[#FCA5A5]">
                      {currentData.actions.emergencyHelpline?.number || '1070'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#26394B]">
              <button
                type="button"
                onClick={() => setIsSafetyModalOpen(false)}
                className="px-4 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[#101F2E] hover:bg-[#172A3D] border border-[#26394B] text-xs font-semibold text-[#B5C3D1] transition-colors cursor-pointer"
              >
                {getAlertLabel('close', effectiveLangCode)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSafetyModalOpen(false);
                  onNavigateToWarnings?.();
                }}
                className="inline-flex items-center gap-1.5 px-4 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-xs font-bold text-[#F3F6FA] transition-colors cursor-pointer"
              >
                <span>{getAlertLabel('openFullBulletin', effectiveLangCode)}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* District Detail Quick Sheet */}
      {selectedDistrictDetail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedDistrictDetail(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-[#0B1927] border border-[#26394B] p-5 flex flex-col gap-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#26394B] pb-2">
              <div className="flex items-center gap-1.5 text-[#F3F6FA] font-bold text-sm">
                <MapPin className="w-4 h-4 text-[#35C7E8]" />
                <span>{selectedDistrictDetail}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDistrictDetail(null)}
                aria-label="Close district sheet"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#101F2E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-[#B5C3D1] space-y-1.5">
              <p>
                District <strong className="text-[#F3F6FA]">{selectedDistrictDetail}</strong> is identified under the current active warning notice for <strong className="text-[#F3F6FA]">{currentData.hazardHeadline}</strong>.
              </p>
              <div className="p-2.5 rounded-lg bg-[#08131F] border border-[#26394B] text-[11px] font-mono tabular-nums space-y-0.5">
                <div>Subdivision: {currentData.regionSubdivision}</div>
                <div>Severity: {currentData.severityText}</div>
                <div>Validity: {currentData.metrics.validUntilText}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26394B]">
              <button
                type="button"
                onClick={() => setSelectedDistrictDetail(null)}
                className="px-3 min-h-[40px] sm:min-h-[34px] rounded-lg bg-[#101F2E] border border-[#26394B] text-xs font-semibold text-[#B5C3D1] cursor-pointer"
              >
                {getAlertLabel('dismiss', effectiveLangCode)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrictDetail(null);
                  onNavigateToWarnings?.();
                }}
                className="px-3 min-h-[40px] sm:min-h-[34px] rounded-lg bg-[#35C7E8] hover:opacity-95 text-xs font-bold text-[#07111D] cursor-pointer"
              >
                {getAlertLabel('viewInWarnings', effectiveLangCode)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full Warning Modal */}
      {isWarningDetailModalOpen && (
        <div
          id="warning-detail-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsWarningDetailModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[#0B1927] border border-[#26394B] shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col gap-4 text-[#B5C3D1] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#26394B] pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-[#08131F] border border-[#26394B] ${statusTheme.accentColor} shrink-0`}>
                  <HazardIcon hazardType={currentData.hazardType} className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded ${statusTheme.badgeBg}`}>
                      ● {localizedDisplay.severityLabel}
                    </span>
                    <span className="text-[10px] font-mono text-[#8295A8]">
                      {localizedDisplay.hazardLabel}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101F2E] border border-[#26394B] text-[#35C7E8]">
                      {localizedDisplay.badgeLabel}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#F3F6FA] mt-1 leading-snug">
                    {localizedDisplay.headline}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-warning-detail-modal"
                onClick={() => setIsWarningDetailModalOpen(false)}
                className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#101F2E] transition-colors cursor-pointer"
                aria-label={getAlertLabel('close', effectiveLangCode)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              {localizedDisplay.hasUntranslatedOriginal && (
                <div className="p-3.5 rounded-xl bg-[#08131F] border border-[#26394B] text-xs text-[#8295A8]">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8295A8] mb-1">
                    <Info className="w-3.5 h-3.5 text-[#35C7E8] shrink-0" />
                    <span>
                      {getAlertLabel('originalNotice', effectiveLangCode)} ({localizedDisplay.officialLanguageName}):
                    </span>
                  </div>
                  <p className="italic text-[#F3F6FA] whitespace-pre-line text-xs sm:text-sm font-normal">
                    &ldquo;{localizedDisplay.officialText}&rdquo;
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg bg-[#08131F] border border-[#26394B]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8295A8] block">
                    {getAlertLabel('affected', effectiveLangCode)} ({regionConfig.regionName})
                  </span>
                  <span className="text-sm font-bold text-[#F3F6FA] mt-0.5 block">
                    {localizedDisplay.stateOrRegionLabel}
                  </span>
                  {(selectedDetailWarning || locationResult?.primaryWarning)?.subdivision &&
                    (selectedDetailWarning || locationResult?.primaryWarning)?.subdivision !==
                      (selectedDetailWarning || locationResult?.primaryWarning)?.state && (
                      <span className="text-xs text-[#8295A8] mt-0.5 block">
                        Subdivision: {(selectedDetailWarning || locationResult?.primaryWarning)?.subdivision}
                      </span>
                    )}
                </div>

                <div className="p-3 rounded-lg bg-[#08131F] border border-[#26394B]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8295A8] block">
                    {getAlertLabel('affectedRegionsDistricts', effectiveLangCode)}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {localizedDisplay.affectedRegions.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-[#101F2E] border border-[#26394B] text-[#F3F6FA]">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#08131F] border border-[#26394B] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B5C3D1] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#35C7E8]" />
                    {getAlertLabel('validityCountdown', effectiveLangCode)}
                  </span>
                  <span className="text-xs font-mono tabular-nums font-bold text-[#F59E0B] px-2 py-0.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/35">
                    {countdownText || formatCountdownRemaining((selectedDetailWarning || locationResult?.primaryWarning)?.validUntil)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-[#101F2E] border border-[#26394B]">
                    <span className="text-[10px] text-[#8295A8] uppercase block">{getAlertLabel('issued', effectiveLangCode)}</span>
                    <span className="font-semibold text-[#F3F6FA] mt-0.5 block font-mono tabular-nums">
                      {formatISTTime((selectedDetailWarning || locationResult?.primaryWarning)?.issuedAt) || currentData.metrics.issuedAtText}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#101F2E] border border-[#26394B]">
                    <span className="text-[10px] text-[#8295A8] uppercase block">EFFECTIVE</span>
                    <span className="font-semibold text-[#F3F6FA] mt-0.5 block font-mono tabular-nums">
                      {formatISTTime((selectedDetailWarning || locationResult?.primaryWarning)?.effectiveFrom || (selectedDetailWarning || locationResult?.primaryWarning)?.issuedAt)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#101F2E] border border-[#26394B]">
                    <span className="text-[10px] text-[#8295A8] uppercase block">{getAlertLabel('validUntil', effectiveLangCode)}</span>
                    <span className="font-semibold text-[#FCD34D] mt-0.5 block font-mono tabular-nums">
                      {formatISTTime((selectedDetailWarning || locationResult?.primaryWarning)?.validUntil) || currentData.metrics.validUntilText}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#08131F] border border-[#26394B] flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8295A8]">
                  {localizedDisplay.badgeLabel}
                </span>
                <p className="text-xs sm:text-sm text-[#F3F6FA] leading-relaxed whitespace-pre-line">
                  {localizedDisplay.headline}
                </p>
              </div>

              {localizedDisplay.safetyInstructions.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-[#08131F] border border-[#26394B] flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8295A8]">
                    {getAlertLabel('safetyMeasuresTitle', effectiveLangCode)}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {localizedDisplay.safetyInstructions.map((inst, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#B5C3D1]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C7A0] shrink-0 mt-0.5" />
                        <span>{inst}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="p-3.5 rounded-xl bg-[#08131F] border border-[#26394B] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8295A8] block">
                    ISSUING AUTHORITY / SENDER
                  </span>
                  <span className="font-semibold text-[#F3F6FA] block mt-0.5">
                    {(selectedDetailWarning || locationResult?.primaryWarning)?.sender ||
                      ((selectedDetailWarning || locationResult?.primaryWarning)?.source === 'NDMA/SACHET'
                        ? 'National Disaster Management Authority'
                        : 'India Meteorological Department')}
                  </span>
                  <span className="text-[11px] text-[#8295A8] block mt-0.5">
                    Source: {(selectedDetailWarning || locationResult?.primaryWarning)?.source || currentData.trust.source}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8295A8] block">
                    SOURCE IDENTIFIER &amp; VERIFICATION
                  </span>
                  <span
                    className="font-mono text-[11px] text-[#8295A8] block mt-0.5 truncate"
                    title={(selectedDetailWarning || locationResult?.primaryWarning)?.rawSourceId || (selectedDetailWarning || locationResult?.primaryWarning)?.id || '—'}
                  >
                    ID: {(selectedDetailWarning || locationResult?.primaryWarning)?.rawSourceId || (selectedDetailWarning || locationResult?.primaryWarning)?.id || '—'}
                  </span>
                  <span className="text-[11px] text-[#22C7A0] block mt-0.5 font-mono tabular-nums">
                    Verified Sync: {formatISTTime(locationResult?.diagnostics.lastSuccessfulFetchAt || currentData.trust.updatedAt)}
                  </span>
                  {(selectedDetailWarning || locationResult?.primaryWarning)?.sourceUrl && (
                    <a
                      href={(selectedDetailWarning || locationResult?.primaryWarning)!.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#35C7E8] hover:underline mt-1"
                    >
                      <span>Official CAP Alert Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#26394B]">
              <button
                type="button"
                onClick={() => setIsWarningDetailModalOpen(false)}
                className="px-4 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[#101F2E] hover:bg-[#172A3D] border border-[#26394B] text-xs font-semibold text-[#B5C3D1] transition-colors cursor-pointer"
              >
                {getAlertLabel('close', effectiveLangCode)}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWarningDetailModalOpen(false);
                  onNavigateToWarnings?.();
                }}
                className="inline-flex items-center gap-1.5 px-4 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[#35C7E8] hover:opacity-95 text-xs font-bold text-[#07111D] transition-opacity cursor-pointer"
              >
                <span>{getAlertLabel('viewInWarnings', effectiveLangCode)}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Warnings for Location Modal */}
      {isAllWarningsModalOpen && (
        <div
          id="all-warnings-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsAllWarningsModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-[#0B1927] border border-[#26394B] shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col gap-4 text-[#B5C3D1] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#26394B] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#F3F6FA]">
                  Active Warnings for {selectedLocation?.city || selectedLocation?.district || selectedLocation?.state || 'Current Location'}
                </h3>
                <p className="text-xs text-[#8295A8] font-mono tabular-nums">
                  {(locationResult?.allLocationWarnings?.length ?? 1)} official meteorological warning{(locationResult?.allLocationWarnings?.length ?? 1) > 1 ? 's' : ''} in effect
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAllWarningsModalOpen(false)}
                aria-label="Close all warnings modal"
                className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#101F2E] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
              {(locationResult?.allLocationWarnings || []).map((w, idx) => (
                <button
                  key={w.id || idx}
                  type="button"
                  onClick={() => {
                    setSelectedDetailWarning(w);
                    setIsAllWarningsModalOpen(false);
                    setIsWarningDetailModalOpen(true);
                  }}
                  className="w-full text-left p-3 rounded-xl bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] hover:border-[#38536A] transition-colors flex flex-col gap-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      w.severity === 'RED' ? 'bg-[#EF4444]/15 text-[#FCA5A5] border border-[#EF4444]/40' :
                      w.severity === 'ORANGE' ? 'bg-[#F97316]/15 text-[#FDBA74] border border-[#F97316]/40' :
                      'bg-[#F59E0B]/15 text-[#FCD34D] border border-[#F59E0B]/40'
                    }`}>
                      ● {w.severity} ALERT
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-[#8295A8]">
                      {formatCountdownRemaining(w.validUntil)}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[#F3F6FA] leading-snug">
                    {w.title}
                  </h4>
                  <div className="flex items-center justify-between w-full text-[11px] text-[#8295A8]">
                    <span>Subdivision: {w.subdivision || w.state}</span>
                    <span className="text-[#35C7E8] flex items-center gap-0.5">
                      Inspect Notice <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#26394B]">
              <button
                type="button"
                onClick={() => setIsAllWarningsModalOpen(false)}
                className="px-4 min-h-[40px] sm:min-h-[34px] rounded-lg bg-[#101F2E] border border-[#26394B] text-xs font-semibold text-[#B5C3D1] cursor-pointer"
              >
                {getAlertLabel('close', effectiveLangCode)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HomeSevereWeatherStrip;
