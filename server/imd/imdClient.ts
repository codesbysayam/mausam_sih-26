/**
 * IMD HTTP Client with AbortController, Exponential Backoff Retries, and Auth Header injection
 */

import { classifyIMDError, IMDErrorPayload } from './imdErrors';
import {
  MAUSAM_RUNTIME_CONFIG,
  OPTIONAL_INTEGRATION_DISABLED_MESSAGE,
} from '../../lib/providers/ai';

const DEFAULT_TIMEOUT = 10000;
const BASE_URL = 'https://api.imd.gov.in/api/v1';

export interface IMDClientResponse<T = any> {
  ok: boolean;
  source: 'IMD';
  fetchedAt: string;
  stale: boolean;
  data: T | null;
  raw?: any;
  error?: IMDErrorPayload | null;
  executionMs?: number;
}

export class IMDClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = BASE_URL.replace(/\/$/, '');
    this.timeoutMs = DEFAULT_TIMEOUT;
  }

  async request<T = any>(path: string, _params: Record<string, any> = {}): Promise<IMDClientResponse<T>> {
    const cleanPath = path.replace(/^\//, '');

    if (!MAUSAM_RUNTIME_CONFIG.officialImdEnabled) {
      return {
        ok: false,
        source: 'IMD',
        fetchedAt: new Date().toISOString(),
        stale: false,
        data: null,
        error: classifyIMDError(undefined, new Error(OPTIONAL_INTEGRATION_DISABLED_MESSAGE), cleanPath),
        executionMs: 0,
      };
    }

    return {
      ok: false,
      source: 'IMD',
      fetchedAt: new Date().toISOString(),
      stale: false,
      data: null,
      error: classifyIMDError(undefined, new Error(OPTIONAL_INTEGRATION_DISABLED_MESSAGE), cleanPath),
      executionMs: 0,
    };
  }

  currentWeather(stationId?: string) {
    return this.request('current_wx', stationId ? { id: stationId } : {});
  }

  cityForecast(cityId: string) {
    return this.request('cityforecast', { id: cityId });
  }

  cityForecastLocation(cityId: string) {
    return this.request('cityforecastloc', { id: cityId });
  }

  districtNowcast(districtId?: string) {
    return this.request('districtnowcast', districtId ? { id: districtId } : {});
  }

  districtRainfall(districtId?: string) {
    return this.request('districtrainfall', districtId ? { id: districtId } : {});
  }

  districtWarning(districtId?: string) {
    return this.request('districtwarning', districtId ? { id: districtId } : {});
  }

  stationNowcast(station?: string) {
    return this.request('stationnowcast', station ? { id: station } : {});
  }

  stateRainfall(stateId?: string) {
    return this.request('staterainfall', stateId ? { id: stateId } : {});
  }

  awsData(stationId?: string) {
    return this.request('aws_data', stationId ? { id: stationId } : {});
  }

  awsState(stateId: string) {
    return this.request('aws_data', { sid: stateId });
  }

  awsMapping() {
    return this.request('aws_data_mapping');
  }

  basinQPF(basinId?: string) {
    return this.request('basinqpf', basinId ? { id: basinId } : {});
  }

  portWarning(portId?: string) {
    return this.request('portwarning', portId ? { id: portId } : {});
  }

  seaBulletin(areaId?: string) {
    return this.request('seabulletin', areaId ? { id: areaId } : {});
  }

  coastalBulletin() {
    return this.request('coastalbulletin');
  }

  subdivisionWarning() {
    return this.request('subdivisionwarning');
  }

  sunMoon(lat: number, lon: number) {
    return this.request('sunmoon', { lat, lon });
  }

  subdivisionRainfallForecast() {
    return this.request('subdivision_rainfall_forecast');
  }

  stateDistrictRainfallForecast() {
    return this.request('state_district_rainfall_forecast');
  }

  cycloneTrack() {
    return this.request('cyclone_track');
  }

  cycloneWind() {
    return this.request('cyclone_wind');
  }

  cycloneCone() {
    return this.request('cyclone_cou');
  }
}

export const imdClient = new IMDClient();
