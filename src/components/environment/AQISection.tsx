import React from 'react';
import { Wind, ShieldCheck } from 'lucide-react';
import { CurrentWeather } from '../../types';
import { useProvider } from '../../store/providerStore';
import {
  DataPanel,
  MetricValue,
  ProvenanceStatus,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface AQISectionProps {
  weather: CurrentWeather;
}

export const AQISection: React.FC<AQISectionProps> = ({ weather }) => {
  const { state: aqiState } = useProvider<any>('AQI');
  const aqiData = aqiState.data;

  const aqi: number | null =
    typeof weather?.aqi === 'number' && !Number.isNaN(weather.aqi) && weather.aqi > 0
      ? Math.round(weather.aqi)
      : typeof weather?.aqiIndex === 'number' && !Number.isNaN(weather.aqiIndex) && weather.aqiIndex > 0
      ? Math.round(weather.aqiIndex)
      : typeof aqiData?.aqi === 'number' && !Number.isNaN(aqiData.aqi) && aqiData.aqi > 0
      ? Math.round(aqiData.aqi)
      : null;

  const pm25Value: number | null =
    typeof weather?.aqiPm25 === 'number' && !Number.isNaN(weather.aqiPm25) && weather.aqiPm25 >= 0
      ? Math.round(weather.aqiPm25)
      : typeof aqiData?.pm25 === 'number' && !Number.isNaN(aqiData.pm25)
      ? Math.round(aqiData.pm25)
      : null;

  const pm10Value: number | null =
    typeof weather?.aqiPm10 === 'number' && !Number.isNaN(weather.aqiPm10) && weather.aqiPm10 >= 0
      ? Math.round(weather.aqiPm10)
      : typeof aqiData?.pm10 === 'number' && !Number.isNaN(aqiData.pm10)
      ? Math.round(aqiData.pm10)
      : null;

  const no2Val =
    typeof weather?.no2 === 'number' && !Number.isNaN(weather.no2)
      ? Math.round(weather.no2)
      : typeof aqiData?.no2 === 'number' && !Number.isNaN(aqiData.no2)
      ? Math.round(aqiData.no2)
      : null;

  const so2Val =
    typeof weather?.so2 === 'number' && !Number.isNaN(weather.so2)
      ? Math.round(weather.so2)
      : typeof aqiData?.so2 === 'number' && !Number.isNaN(aqiData.so2)
      ? Math.round(aqiData.so2)
      : null;

  const coVal: number | null =
    typeof weather?.co === 'number' && !Number.isNaN(weather.co)
      ? weather.co
      : typeof aqiData?.co === 'number' && !Number.isNaN(aqiData.co)
      ? aqiData.co
      : null;

  const o3Val =
    typeof weather?.o3 === 'number' && !Number.isNaN(weather.o3)
      ? Math.round(weather.o3)
      : typeof aqiData?.o3 === 'number' && !Number.isNaN(aqiData.o3)
      ? Math.round(aqiData.o3)
      : null;

  const formatCo = (val: number | null) => {
    if (val === null) return null;
    return val > 10 ? Number((val / 1000).toFixed(1)) : Number(val.toFixed(1));
  };

  const getAqiDetails = (val: number | null) => {
    if (val === null || Number.isNaN(val)) {
      return {
        category: 'Unavailable',
        badgeClass: 'bg-[#08131F] text-[#8295A8] border-[#26394B]',
        description: 'Ambient particulate telemetry is currently unavailable from the upstream AQI feed.',
      };
    }
    if (val <= 50) {
      return {
        category: 'Good',
        badgeClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35',
        description: 'Minimal health impact. Air quality meets ambient cleanliness standards.',
      };
    }
    if (val <= 100) {
      return {
        category: 'Satisfactory',
        badgeClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35',
        description: 'Acceptable ambient air quality; minor discomfort possible for highly sensitive groups.',
      };
    }
    if (val <= 200) {
      return {
        category: 'Moderate',
        badgeClass: 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35',
        description: 'Breathing discomfort possible for people with lung disease, asthma, or heart conditions.',
      };
    }
    if (val <= 300) {
      return {
        category: 'Poor',
        badgeClass: 'bg-[#F97316]/12 text-[#FDBA74] border-[#F97316]/35',
        description: 'Breathing discomfort on prolonged outdoor exposure.',
      };
    }
    if (val <= 400) {
      return {
        category: 'Very Poor',
        badgeClass: 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35',
        description: 'Respiratory illness risk on prolonged exposure.',
      };
    }
    return {
      category: 'Severe',
      badgeClass: 'bg-[#EF4444]/20 text-[#FCA5A5] border-[#EF4444]/50',
      description: 'Health warning: avoid prolonged outdoor exertion.',
    };
  };

  const details = getAqiDetails(aqi);
  const provenance: ProvenanceStatus =
    aqiState.status === 'LOADING'
      ? 'LOADING'
      : aqi !== null || pm25Value !== null
      ? 'LIVE'
      : 'UNAVAILABLE';

  const pollutants = [
    { name: 'PM2.5', value: pm25Value, unit: 'µg/m³', std: '60 (24h Std)', precision: 0 },
    { name: 'PM10', value: pm10Value, unit: 'µg/m³', std: '100 (24h Std)', precision: 0 },
    { name: 'NO₂', value: no2Val, unit: 'µg/m³', std: '80 (24h Std)', precision: 0 },
    { name: 'SO₂', value: so2Val, unit: 'µg/m³', std: '80 (24h Std)', precision: 0 },
    { name: 'CO', value: formatCo(coVal), unit: 'mg/m³', std: '2.0 (8h Std)', precision: 1 },
    { name: 'Ozone (O₃)', value: o3Val, unit: 'µg/m³', std: '100 (8h Std)', precision: 0 },
  ];

  const allPollutantsEmpty = pollutants.every((p) => p.value === null) && aqi === null;

  return (
    <DataPanel className="flex flex-col gap-4">
      <SectionHeading
        title="Local Air Quality Index (NAQI Scale)"
        subtitle="Particulate & trace gas atmospheric chemistry readings"
        icon={<Wind className="w-4 h-4" />}
        badge={
          <SourceStatus
            status={provenance}
            source={aqiState.source || 'Open-Meteo Air Quality'}
          />
        }
      />

      {allPollutantsEmpty ? (
        <UnavailableState
          title="Ambient AQI & Pollutant Feed Unavailable"
          reason="Live particulate (PM2.5/PM10) and gaseous pollutant measurements were not returned for the active coordinates."
          source={aqiState.source || 'Open-Meteo Air Quality'}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main AQI Score Block */}
            <div className="m-panel-inset p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] font-mono text-[#8295A8] uppercase font-semibold tracking-wider">
                    Overall AQI
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold uppercase tracking-wider ${details.badgeClass}`}
                  >
                    {details.category}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-2 tabular-nums">
                  <span className="text-4xl font-bold text-[#F3F6FA] font-mono">
                    {aqi !== null ? aqi : '—'}
                  </span>
                  <span className="text-xs text-[#8295A8] font-mono">NAQI (0–500)</span>
                </div>
              </div>

              <p className="text-xs text-[#B5C3D1] border-t border-[#26394B] pt-2.5 leading-relaxed">
                {details.description}
              </p>
            </div>

            {/* Health Advisory & Recommendations */}
            <div className="md:col-span-2 m-panel-inset p-4 flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-[#F3F6FA] font-semibold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-4 h-4 text-[#35C7E8]" />
                  <span>Health Guidance</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#B5C3D1]">
                  <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
                    <strong className="text-[#F3F6FA] block mb-1">General Public</strong>
                    {aqi === null
                      ? 'Awaiting verified particulate measurement.'
                      : aqi > 150
                      ? 'Reduce intense outdoor exertion and consider respiratory protection near traffic corridors.'
                      : 'Air quality is suitable for routine outdoor activities.'}
                  </div>
                  <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
                    <strong className="text-[#F3F6FA] block mb-1">Sensitive Groups (Asthma / Elderly)</strong>
                    {aqi === null
                      ? 'Monitor local station telemetry before strenuous activity.'
                      : aqi > 100
                      ? 'Limit prolonged morning exposure near high-traffic corridors and keep medication accessible.'
                      : 'Low particulate load with minimal respiratory triggers.'}
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-[#8295A8] pt-2.5 border-t border-[#26394B] flex flex-wrap justify-between gap-2">
                <span>
                  Primary Pollutant:{' '}
                  <strong className="text-[#F3F6FA]">
                    {pm25Value !== null ? 'PM2.5' : pm10Value !== null ? 'PM10' : '—'}
                  </strong>
                </span>
                <span>
                  Provenance:{' '}
                  <strong className="text-[#35C7E8]">
                    {aqiState.source || 'Open-Meteo Air Quality'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Pollutant Parameter Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {pollutants.map((p) => (
              <div key={p.name} className="m-panel-inset p-3">
                <MetricValue
                  label={p.name}
                  value={p.value}
                  unit={p.unit}
                  precision={p.precision}
                  hint={p.std}
                  unavailableLabel="—"
                  valueClassName="text-lg font-bold text-[#F3F6FA]"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </DataPanel>
  );
};
