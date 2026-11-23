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
import {
  AqiMeterArc,
  AnimatedMetricBar,
  SectionReveal,
  StaggerContainer,
  StaggerItem,
} from '../../motion';

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
        badgeClass: 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]',
        description: 'Ambient air quality model estimate is currently unavailable from Open-Meteo.',
      };
    }
    if (val <= 50) {
      return {
        category: 'Good',
        badgeClass: 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35',
        description: 'Air quality is satisfactory under US EPA AQI bands, with little or no pollution risk.',
      };
    }
    if (val <= 100) {
      return {
        category: 'Moderate',
        badgeClass: 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35',
        description: 'Acceptable air quality; unusually sensitive individuals may experience mild respiratory discomfort.',
      };
    }
    if (val <= 150) {
      return {
        category: 'Unhealthy for Sensitive Groups',
        badgeClass: 'bg-[var(--m-alert-soft)] text-[var(--m-alert)] border-[var(--m-alert)]/35',
        description: 'Sensitive groups (asthma, elderly, children) should reduce prolonged outdoor exertion.',
      };
    }
    if (val <= 200) {
      return {
        category: 'Unhealthy',
        badgeClass: 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35',
        description: 'Everyone may begin to experience health effects; limit prolonged outdoor exertion.',
      };
    }
    if (val <= 300) {
      return {
        category: 'Very Unhealthy',
        badgeClass: 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/45',
        description: 'Health alert: increased risk of respiratory effects for everyone.',
      };
    }
    return {
      category: 'Hazardous',
      badgeClass: 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/55',
      description: 'Health warning of emergency conditions: avoid outdoor exposure.',
    };
  };

  const details = getAqiDetails(aqi);
  const provenance: ProvenanceStatus =
    aqiState.status === 'LOADING'
      ? 'LOADING'
      : aqi !== null || pm25Value !== null
      ? 'MODELLED'
      : 'UNAVAILABLE';

  const pollutants = [
    { name: 'PM2.5', value: pm25Value, unit: 'µg/m³', std: 'WHO/CPCB Ref', precision: 0 },
    { name: 'PM10', value: pm10Value, unit: 'µg/m³', std: 'WHO/CPCB Ref', precision: 0 },
    { name: 'NO₂', value: no2Val, unit: 'µg/m³', std: 'Trace Gas', precision: 0 },
    { name: 'SO₂', value: so2Val, unit: 'µg/m³', std: 'Trace Gas', precision: 0 },
    { name: 'CO', value: formatCo(coVal), unit: 'mg/m³', std: 'Trace Gas', precision: 1 },
    { name: 'Ozone (O₃)', value: o3Val, unit: 'µg/m³', std: 'Surface O₃', precision: 0 },
  ];

  const allPollutantsEmpty = pollutants.every((p) => p.value === null) && aqi === null;

  return (
    <SectionReveal>
    <DataPanel className="flex flex-col gap-4">
      <SectionHeading
        title="Local Air Quality Index (US EPA AQI · Model Estimate)"
        subtitle="Open-Meteo atmospheric chemistry grid estimate (separate from physical CPCB CAAQMS ground stations)"
        icon={<Wind className="w-4 h-4" />}
        badge={
          <SourceStatus
            status={provenance}
            source="Open-Meteo Model"
            labelOverride={provenance === 'MODELLED' ? 'MODEL ESTIMATE · US EPA AQI' : undefined}
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
                  <span className="text-[11px] font-mono text-[var(--m-text-muted)] uppercase font-semibold tracking-wider">
                    Overall AQI
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold uppercase tracking-wider ${details.badgeClass}`}
                  >
                    {details.category}
                  </span>
                </div>

                <div className="my-2 flex items-center justify-between gap-3 tabular-nums">
                  <AqiMeterArc aqi={aqi} />
                  <span className="text-[11px] text-[var(--m-text-muted)] font-mono text-right">
                    US EPA AQI
                    <span className="block text-[10px]">(0–500 Scale)</span>
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--m-text-secondary)] border-t border-[var(--m-border)] pt-2.5 leading-relaxed">
                {details.description}
              </p>
            </div>

            {/* Health Advisory & Recommendations */}
            <div className="md:col-span-2 m-panel-inset p-4 flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-[var(--m-text-primary)] font-semibold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-4 h-4 text-[var(--m-accent)]" />
                  <span>Health Guidance</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[var(--m-text-secondary)]">
                  <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
                    <strong className="text-[var(--m-text-primary)] block mb-1">General Public</strong>
                    {aqi === null
                      ? 'Awaiting verified particulate measurement.'
                      : aqi > 150
                      ? 'Reduce intense outdoor exertion and consider respiratory protection near traffic corridors.'
                      : 'Air quality is suitable for routine outdoor activities.'}
                  </div>
                  <div className="p-3 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
                    <strong className="text-[var(--m-text-primary)] block mb-1">Sensitive Groups (Asthma / Elderly)</strong>
                    {aqi === null
                      ? 'Monitor local station telemetry before strenuous activity.'
                      : aqi > 100
                      ? 'Limit prolonged morning exposure near high-traffic corridors and keep medication accessible.'
                      : 'Low particulate load with minimal respiratory triggers.'}
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-[var(--m-text-muted)] pt-2.5 border-t border-[var(--m-border)] flex flex-wrap justify-between gap-2">
                <span>
                  Primary Pollutant:{' '}
                  <strong className="text-[var(--m-text-primary)]">
                    {pm25Value !== null ? 'PM2.5' : pm10Value !== null ? 'PM10' : '—'}
                  </strong>
                </span>
                <span>
                  Provenance:{' '}
                  <strong className="text-[var(--m-accent)]">
                    {aqiState.source || 'Open-Meteo Air Quality'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Pollutant Parameter Breakdown */}
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {pollutants.map((p) => {
              const refMax =
                p.name === 'PM2.5'
                  ? 120
                  : p.name === 'PM10'
                  ? 200
                  : p.name === 'CO'
                  ? 10
                  : 180;
              const ratio = p.value !== null ? Math.min(1, p.value / refMax) : 0;
              return (
                <StaggerItem key={p.name} interactive className="m-panel-inset mausam-interactive-card p-3 flex flex-col justify-between gap-2">
                  <MetricValue
                    label={p.name}
                    value={p.value}
                    unit={p.unit}
                    precision={p.precision}
                    hint={p.std}
                    unavailableLabel="—"
                    valueClassName="text-lg font-bold text-[var(--m-text-primary)]"
                  />
                  {p.value !== null && (
                    <AnimatedMetricBar
                      ratio={ratio}
                      colorClass={ratio > 0.75 ? 'bg-[var(--m-danger)]' : ratio > 0.45 ? 'bg-[var(--m-watch)]' : 'bg-[var(--m-ok)]'}
                      heightClass="h-1"
                    />
                  )}
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </>
      )}
    </DataPanel>
    </SectionReveal>
  );
};
