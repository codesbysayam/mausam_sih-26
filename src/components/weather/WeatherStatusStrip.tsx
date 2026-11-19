import React, { useMemo } from 'react';
import { CurrentWeather, WeatherAlert } from '../../types';
import {
  CheckCircle2,
  Eye,
  Sun,
  Droplets,
  Wind,
  ShieldAlert,
} from 'lucide-react';

interface WeatherStatusStripProps {
  weather: CurrentWeather;
  alerts?: WeatherAlert[];
}

export const WeatherStatusStrip: React.FC<WeatherStatusStripProps> = ({
  weather,
  alerts = [],
}) => {
  const statusItems = useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ComponentType<{ className?: string }>;
      text: string;
      severity: 'safe' | 'warning' | 'info' | 'muted';
    }> = [];

    const severeAlerts = alerts.filter(
      (a) => a.severity === 'red' || a.severity === 'orange' || a.severity === 'Severe' || a.severity === 'Moderate'
    );

    if (severeAlerts.length > 0) {
      items.push({
        id: 'severe-alert',
        icon: ShieldAlert,
        text: `Active Warning: ${severeAlerts[0].title || 'Weather Bulletin Active'}`,
        severity: 'warning',
      });
    } else {
      items.push({
        id: 'no-severe',
        icon: CheckCircle2,
        text: 'No severe weather warnings active in bulletin feed',
        severity: 'safe',
      });
    }

    const vis =
      typeof weather.visibilityKm === 'number' && Number.isFinite(weather.visibilityKm)
        ? weather.visibilityKm
        : typeof weather.visibility === 'number' && Number.isFinite(weather.visibility)
        ? weather.visibility > 100
          ? Number((weather.visibility / 1000).toFixed(1))
          : weather.visibility
        : null;

    if (vis === null) {
      items.push({ id: 'vis', icon: Eye, text: 'Visibility unavailable', severity: 'muted' });
    } else if (vis < 1) {
      items.push({
        id: 'vis',
        icon: Eye,
        text: `Dense Fog (${vis} km visibility)`,
        severity: 'warning',
      });
    } else if (vis < 4) {
      items.push({
        id: 'vis',
        icon: Eye,
        text: `Reduced Visibility (${vis} km)`,
        severity: 'info',
      });
    } else {
      items.push({
        id: 'vis',
        icon: Eye,
        text: `Visibility Unrestricted (${vis >= 10 ? '10+ km' : `${vis} km`})`,
        severity: 'safe',
      });
    }

    const uv = typeof weather.uvIndex === 'number' && Number.isFinite(weather.uvIndex) ? weather.uvIndex : null;
    if (uv === null) {
      items.push({ id: 'uv', icon: Sun, text: 'UV Index unavailable', severity: 'muted' });
    } else if (uv >= 8) {
      items.push({
        id: 'uv',
        icon: Sun,
        text: `Very High UV (${uv}) — Sun protection advised`,
        severity: 'warning',
      });
    } else if (uv >= 6) {
      items.push({
        id: 'uv',
        icon: Sun,
        text: `High UV (${uv})`,
        severity: 'info',
      });
    } else {
      items.push({
        id: 'uv',
        icon: Sun,
        text: `UV Exposure ${uv}`,
        severity: 'safe',
      });
    }

    const hum = typeof weather.humidity === 'number' && Number.isFinite(weather.humidity) ? Math.round(weather.humidity) : null;
    if (hum === null) {
      items.push({ id: 'humidity', icon: Droplets, text: 'Humidity unavailable', severity: 'muted' });
    } else if (hum >= 90) {
      items.push({
        id: 'humidity',
        icon: Droplets,
        text: `High Humidity (${hum}%)`,
        severity: 'info',
      });
    } else if (hum <= 25) {
      items.push({
        id: 'humidity',
        icon: Droplets,
        text: `Low Humidity (${hum}%)`,
        severity: 'info',
      });
    } else {
      items.push({
        id: 'humidity',
        icon: Droplets,
        text: `Humidity ${hum}%`,
        severity: 'safe',
      });
    }

    const wind = typeof weather.windSpeed === 'number' && Number.isFinite(weather.windSpeed) ? Math.round(weather.windSpeed) : null;
    const windDir = weather.windDirection && weather.windDirection !== '—' ? weather.windDirection : '';
    if (wind === null) {
      items.push({ id: 'wind', icon: Wind, text: 'Wind speed unavailable', severity: 'muted' });
    } else if (wind > 40) {
      items.push({
        id: 'wind',
        icon: Wind,
        text: `Strong Winds (${wind} km/h ${windDir})`.trim(),
        severity: 'warning',
      });
    } else if (wind > 20) {
      items.push({
        id: 'wind',
        icon: Wind,
        text: `Moderate Breeze (${wind} km/h ${windDir})`.trim(),
        severity: 'info',
      });
    } else {
      items.push({
        id: 'wind',
        icon: Wind,
        text: `Light Wind (${wind} km/h ${windDir})`.trim(),
        severity: 'safe',
      });
    }

    return items;
  }, [weather, alerts]);

  return (
    <div
      id="weather-operational-status-strip"
      className="m-panel px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono font-semibold text-[var(--m-text-muted)] uppercase tracking-wider bg-[var(--m-surface-inset)] px-2.5 py-1 rounded-md border border-[var(--m-border)]">
          SYNOPTIC STATUS
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap flex-1 text-xs">
        {statusItems.map((item) => {
          const Icon = item.icon;
          const badgeClass =
            item.severity === 'warning'
              ? 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35'
              : item.severity === 'info'
              ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
              : item.severity === 'muted'
              ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
              : 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/30';

          return (
            <div
              key={item.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium font-mono tabular-nums ${badgeClass}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="font-sans">{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
