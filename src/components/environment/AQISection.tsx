import React from 'react';
import { CurrentWeather } from '../../types';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { useProvider } from '../../store/providerStore';

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

  const getAqiDetails = (val: number | null) => {
    if (val === null || Number.isNaN(val)) {
      return {
        category: 'Unavailable',
        variant: 'info' as const,
        description: 'Ambient particulate telemetry is currently awaiting upstream response.',
        color: '#93A4B8',
      };
    }
    if (val <= 50) {
      return {
        category: 'Good',
        variant: 'good' as const,
        description: 'Minimal health impact. Air quality meets ambient cleanliness standards.',
        color: '#22C7A0',
      };
    }
    if (val <= 100) {
      return {
        category: 'Satisfactory',
        variant: 'good' as const,
        description: 'Acceptable ambient air quality; minor discomfort possible for highly sensitive groups.',
        color: '#22C7A0',
      };
    }
    if (val <= 200) {
      return {
        category: 'Moderate',
        variant: 'warning' as const,
        description: 'Breathing discomfort possible for people with lung disease, asthma, or heart conditions.',
        color: '#FFC857',
      };
    }
    if (val <= 300) {
      return {
        category: 'Poor',
        variant: 'alert' as const,
        description: 'Breathing discomfort on prolonged outdoor exposure.',
        color: '#FF9F43',
      };
    }
    if (val <= 400) {
      return {
        category: 'Very Poor',
        variant: 'danger' as const,
        description: 'Respiratory illness risk on prolonged exposure.',
        color: '#EF5350',
      };
    }
    return {
      category: 'Severe',
      variant: 'danger' as const,
      description: 'Health warning: avoid prolonged outdoor exertion.',
      color: '#EF4444',
    };
  };

  const details = getAqiDetails(aqi);

  const formatCo = (val?: number | null) => {
    if (typeof val !== 'number' || Number.isNaN(val)) return '—';
    if (val > 10) return (val / 1000).toFixed(1);
    return val.toFixed(1);
  };

  const no2Val = typeof weather?.no2 === 'number' && !Number.isNaN(weather.no2)
    ? Math.round(weather.no2)
    : typeof aqiData?.no2 === 'number' && !Number.isNaN(aqiData.no2)
    ? Math.round(aqiData.no2)
    : null;

  const so2Val = typeof weather?.so2 === 'number' && !Number.isNaN(weather.so2)
    ? Math.round(weather.so2)
    : typeof aqiData?.so2 === 'number' && !Number.isNaN(aqiData.so2)
    ? Math.round(aqiData.so2)
    : null;

  const coVal = weather?.co ?? aqiData?.co ?? null;

  const o3Val = typeof weather?.o3 === 'number' && !Number.isNaN(weather.o3)
    ? Math.round(weather.o3)
    : typeof aqiData?.o3 === 'number' && !Number.isNaN(aqiData.o3)
    ? Math.round(aqiData.o3)
    : null;

  const pollutants = [
    { name: 'PM 2.5', value: pm25Value ?? '—', unit: 'µg/m³', std: '60 (24h Std)' },
    { name: 'PM 10', value: pm10Value ?? '—', unit: 'µg/m³', std: '100 (24h Std)' },
    { name: 'NO₂', value: no2Val ?? '—', unit: 'µg/m³', std: '80 (24h Std)' },
    { name: 'SO₂', value: so2Val ?? '—', unit: 'µg/m³', std: '80 (24h Std)' },
    { name: 'CO', value: formatCo(coVal), unit: 'mg/m³', std: '2.0 (8h Std)' },
    { name: 'Ozone (O₃)', value: o3Val ?? '—', unit: 'µg/m³', std: '100 (8h Std)' },
  ];

  return (
    <div className="bg-[#101B26] border border-white/12 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
      <SectionHeader
        title="Local Air Quality Index (NAQI Scale)"
        subtitle={`Source: ${aqiState.source || 'Open-Meteo Air Quality'} • Station & atmospheric chemistry estimate`}
        icon="air"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main AQI Score Block */}
        <div className="bg-[#162331] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#93A4B8] uppercase font-bold">
                Overall AQI
              </span>
              <StatusBadge label={details.category} variant={details.variant} />
            </div>

            <div className="my-3 flex items-baseline gap-2 tabular-nums">
              <span className="text-4xl font-bold text-[#F4F7FA] font-mono">
                {aqi !== null ? aqi : '—'}
              </span>
              <span className="text-xs text-[#93A4B8]">NAQI (0–500)</span>
            </div>
          </div>

          <p className="text-xs text-[#CBD5E1] border-t border-white/10 pt-2.5">
            {details.description}
          </p>
        </div>

        {/* Health Advisory & Recommendations */}
        <div className="md:col-span-2 bg-[#162331] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-[#F4F7FA] font-bold text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#38BDF8]">
                health_and_safety
              </span>
              Health Guidance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#CBD5E1]">
              <div className="p-3 bg-[#0B1219]/75 rounded-lg border border-white/10">
                <strong className="text-[#F4F7FA] block mb-1">General Public</strong>
                {aqi === null
                  ? 'Awaiting verified particulate measurement.'
                  : aqi > 150
                  ? 'Reduce intense outdoor exertion and consider respiratory protection near traffic corridors.'
                  : 'Air quality is suitable for routine outdoor activities.'}
              </div>
              <div className="p-3 bg-[#0B1219]/75 rounded-lg border border-white/10">
                <strong className="text-[#F4F7FA] block mb-1">Sensitive Groups (Asthma / Elderly)</strong>
                {aqi === null
                  ? 'Monitor local station telemetry before strenuous activity.'
                  : aqi > 100
                  ? 'Limit prolonged morning exposure near high-traffic corridors and keep medication accessible.'
                  : 'Low particulate load with minimal respiratory triggers.'}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#93A4B8] mt-3 pt-2.5 border-t border-white/10 flex flex-wrap justify-between gap-2">
            <span>Primary Pollutant: <strong className="text-[#F4F7FA]">PM2.5</strong></span>
            <span>Provenance: <strong className="text-[#38BDF8]">{aqiState.source || 'Atmospheric Model'}</strong></span>
          </div>
        </div>
      </div>

      {/* Pollutant Parameter Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 tabular-nums">
        {pollutants.map((p, idx) => (
          <div
            key={idx}
            className="p-3 bg-[#162331] border border-white/10 rounded-xl text-center"
          >
            <div className="text-[11px] font-bold text-[#93A4B8]">{p.name}</div>
            <div className="text-base font-bold text-[#F4F7FA] font-mono my-0.5">
              {p.value}
            </div>
            <div className="text-[10px] text-[#93A4B8]">{p.unit}</div>
            <div className="text-[9px] text-[#38BDF8] mt-1.5 border-t border-white/10 pt-1">
              {p.std}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
