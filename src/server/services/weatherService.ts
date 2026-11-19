// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Reusable Server-Side Weather Service
// Consolidated handling for current, forecast, hourly, daily, air,
// marine, satellite, authoritative bundle, search, and IMD integration
// Zero-Key Core using Open-Meteo & Open Environmental Feeds
// ====================================================================

import { centralDataResolver } from '../../../backend/services/centralDataResolver';
import { GeoLocation } from '../../../backend/normalization/types';
import { marineService } from '../../../backend/services/marineService';
import { locationService } from '../../../backend/services/locationService';
import { AuthoritativeService } from '../../../server/authoritative/authoritativeService';
import { imdConnector } from '../../../server/imd/imdConnector';
import { AQIProvider } from '../../../server/environment/aqiProvider';
import { PollenProvider } from '../../../server/environment/pollenProvider';
import cityStationMapData from '../../../server/imd/cityStationMap.json';
import imdStationsData from '../../data/imdStations.json';
import indiaLocationsData from '../../data/indiaLocations.json';
import { serverCache } from './cacheService';

export interface WeatherQueryOptions {
  lat?: number;
  lon?: number;
  city?: string;
  state?: string;
  district?: string;
  mode?: string;
  days?: number;
}

export class WeatherService {
  private static instance: WeatherService;

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  public parseLocation(query: Record<string, any>): GeoLocation {
    const latRaw = query.lat ?? query.latitude;
    const lonRaw = query.lon ?? query.lng ?? query.longitude;
    const city = (query.city ?? query.q ?? 'Bhubaneswar').toString();
    const state = (query.state ?? 'Odisha').toString();
    const district = query.district ? query.district.toString() : undefined;

    const parseFinite = (v: any): number | null => {
      if (v === undefined || v === null || String(v).trim() === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v).trim());
      return Number.isFinite(n) ? n : null;
    };

    const parsedLat = parseFinite(latRaw);
    const parsedLon = parseFinite(lonRaw);
    const lat = parsedLat !== null && parsedLat >= -90 && parsedLat <= 90 ? parsedLat : 20.2961;
    const lon = parsedLon !== null && parsedLon >= -180 && parsedLon <= 180 ? parsedLon : 85.8245;

    return {
      name: city,
      city,
      state,
      country: 'India',
      district,
      latitude: lat,
      longitude: lon,
    };
  }

  public async getCurrent(loc: GeoLocation) {
    const cacheKey = `weather:current:${loc.latitude.toFixed(2)}:${loc.longitude.toFixed(2)}`;
    const cached = serverCache.get(cacheKey);
    if (cached.data && !cached.isStale) {
      return cached.data;
    }

    try {
      const res = await centralDataResolver.resolveWeather(loc);
      if (res && res.data) {
        serverCache.set(cacheKey, res, 60, 300);
      }
      return res;
    } catch (err: any) {
      if (cached.data) return cached.data;
      return {
        status: 'error',
        source: 'Open-Meteo',
        provider: 'OPEN_METEO',
        dataStatus: 'UNAVAILABLE',
        observedAt: new Date().toISOString(),
        data: null,
        error: err?.message || 'Current weather data temporarily unavailable',
      };
    }
  }

  public async getForecast(loc: GeoLocation, days: number = 7) {
    const cacheKey = `weather:forecast:${loc.latitude.toFixed(2)}:${loc.longitude.toFixed(2)}:${days}`;
    const cached = serverCache.get(cacheKey);
    if (cached.data && !cached.isStale) {
      return cached.data;
    }

    try {
      const res = await centralDataResolver.resolveForecast(loc);
      if (res && res.data) {
        serverCache.set(cacheKey, res, 120, 600);
      }
      return res;
    } catch (err: any) {
      if (cached.data) return cached.data;
      return {
        status: 'error',
        source: 'Open-Meteo',
        provider: 'OPEN_METEO',
        dataStatus: 'UNAVAILABLE',
        observedAt: new Date().toISOString(),
        data: null,
        error: err?.message || 'Forecast data temporarily unavailable',
      };
    }
  }

  public async getHourly(loc: GeoLocation) {
    const forecastRes: any = await this.getForecast(loc);
    if (!forecastRes || !forecastRes.data) {
      return {
        status: 'error',
        source: 'Open-Meteo',
        provider: 'OPEN_METEO',
        dataStatus: 'UNAVAILABLE',
        data: null,
        error: 'Hourly data temporarily unavailable',
      };
    }
    return {
      ...forecastRes,
      data: forecastRes.data?.hourly || [],
    };
  }

  public async getDaily(loc: GeoLocation) {
    const forecastRes: any = await this.getForecast(loc);
    if (!forecastRes || !forecastRes.data) {
      return {
        status: 'error',
        source: 'Open-Meteo',
        provider: 'OPEN_METEO',
        dataStatus: 'UNAVAILABLE',
        data: null,
        error: 'Daily data temporarily unavailable',
      };
    }
    return {
      ...forecastRes,
      data: forecastRes.data?.daily || [],
    };
  }

  public async getAirQuality(loc: GeoLocation) {
    const cacheKey = `weather:air:${loc.latitude.toFixed(2)}:${loc.longitude.toFixed(2)}`;
    const cached = serverCache.get(cacheKey);
    if (cached.data && !cached.isStale) {
      return cached.data;
    }

    try {
      const res = await centralDataResolver.resolveAQI(loc);
      if (res && res.data) {
        serverCache.set(cacheKey, res, 120, 600);
      }
      return res;
    } catch (err: any) {
      if (cached.data) return cached.data;
      return {
        status: 'error',
        source: 'CPCB / Open-Meteo CAMS',
        provider: 'CPCB',
        dataStatus: 'UNAVAILABLE',
        observedAt: new Date().toISOString(),
        data: null,
        error: err?.message || 'Air quality observations temporarily unavailable',
      };
    }
  }

  public async getMarine(loc: GeoLocation) {
    const cacheKey = `weather:marine:${loc.latitude.toFixed(2)}:${loc.longitude.toFixed(2)}`;
    const cached = serverCache.get(cacheKey);
    if (cached.data && !cached.isStale) {
      return cached.data;
    }

    try {
      const result = await marineService.getMarine(loc);
      if (result) {
        serverCache.set(cacheKey, result, 180, 600);
      }
      return result;
    } catch (err: any) {
      if (cached.data) return cached.data;
      return {
        status: 'error',
        source: 'INCOIS',
        provider: 'INCOIS',
        dataStatus: 'UNAVAILABLE',
        data: null,
        error: err?.message || 'Marine forecasting temporarily unavailable',
      };
    }
  }

  public async searchLocations(q: string) {
    if (!q || !q.trim()) return [];
    try {
      return await locationService.searchLocations(q.trim());
    } catch {
      return [];
    }
  }

  public async getPersonaBundle(query: Record<string, any>) {
    const rawLat = query.lat;
    const rawLng = query.lng ?? query.lon;
    const latNum = rawLat !== undefined && rawLat !== null && String(rawLat).trim() !== '' ? Number(rawLat) : NaN;
    const lngNum = rawLng !== undefined && rawLng !== null && String(rawLng).trim() !== '' ? Number(rawLng) : NaN;
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return {
        status: 'error',
        message: 'Valid finite lat and lng/lon coordinates are required for persona bundle.',
      };
    }
    const lat = latNum;
    const lng = lngNum;
    const city = (query.city as string) || 'Selected Location';
    const state = (query.state as string) || 'Region';
    const stationName = (query.stationName as string) || `${city} Observatory`;

    const parseOptNum = (v: unknown): number | undefined => {
      if (v === undefined || v === null || String(v).trim() === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const temp = parseOptNum(query.temp);
    const humidity = parseOptNum(query.humidity);
    const windSpeed = parseOptNum(query.windSpeed);
    const windDir = query.windDir as string | undefined;
    const uvIndex = parseOptNum(query.uvIndex);
    const isRaining = query.isRaining === 'true';
    const visibilityKm = parseOptNum(query.visibilityKm);
    const sunrise = query.sunrise as string | undefined;
    const sunset = query.sunset as string | undefined;

    try {
      const data = await AuthoritativeService.getPersonaBundle(lat, lng, city, state, stationName, {
        temp,
        humidity,
        windSpeed,
        windDir,
        uvIndex,
        isRaining,
        visibilityKm,
        sunrise,
        sunset,
      });

      return {
        status: 'success',
        source: 'MAUSAM Authoritative Multi-Provider Intelligence Engine',
        fetchedAt: new Date().toISOString(),
        data,
      };
    } catch (err: any) {
      return {
        status: 'error',
        message: err?.message || 'Failed to assemble authoritative persona bundle',
      };
    }
  }

  public async handleIMD(query: Record<string, any>) {
    const route = (query.route || query.endpoint || '').toString().replace(/^\//, '');
    const subParam = (query.id || query.param || '').toString();

    switch (route) {
      case 'current-weather': {
        const stationId = subParam || query.id;
        return imdConnector.getCurrentWeather(stationId);
      }
      case 'city-forecast': {
        return imdConnector.getCityForecast(subParam);
      }
      case 'district-warning':
      case 'warnings': {
        const districtId = subParam || query.id || query.districtId;
        return imdConnector.getDistrictWarnings(districtId);
      }
      case 'district-nowcast': {
        const districtId = subParam || query.id || query.districtId;
        return imdConnector.getDistrictNowcast(districtId);
      }
      case 'state-rainfall': {
        const stateId = subParam || query.id;
        return imdConnector.getStateRainfall(stateId);
      }
      case 'aws': {
        const stationId = query.id;
        const stateId = query.sid;
        return imdConnector.getAWSData(stationId, stateId);
      }
      case 'sunmoon': {
        const lat = Number(query.lat);
        const lng = Number(query.lng ?? query.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return { source: 'IMD', status: 'error', fetchedAt: new Date().toISOString(), stale: false, data: null, error: { code: 'INVALID_COORDS', message: 'Valid lat and lng/lon are required.' } };
        }
        return imdConnector.getSunMoon(lat, lng);
      }
      case 'cyclone-bundle': {
        return imdConnector.getCycloneData();
      }
      case 'marine-bundle': {
        const portId = query.portId as string;
        const seaAreaId = query.seaAreaId as string;
        return imdConnector.getMarineBulletins(portId, seaAreaId);
      }
      case 'overview': {
        return imdConnector.getNationalOverview();
      }
      case 'stations': {
        return {
          source: 'IMD Station Master Registry',
          status: 'success',
          fetchedAt: new Date().toISOString(),
          count: imdStationsData.length,
          data: imdStationsData,
        };
      }
      case 'locations': {
        return {
          source: 'IMD / Survey of India Administrative Hierarchy',
          status: 'success',
          fetchedAt: new Date().toISOString(),
          data: indiaLocationsData,
        };
      }
      case 'city-mapping': {
        return {
          source: 'IMD',
          status: 'success',
          fetchedAt: new Date().toISOString(),
          data: cityStationMapData,
        };
      }
      case 'environment/aqi': {
        const lat = Number(query.lat);
        const lng = Number(query.lng ?? query.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return { source: 'IMD / CPCB SAFAR Provider', status: 'error', fetchedAt: new Date().toISOString(), data: null, error: { code: 'INVALID_COORDS', message: 'Valid lat and lng/lon are required.' } };
        }
        const name = query.name || 'Selected Station';
        const data = await AQIProvider.getAQIForLocation(lat, lng, name);
        return {
          source: 'IMD / CPCB SAFAR Provider',
          status: data.status,
          fetchedAt: data.updatedAt,
          data,
        };
      }
      case 'environment/pollen': {
        const lat = Number(query.lat);
        const lng = Number(query.lng ?? query.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return { source: 'IMD Botanical Telemetry', status: 'error', fetchedAt: new Date().toISOString(), data: null, error: { code: 'INVALID_COORDS', message: 'Valid lat and lng/lon are required.' } };
        }
        const data = await PollenProvider.getPollenForLocation(lat, lng);
        return {
          source: 'IMD Botanical Telemetry',
          status: data.status,
          fetchedAt: data.updatedAt,
          data,
        };
      }
      default: {
        return {
          source: 'IMD',
          status: 'error',
          fetchedAt: new Date().toISOString(),
          stale: false,
          data: null,
          error: { code: 'NOT_FOUND', message: `Unknown IMD route: ${route}` },
        };
      }
    }
  }
}

export const weatherService = WeatherService.getInstance();
