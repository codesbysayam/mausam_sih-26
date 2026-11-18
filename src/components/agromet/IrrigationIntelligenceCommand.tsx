import React from 'react';
import { Droplets, Clock, Zap, Waves } from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import { CropType, PhenologicalStage, getCropPhenologyProfile } from '../../services/agronomicEngine';
import {
  DataPanel,
  SectionHeading,
  MetricValue,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface IrrigationIntelligenceCommandProps {
  weather?: WeatherDataBundle;
  selectedCrop: CropType;
  selectedStage: PhenologicalStage;
  district: string;
}

export const IrrigationIntelligenceCommand: React.FC<IrrigationIntelligenceCommandProps> = ({
  weather,
  selectedCrop,
  selectedStage,
  district,
}) => {
  const current = weather?.current;
  const temp = typeof current?.temp === 'number' ? current.temp : null;
  const humidity = typeof current?.humidity === 'number' ? current.humidity : null;
  const rain24h = typeof current?.precipitation === 'number' ? current.precipitation : null;
  const dailyProb0 = typeof weather?.daily?.[0]?.rainProb === 'number' ? weather.daily[0].rainProb : null;
  const dailyProb1 = typeof weather?.daily?.[1]?.rainProb === 'number' ? weather.daily[1].rainProb : null;
  const rainProb =
    typeof current?.precipitationProbability === 'number' ? current.precipitationProbability : dailyProb0;

  const isAvailable = temp !== null;
  const profile = getCropPhenologyProfile(selectedCrop, selectedStage, weather);
  const etDemand = profile.criticalETdemandMm;

  const has48hForecast = dailyProb0 !== null && dailyProb1 !== null;
  const totalForecastRain = has48hForecast
    ? Math.round(((dailyProb0 > 50 ? 12 : 0) + (dailyProb1 > 50 ? 8 : 0)) * 10) / 10
    : null;

  const isWet =
    (rain24h !== null && rain24h > 15) ||
    (totalForecastRain !== null && totalForecastRain > 15) ||
    (rainProb !== null && rainProb > 60);
  const isMoist =
    (rain24h !== null && rain24h > 5) ||
    (totalForecastRain !== null && totalForecastRain > 5);

  let decisionState: 'DEFER IRRIGATION' | 'PROCEED WITH IRRIGATION' | 'LIGHT DEFICIT SUPPLEMENT' =
    'PROCEED WITH IRRIGATION';
  let decisionBg = 'bg-[#22C7A0]/12 border-[#22C7A0]/35 text-[#6EE7B7]';
  let decisionReason = `Standard irrigation rotation recommended to meet ${etDemand} mm/day evapotranspiration demand for ${selectedCrop}.`;
  let pumpWindow = '05:30 – 08:30 IST / 17:00 – 19:00 IST';

  if (isWet) {
    decisionState = 'DEFER IRRIGATION';
    decisionBg = 'bg-[#35C7E8]/12 border-[#35C7E8]/35 text-[#7DD3FC]';
    decisionReason = `Observed/forecast precipitation (${rain24h !== null ? `${rain24h} mm` : 'active'}, 48h est. ${totalForecastRain !== null ? `${totalForecastRain} mm` : 'active'}) satisfies root-zone moisture demand. Suspend tubewell pumps to conserve power and prevent waterlogging.`;
    pumpWindow = 'Pumps Powered Down / Hold for 48 Hours';
  } else if (isMoist) {
    decisionState = 'LIGHT DEFICIT SUPPLEMENT';
    decisionBg = 'bg-[#F59E0B]/12 border-[#F59E0B]/35 text-[#FCD34D]';
    decisionReason =
      'Moderate soil moisture replenishment expected. Apply short-cycle drip irrigation only if topsoil tension indicates drying.';
    pumpWindow = 'Short 45-min morning cycle (06:00 – 07:00 IST)';
  }

  const soilMoistureEst =
    temp !== null && rain24h !== null
      ? Math.min(95, Math.max(35, Math.round(55 + rain24h * 1.5 - (temp - 25) * 0.8)))
      : typeof current?.soilMoisture === 'number'
      ? Math.round(current.soilMoisture * 100)
      : null;

  return (
    <DataPanel id="agromet-irrigation-intelligence" className="space-y-4">
      <SectionHeading
        title="Precision Irrigation & Soil Hydrology Command"
        subtitle={`Evapotranspiration balancing & pump scheduling for ${selectedCrop} (${selectedStage}) in ${district}`}
        icon={<Droplets className="w-4 h-4" />}
        badge={<SourceStatus status={isAvailable ? 'LIVE' : 'UNAVAILABLE'} />}
        action={
          isAvailable ? (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${decisionBg}`}>
              <Waves className="w-3.5 h-3.5" />
              <span>{decisionState}</span>
            </div>
          ) : undefined
        }
      />

      {!isAvailable ? (
        <UnavailableState
          title="Irrigation Hydrology Telemetry Unavailable"
          reason="Live air temperature, humidity, and precipitation readings are required to compute soil water deficit and pump schedules."
          source={weather?.current?.observationSource || 'Surface Observation Feed'}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7 grid grid-cols-2 gap-3">
            <div className="m-panel-inset p-4">
              <MetricValue
                label="Precipitation Recharge"
                value={rain24h}
                unit="mm"
                precision={1}
                hint={`48h Outlook: ${totalForecastRain !== null ? `${totalForecastRain} mm` : '—'}`}
                valueClassName="text-xl font-bold text-[#35C7E8]"
              />
            </div>

            <div className="m-panel-inset p-4">
              <MetricValue
                label="Estimated Soil Moisture"
                value={soilMoistureEst}
                unit="%"
                hint={
                  soilMoistureEst === null
                    ? undefined
                    : soilMoistureEst > 80
                    ? 'Saturated / Adequate'
                    : 'Field Capacity Proxy'
                }
                valueClassName="text-xl font-bold text-[#22C7A0]"
              />
            </div>

            <div className="m-panel-inset p-4">
              <MetricValue
                label="Crop ET Demand (ETc)"
                value={etDemand}
                unit="mm/day"
                precision={1}
                hint={`${profile.waterRequirement} stage demand`}
              />
            </div>

            <div className="m-panel-inset p-4">
              <MetricValue
                label="Microclimate Vapor"
                value={humidity}
                unit="% RH"
                hint={`Ambient Temp: ${Math.round(temp * 10) / 10}°C`}
              />
            </div>
          </div>

          <div className="lg:col-span-5 m-panel-inset p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F3F6FA] uppercase">
                <Zap className="w-4 h-4 text-[#F59E0B]" />
                <span>Operational Guidance</span>
              </div>
              <p className="text-xs text-[#B5C3D1] leading-relaxed">{decisionReason}</p>
            </div>

            <div className="bg-[#07111D] border border-[#26394B] rounded-lg p-3 space-y-1">
              <span className="text-[10px] font-mono text-[#8295A8] uppercase block">
                Recommended Pump Schedule
              </span>
              <div className="text-xs font-mono font-bold text-[#35C7E8] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{pumpWindow}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DataPanel>
  );
};
