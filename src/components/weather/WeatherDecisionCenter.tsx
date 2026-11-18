import React, { useState } from 'react';
import {
  CurrentWeather,
  HourlyForecastItem,
  WeatherAlert,
} from '../../types';
import { WeatherDecisionEngine } from '../../services/weatherDecisionEngine';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';
import {
  Umbrella,
  Flame,
  Activity,
  Car,
  Footprints,
  CloudLightning,
  Shield,
  HeartPulse,
  Compass,
  Clock,
  Eye,
  Sun,
  Info,
} from 'lucide-react';

interface WeatherDecisionCenterProps {
  weather: CurrentWeather;
  hourly?: HourlyForecastItem[];
  alerts?: WeatherAlert[];
}

export const WeatherDecisionCenter: React.FC<WeatherDecisionCenterProps> = ({
  weather,
  hourly = [],
  alerts = [],
}) => {
  const [activeTab, setActiveTab] = useState<'decision' | 'travel' | 'health'>('decision');

  const decisions = WeatherDecisionEngine.generateWhatShouldIDoNow(weather, hourly, alerts);
  const travel = WeatherDecisionEngine.generateTravelConditions(weather, hourly);
  const health = WeatherDecisionEngine.generateHealthWeather(weather);

  const rawAqi =
    typeof weather.aqi === 'number' && Number.isFinite(weather.aqi)
      ? Math.round(weather.aqi)
      : typeof weather.aqiIndex === 'number' && Number.isFinite(weather.aqiIndex)
      ? Math.round(weather.aqiIndex)
      : null;

  const rawPm25 =
    typeof weather.aqiPm25 === 'number' && Number.isFinite(weather.aqiPm25) ? weather.aqiPm25 : null;

  const rawUv =
    typeof weather.uvIndex === 'number' && Number.isFinite(weather.uvIndex) ? weather.uvIndex : null;

  const getIconForCategory = (key: string) => {
    switch (key) {
      case 'outdoor_activity':
        return <Activity className="w-4 h-4 text-[#35C7E8]" />;
      case 'running_walking':
        return <Footprints className="w-4 h-4 text-[#22C7A0]" />;
      case 'travel_commuting':
        return <Compass className="w-4 h-4 text-[#F59E0B]" />;
      case 'driving_conditions':
        return <Car className="w-4 h-4 text-[#7DD3FC]" />;
      case 'rain_protection':
        return <Umbrella className="w-4 h-4 text-[#818CF8]" />;
      case 'heat_exposure':
        return <Flame className="w-4 h-4 text-[#FCA5A5]" />;
      case 'uv_exposure':
        return <Sun className="w-4 h-4 text-[#FCD34D]" />;
      case 'thunderstorm_safety':
        return <CloudLightning className="w-4 h-4 text-[#EF4444]" />;
      case 'visibility_risk':
        return <Eye className="w-4 h-4 text-[#A78BFA]" />;
      case 'flood_waterlogging':
        return <Shield className="w-4 h-4 text-[#35C7E8]" />;
      case 'air_quality_exposure':
        return <HeartPulse className="w-4 h-4 text-[#6EE7B7]" />;
      default:
        return <Info className="w-4 h-4 text-[#8295A8]" />;
    }
  };

  return (
    <DataPanel id="weather-decision-center" className="space-y-4">
      <SectionHeading
        title="Operational Decision & Advisory Center"
        subtitle="Guidance computed strictly from available surface & forecast parameters"
        icon={<Compass className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-1 bg-[#08131F] p-1 rounded-lg border border-[#26394B]">
            <button
              type="button"
              onClick={() => setActiveTab('decision')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'decision'
                  ? 'bg-[#101F2E] text-[#F3F6FA] border border-[#38536A]'
                  : 'text-[#8295A8] hover:text-[#F3F6FA]'
              }`}
            >
              Action Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('travel')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'travel'
                  ? 'bg-[#101F2E] text-[#F3F6FA] border border-[#38536A]'
                  : 'text-[#8295A8] hover:text-[#F3F6FA]'
              }`}
            >
              Travel &amp; Roads
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-[#101F2E] text-[#F3F6FA] border border-[#38536A]'
                  : 'text-[#8295A8] hover:text-[#F3F6FA]'
              }`}
            >
              Health &amp; Exposure
            </button>
          </div>
        }
      />

      {activeTab === 'decision' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {decisions.map((item) => (
            <div
              key={item.key}
              id={`decision-card-${item.key}`}
              className="m-panel-inset p-3.5 flex flex-col justify-between gap-2.5 hover:border-[#38536A] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {getIconForCategory(item.key)}
                  <span className="text-xs font-bold text-[#F3F6FA] truncate">{item.label}</span>
                </div>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md uppercase border shrink-0 ${item.badgeColor}`}
                >
                  {item.status}
                </span>
              </div>

              <p className="text-xs text-[#B5C3D1] leading-relaxed">{item.recommendation}</p>

              <div className="pt-2 border-t border-[#26394B]/70 flex items-center justify-between text-[11px] text-[#8295A8]">
                <span className="truncate font-mono tabular-nums">
                  Basis: <strong className="text-[#F3F6FA] font-sans">{item.basisValue}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'travel' && (
        <div className="m-panel-inset p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#26394B] pb-2.5">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-[#35C7E8]" />
              <span className="text-xs font-bold text-[#F3F6FA] uppercase tracking-wider">
                Highway &amp; Commuter Conditions
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#6EE7B7] bg-[#22C7A0]/10 px-2.5 py-1 rounded-md border border-[#22C7A0]/30 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Window: <strong className="font-sans">{travel.bestTravelWindow}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { label: 'Road Surface', val: travel.roadCondition },
              { label: 'Visibility', val: travel.visibilityStatus },
              { label: 'Fog Status', val: travel.fogStatus },
              { label: 'Crosswinds', val: travel.windStatus },
              { label: 'Waterlogging', val: travel.floodRisk },
              { label: 'Convection', val: travel.thunderstormRisk },
            ].map((cell) => (
              <div key={cell.label} className="bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B]">
                <div className="text-[10px] text-[#8295A8] font-semibold uppercase">{cell.label}</div>
                <div className="text-xs font-bold text-[#F3F6FA] mt-0.5">{cell.val}</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B] text-xs text-[#B5C3D1] flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#F3F6FA]">Transit Directive: </strong>
              {travel.advisoryNote}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="m-panel-inset p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-[#26394B] pb-2.5">
            <HeartPulse className="w-4 h-4 text-[#EF4444]" />
            <span className="text-xs font-bold text-[#F3F6FA] uppercase tracking-wider">
              Health &amp; Physiological Stress Index
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#0B1927] p-3 rounded-lg border border-[#26394B] space-y-1">
              <div className="text-[10px] text-[#8295A8] font-bold uppercase">Heat Index</div>
              <div className="text-base font-bold font-mono tabular-nums text-[#FCA5A5]">
                {health.heatIndexC !== null ? `${health.heatIndexC}°C` : '—'}
                <span className="text-xs font-sans font-normal text-[#8295A8] ml-1.5">
                  ({health.heatStressCategory})
                </span>
              </div>
              <p className="text-[11px] text-[#8295A8] leading-tight">
                Perceived body load combining ambient temperature and relative humidity.
              </p>
            </div>

            <div className="bg-[#0B1927] p-3 rounded-lg border border-[#26394B] space-y-1">
              <div className="text-[10px] text-[#8295A8] font-bold uppercase">Humidex Discomfort</div>
              <div className="text-base font-bold font-mono tabular-nums text-[#FCD34D]">
                {health.humidexValue !== null ? health.humidexValue : '—'}
                <span className="text-xs font-sans font-normal text-[#8295A8] ml-1.5">
                  ({health.humidityDiscomfort})
                </span>
              </div>
              <p className="text-[11px] text-[#8295A8] leading-tight">
                Evaluates moisture load hindering evaporative cooling.
              </p>
            </div>

            <div className="bg-[#0B1927] p-3 rounded-lg border border-[#26394B] space-y-1">
              <div className="text-[10px] text-[#8295A8] font-bold uppercase">UV Solar Radiation</div>
              <div className="text-base font-bold font-mono tabular-nums text-[#C084FC]">
                {rawUv !== null ? rawUv.toFixed(1) : '—'}
                <span className="text-xs font-sans font-normal text-[#8295A8] ml-1.5">
                  ({health.uvRiskLevel})
                </span>
              </div>
              <p className="text-[11px] text-[#8295A8] leading-tight">
                Solar erythemal exposure index around midday hours.
              </p>
            </div>

            <div className="bg-[#0B1927] p-3 rounded-lg border border-[#26394B] space-y-1">
              <div className="text-[10px] text-[#8295A8] font-bold uppercase">Air Quality Exposure</div>
              <div className="text-base font-bold font-mono tabular-nums text-[#6EE7B7]">
                {rawAqi !== null ? `AQI ${rawAqi}` : 'AQI —'}
                <span className="text-xs font-sans font-normal text-[#8295A8] ml-1.5">
                  ({health.airQualityExposure})
                </span>
              </div>
              <p className="text-[11px] text-[#8295A8] leading-tight">
                {rawPm25 !== null ? `Fine particulate PM2.5 at ${rawPm25} µg/m³.` : 'PM2.5 telemetry unavailable.'}
              </p>
            </div>
          </div>

          <div className="text-[11px] text-[#8295A8] bg-[#0B1927] p-2.5 rounded-lg border border-[#26394B] flex flex-wrap items-center justify-between gap-2">
            <span>Guidance aligned with WHO and IMD physiological exposure thresholds.</span>
            <span className="text-[#35C7E8] font-mono shrink-0">Source: Open-Meteo &amp; CPCB Feeds</span>
          </div>
        </div>
      )}
    </DataPanel>
  );
};
