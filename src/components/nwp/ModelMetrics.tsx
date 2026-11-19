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
      accent: 'text-amber-400',
      border: 'border-amber-500/20',
    },
    {
      label: 'Precipitation',
      value: isUnavailable || currentPoint?.precipitation === undefined ? '—' : `${currentPoint.precipitation} mm`,
      sub: currentPoint?.precipitationProbability !== undefined ? `${currentPoint.precipitationProbability}% Rain Probability` : 'Surface Accumulation',
      icon: CloudRain,
      accent: 'text-sky-400',
      border: 'border-sky-500/20',
    },
    {
      label: '10m Wind Velocity',
      value: isUnavailable || currentPoint?.windSpeed10m === undefined ? '—' : `${currentPoint.windSpeed10m} km/h`,
      sub: currentPoint?.windGusts10m !== undefined
        ? `Gusts to ${currentPoint.windGusts10m} km/h • ${getWindDirectionStr(currentPoint.windDirection10m)}`
        : getWindDirectionStr(currentPoint?.windDirection10m) || 'Vector Field',
      icon: Wind,
      accent: 'text-teal-400',
      border: 'border-teal-500/20',
    },
    {
      label: 'Surface Pressure (MSLP)',
      value: isUnavailable || currentPoint?.pressureMSL === undefined ? '—' : `${currentPoint.pressureMSL} hPa`,
      sub: 'Mean Sea Level Barometric',
      icon: Gauge,
      accent: 'text-purple-400',
      border: 'border-purple-500/20',
    },
    {
      label: 'Relative Humidity',
      value: isUnavailable || currentPoint?.relativeHumidity === undefined ? '—' : `${currentPoint.relativeHumidity}%`,
      sub: currentPoint?.dewPoint2m !== undefined ? `Dew Point: ${currentPoint.dewPoint2m}°C` : 'Atmospheric Moisture',
      icon: Droplets,
      accent: 'text-blue-400',
      border: 'border-blue-500/20',
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
      accent: 'text-yellow-400',
      border: 'border-yellow-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`p-3.5 rounded-xl bg-[var(--m-surface-inset)] border ${c.border} flex flex-col justify-between gap-1 shadow-md`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-medium">
                {c.label}
              </span>
              <Icon className={`w-3.5 h-3.5 ${c.accent}`} />
            </div>

            <div className="my-1">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                {c.value}
              </span>
            </div>

            <span className="text-[10px] text-slate-400 font-mono truncate">
              {c.sub}
            </span>
          </div>
        );
      })}
    </div>
  );
};
