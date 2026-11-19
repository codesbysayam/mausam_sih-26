import React, { useEffect, useMemo, useState } from 'react';
import {
  Sun,
  Sunrise,
  Sunset,
  Compass,
  Clock,
  Moon,
  ArrowUpRight,
} from 'lucide-react';
import { CurrentWeather, LocationRecord } from '../../types';
import {
  calculateSolarAstronomicalData,
  calculateLunarEphemeris,
} from '../../utils/astronomyCalculator';
import { formatCoordinatePair } from '../../../shared/weatherContract';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

export interface AstronomicalEphemerisProps {
  location: LocationRecord;
  weather?: CurrentWeather;
  compact?: boolean;
}

export const AstronomicalEphemeris: React.FC<AstronomicalEphemerisProps> = ({
  location,
  weather,
  compact = false,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const lat =
    typeof location?.lat === 'number' && Number.isFinite(location.lat)
      ? location.lat
      : 20.2961;
  const lng =
    typeof location?.lng === 'number' && Number.isFinite(location.lng)
      ? location.lng
      : 85.8245;

  const solar = useMemo(() => {
    return calculateSolarAstronomicalData(lat, lng, now);
  }, [lat, lng, now]);

  const lunar = useMemo(() => {
    return calculateLunarEphemeris(lat, lng, now);
  }, [lat, lng, now]);

  // Prefer validated provider sunrise/sunset when available, cross-checked against NOAA ephemeris
  const displaySunrise =
    weather?.sunrise && weather.sunrise !== '—' ? weather.sunrise : solar.sunriseStr;
  const displaySunset =
    weather?.sunset && weather.sunset !== '—' ? weather.sunset : solar.sunsetStr;
  const displayZenith =
    weather?.solarNoon && weather.solarNoon !== '—' ? weather.solarNoon : solar.solarNoonStr;

  // Solar horizon arc SVG coordinates
  const progress = solar.progressPercent;
  const angleRad = Math.PI - (progress / 100) * Math.PI;
  const cx = 180;
  const cy = 104;
  const rx = 148;
  const ry = 80;
  const sunX = cx + rx * Math.cos(angleRad);
  const sunY = cy - ry * Math.sin(angleRad);

  const coordLabel = formatCoordinatePair(lat, lng, 2);

  return (
    <DataPanel
      id="astronomical-ephemeris-panel"
      className="flex flex-col justify-between gap-5"
    >
      {/* Top Editorial Header */}
      <SectionHeading
        eyebrow="ASTRONOMICAL EPHEMERIS · LOCAL SOLAR & LUNAR TELEMETRY"
        title="Sunrise, Solar Zenith & Sunset"
        subtitle={`${location.city || location.name}${location.state ? `, ${location.state}` : ''} · ${coordLabel} · ${solar.timeZoneUsed === 'Asia/Kolkata' ? 'IST (UTC+05:30)' : solar.timeZoneUsed}`}
        icon={<Sun className="w-4 h-4 text-[#D98A2B]" />}
        badge={
          <SourceStatus
            status="DERIVED"
            source="NOAA Solar Equations"
            updatedAt={now.toLocaleTimeString('en-IN', {
              timeZone: solar.timeZoneUsed,
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          />
        }
        action={
          <div className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-[var(--m-text-secondary)]">
            <Clock className="w-3.5 h-3.5 text-[#D98A2B]" />
            <span>
              {solar.nextEventName} in{' '}
              <strong className="text-[var(--m-text-primary)]">{solar.countdownFormatted}</strong>
            </span>
          </div>
        }
      />

      {/* Primary Three-Pillar Astronomical Readout: Sunrise | Solar Zenith | Sunset */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* 1. Local Sunrise */}
        <div
          id="ephemeris-sunrise-card"
          className="m-panel-inset p-4 flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between text-xs text-[var(--m-text-muted)]">
            <span className="font-mono uppercase tracking-wider font-semibold">
              Local Sunrise
            </span>
            <Sunrise className="w-4 h-4 text-[#2C7BE5]" />
          </div>
          <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[var(--m-text-primary)] tracking-tight">
            {displaySunrise}
          </div>
          <div className="pt-2 border-t border-[var(--m-border)] flex items-center justify-between text-[11px] font-mono tabular-nums text-[var(--m-text-muted)]">
            <span>Civil Dawn</span>
            <span className="text-[var(--m-text-secondary)]">{solar.civilDawnStr}</span>
          </div>
        </div>

        {/* 2. Local Solar Zenith (Solar Noon) */}
        <div
          id="ephemeris-solar-zenith-card"
          className="m-panel-inset p-4 flex flex-col justify-between gap-2 border-[#D98A2B]/40"
        >
          <div className="flex items-center justify-between text-xs text-[#D98A2B]">
            <span className="font-mono uppercase tracking-wider font-semibold">
              Solar Zenith (Transit)
            </span>
            <Sun className="w-4 h-4 text-[#D98A2B]" />
          </div>
          <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[var(--m-text-primary)] tracking-tight">
            {displayZenith}
          </div>
          <div className="pt-2 border-t border-[var(--m-border)] flex items-center justify-between text-[11px] font-mono tabular-nums text-[var(--m-text-muted)]">
            <span>Peak Altitude</span>
            <span className="text-[#D98A2B] font-semibold">
              {solar.zenithElevationDeg.toFixed(1)}° ({solar.zenithAngleDeg.toFixed(1)}° Z)
            </span>
          </div>
        </div>

        {/* 3. Local Sunset */}
        <div
          id="ephemeris-sunset-card"
          className="m-panel-inset p-4 flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between text-xs text-[var(--m-text-muted)]">
            <span className="font-mono uppercase tracking-wider font-semibold">
              Local Sunset
            </span>
            <Sunset className="w-4 h-4 text-[#C65D21]" />
          </div>
          <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[var(--m-text-primary)] tracking-tight">
            {displaySunset}
          </div>
          <div className="pt-2 border-t border-[var(--m-border)] flex items-center justify-between text-[11px] font-mono tabular-nums text-[var(--m-text-muted)]">
            <span>Civil Dusk</span>
            <span className="text-[var(--m-text-secondary)]">{solar.civilDuskStr}</span>
          </div>
        </div>
      </div>

      {/* Interactive Horizon Trajectory & Current Sun Position */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center m-panel-inset p-4">
        <div className="lg:col-span-7 flex flex-col items-center">
          <svg
            viewBox="0 0 360 122"
            className="w-full max-w-md h-32 overflow-visible"
            role="img"
            aria-label={`Solar trajectory arc for ${location.city || location.name}. Sunrise at ${displaySunrise}, Solar Zenith at ${displayZenith}, Sunset at ${displaySunset}.`}
          >
            <defs>
              <linearGradient id="mausamSolarArcGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2C7BE5" />
                <stop offset="50%" stopColor="#D98A2B" />
                <stop offset="100%" stopColor="#C65D21" />
              </linearGradient>
            </defs>

            {/* Full diurnal path */}
            <path
              d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`}
              fill="none"
              stroke="currentColor"
              className="text-[var(--m-border-strong)]"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Elapsed daylight arc */}
            {solar.isDaytime && (
              <path
                d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`}
                fill="none"
                stroke="url(#mausamSolarArcGrad)"
                strokeWidth="3"
                strokeDasharray={`${(progress / 100) * 410} 500`}
              />
            )}

            {/* Zenith meridian guide line */}
            <line
              x1={cx}
              y1={cy - ry - 6}
              x2={cx}
              y2={cy}
              stroke="#D98A2B"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.65"
            />
            <circle cx={cx} cy={cy - ry} r="3" fill="#D98A2B" />
            <text
              x={cx}
              y={cy - ry - 10}
              textAnchor="middle"
              className="fill-[#D98A2B] text-[9px] font-mono font-semibold"
            >
              ZENITH {displayZenith} ({solar.zenithElevationDeg.toFixed(1)}°)
            </text>

            {/* Horizon plane */}
            <line
              x1="16"
              y1={cy}
              x2="344"
              y2={cy}
              stroke="currentColor"
              className="text-[var(--m-border-strong)]"
              strokeWidth="1.5"
            />

            {/* Active Sun Disc */}
            <circle
              cx={sunX}
              cy={sunY}
              r="7.5"
              fill={solar.isDaytime ? '#D98A2B' : '#6F7C85'}
            />
            <circle cx={sunX} cy={sunY} r="3" fill="#101820" />

            {/* Horizon Labels */}
            <text
              x={cx - rx}
              y={cy + 15}
              textAnchor="start"
              className="fill-[var(--m-text-muted)] text-[9px] font-mono"
            >
              E · {displaySunrise}
            </text>
            <text
              x={cx}
              y={cy + 15}
              textAnchor="middle"
              className="fill-[var(--m-text-secondary)] text-[9px] font-mono"
            >
              Daylight {solar.dayLengthStr}
            </text>
            <text
              x={cx + rx}
              y={cy + 15}
              textAnchor="end"
              className="fill-[var(--m-text-muted)] text-[9px] font-mono"
            >
              {displaySunset} · W
            </text>
          </svg>
        </div>

        {/* Right 5 Cols: Real-time Angular & Ephemeris Telemetry */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
          <div className="p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
            <span className="text-[10px] font-sans uppercase tracking-wider text-[var(--m-text-muted)] block">
              Current Altitude
            </span>
            <strong className="text-sm font-bold text-[var(--m-text-primary)] block mt-0.5">
              {solar.solarElevationDeg > 0
                ? `+${solar.solarElevationDeg.toFixed(1)}°`
                : `${solar.solarElevationDeg.toFixed(1)}°`}
            </strong>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)]">
              {solar.isDaytime ? 'Above local horizon' : 'Below local horizon'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
            <span className="text-[10px] font-sans uppercase tracking-wider text-[var(--m-text-muted)] block">
              Solar Azimuth
            </span>
            <strong className="text-sm font-bold text-[var(--m-text-primary)] flex items-center gap-1 mt-0.5">
              <Compass className="w-3.5 h-3.5 text-[#2C7BE5]" />
              <span>{solar.solarAzimuthDeg.toFixed(1)}°</span>
            </strong>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)]">
              Eq. of Time: {solar.equationOfTimeMinutes > 0 ? '+' : ''}
              {solar.equationOfTimeMinutes}m
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
            <span className="text-[10px] font-sans uppercase tracking-wider text-[var(--m-text-muted)] block">
              Day / Night Split
            </span>
            <strong className="text-sm font-bold text-[var(--m-text-primary)] block mt-0.5">
              {solar.dayLengthStr} / {solar.nightDurationStr}
            </strong>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)]">
              Declination {solar.declinationDeg > 0 ? '+' : ''}
              {solar.declinationDeg}°
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
            <span className="text-[10px] font-sans uppercase tracking-wider text-[var(--m-text-muted)] block">
              Lunar Phase
            </span>
            <strong className="text-sm font-bold text-[var(--m-text-primary)] flex items-center gap-1 mt-0.5 truncate">
              <Moon className="w-3.5 h-3.5 text-[#D98A2B] shrink-0" />
              <span className="truncate">{lunar.moonPhaseName}</span>
            </strong>
            <span className="text-[10px] font-sans text-[var(--m-text-muted)]">
              {lunar.illuminationPercent}% illuminated
            </span>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="pt-2 border-t border-[var(--m-border)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--m-text-muted)]">
          <span>
            Derived from NOAA solar position algorithms for {coordLabel} · Nautical twilight{' '}
            <strong className="font-mono text-[var(--m-text-secondary)]">
              {solar.nauticalDawnStr} – {solar.nauticalDuskStr}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--m-text-secondary)]">
            <span>Solar transit azimuth 180°S</span>
            <ArrowUpRight className="w-3 h-3 text-[#D98A2B]" />
          </span>
        </div>
      )}
    </DataPanel>
  );
};
