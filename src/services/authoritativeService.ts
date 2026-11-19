import { LocationRecord } from '../types';
import { PersonaDataBundleSchema } from '../../shared/weatherContract';

export interface AuthoritativeAQI {
  source: string;
  stationName: string;
  aqi: number | null;
  category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe' | 'Unavailable';
  dominantPollutant: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  healthAdvice: string;
  colorCode: string;
  lastUpdated: string;
  isOfficialFeed: boolean;
}

export interface AuthoritativePollen {
  source: string;
  overallIndex: number | null;
  riskCategory: 'Low' | 'Moderate' | 'High' | 'Very High';
  treePollen: number | null;
  grassPollen: number | null;
  weedPollen: number | null;
  alderPollen?: number | null;
  birchPollen?: number | null;
  ragweedPollen?: number | null;
  allergyTip: string;
  lastUpdated: string;
}

export interface AuthoritativeTide {
  source: string;
  isCoastal: boolean;
  stationName: string;
  nextHighTide: { time: string; heightMeters: number };
  nextLowTide: { time: string; heightMeters: number };
  upcomingExtremes: Array<{ time: string; type: 'High' | 'Low'; heightMeters: number }>;
  currentWaterLevelMeters: number;
  lastUpdated: string;
}

export interface AuthoritativeMarine {
  source: string;
  isCoastal: boolean;
  waveHeightMeters: number | null;
  wavePeriodSeconds: number | null;
  waveDirectionDegrees: number | null;
  seaSurfaceTemperatureC: number | null;
  surfCondition: 'Calm & Safe' | 'Moderate Swell' | 'Rough Waves' | 'Dangerous Surf';
  marineAdvisory: string;
  lastUpdated: string;
}

export interface AuthoritativeAlert {
  id: string;
  source: string;
  title: string;
  severity: 'Severe' | 'Warning' | 'Advisory' | 'Informational';
  category: 'Heatwave' | 'Thunderstorm' | 'Heavy Rain' | 'Cyclone' | 'Fog' | 'High Wind' | 'General';
  description: string;
  affectedArea: string;
  effectiveFrom: string;
  expiresAt: string;
  actionItem: string;
  color: string;
}

export interface SavedDestination {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  addedAt: string;
  weatherSummary?: string;
  temp?: number;
  condition?: string;
  activeAlert?: string;
  packingTip?: string;
}

export interface PersonaDataBundle {
  location: {
    city: string;
    state: string;
    lat: number;
    lng: number;
    isCoastal: boolean;
  };
  health: {
    aqi: AuthoritativeAQI;
    pollen: AuthoritativePollen;
    uvIndex: number | null;
    uvRiskLabel: string;
    uvAdvice: string;
    humidity: number | null;
  };
  fitness: {
    sunrise: string | null;
    sunset: string | null;
    bestRunningHours: string;
    workoutSuitability: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    heatAlertActive: boolean;
    heatAlertMessage: string | null;
    windSpeedKmh: number | null;
    windDirection: string;
    hydrationRateMlHour: number | null;
    thermalStressLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
  };
  beachAndSurf: {
    isCoastal: boolean;
    tides: AuthoritativeTide | null;
    marine: AuthoritativeMarine | null;
  };
  travel: {
    activeAlerts: AuthoritativeAlert[];
    packingSuggestions: string[];
    travelSafetyRating: 'Favorable' | 'Minor Delays Expected' | 'Caution Advised' | 'Hazardous';
  };
  familyCommute: {
    morningCommuteStatus: 'Safe' | 'Caution' | 'Hazardous';
    eveningCommuteStatus: 'Safe' | 'Caution' | 'Hazardous';
    morningWindow: string;
    eveningWindow: string;
    rainExpectedDuringCommute: boolean;
    commuteRainSummary: string;
    schoolBusSafetyNote: string;
    severeWarnings: AuthoritativeAlert[];
  };
  agriculture: {
    soilMoisturePercent: number | null;
    soilMoistureStatus: 'Dry' | 'Optimal' | 'Saturated';
    threeDayRainfallTotalMm: number | null;
    frostAlertActive: boolean;
    frostAlertMessage: string | null;
    currentCropSeason: 'Kharif' | 'Rabi' | 'Zaid';
    seasonalPlantingTip: string;
    irrigationRecommendation: string;
  };
  commuter: {
    roadCondition: 'Dry' | 'Wet' | 'Waterlogged' | 'Icy' | 'Foggy';
    roadSafetyIndex: 'Green' | 'Yellow' | 'Red';
    roadSafetyLabel: string;
    visibilityKm: number | null;
    visibilityStatus: 'Clear' | 'Moderate' | 'Poor (Fog)' | 'Dense Fog Danger';
    travelHazards: string[];
  };
  eventPlanner: {
    extendedForecast: Array<{
      date: string;
      dayOfWeek: string;
      tempMax: number | null;
      tempMin: number | null;
      condition: string;
      icon: string;
      rainProbabilityPercent: number | null;
      comfortIndexValue: number | null;
      comfortCategory: 'Pleasant' | 'Comfortable' | 'Warm & Humid' | 'Uncomfortable' | 'Stifling';
    }>;
    comfortIndexToday: number | null;
    comfortCategoryToday: 'Pleasant' | 'Comfortable' | 'Warm & Humid' | 'Uncomfortable' | 'Stifling';
    eventRecommendation: string;
  };
  fetchedAt: string;
}

const SAVED_DESTINATIONS_KEY = 'mausam_saved_destinations_v1';

class ClientAuthoritativeService {
  private cache: Map<string, { bundle: PersonaDataBundle; timestamp: number }> = new Map();
  private cacheTtl = 5 * 60 * 1000; // 5 min TTL

  /**
   * Fetch complete persona bundle for active location
   */
  async getPersonaBundle(
    location: LocationRecord,
    currentTelemetry?: {
      temp?: number | null;
      humidity?: number | null;
      windSpeed?: number | null;
      windDir?: string | null;
      uvIndex?: number | null;
      rainMm?: number | null;
      isRaining?: boolean;
      visibilityKm?: number | null;
      sunrise?: string | null;
      sunset?: string | null;
    },
    forceRefresh = false
  ): Promise<PersonaDataBundle> {
    const key = `${location.id}_${location.lat.toFixed(2)}_${location.lng.toFixed(2)}`;
    const now = Date.now();

    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && now - cached.timestamp < this.cacheTtl) {
        return cached.bundle;
      }
    }

    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lng: location.lng.toString(),
      city: location.city,
      state: location.state,
      stationName: location.displayName || `${location.city} Observatory`,
    });

    if (typeof currentTelemetry?.temp === 'number' && Number.isFinite(currentTelemetry.temp)) {
      params.append('temp', currentTelemetry.temp.toString());
    }
    if (typeof currentTelemetry?.humidity === 'number' && Number.isFinite(currentTelemetry.humidity)) {
      params.append('humidity', currentTelemetry.humidity.toString());
    }
    if (typeof currentTelemetry?.windSpeed === 'number' && Number.isFinite(currentTelemetry.windSpeed)) {
      params.append('windSpeed', currentTelemetry.windSpeed.toString());
    }
    if (currentTelemetry?.windDir && currentTelemetry.windDir !== '—') {
      params.append('windDir', currentTelemetry.windDir);
    }
    if (typeof currentTelemetry?.uvIndex === 'number' && Number.isFinite(currentTelemetry.uvIndex)) {
      params.append('uvIndex', currentTelemetry.uvIndex.toString());
    }
    if (currentTelemetry?.isRaining) {
      params.append('isRaining', 'true');
    }
    if (typeof currentTelemetry?.visibilityKm === 'number' && Number.isFinite(currentTelemetry.visibilityKm)) {
      params.append('visibilityKm', currentTelemetry.visibilityKm.toString());
    }
    if (currentTelemetry?.sunrise) {
      params.append('sunrise', currentTelemetry.sunrise);
    }
    if (currentTelemetry?.sunset) {
      params.append('sunset', currentTelemetry.sunset);
    }

    params.append('mode', 'bundle');

    let lastSchemaError = '';
    const tryValidate = (payload: any): PersonaDataBundle | null => {
      if (!payload || payload.status !== 'success' || !payload.data) return null;
      const parsed = PersonaDataBundleSchema.safeParse(payload.data);
      if (parsed.success) {
        return parsed.data as unknown as PersonaDataBundle;
      }
      lastSchemaError = parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('; ');
      console.warn('[ClientAuthoritativeService] Schema validation failed:', lastSchemaError);
      return null;
    };

    let lastStatus = 0;
    try {
      const res = await fetch(`/api/weather?${params.toString()}`);
      lastStatus = res.status;
      if (res.ok) {
        const json = await res.json();
        const valid = tryValidate(json);
        if (valid) {
          this.cache.set(key, { bundle: valid, timestamp: now });
          return valid;
        }
      }
    } catch {
      // Fall through to authoritative persona-bundle endpoint
    }

    const fallbackRes = await fetch(`/api/authoritative/persona-bundle?${params.toString()}`);
    if (!fallbackRes.ok) {
      throw new Error(
        `Authoritative persona telemetry endpoint responded with HTTP ${fallbackRes.status || lastStatus || 502}`
      );
    }

    const fallbackJson = await fallbackRes.json();
    const fallbackValid = tryValidate(fallbackJson);
    if (fallbackValid) {
      this.cache.set(key, { bundle: fallbackValid, timestamp: now });
      return fallbackValid;
    }

    throw new Error(
      lastSchemaError
        ? `Persona telemetry payload validation failed (${lastSchemaError})`
        : 'Persona telemetry payload could not be verified against schema'
    );
  }

  /**
   * Saved Destinations management (localStorage persistence)
   */
  getSavedDestinations(): SavedDestination[] {
    try {
      const stored = localStorage.getItem(SAVED_DESTINATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved destinations from storage:', e);
    }

    // Default initial starter bookmarks (coordinates only — never fabricated weather telemetry)
    const defaults: SavedDestination[] = [
      {
        id: 'delhi',
        name: 'New Delhi',
        state: 'Delhi NCR',
        lat: 28.6139,
        lng: 77.2090,
        addedAt: new Date().toISOString(),
        weatherSummary: 'Select station to load live telemetry',
      },
      {
        id: 'mumbai',
        name: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lng: 72.8777,
        addedAt: new Date().toISOString(),
        weatherSummary: 'Coastal Observatory',
      },
      {
        id: 'london',
        name: 'London',
        state: 'United Kingdom (Intl)',
        lat: 51.5074,
        lng: -0.1278,
        addedAt: new Date().toISOString(),
        weatherSummary: 'International Station',
      },
    ];

    this.saveDestinations(defaults);
    return defaults;
  }

  saveDestinations(destinations: SavedDestination[]) {
    try {
      localStorage.setItem(SAVED_DESTINATIONS_KEY, JSON.stringify(destinations));
    } catch (e) {
      console.warn('Failed to save destinations to storage:', e);
    }
  }

  addDestination(name: string, state: string, lat: number, lng: number): SavedDestination[] {
    const current = this.getSavedDestinations();
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (current.some((d) => d.id === id || (Math.abs(d.lat - lat) < 0.05 && Math.abs(d.lng - lng) < 0.05))) {
      return current; // already exists
    }

    const newDest: SavedDestination = {
      id,
      name,
      state,
      lat,
      lng,
      addedAt: new Date().toISOString(),
      weatherSummary: 'Saved station bookmark',
    };

    const updated = [newDest, ...current];
    this.saveDestinations(updated);
    return updated;
  }

  removeDestination(id: string): SavedDestination[] {
    const current = this.getSavedDestinations();
    const updated = current.filter((d) => d.id !== id);
    this.saveDestinations(updated);
    return updated;
  }
}

export const authoritativeClient = new ClientAuthoritativeService();
