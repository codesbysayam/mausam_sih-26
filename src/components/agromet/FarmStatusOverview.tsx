import React from 'react';
import {
  Thermometer,
  CloudRain,
  Gauge,
  Wind,
  Droplets,
  Sun,
  Radio,
} from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import { CropType, PhenologicalStage } from '../../services/agronomicEngine';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface FarmStatusOverviewProps {
  weather?: WeatherDataBundle;
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  lastUpdatedStr: string;
  stationName: string;
}

export const FarmStatusOverview: React.FC<FarmStatusOverviewProps> = ({
  weather,
  selectedStage,
  lastUpdatedStr,
  stationName,
}) => {
  const current = weather?.current;
  const hourly = weather?.hourly || [];
  const daily = weather?.daily || [];

  const currentTemp = typeof current?.temp === 'number' ? current.temp : null;
  const isAvailable = currentTemp !== null;

  const temp3hRaw = typeof hourly[3]?.temp === 'number' ? hourly[3].temp : null;
  const tempDelta =
    currentTemp !== null && temp3hRaw !== null
      ? Math.round((temp3hRaw - currentTemp) * 10) / 10
      : null;
  const tempTrend =
    tempDelta === null
      ? '—'
      : tempDelta > 0.5
      ? `+${tempDelta}°C / 3h`
      : tempDelta < -0.5
      ? `${tempDelta}°C / 3h`
      : 'Steady (±0.5°C / 3h)';

  const highTemp = typeof current?.high === 'number' ? current.high : null;
  const lowTemp = typeof current?.low === 'number' ? current.low : null;

  const rain24h = typeof current?.precipitation === 'number' ? current.precipitation : null;
  const rainNext48h =
    daily.length >= 2
      ? daily.slice(0, 2).reduce((acc, d) => acc + (typeof d.rainProb === 'number' && d.rainProb > 50 ? 12 : 0), 0)
      : null;
  const rainProbability =
    typeof current?.precipitationProbability === 'number'
      ? current.precipitationProbability
      : typeof daily[0]?.rainProb === 'number'
      ? daily[0].rainProb
      : null;
  const rainRiskStatus =
    rainProbability === null
      ? 'UNAVAILABLE'
      : rainProbability > 60
      ? 'HIGH PROBABILITY'
      : rainProbability > 30
      ? 'MODERATE PROBABILITY'
      : 'LOW PROBABILITY';
  const rainRiskColor =
    rainProbability === null
      ? 'text-[#8295A8]'
      : rainProbability > 60
      ? 'text-[#35C7E8]'
      : rainProbability > 30
      ? 'text-[#7DD3FC]'
      : 'text-[#8295A8]';

  const humidity = typeof current?.humidity === 'number' ? current.humidity : null;
  const dewPoint =
    typeof current?.dewPoint === 'number'
      ? current.dewPoint
      : currentTemp !== null && humidity !== null
      ? Math.round(currentTemp - (100 - humidity) / 5)
      : null;
  const dewDuration =
    humidity === null
      ? '—'
      : humidity > 80
      ? 'Heavy Morning Dew (>5h)'
      : humidity > 65
      ? 'Moderate Dew (2–3h)'
      : 'Minimal Dew (<1h)';

  const windSpeed = typeof current?.windSpeed === 'number' ? current.windSpeed : null;
  const windGust = typeof current?.windGusts === 'number' ? current.windGusts : null;
  const windDirection = current?.windDirection || '—';
  const isSpraySafe =
    windSpeed !== null ? windSpeed <= 15 && (windGust === null || windGust <= 20) : null;
  const sprayStatus =
    isSpraySafe === null ? 'UNAVAILABLE' : isSpraySafe ? 'SAFE FOR SPRAYING' : 'HIGH DRIFT HAZARD';
  const sprayColor =
    isSpraySafe === null ? 'text-[#8295A8]' : isSpraySafe ? 'text-[#22C7A0]' : 'text-[#EF4444]';

  const explicitET0 = typeof current?.evapotranspiration === 'number' ? current.evapotranspiration : null;
  const baseET0 =
    explicitET0 !== null
      ? Math.round(explicitET0 * 10) / 10
      : currentTemp !== null && windSpeed !== null && humidity !== null
      ? Math.max(2.0, Math.round((currentTemp * 0.15 + windSpeed * 0.08 - humidity * 0.02) * 10) / 10)
      : null;
  const kcFactor = selectedStage === 'Flowering' || selectedStage === 'Tillering' ? 1.15 : 0.85;
  const etcValue = baseET0 !== null ? Math.round(baseET0 * kcFactor * 10) / 10 : null;
  const etRequirement =
    etcValue === null
      ? 'UNAVAILABLE'
      : etcValue > 5.5
      ? 'CRITICAL DEMAND'
      : etcValue > 4.0
      ? 'MODERATE DEMAND'
      : 'LOW DEMAND';

  const isSaturated =
    (rain24h !== null && rain24h > 20) || (rainProbability !== null && rainProbability > 70);
  const isDry = rain24h !== null && rain24h === 0 && (rainProbability === null || rainProbability < 25);
  const soilStatus =
    rain24h === null && rainProbability === null
      ? 'UNAVAILABLE'
      : isSaturated
      ? 'SATURATED / WET'
      : isDry
      ? 'MONITOR MOISTURE'
      : 'OPTIMAL MOISTURE';
  const soilAdvice =
    soilStatus === 'UNAVAILABLE'
      ? 'Precipitation sensor offline'
      : isSaturated
      ? 'Drainage active / Hold pumps'
      : 'Standard irrigation cycle';
  const soilColor =
    soilStatus === 'UNAVAILABLE'
      ? 'text-[#8295A8]'
      : isSaturated
      ? 'text-[#35C7E8]'
      : isDry
      ? 'text-[#F59E0B]'
      : 'text-[#22C7A0]';

  return (
    <DataPanel id="agromet-farm-status-overview" className="space-y-4">
      <SectionHeading
        title="Biophysical Field Telemetry"
        subtitle="Surface station readings and derived crop water balance"
        icon={<Radio className="w-4 h-4" />}
        badge={
          <SourceStatus
            status={isAvailable ? 'LIVE' : 'UNAVAILABLE'}
            source={stationName}
            updatedAt={lastUpdatedStr || null}
          />
        }
      />

      {!isAvailable ? (
        <UnavailableState
          title="Biophysical Telemetry Unavailable"
          reason="Live atmospheric observations are required to calculate canopy thermal load, vapor deficit, spray drift hazard, and crop evapotranspiration."
          source={stationName}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* CARD 1: Temperature */}
          <div id="metric-temperature-card" className="m-panel-inset p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8295A8] uppercase tracking-wider">
                Canopy Temp &amp; Heat Load
              </span>
              <Thermometer className="w-4 h-4 text-[#F59E0B]" />
            </div>

            <div>
              <div className="flex items-baseline gap-2.5 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold text-[#F3F6FA]">
                  {currentTemp.toFixed(1)}°C
                </span>
                <span className="text-xs text-[#35C7E8] font-semibold">{tempTrend}</span>
              </div>
              <div className="text-xs font-mono tabular-nums text-[#8295A8] mt-1">
                Max: <strong className="text-[#F3F6FA]">{highTemp !== null ? `${Math.round(highTemp)}°C` : '—'}</strong> · Min:{' '}
                <strong className="text-[#F3F6FA]">{lowTemp !== null ? `${Math.round(lowTemp)}°C` : '—'}</strong>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#26394B] text-[11px] font-mono text-[#B5C3D1] flex items-center justify-between">
              <span>Thermal Regime</span>
              <span className={currentTemp >= 38 ? 'text-[#EF4444] font-semibold' : 'text-[#22C7A0] font-semibold'}>
                {currentTemp >= 38 ? 'Heat Stress' : 'Safe Thermal Zone'}
              </span>
            </div>
          </div>

          {/* CARD 2: Rainfall */}
          <div id="metric-rainfall-card" className="m-panel-inset p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8295A8] uppercase tracking-wider">
                Precipitation &amp; Recharge
              </span>
              <CloudRain className="w-4 h-4 text-[#35C7E8]" />
            </div>

            <div>
              <div className="flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold text-[#F3F6FA]">
                  {rain24h !== null ? `${rain24h} mm` : '—'}
                </span>
                <span className="text-xs text-[#35C7E8]">Observed</span>
              </div>
              <div className="text-xs font-mono tabular-nums text-[#8295A8] mt-1">
                48h Outlook:{' '}
                <strong className="text-[#F3F6FA]">{rainNext48h !== null ? `${rainNext48h} mm` : '—'}</strong>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#26394B] text-[11px] font-mono tabular-nums text-[#B5C3D1] flex items-center justify-between">
              <span>
                Prob: <strong className="text-[#F3F6FA]">{rainProbability !== null ? `${Math.round(rainProbability)}%` : '—'}</strong>
              </span>
              <span className={`font-semibold ${rainRiskColor}`}>{rainRiskStatus}</span>
            </div>
          </div>

          {/* CARD 3: Humidity & Dew */}
          <div id="metric-humidity-card" className="m-panel-inset p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8295A8] uppercase tracking-wider">
                Humidity &amp; Dew Point
              </span>
              <Gauge className="w-4 h-4 text-[#35C7E8]" />
            </div>

            <div>
              <div className="flex items-baseline gap-2.5 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold text-[#F3F6FA]">
                  {humidity !== null ? `${Math.round(humidity)}%` : '—'}
                </span>
                <span className="text-xs text-[#8295A8]">
                  Dew Pt: <strong className="text-[#F3F6FA]">{dewPoint !== null ? `${Math.round(dewPoint)}°C` : '—'}</strong>
                </span>
              </div>
              <div className="text-xs font-mono text-[#8295A8] mt-1">
                Wetness: <strong className="text-[#F3F6FA]">{dewDuration}</strong>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#26394B] text-[11px] font-mono text-[#B5C3D1] flex items-center justify-between">
              <span>Pathogen Spore Risk</span>
              <span
                className={
                  humidity === null
                    ? 'text-[#8295A8] font-semibold'
                    : humidity > 80
                    ? 'text-[#EF4444] font-semibold'
                    : 'text-[#22C7A0] font-semibold'
                }
              >
                {humidity === null ? 'UNAVAILABLE' : humidity > 80 ? 'ELEVATED' : 'LOW'}
              </span>
            </div>
          </div>

          {/* CARD 4: Wind & Drift */}
          <div id="metric-wind-card" className="m-panel-inset p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8295A8] uppercase tracking-wider">
                Surface Wind &amp; Drift
              </span>
              <Wind className="w-4 h-4 text-[#B5C3D1]" />
            </div>

            <div>
              <div className="flex items-baseline gap-2.5 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold text-[#F3F6FA]">
                  {windSpeed !== null ? (
                    <>
                      {Math.round(windSpeed)} <span className="text-base font-normal text-[#8295A8]">km/h</span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <span className="text-xs text-[#8295A8]">
                  Dir: <strong className="text-[#F3F6FA]">{windDirection}</strong>
                </span>
              </div>
              <div className="text-xs font-mono tabular-nums text-[#8295A8] mt-1">
                Gusts: <strong className="text-[#F3F6FA]">{windGust !== null ? `${Math.round(windGust)} km/h` : '—'}</strong> · Limit 15 km/h
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#26394B] text-[11px] font-mono text-[#B5C3D1] flex items-center justify-between">
              <span>Spraying</span>
              <span className={`font-semibold ${sprayColor}`}>{sprayStatus}</span>
            </div>
          </div>

          {/* CARD 5: Evapotranspiration */}
          <div id="metric-etc-card" className="m-panel-inset p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8295A8] uppercase tracking-wider">
                Evapotranspiration (ETc)
              </span>
              <Sun className="w-4 h-4 text-[#22C7A0]" />
            </div>

            <div>
              <div className="flex items-baseline gap-2.5 font-mono tabular-nums">
                <span className="text-2xl sm:text-3xl font-bold text-[#F3F6FA]">
                  {etcValue !== null ? (
                    <>
                      {etcValue} <span className="text-base font-normal text-[#8295A8]">mm/d</span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <span className="text-xs text-[#22C7A0] font-semibold">Kc {kcFactor}</span>
              </div>
              <div className="text-xs font-mono tabular-nums text-[#8295A8] mt-1">
                Ref ET₀: <strong className="text-[#F3F6FA]">{baseET0 !== null ? `${baseET0} mm/day` : '—'}</strong>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#26394B] text-[11px] font-mono text-[#B5C3D1] flex items-center justify-between">
              <span>Water Loss</span>
              <span className="text-[#22C7A0] font-semibold">{etRequirement}</span>
            </div>
          </div>

          {/* CARD 6: Root Zone Soil */}
          <div id="metric-soil-card" className="m-panel-inset p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#8295A8] uppercase tracking-wider">
                Root Zone Soil Hydrology
              </span>
              <Droplets className="w-4 h-4 text-[#35C7E8]" />
            </div>

            <div>
              <div className={`text-xl font-bold font-mono tracking-tight ${soilColor}`}>
                {soilStatus}
              </div>
              <div className="text-xs font-mono text-[#8295A8] mt-1">
                Directive: <strong className="text-[#F3F6FA]">{soilAdvice}</strong>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#26394B] text-[11px] font-mono text-[#B5C3D1] flex items-center justify-between">
              <span>Stage Context</span>
              <span className="text-[#F3F6FA] font-semibold">{selectedStage}</span>
            </div>
          </div>
        </div>
      )}
    </DataPanel>
  );
};
