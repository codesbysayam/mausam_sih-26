import React from 'react';
import { NWPForecastPoint } from '../../types/nwp';
import {
  Thermometer,
  CloudRain,
  Wind,
  Gauge,
  Droplets,
  Cloud,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface KeyForecastMetricsProps {
  currentPoint?: NWPForecastPoint;
  nextPoint?: NWPForecastPoint;
  isUnavailable: boolean;
  modelName: string;
}

export const KeyForecastMetrics: React.FC<KeyForecastMetricsProps> = ({
  currentPoint,
  nextPoint,
  isUnavailable,
  modelName,
}) => {
  const getWindDirectionStr = (deg?: number): string => {
    if (deg === undefined) return '';
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(((deg % 360) / 22.5)) % 16;
    return dirs[idx];
  };

  // Temperature trend
  const tempDiff =
    currentPoint?.temperature2m !== undefined && nextPoint?.temperature2m !== undefined
      ? Math.round((nextPoint.temperature2m - currentPoint.temperature2m) * 10) / 10
      : undefined;

  const cards = [
    {
      label: 'Temperature',
      value: isUnavailable || currentPoint?.temperature2m === undefined ? 'DATA UNAVAILABLE' : `${currentPoint.temperature2m} °C`,
      unit: '',
      icon: Thermometer,
      accent: 'text-[#29B6F6]',
      trend:
        tempDiff !== undefined
          ? `${tempDiff > 0 ? `+${tempDiff}°` : `${tempDiff}°`} vs next forecast hour`
          : currentPoint?.apparentTemperature !== undefined
          ? `Surface 2m layer`
          : undefined,
      trendType: tempDiff ? (tempDiff > 0 ? 'up' : 'down') : 'neutral',
    },
    {
      label: 'Feels Like',
      value: isUnavailable || currentPoint?.apparentTemperature === undefined ? 'DATA UNAVAILABLE' : `${currentPoint.apparentTemperature} °C`,
      unit: '',
      icon: Thermometer,
      accent: 'text-amber-400',
      trend:
        currentPoint?.apparentTemperature !== undefined && currentPoint?.temperature2m !== undefined
          ? `${Math.abs(Math.round((currentPoint.apparentTemperature - currentPoint.temperature2m) * 10) / 10)}° difference from actual`
          : undefined,
      trendType: 'neutral',
    },
    {
      label: 'Rainfall',
      value: isUnavailable || currentPoint?.precipitation === undefined ? 'DATA UNAVAILABLE' : `${currentPoint.precipitation} mm`,
      unit: '',
      icon: CloudRain,
      accent: 'text-[#00E676]',
      trend:
        currentPoint?.precipitationProbability !== undefined
          ? `${currentPoint.precipitationProbability}% precipitation probability`
          : currentPoint?.precipitation && currentPoint.precipitation > 0
          ? 'Active precipitation expected'
          : 'Zero measurable liquid precip',
      trendType: 'neutral',
    },
    {
      label: 'Wind',
      value: isUnavailable || currentPoint?.windSpeed10m === undefined ? 'DATA UNAVAILABLE' : `${currentPoint.windSpeed10m} km/h`,
      unit: '',
      icon: Wind,
      accent: 'text-[#29B6F6]',
      trend:
        currentPoint?.windGusts10m !== undefined
          ? `Gusts to ${currentPoint.windGusts10m} km/h • ${getWindDirectionStr(currentPoint.windDirection10m)} (${currentPoint.windDirection10m || 0}°)`
          : getWindDirectionStr(currentPoint?.windDirection10m) || undefined,
      trendType: 'neutral',
    },
    {
      label: 'Pressure',
      value: isUnavailable || currentPoint?.pressureMSL === undefined ? 'DATA UNAVAILABLE' : `${currentPoint.pressureMSL} hPa`,
      unit: '',
      icon: Gauge,
      accent: 'text-purple-400',
      trend:
        currentPoint?.pressureMSL !== undefined
          ? `${currentPoint.pressureMSL > 1013 ? 'High pressure regime' : 'Low pressure synoptic field'}`
          : undefined,
      trendType: 'neutral',
    },
    {
      label: 'Humidity',
      value: isUnavailable || currentPoint?.relativeHumidity === undefined ? 'DATA UNAVAILABLE' : `${currentPoint.relativeHumidity} %`,
      unit: '',
      icon: Droplets,
      accent: 'text-[#29B6F6]',
      trend:
        currentPoint?.dewPoint2m !== undefined
          ? `Dew point: ${currentPoint.dewPoint2m}°C`
          : currentPoint?.cloudCover !== undefined
          ? `${currentPoint.cloudCover}% cloud coverage`
          : undefined,
      trendType: 'neutral',
    },
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
          Current Model Forecast — {modelName}
        </h3>
        <span className="text-[10px] text-[#AFC4D8] font-mono">Initial Forecast Hour</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          const isNoData = c.value === 'DATA UNAVAILABLE';

          return (
            <div
              key={i}
              className="nwp-card flex flex-col justify-between p-3.5 sm:p-4 rounded-xl shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[#AFC4D8] font-semibold">
                  {c.label}
                </span>
                <Icon className={`w-3.5 h-3.5 ${c.accent}`} />
              </div>

              <div className="my-2">
                <span
                  className={`font-mono font-extrabold tracking-tight ${
                    isNoData
                      ? 'text-xs text-slate-400 font-semibold'
                      : 'text-lg sm:text-xl text-white'
                  }`}
                >
                  {c.value}
                </span>
              </div>

              {c.trend && (
                <div className="pt-1.5 border-t border-[#1D5278]/50 flex items-center gap-1 text-[10px] text-[#AFC4D8] truncate font-sans">
                  {c.trendType === 'up' && <TrendingUp className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                  {c.trendType === 'down' && <TrendingDown className="w-2.5 h-2.5 text-[#29B6F6] shrink-0" />}
                  <span className="truncate" title={c.trend}>{c.trend}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
