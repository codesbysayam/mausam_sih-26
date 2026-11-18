import React, { useState } from 'react';
import { CurrentWeather as CurrentWeatherType } from '../../types';
import { StatusBadge, StatusVariant } from '../common/StatusBadge';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';
import {
  Sun,
  Droplets,
  Eye,
  Gauge,
  Wind,
  Cloud,
  Sunrise,
  SlidersHorizontal,
} from 'lucide-react';

export type UnitSystem = 'metric' | 'imperial';

interface WeatherWidgetsProps {
  weather: CurrentWeatherType;
  defaultUnitSystem?: UnitSystem;
  unitSystem?: UnitSystem;
  onUnitSystemChange?: (unit: UnitSystem) => void;
  className?: string;
  id?: string;
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const WeatherWidgets: React.FC<WeatherWidgetsProps> = ({
  weather,
  defaultUnitSystem = 'metric',
  unitSystem: controlledUnitSystem,
  onUnitSystemChange,
  className = '',
  id = 'weather-widgets-section',
}) => {
  const [internalUnitSystem, setInternalUnitSystem] = useState<UnitSystem>(defaultUnitSystem);
  const activeUnitSystem = controlledUnitSystem !== undefined ? controlledUnitSystem : internalUnitSystem;

  const handleUnitToggle = (newUnit: UnitSystem) => {
    if (controlledUnitSystem === undefined) {
      setInternalUnitSystem(newUnit);
    }
    onUnitSystemChange?.(newUnit);
  };

  const isMetric = activeUnitSystem === 'metric';

  const cToF = (c: number): number => Math.round((c * 9) / 5 + 32);
  const kmToMiles = (km: number): number => +(km * 0.621371).toFixed(1);
  const kmhToMph = (kmh: number): number => Math.round(kmh * 0.621371);
  const hpaToInHg = (hpa: number): number => +(hpa * 0.02953).toFixed(2);

  const rawUv = isFiniteNum(weather.uvIndex) ? weather.uvIndex : null;
  const rawHumidity = isFiniteNum(weather.humidity) ? Math.round(weather.humidity) : null;
  const rawDewPointC = isFiniteNum(weather.dewPoint) ? weather.dewPoint : null;
  const rawVisibilityKm = isFiniteNum(weather.visibilityKm)
    ? weather.visibilityKm
    : isFiniteNum(weather.visibility)
    ? weather.visibility > 100
      ? weather.visibility / 1000
      : weather.visibility
    : null;
  const rawPressureHpa = isFiniteNum(weather.pressure) ? weather.pressure : null;
  const rawWindSpeedKmh = isFiniteNum(weather.windSpeed) ? Math.round(weather.windSpeed) : null;
  const rawWindGustsKmh = isFiniteNum(weather.windGusts) ? Math.round(weather.windGusts) : null;
  const rawCloudCover = isFiniteNum(weather.cloudCover) ? Math.round(weather.cloudCover) : null;

  const dewPointDisplay =
    rawDewPointC !== null
      ? isMetric
        ? `${Math.round(rawDewPointC)}°C`
        : `${cToF(rawDewPointC)}°F`
      : '—';
  const visibilityVal =
    rawVisibilityKm !== null ? (isMetric ? rawVisibilityKm.toFixed(1) : `${kmToMiles(rawVisibilityKm)}`) : '—';
  const visibilityUnit = rawVisibilityKm !== null ? (isMetric ? 'km' : 'mi') : '';
  const pressureVal =
    rawPressureHpa !== null ? (isMetric ? `${Math.round(rawPressureHpa)}` : `${hpaToInHg(rawPressureHpa)}`) : '—';
  const pressureUnit = rawPressureHpa !== null ? (isMetric ? 'hPa' : 'inHg') : '';
  const windSpeedDisplay =
    rawWindSpeedKmh !== null ? (isMetric ? `${rawWindSpeedKmh} km/h` : `${kmhToMph(rawWindSpeedKmh)} mph`) : '—';
  const windGustsDisplay =
    rawWindGustsKmh !== null ? (isMetric ? `${rawWindGustsKmh} km/h` : `${kmhToMph(rawWindGustsKmh)} mph`) : '—';

  const uvInfo: {
    label: string;
    variant: StatusVariant;
    advice: string;
    levelPercentage: number;
    colorHex: string;
  } =
    rawUv === null
      ? {
          label: 'Unavailable',
          variant: 'neutral',
          advice: 'Solar UV index reading is currently unavailable.',
          levelPercentage: 0,
          colorHex: '#8295A8',
        }
      : rawUv <= 2
      ? {
          label: 'Low Risk',
          variant: 'good',
          advice: 'No protection needed. Safe for outdoor activities.',
          levelPercentage: Math.min((rawUv / 12) * 100, 100),
          colorHex: '#22C7A0',
        }
      : rawUv <= 5
      ? {
          label: 'Moderate',
          variant: 'warning',
          advice: 'Protection advised. Seek shade during solar noon.',
          levelPercentage: Math.min((rawUv / 12) * 100, 100),
          colorHex: '#F59E0B',
        }
      : rawUv <= 7
      ? {
          label: 'High',
          variant: 'alert',
          advice: 'SPF 30+ sunscreen, sunglasses, and hat recommended.',
          levelPercentage: Math.min((rawUv / 12) * 100, 100),
          colorHex: '#F97316',
        }
      : {
          label: rawUv <= 10 ? 'Very High' : 'Extreme',
          variant: 'danger',
          advice: 'Minimize direct sun exposure between 11 AM and 3 PM.',
          levelPercentage: Math.min((rawUv / 12) * 100, 100),
          colorHex: '#EF4444',
        };

  const humidityInfo: { label: string; variant: StatusVariant; comfortDesc: string } =
    rawHumidity === null
      ? { label: 'Unavailable', variant: 'neutral', comfortDesc: 'Relative humidity sensor reading unavailable.' }
      : rawHumidity < 30
      ? { label: 'Dry Air', variant: 'neutral', comfortDesc: 'Air is dry. Increased hydration advised.' }
      : rawHumidity <= 60
      ? { label: 'Comfortable', variant: 'good', comfortDesc: 'Balanced boundary-layer moisture.' }
      : rawHumidity <= 75
      ? { label: 'Humid', variant: 'warning', comfortDesc: 'Elevated ambient moisture.' }
      : { label: 'Muggy', variant: 'alert', comfortDesc: 'High vapor saturation; slower evaporative cooling.' };

  const visInfo: { label: string; variant: StatusVariant; opticalDesc: string } =
    rawVisibilityKm === null
      ? { label: 'Unavailable', variant: 'neutral', opticalDesc: 'Optical visibility measurement unavailable.' }
      : rawVisibilityKm >= 10
      ? { label: 'Excellent', variant: 'good', opticalDesc: 'Clear horizon with unrestricted optical range.' }
      : rawVisibilityKm >= 5
      ? { label: 'Good', variant: 'good', opticalDesc: 'Standard surface transit visibility.' }
      : rawVisibilityKm >= 2
      ? { label: 'Moderate Haze', variant: 'warning', opticalDesc: 'Light aerosol haze or thin mist detected.' }
      : { label: 'Dense Fog', variant: 'danger', opticalDesc: 'Restricted visibility. Exercise caution in transit.' };

  const pressureInfo: { label: string; variant: StatusVariant; trendDesc: string } =
    rawPressureHpa === null
      ? { label: 'Unavailable', variant: 'neutral', trendDesc: 'Barometric reading unavailable.' }
      : rawPressureHpa >= 1020
      ? { label: 'High Pressure', variant: 'good', trendDesc: 'Anticyclonic stability and settled conditions.' }
      : rawPressureHpa >= 1010
      ? { label: 'Steady Standard', variant: 'neutral', trendDesc: 'Near standard sea-level pressure (~1013.2 hPa).' }
      : rawPressureHpa >= 1000
      ? { label: 'Moderate Low', variant: 'warning', trendDesc: 'Sub-standard pressure; watch for cloud development.' }
      : { label: 'Deep Low', variant: 'danger', trendDesc: 'Significant low-pressure system in sector.' };

  return (
    <DataPanel id={id} className={`flex flex-col gap-4 ${className}`}>
      <SectionHeading
        title="Atmospheric Instrument Modules"
        subtitle="Switch between Metric (°C / hPa) and Imperial (°F / inHg) readout scales"
        icon={<SlidersHorizontal className="w-4 h-4" />}
        badge={
          <SourceStatus
            status={weather.observationStatus || (weather.isLive ? 'LIVE' : 'RECENT')}
            source={weather.dataSource || weather.source}
          />
        }
        action={
          <div
            id="unit-system-toggle-group"
            className="inline-flex p-0.5 bg-[#08131F] border border-[#26394B] rounded-lg"
            role="group"
            aria-label="Unit system selection"
          >
            <button
              type="button"
              id="unit-toggle-metric"
              onClick={() => handleUnitToggle('metric')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                isMetric ? 'bg-[#0B72B9] text-[#F3F6FA]' : 'text-[#8295A8] hover:text-[#F3F6FA]'
              }`}
              aria-pressed={isMetric}
            >
              Metric (°C / hPa)
            </button>
            <button
              type="button"
              id="unit-toggle-imperial"
              onClick={() => handleUnitToggle('imperial')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                !isMetric ? 'bg-[#0B72B9] text-[#F3F6FA]' : 'text-[#8295A8] hover:text-[#F3F6FA]'
              }`}
              aria-pressed={!isMetric}
            >
              Imperial (°F / inHg)
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* UV Index */}
        <div id="widget-uv-index" className="m-panel-inset p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-xs font-bold text-[#F3F6FA] uppercase tracking-wider">UV Index</span>
              </div>
              <StatusBadge label={uvInfo.label} variant={uvInfo.variant} />
            </div>

            <div className="mt-2.5 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-3xl font-bold text-[#F3F6FA] tracking-tight">
                {rawUv !== null ? rawUv.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#8295A8]">{rawUv !== null ? '/ 11+ Max' : 'Unavailable'}</span>
            </div>

            <div className="mt-2.5">
              <div className="h-1.5 w-full bg-[#0B1927] border border-[#26394B] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${rawUv !== null ? Math.max(uvInfo.levelPercentage, 6) : 0}%`,
                    backgroundColor: uvInfo.colorHex,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#8295A8] mt-1">
                <span>0 Low</span>
                <span>6 High</span>
                <span>11+ Ext</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[#8295A8] mt-3 border-t border-[#26394B] pt-2 leading-relaxed">
            {uvInfo.advice}
          </p>
        </div>

        {/* Humidity Details */}
        <div id="widget-humidity-details" className="m-panel-inset p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-[#35C7E8]" />
                <span className="text-xs font-bold text-[#F3F6FA] uppercase tracking-wider">Humidity</span>
              </div>
              <StatusBadge label={humidityInfo.label} variant={humidityInfo.variant} />
            </div>

            <div className="mt-2.5 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-3xl font-bold text-[#F3F6FA] tracking-tight">
                {rawHumidity !== null ? `${rawHumidity}%` : '—'}
              </span>
              <span className="text-xs text-[#8295A8]">{rawHumidity !== null ? 'Relative' : 'Unavailable'}</span>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs bg-[#0B1927] px-2.5 py-1.5 rounded-md border border-[#26394B]">
              <span className="text-[#8295A8]">Dew Point</span>
              <strong className="text-[#F3F6FA] font-mono tabular-nums">{dewPointDisplay}</strong>
            </div>
          </div>

          <p className="text-[11px] text-[#8295A8] mt-3 border-t border-[#26394B] pt-2 leading-relaxed">
            {humidityInfo.comfortDesc}
          </p>
        </div>

        {/* Visibility */}
        <div id="widget-visibility" className="m-panel-inset p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#22C7A0]" />
                <span className="text-xs font-bold text-[#F3F6FA] uppercase tracking-wider">Visibility</span>
              </div>
              <StatusBadge label={visInfo.label} variant={visInfo.variant} />
            </div>

            <div className="mt-2.5 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-3xl font-bold text-[#F3F6FA] tracking-tight">{visibilityVal}</span>
              <span className="text-xs text-[#8295A8]">{visibilityUnit || 'Unavailable'}</span>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs bg-[#0B1927] px-2.5 py-1.5 rounded-md border border-[#26394B]">
              <span className="text-[#8295A8]">Horizon State</span>
              <span className="text-[#35C7E8] font-semibold text-[11px]">
                {rawVisibilityKm === null
                  ? '—'
                  : rawVisibilityKm >= 10
                  ? 'Unrestricted'
                  : rawVisibilityKm >= 4
                  ? 'Clear'
                  : 'Reduced'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#8295A8] mt-3 border-t border-[#26394B] pt-2 leading-relaxed">
            {visInfo.opticalDesc}
          </p>
        </div>

        {/* Barometric Pressure */}
        <div id="widget-pressure" className="m-panel-inset p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-[#A78BFA]" />
                <span className="text-xs font-bold text-[#F3F6FA] uppercase tracking-wider">Pressure</span>
              </div>
              <StatusBadge label={pressureInfo.label} variant={pressureInfo.variant} />
            </div>

            <div className="mt-2.5 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-3xl font-bold text-[#F3F6FA] tracking-tight">{pressureVal}</span>
              <span className="text-xs text-[#8295A8]">{pressureUnit || 'Unavailable'}</span>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs bg-[#0B1927] px-2.5 py-1.5 rounded-md border border-[#26394B]">
              <span className="text-[#8295A8]">ISA Sea Level</span>
              <strong className="text-[#F3F6FA] font-mono tabular-nums">
                {isMetric ? '1013.2 hPa' : '29.92 inHg'}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-[#8295A8] mt-3 border-t border-[#26394B] pt-2 leading-relaxed">
            {pressureInfo.trendDesc}
          </p>
        </div>
      </div>

      {/* Secondary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div id="widget-wind-telemetry" className="m-panel-inset p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-center justify-center text-[#35C7E8] shrink-0">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#8295A8] uppercase font-semibold block">
                Wind Velocity
              </span>
              <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                <span className="text-sm font-bold text-[#F3F6FA]">{windSpeedDisplay}</span>
                {weather.windDirection && weather.windDirection !== '—' && (
                  <span className="text-[11px] text-[#35C7E8] font-semibold">{weather.windDirection}</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-[11px] text-[#8295A8]">
            <span>Gusts: </span>
            <strong className="text-[#F3F6FA] font-mono tabular-nums">{windGustsDisplay}</strong>
          </div>
        </div>

        <div id="widget-cloud-cover" className="m-panel-inset p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-center justify-center text-[#22C7A0] shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#8295A8] uppercase font-semibold block">
                Cloud Fraction
              </span>
              <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                <span className="text-sm font-bold text-[#F3F6FA]">
                  {rawCloudCover !== null ? `${rawCloudCover}%` : '—'}
                </span>
                {rawCloudCover !== null && (
                  <span className="text-[11px] text-[#8295A8] font-sans">
                    {rawCloudCover < 20 ? 'Clear Sky' : rawCloudCover < 60 ? 'Scattered' : 'Overcast'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-[11px] text-[#8295A8]">
            <span>Precip: </span>
            <strong className="text-[#F3F6FA] font-mono tabular-nums">
              {isFiniteNum(weather.precipitation) ? `${weather.precipitation.toFixed(1)} mm` : '—'}
            </strong>
          </div>
        </div>

        <div id="widget-solar-telemetry" className="m-panel-inset p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-center justify-center text-[#F59E0B] shrink-0">
              <Sunrise className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#8295A8] uppercase font-semibold block">
                Sunset &amp; Daylight
              </span>
              <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                <span className="text-sm font-bold text-[#F3F6FA]">{weather.sunset || '—'}</span>
                {weather.daylightDuration && (
                  <span className="text-[11px] text-[#FCD34D]">({weather.daylightDuration})</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-[11px] text-[#8295A8]">
            <span>Solar Noon: </span>
            <strong className="text-[#F3F6FA] font-mono tabular-nums">{weather.solarNoon || '—'}</strong>
          </div>
        </div>
      </div>
    </DataPanel>
  );
};
