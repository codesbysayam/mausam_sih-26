import React from 'react';
import {
  MapPin,
  Compass,
  Wind,
  Droplets,
  Gauge,
  Eye,
  Sun,
  CloudRain,
  ShieldCheck,
  RefreshCw,
  Clock,
  Radio,
} from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import { LocationRecord, CurrentWeather } from '../../types';
import { LocatingPhase } from '../../services/geolocationService';
import { UseMyLocationButton } from '../location/UseMyLocationButton';

export interface WeatherSnapshotProps {
  weatherBundle?: WeatherDataBundle | null;
  location: LocationRecord;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  onOpenLocationCenter?: () => void;
  onOpenPrivacyModal?: () => void;
  className?: string;
  variant?: 'card' | 'compact' | 'banner' | 'dashboard';
}

export const WeatherSnapshot: React.FC<WeatherSnapshotProps> = ({
  weatherBundle,
  location,
  locationSource = 'MANUAL_SEARCH',
  isLocating = false,
  locatePhase = 'idle',
  onDetectLocation,
  onOpenLocationCenter,
  onOpenPrivacyModal,
  className = '',
  variant = 'card',
}) => {
  const current: CurrentWeather | undefined = weatherBundle?.current;

  // Format observation time
  const observationTimeStr = weatherBundle?.lastFetchedAt
    ? new Date(weatherBundle.lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Live Synoptic';

  const isGps = locationSource === 'DEVICE_GPS';

  if (variant === 'compact') {
    return (
      <div
        id="weather-snapshot-compact"
        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-text-primary)] ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--m-accent-soft)] border border-[#1499E8]/30 flex items-center justify-center text-[var(--m-accent)] shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-white truncate">{location.city}</span>
              {isGps && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[var(--m-ok-soft)] text-[var(--m-ok)] border border-[#10B981]/40">
                  GPS
                </span>
              )}
            </div>
            <div className="text-[10px] text-[var(--m-text-muted)] truncate">{location.state}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {current ? (
            <div className="text-right">
              <div className="text-sm font-bold text-white font-mono">{Math.round(current.temp)}°C</div>
              <div className="text-[10px] text-[var(--m-accent)]">{current.condition}</div>
            </div>
          ) : (
            <span className="text-[10px] text-[var(--m-text-muted)]">Observing…</span>
          )}

          {onDetectLocation && (
            <UseMyLocationButton
              onDetect={onDetectLocation}
              isLocating={isLocating}
              phase={locatePhase}
              locationSource={locationSource}
              compact
              variant="toolbar"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id="weather-snapshot-card"
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--m-surface-inset)] via-[var(--m-surface-1)] to-[var(--m-surface-1)] border border-[var(--m-border)] shadow-xl p-4 md:p-5 text-[var(--m-text-primary)] ${className}`}
    >
      {/* Decorative Synoptic Radial Glow */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-[var(--m-accent-soft)] rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--m-accent)]">
              <Radio className="w-3.5 h-3.5 animate-pulse text-[var(--m-accent)]" />
              Active Telemetry Snapshot
            </span>
            {isGps ? (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--m-ok-soft)] text-[var(--m-ok)] border border-[#10B981]/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                GPS ACTIVE
              </span>
            ) : (
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--m-surface-2)] text-[var(--m-text-muted)]">
                STATION SEARCH
              </span>
            )}
          </div>

          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[var(--m-accent)] shrink-0" />
            <span className="truncate">{location.city}</span>
            <span className="text-sm font-normal text-[var(--m-text-muted)]">({location.state})</span>
          </h3>

          <div className="flex items-center gap-3 text-[11px] text-[var(--m-text-muted)] mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[var(--m-accent)]" />
              {observationTimeStr}
            </span>
            <span>•</span>
            <span className="text-[var(--m-accent)]">IMD AWS Telemetry</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onDetectLocation && (
            <UseMyLocationButton
              onDetect={onDetectLocation}
              isLocating={isLocating}
              phase={locatePhase}
              locationSource={locationSource}
              compact
              variant="secondary"
            />
          )}

          {onOpenLocationCenter && (
            <button
              type="button"
              onClick={onOpenLocationCenter}
              className="p-2 rounded-xl bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] text-xs transition-colors cursor-pointer"
              title="Change Observatory Location"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--m-accent)]" />
            </button>
          )}

          {onOpenPrivacyModal && (
            <button
              type="button"
              onClick={onOpenPrivacyModal}
              className="p-2 rounded-xl bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] text-xs transition-colors cursor-pointer"
              title="Geolocation Privacy Settings"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Meteorological Metrics Grid */}
      {current ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[var(--m-border)]">
          <div className="p-3 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)]">
            <div className="text-[10px] uppercase font-semibold text-[var(--m-text-muted)] flex items-center gap-1">
              <Sun className="w-3 h-3 text-[#FBBF24]" />
              Temperature
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1">
              {Math.round(current.temp)}°C
            </div>
            <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5">
              Feels {current.feelsLike !== undefined ? `${Math.round(current.feelsLike)}°C` : `${Math.round(current.temp)}°C`}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)]">
            <div className="text-[10px] uppercase font-semibold text-[var(--m-text-muted)] flex items-center gap-1">
              <Droplets className="w-3 h-3 text-[var(--m-accent)]" />
              Humidity
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1">
              {current.humidity}%
            </div>
            <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5">
              Dew {Math.round(current.dewPoint ?? (current.temp - ((100 - current.humidity) / 5)))}°C
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)]">
            <div className="text-[10px] uppercase font-semibold text-[var(--m-text-muted)] flex items-center gap-1">
              <Wind className="w-3 h-3 text-[var(--m-ok)]" />
              Wind
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1">
              {Math.round(current.windSpeed)} <span className="text-xs font-normal">km/h</span>
            </div>
            <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5 truncate">
              {current.windDirection} • {current.pressure} hPa
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)]">
            <div className="text-[10px] uppercase font-semibold text-[var(--m-text-muted)] flex items-center gap-1">
              <CloudRain className="w-3 h-3 text-[#818CF8]" />
              Conditions
            </div>
            <div className="text-sm font-bold text-white truncate mt-1.5">
              {current.condition}
            </div>
            <div className="text-[10px] text-[var(--m-accent)] mt-0.5">
              AQI {current.aqi ?? current.aqiPm25} ({current.aqiStatus})
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-[var(--m-text-muted)] border-t border-[var(--m-border)]">
          Loading active meteorological telemetry…
        </div>
      )}
    </div>
  );
};
