import {
  CurrentWeather,
  HourlyForecastItem,
  DailyForecastItem,
  HistoricalTrendPoint,
  LocationRecord,
  WeatherConditionType,
  NormalizedWeatherCondition,
  WeatherAlert,
} from '../types';
import { resolveWeatherCondition } from './weatherResolver';
import { getWeatherCondition } from './weatherConditions';
import { calculateLunarEphemeris, calculateNightDuration } from '../utils/astronomyCalculator';
import { crossTabSync } from './crossTabSync';
import type { DataProvenance } from '../types/dataProvenance';
import { safeStorageGetJson, safeStorageSetJson } from '../utils/safeStorage';

export class OpenMeteoPayloadError extends Error {
  public readonly code = 'OPEN_METEO_INVALID_PAYLOAD';
  constructor(message: string) {
    super(message);
    this.name = 'OpenMeteoPayloadError';
  }
}

export function validateOpenMeteoPayload(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new OpenMeteoPayloadError('Open-Meteo response must be a JSON object.');
  }

  const candidate = value as Record<string, any>;
  const omWeather =
    candidate.raw &&
    typeof candidate.raw === 'object' &&
    !Array.isArray(candidate.raw) &&
    (candidate.raw.current || candidate.raw.hourly || candidate.raw.daily)
      ? (candidate.raw as Record<string, any>)
      : candidate;

  const hasCurrent = Boolean(omWeather.current && typeof omWeather.current === 'object' && !Array.isArray(omWeather.current));
  const hasHourly = Boolean(omWeather.hourly && typeof omWeather.hourly === 'object' && !Array.isArray(omWeather.hourly));
  const hasDaily = Boolean(omWeather.daily && typeof omWeather.daily === 'object' && !Array.isArray(omWeather.daily));

  if (!hasCurrent && !hasHourly && !hasDaily) {
    throw new OpenMeteoPayloadError(
      'Open-Meteo payload is missing required current, hourly, or daily meteorological blocks.'
    );
  }

  if (hasCurrent && omWeather.current.time !== undefined && omWeather.current.time !== null) {
    const parsedTime = new Date(omWeather.current.time);
    if (!Number.isFinite(parsedTime.getTime())) {
      throw new OpenMeteoPayloadError(
        `Open-Meteo payload contains invalid current.time value: ${String(omWeather.current.time)}`
      );
    }
  }

  return omWeather;
}

export interface WeatherDataBundle {
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  trends: HistoricalTrendPoint[];
  alerts?: WeatherAlert[];
  lastFetchedAt: Date;
  isLive: boolean;
  provenance?: DataProvenance;
  error?: string | null;
}

export type DemoWeatherOverride =
  | 'LIVE'
  | 'TEST_CLEAR_NO_RAIN'
  | 'TEST_CLEAR_RAIN_LATER'
  | 'TEST_RAIN_NOW'
  | 'TEST_THUNDERSTORM_NOW'
  | 'TEST_DENSE_FOG'
  | 'TEST_DUST_STORM';

class WeatherService {
  private cache: Map<string, { data: WeatherDataBundle; timestamp: number }> = new Map();
  private cacheTtlMs = 8 * 60 * 1000; // 8 minutes TTL
  private demoOverride: DemoWeatherOverride = 'LIVE'; // Disabled by default per Part 22
  private inFlightFetches: Map<string, Promise<WeatherDataBundle>> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    // Ingest data broadcasted from other tabs to eliminate redundant network fetches
    crossTabSync.subscribe((msg) => {
      if (msg.type === 'WEATHER_UPDATE' && msg.payload?.locationId && msg.payload?.bundle) {
        const { locationId, bundle } = msg.payload;
        // Revive Date object
        if (bundle.lastFetchedAt && !(bundle.lastFetchedAt instanceof Date)) {
          bundle.lastFetchedAt = new Date(bundle.lastFetchedAt);
        }
        this.cache.set(locationId, { data: bundle, timestamp: Date.now() });
      }
    });

    // Hydrate from localStorage for instantaneous startup
    this.hydrateFromStorage();
  }

  private hydrateFromStorage() {
    const parsed = safeStorageGetJson<Record<string, any>>('local', 'mausam_weather_cache_v1');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    const now = Date.now();
    // Keep entries newer than 2 hours
    Object.entries(parsed).forEach(([key, val]: [string, any]) => {
      if (
        val &&
        val.timestamp &&
        now - val.timestamp < 2 * 3600 * 1000 &&
        val.data?.current &&
        typeof val.data.current.temp === 'number' &&
        Number.isFinite(val.data.current.temp)
      ) {
        val.data.lastFetchedAt = new Date(val.data.lastFetchedAt);
        this.cache.set(key, val);
      }
    });
  }

  private persistToStorage(key: string, data: WeatherDataBundle, timestamp: number) {
    const existing = safeStorageGetJson<Record<string, any>>('local', 'mausam_weather_cache_v1');
    const parsed =
      existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
    parsed[key] = { data, timestamp };
    safeStorageSetJson('local', 'mausam_weather_cache_v1', parsed);
  }

  setDemoOverride(override: DemoWeatherOverride) {
    this.demoOverride = override;
  }

  getDemoOverride(): DemoWeatherOverride {
    return this.demoOverride;
  }

  /**
   * Formats a date into official Indian Standard Time (Asia/Kolkata) string
   */
  formatIstTime(date: Date, includeSeconds = false): string {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
    }).format(date);
  }

  formatIstDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  /**
   * Cancel ongoing request for a specific location
   */
  abortOngoingRequest(locationId?: string) {
    if (locationId && this.abortControllers.has(locationId)) {
      this.abortControllers.get(locationId)?.abort();
      this.abortControllers.delete(locationId);
      this.inFlightFetches.delete(locationId);
    } else if (!locationId) {
      this.abortControllers.forEach((c) => c.abort());
      this.abortControllers.clear();
      this.inFlightFetches.clear();
    }
  }

  /**
   * Fetches real-time normalized weather for a given LocationRecord
   */
  async getWeatherData(
    location: LocationRecord,
    forceRefresh = false
  ): Promise<WeatherDataBundle> {
    return this.fetchWeatherForLocation(location, forceRefresh);
  }

  async fetchWeatherForLocation(
    location: LocationRecord,
    forceRefresh = false
  ): Promise<WeatherDataBundle> {
    const cacheKey = location.id;
    const now = Date.now();

    // Check memory cache
    if (!forceRefresh && this.demoOverride === 'LIVE') {
      const cached = this.cache.get(cacheKey);
      if (cached && now - cached.timestamp < this.cacheTtlMs) {
        return cached.data;
      }
    }

    // Handle Demo Mode overrides for testing
    if (this.demoOverride !== 'LIVE') {
      const demoData = this.generateDemoBundle(location, this.demoOverride);
      return demoData;
    }

    // Request Deduplication: join in-flight promise if one already exists
    const inFlight = this.inFlightFetches.get(cacheKey);
    if (inFlight && !forceRefresh) {
      return inFlight;
    }

    // Abort previous in-flight request for this location
    this.abortOngoingRequest(cacheKey);
    const controller = new AbortController();
    this.abortControllers.set(cacheKey, controller);

    // Stale-While-Revalidate: If we have stale cache, return it immediately while refreshing in background
    const existingStale = this.cache.get(cacheKey);
    const shouldBackgroundRefresh = !forceRefresh && existingStale && (now - existingStale.timestamp >= this.cacheTtlMs);

    const fetchPromise: Promise<WeatherDataBundle> = (async (): Promise<WeatherDataBundle> => {
      try {
        const weatherQuery = `latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m,visibility&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility,cloud_cover,direct_normal_irradiance,soil_moisture_0_to_1cm,soil_temperature_0cm,et0_fao_evapotranspiration&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=Asia%2FKolkata&forecast_days=7`;
        const airQuery = `latitude=${location.lat}&longitude=${location.lng}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi,dust,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen,ammonia&timezone=Asia%2FKolkata`;

        let weatherData: any = null;
        let airData: any = null;

        // Try local same-origin proxy first (guaranteed no CORS or sandbox blocking)
        try {
          const [wRes, aRes] = await Promise.all([
            fetch(`/api/weather?mode=current&${weatherQuery}`, { signal: controller.signal }),
            fetch(`/api/weather?mode=air&${airQuery}`, { signal: controller.signal }),
          ]);
          if (wRes.ok) weatherData = await wRes.json();
          if (aRes.ok) airData = await aRes.json();
        } catch (proxyErr: any) {
          if (proxyErr.name === 'AbortError') throw proxyErr;
          console.warn('[WeatherService] Proxy fetch attempt failed, trying direct Open-Meteo:', proxyErr);
        }

        // Extract payload safely even if wrapped by /api/weather gateway
        const hasWeatherBlock = (d: any) =>
          Boolean(d && (d.raw?.current || d.current || d.raw?.hourly || d.hourly));

        if (!hasWeatherBlock(weatherData)) {
          weatherData = null;
        }

        // If proxy didn't succeed or lacked weather block, try direct Open-Meteo
        if (!weatherData) {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?${weatherQuery}`;
          const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${airQuery}`;
          const [weatherRes, airRes] = await Promise.allSettled([
            fetch(weatherUrl, { signal: controller.signal }),
            fetch(airQualityUrl, { signal: controller.signal }),
          ]);

          if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
            weatherData = await weatherRes.value.json();
          }
          if (airRes.status === 'fulfilled' && airRes.value.ok) {
            try {
              airData = await airRes.value.json();
            } catch (e) {
              console.warn('[WeatherService] Direct Air quality JSON parse error:', e);
            }
          }
        }

        if (!hasWeatherBlock(weatherData)) {
          throw new Error('Weather API returned incomplete atmospheric telemetry');
        }

        const bundle = this.transformOpenMeteoResponse(location, weatherData, airData);

        if (bundle.isLive || typeof bundle.current.temp === 'number') {
          // Cache only validated telemetry responses
          this.cache.set(cacheKey, { data: bundle, timestamp: Date.now() });
          this.persistToStorage(cacheKey, bundle, Date.now());

          // Broadcast to other open browser tabs
          crossTabSync.broadcastWeather(cacheKey, bundle);
        }

        return bundle;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          const stale = this.cache.get(cacheKey);
          if (stale) {
            return stale.data;
          }
          return this.createUnavailableBundle(location, 'Telemetry request cancelled before completion.');
        }
        console.warn(`[WeatherService] Live fetch failed for ${location.displayName}:`, err);

        // Check if we have stale cache
        const stale = this.cache.get(cacheKey);
        if (stale) {
          return {
            ...stale.data,
            current: {
              ...stale.data.current,
              observationStatus: 'STALE' as const,
              isLive: false,
            },
            isLive: false,
            error: `Live telemetry connection offline. Displaying cached observation from ${this.formatIstTime(
              stale.data.lastFetchedAt
            )} IST.`,
          };
        }

        // Honest unavailable state — zero fabricated telemetry
        return this.createUnavailableBundle(
          location,
          err instanceof Error ? err.message : 'Meteorological telemetry feed unavailable'
        );
      } finally {
        this.inFlightFetches.delete(cacheKey);
        this.abortControllers.delete(cacheKey);
      }
    })();

    this.inFlightFetches.set(cacheKey, fetchPromise);

    if (shouldBackgroundRefresh && existingStale) {
      // Guard background revalidation promise so it never leaves unhandled rejections
      fetchPromise.catch((e) => {
        console.debug('[WeatherService] Background refresh suppressed error:', e);
      });
      // Return stale immediately, let fetchPromise refresh silently in background
      return existingStale.data;
    }

    return fetchPromise;
  }

  /**
   * Honest initial loading state before the first network fetch resolves.
   */
  public createInitialLoadingBundle(location: LocationRecord): WeatherDataBundle {
    const now = new Date();
    return {
      current: {
        temp: null,
        unit: 'C',
        high: null,
        low: null,
        feelsLike: null,
        condition: 'Synchronizing Telemetry…',
        conditionKey: 'UNKNOWN',
        normalizedCondition: 'UNKNOWN',
        weatherType: 'sunny',
        icon: 'sync',
        windSpeed: null,
        windDirection: '—',
        windDirectionDeg: null,
        windGusts: null,
        humidity: null,
        pressure: null,
        dewPoint: null,
        uvIndex: null,
        pollen: null,
        pollenCount: null,
        grassPollen: null,
        treePollen: null,
        weedPollen: null,
        aqi: null,
        aqiPm25: null,
        aqiPm10: null,
        aqiIndex: null,
        no2: null,
        so2: null,
        co: null,
        o3: null,
        dust: null,
        aqiStatus: 'Unavailable',
        precipitation: null,
        precipitationProbability: null,
        isRainingNow: false,
        rainExpectedSummary: 'Awaiting observational feed',
        cloudCover: null,
        visibilityKm: null,
        sunrise: null,
        sunset: null,
        solarNoon: null,
        daylightDuration: null,
        dawnTime: null,
        duskTime: null,
        solarElevationDeg: null,
        solarRadiation: null,
        pressureTendency: null,
        pressureTendencyHpa: null,
        rainfallLast1h: null,
        rainfallLast3h: null,
        rainfallLast24h: null,
        moonrise: null,
        moonset: null,
        moonPhase: null,
        moonIllumination: null,
        soilMoisture: null,
        soilTemperature: null,
        evapotranspiration: null,
        stationName: location.weatherStation || `${location.displayName} Station`,
        stationCode: location.imdStation || `AWS-${location.district.substring(0, 3).toUpperCase()}`,
        locationId: location.id,
        lastUpdated: 'Synchronizing…',
        lastUpdatedTimestamp: now.getTime(),
        source: 'Awaiting Open-Meteo / IMD Feed',
        dataSource: 'Synchronizing telemetry',
        observationStatus: 'LOADING',
        observationSource: 'Connecting to meteorological endpoint…',
        observationTimeFormatted: `${this.formatIstDate(now)} • Synchronizing`,
        isLive: false,
      },
      hourly: [],
      daily: [],
      trends: [],
      alerts: [],
      lastFetchedAt: now,
      isLive: false,
    };
  }

  /**
   * Honest unavailable bundle when meteorological feeds fail and no cache exists.
   */
  public createUnavailableBundle(location: LocationRecord, errorMessage?: string): WeatherDataBundle {
    const now = new Date();
    const loading = this.createInitialLoadingBundle(location);
    return {
      ...loading,
      current: {
        ...loading.current,
        condition: 'Telemetry Unavailable',
        icon: 'cloud_off',
        rainExpectedSummary: 'Live weather telemetry is currently unreachable',
        lastUpdated: `${this.formatIstTime(now)} IST (Feed Unavailable)`,
        source: 'Meteorological Feed Offline',
        dataSource: 'Unavailable',
        observationStatus: 'UNAVAILABLE',
        observationSource: 'Upstream telemetry unreachable',
        observationTimeFormatted: `${this.formatIstDate(now)} • Feed Unavailable`,
        isLive: false,
        error: errorMessage || 'Live meteorological telemetry is unavailable.',
      },
      error: errorMessage || 'Live meteorological telemetry is unavailable.',
    };
  }

  /**
   * Public validated entry point for transforming raw Open-Meteo payloads (used by fetch & contract tests).
   */
  public parseOpenMeteoBundle(
    location: LocationRecord,
    raw: unknown,
    airRawJson?: unknown
  ): WeatherDataBundle {
    return this.transformOpenMeteoResponse(location, raw, airRawJson);
  }

  /**
   * Transforms raw Open-Meteo JSON and Air Quality JSON into normalized application state
   * without substituting fabricated defaults for missing fields.
   */
  private transformOpenMeteoResponse(
    location: LocationRecord,
    raw: any,
    airRawJson?: any
  ): WeatherDataBundle {
    const omWeather = validateOpenMeteoPayload(raw);
    const omAir = airRawJson?.raw?.current
      ? airRawJson.raw
      : airRawJson?.current
      ? airRawJson
      : {};
    const gatewayStale = raw?.dataStatus === 'STALE' || raw?.cached === true;

    const currentRaw = omWeather?.current || {};
    const hourlyRaw = omWeather?.hourly || {};
    const dailyRaw = omWeather?.daily || {};
    const airCurrent = omAir?.current || {};

    const numOrNull = (val: unknown): number | null =>
      typeof val === 'number' && Number.isFinite(val) ? val : null;

    const rawTemp = numOrNull(currentRaw.temperature_2m);
    const temp = rawTemp !== null ? Math.round(rawTemp * 10) / 10 : null;
    const rawHum = numOrNull(currentRaw.relative_humidity_2m);
    const humidity = rawHum !== null ? Math.round(rawHum) : null;
    const rawPress = numOrNull(currentRaw.pressure_msl) ?? numOrNull(currentRaw.surface_pressure);
    const pressure = rawPress !== null ? Math.round(rawPress * 10) / 10 : null;
    const rawWind = numOrNull(currentRaw.wind_speed_10m);
    const windSpeed = rawWind !== null ? Math.round(rawWind) : null;
    const windDirDeg = numOrNull(currentRaw.wind_direction_10m);
    const precip = numOrNull(currentRaw.precipitation);
    const wmoCode = numOrNull(currentRaw.weather_code);
    const rawIsDay = numOrNull(currentRaw.is_day);
    const isDay = rawIsDay === null ? undefined : rawIsDay === 1;
    const cloudCover = numOrNull(currentRaw.cloud_cover);
    const hasPrimaryTelemetry =
      temp !== null && (humidity !== null || windSpeed !== null || pressure !== null);

    // Get today's daily high/low and max rain probability
    const rawHigh = numOrNull(dailyRaw.temperature_2m_max?.[0]);
    const rawLow = numOrNull(dailyRaw.temperature_2m_min?.[0]);
    const high = rawHigh !== null ? Math.round(rawHigh) : null;
    const low = rawLow !== null ? Math.round(rawLow) : null;
    const maxRainProbToday = numOrNull(dailyRaw.precipitation_probability_max?.[0]);
    const rawUvMax = numOrNull(dailyRaw.uv_index_max?.[0]);
    const uvIndexMax = rawUvMax !== null ? Math.round(rawUvMax * 10) / 10 : null;

    // Resolve central weather condition without coercing absent measurements to Clear Sky
    const resolved = resolveWeatherCondition({
      wmoCode: wmoCode ?? undefined,
      precipitationMm: precip ?? undefined,
      precipitationProbability: maxRainProbToday ?? undefined,
      cloudCover: cloudCover ?? undefined,
      windSpeedKmH: windSpeed ?? undefined,
      isDaytime: isDay,
    });

    const rawFeelsLike = numOrNull(currentRaw.apparent_temperature);
    const feelsLike = rawFeelsLike !== null ? Math.round(rawFeelsLike * 10) / 10 : null;
    const rawGusts = numOrNull(currentRaw.wind_gusts_10m);
    const windGusts = rawGusts !== null ? Math.round(rawGusts) : null;
    const rawVisibility = numOrNull(currentRaw.visibility);
    const visibilityKm = rawVisibility !== null ? Math.round(rawVisibility / 100) / 10 : null;
    const rawDewPoint = numOrNull(currentRaw.dew_point_2m);
    const dewPoint = rawDewPoint !== null ? Math.round(rawDewPoint * 10) / 10 : null;

    // Real-time AQI & Pollutant metrics from live Open-Meteo Air Quality telemetry (no fabricated regional baselines)
    const rawPm25 = numOrNull(airCurrent.pm2_5);
    const rawPm10 = numOrNull(airCurrent.pm10);
    const liveNo2 = numOrNull(airCurrent.nitrogen_dioxide) !== null ? Math.round(airCurrent.nitrogen_dioxide * 10) / 10 : null;
    const liveSo2 = numOrNull(airCurrent.sulphur_dioxide) !== null ? Math.round(airCurrent.sulphur_dioxide * 10) / 10 : null;
    const liveCo = numOrNull(airCurrent.carbon_monoxide) !== null ? Math.round(airCurrent.carbon_monoxide) : null;
    const liveO3 = numOrNull(airCurrent.ozone) !== null ? Math.round(airCurrent.ozone * 10) / 10 : null;
    const liveDust = numOrNull(airCurrent.dust) !== null ? Math.round(airCurrent.dust * 10) / 10 : null;

    const aqiPm25 = rawPm25 !== null ? Math.round(rawPm25 * 10) / 10 : null;
    const livePm10 = rawPm10 !== null ? Math.round(rawPm10 * 10) / 10 : null;

    // Strictly use Open-Meteo US EPA AQI (never synthesize Indian CPCB NAQI from PM2.5 alone)
    const upstreamUsAqi = numOrNull(airCurrent.us_aqi);
    const cpcbAqi: number | null = upstreamUsAqi !== null ? Math.round(upstreamUsAqi) : null;

    let aqiStatus: CurrentWeather['aqiStatus'] = 'Unavailable';
    if (cpcbAqi !== null) {
      if (cpcbAqi > 300) aqiStatus = 'Hazardous';
      else if (cpcbAqi > 200) aqiStatus = 'Very Unhealthy';
      else if (cpcbAqi > 150) aqiStatus = 'Unhealthy';
      else if (cpcbAqi > 100) aqiStatus = 'Unhealthy for Sensitive';
      else if (cpcbAqi > 50) aqiStatus = 'Moderate';
      else aqiStatus = 'Good';
    }

    // Live Pollen metrics (strictly reported values, never fabricated from humidity/temp)
    const grassPollen = numOrNull(airCurrent.grass_pollen);
    const birchPollen = numOrNull(airCurrent.birch_pollen);
    const ragweedPollen = numOrNull(airCurrent.ragweed_pollen);
    const alderPollen = numOrNull(airCurrent.alder_pollen);
    const olivePollen = numOrNull(airCurrent.olive_pollen);
    const mugwortPollen = numOrNull(airCurrent.mugwort_pollen);

    const hasAnyPollenField = [
      grassPollen,
      birchPollen,
      ragweedPollen,
      alderPollen,
      olivePollen,
      mugwortPollen,
    ].some((v) => v !== null);

    let pollenCountGrains: number | null = null;
    let pollenStatus: CurrentWeather['pollen'] = null;
    let treePollenVal: number | null = null;
    let weedPollenVal: number | null = null;

    if (hasAnyPollenField) {
      const totalLivePollen =
        (grassPollen ?? 0) +
        (birchPollen ?? 0) +
        (ragweedPollen ?? 0) +
        (alderPollen ?? 0) +
        (olivePollen ?? 0) +
        (mugwortPollen ?? 0);
      pollenCountGrains = Math.round(totalLivePollen);
      treePollenVal = Math.round((birchPollen ?? 0) + (alderPollen ?? 0) + (olivePollen ?? 0));
      weedPollenVal = Math.round((ragweedPollen ?? 0) + (mugwortPollen ?? 0));

      if (pollenCountGrains > 50) pollenStatus = 'Very High';
      else if (pollenCountGrains > 20) pollenStatus = 'High';
      else if (pollenCountGrains > 6) pollenStatus = 'Moderate';
      else pollenStatus = 'Low';
    }

    // Compass direction string
    const windDirection = windDirDeg !== null ? this.degToCompass(windDirDeg) : '—';

    // Compute live sunrise, sunset, solar noon, daylight duration, dawn, and dusk from Open-Meteo payload
    let sunriseStr: string | null = null;
    let sunsetStr: string | null = null;
    let solarNoonStr: string | null = null;
    let daylightDurationStr: string | null = null;
    let dawnStr: string | null = null;
    let duskStr: string | null = null;
    let solarElevationDeg: number | null = null;
    let nightDurationStr: string | null = null;

    if (dailyRaw.sunrise?.[0] && dailyRaw.sunset?.[0]) {
      try {
        const sunriseDate = new Date(dailyRaw.sunrise[0]);
        const sunsetDate = new Date(dailyRaw.sunset[0]);

        sunriseStr = this.formatIstTime(sunriseDate);
        sunsetStr = this.formatIstTime(sunsetDate);

        const diffMs = Math.max(0, sunsetDate.getTime() - sunriseDate.getTime());
        const totalMins = Math.floor(diffMs / 60000);
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        daylightDurationStr = `${hrs}h ${mins}m`;
        nightDurationStr = calculateNightDuration(totalMins);

        const solarNoonMs = sunriseDate.getTime() + diffMs / 2;
        solarNoonStr = this.formatIstTime(new Date(solarNoonMs));

        dawnStr = this.formatIstTime(new Date(sunriseDate.getTime() - 22 * 60 * 1000));
        duskStr = this.formatIstTime(new Date(sunsetDate.getTime() + 22 * 60 * 1000));

        const nowMs = Date.now();
        if (nowMs >= sunriseDate.getTime() && nowMs <= sunsetDate.getTime()) {
          const dayFraction = (nowMs - sunriseDate.getTime()) / Math.max(1, diffMs);
          solarElevationDeg = Math.round(Math.sin(dayFraction * Math.PI) * (location.lat < 23 ? 72 : 62));
        } else {
          solarElevationDeg = -10;
        }
      } catch (e) {
        console.warn('[WeatherService] Error parsing sunrise/sunset timestamps:', e);
      }
    }

    const now = new Date();
    const lastUpdated = `${this.formatIstTime(now)} IST (Open-Meteo Analysis)`;

    // Find index of current hour first for telemetry referencing
    let startIdx = 0;
    const currentHour = now.getHours();
    const hourlyTimes: string[] = Array.isArray(hourlyRaw.time) ? hourlyRaw.time : [];
    for (let i = 0; i < hourlyTimes.length; i++) {
      const dt = new Date(hourlyTimes[i]);
      if (dt.getHours() === currentHour && dt.getDate() === now.getDate()) {
        startIdx = i;
        break;
      }
    }

    // Pressure tendency from hourly telemetry (comparing current to 3 hours ago)
    let pressureTendency: CurrentWeather['pressureTendency'] = null;
    let pressureTendencyHpa: number | null = null;
    if (Array.isArray(hourlyRaw.pressure_msl) && startIdx >= 3) {
      const pCurrent = numOrNull(hourlyRaw.pressure_msl[startIdx]);
      const pPrev = numOrNull(hourlyRaw.pressure_msl[startIdx - 3]);
      if (pCurrent !== null && pPrev !== null) {
        pressureTendencyHpa = Math.round((pCurrent - pPrev) * 10) / 10;
        if (pressureTendencyHpa > 0.8) pressureTendency = 'Rising';
        else if (pressureTendencyHpa < -0.8) pressureTendency = 'Falling';
        else pressureTendency = 'Steady';
      }
    }

    // Rainfall accumulation over 1h, 3h, 24h
    const hPrecipNow = numOrNull(hourlyRaw.precipitation?.[startIdx]);
    const rainfallLast1h = hPrecipNow !== null ? Math.round(hPrecipNow * 10) / 10 : precip;
    let rainfallLast3h: number | null = null;
    if (Array.isArray(hourlyRaw.precipitation) && startIdx >= 2) {
      const p0 = numOrNull(hourlyRaw.precipitation[startIdx]);
      const p1 = numOrNull(hourlyRaw.precipitation[startIdx - 1]);
      const p2 = numOrNull(hourlyRaw.precipitation[startIdx - 2]);
      if (p0 !== null && p1 !== null && p2 !== null) {
        rainfallLast3h = Math.round((p0 + p1 + p2) * 10) / 10;
      }
    }
    const dailyPrecip0 = numOrNull(dailyRaw.precipitation_sum?.[0]);
    const rainfallLast24h = dailyPrecip0 !== null ? Math.round(dailyPrecip0 * 10) / 10 : null;

    // Solar radiation & Astronomy
    const rawRad = numOrNull(hourlyRaw.direct_normal_irradiance?.[startIdx]);
    const solarRadiation = rawRad !== null ? Math.round(rawRad) : null;

    const lunar = calculateLunarEphemeris(location.lat, location.lng, now);

    // Agricultural metrics (strictly from payload, no fake constants)
    const rawSoilMoisture = numOrNull(hourlyRaw.soil_moisture_0_to_1cm?.[startIdx]);
    const soilMoisture = rawSoilMoisture !== null ? Math.round(rawSoilMoisture * 1000) / 1000 : null;
    const rawSoilTemp = numOrNull(hourlyRaw.soil_temperature_0cm?.[startIdx]);
    const soilTemperature = rawSoilTemp !== null ? Math.round(rawSoilTemp * 10) / 10 : null;
    const rawEt0 = numOrNull(hourlyRaw.et0_fao_evapotranspiration?.[startIdx]);
    const evapotranspiration = rawEt0 !== null ? Math.round(rawEt0 * 100) / 100 : null;

    const observationStatus: CurrentWeather['observationStatus'] = !hasPrimaryTelemetry
      ? 'UNAVAILABLE'
      : gatewayStale
      ? 'STALE'
      : 'LIVE';
    const isLive = hasPrimaryTelemetry && !gatewayStale;

    const providerTimeDate =
      currentRaw.time !== undefined && currentRaw.time !== null
        ? new Date(currentRaw.time)
        : null;
    const validAtIso =
      providerTimeDate && Number.isFinite(providerTimeDate.getTime())
        ? providerTimeDate.toISOString()
        : null;
    const fetchedAtIso = now.toISOString();
    const validTimeLabel =
      providerTimeDate && Number.isFinite(providerTimeDate.getTime())
        ? `${this.formatIstTime(providerTimeDate)} IST`
        : null;

    const provenance: DataProvenance = {
      provider: 'Open-Meteo',
      product: 'Surface Analysis & Forecast Grid',
      isModelData: true,
      isStationObservation: false,
      observedAt: validAtIso,
      validAt: validAtIso,
      fetchedAt: fetchedAtIso,
      status: !hasPrimaryTelemetry
        ? 'unavailable'
        : gatewayStale
        ? 'stale'
        : 'live',
      errorMessage: hasPrimaryTelemetry
        ? null
        : 'Primary atmospheric measurements unavailable from upstream feed.',
    };

    const resolvedLastUpdated = hasPrimaryTelemetry
      ? `${validTimeLabel ?? `${this.formatIstTime(now)} IST`} (${gatewayStale ? 'Cached Open-Meteo Grid' : 'Open-Meteo Model Grid'})`
      : `${this.formatIstTime(now)} IST (Feed Unavailable)`;

    const currentWeather: CurrentWeather = {
      temp,
      feelsLike,
      unit: 'C',
      high,
      low,
      condition:
        !hasPrimaryTelemetry && resolved.normalizedCondition === 'UNKNOWN'
          ? 'Telemetry Unavailable'
          : resolved.conditionLabel,
      conditionKey: resolved.conditionKey,
      isDay,
      wmoCode,
      normalizedCondition: resolved.normalizedCondition,
      weatherType: resolved.weatherType,
      icon: !hasPrimaryTelemetry && resolved.normalizedCondition === 'UNKNOWN' ? 'cloud_off' : resolved.icon,
      windSpeed,
      windDirection: windDirDeg !== null ? `${windDirection} (${windDirDeg}°)` : '—',
      windDirectionDeg: windDirDeg,
      windGusts,
      visibilityKm,
      humidity,
      pressure,
      pressureTendency,
      pressureTendencyHpa,
      dewPoint,
      rainfallLast1h,
      rainfallLast3h,
      rainfallLast24h,
      solarRadiation,
      uvIndex: uvIndexMax,
      moonrise: lunar.moonriseStr,
      moonset: lunar.moonsetStr,
      moonPhase: lunar.moonPhaseName,
      moonIllumination: lunar.illuminationPercent,
      soilMoisture,
      soilTemperature,
      evapotranspiration,
      pollen: pollenStatus,
      pollenCount: pollenCountGrains,
      grassPollen: grassPollen !== null ? Math.round(grassPollen) : null,
      treePollen: treePollenVal,
      weedPollen: weedPollenVal,
      aqi: cpcbAqi,
      aqiPm25,
      aqiPm10: livePm10,
      aqiIndex: cpcbAqi,
      no2: liveNo2,
      so2: liveSo2,
      co: liveCo,
      o3: liveO3,
      dust: liveDust,
      aqiStatus,
      precipitation: precip,
      precipitationProbability: maxRainProbToday,
      isRainingNow: resolved.isRainingNow,
      rainExpectedSummary: resolved.rainExpectedSummary,
      cloudCover,
      sunrise: sunriseStr,
      sunset: sunsetStr,
      solarNoon: solarNoonStr,
      daylightDuration: daylightDurationStr,
      dayLength: daylightDurationStr,
      nightDuration: nightDurationStr,
      dawnTime: dawnStr,
      duskTime: duskStr,
      civilDawn: dawnStr,
      civilDusk: duskStr,
      solarElevationDeg,
      stationName: location.weatherStation || `${location.displayName} Synoptic Station`,
      stationCode: location.imdStation || `AWS-${location.district.substring(0, 3).toUpperCase()}`,
      locationId: location.id,
      lastUpdated: resolvedLastUpdated,
      lastUpdatedTimestamp: now.getTime(),
      observedAt: validAtIso,
      validAt: validAtIso,
      fetchedAt: fetchedAtIso,
      provenance,
      source: hasPrimaryTelemetry
        ? 'Open-Meteo Surface Analysis (Model Grid)'
        : 'Meteorological Feed Unavailable',
      dataSource: hasPrimaryTelemetry
        ? 'Open-Meteo Surface Analysis (Model Grid)'
        : 'Unavailable',
      observationStatus,
      observationSource: hasPrimaryTelemetry
        ? 'Open-Meteo Surface Analysis (Model Grid)'
        : 'Upstream telemetry incomplete',
      observationTimeFormatted: validTimeLabel
        ? `${this.formatIstDate(providerTimeDate!)} • ${validTimeLabel}`
        : `${this.formatIstDate(now)} • Provider timestamp unavailable`,
      previousHourTelemetry: startIdx > 0 ? {
        temp: hourlyRaw.temperature_2m?.[startIdx - 1] !== undefined ? Math.round(hourlyRaw.temperature_2m[startIdx - 1] * 10) / 10 : undefined,
        humidity: hourlyRaw.relative_humidity_2m?.[startIdx - 1] !== undefined ? Math.round(hourlyRaw.relative_humidity_2m[startIdx - 1]) : undefined,
        windSpeed: hourlyRaw.wind_speed_10m?.[startIdx - 1] !== undefined ? Math.round(hourlyRaw.wind_speed_10m[startIdx - 1] * 10) / 10 : undefined,
        pressure: hourlyRaw.surface_pressure?.[startIdx - 1] !== undefined ? Math.round(hourlyRaw.surface_pressure[startIdx - 1] * 10) / 10 : undefined,
        precipitation: hourlyRaw.precipitation?.[startIdx - 1] !== undefined ? Math.round(hourlyRaw.precipitation[startIdx - 1] * 10) / 10 : undefined,
        timestamp: hourlyTimes[startIdx - 1] ? new Date(hourlyTimes[startIdx - 1]).getTime() : now.getTime() - 3600000,
        timeString: hourlyTimes[startIdx - 1] ? this.formatIstTime(new Date(hourlyTimes[startIdx - 1])) : 'Prior Cycle',
      } : undefined,
      isLive,
      error: hasPrimaryTelemetry ? null : 'Primary atmospheric measurements unavailable from upstream feed.',
    };

    // Transform 24h Hourly Items (only genuine grid points)
    const hourly: HourlyForecastItem[] = [];
    const hourlyTemps = hourlyRaw.temperature_2m || [];
    const hourlyApparentTemps = hourlyRaw.apparent_temperature || [];
    const hourlyPrecipProb = hourlyRaw.precipitation_probability || [];
    const hourlyPrecip = hourlyRaw.precipitation || [];
    const hourlyCodes = hourlyRaw.weather_code || [];
    const hourlyWinds = hourlyRaw.wind_speed_10m || [];
    const hourlyGusts = hourlyRaw.wind_gusts_10m || [];
    const hourlyHumidity = hourlyRaw.relative_humidity_2m || [];
    const hourlyUv = hourlyRaw.uv_index || [];
    const hourlyVis = hourlyRaw.visibility || [];
    const hourlyRad = hourlyRaw.direct_normal_irradiance || [];
    const hourlyCloud = hourlyRaw.cloud_cover || [];
    const hourlyPress = hourlyRaw.pressure_msl || [];

    for (let i = startIdx; i < Math.min(startIdx + 24, hourlyTimes.length); i++) {
      const hTempVal = numOrNull(hourlyTemps[i]);
      if (hTempVal === null) continue;
      const dt = new Date(hourlyTimes[i]);
      const hour = dt.getHours();
      const isDayHour = hour >= 6 && hour <= 18;
      const hCodeRaw = numOrNull(hourlyCodes[i]);
      const hProbRaw = numOrNull(hourlyPrecipProb[i]);
      const hPrecipRaw = numOrNull(hourlyPrecip[i]);
      const hCloudRaw = numOrNull(hourlyCloud[i]);
      const hWindRaw = numOrNull(hourlyWinds[i]);
      const hProb = hProbRaw ?? 0;
      const hRes = resolveWeatherCondition({
        wmoCode: hCodeRaw ?? undefined,
        precipitationMm: hPrecipRaw ?? undefined,
        precipitationProbability: hProbRaw ?? undefined,
        cloudCover: hCloudRaw ?? undefined,
        windSpeedKmH: hWindRaw ?? undefined,
        isDaytime: isDayHour,
      });

      const timeLabel =
        i === startIdx
          ? 'Now'
          : `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;

      const hTemp = Math.round(hTempVal);
      const hFeelsVal = numOrNull(hourlyApparentTemps[i]);
      const hFeelsLike = hFeelsVal !== null ? Math.round(hFeelsVal) : null;
      const hVisRaw = numOrNull(hourlyVis[i]);
      const hVisKm = hVisRaw !== null ? Math.round(hVisRaw / 100) / 10 : null;
      const hGustRaw = numOrNull(hourlyGusts[i]);
      const hSolarRaw = numOrNull(hourlyRad[i]);
      const hHumRaw = numOrNull(hourlyHumidity[i]);
      const hUvRaw = numOrNull(hourlyUv[i]);

      hourly.push({
        time: timeLabel,
        hourNumber: hour,
        temp: hTemp,
        feelsLike: hFeelsLike,
        condition: hRes.conditionLabel,
        icon: hRes.icon,
        aqi: cpcbAqi ?? aqiPm25 ?? null,
        rainProb: hProbRaw !== null ? Math.round(hProbRaw) : null,
        windSpeed: hWindRaw !== null ? Math.round(hWindRaw) : windSpeed,
        windGusts: hGustRaw !== null ? Math.round(hGustRaw) : null,
        uv: hUvRaw !== null ? Math.round(hUvRaw * 10) / 10 : null,
        humidity: hHumRaw !== null ? Math.round(hHumRaw) : humidity,
        precipitation: hPrecipRaw !== null ? Math.round(hPrecipRaw * 10) / 10 : null,
        precipitationProbability: hProbRaw !== null ? Math.round(hProbRaw) : null,
        visibilityKm: hVisKm,
        solarRadiation: hSolarRaw !== null ? Math.round(hSolarRaw) : null,
        cloudCover: hCloudRaw !== null ? Math.round(hCloudRaw) : null,
        pressure: numOrNull(hourlyPress[i]) !== null ? Math.round(hourlyPress[i] * 10) / 10 : null,
      });
    }

    // Transform 7-Day Daily Items
    const daily: DailyForecastItem[] = [];
    const dailyTimes = dailyRaw.time || [];
    const dailyMax = dailyRaw.temperature_2m_max || [];
    const dailyMin = dailyRaw.temperature_2m_min || [];
    const dailyCodes = dailyRaw.weather_code || [];
    const dailyRainProb = dailyRaw.precipitation_probability_max || [];
    const dailyWinds = dailyRaw.wind_speed_10m_max || [];

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < Math.min(7, dailyTimes.length); i++) {
      const dMaxRaw = numOrNull(dailyMax[i]);
      const dMinRaw = numOrNull(dailyMin[i]);
      if (dMaxRaw === null || dMinRaw === null) continue;

      const dt = new Date(dailyTimes[i]);
      const dCodeRaw = numOrNull(dailyCodes[i]);
      const dProbRaw = numOrNull(dailyRainProb[i]);
      const dRes = resolveWeatherCondition({
        wmoCode: dCodeRaw ?? undefined,
        precipitationProbability: dProbRaw ?? undefined,
        isDaytime: true,
      });

      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekdays[dt.getDay()];
      const dateFormatted = new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
      }).format(dt);

      const dHigh = Math.round(dMaxRaw);
      const dLow = Math.round(dMinRaw);
      const dWindVal = numOrNull(dailyWinds[i]);
      const dUvVal = numOrNull(dailyRaw.uv_index_max?.[i]);
      const dPrecipVal = numOrNull(dailyRaw.precipitation_sum?.[i]);

      // Temperature bar relative positioning (scale 15°C to 42°C)
      const minScale = 15;
      const maxScale = 42;
      const startPercent = Math.max(0, Math.min(100, ((dLow - minScale) / (maxScale - minScale)) * 100));
      const widthPercent = Math.max(10, Math.min(100 - startPercent, ((dHigh - dLow) / (maxScale - minScale)) * 100));

      daily.push({
        day: dayName,
        date: dateFormatted,
        condition: dRes.conditionLabel,
        icon: dRes.icon,
        high: dHigh,
        low: dLow,
        rainProb: dProbRaw !== null ? Math.round(dProbRaw) : null,
        precipMm: dPrecipVal !== null ? Math.round(dPrecipVal * 10) / 10 : null,
        uv: dUvVal !== null ? Math.round(dUvVal) : null,
        aqi: cpcbAqi ?? aqiPm25 ?? null,
        humidity: humidity,
        wind: dWindVal !== null ? `${Math.round(dWindVal)} km/h` : '—',
        barProgress: {
          startPercent,
          widthPercent,
          color: dHigh > 35 ? '#F97316' : '#C5A46D',
        },
      });
    }

    // Derive past trends strictly from genuine hourly series prior to startIdx (no Math.sin fabrication)
    const trends: HistoricalTrendPoint[] = [];
    const trendStart = Math.max(0, startIdx - 23);
    for (let idx = trendStart; idx <= startIdx && idx < hourlyTimes.length; idx++) {
      const tVal = numOrNull(hourlyTemps[idx]);
      const hVal = numOrNull(hourlyHumidity[idx]);
      const pVal = numOrNull(hourlyPress[idx]);
      const wVal = numOrNull(hourlyWinds[idx]);
      const rVal = numOrNull(hourlyPrecip[idx]);
      if (tVal === null) continue;
      const dt = new Date(hourlyTimes[idx]);
      const hr = dt.getHours();
      trends.push({
        time: `${hr % 12 === 0 ? 12 : hr % 12}:00`,
        hour: hr,
        temp: Math.round(tVal * 10) / 10,
        humidity: hVal !== null ? Math.round(hVal) : humidity,
        pressure: pVal !== null ? Math.round(pVal * 10) / 10 : pressure,
        windSpeed: wVal !== null ? Math.round(wVal) : windSpeed,
        rain: rVal !== null ? Math.round(rVal * 10) / 10 : null,
      });
    }

    return {
      current: currentWeather,
      hourly,
      daily,
      trends,
      lastFetchedAt: now,
      isLive,
      provenance,
      error: hasPrimaryTelemetry ? null : 'Primary atmospheric measurements unavailable from upstream feed.',
    };
  }

  /**
   * Generates deterministic test bundles exclusively when Demo Mode is explicitly selected
   */
  private generateDemoBundle(location: LocationRecord, override: DemoWeatherOverride): WeatherDataBundle {
    const now = new Date();
    let condition = 'Clear Sky';
    let normalized: NormalizedWeatherCondition = 'CLEAR';
    let weatherType: WeatherConditionType = 'sunny';
    let icon = 'sunny';
    let precip = 0.0;
    let rainProb = 0;
    let isRainingNow = false;
    let rainSummary = 'No precipitation expected';

    switch (override) {
      case 'TEST_CLEAR_NO_RAIN':
        condition = 'Clear & Sunny';
        normalized = 'CLEAR';
        weatherType = 'sunny';
        icon = 'sunny';
        precip = 0.0;
        rainProb = 0;
        isRainingNow = false;
        rainSummary = '0% precipitation probability';
        break;
      case 'TEST_CLEAR_RAIN_LATER':
        condition = 'Mainly Clear';
        normalized = 'CLEAR';
        weatherType = 'sunny';
        icon = 'sunny';
        precip = 0.0;
        rainProb = 80;
        isRainingNow = false;
        rainSummary = '80% chance of rain expected around 5:00 PM';
        break;
      case 'TEST_RAIN_NOW':
        condition = 'Moderate Rain';
        normalized = 'RAIN';
        weatherType = 'rain';
        icon = 'rainy';
        precip = 6.4;
        rainProb = 95;
        isRainingNow = true;
        rainSummary = 'Active rainfall currently (6.4 mm/hr)';
        break;
      case 'TEST_THUNDERSTORM_NOW':
        condition = 'Thunderstorm & Squall';
        normalized = 'THUNDERSTORM';
        weatherType = 'thunderstorm';
        icon = 'thunderstorm';
        precip = 14.8;
        rainProb = 100;
        isRainingNow = true;
        rainSummary = 'Severe convective cell active with lightning';
        break;
      case 'TEST_DENSE_FOG':
        condition = 'Dense Valley Fog';
        normalized = 'FOG';
        weatherType = 'fog';
        icon = 'foggy';
        precip = 0.0;
        rainProb = 10;
        isRainingNow = false;
        rainSummary = 'Low visibility (200m), no rain';
        break;
      case 'TEST_DUST_STORM':
        condition = 'Squall & Dust Storm';
        normalized = 'DUST';
        weatherType = 'duststorm';
        icon = 'air';
        precip = 0.0;
        rainProb = 5;
        isRainingNow = false;
        rainSummary = 'Aerosol surge, no rain';
        break;
    }

    const conditionKey = getWeatherCondition({
      rawConditionText: condition,
      precipitation: precip,
      isDay: true,
    });

    const baseTemp = isRainingNow ? 23.4 : 32.0;
    const baseHum = isRainingNow ? 92 : 55;
    const baseWind = isRainingNow ? 24 : 12;

    const current: CurrentWeather = {
      temp: baseTemp,
      unit: 'C',
      high: 34,
      low: 21,
      condition,
      conditionKey,
      isDay: true,
      wmoCode: isRainingNow ? 63 : 0,
      normalizedCondition: normalized,
      weatherType,
      icon,
      windSpeed: baseWind,
      windDirection: 'SW (220°)',
      windDirectionDeg: 220,
      humidity: baseHum,
      pressure: 1011.5,
      dewPoint: 20.0,
      uvIndex: isRainingNow ? 1.5 : 8.5,
      pollen: 'Low',
      pollenCount: 4,
      aqi: 68,
      aqiPm25: 48,
      aqiPm10: 76,
      aqiIndex: 68,
      no2: 20.0,
      so2: 9.0,
      co: 350,
      o3: 25.0,
      dust: 12.0,
      aqiStatus: 'Good',
      precipitation: precip,
      precipitationProbability: rainProb,
      isRainingNow,
      rainExpectedSummary: rainSummary,
      cloudCover: isRainingNow ? 95 : 10,
      sunrise: '05:32 AM',
      sunset: '06:18 PM',
      solarNoon: '12:15 PM',
      daylightDuration: '12h 46m',
      dawnTime: '05:10 AM',
      duskTime: '06:40 PM',
      solarElevationDeg: isRainingNow ? 20 : 52,
      stationName: `${location.displayName} [DEMO MODE: ${override}]`,
      stationCode: 'DEMO-CALIBRATION',
      locationId: location.id,
      lastUpdated: `${this.formatIstTime(now)} IST (Demo Simulation)`,
      lastUpdatedTimestamp: now.getTime(),
      source: `Demo Mode: ${override}`,
      dataSource: `Demo Mode: ${override}`,
      observationStatus: 'RECENT',
      observationSource: `Simulation Bench (${override})`,
      observationTimeFormatted: `${this.formatIstDate(now)} • ${this.formatIstTime(now)} IST`,
      isLive: false,
    };

    const hourly: HourlyForecastItem[] = Array.from({ length: 12 }, (_, i) => {
      const hour = (now.getHours() + i) % 24;
      return {
        time: i === 0 ? 'Now' : `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
        hourNumber: hour,
        temp: Math.round(baseTemp),
        condition,
        icon,
        aqi: 68,
        rainProb,
        windSpeed: baseWind,
        uv: isRainingNow ? 1 : 6,
        humidity: baseHum,
      };
    });

    return {
      current,
      hourly,
      daily: [],
      trends: [],
      lastFetchedAt: now,
      isLive: false,
    };
  }

  private degToCompass(num: number): string {
    const val = Math.floor(num / 22.5 + 0.5);
    const arr = [
      'N',
      'NNE',
      'NE',
      'ENE',
      'E',
      'ESE',
      'SE',
      'SSE',
      'S',
      'SSW',
      'SW',
      'WSW',
      'W',
      'WNW',
      'NW',
      'NNW',
    ];
    return arr[val % 16];
  }
}

export const weatherService = new WeatherService();
