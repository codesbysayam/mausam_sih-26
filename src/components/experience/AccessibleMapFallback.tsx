// ====================================================================
// MAUSAM 2D Interactive Map Fallback (Leaflet via MausamMap)
// Activated automatically if WebGL is unsupported/lost, or manually
// via the 2D Map toggle in the HUD settings.
// ====================================================================

import React, { useMemo } from 'react';
import { MausamMap } from '../map/MausamMap';
import type { WeatherMapMetric } from '../map/MapLayerControl';
import type { LocationRecord } from '../../types';
import type { RadarApiResponse } from '../../services/radarService';
import type { SpatialLayerId, InspectedSpatialFeature } from '../../context/ExperienceContext';
import type { StateWeatherData } from '../map/IndiaWeatherMap';
import { INDIA_STATES_UTS } from '../../data/indiaRegions';

interface AccessibleMapFallbackProps {
  activeLayer: SpatialLayerId;
  selectedLocation: LocationRecord;
  radarData?: RadarApiResponse | null;
  reason?: string | null;
  onSelectFeature: (feature: InspectedSpatialFeature) => void;
  onSwitchBackTo3D?: () => void;
}

function mapLayerTo2DMetric(layer: SpatialLayerId): WeatherMapMetric {
  switch (layer) {
    case 'wind':
      return 'wind';
    case 'rain':
    case 'radar':
    case 'satellite':
      return 'rainfall';
    case 'aqi':
      return 'aqi';
    case 'warnings':
    case 'cyclones':
      return 'warnings';
    case 'agromet':
      return 'humidity';
    case 'conditions':
    default:
      return 'temperature';
  }
}

export const AccessibleMapFallback: React.FC<AccessibleMapFallbackProps> = ({
  activeLayer,
  selectedLocation,
  radarData,
  reason,
  onSelectFeature,
  onSwitchBackTo3D,
}) => {
  const viewMode = activeLayer === 'radar' || activeLayer === 'rain' ? 'radar' : 'synoptic';
  const activeMetric = mapLayerTo2DMetric(activeLayer);

  const radarTileUrl = useMemo(() => {
    if (!radarData?.host || !radarData?.pastFrames?.length) return null;
    const latest = radarData.pastFrames[radarData.pastFrames.length - 1];
    return `${radarData.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
  }, [radarData]);

  const handleSelectState = (state: StateWeatherData) => {
    const region = INDIA_STATES_UTS.find(
      (r) =>
        r.name.toLowerCase() === state.name.toLowerCase() ||
        r.representativeCity.toLowerCase() === (state.city || '').toLowerCase()
    );
    onSelectFeature({
      kind: 'state',
      id: state.id,
      title: state.name,
      subtitle: `${state.city || state.name} · ${region?.code || state.id}`,
      lat: region?.latitude ?? 21.5,
      lng: region?.longitude ?? 79.0,
      stateName: state.name,
      warningLevel: state.warningLevel,
      warningMessage: state.warningMessage,
      source: state.dataSource,
      metrics: [
        {
          label: 'Temperature',
          value: typeof state.temperature === 'number' && Number.isFinite(state.temperature) ? `${state.temperature}°C` : '—',
        },
        {
          label: 'Wind',
          value:
            typeof state.windSpeed === 'number' && Number.isFinite(state.windSpeed)
              ? `${state.windSpeed} km/h ${state.windDir || ''}`.trim()
              : '—',
        },
        {
          label: 'Rainfall',
          value: typeof state.rainfall === 'number' && Number.isFinite(state.rainfall) ? `${state.rainfall} mm` : '—',
        },
        {
          label: 'Humidity',
          value: typeof state.humidity === 'number' && Number.isFinite(state.humidity) ? `${state.humidity}%` : '—',
        },
        {
          label: 'AQI',
          value: typeof state.aqi === 'number' && Number.isFinite(state.aqi) ? `${state.aqi}` : '—',
        },
      ],
    });
  };

  return (
    <div className="relative w-full h-full bg-[#07111D]">
      <MausamMap
        viewMode={viewMode}
        activeMetric={activeMetric}
        selectedState={selectedLocation.state}
        onSelectState={handleSelectState}
        onSelectStation={(station) => {
          onSelectFeature({
            kind: 'radar',
            id: station.id,
            title: station.name,
            subtitle: `${station.state} · ${station.band}`,
            lat: station.latitude,
            lng: station.longitude,
            stateName: station.state,
            source: 'IMD DWR Network',
            metrics: [
              { label: 'Band', value: station.band },
              { label: 'Range', value: `${station.maxRangeKm} km` },
              { label: 'Status', value: station.status },
            ],
          });
        }}
        radarTileUrl={radarTileUrl}
        userCoords={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
        heightClass="h-full"
        showRadarLegend={false}
        showTimeLapseControl={false}
      />

      {reason && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 spatial-hud-surface rounded-lg px-3.5 py-2 flex items-center gap-3 text-xs text-[#F3F6FA]">
          <span className="text-[#F59E0B] font-medium">2D Map Mode active:</span>
          <span className="text-[#B5C3D1]">{reason}</span>
          {onSwitchBackTo3D && (
            <button
              type="button"
              onClick={onSwitchBackTo3D}
              className="text-[#35C7E8] hover:underline font-semibold cursor-pointer min-h-[32px] px-1"
            >
              Retry 3D
            </button>
          )}
        </div>
      )}
    </div>
  );
};
