import React from 'react';
import { Sprout, AlertTriangle, ArrowRight } from 'lucide-react';
import { WeatherDataBundle } from '../../services/weatherService';
import {
  DataPanel,
  SectionHeading,
  MetricValue,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface AgriculturalWeatherStatusPanelProps {
  weather?: WeatherDataBundle;
  district?: string;
  state?: string;
}

export const AgriculturalWeatherStatusPanel: React.FC<AgriculturalWeatherStatusPanelProps> = ({
  weather,
  district = 'Regional Farm Block',
  state = 'India',
}) => {
  const current = weather?.current;
  const temp = typeof current?.temp === 'number' ? current.temp : null;
  const rainfall = typeof current?.precipitation === 'number' ? current.precipitation : null;
  const humidity = typeof current?.humidity === 'number' ? current.humidity : null;
  const windSpeed = typeof current?.windSpeed === 'number' ? current.windSpeed : null;
  const windDir = current?.windDirection || '—';
  const rawSoilMoisture = typeof current?.soilMoisture === 'number' ? current.soilMoisture : null;

  const isAvailable = temp !== null;

  const soilMoistureValue =
    rawSoilMoisture !== null
      ? `${Math.round(rawSoilMoisture * 100)}%`
      : rainfall !== null
      ? rainfall > 20
        ? 'Saturated'
        : rainfall > 5
        ? 'Adequate'
        : 'Dry / Monitor'
      : null;

  const frostHeatCondition =
    temp === null
      ? null
      : temp <= 4
      ? 'Frost Danger'
      : temp <= 10
      ? 'Cold Stress'
      : temp >= 40
      ? 'Severe Heat'
      : temp >= 35
      ? 'Heat Stress'
      : 'Optimal';

  const agrometWarning =
    temp === null
      ? null
      : rainfall !== null && rainfall > 25
      ? 'Drain excess water from nursery beds and withhold fertilizer spraying.'
      : temp >= 38
      ? 'Provide light frequent evening irrigation to mitigate floral abortion.'
      : 'Surface conditions remain workable; proceed with scheduled weed management and foliar inspection.';

  const handleScrollToAdvisories = () => {
    const el = document.getElementById('agromet-official-advisories') || document.getElementById('agromet-action-center');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollBy({ top: 500, behavior: 'smooth' });
    }
  };

  return (
    <DataPanel id="agricultural-weather-status-panel" className="space-y-4">
      <SectionHeading
        title="Agricultural Weather Status"
        subtitle={`Agro-meteorological field parameters for ${district}, ${state}`}
        icon={<Sprout className="w-4 h-4" />}
        badge={<SourceStatus status={isAvailable ? 'LIVE' : 'UNAVAILABLE'} />}
        action={
          <button
            type="button"
            id="btn-view-agri-advisory"
            onClick={handleScrollToAdvisories}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-[40px] bg-[#0B72B9] hover:bg-[#0D84D6] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer m-focus-ring"
          >
            <span>View Advisory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      {!isAvailable ? (
        <UnavailableState
          title="Agro-Meteorological Surface Telemetry Unavailable"
          reason="Live surface station measurements (temperature, precipitation, wind, humidity) have not synced for this district."
          source={weather?.current?.observationSource || 'IMD AWS / Open-Meteo Surface Feed'}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="m-panel-inset p-3">
              <MetricValue
                label="Rainfall"
                value={rainfall}
                unit="mm"
                precision={1}
                hint="Observed precip"
                valueClassName="text-lg sm:text-xl font-bold text-[#35C7E8]"
              />
            </div>

            <div className="m-panel-inset p-3">
              <MetricValue
                label="Temperature"
                value={temp}
                unit="°C"
                precision={1}
                hint="Air canopy temp"
              />
            </div>

            <div className="m-panel-inset p-3">
              <MetricValue
                label="Humidity"
                value={humidity}
                unit="%"
                hint="Relative humidity"
              />
            </div>

            <div className="m-panel-inset p-3">
              <MetricValue
                label="Wind Speed"
                value={windSpeed}
                unit="km/h"
                hint={windSpeed !== null ? `${windDir} drift` : undefined}
              />
            </div>

            <div className="m-panel-inset p-3">
              <MetricValue
                label="Soil Hydrology"
                value={soilMoistureValue}
                hint={rawSoilMoisture !== null ? 'Root-zone sensor' : 'Precip proxy'}
                valueClassName="text-base sm:text-lg font-bold text-[#22C7A0]"
              />
            </div>

            <div className="m-panel-inset p-3">
              <MetricValue
                label="Thermal Stress"
                value={frostHeatCondition}
                hint={temp >= 35 ? 'Elevated ETc' : 'Physiological zone'}
                valueClassName={`text-base sm:text-lg font-bold ${
                  temp >= 38 ? 'text-[#EF4444]' : temp >= 35 ? 'text-[#F59E0B]' : 'text-[#22C7A0]'
                }`}
              />
            </div>
          </div>

          {agrometWarning && (
            <div className="m-panel-inset p-3.5 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F59E0B]">
                    Operational Agromet Directive
                  </span>
                  <span className="text-[10px] font-mono text-[#8295A8]">ICAR-IMD GKMS Protocol</span>
                </div>
                <p className="text-[#F3F6FA] mt-1 leading-relaxed">{agrometWarning}</p>
              </div>
            </div>
          )}
        </>
      )}
    </DataPanel>
  );
};
