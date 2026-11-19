import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LocationRecord, CurrentWeather } from '../../types';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';
import {
  Sun,
  Sunrise,
  Sunset,
  Clock,
  Compass,
  RefreshCw,
  Timer,
  SunMedium,
} from 'lucide-react';
import { calculateSolarEphemeris, SolarEphemeris } from '../../utils/solarCalculator';
import { formatCoordinatePair } from '../../../shared/weatherContract';

interface SolarDynamicsProps {
  location: LocationRecord;
  weather?: CurrentWeather;
}

interface FetchedSolarData {
  sunriseIso: string;
  sunsetIso: string;
  solarNoonIso: string;
  dayLengthSeconds: number;
  civilTwilightBegin: string;
  civilTwilightEnd: string;
  source: 'API_REALTIME' | 'NOAA_ALGORITHM';
  fetchedAt: Date;
}

export const SolarDynamics: React.FC<SolarDynamicsProps> = ({
  location,
  weather,
}) => {
  const lat = typeof location.lat === 'number' && Number.isFinite(location.lat) ? location.lat : 20.2961;
  const lng = typeof location.lng === 'number' && Number.isFinite(location.lng) ? location.lng : 85.8245;

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [fetchedData, setFetchedData] = useState<FetchedSolarData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchRealtimeSolarData = useCallback(async () => {
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&formatted=0`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === 'OK' && json.results) {
        setFetchedData({
          sunriseIso: json.results.sunrise,
          sunsetIso: json.results.sunset,
          solarNoonIso: json.results.solar_noon,
          dayLengthSeconds: json.results.day_length,
          civilTwilightBegin: json.results.civil_twilight_begin,
          civilTwilightEnd: json.results.civil_twilight_end,
          source: 'API_REALTIME',
          fetchedAt: new Date(),
        });
      } else {
        throw new Error(json.status || 'Invalid response');
      }
    } catch {
      setFetchedData({
        sunriseIso: '',
        sunsetIso: '',
        solarNoonIso: '',
        dayLengthSeconds: 0,
        civilTwilightBegin: '',
        civilTwilightEnd: '',
        source: 'NOAA_ALGORITHM',
        fetchedAt: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchRealtimeSolarData();
  }, [fetchRealtimeSolarData]);

  const noaaEphemeris: SolarEphemeris = useMemo(() => {
    return calculateSolarEphemeris(lat, lng, currentTime);
  }, [lat, lng, currentTime]);

  const formatTimeStr = (isoString?: string, fallbackStr?: string): string => {
    if (isoString) {
      try {
        const d = new Date(isoString);
        if (!isNaN(d.getTime())) {
          return new Intl.DateTimeFormat('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
          }).format(d);
        }
      } catch {
        // fallback below
      }
    }
    return fallbackStr || '—';
  };

  const sunriseTimeDisplay =
    fetchedData?.source === 'API_REALTIME' && fetchedData.sunriseIso
      ? formatTimeStr(fetchedData.sunriseIso, noaaEphemeris.sunriseStr)
      : weather?.sunrise || noaaEphemeris.sunriseStr;

  const sunsetTimeDisplay =
    fetchedData?.source === 'API_REALTIME' && fetchedData.sunsetIso
      ? formatTimeStr(fetchedData.sunsetIso, noaaEphemeris.sunsetStr)
      : weather?.sunset || noaaEphemeris.sunsetStr;

  const solarNoonTimeDisplay =
    fetchedData?.source === 'API_REALTIME' && fetchedData.solarNoonIso
      ? formatTimeStr(fetchedData.solarNoonIso, noaaEphemeris.solarNoonStr)
      : weather?.solarNoon || noaaEphemeris.solarNoonStr;

  const dayLengthDisplay =
    fetchedData?.source === 'API_REALTIME' && fetchedData.dayLengthSeconds
      ? `${Math.floor(fetchedData.dayLengthSeconds / 3600)}h ${Math.floor((fetchedData.dayLengthSeconds % 3600) / 60)}m`
      : weather?.dayLength || noaaEphemeris.dayLengthStr;

  const civilDawnDisplay =
    fetchedData?.source === 'API_REALTIME' && fetchedData.civilTwilightBegin
      ? formatTimeStr(fetchedData.civilTwilightBegin, noaaEphemeris.civilDawnStr)
      : noaaEphemeris.civilDawnStr;

  const civilDuskDisplay =
    fetchedData?.source === 'API_REALTIME' && fetchedData.civilTwilightEnd
      ? formatTimeStr(fetchedData.civilTwilightEnd, noaaEphemeris.civilDuskStr)
      : noaaEphemeris.civilDuskStr;

  const progressPercent = Math.min(100, Math.max(0, noaaEphemeris.progressPercent));
  const isDay = noaaEphemeris.isDaytime;

  return (
    <DataPanel id="solar-dynamics-component" className="flex flex-col gap-5">
      <SectionHeading
        title="Astronomical Solar Ephemeris & Twilight"
        subtitle={`${location.city || location.name} • ${formatCoordinatePair(lat, lng, 4)}`}
        icon={<Sun className="w-4 h-4 text-[var(--m-watch)]" />}
        badge={
          <SourceStatus
            status={fetchedData?.source === 'API_REALTIME' ? 'LIVE' : 'REFERENCE'}
            labelOverride={fetchedData?.source === 'API_REALTIME' ? 'ASTRONOMICAL API' : 'NOAA EPHEMERIS'}
          />
        }
        action={
          <button
            type="button"
            onClick={fetchRealtimeSolarData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs font-semibold text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh astronomical solar ephemeris"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--m-accent)]' : ''}`} />
            <span>Sync Ephemeris</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="m-panel-inset p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-watch)] shrink-0">
              <Sunrise className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[var(--m-text-muted)] uppercase tracking-wider block">
                Sunrise
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-[var(--m-text-primary)]">
                {sunriseTimeDisplay}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] text-[var(--m-text-muted)]">
            <span>Civil Dawn</span>
            <span className="block font-mono tabular-nums text-[var(--m-text-secondary)]">{civilDawnDisplay}</span>
          </div>
        </div>

        <div className="m-panel-inset p-3.5 flex items-center justify-between gap-3 border-[var(--m-watch)]/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-watch)] shrink-0">
              <SunMedium className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[var(--m-watch)] uppercase tracking-wider block">
                Solar Noon (Zenith)
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-[var(--m-text-primary)]">
                {solarNoonTimeDisplay}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] text-[var(--m-text-muted)]">
            <span>Elevation</span>
            <span className="block font-mono tabular-nums text-[var(--m-watch)] font-bold">
              {noaaEphemeris.solarElevationDeg > 0
                ? `+${noaaEphemeris.solarElevationDeg.toFixed(1)}°`
                : `${noaaEphemeris.solarElevationDeg.toFixed(1)}°`}
            </span>
          </div>
        </div>

        <div className="m-panel-inset p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-danger)] shrink-0">
              <Sunset className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[var(--m-text-muted)] uppercase tracking-wider block">
                Sunset
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-[var(--m-text-primary)]">
                {sunsetTimeDisplay}
              </span>
            </div>
          </div>
          <div className="text-right text-[10px] text-[var(--m-text-muted)]">
            <span>Civil Dusk</span>
            <span className="block font-mono tabular-nums text-[var(--m-text-secondary)]">{civilDuskDisplay}</span>
          </div>
        </div>
      </div>

      <div className="m-panel-inset p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-[var(--m-accent)]" />
            <span className="text-xs font-bold text-[var(--m-text-secondary)] uppercase tracking-wider">
              {noaaEphemeris.nextEventName} Countdown
            </span>
            <span className="text-xs font-mono tabular-nums font-bold text-[var(--m-accent)] bg-[var(--m-surface-1)] px-2 py-0.5 rounded border border-[var(--m-border)]">
              {noaaEphemeris.countdownFormatted}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-[var(--m-text-muted)]">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--m-watch)]" />
              Daylight: <strong className="text-[var(--m-text-primary)]">{dayLengthDisplay}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              Azimuth: <strong className="text-[var(--m-text-primary)]">{noaaEphemeris.solarAzimuthDeg.toFixed(1)}°</strong>
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative w-full h-2.5 bg-[var(--m-surface-1)] rounded-full overflow-hidden border border-[var(--m-border)]">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: isDay
                  ? 'linear-gradient(90deg, #F59E0B 0%, #35C7E8 50%, #EF4444 100%)'
                  : 'linear-gradient(90deg, #0B72B9 0%, #22C7A0 100%)',
              }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono tabular-nums text-[var(--m-text-muted)] pt-1">
            <span>Sunrise: {sunriseTimeDisplay}</span>
            <span className="text-[var(--m-watch)] font-semibold">Zenith: {solarNoonTimeDisplay}</span>
            <span>Sunset: {sunsetTimeDisplay}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="m-panel-inset p-3">
          <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-bold block">Solar Altitude</span>
          <span className="text-sm font-bold font-mono tabular-nums text-[var(--m-text-primary)]">
            {noaaEphemeris.solarElevationDeg.toFixed(2)}°
          </span>
          <span className="text-[10px] text-[var(--m-text-muted)] block mt-0.5">
            {isDay ? 'Above Horizon' : 'Below Horizon'}
          </span>
        </div>

        <div className="m-panel-inset p-3">
          <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-bold block">Solar Azimuth</span>
          <span className="text-sm font-bold font-mono tabular-nums text-[var(--m-text-primary)]">
            {noaaEphemeris.solarAzimuthDeg.toFixed(1)}°
          </span>
          <span className="text-[10px] text-[var(--m-text-muted)] block mt-0.5">
            {noaaEphemeris.solarAzimuthDeg < 90
              ? 'Northeast'
              : noaaEphemeris.solarAzimuthDeg < 180
              ? 'Southeast'
              : noaaEphemeris.solarAzimuthDeg < 270
              ? 'Southwest'
              : 'Northwest'}
          </span>
        </div>

        <div className="m-panel-inset p-3">
          <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-bold block">Morning Twilight</span>
          <span className="text-xs font-bold font-mono tabular-nums text-[var(--m-watch)] block mt-0.5">
            {civilDawnDisplay} – {sunriseTimeDisplay}
          </span>
          <span className="text-[10px] text-[var(--m-text-muted)] block mt-0.5">Civil Dawn Window</span>
        </div>

        <div className="m-panel-inset p-3">
          <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-bold block">Evening Twilight</span>
          <span className="text-xs font-bold font-mono tabular-nums text-[var(--m-alert)] block mt-0.5">
            {sunsetTimeDisplay} – {civilDuskDisplay}
          </span>
          <span className="text-[10px] text-[var(--m-text-muted)] block mt-0.5">Civil Dusk Window</span>
        </div>
      </div>
    </DataPanel>
  );
};
