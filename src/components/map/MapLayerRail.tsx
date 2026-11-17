import React from 'react';
import { WeatherMapMetric } from './MapLayerControl';

export type LayerGroupId = 'radar' | 'atmosphere' | 'environment';

export interface MapLayerSelection {
  viewMode: 'radar' | 'synoptic';
  metric: WeatherMapMetric;
}

interface LayerOption {
  id: string;
  label: string;
  unit: string;
  icon: string;
  viewMode: 'radar' | 'synoptic';
  metric: WeatherMapMetric;
  group: LayerGroupId;
  sourceHint: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    id: 'radar',
    label: 'Radar Composite',
    unit: 'dBZ',
    icon: 'radar',
    viewMode: 'radar',
    metric: 'rainfall',
    group: 'radar',
    sourceHint: 'RainViewer Composite + IMD DWR',
  },
  {
    id: 'temperature',
    label: 'Temperature',
    unit: '°C',
    icon: 'thermostat',
    viewMode: 'synoptic',
    metric: 'temperature',
    group: 'atmosphere',
    sourceHint: 'Regional Reference + Point Query',
  },
  {
    id: 'wind',
    label: 'Wind',
    unit: 'km/h',
    icon: 'air',
    viewMode: 'synoptic',
    metric: 'wind',
    group: 'atmosphere',
    sourceHint: 'Regional Reference + Point Query',
  },
  {
    id: 'rainfall',
    label: 'Rainfall (24h)',
    unit: 'mm',
    icon: 'rainy',
    viewMode: 'synoptic',
    metric: 'rainfall',
    group: 'atmosphere',
    sourceHint: 'Regional Reference + Point Query',
  },
  {
    id: 'humidity',
    label: 'Humidity',
    unit: '% RH',
    icon: 'humidity_percentage',
    viewMode: 'synoptic',
    metric: 'humidity',
    group: 'atmosphere',
    sourceHint: 'Regional Reference + Point Query',
  },
  {
    id: 'aqi',
    label: 'Air Quality',
    unit: 'AQI',
    icon: 'masks',
    viewMode: 'synoptic',
    metric: 'aqi',
    group: 'environment',
    sourceHint: 'Reference + Open-Meteo Chemistry',
  },
  {
    id: 'warnings',
    label: 'Hazard Tiers',
    unit: 'Tier',
    icon: 'warning',
    viewMode: 'synoptic',
    metric: 'warnings',
    group: 'environment',
    sourceHint: 'Regional Hazard Tiers',
  },
];

const GROUP_LABELS: Record<LayerGroupId, string> = {
  radar: 'Precipitation & Radar',
  atmosphere: 'Atmosphere',
  environment: 'Environment & Hazards',
};

interface MapLayerRailProps {
  viewMode: 'synoptic' | 'radar';
  activeMetric: WeatherMapMetric;
  onSelectLayer: (selection: MapLayerSelection) => void;
}

export const MapLayerRail: React.FC<MapLayerRailProps> = ({
  viewMode,
  activeMetric,
  onSelectLayer,
}) => {
  const activeOption =
    LAYER_OPTIONS.find((opt) =>
      viewMode === 'radar'
        ? opt.viewMode === 'radar'
        : opt.viewMode === 'synoptic' && opt.metric === activeMetric
    ) || LAYER_OPTIONS[0];

  const groups: LayerGroupId[] = ['radar', 'atmosphere', 'environment'];

  return (
    <aside
      aria-label="Weather Map Layers"
      className="bg-[#101B26] border border-white/12 rounded-xl p-3 flex flex-col gap-3 w-full lg:w-56 shrink-0"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B6C7D8]">
          Map Layers
        </span>
        <span className="text-[10px] font-mono text-[#38BDF8] tabular-nums">
          {activeOption.unit}
        </span>
      </div>

      {/* Mobile / Tablet horizontal strip */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {LAYER_OPTIONS.map((layer) => {
          const isActive = activeOption.id === layer.id;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onSelectLayer({ viewMode: layer.viewMode, metric: layer.metric })}
              aria-pressed={isActive}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                isActive
                  ? 'bg-[#1499E8]/20 text-[#F4F7FA] border-[#38BDF8]/60 font-semibold'
                  : 'bg-[#162331] text-[#B6C7D8] border-white/8 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-[#38BDF8]">
                {layer.icon}
              </span>
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop vertical grouped rail */}
      <div className="hidden lg:flex flex-col gap-3.5">
        {groups.map((groupId) => {
          const items = LAYER_OPTIONS.filter((o) => o.group === groupId);
          return (
            <div key={groupId} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8EA3B8] px-1">
                {GROUP_LABELS[groupId]}
              </span>
              <div className="flex flex-col gap-1">
                {items.map((layer) => {
                  const isActive = activeOption.id === layer.id;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() =>
                        onSelectLayer({ viewMode: layer.viewMode, metric: layer.metric })
                      }
                      aria-pressed={isActive}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer border ${
                        isActive
                          ? 'bg-[#162331] text-[#F4F7FA] border-[#38BDF8]/50 font-semibold'
                          : 'bg-transparent text-[#B6C7D8] border-transparent hover:bg-[#162331]/70 hover:text-[#F4F7FA]'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`material-symbols-outlined text-[16px] shrink-0 ${
                            isActive ? 'text-[#38BDF8]' : 'text-[#8EA3B8]'
                          }`}
                        >
                          {layer.icon}
                        </span>
                        <span className="truncate">{layer.label}</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#8EA3B8] tabular-nums shrink-0">
                        {layer.unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden lg:block mt-auto pt-2.5 border-t border-white/10 text-[11px] text-[#8EA3B8] leading-relaxed">
        <div className="font-medium text-[#B6C7D8]">{activeOption.sourceHint}</div>
        <p className="mt-1">Click or tap anywhere on the map to inspect local forecast &amp; AQI.</p>
      </div>
    </aside>
  );
};

export default MapLayerRail;
