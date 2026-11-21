import type { DataProvenance } from './types/dataProvenance';

export type NavigationTab = 
  | 'today'
  | 'radar'
  | 'crowdsource'
  | 'agromet'
  | 'tools'
  | 'forecast'
  | 'hourly'
  | 'insights'
  | 'activities'
  | 'alerts'
  | 'saved-places'
  | 'settings'
  | 'help';

export type WeatherConditionType = 
  | 'rain'
  | 'sunny'
  | 'thunderstorm'
  | 'fog'
  | 'duststorm';

export type CentralWeatherCondition =
  | 'CLEAR_DAY'
  | 'CLEAR_NIGHT'
  | 'PARTLY_CLOUDY_DAY'
  | 'PARTLY_CLOUDY_NIGHT'
  | 'CLOUDY'
  | 'FOG'
  | 'DRIZZLE'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'THUNDERSTORM'
  | 'SNOW'
  | 'SLEET'
  | 'FREEZING_RAIN'
  | 'UNKNOWN';

export type NormalizedWeatherCondition =
  | 'CLEAR'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'OVERCAST'
  | 'DRIZZLE'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'THUNDERSTORM'
  | 'FOG'
  | 'HAZE'
  | 'DUST'
  | 'SNOW'
  | 'UNKNOWN';

export interface LocationRecord {
  id: string;
  state: string;
  district: string;
  city: string;
  country?: string;
  name?: string;
  stationId?: string;
  lat: number;
  lng: number;
  coordinates?: { lat: number; lng: number };
  pincode?: string;
  timezone: string;
  displayName: string;
  aliases?: string[];
  isPrimary?: boolean;
  elevation?: string;
  weatherStation?: string;
  imdStation?: string | null;
  radarCoverage?: 'Gopalpur DWR' | 'Paradip DWR' | 'Sambalpur DWR' | 'Kolkata DWR' | 'Visakhapatnam DWR' | string | null;
  coastalStatus?: 'coastal' | 'inland';
}

export type RadarLayer = 'radar' | 'satellite' | 'wind' | 'temp' | 'aqi';

export interface WeatherPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  city?: string;
  district?: string;
  state?: string;
  temperature: number;
  feelsLike?: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  accuracyMeters?: number | null;
  timestamp: string;
  rawTimestamp: number;
}

export interface WeatherStation {
  id: string;
  name: string;
  code: string;
  state: string;
  district: string;
  lat: number;
  lng: number;
  elevation: string;
  status: 'active' | 'calibrating' | 'standby';
  pm25: number | null;
  temp: number | null;
  condition: string;
  weatherType: WeatherConditionType;
  normalizedCondition?: NormalizedWeatherCondition;
  radarType?: string; // S-Band / X-Band
  reflectivityDbz?: number;
  precipitationMm?: number;
  isCoastal?: boolean;
}

export interface CurrentWeather {
  temp: number | null;
  unit: 'C' | 'F';
  high: number | null;
  low: number | null;
  tempMax?: number | null;
  tempMin?: number | null;
  feelsLike?: number | null;
  dataSource?: string;
  condition: string;
  conditionKey?: CentralWeatherCondition;
  isDay?: boolean;
  wmoCode?: number | null;
  normalizedCondition: NormalizedWeatherCondition;
  weatherType: WeatherConditionType;
  icon: string;
  windSpeed: number | null; // km/h
  windDirection: string;
  windDirectionDeg?: number | null;
  windGusts?: number | null;
  humidity: number | null; // %
  pressure: number | null; // hPa
  dewPoint: number | null; // °C
  uvIndex: number | null;
  uvDescription?: string;
  pollen: 'Low' | 'Moderate' | 'High' | 'Very High' | null;
  pollenCount?: number | null; // grains/m³
  grassPollen?: number | null; // grains/m³
  treePollen?: number | null; // grains/m³
  weedPollen?: number | null; // grains/m³
  aqi?: number | null;
  aqiPm25: number | null; // µg/m³
  aqiPm10?: number | null; // µg/m³
  aqiIndex?: number | null; // Indian CPCB / US AQI Index
  aqiDescription?: string;
  no2?: number | null; // µg/m³
  so2?: number | null; // µg/m³
  co?: number | null; // µg/m³
  o3?: number | null; // µg/m³
  dust?: number | null; // µg/m³
  aqiStatus: 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous' | 'Unavailable';
  precipitation: number | null; // mm currently
  precipitationMm?: number | null;
  rainfall?: number | null; // mm
  precipitationProbability: number | null; // %
  isRainingNow: boolean;
  rainExpectedSummary?: string;
  cloudCover?: number | null;
  visibility?: number | null;
  visibilityKm?: number | null;
  elevation?: string;
  sunrise?: string | null;
  sunset?: string | null;
  solarNoon?: string | null;
  daylightDuration?: string | null;
  dayLength?: string | null;
  nightDuration?: string | null;
  dawnTime?: string | null;
  duskTime?: string | null;
  civilDawn?: string | null;
  civilDusk?: string | null;
  solarElevationDeg?: number | null;
  solarRadiation?: number | null; // W/m² direct normal or global solar irradiance
  pressureTendency?: 'Rising' | 'Steady' | 'Falling' | null;
  pressureTendencyHpa?: number | null;
  rainfallLast1h?: number | null; // mm
  rainfallLast3h?: number | null; // mm
  rainfallLast24h?: number | null; // mm
  moonrise?: string | null;
  moonset?: string | null;
  moonPhase?: string | null;
  moonIllumination?: number | null; // percentage 0-100
  soilMoisture?: number | null; // m³/m³
  soilTemperature?: number | null; // °C
  evapotranspiration?: number | null; // mm FAO ET0
  stationName: string;
  stationCode: string;
  locationId?: string;
  lastUpdated: string;
  lastUpdatedTimestamp?: number;
  source: string;
  observedAt?: string | null;
  validAt?: string | null;
  fetchedAt?: string | null;
  provenance?: DataProvenance;
  observationStatus?: 'LOADING' | 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
  observationSource?: string;
  observationTimeFormatted?: string;
  previousHourTelemetry?: {
    temp?: number;
    humidity?: number;
    windSpeed?: number;
    pressure?: number;
    precipitation?: number;
    timestamp?: number;
    timeString?: string;
  };
  isLive?: boolean;
  error?: string | null;
}

// Crowdsource Mausam Types
export type WeatherEventType = 
  | 'Rain'
  | 'Drizzle'
  | 'Thunder / Lightning'
  | 'Hailstorm'
  | 'Dust Storm'
  | 'Fog'
  | 'Snow'
  | 'Gusty Wind';

export type DamageAssessmentType = 
  | 'None / Nil'
  | 'Minor tree branch breakage'
  | 'Power line / Utility disruption'
  | 'Structural roof / wall damage'
  | 'Crop lodging / field flooding'
  | 'Severe infrastructural damage';

export interface CrowdsourceReport {
  id: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  district: string;
  state: string;
  lat?: number;
  lng?: number;
  weatherEvent: WeatherEventType;
  damage: DamageAssessmentType;
  details: string;
  reporterName: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video';
  status: 'Verified by IMD' | 'Under Review' | 'Submitted';
  upvotes: number;
}

// Agromet Meghdoot Types
export interface CropAdvisory {
  cropName: string;
  stage: string; // Sowing, Vegetative, Flowering, Harvesting
  sowingAdvice: string;
  irrigationAdvice: string;
  fertilizerAdvice: string;
  pestDiseaseAdvice: string;
  harvestingAdvice: string;
  riskLevel: 'Low' | 'Moderate' | 'High';
  riskAlert: string;
}

export interface AgrometDistrictBulletin {
  state: string;
  district: string;
  amfuUnit: string;
  bulletinNo: string;
  issueDay: 'Tuesday' | 'Friday';
  issueDate: string;
  validPeriod: string;
  weatherSummary: string;
  rainfallForecast5Days: string;
  crops: CropAdvisory[];
}

// Forecasting Tools Types
export interface ForecastingTool {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  roleInForecasting: string;
  specifications: string[];
  liveStatus: string;
  keyMetricLabel: string;
  keyMetricValue: string;
}

export interface WeatherAlert {
  id: string;
  agency: string;
  title: string;
  severity: 'severe' | 'warning' | 'advisory' | 'info' | 'Severe' | 'Extreme' | 'Moderate' | 'red' | 'orange' | 'yellow' | 'extreme';
  description: string;
  affectedDistricts: string[];
  affectedArea?: string;
  issuedAt: string;
  validUntil: string;
  actionItem: string;
  color: string;
}

export interface HourlyForecastItem {
  time: string;
  hourNumber: number;
  temp: number;
  feelsLike?: number | null;
  condition: string;
  rainCondition?: string;
  icon: string;
  aqi: number | null;
  rainProb: number | null;
  windSpeed: number | null;
  windGusts?: number | null;
  uv: number | null;
  humidity: number | null;
  isNow?: boolean;
  precipitationProbability?: number | null;
  windDirection?: string;
  cloudCover?: number | null;
  qpf?: number;
  pressure?: number | null;
  precipitation?: number | null;
  visibilityKm?: number | null;
  solarRadiation?: number | null;
}

export interface MarineObservation {
  isApplicable: boolean;
  waveHeightMeters: number | null;
  swellHeightMeters: number | null;
  wavePeriodSeconds: number | null;
  swellPeriodSeconds: number | null;
  seaSurfaceTempC: number | null;
  currentVelocityKmh: number | null;
  currentDirectionDeg: number | null;
  currentDirectionCompass: string | null;
  windWaveHeightMeters: number | null;
  highTideTime: string | null;
  lowTideTime: string | null;
  fishingSuitability: 'Favorable' | 'Caution' | 'Advisory - Restrict Navigation' | 'Prohibited' | 'Unavailable';
  beachSafetyStatus: 'Safe' | 'Caution - Moderate Rip Currents' | 'Hazardous Surf' | 'Unavailable';
  source: string;
  timestampFormatted: string;
  status: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
}

export interface DailyForecastItem {
  day: string;
  date: string;
  condition: string;
  icon: string;
  high: number;
  low: number;
  rainProb: number | null;
  precipMm?: number | null;
  uv: number | null;
  aqi: number | null;
  humidity: number | null;
  wind: string;
  barProgress: {
    startPercent: number;
    widthPercent: number;
    color: string;
  };
}

export interface TelemetryDetail {
  title: string;
  value: string | number;
  unit: string;
  status: string;
  statusColor: string;
  description: string;
  history: number[];
  normRange: string;
}

export interface FitnessProfile {
  activity: string;
  optimalWindow: string;
  suitabilityScore: number;
  recommendation: string;
  peakUv: number;
  peakUvWindow: string;
  hydrationRateMlPerHour: number;
  hydrationReason: string;
  thermalStress: string;
}

export interface HistoricalTrendPoint {
  time: string;
  hour: number;
  temp: number;
  humidity: number | null;
  pressure: number | null;
  windSpeed: number | null;
  rain: number | null;
}


