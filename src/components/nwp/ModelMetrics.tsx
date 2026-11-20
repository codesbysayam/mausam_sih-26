import React from 'react';
import { NWPForecastPoint } from '../../types/nwp';
import {
  Thermometer,
  CloudRain,
  Wind,
  Gauge,
  Droplets,
  Zap,
  Cloud,
} from 'lucide-react';

interface ModelMetricsProps {
  currentPoint?: NWPForecastPoint;
  isUnavailable: boolean;
}

export const ModelMetrics: React.FC<ModelMetricsProps> = ({
  currentPoint,
  isUnavailable,
}) => {
  const getWindDirectionStr = (deg?: number): string => {
    if (deg === undefined) return '';
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(((deg % 360) / 22.5)) % 16;
    return dirs[idx];
  };

  const cards = [
    {
      label: '2m Temperature',
      value: isUnavailable || currentPoint?.temperature2m === undefined ? '—' : `${currentPoint.temperature2m}°C`,
      sub: currentPoint?.apparentTemperature !== undefined ? `Feels like ${currentPoint.apparentTemperature}°C` : 'Model Surface Point',
      icon: Thermometer,
      accent: 'text-[var(--weather-hot)]',
    },
    {
      label: 'Precipitation',
      value: isUnavailable || currentPoint?.precipitation === undefined ? '—' : `${currentPoint.precipitation} mm`,
      sub: currentPoint?.precipitationProbability !== undefined ? `${currentPoint.precipitationProbability}% Rain Probability` : 'Surface Accumulation',
      icon: CloudRain,
      accent: 'text-[var(--weather-rain)]',
    },
    {
      label: '10m Wind Velocity',
      value: isUnavailable || currentPoint?.windSpeed10m === undefined ? '—' : `${currentPoint.windSpeed10m} km/h`,
      sub: currentPoint?.windGusts10m !== undefined
        ? `Gusts to ${currentPoint.windGusts10m} km/h • ${getWindDirectionStr(currentPoint.windDirection10m)}`
        : getWindDirectionStr(currentPoint?.windDirection10m) || 'Vector Field',
      icon: Wind,
      accent: 'text-[var(--weather-wind)]',
    },
    {
      label: 'Surface Pressure (MSLP)',
      value: isUnavailable || currentPoint?.pressureMSL === undefined ? '—' : `${currentPoint.pressureMSL} hPa`,
      sub: 'Mean Sea Level Barometric',
      icon: Gauge,
      accent: 'text-[var(--m-accent)]',
    },
    {
      label: 'Relative Humidity',
      value: isUnavailable || currentPoint?.relativeHumidity === undefined ? '—' : `${currentPoint.relativeHumidity}%`,
      sub: currentPoint?.dewPoint2m !== undefined ? `Dew Point: ${currentPoint.dewPoint2m}°C` : 'Atmospheric Moisture',
      icon: Droplets,
      accent: 'text-[var(--weather-rain)]',
    },
    {
      label: 'Atmospheric CAPE',
      value: isUnavailable || currentPoint?.cape === undefined ? '—' : `${currentPoint.cape} J/kg`,
      sub: currentPoint?.cape && currentPoint.cape > 1000
        ? 'High Convective Energy'
        : currentPoint?.cloudCover !== undefined
        ? `${currentPoint.cloudCover}% Cloud Cover`
        : 'Thermodynamic Potential',
      icon: Zap,
      accent: 'text-[var(--weather-sun)]',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="p-3.5 rounded-[7px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col justify-between gap-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-[var(--m-text-muted)] font-medium">
                {c.label}
              </span>
              <Icon className={`w-3.5 h-3.5 ${c.accent}`} />
            </div>

            <div className="my-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-[var(--m-text-primary)] tracking-tight tabular-nums">
                {c.value}
              </span>
            </div>

            <span className="text-[10px] text-[var(--m-text-muted)] font-mono truncate">
              {c.sub}
            </span>
          </div>
        );
      })}
    </div>
  );
};
