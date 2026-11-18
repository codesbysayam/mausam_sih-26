import React from 'react';
import { Thermometer, CloudRain, Wind, Gauge, Droplets, TrendingUp, TrendingDown } from 'lucide-react';
import { NWPForecastPoint } from '../../types/nwp';
import { DataPanel, SectionHeading, MetricValue, UnavailableState } from '../ui/ObservatoryPrimitives';

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
    if (typeof deg !== 'number' || !Number.isFinite(deg)) return '';
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(((deg % 360) / 22.5)) % 16;
    return dirs[idx];
  };

  if (isUnavailable || !currentPoint) {
    return (
      <DataPanel className="flex flex-col gap-3">
        <SectionHeading
          title={`Initial Forecast Snapshot — ${modelName}`}
          subtitle="Lead hour 0 numerical model grid output"
          icon={<Thermometer className="w-4 h-4" />}
        />
        <UnavailableState
          title={`${modelName} Initial Grid Output Unavailable`}
          reason={
            modelName === 'WRF'
              ? 'IMD WRF gateway is not configured for live operational ingestion.'
              : `No verified ${modelName} cycle telemetry is currently available for this coordinate.`
          }
        />
      </DataPanel>
    );
  }

  const tempDiff =
    typeof currentPoint.temperature2m === 'number' && typeof nextPoint?.temperature2m === 'number'
      ? Math.round((nextPoint.temperature2m - currentPoint.temperature2m) * 10) / 10
      : null;

  const windDirStr = getWindDirectionStr(currentPoint.windDirection10m);

  const cards = [
    {
      label: 'Temperature (2m)',
      value: currentPoint.temperature2m,
      unit: '°C',
      precision: 1,
      icon: Thermometer,
      accent: 'text-[#35C7E8]',
      hint:
        tempDiff !== null
          ? `${tempDiff > 0 ? `+${tempDiff}°` : `${tempDiff}°`} next hour`
          : 'Surface 2m grid',
      trendType: tempDiff !== null ? (tempDiff > 0 ? 'up' : tempDiff < 0 ? 'down' : 'neutral') : 'neutral',
    },
    {
      label: 'Apparent Temp',
      value: currentPoint.apparentTemperature,
      unit: '°C',
      precision: 1,
      icon: Thermometer,
      accent: 'text-[#F59E0B]',
      hint:
        typeof currentPoint.apparentTemperature === 'number' && typeof currentPoint.temperature2m === 'number'
          ? `${Math.abs(Math.round((currentPoint.apparentTemperature - currentPoint.temperature2m) * 10) / 10)}° vs ambient`
          : undefined,
      trendType: 'neutral',
    },
    {
      label: 'Precipitation',
      value: currentPoint.precipitation,
      unit: 'mm',
      precision: 1,
      icon: CloudRain,
      accent: 'text-[#22C7A0]',
      hint:
        typeof currentPoint.precipitationProbability === 'number'
          ? `${currentPoint.precipitationProbability}% probability`
          : typeof currentPoint.precipitation === 'number' && currentPoint.precipitation > 0
          ? 'Active QPF expected'
          : 'Dry surface step',
      trendType: 'neutral',
    },
    {
      label: 'Wind (10m)',
      value: currentPoint.windSpeed10m,
      unit: 'km/h',
      precision: 0,
      icon: Wind,
      accent: 'text-[#35C7E8]',
      hint:
        typeof currentPoint.windGusts10m === 'number'
          ? `Gust ${currentPoint.windGusts10m} km/h${windDirStr ? ` · ${windDirStr}` : ''}`
          : windDirStr
          ? `${windDirStr} (${currentPoint.windDirection10m}°)`
          : 'Surface 10m flow',
      trendType: 'neutral',
    },
    {
      label: 'Pressure (MSL)',
      value: currentPoint.pressureMSL,
      unit: 'hPa',
      precision: 1,
      icon: Gauge,
      accent: 'text-[#B5C3D1]',
      hint:
        typeof currentPoint.pressureMSL === 'number'
          ? currentPoint.pressureMSL > 1013
            ? 'High pressure ridge'
            : 'Low pressure trough'
          : undefined,
      trendType: 'neutral',
    },
    {
      label: 'Humidity (RH)',
      value: currentPoint.relativeHumidity,
      unit: '%',
      precision: 0,
      icon: Droplets,
      accent: 'text-[#35C7E8]',
      hint:
        typeof currentPoint.dewPoint2m === 'number'
          ? `Dew point ${currentPoint.dewPoint2m}°C`
          : typeof currentPoint.cloudCover === 'number'
          ? `${currentPoint.cloudCover}% cloud cover`
          : undefined,
      trendType: 'neutral',
    },
  ];

  return (
    <DataPanel className="flex flex-col gap-3">
      <SectionHeading
        title={`Current Model Forecast — ${modelName}`}
        subtitle="Initial forecast hour surface parameters"
        icon={<Thermometer className="w-4 h-4" />}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <Icon className={`w-3.5 h-3.5 ${c.accent}`} />
                {c.trendType === 'up' && <TrendingUp className="w-3 h-3 text-[#F59E0B]" />}
                {c.trendType === 'down' && <TrendingDown className="w-3 h-3 text-[#35C7E8]" />}
              </div>
              <MetricValue
                label={c.label}
                value={c.value}
                unit={c.unit}
                precision={c.precision}
                hint={c.hint}
              />
            </div>
          );
        })}
      </div>
    </DataPanel>
  );
};
