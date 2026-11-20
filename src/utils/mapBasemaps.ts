/**
 * MAUSAM Verified Zero-Key Basemap Registry
 * Replaces CARTO (which requires an API key) with verified no-key dark observatory tiles
 * and automatic failover to OpenStreetMap standard tiles styled for dark telemetry maps.
 */

export interface BasemapLayerSpec {
  id: 'esri-dark-gray' | 'osm-dark-fallback';
  name: string;
  baseUrl: string;
  referenceUrl?: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string | string[];
  className?: string;
}

export const PRIMARY_OBSERVATORY_BASEMAP: BasemapLayerSpec = {
  id: 'esri-dark-gray',
  name: 'Esri Dark Gray Canvas',
  baseUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  referenceUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS, &copy; OpenStreetMap contributors',
  maxZoom: 16,
  className: 'mausam-esri-dark-tiles',
};

export const FALLBACK_OSM_BASEMAP: BasemapLayerSpec = {
  id: 'osm-dark-fallback',
  name: 'OpenStreetMap (Dark Observatory Fallback)',
  baseUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  maxZoom: 18,
  className: 'mausam-osm-dark-tiles',
};

export const INDIA_GEOGRAPHIC_BOUNDS: [[number, number], [number, number]] = [
  [6.2, 67.5],
  [36.5, 97.6],
];

export const NORTH_INDIAN_OCEAN_BOUNDS: [[number, number], [number, number]] = [
  [5.0, 64.0],
  [26.5, 96.5],
];
