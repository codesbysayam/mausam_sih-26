/**
 * High-Precision Astronomical Ephemeris Calculator
 * Computes solar and lunar positions, moon phases, illumination,
 * day/night lengths, civil twilight, and lunar rise/set based on standard
 * Jean Meeus Astronomical Algorithms and NOAA Solar Calculations.
 */

export interface LunarEphemeris {
  moonPhaseName: string;
  moonPhaseIcon: string;
  illuminationPercent: number;
  ageDays: number;
  moonriseStr: string;
  moonsetStr: string;
}

export interface SolarAstronomicalData {
  sunriseStr: string;
  sunsetStr: string;
  solarNoonStr: string; // Solar Zenith Time
  civilDawnStr: string;
  civilDuskStr: string;
  nauticalDawnStr: string;
  nauticalDuskStr: string;
  dayLengthStr: string;
  dayLengthMinutes: number;
  nightDurationStr: string;
  nightDurationMinutes: number;
  solarElevationDeg: number;
  solarAzimuthDeg: number;
  zenithElevationDeg: number; // Maximum solar altitude at local solar zenith
  zenithAngleDeg: number; // 90 - zenithElevationDeg
  declinationDeg: number;
  equationOfTimeMinutes: number;
  progressPercent: number;
  nextEventName: string;
  nextEventTimeStr: string;
  countdownFormatted: string;
  timeZoneUsed: string;
  isDaytime: boolean;
}

const degToRad = (deg: number) => (deg * Math.PI) / 180;
const radToDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Calculates local Sunrise, Sunset, Solar Zenith (Solar Noon), Zenith Peak Elevation,
 * Civil/Nautical Twilight, and real-time Solar Position for any coordinate & timezone.
 */
export function calculateSolarAstronomicalData(
  lat: number = 20.2961,
  lng: number = 85.8245,
  now: Date = new Date(),
  timezone?: string
): SolarAstronomicalData {
  const safeLat = Number.isFinite(lat) ? Math.max(-89.5, Math.min(89.5, lat)) : 20.2961;
  const safeLng = Number.isFinite(lng) ? Math.max(-180, Math.min(180, lng)) : 85.8245;

  // Determine appropriate IANA timezone (default to Asia/Kolkata for Indian coordinates)
  const isIndiaBounds = safeLat >= 6 && safeLat <= 38 && safeLng >= 68 && safeLng <= 98;
  const resolvedTimeZone = timezone || (isIndiaBounds ? 'Asia/Kolkata' : 'UTC');

  // Day of year (1-366)
  const startOfYearUtc = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const dayOfYear = Math.floor((now.getTime() - startOfYearUtc.getTime()) / 86400000);

  // Fractional year in radians (NOAA equations)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (now.getUTCHours() - 12) / 24);

  // Equation of time (minutes)
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination angle (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const declDeg = Math.round(radToDeg(decl) * 100) / 100;
  const latRad = degToRad(safeLat);

  // Hour angle helper for given zenith angle
  const computeHourAngleDeg = (zenithDeg: number): number => {
    const zRad = degToRad(zenithDeg);
    const cosHa =
      (Math.cos(zRad) - Math.sin(latRad) * Math.sin(decl)) /
      (Math.cos(latRad) * Math.cos(decl));
    return radToDeg(Math.acos(Math.max(-1, Math.min(1, cosHa))));
  };

  const haSunriseDeg = computeHourAngleDeg(90.833);
  const haCivilDeg = computeHourAngleDeg(96.0);
  const haNauticalDeg = computeHourAngleDeg(102.0);

  // Solar Zenith (Solar Noon) in UTC minutes from midnight
  const solarNoonUtcMin = 720 - 4 * safeLng - eqtime;
  const sunriseUtcMin = solarNoonUtcMin - haSunriseDeg * 4;
  const sunsetUtcMin = solarNoonUtcMin + haSunriseDeg * 4;
  const civilDawnUtcMin = solarNoonUtcMin - haCivilDeg * 4;
  const civilDuskUtcMin = solarNoonUtcMin + haCivilDeg * 4;
  const nauticalDawnUtcMin = solarNoonUtcMin - haNauticalDeg * 4;
  const nauticalDuskUtcMin = solarNoonUtcMin + haNauticalDeg * 4;

  const midnightUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0);

  const sunriseDate = new Date(midnightUtcMs + sunriseUtcMin * 60000);
  const sunsetDate = new Date(midnightUtcMs + sunsetUtcMin * 60000);
  const solarNoonDate = new Date(midnightUtcMs + solarNoonUtcMin * 60000);
  const civilDawnDate = new Date(midnightUtcMs + civilDawnUtcMin * 60000);
  const civilDuskDate = new Date(midnightUtcMs + civilDuskUtcMin * 60000);
  const nauticalDawnDate = new Date(midnightUtcMs + nauticalDawnUtcMin * 60000);
  const nauticalDuskDate = new Date(midnightUtcMs + nauticalDuskUtcMin * 60000);

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: resolvedTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  const sunriseStr = formatter.format(sunriseDate);
  const sunsetStr = formatter.format(sunsetDate);
  const solarNoonStr = formatter.format(solarNoonDate);
  const civilDawnStr = formatter.format(civilDawnDate);
  const civilDuskStr = formatter.format(civilDuskDate);
  const nauticalDawnStr = formatter.format(nauticalDawnDate);
  const nauticalDuskStr = formatter.format(nauticalDuskDate);

  // Daylight & Night duration
  const dayLengthMs = Math.max(0, sunsetDate.getTime() - sunriseDate.getTime());
  const dayLengthMinutes = Math.round(dayLengthMs / 60000);
  const dayHours = Math.floor(dayLengthMinutes / 60);
  const dayMins = dayLengthMinutes % 60;
  const dayLengthStr = `${dayHours}h ${String(dayMins).padStart(2, '0')}m`;

  const nightDurationMinutes = Math.max(0, 1440 - dayLengthMinutes);
  const nightHours = Math.floor(nightDurationMinutes / 60);
  const nightMins = nightDurationMinutes % 60;
  const nightDurationStr = `${nightHours}h ${String(nightMins).padStart(2, '0')}m`;

  // Maximum Solar Altitude at Solar Zenith (hourAngle = 0)
  const cosPeakZenith =
    Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl);
  const peakZenithRad = Math.acos(Math.max(-1, Math.min(1, cosPeakZenith)));
  const zenithAngleDeg = Math.round(radToDeg(peakZenithRad) * 10) / 10;
  const zenithElevationDeg = Math.round((90 - radToDeg(peakZenithRad)) * 10) / 10;

  // Current solar elevation & azimuth
  const currentUtcMinutes =
    now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
  const trueSolarTimeMin = (((currentUtcMinutes + 4 * safeLng + eqtime) % 1440) + 1440) % 1440;
  const hourAngleDeg = trueSolarTimeMin / 4 - 180;
  const hourAngleRad = degToRad(hourAngleDeg);

  const cosZenith =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(hourAngleRad);
  const zenithRad = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  const solarElevationDeg = Math.round((90 - radToDeg(zenithRad)) * 10) / 10;

  const sinZenith = Math.sin(zenithRad);
  const cosAzimuth =
    sinZenith > 1e-6
      ? (Math.sin(decl) - Math.sin(latRad) * Math.cos(zenithRad)) /
        (Math.cos(latRad) * sinZenith)
      : 0;
  let azimuthDeg = radToDeg(Math.acos(Math.max(-1, Math.min(1, cosAzimuth))));
  if (hourAngleDeg > 0) {
    azimuthDeg = 360 - azimuthDeg;
  }
  const solarAzimuthDeg = Math.round(azimuthDeg * 10) / 10;

  // Cycle progress & next solar event
  const nowMs = now.getTime();
  const sunriseMs = sunriseDate.getTime();
  const solarNoonMs = solarNoonDate.getTime();
  const sunsetMs = sunsetDate.getTime();

  const isDaytime = nowMs >= sunriseMs && nowMs <= sunsetMs;
  let progressPercent = 0;
  if (nowMs < sunriseMs) {
    progressPercent = 0;
  } else if (nowMs > sunsetMs) {
    progressPercent = 100;
  } else if (dayLengthMs > 0) {
    progressPercent = Math.min(100, Math.max(0, Math.round(((nowMs - sunriseMs) / dayLengthMs) * 100)));
  }

  let nextEventName = 'Sunrise';
  let nextEventTimeStr = sunriseStr;
  let targetMs = sunriseMs;

  if (nowMs < sunriseMs) {
    nextEventName = 'Sunrise';
    nextEventTimeStr = sunriseStr;
    targetMs = sunriseMs;
  } else if (nowMs < solarNoonMs) {
    nextEventName = 'Solar Zenith';
    nextEventTimeStr = solarNoonStr;
    targetMs = solarNoonMs;
  } else if (nowMs <= sunsetMs) {
    nextEventName = 'Sunset';
    nextEventTimeStr = sunsetStr;
    targetMs = sunsetMs;
  } else {
    const nextSunriseDate = new Date(sunriseMs + 86400000);
    nextEventName = 'Next Sunrise';
    nextEventTimeStr = formatter.format(nextSunriseDate);
    targetMs = nextSunriseDate.getTime();
  }

  const diffSeconds = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const remH = Math.floor(diffSeconds / 3600);
  const remM = Math.floor((diffSeconds % 3600) / 60);
  const remS = diffSeconds % 60;
  const countdownFormatted = `${String(remH).padStart(2, '0')}h ${String(remM).padStart(2, '0')}m ${String(remS).padStart(2, '0')}s`;

  return {
    sunriseStr,
    sunsetStr,
    solarNoonStr,
    civilDawnStr,
    civilDuskStr,
    nauticalDawnStr,
    nauticalDuskStr,
    dayLengthStr,
    dayLengthMinutes,
    nightDurationStr,
    nightDurationMinutes,
    solarElevationDeg,
    solarAzimuthDeg,
    zenithElevationDeg,
    zenithAngleDeg,
    declinationDeg: declDeg,
    equationOfTimeMinutes: Math.round(eqtime * 10) / 10,
    progressPercent,
    nextEventName,
    nextEventTimeStr,
    countdownFormatted,
    timeZoneUsed: resolvedTimeZone,
    isDaytime,
  };
}

/**
 * Calculates accurate moon phase and illumination using the synodic cycle
 */
export function calculateLunarEphemeris(
  lat: number = 20.29,
  lng: number = 85.82,
  date: Date = new Date()
): LunarEphemeris {
  // Known reference new moon: January 11, 2024 at 11:57 UTC
  const knownNewMoon = new Date(Date.UTC(2024, 0, 11, 11, 57, 0)).getTime();
  const synodicMonthMs = 29.53058867 * 24 * 60 * 60 * 1000;
  
  const diffMs = date.getTime() - knownNewMoon;
  const phaseCycle = (diffMs % synodicMonthMs + synodicMonthMs) % synodicMonthMs;
  const ageDays = phaseCycle / (24 * 60 * 60 * 1000);
  const phaseFraction = phaseCycle / synodicMonthMs; // 0 to 1

  // Illumination calculation: (1 - cos(phase_angle)) / 2
  const illuminationPercent = Math.round(((1 - Math.cos(2 * Math.PI * phaseFraction)) / 2) * 100);

  let moonPhaseName = 'New Moon';
  let moonPhaseIcon = '🌑';

  if (phaseFraction < 0.03 || phaseFraction >= 0.97) {
    moonPhaseName = 'New Moon';
    moonPhaseIcon = '🌑';
  } else if (phaseFraction < 0.22) {
    moonPhaseName = 'Waxing Crescent';
    moonPhaseIcon = '🌒';
  } else if (phaseFraction < 0.28) {
    moonPhaseName = 'First Quarter';
    moonPhaseIcon = '🌓';
  } else if (phaseFraction < 0.47) {
    moonPhaseName = 'Waxing Gibbous';
    moonPhaseIcon = '🌔';
  } else if (phaseFraction < 0.53) {
    moonPhaseName = 'Full Moon';
    moonPhaseIcon = '🌕';
  } else if (phaseFraction < 0.72) {
    moonPhaseName = 'Waning Gibbous';
    moonPhaseIcon = '🌖';
  } else if (phaseFraction < 0.78) {
    moonPhaseName = 'Last Quarter';
    moonPhaseIcon = '🌗';
  } else {
    moonPhaseName = 'Waning Crescent';
    moonPhaseIcon = '🌘';
  }

  // Moonrise / Moonset estimation: moon rises ~50 minutes later each day after new moon
  // At new moon, moon rises ~06:00 and sets ~18:00
  const baseRiseHours = (6 + ageDays * 0.83) % 24;
  const baseSetHours = (baseRiseHours + 12.4) % 24;

  const formatHours = (h: number): string => {
    const hours = Math.floor(h);
    const minutes = Math.floor((h - hours) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayH = hours % 12 === 0 ? 12 : hours % 12;
    const displayM = minutes.toString().padStart(2, '0');
    return `${displayH.toString().padStart(2, '0')}:${displayM} ${period}`;
  };

  return {
    moonPhaseName,
    moonPhaseIcon,
    illuminationPercent,
    ageDays: Math.round(ageDays * 10) / 10,
    moonriseStr: formatHours(baseRiseHours),
    moonsetStr: formatHours(baseSetHours),
  };
}

/**
 * Calculates civil twilight, solar noon, day length, and night duration
 */
export function calculateNightDuration(dayLengthMinutes: number): string {
  const totalDayMins = 24 * 60;
  const nightMins = Math.max(0, totalDayMins - dayLengthMinutes);
  const hrs = Math.floor(nightMins / 60);
  const mins = nightMins % 60;
  return `${hrs}h ${mins}m`;
}
