import React, { useState, useEffect, useMemo } from 'react';
import * as SunCalc from 'suncalc';
import { Sun, Sunrise, Sunset, Clock, Sparkles, Compass } from 'lucide-react';
import { LocationRecord, CurrentWeather } from '../../types';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';
import { formatCoordinatePair } from '../../../shared/weatherContract';

interface HomeSolarCycleProps {
  location?: LocationRecord;
  weather?: CurrentWeather;
  sunrise?: string;
  sunset?: string;
}

export const HomeSolarCycle: React.FC<HomeSolarCycleProps> = ({
  location,
  weather,
  sunrise,
  sunset,
}) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lat = typeof location?.lat === 'number' && Number.isFinite(location.lat) ? location.lat : 20.2961;
  const lng = typeof location?.lng === 'number' && Number.isFinite(location.lng) ? location.lng : 85.8245;

  const solarData = useMemo(() => {
    const times = SunCalc.getTimes(now, lat, lng);
    const pos = SunCalc.getPosition(now, lat, lng);

    const formatT = (d: Date) =>
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const sr = times.sunrise;
    const ss = times.sunset;
    const isDaytime = now >= sr && now <= ss;

    const dayLengthMs = Math.max(0, ss.getTime() - sr.getTime());
    const dayHours = Math.floor(dayLengthMs / 3600000);
    const dayMinutes = Math.floor((dayLengthMs % 3600000) / 60000);
    const dayLengthStr = `${dayHours}h ${dayMinutes.toString().padStart(2, '0')}m`;

    let progressPercent = 0;
    if (now < sr) progressPercent = 0;
    else if (now > ss) progressPercent = 100;
    else if (dayLengthMs > 0) {
      progressPercent = Math.min(100, Math.max(0, ((now.getTime() - sr.getTime()) / dayLengthMs) * 100));
    }

    let nextEventName = 'Sunset';
    let target = ss;
    if (now > ss) {
      nextEventName = 'Sunrise';
      const tmrw = new Date(now);
      tmrw.setDate(tmrw.getDate() + 1);
      target = SunCalc.getTimes(tmrw, lat, lng).sunrise;
    } else if (now < sr) {
      nextEventName = 'Sunrise';
      target = sr;
    }

    const msDiff = Math.max(0, target.getTime() - now.getTime());
    const h = Math.floor(msDiff / 3600000);
    const m = Math.floor((msDiff % 3600000) / 60000);
    const s = Math.floor((msDiff % 60000) / 1000);
    const countdownFormatted = `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;

    const altDeg = (pos.altitude * 180) / Math.PI;
    const azDeg = ((pos.azimuth * 180) / Math.PI + 180) % 360;

    return {
      sunriseStr: formatT(sr),
      sunsetStr: formatT(ss),
      solarNoonStr: formatT(times.solarNoon),
      dayLengthStr,
      isDaytime,
      progressPercent,
      nextEventName,
      countdownFormatted,
      solarElevationDeg: altDeg,
      solarAzimuthDeg: azDeg,
    };
  }, [lat, lng, now]);

  const displaySunrise = sunrise || weather?.sunrise || solarData.sunriseStr;
  const displaySunset = sunset || weather?.sunset || solarData.sunsetStr;
  const dayLengthStr = weather?.dayLength || solarData.dayLengthStr;
  const isDay = solarData.isDaytime;
  const progressPercent = solarData.progressPercent;

  const angleRad = Math.PI - (progressPercent / 100) * Math.PI;
  const cx = 150;
  const cy = 110;
  const rx = 130;
  const ry = 90;
  const sunX = cx + rx * Math.cos(angleRad);
  const sunY = cy - ry * Math.sin(angleRad);

  return (
    <DataPanel id="homepage-solar-cycle" className="flex flex-col justify-between gap-4 h-full">
      <SectionHeading
        title="Solar Trajectory & Day Length"
        subtitle={
          location?.city
            ? `${location.city} (${formatCoordinatePair(lat, lng, 2)})`
            : 'Astronomical Solar Ephemeris'
        }
        icon={<Sun className="w-4 h-4 text-[var(--m-watch)]" />}
        action={
          <span className="text-[11px] font-mono text-[var(--m-watch)] bg-[var(--m-watch-soft)] px-2.5 py-1 rounded-md border border-[var(--m-watch)]/30 flex items-center gap-1.5 tabular-nums">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{solarData.countdownFormatted} to {solarData.nextEventName}</span>
          </span>
        }
      />

      {/* Astronomical Arc Visualization */}
      <div className="relative flex flex-col items-center py-2">
        <svg viewBox="0 0 300 130" className="w-full max-w-sm h-32 overflow-visible">
          <path
            d="M 20 110 A 130 90 0 0 1 280 110"
            fill="none"
            stroke="#26394B"
            strokeWidth="3"
            strokeDasharray="4 4"
          />

          {isDay && (
            <path
              d="M 20 110 A 130 90 0 0 1 280 110"
              fill="none"
              stroke="url(#solarGradientHome)"
              strokeWidth="3"
              strokeDasharray={`${(progressPercent / 100) * 380} 500`}
            />
          )}

          <line x1="10" y1="110" x2="290" y2="110" stroke="#26394B" strokeWidth="1.5" />

          <circle
            cx={sunX}
            cy={sunY}
            r="8"
            fill={isDay ? '#F59E0B' : '#8295A8'}
          />
          <circle cx={sunX} cy={sunY} r="3" fill="#07111D" />

          <defs>
            <linearGradient id="solarGradientHome" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#35C7E8" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
        </svg>

        <div className="w-full max-w-sm flex items-center justify-between text-xs px-2 mt-1">
          <div className="flex items-center gap-1.5">
            <Sunrise className="w-4 h-4 text-[var(--m-accent)]" />
            <div>
              <span className="text-[10px] text-[var(--m-text-muted)] block">Sunrise</span>
              <strong className="text-[var(--m-text-primary)] font-mono tabular-nums">{displaySunrise}</strong>
            </div>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-[var(--m-text-muted)] block">Total Daylight</span>
            <strong className="text-[var(--m-watch)] font-mono text-xs tabular-nums">{dayLengthStr}</strong>
          </div>

          <div className="flex items-center gap-1.5 text-right">
            <div>
              <span className="text-[10px] text-[var(--m-text-muted)] block">Sunset</span>
              <strong className="text-[var(--m-text-primary)] font-mono tabular-nums">{displaySunset}</strong>
            </div>
            <Sunset className="w-4 h-4 text-[var(--m-alert)]" />
          </div>
        </div>
      </div>

      {/* Real-time Solar Angle & Azimuth Metadata */}
      <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-[var(--m-border)] text-[var(--m-text-muted)]">
        <div className="flex items-center gap-1.5 font-mono tabular-nums">
          <Compass className="w-3.5 h-3.5 text-[var(--m-accent)]" />
          <span>
            Azimuth: <strong className="text-[var(--m-text-primary)]">{solarData.solarAzimuthDeg.toFixed(1)}°</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono tabular-nums">
          <Sparkles className="w-3.5 h-3.5 text-[var(--m-watch)]" />
          <span>
            Elevation:{' '}
            <strong className="text-[var(--m-watch)]">
              {solarData.solarElevationDeg > 0
                ? `+${solarData.solarElevationDeg.toFixed(1)}°`
                : `${solarData.solarElevationDeg.toFixed(1)}°`}
            </strong>
          </span>
        </div>
      </div>
    </DataPanel>
  );
};

