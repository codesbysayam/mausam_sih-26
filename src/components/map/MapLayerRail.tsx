import React from 'react';
import {
  Radar,
  Thermometer,
  Wind,
  CloudRain,
  Droplets,
  Gauge,
  AlertTriangle,
} from 'lucide-react';
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
  Icon: React.ComponentType<{ className?: string }>;
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
    Icon: Radar,
    viewMode: 'radar',
    metric: 'rainfall',
    group: 'radar',
    sourceHint: 'RainViewer Composite + IMD DWR',
  },
  {
    id: 'temperature',
    label: 'Temperature',
    unit: '°C',
    Icon: Thermometer,
    viewMode: 'synoptic',
    metric: 'temperature',
    group: 'atmosphere',
    sourceHint: 'Regional Reference + Point Query',
  },
  {
    id: 'wind',
    label: 'Wind',
    unit: 'km/h',
    Icon: Wind,
    viewMode: 'synoptic',
    metric: 'wind',
    group: 'atmosphere',
    sourceHint: 'Regional Reference + Point Query',
  },
  {
    id: 'rainfall',
    label: 'Rainfall (24h)',
    unit: 'mm',
    Icon: CloudRain,
    viewMode: 'synoptic',
    metric: 'rainfall',
    group: 'atmosphere',
    sourceHint: 'Regional Reference + Point Query',
  },
  {
    id: 'humidity',
    label: 'Humidity',
    unit: '% RH',
    Icon: Droplets,
    viewMode: 'synoptic',
    metric: 'humidity',
    group: 'atmosphere',
    sourceHint: 'Regional Reference + Point Query',
  },
  {
    id: 'aqi',
    label: 'Air Quality',
    unit: 'AQI',
    Icon: Gauge,
    viewMode: 'synoptic',
    metric: 'aqi',
    group: 'environment',
    sourceHint: 'Reference + Open-Meteo Chemistry',
  },
  {
    id: 'warnings',
    label: 'Hazard Tiers',
    unit: 'Tier',
    Icon: AlertTriangle,
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
      className="m-panel p-3.5 flex flex-col gap-3 w-full lg:w-56 shrink-0"
    >
      <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--m-text-secondary)]">
          Map Layers
        </span>
        <span className="text-[10px] font-mono text-[var(--m-accent)] tabular-nums">
          {activeOption.unit}
        </span>
      </div>

      {/* Mobile / Tablet horizontal strip (>=44px touch targets) */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {LAYER_OPTIONS.map((layer) => {
          const isActive = activeOption.id === layer.id;
          const Icon = layer.Icon;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onSelectLayer({ viewMode: layer.viewMode, metric: layer.metric })}
              aria-pressed={isActive}
              className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer border m-focus-ring ${
                isActive
                  ? 'bg-[var(--m-accent-soft)] text-[var(--m-text-primary)] border-[var(--m-accent)]/60 font-semibold'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] border-[var(--m-border)] hover:text-[var(--m-text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4 text-[var(--m-accent)] shrink-0" />
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
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-text-muted)] px-1">
                {GROUP_LABELS[groupId]}
              </span>
              <div className="flex flex-col gap-1">
                {items.map((layer) => {
                  const isActive = activeOption.id === layer.id;
                  const Icon = layer.Icon;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() =>
                        onSelectLayer({ viewMode: layer.viewMode, metric: layer.metric })
                      }
                      aria-pressed={isActive}
                      className={`w-full min-h-[38px] px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer border m-focus-ring ${
                        isActive
                          ? 'bg-[var(--m-surface-1)] text-[var(--m-text-primary)] border-[var(--m-accent)]/55 font-semibold'
                          : 'bg-transparent text-[var(--m-text-secondary)] border-transparent hover:bg-[var(--m-surface-inset)] hover:text-[var(--m-text-primary)]'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[var(--m-accent)]' : 'text-[var(--m-text-muted)]'
                          }`}
                        />
                        <span className="truncate">{layer.label}</span>
                      </span>
                      <span className="text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums shrink-0">
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

      <div className="hidden lg:block mt-auto pt-3 border-t border-[var(--m-border)] text-[11px] text-[var(--m-text-muted)] leading-relaxed">
        <div className="font-medium text-[var(--m-text-secondary)]">{activeOption.sourceHint}</div>
        <p className="mt-1">Click or tap anywhere on the map to inspect point meteorology.</p>
      </div>
    </aside>
  );
};

export default MapLayerRail;
