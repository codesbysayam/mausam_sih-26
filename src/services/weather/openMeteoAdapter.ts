// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Open-Meteo Meteorological Adapter (Authoritative Public Fallback)
// Never claims Open-Meteo is IMD; accurately flags provider & live status
// ====================================================================

import {
  CurrentWeatherContext,
  DailyForecastContext,
  HourlyForecastContext,
  ForecastContext,
  DataSourceContext,
} from '../../types/askMausam';
import {
  finiteNumber,
  roundedNumber,
  findNearestHourlyIndex,
} from '../../../shared/weatherContract';

// WMO Weather interpretation table
export function decodeWmoCode(code: number | null | undefined, isDay = true): string {
  if (typeof code !== 'number' || !Number.isFinite(code)) {
    return 'Condition Unavailable';
  }
  switch (code) {
    case 0:
      return isDay ? 'Clear Sky' : 'Clear Night';
    case 1:
      return isDay ? 'Mainly Clear' : 'Mainly Clear Night';
    case 2:
      return 'Partly Cloudy';
    case 3:
      return 'Overcast';
    case 45:
    case 48:
      return 'Fog / Depositing Rime Fog';
    case 51:
    case 53:
    case 55:
      return 'Drizzle';
    case 56:
    case 57:
      return 'Freezing Drizzle';
    case 61:
      return 'Slight Rain';
    case 63:
      return 'Moderate Rain';
    case 65:
      return 'Heavy Rain';
    case 66:
    case 67:
      return 'Freezing Rain';
    case 71:
    case 73:
    case 75:
      return 'Snowfall';
    case 77:
      return 'Snow Grains';
    case 80:
    case 81:
    case 82:
      return 'Rain Showers';
    case 85:
    case 86:
      return 'Snow Showers';
    case 95:
      return 'Thunderstorm';
    case 96:
    case 99:
      return 'Thunderstorm with Hail';
    default:
      return 'Condition Unavailable';
  }
}

export function degreesToCompass(degrees: number | null | undefined): string | undefined {
  if (typeof degrees !== 'number' || !Number.isFinite(degrees)) return undefined;
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5);
  return directions[index % 16];
}

export interface OpenMeteoBundle {
  current?: CurrentWeatherContext;
  forecast?: ForecastContext;
  source: DataSourceContext;
  soilMoisture?: number;
  soilTemperature?: number;
  evapotranspiration?: number;
}

/**
 * Pure normalization of an Open-Meteo JSON response into canonical MAUSAM context.
 * Preserves legitimate 0 values (0°C, 0 mm, 0%, 0 km/h), never coerces missing
 * metrics to 0 or 1013 hPa, and aligns hourly fields by timestamp matching.
 */
export function normalizeOpenMeteoPayload(
  data: any,
  retrievedAt: string = new Date().toISOString()
): OpenMeteoBundle {
  const cur = data?.current ?? null;
  const daily = data?.daily ?? null;
  const hourly = data?.hourly ?? null;

  const hourlyTimes: string[] = Array.isArray(hourly?.time) ? hourly.time : [];
  const matchedHourlyIdx = findNearestHourlyIndex(hourlyTimes, cur?.time ?? retrievedAt);

  const weatherCode = finiteNumber(cur?.weather_code) ?? undefined;
  const isDayVal = typeof cur?.is_day === 'number' ? Boolean(cur.is_day) : undefined;
  const condition = decodeWmoCode(weatherCode, isDayVal ?? true);

  const windDirDeg = finiteNumber(cur?.wind_direction_10m);
  const windCompass = degreesToCompass(windDirDeg);
  const windDirection =
    windCompass !== undefined && windDirDeg !== null
      ? `${windCompass} (${Math.round(windDirDeg)}°)`
      : undefined;

  const rawPressure = finiteNumber(cur?.pressure_msl) ?? finiteNumber(cur?.surface_pressure);
  const rawVisibility = finiteNumber(cur?.visibility);

  const matchedRainProb =
    matchedHourlyIdx >= 0
      ? roundedNumber(hourly?.precipitation_probability?.[matchedHourlyIdx], 0)
      : null;

  const observedAt =
    typeof cur?.time === 'string' && cur.time.trim().length > 0
      ? /(?:Z|[+-]\d{2}:?\d{2})$/i.test(cur.time.trim())
        ? cur.time.trim()
        : `${cur.time.trim()}+05:30`
      : undefined;

  const currentContext: CurrentWeatherContext | undefined = cur
    ? {
        temperatureC: roundedNumber(cur.temperature_2m, 1) ?? undefined,
        feelsLikeC: roundedNumber(cur.apparent_temperature, 1) ?? undefined,
        humidity: roundedNumber(cur.relative_humidity_2m, 0) ?? undefined,
        windSpeedKmh: roundedNumber(cur.wind_speed_10m, 1) ?? undefined,
        windDirection,
        windGustsKmh: roundedNumber(cur.wind_gusts_10m, 1) ?? undefined,
        precipitationMm: roundedNumber(cur.precipitation, 1) ?? undefined,
        precipitationProbability: matchedRainProb ?? undefined,
        weatherCode,
        condition,
        isDay: isDayVal,
        pressureHpa: rawPressure !== null ? Math.round(rawPressure) : undefined,
        dewPointC: roundedNumber(cur.dew_point_2m, 1) ?? undefined,
        visibilityKm:
          rawVisibility !== null ? Math.round((rawVisibility / 1000) * 10) / 10 : undefined,
        observedAt,
      }
    : undefined;

  // Build 7-day forecast without coercing missing values to 0
  const dailyItems: DailyForecastContext[] = [];
  if (daily && Array.isArray(daily.time)) {
    daily.time.forEach((dateStr: string, idx: number) => {
      const d = new Date(`${dateStr}T00:00:00+05:30`);
      const dayName = Number.isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' });
      const dayCode = finiteNumber(daily.weather_code?.[idx]) ?? undefined;
      dailyItems.push({
        date: dateStr,
        dayName: idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : dayName,
        maxTempC: roundedNumber(daily.temperature_2m_max?.[idx], 0) ?? undefined,
        minTempC: roundedNumber(daily.temperature_2m_min?.[idx], 0) ?? undefined,
        precipitationMm: roundedNumber(daily.precipitation_sum?.[idx], 1) ?? undefined,
        precipitationProbability:
          roundedNumber(daily.precipitation_probability_max?.[idx], 0) ?? undefined,
        condition: decodeWmoCode(dayCode, true),
        weatherCode: dayCode,
        windSpeedKmh: roundedNumber(daily.wind_speed_10m_max?.[idx], 0) ?? undefined,
        uvIndexMax: roundedNumber(daily.uv_index_max?.[idx], 1) ?? undefined,
      });
    });
  }

  // Build next 24 hours aligned from the matched current hour index
  const hourlyItems: HourlyForecastContext[] = [];
  if (hourly && hourlyTimes.length > 0) {
    const startIdx = matchedHourlyIdx >= 0 ? matchedHourlyIdx : 0;
    const endIdx = Math.min(startIdx + 24, hourlyTimes.length);
    for (let i = startIdx; i < endIdx; i++) {
      const timeStr = hourlyTimes[i];
      const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timeStr);
      const dateObj = new Date(hasOffset ? timeStr : `${timeStr}+05:30`);
      const hourLabel = Number.isNaN(dateObj.getTime())
        ? timeStr
        : dateObj.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
          });
      const hrCode = finiteNumber(hourly.weather_code?.[i]) ?? undefined;
      hourlyItems.push({
        time: hourLabel,
        temperatureC: roundedNumber(hourly.temperature_2m?.[i], 1) ?? undefined,
        precipitationMm: roundedNumber(hourly.precipitation?.[i], 1) ?? undefined,
        precipitationProbability:
          roundedNumber(hourly.precipitation_probability?.[i], 0) ?? undefined,
        condition: decodeWmoCode(hrCode, true),
        weatherCode: hrCode,
        humidity: roundedNumber(hourly.relative_humidity_2m?.[i], 0) ?? undefined,
      });
    }
  }

  const firstDay = dailyItems[0];
  let synopsis: string | undefined;
  if (firstDay) {
    const parts: string[] = [];
    if (firstDay.maxTempC !== undefined && firstDay.minTempC !== undefined) {
      parts.push(`Peak temperatures around ${firstDay.maxTempC}°C with lows near ${firstDay.minTempC}°C`);
    } else if (firstDay.maxTempC !== undefined) {
      parts.push(`Peak temperatures around ${firstDay.maxTempC}°C`);
    }
    if (firstDay.precipitationProbability !== undefined) {
      parts.push(`rain probability is ${firstDay.precipitationProbability}%`);
    }
    if (parts.length > 0) {
      synopsis = `7-Day Outlook: ${parts.join('. ')}.`;
    }
  }

  const forecastContext: ForecastContext = {
    daily: dailyItems,
    hourly: hourlyItems,
    synopsis,
  };

  const soilMoisture =
    matchedHourlyIdx >= 0
      ? finiteNumber(hourly?.soil_moisture_0_to_1cm?.[matchedHourlyIdx]) ?? undefined
      : undefined;
  const soilTemperature =
    matchedHourlyIdx >= 0
      ? finiteNumber(hourly?.soil_temperature_0cm?.[matchedHourlyIdx]) ?? undefined
      : undefined;
  const evapotranspiration =
    matchedHourlyIdx >= 0
      ? finiteNumber(hourly?.et0_fao_evapotranspiration?.[matchedHourlyIdx]) ?? undefined
      : undefined;

  return {
    current: currentContext,
    forecast: forecastContext,
    source: {
      provider: 'Open-Meteo',
      status: 'LIVE',
      retrievedAt,
      observedAt: currentContext?.observedAt,
      isOfficialIMD: false,
      details: 'High-resolution numerical weather prediction (WMO ECMWF/ICON model grid)',
    },
    soilMoisture,
    soilTemperature,
    evapotranspiration,
  };
}

export async function fetchOpenMeteoBundle(
  latitude: number,
  longitude: number
): Promise<OpenMeteoBundle> {
  const retrievedAt = new Date().toISOString();
  try {
    const weatherQuery = [
      `latitude=${latitude}`,
      `longitude=${longitude}`,
      'current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m,visibility',
      'hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,soil_moisture_0_to_1cm,soil_temperature_0cm,et0_fao_evapotranspiration',
      'daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
      'timezone=Asia%2FKolkata',
      'forecast_days=7',
    ].join('&');

    const url = `https://api.open-meteo.com/v1/forecast?${weatherQuery}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const data = await res.json();
    return normalizeOpenMeteoPayload(data, retrievedAt);
  } catch (err: any) {
    return {
      source: {
        provider: 'Open-Meteo',
        status: 'UNAVAILABLE',
        retrievedAt,
        details: err?.message || 'Network unreachable',
      },
    };
  }
}
