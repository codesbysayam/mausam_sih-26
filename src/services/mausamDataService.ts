/**
 * MAUSAM Central Data Service
 * Implements fetchMausamData(location) to provide a single, unified, location-aware data pipeline
 * for all modules: Weather, Forecast, Air Quality, Solar Ephemeris, Radar, and Station Telemetry.
 */

import { LocationRecord, CurrentWeather, HourlyForecastItem, DailyForecastItem, WeatherAlert } from '../types';
import { WeatherDataBundle, weatherService } from './weatherService';
import { calculateSolarEphemeris, SolarEphemeris } from '../utils/solarCalculator';

export interface MausamAirQualityData {
  aqi: number;
  category: string;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  nh3: number;
  primaryPollutant: string;
  pollen: {
    totalGrains: number;
    grassPollen: number;
    treePollen: number;
    weedPollen: number;
    risk: string;
  } | null;
  uvIndex: number;
  exposureRecommendation: string;
  monitoringStation: string;
  observationTimestamp: string;
  source: string;
}

export interface MausamRadarData {
  nearestStation: {
    id: string;
    name: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
    band: string;
    rangeKm: number;
    radarModel: string;
    isWithinCoverage: boolean;
  } | null;
  scanRangeKm: number | null;
  lastScanTime: string | null;
  updateIntervalMinutes: number;
  reflectivityProduct: string;
  precipitationDetection: string;
  stormConvectiveActivity: string;
  radarStatus: string;
  radarAvailable: boolean;
  source: string;
}

export interface MausamStationTelemetry {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  observationTime: string;
  temperature: number | null;
  apparentTemperature: number | null;
  relativeHumidity: number | null;
  dewPoint: number | null;
  windSpeed: number | null;
  windDirectionDeg: number | null;
  windGust: number | null;
  pressureHpa: number | null;
  visibilityKm: number | null;
  cloudCoverPercent: number | null;
  rainfall24hMm: number | null;
  uvIndex: number | null;
  aqi: number | null;
  source: string;
}

export interface UnifiedMausamBundle {
  location: LocationRecord;
  weatherBundle: WeatherDataBundle;
  solar: SolarEphemeris;
  airQuality: MausamAirQualityData | null;
  radar: MausamRadarData;
  station: MausamStationTelemetry;
  fetchedAt: Date;
  isLive: boolean;
  error?: string | null;
}

function buildUnavailableRadar(): MausamRadarData {
  return {
    nearestStation: null,
    scanRangeKm: null,
    lastScanTime: null,
    updateIntervalMinutes: 10,
    reflectivityProduct: 'Radar reflectivity unavailable',
    precipitationDetection: 'Radar metadata endpoint unreachable',
    stormConvectiveActivity: 'Unavailable',
    radarStatus: 'UNAVAILABLE',
    radarAvailable: false,
    source: 'Radar Telemetry Unavailable',
  };
}

function buildStationTelemetry(
  location: LocationRecord,
  curr: CurrentWeather
): MausamStationTelemetry {
  const computedDewPoint =
    typeof curr.dewPoint === 'number' && Number.isFinite(curr.dewPoint)
      ? curr.dewPoint
      : typeof curr.temp === 'number' &&
        Number.isFinite(curr.temp) &&
        typeof curr.humidity === 'number' &&
        Number.isFinite(curr.humidity)
      ? Math.round((curr.temp - (100 - curr.humidity) / 5) * 10) / 10
      : null;

  return {
    stationId: curr.stationCode || `AWS-${location.district.substring(0, 3).toUpperCase()}`,
    stationName: curr.stationName || `${location.displayName} Synoptic Observatory`,
    latitude: location.lat,
    longitude: location.lng,
    observationTime: new Date().toISOString(),
    temperature: curr.temp,
    apparentTemperature: curr.feelsLike ?? curr.temp ?? null,
    relativeHumidity: curr.humidity,
    dewPoint: computedDewPoint,
    windSpeed: curr.windSpeed,
    windDirectionDeg: curr.windDirectionDeg ?? null,
    windGust: curr.windGusts ?? null,
    pressureHpa: curr.pressure,
    visibilityKm: curr.visibilityKm ?? curr.visibility ?? null,
    cloudCoverPercent: curr.cloudCover ?? null,
    rainfall24hMm: curr.rainfallLast24h ?? curr.precipitation ?? null,
    uvIndex: curr.uvIndex ?? null,
    aqi: curr.aqi ?? null,
    source: curr.source || 'Meteorological Feed Unavailable',
  };
}

class MausamDataService {
  private cache: Map<string, { data: UnifiedMausamBundle; timestamp: number }> = new Map();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Central data fetching pipeline for MAUSAM
   */
  async fetchMausamData(
    location: LocationRecord,
    forceRefresh = false
  ): Promise<UnifiedMausamBundle> {
    const lat = location.lat;
    const lng = location.lng;
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const now = Date.now();

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && now - cached.timestamp < this.cacheTtlMs) {
        return cached.data;
      }
    }

    try {
      // 1. Fetch weather bundle
      const weatherBundle = await weatherService.getWeatherData(location, forceRefresh);

      // 2. Compute accurate NOAA Solar Ephemeris for exact coordinates & current time
      const solar = calculateSolarEphemeris(lat, lng, new Date());

      // 3. Fetch Air Quality & Radar telemetry in parallel via API
      let airQuality: MausamAirQualityData | null = null;
      let radar: MausamRadarData | null = null;

      try {
        const [airRes, radarRes] = await Promise.allSettled([
          fetch(`/api/weather?mode=air&lat=${lat}&lon=${lng}`),
          fetch(`/api/radar?mode=metadata&lat=${lat}&lon=${lng}`),
        ]);

        if (airRes.status === 'fulfilled' && airRes.value.ok) {
          airQuality = await airRes.value.json();
        }
        if (radarRes.status === 'fulfilled' && radarRes.value.ok) {
          radar = await radarRes.value.json();
        }
      } catch (subErr) {
        console.warn('[MausamDataService] Sub-service fetch error:', subErr);
      }

      if (!radar) {
        radar = buildUnavailableRadar();
      }

      const station = buildStationTelemetry(location, weatherBundle.current);

      const bundle: UnifiedMausamBundle = {
        location,
        weatherBundle,
        solar,
        airQuality,
        radar,
        station,
        fetchedAt: new Date(),
        isLive: weatherBundle.isLive,
        error: weatherBundle.error,
      };

      this.cache.set(cacheKey, { data: bundle, timestamp: now });
      return bundle;
    } catch (err: any) {
      console.error('[MausamDataService] fetchMausamData critical error:', err);
      const fallbackWeather = weatherService.createUnavailableBundle(
        location,
        err?.message || 'Meteorological telemetry unavailable'
      );
      const solar = calculateSolarEphemeris(lat, lng, new Date());
      return {
        location,
        weatherBundle: fallbackWeather,
        solar,
        airQuality: null,
        radar: buildUnavailableRadar(),
        station: buildStationTelemetry(location, fallbackWeather.current),
        fetchedAt: new Date(),
        isLive: false,
        error: err?.message || 'Meteorological telemetry unavailable',
      };
    }
  }
}

export const mausamDataService = new MausamDataService();
export const fetchMausamData = (location: LocationRecord, forceRefresh = false) =>
  mausamDataService.fetchMausamData(location, forceRefresh);
