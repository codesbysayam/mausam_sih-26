// ====================================================================
// MAUSAM — Open-Meteo forecast-grid adapter
// Missing upstream fields remain missing. Zero is retained only when the
// provider explicitly returns numeric zero. A model grid is never labelled
// as a direct station observation.
// ====================================================================

import {
  CurrentWeatherContext,
  DailyForecastContext,
  HourlyForecastContext,
  ForecastContext,
  DataSourceContext,
} from '../../types/askMausam';

type RawRecord = Record<string, any>;

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function rounded(value: unknown, digits = 1): number | undefined {
  if (!finite(value)) return undefined;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function localIstToIso(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const normalized = value.trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const parsed = new Date(hasZone ? normalized : `${normalized}+05:30`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined;
}

export function decodeWmoCode(code: number | undefined, isDay = true): string {
  if (!finite(code)) return 'Condition unavailable';
  switch (code) {
    case 0: return isDay ? 'Clear Sky' : 'Clear Night';
    case 1: return isDay ? 'Mainly Clear' : 'Mainly Clear Night';
    case 2: return 'Partly Cloudy';
    case 3: return 'Overcast';
    case 45:
    case 48: return 'Fog / Depositing Rime Fog';
    case 51:
    case 53:
    case 55: return 'Drizzle';
    case 56:
    case 57: return 'Freezing Drizzle';
    case 61: return 'Slight Rain';
    case 63: return 'Moderate Rain';
    case 65: return 'Heavy Rain';
    case 66:
    case 67: return 'Freezing Rain';
    case 71:
    case 73:
    case 75: return 'Snowfall';
    case 77: return 'Snow Grains';
    case 80:
    case 81:
    case 82: return 'Rain Showers';
    case 85:
    case 86: return 'Snow Showers';
    case 95: return 'Thunderstorm';
    case 96:
    case 99: return 'Thunderstorm with Hail';
    default: return 'Condition unavailable';
  }
}

export function degreesToCompass(degrees: number | undefined): string | undefined {
  if (!finite(degrees)) return undefined;
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const normalized = ((degrees % 360) + 360) % 360;
  return directions[Math.round(normalized / 22.5) % 16];
}

export interface OpenMeteoBundle {
  current?: CurrentWeatherContext;
  forecast?: ForecastContext;
  source: DataSourceContext;
  soilMoisture?: number;
  soilTemperature?: number;
  evapotranspiration?: number;
}

export async function fetchOpenMeteoBundle(
  latitude: number,
  longitude: number
): Promise<OpenMeteoBundle> {
  const retrievedAt = new Date().toISOString();

  try {
    if (!finite(latitude) || !finite(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      throw new Error('Invalid latitude/longitude supplied to Open-Meteo adapter.');
    }

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: [
        'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
        'is_day', 'precipitation', 'rain', 'showers', 'weather_code',
        'cloud_cover', 'pressure_msl', 'surface_pressure',
        'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
        'dew_point_2m', 'visibility',
      ].join(','),
      hourly: [
        'temperature_2m', 'relative_humidity_2m', 'dew_point_2m',
        'precipitation_probability', 'precipitation', 'weather_code',
        'wind_speed_10m', 'wind_direction_10m', 'soil_moisture_0_to_1cm',
        'soil_temperature_0cm', 'et0_fao_evapotranspiration',
      ].join(','),
      daily: [
        'weather_code', 'temperature_2m_max', 'temperature_2m_min',
        'sunrise', 'sunset', 'uv_index_max', 'precipitation_sum',
        'precipitation_probability_max', 'wind_speed_10m_max',
      ].join(','),
      timezone: 'Asia/Kolkata',
      forecast_days: '7',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Open-Meteo returned HTTP ${response.status}`);
    }

    const data = await response.json() as RawRecord;
    if (!data || typeof data !== 'object') {
      throw new Error('Open-Meteo returned a non-object response.');
    }

    const cur: RawRecord = data.current || {};
    const daily: RawRecord = data.daily || {};
    const hourly: RawRecord = data.hourly || {};

    // Current temperature is the minimum required current-condition field.
    // If absent, return no current bundle instead of inventing 0°C.
    let current: CurrentWeatherContext | undefined;
    if (finite(cur.temperature_2m)) {
      const weatherCode = finite(cur.weather_code) ? cur.weather_code : undefined;
      const windDirection = degreesToCompass(cur.wind_direction_10m);
      const observedAt = localIstToIso(cur.time);

      current = {
        temperatureC: rounded(cur.temperature_2m)!,
        feelsLikeC: rounded(cur.apparent_temperature),
        humidity: finite(cur.relative_humidity_2m)
          ? Math.round(cur.relative_humidity_2m)
          : undefined,
        windSpeedKmh: rounded(cur.wind_speed_10m),
        windDirection: windDirection && finite(cur.wind_direction_10m)
          ? `${windDirection} (${Math.round(cur.wind_direction_10m)}°)`
          : undefined,
        windGustsKmh: rounded(cur.wind_gusts_10m),
        precipitationMm: rounded(cur.precipitation),
        weatherCode,
        condition: decodeWmoCode(weatherCode, cur.is_day === 1),
        isDay: typeof cur.is_day === 'number' ? cur.is_day === 1 : undefined,
        pressureHpa: rounded(cur.pressure_msl) ?? rounded(cur.surface_pressure),
        dewPointC: rounded(cur.dew_point_2m),
        uvIndex: undefined,
        visibilityKm: finite(cur.visibility) ? rounded(cur.visibility / 1000) : undefined,
        observedAt,
      };

      // Match probability to the provider's current timestamp, not array index 0.
      const times: unknown[] = Array.isArray(hourly.time) ? hourly.time : [];
      const currentIndex = typeof cur.time === 'string' ? times.indexOf(cur.time) : -1;
      const currentProbability =
        currentIndex >= 0 && Array.isArray(hourly.precipitation_probability)
          ? hourly.precipitation_probability[currentIndex]
          : undefined;
      if (finite(currentProbability)) {
        current.precipitationProbability = Math.max(0, Math.min(100, Math.round(currentProbability)));
      }
    }

    const dailyItems: DailyForecastContext[] = [];
    if (Array.isArray(daily.time)) {
      daily.time.forEach((dateValue: unknown, index: number) => {
        const date = typeof dateValue === 'string' ? dateValue : '';
        const high = daily.temperature_2m_max?.[index];
        const low = daily.temperature_2m_min?.[index];
        const rainMm = daily.precipitation_sum?.[index];
        const rainProbability = daily.precipitation_probability_max?.[index];
        const weatherCode = daily.weather_code?.[index];

        // Required values must be present; don't replace missing forecast values with zero.
        if (!date || !finite(high) || !finite(low) ||
            !finite(rainMm) || !finite(rainProbability) || !finite(weatherCode)) return;

        const dateObj = new Date(`${date}T12:00:00+05:30`);
        const dayName = dateObj.toLocaleDateString('en-IN', {
          weekday: 'short',
          timeZone: 'Asia/Kolkata',
        });

        dailyItems.push({
          date,
          dayName: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : dayName,
          maxTempC: Math.round(high * 10) / 10,
          minTempC: Math.round(low * 10) / 10,
          precipitationMm: Math.round(rainMm * 10) / 10,
          precipitationProbability: Math.max(0, Math.min(100, Math.round(rainProbability))),
          condition: decodeWmoCode(weatherCode, true),
          weatherCode,
          windSpeedKmh: rounded(daily.wind_speed_10m_max?.[index], 0),
          uvIndexMax: rounded(daily.uv_index_max?.[index]),
        });
      });
    }

    const hourlyItems: HourlyForecastContext[] = [];
    if (Array.isArray(hourly.time)) {
      const maxHours = Math.min(24, hourly.time.length);
      for (let index = 0; index < maxHours; index++) {
        const timeValue = hourly.time[index];
        const temp = hourly.temperature_2m?.[index];
        const precipitation = hourly.precipitation?.[index];
        const probability = hourly.precipitation_probability?.[index];
        const weatherCode = hourly.weather_code?.[index];

        if (typeof timeValue !== 'string' || !finite(temp) ||
            !finite(precipitation) || !finite(probability) || !finite(weatherCode)) {
          continue;
        }

        const dateObj = new Date(`${timeValue}+05:30`);
        const hourLabel = dateObj.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        });

        hourlyItems.push({
          time: hourLabel,
          temperatureC: Math.round(temp * 10) / 10,
          precipitationMm: Math.round(precipitation * 10) / 10,
          precipitationProbability: Math.max(0, Math.min(100, Math.round(probability))),
          condition: decodeWmoCode(weatherCode, true),
          weatherCode,
          humidity: finite(hourly.relative_humidity_2m?.[index])
            ? Math.round(hourly.relative_humidity_2m[index])
            : undefined,
        });
      }
    }

    const forecast: ForecastContext | undefined =
      dailyItems.length || hourlyItems.length
        ? {
            daily: dailyItems,
            hourly: hourlyItems,
            synopsis: dailyItems.length
              ? `Seven-day model outlook: ${dailyItems.length} verified daily forecast records are available. Review the daily range, precipitation probability and model issue time before making decisions.`
              : undefined,
          }
        : undefined;

    const soilMoisture = rounded(hourly.soil_moisture_0_to_1cm?.[0], 3);
    const soilTemperature = rounded(hourly.soil_temperature_0cm?.[0]);
    const evapotranspiration = rounded(hourly.et0_fao_evapotranspiration?.[0]);

    return {
      current,
      forecast,
      source: {
        provider: 'Open-Meteo',
        status: 'RECENT',
        retrievedAt,
        observedAt: current?.observedAt,
        isOfficialIMD: false,
        details: 'Successfully retrieved numerical weather model output. This is a forecast-grid product, not a direct IMD station observation.',
      },
      soilMoisture,
      soilTemperature,
      evapotranspiration,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown upstream failure';
    return {
      source: {
        provider: 'Open-Meteo',
        status: 'UNAVAILABLE',
        retrievedAt,
        isOfficialIMD: false,
        details: message,
      },
    };
  }
}
