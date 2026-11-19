// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Open-Meteo Adapter (Verified Free Multi-Model Baseline)
// ====================================================================

import { NormalizedWeather, NormalizedForecast, NormalizedHourlyItem, NormalizedDailyItem, GeoLocation } from '../normalization/types';
import { WeatherValidator } from '../validation/weatherValidator';
import { dataHealthService } from '../services/DataHealthService';

export class OpenMeteoAdapter {
  private static weatherEndpoint = process.env.OPEN_METEO_ENDPOINT || 'https://api.open-meteo.com/v1';

  private static numOrNull(val: unknown): number | null {
    return typeof val === 'number' && Number.isFinite(val) ? val : null;
  }

  private static interpretWmoCode(code: number | null | undefined): string {
    if (code === null || code === undefined || !Number.isFinite(code)) {
      return 'Condition Unavailable';
    }
    switch (code) {
      case 0: return 'Clear Sky';
      case 1: return 'Mainly Clear';
      case 2: return 'Partly Cloudy';
      case 3: return 'Overcast';
      case 45: return 'Fog';
      case 48: return 'Depositing Rime Fog';
      case 51: return 'Light Drizzle';
      case 53: return 'Moderate Drizzle';
      case 55: return 'Dense Drizzle';
      case 61: return 'Slight Rain';
      case 63: return 'Moderate Rain';
      case 65: return 'Heavy Rain';
      case 71: return 'Slight Snow';
      case 73: return 'Moderate Snow';
      case 75: return 'Heavy Snow';
      case 80: return 'Slight Rain Showers';
      case 81: return 'Moderate Rain Showers';
      case 82: return 'Violent Rain Showers';
      case 95: return 'Thunderstorm';
      case 96: return 'Thunderstorm with Slight Hail';
      case 99: return 'Thunderstorm with Heavy Hail';
      default: return 'Condition Unavailable';
    }
  }

  public static async fetchCurrentWeather(loc: GeoLocation): Promise<NormalizedWeather | null> {
    const startTime = Date.now();
    try {
      const url = `${this.weatherEndpoint}/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&hourly=dew_point_2m,uv_index&timeformat=unixtime`;

      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const latency = Date.now() - startTime;

      if (!res.ok) {
        dataHealthService.recordFailure('OPEN_METEO', `HTTP ${res.status}: ${res.statusText}`, res.status);
        return null;
      }

      const json = await res.json();
      const current = json.current;
      if (!current) {
        dataHealthService.recordRejection('OPEN_METEO', 1);
        return null;
      }

      const dewPoint = this.numOrNull(json.hourly?.dew_point_2m?.[0]);
      const uv = this.numOrNull(json.hourly?.uv_index?.[0]);
      const visMeters = this.numOrNull(current.visibility);
      const wmoCode = this.numOrNull(current.weather_code);
      const temp = this.numOrNull(current.temperature_2m);
      const hum = this.numOrNull(current.relative_humidity_2m);
      const wind = this.numOrNull(current.wind_speed_10m);
      const hasPrimary = temp !== null && (hum !== null || wind !== null);

      const observedEpochMs = typeof current.time === 'number' ? current.time * 1000 : Date.now();

      const normalized: NormalizedWeather = {
        location: loc,
        observedAt: new Date(observedEpochMs).toISOString(),
        fetchedAt: new Date().toISOString(),
        dataStatus: hasPrimary ? 'LIVE' : 'UNAVAILABLE',
        ageSeconds: 0,
        temperature: temp !== null ? Math.round(temp * 10) / 10 : null,
        feelsLike: this.numOrNull(current.apparent_temperature) !== null ? Math.round(current.apparent_temperature * 10) / 10 : null,
        humidity: hum !== null ? Math.round(hum) : null,
        dewPoint: dewPoint !== null ? Math.round(dewPoint * 10) / 10 : null,
        pressure: this.numOrNull(current.pressure_msl) !== null ? Math.round(current.pressure_msl * 10) / 10 : null,
        windSpeed: wind !== null ? Math.round(wind * 10) / 10 : null,
        windDirection: this.numOrNull(current.wind_direction_10m) !== null ? `${Math.round(current.wind_direction_10m)}°` : null,
        windDirectionDegrees: this.numOrNull(current.wind_direction_10m),
        windGust: this.numOrNull(current.wind_gusts_10m),
        visibility: visMeters !== null ? Math.round((visMeters / 1000) * 10) / 10 : null,
        cloudCover: this.numOrNull(current.cloud_cover),
        precipitation: this.numOrNull(current.precipitation),
        rainfall24h: this.numOrNull(current.rain),
        uvIndex: uv,
        weatherCode: wmoCode,
        condition: this.interpretWmoCode(wmoCode),
        isDay: current.is_day === 1,
        source: 'Open-Meteo',
        sourcePriority: 4,
        isFallback: true,
        rawSourceAttribution: 'Open-Meteo / WMO Standard Synoptic Ensemble under CC BY 4.0',
      };

      const validation = WeatherValidator.validateObservation(normalized);
      if (!validation.isValid) {
        dataHealthService.recordRejection('OPEN_METEO', 1);
        console.warn('[OpenMeteoAdapter] Observation rejected by validator:', validation.errors);
        return null;
      }

      dataHealthService.recordSuccess('OPEN_METEO', latency, 1, res.status);
      return normalized;
    } catch (err: any) {
      dataHealthService.recordFailure('OPEN_METEO', err.message, 500);
      return null;
    }
  }

  public static async fetchForecast(loc: GeoLocation, model: string = 'ecmwf_ifs025'): Promise<NormalizedForecast | null> {
    const startTime = Date.now();
    try {
      const url = `${this.weatherEndpoint}/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset&timezone=auto&forecast_days=7`;

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const latency = Date.now() - startTime;

      if (!res.ok) {
        dataHealthService.recordFailure('OPEN_METEO', `Forecast HTTP ${res.status}: ${res.statusText}`, res.status);
        return null;
      }

      const json = await res.json();
      const hourlyData = json.hourly;
      const dailyData = json.daily;

      if (!hourlyData || !dailyData) {
        dataHealthService.recordRejection('OPEN_METEO', 1);
        return null;
      }

      const hourly: NormalizedHourlyItem[] = [];
      const times = hourlyData.time || [];
      for (let i = 0; i < Math.min(times.length, 48); i++) {
        const temp = this.numOrNull(hourlyData.temperature_2m?.[i]);
        if (temp === null) continue;
        const feels = this.numOrNull(hourlyData.apparent_temperature?.[i]);
        const hum = this.numOrNull(hourlyData.relative_humidity_2m?.[i]);
        const prob = this.numOrNull(hourlyData.precipitation_probability?.[i]);
        const precip = this.numOrNull(hourlyData.precipitation?.[i]);
        const code = this.numOrNull(hourlyData.weather_code?.[i]);
        const wind = this.numOrNull(hourlyData.wind_speed_10m?.[i]);
        const uv = this.numOrNull(hourlyData.uv_index?.[i]);

        hourly.push({
          time: new Date(times[i]).toISOString(),
          temperature: Math.round(temp),
          feelsLike: Math.round(feels ?? temp),
          humidity: hum !== null ? Math.round(hum) : 0,
          precipitationProbability: prob ?? 0,
          precipitation: precip ?? 0,
          weatherCode: code ?? -1,
          condition: this.interpretWmoCode(code),
          windSpeed: wind !== null ? Math.round(wind) : 0,
          uvIndex: uv ?? undefined,
        });
      }

      const daily: NormalizedDailyItem[] = [];
      const dailyDates = dailyData.time || [];
      for (let i = 0; i < dailyDates.length; i++) {
        const tMax = this.numOrNull(dailyData.temperature_2m_max?.[i]);
        const tMin = this.numOrNull(dailyData.temperature_2m_min?.[i]);
        if (tMax === null || tMin === null) continue;
        const code = this.numOrNull(dailyData.weather_code?.[i]);
        const precipSum = this.numOrNull(dailyData.precipitation_sum?.[i]);
        const precipProbMax = this.numOrNull(dailyData.precipitation_probability_max?.[i]);
        const windMax = this.numOrNull(dailyData.wind_speed_10m_max?.[i]);
        const uvMax = this.numOrNull(dailyData.uv_index_max?.[i]);

        daily.push({
          date: dailyDates[i],
          tempMax: Math.round(tMax),
          tempMin: Math.round(tMin),
          weatherCode: code ?? -1,
          condition: this.interpretWmoCode(code),
          precipitationSum: precipSum ?? 0,
          precipitationProbabilityMax: precipProbMax ?? 0,
          windSpeedMax: windMax !== null ? Math.round(windMax) : 0,
          uvIndexMax: uvMax ?? 0,
          sunrise: dailyData.sunrise?.[i] ? new Date(dailyData.sunrise[i]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : undefined,
          sunset: dailyData.sunset?.[i] ? new Date(dailyData.sunset[i]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : undefined,
        });
      }

      const forecast: NormalizedForecast = {
        location: loc,
        model: model.toUpperCase(),
        generatedAt: new Date().toISOString(),
        source: 'Open-Meteo',
        dataStatus: 'LIVE',
        hourly,
        daily,
        sourceAttribution: 'Weather forecasts by Open-Meteo.com under CC BY 4.0.',
      };

      const validation = WeatherValidator.validateForecast(forecast);
      if (!validation.isValid) {
        dataHealthService.recordRejection('OPEN_METEO', 1);
        return null;
      }

      dataHealthService.recordSuccess('OPEN_METEO', latency, hourly.length + daily.length, res.status);
      return forecast;
    } catch (err: any) {
      dataHealthService.recordFailure('OPEN_METEO', err.message, 500);
      return null;
    }
  }
}
