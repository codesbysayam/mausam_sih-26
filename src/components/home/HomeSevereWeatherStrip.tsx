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

  type NormalizedAlertSeverity = 'red' | 'orange' | 'yellow' | 'green' | 'unknown';

  const normalizedSeverity: NormalizedAlertSeverity = useMemo(() => {
    if (!data) return 'unknown';
    switch (data.uiState) {
      case 'RED_ALERT':
        return 'red';
      case 'ORANGE_ALERT':
        return 'orange';
      case 'WATCH_ADVISORY':
        return 'yellow';
      case 'NO_ACTIVE_WARNING':
        return 'green';
      case 'OPERATIONAL':
      case 'OPERATIONAL_WITH_FALLBACK':
        if (data.severity === 'red') return 'red';
        if (data.severity === 'orange') return 'orange';
        if (data.severity === 'yellow') return 'yellow';
        return 'unknown';
      case 'NOT_APPLICABLE':
      case 'DATA_UNAVAILABLE':
      case 'PROVIDER_UNAVAILABLE':
      default:
        return 'unknown';
    }
  }, [data]);

  // Status configuration for panel-local severity styling (strict contrast separation)
  const statusTheme = useMemo(() => {
    switch (normalizedSeverity) {
      case 'red':
        return {
          badgeBg: 'bg-[var(--alert-accent-soft)] text-[var(--alert-accent)] border-[var(--alert-border)]',
          dotColor: 'bg-[#B42318]',
          accentColor: 'text-[var(--alert-accent)]',
        };
      case 'orange':
        return {
          badgeBg: 'bg-[var(--alert-accent-soft)] text-[var(--alert-accent)] border-[var(--alert-border)]',
          dotColor: 'bg-[#C45100]',
          accentColor: 'text-[var(--alert-accent)]',
        };
      case 'yellow':
        return {
          badgeBg: 'bg-[var(--alert-accent-soft)] text-[var(--alert-accent)] border-[var(--alert-border)]',
          dotColor: 'bg-[#B7791F]',
          accentColor: 'text-[var(--alert-accent)]',
        };
      case 'green':
        return {
          badgeBg: 'bg-[var(--alert-accent-soft)] text-[var(--alert-accent)] border-[var(--alert-border)]',
          dotColor: 'bg-[#1D6B47]',
          accentColor: 'text-[var(--alert-accent)]',
        };
      case 'unknown':
      default:
        return {
          badgeBg: 'bg-[var(--alert-accent-soft)] text-[var(--alert-accent)] border-[var(--alert-border)]',
          dotColor: 'bg-[#1678B8]',
          accentColor: 'text-[var(--alert-accent)]',
        };
    }
  }, [normalizedSeverity]);

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

  const isBulletinExpired = Boolean(currentData.isExpired || countdownText === 'Expired');
  const additionalWarningsCount =
    locationResult?.additionalCount ?? currentData.additionalActiveCount ?? 0;

  // ─────────────────────────────────────────────────────────────
  // 9. NO-WARNING STATE / ALL CLEAR (Calm Green Visual Treatment)
  // Allowed ONLY when valid official feed responded with 0 warnings!
  // ─────────────────────────────────────────────────────────────
  if (!isActiveAlert && !isUnavailable && currentData.uiState !== 'NOT_APPLICABLE') {
    return (
      <section
        id="severe-weather-alert-center"
        aria-labelledby="weather-alert-title-clear"
        data-severity="green"
        className="weather-alert-center w-full transition-colors"
      >
        <div className="flex flex-col gap-4">
          {/* Top Bar: Center Title + Language Selector + Badge */}
          <header className="weather-alert-center__header">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-[var(--alert-accent)]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className={`weather-alert-center__eyebrow ${caseStyle}`}>
                  {getAlertLabel('alertCenterTitle', effectiveLangCode)}
                </span>
              </div>
              <span className="hidden sm:inline-block text-[var(--alert-muted)]" aria-hidden="true">·</span>
              <span className={`weather-alert-center__meta font-semibold tracking-wide ${caseStyle}`}>
                {getAlertLabel('stateSubdivisionAlert', effectiveLangCode)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <WarningLanguageSelector
                regionConfig={regionConfig}
                selectedMode={languageMode}
                onSelectMode={handleSelectLanguageMode}
              />

              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider ${caseStyle} border shrink-0 ${statusTheme.badgeBg}`}>
                <Check className="w-3.5 h-3.5" />
                <span>{getAlertLabel('allClear', effectiveLangCode).split('-')[0].trim()}</span>
              </span>
            </div>
          </header>

          {/* Main Status Block: ALL CLEAR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-8 flex flex-col gap-1.5">
              <div className={`flex items-center gap-2 text-xs font-semibold text-[var(--alert-accent)] ${caseStyle} tracking-wider`}>
                <span>{getAlertLabel('allClear', effectiveLangCode).split('-')[0].trim()}</span>
                <span aria-hidden="true">·</span>
                <span>{getLocalizedStateName(regionConfig.regionName, effectiveLangCode)}</span>
              </div>

              <h2 id="weather-alert-title-clear" className="weather-alert-center__title">
                {getAlertLabel('allClear', effectiveLangCode)}
              </h2>

              <p className="weather-alert-center__description">
                {getAlertLabel('allClearSub', effectiveLangCode)}
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[var(--alert-secondary)] flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-[var(--alert-surface)] border border-[var(--alert-border)] text-[11px] font-mono">
                  {getAlertLabel('severity', effectiveLangCode)}: <strong className="text-[var(--alert-accent)]">{getLocalizedSeverity('GREEN', effectiveLangCode)}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--alert-surface)] border border-[var(--alert-border)] text-[11px] font-mono">
                  {getAlertLabel('affected', effectiveLangCode)}: <strong className="text-[var(--alert-text)]">0</strong>
                </span>
              </div>

              <button
                type="button"
                id="btn-view-warnings-bulletin"
                onClick={onNavigateToWarnings}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg bg-[var(--alert-surface)] hover:bg-[var(--alert-surface-subtle)] border border-[var(--alert-border)] text-[var(--alert-text)] text-xs font-semibold tracking-wide transition-colors cursor-pointer m-focus-ring"
              >
                <span>{getAlertLabel('viewInWarnings', effectiveLangCode)}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[var(--alert-accent)]" />
              </button>
            </div>
          </div>

          {/* Bottom Trust Panel */}
          <footer className="weather-alert-center__footer text-[11px] text-[var(--alert-muted)]">
            <div className="flex flex-wrap items-center gap-2">
              <span>Source: <strong className="text-[var(--alert-text)]">{currentData.trust.source}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Feed checked: <strong className="text-[var(--alert-secondary)] font-mono tabular-nums">{currentData.trust.updatedAt}</strong></span>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--alert-accent)] font-semibold">Feed status: Verified (0 Active Alerts)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchWarningData(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--alert-secondary)] hover:text-[var(--alert-text)] transition-colors cursor-pointer"
                title="Refresh warning feed"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Verify</span>
              </button>
              <span aria-hidden="true">·</span>
              <span className="text-[11px] text-[var(--alert-muted)]">Monitored across 36 IMD Subdivisions</span>
            </div>
          </footer>
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
        aria-labelledby="weather-alert-title-na"
        data-severity="unknown"
        className="weather-alert-center w-full transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--alert-accent)]" />
              <h2 id="weather-alert-title-na" className="weather-alert-center__eyebrow uppercase">
                Weather Alert Center
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wider uppercase bg-[var(--alert-accent-soft)] text-[var(--alert-accent)] border border-[var(--alert-border)]">
                IMD Not Applicable
              </span>
            </div>

            <div className="text-base font-bold text-[var(--alert-text)] mt-0.5">
              {currentData.hazardHeadline}
            </div>
            <p className="weather-alert-center__description">
              {currentData.summary}
            </p>
          </div>

          <button
            type="button"
            id="btn-view-warnings-bulletin"
            onClick={onNavigateToWarnings}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-[var(--alert-surface)] hover:bg-[var(--alert-surface-subtle)] border border-[var(--alert-border)] text-[var(--alert-text)] text-xs font-semibold tracking-wide transition-colors cursor-pointer m-focus-ring shrink-0"
          >
            <span>View All-India Bulletins</span>
            <ChevronRight className="w-4 h-4 shrink-0 text-[var(--alert-accent)]" />
          </button>
        </div>

        <footer className="weather-alert-center__footer mt-4 text-[11px] text-[var(--alert-muted)]">
          <div className="flex flex-wrap items-center gap-2">
            <span>Source: <strong className="text-[var(--alert-text)]">IMD Synoptic Service</strong></span>
            <span aria-hidden="true">·</span>
            <span>Updated: <strong className="font-mono text-[var(--alert-secondary)]">{currentData.trust.updatedAt}</strong></span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--alert-accent)] font-medium">Domain: Indian Sovereign Territory</span>
          </div>
        </footer>
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
        aria-labelledby="weather-alert-title-unavailable"
        data-severity="unknown"
        className="weather-alert-center w-full transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--m-watch)]" />
              <h2 id="weather-alert-title-unavailable" className={`weather-alert-center__eyebrow ${caseStyle}`}>
                {getAlertLabel('alertCenterTitle', effectiveLangCode)}
              </h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wider ${caseStyle} bg-[var(--m-watch-soft)] text-[var(--m-watch)] border border-[var(--m-watch)]/35`}>
                {getAlertLabel('feedUnavailableTitle', effectiveLangCode)}
              </span>
            </div>
            <div className="text-base font-bold text-[var(--alert-text)] mt-0.5">
              Official warning endpoint could not be reached. Surface weather telemetry remains operational.
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--alert-muted)]">
              <span>Last official warning sync: <strong className="text-[var(--alert-secondary)] font-mono">{(!currentData.trust.updatedAt || currentData.trust.updatedAt === 'Recent' || currentData.trust.updatedAt === 'Live') ? 'Never synced in session' : currentData.trust.updatedAt}</strong></span>
              <span aria-hidden="true">·</span>
              <span>{getAlertLabel('source', effectiveLangCode)}: <strong className="text-[var(--alert-text)]">{currentData.trust.source || 'SACHET/NDMA'}</strong></span>
              <span aria-hidden="true">·</span>
              <span>{getAlertLabel('status', effectiveLangCode)}: <strong className="text-[var(--m-watch)]">{getAlertLabel('temporarilyUnreachable', effectiveLangCode)}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => fetchWarningData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-[var(--alert-surface)] hover:bg-[var(--alert-surface-subtle)] border border-[var(--alert-border)] text-xs font-semibold text-[var(--alert-text)] transition-colors cursor-pointer m-focus-ring"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{getAlertLabel('retrySync', effectiveLangCode)}</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToWarnings}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-[var(--alert-surface)] hover:bg-[var(--alert-surface-subtle)] border border-[var(--alert-border)] text-xs font-semibold text-[var(--alert-text)] transition-colors cursor-pointer m-focus-ring"
            >
              <span>View Warning Archive</span>
              <ChevronRight className="w-4 h-4 text-[var(--alert-muted)]" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ACTIVE WARNING STATE: WATCH (Yellow), ALERT (Orange), SEVERE (Red)
  // Severity-Aware High-Contrast Editorial Alert Center
  // ─────────────────────────────────────────────────────────────
  const isSevere = normalizedSeverity === 'red';
  const feedFreshnessLabel =
    currentData.trust.status === 'LIVE'
      ? 'Feed synced'
      : currentData.trust.status === 'RECENT'
      ? 'Feed recent'
      : currentData.trust.status;

  return (
    <>
      <section
        id="severe-weather-alert-center"
        aria-labelledby="weather-alert-title"
        data-severity={normalizedSeverity}
        className="weather-alert-center w-full transition-colors"
      >
        <div className="flex flex-col gap-5">
          {/* ──────────────── Top Row: Alert Center Header ──────────────── */}
          <header className="weather-alert-center__header">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-[var(--alert-accent-soft)] border border-[var(--alert-border)] flex items-center justify-center shrink-0">
                <AlertTriangle className={`w-4 h-4 ${statusTheme.accentColor}`} />
              </div>
              <p className={`weather-alert-center__eyebrow ${caseStyle}`}>
                {getAlertLabel('alertCenterTitle', effectiveLangCode)}
              </p>
              <span className="hidden sm:inline-block text-[var(--alert-muted)]" aria-hidden="true">·</span>
              <span className={`weather-alert-center__meta font-semibold tracking-wide ${caseStyle}`}>
                {getAlertLabel('stateSubdivisionAlert', effectiveLangCode)}
              </span>
            </div>

            {/* Right: Language Selector + Separate Feed Freshness & Alert Severity */}
            <div className="flex items-center gap-3 flex-wrap">
              <WarningLanguageSelector
                regionConfig={regionConfig}
                selectedMode={languageMode}
                onSelectMode={handleSelectLanguageMode}
              />

              <span className="text-[11px] font-mono text-[var(--alert-muted)] whitespace-nowrap">
                {feedFreshnessLabel}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold font-mono tracking-wider ${caseStyle} border shrink-0 ${statusTheme.badgeBg}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusTheme.dotColor}`} aria-hidden="true" />
                <span>
                  {isBulletinExpired
                    ? 'EXPIRED BULLETIN'
                    : localizedDisplay.severityLabel || currentData.statusBadge.label}
                </span>
              </span>
            </div>
          </header>

          {/* ──────────────── Main Alert Body: Official Bulletin & Impact Snapshot ──────────────── */}
          <div className="weather-alert-center__body">
            {/* Left Column: Hazard Icon, Region, Official Bulletin Headline & Affected Districts */}
            <div className="weather-alert-center__main">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl bg-[var(--alert-surface)] border border-[var(--alert-border)] ${statusTheme.accentColor} shrink-0`}>
                  <HazardIcon hazardType={currentData.hazardType} className="w-6 h-6" />
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-mono font-bold tracking-wider ${caseStyle} ${statusTheme.accentColor}`}>
                      {isBulletinExpired ? 'ARCHIVED / EXPIRED' : localizedDisplay.severityLabel}
                    </span>
                    <span className="text-[var(--alert-muted)]" aria-hidden="true">·</span>
                    <span className="text-xs font-semibold text-[var(--alert-secondary)]">
                      {localizedDisplay.stateOrRegionLabel}
                    </span>
                    {additionalWarningsCount > 0 && (
                      <>
                        <span className="text-[var(--alert-muted)]" aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => setIsAllWarningsModalOpen(true)}
                          className="text-xs font-mono font-semibold text-[var(--m-accent-strong)] hover:underline underline-offset-2 cursor-pointer m-focus-ring rounded"
                        >
                          +{additionalWarningsCount} {getAlertLabel(additionalWarningsCount > 1 ? 'additionalWarningPlural' : 'additionalWarningSingle', effectiveLangCode)}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-[var(--alert-muted)]">
                    <span className="font-semibold text-[var(--alert-secondary)]">
                      {localizedDisplay.isOfficialQuote ? 'Official Government Notice' : localizedDisplay.badgeLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{localizedDisplay.hazardLabel}</span>
                  </div>
                </div>
              </div>

              {/* Dominant Readable Hazard Headline */}
              <h2 id="weather-alert-title" className="weather-alert-center__title">
                {localizedDisplay.headline}
              </h2>

              {/* Preserved Original Official Text if user selected translated version */}
              {localizedDisplay.hasUntranslatedOriginal && (
                <div className="p-3 rounded-xl bg-[var(--alert-surface)] border border-[var(--alert-border)] text-xs text-[var(--alert-muted)]">
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold ${caseStyle} tracking-wider text-[var(--alert-muted)] mb-1`}>
                    <Info className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
                    <span>
                      {getAlertLabel('originalNotice', effectiveLangCode)} ({localizedDisplay.officialLanguageName}):
                    </span>
                  </div>
                  <p className="italic text-[var(--alert-text)] whitespace-pre-line text-xs sm:text-sm font-normal leading-relaxed">
                    &ldquo;{localizedDisplay.officialText}&rdquo;
                  </p>
                </div>
              )}

              {/* Official Summary */}
              {!localizedDisplay.hasUntranslatedOriginal && currentData.summary && currentData.summary !== localizedDisplay.headline && (
                <p className="weather-alert-center__description">
                  {currentData.summary}
                </p>
              )}

              {/* Affected Regions / Districts */}
              {localizedDisplay.affectedRegions.length > 0 && (
                <div className="pt-1">
                  <div className={`flex items-center gap-1.5 text-[11px] font-mono font-bold ${caseStyle} tracking-wider text-[var(--alert-muted)] mb-2`}>
                    <MapPin className="w-3.5 h-3.5 text-[var(--alert-accent)]" />
                    <span>
                      {getAlertLabel('affectedRegionsDistricts', effectiveLangCode)} ({getAlertLabel('clickToInspect', effectiveLangCode)})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {localizedDisplay.affectedRegions.slice(0, 8).map((district, idx) => (
                      <button
                        key={`${district}-${idx}`}
                        type="button"
                        onClick={() => setSelectedDistrictDetail(district)}
                        className="px-2.5 min-h-[34px] rounded-lg bg-[var(--alert-surface)] hover:bg-[var(--alert-surface-subtle)] border border-[var(--alert-border)] hover:border-[var(--alert-accent)] text-xs font-semibold text-[var(--alert-text)] transition-colors cursor-pointer m-focus-ring"
                        title={`View warning notice for ${district}`}
                      >
                        {district}
                      </button>
                    ))}
                    {localizedDisplay.affectedRegions.length > 8 && (
                      <button
                        type="button"
                        onClick={onNavigateToWarnings}
                        className="px-2.5 min-h-[34px] rounded-lg bg-[var(--alert-surface)] hover:bg-[var(--alert-surface-subtle)] border border-[var(--alert-border)] text-xs font-semibold text-[var(--m-accent-strong)] hover:underline cursor-pointer m-focus-ring"
                      >
                        +{localizedDisplay.affectedRegions.length - 8} more
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Balanced Impact Snapshot & Validity (Zero Blank Void) */}
            <aside className="weather-alert-center__impact" aria-label="Impact snapshot and bulletin validity">
              <div className="weather-alert-center__impact-heading">
                <h3 className={`text-[11px] font-mono font-bold tracking-wider ${caseStyle} text-[var(--alert-text)]`}>
                  {getAlertLabel('impactSnapshot', effectiveLangCode)}
                </h3>
                <span className="text-[11px] font-mono text-[var(--alert-muted)]">
                  {getAlertLabel('imdBulletin', effectiveLangCode)}
                </span>
              </div>

              <dl className="weather-alert-center__impact-grid">
                <div className="weather-alert-center__impact-item">
                  <dt>{getAlertLabel('affected', effectiveLangCode)}</dt>
                  <dd>{localizedDisplay.stateOrRegionLabel}</dd>
                </div>

                <div className="weather-alert-center__impact-item">
                  <dt>{getAlertLabel('severity', effectiveLangCode)}</dt>
                  <dd className={statusTheme.accentColor}>
                    {isBulletinExpired ? 'Expired / Archived' : localizedDisplay.severityLabel}
                  </dd>
                </div>

                <div className="weather-alert-center__impact-item">
                  <dt>{getAlertLabel('validUntil', effectiveLangCode)}</dt>
                  <dd className="font-mono tabular-nums font-semibold">
                    {currentData.metrics.validUntilText}
                  </dd>
                </div>

                <div className="weather-alert-center__impact-item">
                  <dt>{getAlertLabel('issued', effectiveLangCode)}</dt>
                  <dd className="font-mono tabular-nums font-semibold">
                    {currentData.metrics.issuedAtText}
                  </dd>
                </div>
              </dl>

              {countdownText && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--alert-border)] text-[11px] font-mono tabular-nums text-[var(--alert-muted)]">
                  <span>Window status</span>
                  <strong className={isBulletinExpired ? 'text-[var(--m-danger)]' : 'text-[var(--alert-text)]'}>
                    {countdownText}
                  </strong>
                </div>
              )}

              {currentData.timeline && currentData.timeline.isValid && (
                <div className="pt-2 border-t border-[var(--alert-border)] flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono tabular-nums text-[var(--alert-muted)]">
                    <span>{getAlertLabel('issued', effectiveLangCode)}: {currentData.timeline.issuedFormatted}</span>
                    <span>{getAlertLabel('validUntil', effectiveLangCode)}: {currentData.timeline.validUntilFormatted}</span>
                  </div>
                  <div className="relative w-full h-1.5 bg-[var(--alert-surface-subtle)] rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${statusTheme.dotColor}`}
                      style={{ width: `${Math.min(100, Math.max(5, currentData.timeline.progressPercent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--alert-muted)] font-mono tabular-nums">
                    <span>{getAlertLabel('cycleStart', effectiveLangCode)}</span>
                    <span className="text-[var(--alert-text)] font-semibold">{getAlertLabel('now', effectiveLangCode)} ({currentData.timeline.progressPercent}%)</span>
                    <span>{getAlertLabel('expiry', effectiveLangCode)}</span>
                  </div>
                </div>
              )}
            </aside>
          </div>

          {/* ──────────────── Footer: Primary Actions & Provenance ──────────────── */}
          <footer className="weather-alert-center__footer">
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
                className="inline-flex items-center justify-center gap-1.5 px-4 min-h-[40px] rounded-lg bg-[var(--alert-surface)] hover:bg-[var(--alert-surface-subtle)] border border-[var(--alert-border)] hover:border-[var(--alert-accent)] text-xs font-bold text-[var(--alert-text)] tracking-wide transition-colors cursor-pointer m-focus-ring"
              >
                <span>{getAlertLabel('viewFullWarning', effectiveLangCode)}</span>
                <ChevronRight className="w-4 h-4 text-[var(--alert-muted)] shrink-0" />
              </button>

              {currentData.actions.hasSafetyGuidance && (
                <button
                  type="button"
                  id="btn-open-safety-guidance"
                  onClick={() => setIsSafetyModalOpen(true)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[40px] rounded-lg text-xs font-bold tracking-wide transition-colors cursor-pointer border m-focus-ring ${
                    isSevere
                      ? 'bg-[var(--m-danger-soft)] hover:bg-[#B42318]/20 border-[var(--m-danger)]/45 text-[var(--m-danger)]'
                      : 'bg-[var(--alert-accent-soft)] hover:opacity-90 border-[var(--alert-border)] text-[var(--alert-accent)]'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>{getAlertLabel('safetyGuidance', effectiveLangCode)}</span>
                </button>
              )}

              {additionalWarningsCount > 0 && (
                <button
                  type="button"
                  id="btn-open-additional-warnings"
                  onClick={() => setIsAllWarningsModalOpen(true)}
                  className="text-xs font-semibold text-[var(--m-accent-strong)] hover:underline underline-offset-2 transition-colors cursor-pointer min-h-[38px] px-1.5 m-focus-ring rounded"
                >
                  Inspect all {additionalWarningsCount + 1} bulletins
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[var(--alert-muted)]">
              <span>{getAlertLabel('source', effectiveLangCode)}: <strong className="text-[var(--alert-text)]">{currentData.trust.source}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Feed retrieved: <strong className="text-[var(--alert-secondary)] font-mono tabular-nums">{currentData.trust.updatedAt}</strong></span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                Feed:{' '}
                <strong className={currentData.trust.status === 'LIVE' ? 'text-[var(--m-ok)]' : 'text-[var(--alert-accent)]'}>
                  {currentData.trust.status === 'LIVE' ? getAlertLabel('live', effectiveLangCode) : currentData.trust.status}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => fetchWarningData(true)}
                disabled={isRefreshing}
                aria-label="Verify live warning status"
                className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg text-[var(--alert-muted)] hover:text-[var(--alert-text)] hover:bg-[var(--alert-surface)] transition-colors cursor-pointer m-focus-ring"
                title="Verify live warning status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </footer>
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
            className="w-full max-w-lg rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col gap-4 text-[var(--m-text-secondary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--m-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-danger)]/40 ${statusTheme.accentColor}`}>
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--m-text-primary)]">
                    {getAlertLabel('safetyGuidanceModalTitle', effectiveLangCode)}
                  </h3>
                  <p className="text-xs text-[var(--m-text-muted)]">
                    {localizedDisplay.headline} · {localizedDisplay.stateOrRegionLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-safety-modal"
                onClick={() => setIsSafetyModalOpen(false)}
                className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] transition-colors cursor-pointer"
                aria-label={getAlertLabel('close', effectiveLangCode)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--m-text-secondary)]">
                {getAlertLabel('safetyMeasuresTitle', effectiveLangCode)}
              </span>

              {localizedDisplay.safetyInstructions.length > 0 ? (
                localizedDisplay.safetyInstructions.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs text-[var(--m-text-secondary)]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[var(--m-ok)] shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </div>
                ))
              ) : currentData.actions.recommendedActions.length > 0 ? (
                currentData.actions.recommendedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs text-[var(--m-text-secondary)]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[var(--m-ok)] shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs text-[var(--m-text-muted)]">
                  {getAlertLabel('disasterAdvisory', effectiveLangCode)}
                </div>
              )}

              <div className="mt-2 p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-danger)]/35 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--m-danger)] flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                  {getAlertLabel('emergencyHelplines', effectiveLangCode)}
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                    <div className="text-[10px] text-[var(--m-text-muted)] uppercase">{getAlertLabel('nationalEmergency', effectiveLangCode)}</div>
                    <div className="text-sm font-mono tabular-nums font-bold text-[var(--m-text-primary)]">112 ({getAlertLabel('tollFree', effectiveLangCode)})</div>
                  </div>
                  <div className="p-2 rounded bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                    <div className="text-[10px] text-[var(--m-text-muted)] uppercase">
                      {currentData.actions.emergencyHelpline?.title || getAlertLabel('stateDisasterHelpline', effectiveLangCode)}
                    </div>
                    <div className="text-sm font-mono tabular-nums font-bold text-[var(--m-danger)]">
                      {currentData.actions.emergencyHelpline?.number || '1070'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--m-border)]">
              <button
                type="button"
                onClick={() => setIsSafetyModalOpen(false)}
                className="px-4 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-xs font-semibold text-[var(--m-text-secondary)] transition-colors cursor-pointer"
              >
                {getAlertLabel('close', effectiveLangCode)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSafetyModalOpen(false);
                  onNavigateToWarnings?.();
                }}
                className="inline-flex items-center gap-1.5 px-4 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[#B42318] hover:bg-[#912018] text-xs font-bold text-white transition-colors cursor-pointer"
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
            className="w-full max-w-sm rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] p-5 flex flex-col gap-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-2">
              <div className="flex items-center gap-1.5 text-[var(--m-text-primary)] font-bold text-sm">
                <MapPin className="w-4 h-4 text-[var(--m-accent)]" />
                <span>{selectedDistrictDetail}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDistrictDetail(null)}
                aria-label="Close district sheet"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-[var(--m-text-secondary)] space-y-1.5">
              <p>
                District <strong className="text-[var(--m-text-primary)]">{selectedDistrictDetail}</strong> is identified under the current active warning notice for <strong className="text-[var(--m-text-primary)]">{currentData.hazardHeadline}</strong>.
              </p>
              <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[11px] font-mono tabular-nums space-y-0.5">
                <div>Subdivision: {currentData.regionSubdivision}</div>
                <div>Severity: {currentData.severityText}</div>
                <div>Validity: {currentData.metrics.validUntilText}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--m-border)]">
              <button
                type="button"
                onClick={() => setSelectedDistrictDetail(null)}
                className="px-3 min-h-[40px] sm:min-h-[34px] rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs font-semibold text-[var(--m-text-secondary)] cursor-pointer"
              >
                {getAlertLabel('dismiss', effectiveLangCode)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrictDetail(null);
                  onNavigateToWarnings?.();
                }}
                className="px-3 min-h-[40px] sm:min-h-[34px] rounded-lg bg-[var(--m-accent)] hover:opacity-95 text-xs font-bold text-white cursor-pointer"
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
            className="w-full max-w-2xl rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col gap-4 text-[var(--m-text-secondary)] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--m-border)] pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] ${statusTheme.accentColor} shrink-0`}>
                  <HazardIcon hazardType={currentData.hazardType} className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded ${statusTheme.badgeBg}`}>
                      ● {localizedDisplay.severityLabel}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--m-text-muted)]">
                      {localizedDisplay.hazardLabel}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-accent)]">
                      {localizedDisplay.badgeLabel}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[var(--m-text-primary)] mt-1 leading-snug">
                    {localizedDisplay.headline}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-warning-detail-modal"
                onClick={() => setIsWarningDetailModalOpen(false)}
                className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] transition-colors cursor-pointer"
                aria-label={getAlertLabel('close', effectiveLangCode)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              {localizedDisplay.hasUntranslatedOriginal && (
                <div className="p-3.5 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-xs text-[var(--m-text-muted)]">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--m-text-muted)] mb-1">
                    <Info className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
                    <span>
                      {getAlertLabel('originalNotice', effectiveLangCode)} ({localizedDisplay.officialLanguageName}):
                    </span>
                  </div>
                  <p className="italic text-[var(--m-text-primary)] whitespace-pre-line text-xs sm:text-sm font-normal">
                    &ldquo;{localizedDisplay.officialText}&rdquo;
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--m-text-muted)] block">
                    {getAlertLabel('affected', effectiveLangCode)} ({regionConfig.regionName})
                  </span>
                  <span className="text-sm font-bold text-[var(--m-text-primary)] mt-0.5 block">
                    {localizedDisplay.stateOrRegionLabel}
                  </span>
                  {(selectedDetailWarning || locationResult?.primaryWarning)?.subdivision &&
                    (selectedDetailWarning || locationResult?.primaryWarning)?.subdivision !==
                      (selectedDetailWarning || locationResult?.primaryWarning)?.state && (
                      <span className="text-xs text-[var(--m-text-muted)] mt-0.5 block">
                        Subdivision: {(selectedDetailWarning || locationResult?.primaryWarning)?.subdivision}
                      </span>
                    )}
                </div>

                <div className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--m-text-muted)] block">
                    {getAlertLabel('affectedRegionsDistricts', effectiveLangCode)}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {localizedDisplay.affectedRegions.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-primary)]">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--m-text-secondary)] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[var(--m-accent)]" />
                    {getAlertLabel('validityCountdown', effectiveLangCode)}
                  </span>
                  <span className="text-xs font-mono tabular-nums font-bold text-[var(--m-watch)] px-2 py-0.5 rounded bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/35">
                    {countdownText || formatCountdownRemaining((selectedDetailWarning || locationResult?.primaryWarning)?.validUntil)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-[var(--m-surface-2)] border border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">{getAlertLabel('issued', effectiveLangCode)}</span>
                    <span className="font-semibold text-[var(--m-text-primary)] mt-0.5 block font-mono tabular-nums">
                      {formatISTTime((selectedDetailWarning || locationResult?.primaryWarning)?.issuedAt) || currentData.metrics.issuedAtText}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[var(--m-surface-2)] border border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">EFFECTIVE</span>
                    <span className="font-semibold text-[var(--m-text-primary)] mt-0.5 block font-mono tabular-nums">
                      {formatISTTime((selectedDetailWarning || locationResult?.primaryWarning)?.effectiveFrom || (selectedDetailWarning || locationResult?.primaryWarning)?.issuedAt)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[var(--m-surface-2)] border border-[var(--m-border)]">
                    <span className="text-[10px] text-[var(--m-text-muted)] uppercase block">{getAlertLabel('validUntil', effectiveLangCode)}</span>
                    <span className="font-semibold text-[var(--m-watch)] mt-0.5 block font-mono tabular-nums">
                      {formatISTTime((selectedDetailWarning || locationResult?.primaryWarning)?.validUntil) || currentData.metrics.validUntilText}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--m-text-muted)]">
                  {localizedDisplay.badgeLabel}
                </span>
                <p className="text-xs sm:text-sm text-[var(--m-text-primary)] leading-relaxed whitespace-pre-line">
                  {localizedDisplay.headline}
                </p>
              </div>

              {localizedDisplay.safetyInstructions.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--m-text-muted)]">
                    {getAlertLabel('safetyMeasuresTitle', effectiveLangCode)}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {localizedDisplay.safetyInstructions.map((inst, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[var(--m-text-secondary)]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--m-ok)] shrink-0 mt-0.5" />
                        <span>{inst}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="p-3.5 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--m-text-muted)] block">
                    ISSUING AUTHORITY / SENDER
                  </span>
                  <span className="font-semibold text-[var(--m-text-primary)] block mt-0.5">
                    {(selectedDetailWarning || locationResult?.primaryWarning)?.sender ||
                      ((selectedDetailWarning || locationResult?.primaryWarning)?.source === 'NDMA/SACHET'
                        ? 'National Disaster Management Authority'
                        : 'India Meteorological Department')}
                  </span>
                  <span className="text-[11px] text-[var(--m-text-muted)] block mt-0.5">
                    Source: {(selectedDetailWarning || locationResult?.primaryWarning)?.source || currentData.trust.source}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--m-text-muted)] block">
                    SOURCE IDENTIFIER &amp; VERIFICATION
                  </span>
                  <span
                    className="font-mono text-[11px] text-[var(--m-text-muted)] block mt-0.5 truncate"
                    title={(selectedDetailWarning || locationResult?.primaryWarning)?.rawSourceId || (selectedDetailWarning || locationResult?.primaryWarning)?.id || '—'}
                  >
                    ID: {(selectedDetailWarning || locationResult?.primaryWarning)?.rawSourceId || (selectedDetailWarning || locationResult?.primaryWarning)?.id || '—'}
                  </span>
                  <span className="text-[11px] text-[var(--m-ok)] block mt-0.5 font-mono tabular-nums">
                    Verified Sync: {formatISTTime(locationResult?.diagnostics.lastSuccessfulFetchAt || currentData.trust.updatedAt)}
                  </span>
                  {(selectedDetailWarning || locationResult?.primaryWarning)?.sourceUrl && (
                    <a
                      href={(selectedDetailWarning || locationResult?.primaryWarning)!.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--m-accent)] hover:underline mt-1"
                    >
                      <span>Official CAP Alert Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--m-border)]">
              <button
                type="button"
                onClick={() => setIsWarningDetailModalOpen(false)}
                className="px-4 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-xs font-semibold text-[var(--m-text-secondary)] transition-colors cursor-pointer"
              >
                {getAlertLabel('close', effectiveLangCode)}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWarningDetailModalOpen(false);
                  onNavigateToWarnings?.();
                }}
                className="inline-flex items-center gap-1.5 px-4 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[var(--m-accent)] hover:opacity-95 text-xs font-bold text-white transition-opacity cursor-pointer"
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
            className="w-full max-w-xl rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col gap-4 text-[var(--m-text-secondary)] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--m-text-primary)]">
                  Active Warnings for {selectedLocation?.city || selectedLocation?.district || selectedLocation?.state || 'Current Location'}
                </h3>
                <p className="text-xs text-[var(--m-text-muted)] font-mono tabular-nums">
                  {(locationResult?.allLocationWarnings?.length ?? 1)} official meteorological warning{(locationResult?.allLocationWarnings?.length ?? 1) > 1 ? 's' : ''} in effect
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAllWarningsModalOpen(false)}
                aria-label="Close all warnings modal"
                className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer"
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
                  className="w-full text-left p-3 rounded-xl bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] transition-colors flex flex-col gap-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      w.severity === 'RED' ? 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border border-[var(--m-danger)]/40' :
                      w.severity === 'ORANGE' ? 'bg-[var(--m-alert-soft)] text-[var(--m-alert)] border border-[var(--m-alert)]/40' :
                      'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border border-[var(--m-watch)]/40'
                    }`}>
                      ● {w.severity} ALERT
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-[var(--m-text-muted)]">
                      {formatCountdownRemaining(w.validUntil)}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[var(--m-text-primary)] leading-snug">
                    {w.title}
                  </h4>
                  <div className="flex items-center justify-between w-full text-[11px] text-[var(--m-text-muted)]">
                    <span>Subdivision: {w.subdivision || w.state}</span>
                    <span className="text-[var(--m-accent)] flex items-center gap-0.5">
                      Inspect Notice <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[var(--m-border)]">
              <button
                type="button"
                onClick={() => setIsAllWarningsModalOpen(false)}
                className="px-4 min-h-[40px] sm:min-h-[34px] rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs font-semibold text-[var(--m-text-secondary)] cursor-pointer"
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
