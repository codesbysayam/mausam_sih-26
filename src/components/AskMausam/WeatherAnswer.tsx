// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Weather Answer Card Component
// ====================================================================

import React from 'react';
import { CurrentWeatherContext, DataSourceContext } from '../../types/askMausam';

interface WeatherAnswerProps {
  weather?: CurrentWeatherContext;
  locationName: string;
  source?: DataSourceContext;
}

export const WeatherAnswer: React.FC<WeatherAnswerProps> = ({ weather, locationName, source }) => {
  if (!weather) return null;

  return (
    <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col gap-3 text-[var(--m-text-primary)]">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--m-border)]">
        <div>
          <span className="text-[11px] font-bold text-[var(--m-accent)] uppercase tracking-wider">
            Current Atmospheric Telemetry
          </span>
          <h3 className="text-sm font-semibold text-white mt-0.5">{locationName}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[10px] font-mono font-medium text-[var(--m-ok)] uppercase tracking-wide">
            {source?.status || 'LIVE'}
          </span>
        </div>
      </div>

      {/* Main Temperature & Condition Display */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
            {weather.temperatureC}°C
          </span>
          {weather.feelsLikeC !== undefined && (
            <span className="text-xs text-[var(--m-text-muted)]">
              Feels {weather.feelsLikeC}°C
            </span>
          )}
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-[var(--m-surface-2)] text-[var(--m-accent)] text-xs font-semibold border border-[var(--m-border)]">
          {weather.condition}
        </span>
      </div>

      {/* Atmospheric Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {weather.humidity !== undefined && (
          <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col">
            <span className="text-[10px] text-[var(--m-text-muted)]">Relative Humidity</span>
            <span className="font-semibold text-white font-mono mt-0.5">{weather.humidity}%</span>
          </div>
        )}
        {weather.windSpeedKmh !== undefined && (
          <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col">
            <span className="text-[10px] text-[var(--m-text-muted)]">Wind Velocity</span>
            <span className="font-semibold text-white font-mono mt-0.5">
              {weather.windSpeedKmh} km/h {weather.windDirection ? `(${weather.windDirection})` : ''}
            </span>
          </div>
        )}
        {weather.precipitationProbability !== undefined && (
          <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col">
            <span className="text-[10px] text-[var(--m-text-muted)]">Rain Probability</span>
            <span className="font-semibold text-[var(--m-accent)] font-mono mt-0.5">
              {weather.precipitationProbability}%
            </span>
          </div>
        )}
        {weather.pressureHpa !== undefined && (
          <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col">
            <span className="text-[10px] text-[var(--m-text-muted)]">Barometric Pressure</span>
            <span className="font-semibold text-white font-mono mt-0.5">{weather.pressureHpa} hPa</span>
          </div>
        )}
        {weather.visibilityKm !== undefined && (
          <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col">
            <span className="text-[10px] text-[var(--m-text-muted)]">Horizontal Visibility</span>
            <span className="font-semibold text-white font-mono mt-0.5">{weather.visibilityKm} km</span>
          </div>
        )}
        {weather.uvIndex !== undefined && (
          <div className="p-2 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col">
            <span className="text-[10px] text-[var(--m-text-muted)]">UV Radiation Index</span>
            <span className="font-semibold text-white font-mono mt-0.5">{weather.uvIndex}</span>
          </div>
        )}
      </div>

      {/* Footer Attribution */}
      <div className="flex items-center justify-between text-[10px] text-[var(--m-text-muted)] pt-2 border-t border-[var(--m-border)]">
        <span>Source: {source?.provider || 'Open-Meteo Telemetry'}</span>
        {weather.observedAt && (
          <span>Observed: {weather.observedAt}</span>
        )}
      </div>
    </div>
  );
};
