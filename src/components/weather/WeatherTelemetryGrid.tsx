import React from 'react';
import { CurrentWeather } from '../../types';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';
import {
  Thermometer,
  Flame,
  Droplets,
  Wind,
  Zap,
  Gauge,
  Eye,
  CloudRain,
  Sun,
  Cloud,
  Umbrella,
  Sprout,
  Moon,
} from 'lucide-react';

interface WeatherTelemetryGridProps {
  weather: CurrentWeather;
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const WeatherTelemetryGrid: React.FC<WeatherTelemetryGridProps> = ({ weather }) => {
  const temp = isFiniteNum(weather.temp) ? Math.round(weather.temp) : null;
  const feelsLike = isFiniteNum(weather.feelsLike) ? Math.round(weather.feelsLike) : null;
  const humidity =
    isFiniteNum(weather.humidity) && weather.humidity >= 0 && weather.humidity <= 100
      ? Math.round(weather.humidity)
      : null;
  const windSpeed =
    isFiniteNum(weather.windSpeed) && weather.windSpeed >= 0 ? Math.round(weather.windSpeed) : null;
  const windGusts =
    isFiniteNum(weather.windGusts) && weather.windGusts >= 0 ? Math.round(weather.windGusts) : null;
  const pressure =
    isFiniteNum(weather.pressure) && weather.pressure > 500 ? Number(weather.pressure.toFixed(1)) : null;
  const visibility = isFiniteNum(weather.visibilityKm)
    ? Number(weather.visibilityKm.toFixed(1))
    : isFiniteNum(weather.visibility) && weather.visibility >= 0
    ? Number((weather.visibility > 100 ? weather.visibility / 1000 : weather.visibility).toFixed(1))
    : null;
  const dewPoint = isFiniteNum(weather.dewPoint)
    ? Math.round(weather.dewPoint)
    : temp !== null && humidity !== null
    ? Math.round(temp - (100 - humidity) / 5)
    : null;
  const uvIndex =
    isFiniteNum(weather.uvIndex) && weather.uvIndex >= 0 ? Number(weather.uvIndex.toFixed(1)) : null;
  const cloudCover =
    isFiniteNum(weather.cloudCover) && weather.cloudCover >= 0 && weather.cloudCover <= 100
      ? Math.round(weather.cloudCover)
      : null;
  const precipVal = isFiniteNum(weather.precipitationMm)
    ? weather.precipitationMm
    : isFiniteNum(weather.precipitation)
    ? weather.precipitation
    : null;
  const rainProb =
    isFiniteNum(weather.precipitationProbability) &&
    weather.precipitationProbability >= 0 &&
    weather.precipitationProbability <= 100
      ? Math.round(weather.precipitationProbability)
      : null;

  const rain1h = isFiniteNum(weather.rainfallLast1h)
    ? `${weather.rainfallLast1h.toFixed(1)} mm`
    : precipVal !== null
    ? `${precipVal.toFixed(1)} mm`
    : '—';
  const rain3h = isFiniteNum(weather.rainfallLast3h) ? `${weather.rainfallLast3h.toFixed(1)} mm` : '—';
  const rain24h = isFiniteNum(weather.rainfallLast24h) ? `${weather.rainfallLast24h.toFixed(1)} mm` : '—';

  const pressureTendency = weather.pressureTendency || null;
  const pressureTendencyHpa = isFiniteNum(weather.pressureTendencyHpa)
    ? `${weather.pressureTendencyHpa > 0 ? '+' : ''}${weather.pressureTendencyHpa.toFixed(1)} hPa`
    : null;

  const solarRadiation = isFiniteNum(weather.solarRadiation)
    ? `${Math.round(weather.solarRadiation)} W/m²`
    : null;
  const moonPhase = weather.moonPhase || null;
  const moonIllum = isFiniteNum(weather.moonIllumination) ? `${Math.round(weather.moonIllumination)}%` : null;

  const soilMoisture = isFiniteNum(weather.soilMoisture)
    ? `${(weather.soilMoisture * 100).toFixed(1)}%`
    : null;
  const soilTemp = isFiniteNum(weather.soilTemperature) ? `${weather.soilTemperature.toFixed(1)}°C` : null;
  const et0 = isFiniteNum(weather.evapotranspiration) ? `${weather.evapotranspiration.toFixed(1)} mm/d` : null;

  const windDir = weather.windDirection && weather.windDirection !== '—' ? weather.windDirection : null;

  const metrics = [
    {
      id: 'temp',
      icon: Thermometer,
      iconColor: 'text-[#35C7E8]',
      label: 'Ambient Temp',
      value: temp !== null ? `${temp}` : '—',
      unit: temp !== null ? '°C' : '',
      status:
        temp === null
          ? 'Sensor unavailable'
          : temp > 38
          ? 'High heat'
          : temp < 10
          ? 'Cold'
          : 'Normal range',
      statusColor: temp === null ? 'text-[#8295A8]' : temp > 38 ? 'text-[#FCA5A5]' : 'text-[#6EE7B7]',
      source: 'Surface Thermometer',
    },
    {
      id: 'feels_like',
      icon: Flame,
      iconColor: 'text-[#F59E0B]',
      label: 'Apparent Temp',
      value: feelsLike !== null ? `${feelsLike}` : '—',
      unit: feelsLike !== null ? '°C' : '',
      status:
        feelsLike === null || temp === null
          ? 'Unavailable'
          : Math.abs(feelsLike - temp) > 3
          ? 'Humidity-adjusted'
          : 'Thermal equilibrium',
      statusColor: 'text-[#8295A8]',
      source: 'Steadman Formula',
    },
    {
      id: 'humidity',
      icon: Droplets,
      iconColor: 'text-[#35C7E8]',
      label: 'Relative Humidity',
      value: humidity !== null ? `${humidity}` : '—',
      unit: humidity !== null ? '%' : '',
      status:
        humidity === null
          ? 'Unavailable'
          : humidity > 85
          ? 'High moisture'
          : humidity < 30
          ? 'Arid air mass'
          : 'Moderate',
      statusColor: humidity === null ? 'text-[#8295A8]' : humidity > 85 ? 'text-[#7DD3FC]' : 'text-[#6EE7B7]',
      source: 'Hygrometer Feed',
    },
    {
      id: 'dew_point',
      icon: Droplets,
      iconColor: 'text-[#22C7A0]',
      label: 'Dew Point',
      value: dewPoint !== null ? `${dewPoint}` : '—',
      unit: dewPoint !== null ? '°C' : '',
      status:
        dewPoint === null
          ? 'Unavailable'
          : dewPoint > 22
          ? 'Muggy'
          : 'Comfortable range',
      statusColor: 'text-[#8295A8]',
      source: isFiniteNum(weather.dewPoint) ? 'Reported Dew Pt' : 'Psychrometric Calc',
    },
    {
      id: 'pressure',
      icon: Gauge,
      iconColor: 'text-[#FCD34D]',
      label: 'Surface Pressure',
      value: pressure !== null ? `${pressure}` : '—',
      unit: pressure !== null ? 'hPa' : '',
      status:
        pressure === null
          ? 'Unavailable'
          : pressureTendency
          ? `${pressureTendency}${pressureTendencyHpa ? ` (${pressureTendencyHpa}/3h)` : ''}`
          : 'MSL Barometer',
      statusColor:
        pressure === null
          ? 'text-[#8295A8]'
          : pressureTendency === 'Falling'
          ? 'text-[#FCA5A5]'
          : 'text-[#6EE7B7]',
      source: 'Barometric MSL',
    },
    {
      id: 'wind_speed',
      icon: Wind,
      iconColor: 'text-[#22C7A0]',
      label: 'Wind Vector',
      value: windSpeed !== null ? `${windSpeed}` : '—',
      unit: windSpeed !== null ? 'km/h' : '',
      status:
        windSpeed === null
          ? 'Unavailable'
          : `${windDir || 'Calm'} • ${windSpeed < 15 ? 'Gentle' : windSpeed < 30 ? 'Breezy' : 'Strong'}`,
      statusColor: windSpeed === null ? 'text-[#8295A8]' : 'text-[#6EE7B7]',
      source: '10m Anemometer',
    },
    {
      id: 'wind_gusts',
      icon: Zap,
      iconColor: 'text-[#F59E0B]',
      label: 'Peak Wind Gusts',
      value: windGusts !== null ? `${windGusts}` : '—',
      unit: windGusts !== null ? 'km/h' : '',
      status:
        windGusts === null
          ? 'Gust telemetry N/A'
          : windGusts > 35
          ? 'Elevated gusts'
          : 'Routine variance',
      statusColor: windGusts !== null && windGusts > 35 ? 'text-[#FDBA74]' : 'text-[#8295A8]',
      source: 'Peak Gust Feed',
    },
    {
      id: 'visibility',
      icon: Eye,
      iconColor: 'text-[#A78BFA]',
      label: 'Visibility',
      value: visibility !== null ? `${visibility}` : '—',
      unit: visibility !== null ? 'km' : '',
      status:
        visibility === null
          ? 'Visibility unavailable'
          : visibility >= 10
          ? 'Unrestricted'
          : visibility < 2
          ? 'Fog / Haze alert'
          : 'Moderate',
      statusColor:
        visibility === null
          ? 'text-[#8295A8]'
          : visibility >= 10
          ? 'text-[#6EE7B7]'
          : 'text-[#FDBA74]',
      source: 'Optical Range',
    },
    {
      id: 'cloud_cover',
      icon: Cloud,
      iconColor: 'text-[#B5C3D1]',
      label: 'Cloud Cover',
      value: cloudCover !== null ? `${cloudCover}` : '—',
      unit: cloudCover !== null ? '%' : '',
      status:
        cloudCover === null
          ? 'Unavailable'
          : cloudCover > 80
          ? 'Overcast'
          : cloudCover > 40
          ? 'Scattered'
          : 'Mostly clear',
      statusColor: 'text-[#8295A8]',
      source: 'Satellite / NWP Fraction',
    },
    {
      id: 'rain_accum',
      icon: CloudRain,
      iconColor: 'text-[#35C7E8]',
      label: 'Rainfall 1h / 3h',
      value: rain1h,
      unit: rain3h !== '—' ? `(3h: ${rain3h})` : '',
      status: rain24h !== '—' ? `24h Total: ${rain24h}` : '24h total unavailable',
      statusColor: rain1h !== '—' ? 'text-[#7DD3FC]' : 'text-[#8295A8]',
      source: 'Precipitation Gauge',
    },
    {
      id: 'rain_probability',
      icon: Umbrella,
      iconColor: 'text-[#35C7E8]',
      label: 'Rain Probability',
      value: rainProb !== null ? `${rainProb}` : '—',
      unit: rainProb !== null ? '%' : '',
      status:
        rainProb === null
          ? 'Unavailable'
          : rainProb > 70
          ? 'High probability'
          : rainProb > 40
          ? 'Moderate chance'
          : 'Low probability',
      statusColor: rainProb !== null && rainProb > 70 ? 'text-[#7DD3FC]' : 'text-[#8295A8]',
      source: 'NWP PoP Output',
    },
    {
      id: 'uv_solar',
      icon: Sun,
      iconColor: 'text-[#F59E0B]',
      label: 'UV & Irradiance',
      value: uvIndex !== null ? `${uvIndex}` : '—',
      unit: uvIndex !== null ? (solarRadiation ? `/ 11+ (${solarRadiation})` : '/ 11+ Index') : solarRadiation || '',
      status:
        uvIndex === null
          ? 'UV unavailable'
          : uvIndex >= 8
          ? 'Very high UV'
          : uvIndex >= 6
          ? 'High exposure'
          : 'Low to moderate',
      statusColor:
        uvIndex === null
          ? 'text-[#8295A8]'
          : uvIndex >= 8
          ? 'text-[#FCA5A5]'
          : 'text-[#FCD34D]',
      source: 'Radiometer / UV Index',
    },
    {
      id: 'lunar_ephemeris',
      icon: Moon,
      iconColor: 'text-[#C084FC]',
      label: 'Lunar Phase',
      value: moonPhase || '—',
      unit: moonIllum ? `(${moonIllum})` : '',
      status:
        weather.moonrise || weather.moonset
          ? `Rise: ${weather.moonrise || '—'} • Set: ${weather.moonset || '—'}`
          : 'Lunar rise/set unavailable',
      statusColor: moonPhase ? 'text-[#C084FC]' : 'text-[#8295A8]',
      source: 'Lunar Ephemeris',
    },
    {
      id: 'agro_soil',
      icon: Sprout,
      iconColor: 'text-[#22C7A0]',
      label: 'Soil & ET0',
      value: soilMoisture || '—',
      unit: soilTemp ? `(${soilTemp})` : '',
      status: et0 ? `ET0: ${et0} (FAO-56)` : 'Agromet telemetry N/A',
      statusColor: soilMoisture ? 'text-[#6EE7B7]' : 'text-[#8295A8]',
      source: 'Root-Zone Sensor / Model',
    },
  ];

  const availableCount = metrics.filter((m) => m.value !== '—').length;

  return (
    <DataPanel id="weather-meteorological-telemetry-grid" className="flex flex-col gap-4">
      <SectionHeading
        title="Surface Meteorological Telemetry Matrix"
        subtitle={`${availableCount} of ${metrics.length} station & model parameters reporting`}
        action={
          <SourceStatus
            status={weather.observationStatus || (availableCount > 0 ? 'LIVE' : 'UNAVAILABLE')}
            source={weather.dataSource || weather.source}
          />
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          const isMissing = m.value === '—';
          return (
            <div
              key={m.id}
              id={`telemetry-card-${m.id}`}
              className="m-panel-inset p-3.5 flex flex-col justify-between gap-2 transition-colors hover:border-[#38536A]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-[#8295A8] uppercase tracking-wider truncate">
                  {m.label}
                </span>
                <div className="p-1.5 rounded-md bg-[#0B1927] border border-[#26394B] shrink-0">
                  <Icon className={`w-3.5 h-3.5 ${isMissing ? 'text-[#8295A8]' : m.iconColor}`} />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1 font-mono tabular-nums flex-wrap">
                  <span className={`text-xl font-bold tracking-tight ${isMissing ? 'text-[#8295A8]' : 'text-[#F3F6FA]'}`}>
                    {m.value}
                  </span>
                  {m.unit && <span className="text-[11px] text-[#8295A8]">{m.unit}</span>}
                </div>
                <div className={`text-[11px] font-medium mt-0.5 truncate ${m.statusColor}`}>
                  {m.status}
                </div>
              </div>

              <div className="pt-2 border-t border-[#26394B]/70 text-[10px] text-[#8295A8] truncate">
                {m.source}
              </div>
            </div>
          );
        })}
      </div>
    </DataPanel>
  );
};
