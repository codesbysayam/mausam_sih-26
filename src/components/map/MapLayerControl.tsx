import React from 'react';
import {
  Thermometer,
  CloudRain,
  Wind,
  Droplets,
  Gauge,
  AlertTriangle,
} from 'lucide-react';

export type WeatherMapMetric =
  | 'temperature'
  | 'rainfall'
  | 'aqi'
  | 'humidity'
  | 'wind'
  | 'warnings';

interface MapLayerControlProps {
  activeMetric: WeatherMapMetric;
  onMetricChange: (metric: WeatherMapMetric) => void;
}

const METRIC_LAYERS: {
  id: WeatherMapMetric;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'temperature', label: 'Temp (°C)', Icon: Thermometer },
  { id: 'rainfall', label: 'Rain (mm)', Icon: CloudRain },
  { id: 'aqi', label: 'AQI', Icon: Gauge },
  { id: 'humidity', label: 'Humidity (%)', Icon: Droplets },
  { id: 'wind', label: 'Wind (km/h)', Icon: Wind },
  { id: 'warnings', label: 'Warnings', Icon: AlertTriangle },
];

export const MapLayerControl: React.FC<MapLayerControlProps> = ({
  activeMetric,
  onMetricChange,
}) => {
  return (
    <div
      id="synoptic-map-layer-controls"
      className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-xl"
      role="toolbar"
      aria-label="Meteorological Map Layer Switcher"
    >
      {METRIC_LAYERS.map((layer) => {
        const isActive = activeMetric === layer.id;
        const Icon = layer.Icon;
        return (
          <button
            key={layer.id}
            id={`btn-map-layer-${layer.id}`}
            type="button"
            onClick={() => onMetricChange(layer.id)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer select-none m-focus-ring ${
              isActive
                ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] border border-[var(--m-accent)]/50'
                : 'text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-1)] hover:text-[var(--m-text-primary)] border border-transparent'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{layer.label}</span>
          </button>
        );
      })}
    </div>
  );
};
