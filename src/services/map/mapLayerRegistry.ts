/**
 * MAUSAM Unified Map Layer Registry
 * Single source of truth for layer metadata, physical units, color ramps,
 * data provenance, and observation vs forecast classification.
 */

export type MapLayerId =
  | 'radar'
  | 'temperature'
  | 'rainfall'
  | 'wind'
  | 'humidity'
  | 'aqi'
  | 'warnings'
  | 'agromet'
  | 'marine';

export type LayerDataKind = 'OBSERVED' | 'FORECAST' | 'MODEL_DERIVED' | 'REFERENCE';

export interface LayerLegendStop {
  label: string;
  color: string;
  range?: string;
}

export interface MapLayerDefinition {
  id: MapLayerId;
  label: string;
  shortLabel: string;
  unit: string;
  description: string;
  source: string;
  dataKind: LayerDataKind;
  defaultOpacity: number;
  gradientCss: string;
  stops: readonly LayerLegendStop[];
}

export const MAP_LAYER_REGISTRY: Record<MapLayerId, MapLayerDefinition> = {
  radar: {
    id: 'radar',
    label: 'Doppler Precipitation Radar',
    shortLabel: 'Radar',
    unit: 'dBZ / mm/h',
    description: 'Timestamped RainViewer composite reflectivity sweeps paired with IMD DWR station rings.',
    source: 'RainViewer / IMD DWR Composite',
    dataKind: 'OBSERVED',
    defaultOpacity: 0.78,
    gradientCss:
      'linear-gradient(to right, #78AEB6 0%, #10B981 22%, #FACC15 44%, #FB923C 66%, #EF4444 84%, #C026D3 100%)',
    stops: [
      { label: 'Trace', color: '#78AEB6', range: '< 15 dBZ' },
      { label: 'Light', color: '#10B981', range: '15–30 dBZ' },
      { label: 'Moderate', color: '#FACC15', range: '30–40 dBZ' },
      { label: 'Heavy', color: '#FB923C', range: '40–50 dBZ' },
      { label: 'Intense', color: '#EF4444', range: '50–60 dBZ' },
      { label: 'Hail', color: '#C026D3', range: '> 60 dBZ' },
    ],
  },
  temperature: {
    id: 'temperature',
    label: 'Surface Temperature',
    shortLabel: 'Temp',
    unit: '°C',
    description: '2-meter air temperature across Indian meteorological divisions and live point coordinates.',
    source: 'Open-Meteo Grid / Regional Baseline',
    dataKind: 'MODEL_DERIVED',
    defaultOpacity: 0.85,
    gradientCss:
      'linear-gradient(to right, #38BDF8 0%, #10B981 30%, #FACC15 58%, #F97316 80%, #EF4444 100%)',
    stops: [
      { label: '< 15°C', color: '#38BDF8' },
      { label: '15–25°C', color: '#10B981' },
      { label: '25–32°C', color: '#FACC15' },
      { label: '32–38°C', color: '#F97316' },
      { label: '≥ 38°C', color: '#EF4444' },
    ],
  },
  rainfall: {
    id: 'rainfall',
    label: '24h Rainfall Accumulation',
    shortLabel: 'Rain',
    unit: 'mm',
    description: 'Accumulated precipitation depth calibrated to IMD rainfall intensity thresholds.',
    source: 'Open-Meteo Precipitation / IMD Grid',
    dataKind: 'FORECAST',
    defaultOpacity: 0.82,
    gradientCss:
      'linear-gradient(to right, #475569 0%, #38BDF8 30%, #0EA5E9 55%, #6366F1 78%, #A855F7 100%)',
    stops: [
      { label: 'Dry', color: '#475569', range: '0 mm' },
      { label: 'Light', color: '#38BDF8', range: '0.1–15 mm' },
      { label: 'Moderate', color: '#0EA5E9', range: '15–64 mm' },
      { label: 'Heavy', color: '#6366F1', range: '65–115 mm' },
      { label: 'Extreme', color: '#A855F7', range: '> 115 mm' },
    ],
  },
  wind: {
    id: 'wind',
    label: 'Surface Wind Flow & Vectors',
    shortLabel: 'Wind',
    unit: 'km/h',
    description: '10-meter directional wind vectors and speed contours aligned with IMD gale thresholds.',
    source: 'Open-Meteo 10m Wind Field',
    dataKind: 'MODEL_DERIVED',
    defaultOpacity: 0.85,
    gradientCss:
      'linear-gradient(to right, #94A3B8 0%, #38BDF8 24%, #10B981 48%, #F59E0B 72%, #EF4444 100%)',
    stops: [
      { label: 'Calm', color: '#94A3B8', range: '< 10 km/h' },
      { label: 'Breeze', color: '#38BDF8', range: '10–25 km/h' },
      { label: 'Fresh', color: '#10B981', range: '25–45 km/h' },
      { label: 'Strong', color: '#F59E0B', range: '45–65 km/h' },
      { label: 'Gale', color: '#EF4444', range: '> 65 km/h' },
    ],
  },
  humidity: {
    id: 'humidity',
    label: 'Relative Humidity',
    shortLabel: 'Humidity',
    unit: '% RH',
    description: 'Surface moisture saturation and dew-point comfort index across monitoring zones.',
    source: 'Open-Meteo Hygrometry',
    dataKind: 'MODEL_DERIVED',
    defaultOpacity: 0.82,
    gradientCss:
      'linear-gradient(to right, #F59E0B 0%, #10B981 35%, #06B6D4 68%, #3B82F6 100%)',
    stops: [
      { label: 'Dry', color: '#F59E0B', range: '< 35%' },
      { label: 'Comfort', color: '#10B981', range: '35–60%' },
      { label: 'Humid', color: '#06B6D4', range: '60–80%' },
      { label: 'Saturated', color: '#3B82F6', range: '> 80%' },
    ],
  },
  aqi: {
    id: 'aqi',
    label: 'Air Quality Index (NAQI)',
    shortLabel: 'AQI',
    unit: 'NAQI · µg/m³',
    description: 'Indian National Air Quality Index (CPCB scale) with PM2.5 and PM10 particulate breakdown.',
    source: 'CPCB / Open-Meteo Air Quality Proxy',
    dataKind: 'OBSERVED',
    defaultOpacity: 0.88,
    gradientCss:
      'linear-gradient(to right, #22C55E 0%, #84CC16 20%, #FACC15 40%, #F97316 60%, #EF4444 80%, #991B1B 100%)',
    stops: [
      { label: 'Good', color: '#22C55E', range: '0–50' },
      { label: 'Satisfactory', color: '#84CC16', range: '51–100' },
      { label: 'Moderate', color: '#FACC15', range: '101–200' },
      { label: 'Poor', color: '#F97316', range: '201–300' },
      { label: 'Very Poor', color: '#EF4444', range: '301–400' },
      { label: 'Severe', color: '#991B1B', range: '> 400' },
    ],
  },
  warnings: {
    id: 'warnings',
    label: 'Official Severe Weather Warnings',
    shortLabel: 'Warnings',
    unit: 'IMD Color Code',
    description: 'Verified state & coastal meteorological advisories reconciled with IMD CAP bulletins.',
    source: 'IMD / NDMA SACHET CAP Feed',
    dataKind: 'OBSERVED',
    defaultOpacity: 0.9,
    gradientCss:
      'linear-gradient(to right, #10B981 0%, #FACC15 35%, #F97316 70%, #EF4444 100%)',
    stops: [
      { label: 'Green', color: '#10B981', range: 'No Warning' },
      { label: 'Yellow', color: '#FACC15', range: 'Be Updated' },
      { label: 'Orange', color: '#F97316', range: 'Be Prepared' },
      { label: 'Red', color: '#EF4444', range: 'Take Action' },
    ],
  },
  agromet: {
    id: 'agromet',
    label: 'Agricultural & Soil Moisture',
    shortLabel: 'Agromet',
    unit: 'm³/m³ · mm',
    description: 'Root-zone soil moisture, rainfall deficit, heat stress, and frost-risk advisories.',
    source: 'Open-Meteo Agro Grid / IMD Gramin Krishi',
    dataKind: 'MODEL_DERIVED',
    defaultOpacity: 0.85,
    gradientCss:
      'linear-gradient(to right, #D97706 0%, #EAB308 32%, #10B981 66%, #0284C7 100%)',
    stops: [
      { label: 'Dry Stress', color: '#D97706', range: '< 0.15' },
      { label: 'Moderate', color: '#EAB308', range: '0.15–0.25' },
      { label: 'Optimal', color: '#10B981', range: '0.25–0.38' },
      { label: 'Waterlogged', color: '#0284C7', range: '> 0.38' },
    ],
  },
  marine: {
    id: 'marine',
    label: 'Marine & North Indian Ocean Basin',
    shortLabel: 'Marine',
    unit: 'm · kt',
    description: 'Significant wave height, swell period, sea-surface temperature, and RSMC cyclone tracks.',
    source: 'Open-Meteo Marine / RSMC New Delhi',
    dataKind: 'MODEL_DERIVED',
    defaultOpacity: 0.86,
    gradientCss:
      'linear-gradient(to right, #10B981 0%, #38BDF8 32%, #F59E0B 66%, #EF4444 100%)',
    stops: [
      { label: 'Calm', color: '#10B981', range: '< 1.0 m' },
      { label: 'Moderate', color: '#38BDF8', range: '1.0–2.5 m' },
      { label: 'Rough', color: '#F59E0B', range: '2.5–4.0 m' },
      { label: 'High / Gale', color: '#EF4444', range: '> 4.0 m' },
    ],
  },
};

export function getMapLayerDefinition(id: MapLayerId): MapLayerDefinition {
  return MAP_LAYER_REGISTRY[id];
}
