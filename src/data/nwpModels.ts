// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// NWP Model Definitions & Meteorological Specifications
// Strictly grounded in official provider documentation:
// - WRF: NCAR/UCAR & IMD Operational Documentation (ARW Mesoscale Core)
// - GEFS: NOAA/NCEP EMC (Global Ensemble Forecast System v12, 31 members)
// - ECMWF: European Centre for Medium-Range Weather Forecasts (IFS HRES/ENS)
// ====================================================================

export type NWPModelId = 'WRF' | 'GEFS' | 'ECMWF';

export interface NWPModelDefinition {
  id: NWPModelId;
  name: string;
  provider: string;
  modelFamily: string;
  purpose: string;
  spatialResolution?: string;
  forecastRange?: string;
  updateFrequency?: string;
  ensembleMembers?: number;
  domain?: string;
  variables: string[];
  strengths: string[];
  limitations: string[];
  sourceUrl: string;
}

export const NWP_MODEL_DEFINITIONS: Record<NWPModelId, NWPModelDefinition> = {
  WRF: {
    id: 'WRF',
    name: 'Weather Research and Forecasting Model (WRF-ARW)',
    provider: 'IMD / NCMRWF (when configured) • NCAR / UCAR',
    modelFamily: 'Mesoscale Numerical Weather Prediction System',
    purpose: 'Regional, high-resolution atmospheric forecasting and research designed to resolve local convective updrafts, complex terrain interactions, and short-range severe weather.',
    spatialResolution: 'Domain-dependent (IMD operational configuration targets ~3 km over India)',
    forecastRange: '0–72 Hours (Short-Range Mesoscale)',
    updateFrequency: '00Z & 12Z UTC (IMD Operational Cycle)',
    ensembleMembers: 1,
    domain: 'Regional / Indian Subcontinent Domain',
    variables: [
      '2m Temperature',
      'Surface Pressure (MSLP)',
      '10m Wind Velocity & Gusts',
      'Surface QPF Rain & Convective Precipitation',
      'Boundary Layer Relative Humidity',
      'Convective Available Potential Energy (CAPE)',
      'Total Cloud Cover',
    ],
    strengths: [
      'Explicitly resolves convective storm structures without hydrostatic approximations',
      'High sensitivity to localized terrain, coastal sea breezes, and valley inversions',
      'Crucial for short-range thunderstorm, squall line, and localized cloudburst alerts',
    ],
    limitations: [
      'Computationally demanding over broad geographic domains',
      'Requires institutional authenticated IMD HPC gateway access for operational Indian feeds',
      'Predictability degrades rapidly beyond 48–72 hours',
    ],
    sourceUrl: 'https://www.mmm.ucar.edu/weather-research-and-forecasting-model',
  },
  GEFS: {
    id: 'GEFS',
    name: 'Global Ensemble Forecast System (GEFS v12)',
    provider: 'National Oceanic and Atmospheric Administration (NOAA) / NCEP',
    modelFamily: 'Global Ensemble Prediction System (FV3 Core + SPPT)',
    purpose: 'Global ensemble system generating 31 atmospheric states to quantify forecast uncertainty, probabilistic precipitation risk, and cyclogenesis scenarios.',
    spatialResolution: '~25 km (0.25°/0.5° Operational Products)',
    forecastRange: '0–16 Days (Medium-to-Extended Range)',
    updateFrequency: '00Z, 06Z, 12Z, 18Z (4 Cycles Daily)',
    ensembleMembers: 31,
    domain: 'Global',
    variables: [
      'Ensemble Mean Temperature',
      'Ensemble Spread & Standard Deviation',
      'Precipitation Probability (>1mm, >10mm, >25mm)',
      '10m Wind Ensemble Spread',
      'Mean Sea Level Pressure (MSLP)',
      'Geopotential Height (500 hPa)',
    ],
    strengths: [
      'Quantifies forecast uncertainty through multiple perturbed atmospheric trajectories',
      'Ensemble spread highlights divergence in medium-range synoptic patterns',
      'Superior risk estimation for tropical cyclogenesis and multi-day heavy rainfall events',
    ],
    limitations: [
      '25 km resolution smooths out local convective precipitation peaks',
      'Ensemble spread can be under-dispersive in complex tropical monsoon regimes',
    ],
    sourceUrl: 'https://www.ncep.noaa.gov',
  },
  ECMWF: {
    id: 'ECMWF',
    name: 'ECMWF Integrated Forecasting System (IFS HRES / ENS)',
    provider: 'European Centre for Medium-Range Weather Forecasts (ECMWF)',
    modelFamily: 'Global Numerical Weather Prediction (Continuous 4D-Var Data Assimilation)',
    purpose: 'Global numerical guidance for medium-range atmospheric evolution, planetary wave progression, and synoptic pressure systems.',
    spatialResolution: '9 km Native (0.1° / 0.25° Open Data Distribution)',
    forecastRange: '0–15 Days (Medium Range)',
    updateFrequency: '00Z & 12Z Operational Cycles',
    ensembleMembers: 51,
    domain: 'Global',
    variables: [
      '2m Temperature & Apparent Temperature',
      'Dew Point (2m) & Relative Humidity',
      'Total Precipitation & Rain Showers',
      'Precipitation Probability',
      'Mean Sea Level Pressure (MSLP)',
      '10m Wind Speed, Direction & Gusts',
      'Total, Low, Mid & High Cloud Cover',
      'Visibility',
      'Surface CAPE',
    ],
    strengths: [
      'Global benchmark for medium-range synoptic and monsoon trough progression',
      'Advanced 4D-Var data assimilation ingesting millions of daily satellite radiances',
      'High-precision precipitation field and planetary pressure pattern forecasting',
    ],
    limitations: [
      'Twice-daily operational delivery cycles',
      'Localized convective cloudbursts require regional mesoscale downscaling',
    ],
    sourceUrl: 'https://www.ecmwf.int',
  },
};
