import React, { useState } from 'react';
import { CurrentWeather, LocationRecord } from '../../types';
import { LocatingPhase } from '../../services/geolocationService';
import { getWeatherVisualConfig } from '../../utils/weatherIcons';
import {
  ArrowRight,
  Droplets,
  Wind,
  Gauge,
  CloudRain,
  Eye,
  Thermometer,
  Crosshair,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { DataPanel, SourceStatus, ProvenanceStatus } from '../ui/ObservatoryPrimitives';
import { MetricValue } from '../common/MetricValue';
import { getMetricStatus } from '../../types/dataProvenance';
import { formatLocationTitle } from '../../utils/locationFormatter';
import {
  AmbientBackground,
  AnimatedCounter,
  HumidityRingGauge,
  MagneticButton,
  StaggerContainer,
  StaggerItem,
  WindCompassNeedle,
} from '../../motion';

interface HomeAtmosphericHeroProps {
  weather: CurrentWeather;
  location: LocationRecord;
  onExploreWeather?: () => void;
  onExploreForecast?: () => void;
  onExploreMap?: () => void;
  lastUpdated?: string;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
}

export const HomeAtmosphericHero: React.FC<HomeAtmosphericHeroProps> = ({
  weather,
  location,
  onExploreWeather,
  onExploreForecast,
  onExploreMap,
  lastUpdated,
  onDetectLocation,
  isLocating = false,
  locatePhase = 'idle',
}) => {
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleDetectLocation = async () => {
    setLocationError(null);
    if (!onDetectLocation) return;
    try {
      if (typeof window !== 'undefined' && (window as any).MausamAnalytics?.trackCurrentLocationUsed) {
        (window as any).MausamAnalytics.trackCurrentLocationUsed('HERO_PRIMARY_CTA');
      }
      await onDetectLocation(true);
      const target = document.getElementById('current-weather-section') || document.getElementById('telemetry-snapshot');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      setLocationError(err?.message || 'Location permission denied. Please select city manually.');
    }
  };

  const visualConfig = getWeatherVisualConfig(weather.condition, weather.isDay, weather.conditionKey);
  const ConditionIcon = visualConfig.icon;

  const isOfficialImd = weather.dataSource === 'IMD';
  const sourceBannerLabel =
    weather.observationSource ||
    (isOfficialImd ? 'IMD Ground Station Telemetry' : 'Open-Meteo Numerical Model Feed');
  const shortSourceLabel = isOfficialImd ? 'IMD Station' : weather.dataSource || 'Open-Meteo';

  const isLoading = weather.observationStatus === 'LOADING';
  const isStale = weather.observationStatus === 'STALE';

  const hasTemp = typeof weather.temp === 'number' && Number.isFinite(weather.temp);
  const currentTemp = hasTemp ? Math.round(weather.temp as number) : null;
  const feelsLike =
    typeof weather.feelsLike === 'number' && Number.isFinite(weather.feelsLike)
      ? Math.round(weather.feelsLike)
      : null;
  const humidity =
    typeof weather.humidity === 'number' && Number.isFinite(weather.humidity)
      ? Math.round(weather.humidity)
      : null;
  const windSpeed =
    typeof weather.windSpeed === 'number' && Number.isFinite(weather.windSpeed)
      ? Math.round(weather.windSpeed)
      : null;
  const windDir = weather.windDirection || '';
  const pressure =
    typeof weather.pressure === 'number' && Number.isFinite(weather.pressure)
      ? Math.round(weather.pressure)
      : null;
  const precipVal =
    typeof weather.precipitation === 'number' && Number.isFinite(weather.precipitation)
      ? weather.precipitation
      : typeof weather.precipitationMm === 'number' && Number.isFinite(weather.precipitationMm)
      ? weather.precipitationMm
      : typeof weather.rainfall === 'number' && Number.isFinite(weather.rainfall)
      ? weather.rainfall
      : null;
  const visKm =
    typeof weather.visibilityKm === 'number' && Number.isFinite(weather.visibilityKm)
      ? Number(weather.visibilityKm.toFixed(1))
      : typeof weather.visibility === 'number' && Number.isFinite(weather.visibility)
      ? Number((weather.visibility / 1000).toFixed(1))
      : null;

  const obsTime = weather.observedAt || weather.validAt || lastUpdated || weather.lastUpdated || null;

  const provenanceStatus: ProvenanceStatus = isLoading
    ? 'LOADING'
    : !hasTemp
    ? 'UNAVAILABLE'
    : isOfficialImd
    ? 'OBSERVED'
    : isStale
    ? 'STALE'
    : 'MODEL_DERIVED';

  const nearestObs =
    location.weatherStation ||
    (location.city?.toLowerCase().includes('chandaka')
      ? 'Bhubaneswar Observatory'
      : `${location.city || location.name} Grid Point`);

  const dewPoint =
    typeof weather.dewPoint === 'number' && Number.isFinite(weather.dewPoint)
      ? `${Math.round(weather.dewPoint)}°C`
      : null;

  const metrics = [
    {
      label: 'FEELS LIKE',
      raw: feelsLike,
      unit: '°C',
      sub:
        currentTemp !== null && feelsLike !== null
          ? currentTemp === feelsLike
            ? 'Identical to ambient'
            : `${feelsLike > currentTemp ? '+' : ''}${feelsLike - currentTemp}°C apparent delta`
          : 'Apparent temperature',
      icon: Thermometer,
      colorVar: 'var(--weather-hot)',
    },
    {
      label: 'HUMIDITY',
      raw: humidity,
      unit: '%',
      sub: dewPoint ? `Dew point ${dewPoint}` : 'Relative moisture',
      icon: Droplets,
      colorVar: 'var(--weather-rain)',
    },
    {
      label: 'WIND',
      raw: windSpeed,
      unit: 'km/h',
      sub: windDir && windDir !== '—' ? `${windDir} surface flow` : 'Surface vector',
      icon: Wind,
      colorVar: 'var(--weather-wind)',
    },
    {
      label: 'PRESSURE',
      raw: pressure,
      unit: 'hPa',
      sub:
        pressure !== null
          ? pressure >= 1013
            ? 'High pressure regime'
            : 'Barometric normal'
          : 'Mean sea level',
      icon: Gauge,
      colorVar: 'var(--m-accent)',
    },
    {
      label: 'RAINFALL',
      raw: precipVal !== null ? Number(precipVal.toFixed(1)) : null,
      unit: 'mm',
      sub:
        typeof weather.precipitationProbability === 'number' && Number.isFinite(weather.precipitationProbability)
          ? `${Math.round(weather.precipitationProbability)}% probability`
          : 'Hourly accumulation',
      icon: CloudRain,
      colorVar: 'var(--weather-rain)',
    },
    {
      label: 'VISIBILITY',
      raw: visKm,
      unit: 'km',
      sub: 'Horizontal atmospheric range',
      icon: Eye,
      colorVar: 'var(--m-info)',
    },
  ];

  const verifiedConditionLabel =
    !hasTemp
      ? isLoading
        ? 'Synchronizing atmospheric feed…'
        : 'Current condition not reported by source'
      : weather.condition && weather.condition !== '—'
      ? weather.condition
      : 'Condition not reported by source';

  return (
    <DataPanel id="current-conditions-hero" className="relative overflow-hidden p-4 sm:p-6">
      <AmbientBackground condition={weather.condition} isDay={weather.isDay !== false} />

      <div className="relative z-10">
      {/* Header bar with authentic provenance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--m-border)] pb-3 mb-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--m-accent)]">
            Today&apos;s Atmosphere
          </span>
          <span className="text-[var(--m-text-muted)]">·</span>
          <span className="text-xs text-[var(--m-text-secondary)]">{sourceBannerLabel}</span>
        </div>

        <SourceStatus status={provenanceStatus} source={shortSourceLabel} updatedAt={obsTime} />
      </div>

      {/* Main hero presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left 5 Cols: Primary Condition, Temp, Location & Actions */}
        <div className="lg:col-span-5 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-[var(--m-border)] pb-5 lg:pb-0 lg:pr-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center justify-center shrink-0">
              <ConditionIcon className={`w-12 h-12 sm:w-14 sm:h-14 ${visualConfig.iconColor}`} />
            </div>

            <div className="flex flex-col">
              <div
                className="flex items-baseline leading-none tabular-nums"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {currentTemp !== null ? (
                  <>
                    <span className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--m-text-primary)] tracking-tight">
                      <AnimatedCounter value={currentTemp} suffix="°" />
                    </span>
                    <span className="text-2xl sm:text-3xl font-light text-[var(--m-text-secondary)] ml-1">
                      C
                    </span>
                  </>
                ) : (
                  <span className="text-lg sm:text-xl font-mono font-semibold text-[var(--m-text-muted)]">
                    {isLoading ? 'Fetching…' : 'Not reported'}
                  </span>
                )}
              </div>
              <div className="text-base sm:text-lg font-semibold text-[var(--m-text-primary)] mt-1.5">
                {verifiedConditionLabel}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--m-border)] space-y-1">
            <div className="text-sm font-semibold text-[var(--m-text-primary)]">
              {formatLocationTitle(location)}
            </div>
            <div className="text-xs text-[var(--m-text-secondary)] flex items-center gap-1.5">
              <span>Reference station:</span>
              <strong className="text-[var(--m-accent)] font-medium">{nearestObs}</strong>
            </div>
            {(location.imdStation || location.elevation) && (
              <div className="text-[11px] text-[var(--m-text-muted)] font-mono tabular-nums">
                {location.imdStation ? `Station ID ${location.imdStation}` : ''}
                {location.imdStation && location.elevation ? ' · ' : ''}
                {location.elevation ? `Elev: ${location.elevation}` : ''}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--m-border)] flex flex-col gap-2.5">
            {onDetectLocation && (
              <MagneticButton
                type="button"
                id="hero-primary-location-cta"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-[7px] bg-[var(--m-accent)] hover:bg-[var(--m-accent-hover)] text-[var(--m-on-accent)] font-semibold text-xs sm:text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed m-focus-ring"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[var(--m-on-accent)] animate-spin" aria-hidden="true" />
                    <span>
                      {locatePhase === 'prompting'
                        ? 'Requesting Geolocation Permission...'
                        : locatePhase === 'locating'
                        ? 'Resolving GPS Coordinates...'
                        : locatePhase === 'geocoding'
                        ? 'Querying Nearest Station...'
                        : 'Acquiring Weather Data...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-4 h-4 text-[var(--m-on-accent)] shrink-0" aria-hidden="true" />
                    <span>Check Weather for My Location</span>
                  </>
                )}
              </MagneticButton>
            )}

            {locationError && (
              <div
                className="flex items-start gap-1.5 text-[11px] text-[var(--m-danger)] bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/35 p-2 rounded-lg"
                role="alert"
              >
                <AlertCircle className="w-3.5 h-3.5 text-[var(--m-danger)] shrink-0 mt-0.5" aria-hidden="true" />
                <span>{locationError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {onExploreMap && (
                <button
                  type="button"
                  onClick={onExploreMap}
                  className="flex-1 min-h-[40px] py-1.5 px-3 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-primary)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-xs font-medium text-center transition-colors cursor-pointer m-focus-ring"
                >
                  Doppler Radar
                </button>
              )}
              {onExploreWeather && (
                <button
                  type="button"
                  id="hero-explore-weather-btn"
                  onClick={onExploreWeather}
                  className="flex-1 min-h-[40px] py-1.5 px-3 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer m-focus-ring"
                >
                  <span>Local Detail</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--m-text-muted)]" aria-hidden="true" />
                </button>
              )}
              {onExploreForecast && (
                <button
                  type="button"
                  id="hero-explore-forecast-btn"
                  onClick={onExploreForecast}
                  className="flex-1 min-h-[40px] py-1.5 px-3 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-xs font-medium text-center transition-colors cursor-pointer m-focus-ring"
                >
                  7-Day Outlook
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Standardized Parameter Grid with Animated Gauges */}
        <StaggerContainer
          immediate
          className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {metrics.map((m) => {
            const Icon = m.icon;
            const state = getMetricStatus(m.raw, { isLoading, isStale });
            return (
              <StaggerItem
                key={m.label}
                interactive
                className="m-panel-inset mausam-interactive-card p-3.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[var(--m-text-muted)] mb-1">
                  <span className="text-[10px] font-semibold tracking-wider uppercase">
                    {m.label}
                  </span>
                  <Icon className="w-3.5 h-3.5" style={{ color: m.colorVar }} />
                </div>

                <div className="my-1 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <MetricValue
                      label={m.label}
                      value={m.raw}
                      unit={m.unit}
                      state={state}
                      source={shortSourceLabel}
                      observedAt={obsTime}
                      className="[&_.metric-value__label]:sr-only [&_.metric-value__reading]:text-xl sm:[&_.metric-value__reading]:text-2xl [&_.metric-value__meta]:hidden"
                    />
                    <div className="text-[11px] text-[var(--m-text-muted)] truncate mt-0.5">
                      {m.sub}
                    </div>
                  </div>
                  {m.label === 'HUMIDITY' && <HumidityRingGauge humidity={humidity} size={38} />}
                  {m.label === 'WIND' && (
                    <WindCompassNeedle direction={windDir} degrees={weather.windDirectionDeg} size={38} />
                  )}
                </div>

                <div className="mt-2 pt-1.5 border-t border-[var(--m-border)] flex items-center justify-between text-[10px] text-[var(--m-text-muted)] font-mono">
                  <span className="truncate">{shortSourceLabel}</span>
                  <span className="text-[var(--m-accent)] font-medium">{isOfficialImd ? 'OBS' : 'FEED'}</span>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
      </div>
    </DataPanel>
  );
};



