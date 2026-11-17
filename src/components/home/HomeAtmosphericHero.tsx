import React, { useState } from 'react';
import { CurrentWeather, LocationRecord } from '../../types';
import { LocatingPhase } from '../../services/geolocationService';
import { getWeatherVisualConfig } from '../../utils/weatherIcons';
import { ArrowRight, Droplets, Wind, Gauge, CloudRain, Eye, Thermometer, Crosshair, Loader2, AlertCircle } from 'lucide-react';

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
  const sourceBannerLabel = isOfficialImd
    ? 'IMD Ground Station Telemetry'
    : 'Open-Meteo Numerical Model Feed';
  const shortSourceLabel = isOfficialImd ? 'IMD Station' : 'Open-Meteo';

  const hasTemp = typeof weather.temp === 'number' && !Number.isNaN(weather.temp);
  const currentTemp = hasTemp ? Math.round(weather.temp) : null;
  const feelsLike =
    typeof weather.feelsLike === 'number' && !Number.isNaN(weather.feelsLike)
      ? Math.round(weather.feelsLike)
      : currentTemp;
  const humidity =
    typeof weather.humidity === 'number' ? Math.round(weather.humidity) : null;
  const windSpeed =
    typeof weather.windSpeed === 'number' ? Math.round(weather.windSpeed) : null;
  const windDir = weather.windDirection || '';
  const pressure =
    typeof weather.pressure === 'number' ? Math.round(weather.pressure) : null;
  const precipVal =
    typeof weather.precipitation === 'number'
      ? weather.precipitation
      : typeof weather.precipitationMm === 'number'
      ? weather.precipitationMm
      : typeof weather.rainfall === 'number'
      ? weather.rainfall
      : null;
  const rainfall =
    precipVal !== null && precipVal > 0
      ? `${precipVal.toFixed(1)} mm`
      : typeof weather.precipitationProbability === 'number'
      ? `${weather.precipitationProbability}% prob`
      : precipVal !== null
      ? '0.0 mm'
      : '—';
  const visibility =
    typeof weather.visibility === 'number'
      ? `${(weather.visibility / 1000).toFixed(1)} km`
      : '—';

  const obsTime =
    lastUpdated ||
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date()) + ' IST';

  const nearestObs =
    location.weatherStation ||
    (location.city?.toLowerCase().includes('chandaka')
      ? 'Bhubaneswar Observatory'
      : `${location.city || location.name} Grid Point`);

  const dewPoint =
    currentTemp !== null && humidity !== null
      ? `${Math.round(currentTemp - (100 - humidity) / 5)}°C`
      : '—';

  const metrics = [
    {
      label: 'FEELS LIKE',
      value: feelsLike !== null ? `${feelsLike}°C` : '—',
      sub:
        currentTemp !== null && feelsLike !== null
          ? currentTemp === feelsLike
            ? 'Identical to ambient'
            : `${feelsLike > currentTemp ? '+' : ''}${feelsLike - currentTemp}°C heat index`
          : 'Apparent temperature',
      icon: Thermometer,
      color: '#38BDF8',
      source: shortSourceLabel,
    },
    {
      label: 'HUMIDITY',
      value: humidity !== null ? `${humidity}%` : '—',
      sub: `Dew point ~${dewPoint}`,
      icon: Droplets,
      color: '#38BDF8',
      source: shortSourceLabel,
    },
    {
      label: 'WIND',
      value: windSpeed !== null ? `${windSpeed} km/h` : '—',
      sub: windDir ? `${windDir} surface flow` : 'Surface vector',
      icon: Wind,
      color: '#22C7A0',
      source: shortSourceLabel,
    },
    {
      label: 'PRESSURE',
      value: pressure !== null ? `${pressure} hPa` : '—',
      sub:
        pressure !== null
          ? pressure >= 1013
            ? 'High pressure regime'
            : 'Barometric normal'
          : 'Mean sea level',
      icon: Gauge,
      color: '#F59E0B',
      source: shortSourceLabel,
    },
    {
      label: 'RAINFALL',
      value: rainfall,
      sub:
        typeof weather.precipitationProbability === 'number'
          ? `${weather.precipitationProbability}% probability`
          : 'Hourly accumulation',
      icon: CloudRain,
      color: '#38BDF8',
      source: shortSourceLabel,
    },
    {
      label: 'VISIBILITY',
      value: visibility,
      sub: 'Horizontal atmospheric range',
      icon: Eye,
      color: '#22C7A0',
      source: shortSourceLabel,
    },
  ];

  return (
    <section
      id="current-conditions-hero"
      className="bg-[#101B26] border border-white/12 rounded-xl p-5 sm:p-6"
      aria-label="Current Meteorological Conditions"
    >
      {/* Header bar with authentic provenance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3 mb-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#38BDF8] bg-[#1499E8]/15 border border-[#1499E8]/35 px-2.5 py-0.5 rounded">
            Current Conditions
          </span>
          <span className="text-xs text-[#B6C7D8]">{sourceBannerLabel}</span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono tabular-nums">
          <span className="flex items-center gap-1.5 font-semibold text-[#22C7A0]">
            <span className="w-2 h-2 rounded-full bg-[#22C7A0]" />
            {isOfficialImd ? 'OBSERVED' : 'SYNCED'}
          </span>
          <span className="text-white/20">•</span>
          <span className="text-[#8EA3B8]">
            Updated <strong className="text-[#F4F7FA]">{obsTime}</strong>
          </span>
        </div>
      </div>

      {/* Main hero presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left 5 Cols: Primary Condition, Temp, Location & Actions */}
        <div className="lg:col-span-5 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10 pb-5 lg:pb-0 lg:pr-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#162331] border border-white/10 flex items-center justify-center shrink-0">
              <ConditionIcon className={`w-12 h-12 sm:w-14 sm:h-14 ${visualConfig.iconColor}`} />
            </div>

            <div className="flex flex-col">
              <div className="flex items-baseline leading-none tabular-nums">
                <span className="text-5xl sm:text-6xl lg:text-7xl font-bold font-mono text-[#F4F7FA] tracking-tight">
                  {currentTemp !== null ? `${currentTemp}°` : '—'}
                </span>
                <span className="text-2xl sm:text-3xl font-light text-[#B6C7D8] ml-1">C</span>
              </div>
              <div className="text-base sm:text-lg font-semibold text-[#F4F7FA] mt-1.5">
                {weather.condition || 'Conditions Updating'}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
            <div className="text-sm font-semibold text-[#F4F7FA]">
              {location.city || location.district || location.name}, {location.state}
            </div>
            <div className="text-xs text-[#B6C7D8] flex items-center gap-1.5">
              <span>Reference station:</span>
              <strong className="text-[#38BDF8] font-medium">{nearestObs}</strong>
            </div>
            <div className="text-[11px] text-[#8EA3B8] font-mono tabular-nums">
              {location.imdStation ? `Station ID ${location.imdStation} • ` : ''}
              Elev: {location.elevation || '45m MSL'}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2.5">
            {onDetectLocation && (
              <button
                type="button"
                id="hero-primary-location-cta"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#1499E8] hover:bg-[#0E83CA] text-white font-semibold text-xs sm:text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" aria-hidden="true" />
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
                    <Crosshair className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
                    <span>Check Weather for My Location</span>
                  </>
                )}
              </button>
            )}

            {locationError && (
              <div className="flex items-start gap-1.5 text-[11px] text-[#FCA5A5] bg-[#7F1D1D]/30 border border-[#991B1B]/60 p-2 rounded-lg" role="alert">
                <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0 mt-0.5" aria-hidden="true" />
                <span>{locationError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {onExploreMap && (
                <button
                  type="button"
                  onClick={onExploreMap}
                  className="flex-1 min-h-[38px] py-1.5 px-3 rounded-lg bg-[#162331] hover:bg-[#1B2C3D] text-[#F4F7FA] border border-white/12 text-xs font-medium text-center transition-colors cursor-pointer"
                >
                  Open Weather Map
                </button>
              )}
              {onExploreWeather && (
                <button
                  type="button"
                  id="hero-explore-weather-btn"
                  onClick={onExploreWeather}
                  className="flex-1 min-h-[38px] py-1.5 px-3 rounded-lg bg-[#162331] hover:bg-[#1B2C3D] text-[#B6C7D8] hover:text-white border border-white/12 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Local Detail</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8EA3B8]" aria-hidden="true" />
                </button>
              )}
              {onExploreForecast && (
                <button
                  type="button"
                  id="hero-explore-forecast-btn"
                  onClick={onExploreForecast}
                  className="flex-1 min-h-[38px] py-1.5 px-3 rounded-lg bg-[#162331] hover:bg-[#1B2C3D] text-[#B6C7D8] hover:text-white border border-white/12 text-xs font-medium text-center transition-colors cursor-pointer"
                >
                  7-Day Outlook
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Standardized Parameter Cards (3x2 grid) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="bg-[#162331] border border-white/10 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[#B6C7D8] mb-1">
                  <span className="text-[10px] font-semibold tracking-wider uppercase">
                    {m.label}
                  </span>
                  <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                </div>

                <div className="my-1">
                  <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#F4F7FA]">
                    {m.value}
                  </div>
                  <div className="text-[11px] text-[#8EA3B8] truncate mt-0.5">
                    {m.sub}
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-white/8 flex items-center justify-between text-[10px] text-[#8EA3B8] font-mono">
                  <span className="truncate">{m.source}</span>
                  <span className="text-[#38BDF8] font-medium">{isOfficialImd ? 'OBS' : 'FEED'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

