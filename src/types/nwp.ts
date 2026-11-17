// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// NWP Data Contracts & Model Types
// Strictly defines physical meteorological variables for numerical simulation output.
// ====================================================================

import { NWPModelId } from '../data/nwpModels';

export interface NWPForecastPoint {
  validTime: string;
  leadHours: number;

  temperature2m?: number;
  apparentTemperature?: number;
  dewPoint2m?: number;
  relativeHumidity?: number;

  precipitation?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  precipitationProbability?: number;

  windSpeed10m?: number;
  windDirection10m?: number;
  windGusts10m?: number;

  pressureMSL?: number;

  cloudCover?: number;
  cloudCoverLow?: number;
  cloudCoverMid?: number;
  cloudCoverHigh?: number;

  visibility?: number;

  cape?: number;
  liftedIndex?: number;

  weatherCode?: number;
}

export type NWPModelStatus = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';

export interface NWPEnsembleStats {
  membersCount: number;
  tempSpread?: { min: number; max: number; mean: number; stdDev?: number };
  windSpread?: { min: number; max: number; mean: number };
  precipProbabilities?: { above1mm: number; above10mm: number; above25mm: number };
  notes?: string;
}

export interface NWPModelRun {
  model: NWPModelId;
  provider: string;

  runTime: string;
  validFrom: string;
  validUntil: string;

  resolution?: string;
  forecastHours?: number;

  status: NWPModelStatus;

  source: string;
  fetchedAt: string;

  points: NWPForecastPoint[];

  ensembleStats?: NWPEnsembleStats;
  unavailableReason?: string;
  nextExpectedUpdate?: string;
}

export interface NWPModelDataset {
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };

  models: Partial<Record<NWPModelId, NWPModelRun>>;

  fetchedAt: string;
  overallStatus: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
}

export interface ModelComparisonPoint {
  validTime: string;
  leadHours: number;
  wrf?: NWPForecastPoint;
  gefs?: NWPForecastPoint;
  ecmwf?: NWPForecastPoint;
  tempAgreement?: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA';
  precipAgreement?: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA';
  windAgreement?: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA';
  pressureAgreement?: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA';
}

export interface ModelAgreement {
  variable: string;
  spread: number;
  level: 'HIGH' | 'MODERATE' | 'LOW';
  availableModels: string[];
}

// ====================================================================
// Independent Model State Architecture Contracts
// ====================================================================
export type ModelStateStatus =
  | 'idle'
  | 'loading'
  | 'live'
  | 'recent'
  | 'stale'
  | 'unavailable'
  | 'error';

export interface ModelState<T = NWPModelRun> {
  status: ModelStateStatus;
  data: T | null;
  error: string | null;
  fetchedAt: string | null;
  runTime: string | null;
  requestId: string | null;
}

export interface NWPState {
  WRF: ModelState<NWPModelRun>;
  GEFS: ModelState<NWPModelRun>;
  ECMWF: ModelState<NWPModelRun>;
  selectedModel: NWPModelId;
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  lastRefresh: string | null;
}

