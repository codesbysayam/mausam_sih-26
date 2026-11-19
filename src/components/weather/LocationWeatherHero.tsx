import React, { useMemo, useState, useEffect } from 'react';
import { CurrentWeather, LocationRecord } from '../../types';
import { getWeatherVisualConfig } from '../../utils/weatherIcons';
import { calculateSolarEphemeris, SolarEphemeris } from '../../utils/solarCalculator';
import { DataPanel, SourceStatus, ProvenanceStatus } from '../ui/ObservatoryPrimitives';
import { formatCoordinatePair } from '../../../shared/weatherContract';
import {
  Sunrise,
  Sunset,
  Clock,
  ArrowUp,
  ArrowDown,
  Sun,
  Timer,
} from 'lucide-react';
import { getAqiMeaning, getHumidityMeaning, getRainProbabilityMeaning } from '../../services/humanWeatherEngine';

interface LocationWeatherHeroProps {
  weather: CurrentWeather;
  location: LocationRecord;
}

export const LocationWeatherHero: React.FC<LocationWeatherHeroProps> = ({
  weather,
  location,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const visualConfig = getWeatherVisualConfig(weather.condition, weather.isDay, weather.conditionKey);
  const ConditionIcon = visualConfig.icon;

  const lat = typeof location.lat === 'number' && Number.isFinite(location.lat) ? location.lat : 20.2961;
  const lng = typeof location.lng === 'number' && Number.isFinite(location.lng) ? location.lng : 85.8245;

  const solarData: SolarEphemeris = useMemo(() => {
    return calculateSolarEphemeris(lat, lng, currentTime);
  }, [lat, lng, currentTime]);

  const currentTemp =
    typeof weather.temp === 'number' && Number.isFinite(weather.temp) ? Math.round(weather.temp) : null;
  const feelsLike =
    typeof weather.feelsLike === 'number' && Number.isFinite(weather.feelsLike)
      ? Math.round(weather.feelsLike)
      : null;
  const highTemp =
    typeof weather.high === 'number' && Number.isFinite(weather.high) ? Math.round(weather.high) : null;
  const lowTemp =
    typeof weather.low === 'number' && Number.isFinite(weather.low) ? Math.round(weather.low) : null;
  const humidity =
    typeof weather.humidity === 'number' && Number.isFinite(weather.humidity)
      ? Math.round(weather.humidity)
      : null;
  const windSpeed =
    typeof weather.windSpeed === 'number' && Number.isFinite(weather.windSpeed)
      ? Math.round(weather.windSpeed)
      : null;
  const rainProb =
    typeof weather.precipitationProbability === 'number' && Number.isFinite(weather.precipitationProbability)
      ? Math.round(weather.precipitationProbability)
      : null;
  const dewPoint =
    typeof weather.dewPoint === 'number' && Number.isFinite(weather.dewPoint)
      ? Math.round(weather.dewPoint)
      : currentTemp !== null && humidity !== null
      ? Math.round(currentTemp - (100 - humidity) / 5)
      : null;

  const aqiVal =
    typeof weather.aqi === 'number' && Number.isFinite(weather.aqi) && weather.aqi > 0
      ? Math.round(weather.aqi)
      : typeof weather.aqiIndex === 'number' && Number.isFinite(weather.aqiIndex) && weather.aqiIndex > 0
      ? Math.round(weather.aqiIndex)
      : null;

  const aqiInfo =
    aqiVal !== null
      ? getAqiMeaning(aqiVal)
      : { category: 'Unavailable', severityColor: '#8295A8' };
  const humidityInfo = humidity !== null ? getHumidityMeaning(humidity) : null;
  const rainInfo = rainProb !== null ? getRainProbabilityMeaning(rainProb) : null;

  const provenanceStatus: ProvenanceStatus =
    weather.observationStatus === 'LOADING'
      ? 'LOADING'
      : currentTemp === null
      ? 'UNAVAILABLE'
      : weather.dataSource === 'IMD'
      ? 'OBSERVED'
      : weather.observationStatus === 'STALE'
      ? 'STALE'
      : 'MODEL_DERIVED';

  const verifiedCondition =
    currentTemp === null
      ? weather.observationStatus === 'LOADING'
        ? 'Synchronizing atmospheric feed…'
        : 'Current condition not available'
      : weather.condition && weather.condition !== '—'
      ? weather.condition
      : 'Condition not available';

  return (
    <DataPanel
      id="weather-location-hero-card"
      className="p-5 sm:p-6 lg:p-7"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Section (7 cols): Primary Station Observation & Surface Metrics */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          {/* Station Identity & Provenance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--m-text-primary)] tracking-tight">
                {location.city}, {location.state}
              </h2>
              <p className="text-xs text-[var(--m-text-muted)] mt-0.5 font-mono tabular-nums">
                {location.imdStation || 'Point Coordinate Telemetry'} · {formatCoordinatePair(location.lat, location.lng, 2)}
                {location.elevation ? ` · ${location.elevation}` : ''}
              </p>
            </div>

            <SourceStatus
              status={provenanceStatus}
              source={weather.dataSource || weather.observationSource || weather.source || 'Open-Meteo'}
              updatedAt={weather.observationTimeFormatted || weather.lastUpdated || null}
            />
          </div>

          {/* Primary Thermal & Condition Block */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 py-1">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center justify-center shrink-0">
                <ConditionIcon className={`w-10 h-10 sm:w-12 sm:h-12 ${visualConfig.iconColor}`} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline leading-none font-mono tabular-nums">
                  {currentTemp !== null ? (
                    <>
                      <span className="text-5xl sm:text-6xl font-bold text-[var(--m-text-primary)] tracking-tight">
                        {currentTemp}°
                      </span>
                      <span className="text-xl sm:text-2xl font-medium text-[var(--m-text-muted)] ml-1">
                        C
                      </span>
                    </>
                  ) : (
                    <span className="text-xl sm:text-2xl font-mono font-semibold text-[var(--m-text-muted)]">
                      Not available
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--m-text-muted)] mt-2 font-mono tabular-nums">
                  <span>Feels like</span>
                  <strong className="text-[var(--m-text-primary)] font-semibold">
                    {feelsLike !== null ? `${feelsLike}°C` : 'Not available'}
                  </strong>
                  {humidityInfo && (
                    <>
                      <span>·</span>
                      <span className="font-sans text-[var(--m-text-secondary)]">{humidityInfo.headline}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Condition Summary & Diurnal Range */}
            <div className="flex flex-col gap-2 sm:border-l sm:border-[var(--m-border)] sm:pl-6 min-w-0">
              <div className="text-lg font-bold text-[var(--m-text-primary)]">
                {verifiedCondition}
              </div>
              <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed max-w-md">
                {currentTemp !== null
                  ? visualConfig.description || 'Surface station telemetry synchronized with regional atmospheric analysis.'
                  : 'Upstream atmospheric measurements are being retrieved or are temporarily unavailable for this grid coordinate.'}
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-mono tabular-nums">
                <div className="flex items-center gap-1.5 bg-[var(--m-surface-inset)] px-2.5 py-1 rounded-md border border-[var(--m-border)]">
                  <ArrowUp className="w-3.5 h-3.5 text-[#C65D21]" />
                  <span className="text-[var(--m-text-muted)]">High:</span>
                  <strong className="text-[var(--m-text-primary)]">{highTemp !== null ? `${highTemp}°C` : 'Not available'}</strong>
                </div>
                <div className="flex items-center gap-1.5 bg-[var(--m-surface-inset)] px-2.5 py-1 rounded-md border border-[var(--m-border)]">
                  <ArrowDown className="w-3.5 h-3.5 text-[#2C7BE5]" />
                  <span className="text-[var(--m-text-muted)]">Low:</span>
                  <strong className="text-[var(--m-text-primary)]">{lowTemp !== null ? `${lowTemp}°C` : 'Not available'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Quick Surface Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--m-border)]">
            <div className="m-panel-inset p-3">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold tracking-wider block">
                Rain Risk
              </span>
              <span className="text-base font-bold font-mono tabular-nums text-[#2C7BE5] block mt-0.5">
                {rainProb !== null ? `${rainProb}%` : 'Not available'}
              </span>
              <span className="text-[11px] text-[var(--m-text-muted)] block truncate">
                {rainInfo ? rainInfo.headline : 'Forecast probability'}
              </span>
            </div>

            <div className="m-panel-inset p-3">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold tracking-wider block">
                Humidity
              </span>
              <span className="text-base font-bold font-mono tabular-nums text-[var(--m-text-primary)] block mt-0.5">
                {humidity !== null ? `${humidity}%` : 'Not available'}
              </span>
              <span className="text-[11px] text-[var(--m-text-muted)] font-mono tabular-nums block truncate">
                {dewPoint !== null ? `Dew Pt ${dewPoint}°C` : 'Dew Pt unavailable'}
              </span>
            </div>

            <div className="m-panel-inset p-3">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold tracking-wider block">
                Wind Speed
              </span>
              <span className="text-base font-bold font-mono tabular-nums text-[#2E7D5B] block mt-0.5">
                {windSpeed !== null ? `${windSpeed} km/h` : 'Not available'}
              </span>
              <span className="text-[11px] text-[var(--m-text-muted)] block truncate">
                {weather.windDirection && weather.windDirection !== '—'
                  ? `${weather.windDirection} vector`
                  : 'Direction unavailable'}
              </span>
            </div>

            <div className="m-panel-inset p-3">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold tracking-wider block">
                Air Quality
              </span>
              <span
                className="text-base font-bold font-mono tabular-nums block mt-0.5"
                style={{ color: aqiInfo.severityColor }}
              >
                {aqiVal !== null ? `${aqiVal} AQI` : 'Not available'}
              </span>
              <span className="text-[11px] text-[var(--m-text-muted)] block truncate">{aqiInfo.category}</span>
            </div>
          </div>
        </div>

        {/* Right Section (5 cols): Integrated Solar Ephemeris & Horizon Countdown */}
        <div className="lg:col-span-5 m-panel-inset p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#26394B]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#F59E0B]">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F3F6FA]">
                  Solar Ephemeris
                </h3>
                <span className="text-[11px] font-mono text-[#8295A8]">
                  NOAA Astronomical Calculation
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B1927] border border-[#26394B] text-[11px] font-mono tabular-nums text-[#B5C3D1]">
              <Clock className="w-3 h-3 text-[#F59E0B]" />
              <span>Daylight: <strong className="text-[#F3F6FA]">{solarData.dayLengthStr}</strong></span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#101F2E] border border-[#26394B] text-[#35C7E8]">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-[#8295A8] block">
                  Next Solar Event
                </span>
                <span className="text-sm font-bold text-[#F3F6FA]">{solarData.nextEventName}</span>
                <span className="text-xs text-[#8295A8] block font-mono tabular-nums">
                  At <strong className="text-[#F59E0B]">{solarData.nextEventTimeStr}</strong>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-[#F3F6FA] block bg-[#08131F] px-3 py-1.5 rounded-lg border border-[#26394B]">
                {solarData.countdownFormatted}
              </span>
              <span className="text-[10px] text-[#8295A8] mt-1 block">
                {solarData.isDaytime ? 'Remaining Daylight' : 'Until Morning Dawn'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#8295A8]">
              <span className="flex items-center gap-1">
                <Sunrise className="w-3.5 h-3.5 text-[#F59E0B]" />
                {weather.sunrise || solarData.sunriseStr}
              </span>
              <span className="text-[#FCD34D] font-semibold">
                Noon {weather.solarNoon || solarData.solarNoonStr}
              </span>
              <span className="flex items-center gap-1">
                <Sunset className="w-3.5 h-3.5 text-[#EF4444]" />
                {weather.sunset || solarData.sunsetStr}
              </span>
            </div>

            <div className="relative w-full h-5 flex items-center">
              <div className="w-full h-1.5 bg-[#08131F] border border-[#26394B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F59E0B] via-[#35C7E8] to-[#EF4444] transition-all duration-700"
                  style={{ width: `${solarData.progressPercent}%` }}
                />
              </div>

              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 z-10"
                style={{ left: `${Math.max(4, Math.min(96, solarData.progressPercent))}%` }}
              >
                <div className="w-4 h-4 rounded-full bg-[#F59E0B] border-2 border-[#F3F6FA] flex items-center justify-center text-[#07111D]">
                  <Sun className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-[#8295A8] pt-1 border-t border-[#26394B]/70">
              <span>Civil Dawn: {solarData.civilDawnStr}</span>
              <span>Elev: {solarData.solarElevationDeg > 0 ? `+${solarData.solarElevationDeg}°` : `${solarData.solarElevationDeg}°`}</span>
              <span>Civil Dusk: {solarData.civilDuskStr}</span>
            </div>
          </div>
        </div>
      </div>
    </DataPanel>
  );
};
