import React from 'react';
import { CurrentWeather, DailyForecastItem } from '../../types';
import { Sparkles, Car, Bike, HeartPulse, SunMedium } from 'lucide-react';
import { getAqiMeaning } from '../../services/humanWeatherEngine';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

interface HomeWeatherInsightProps {
  weather: CurrentWeather;
  todayForecast?: DailyForecastItem;
}

export const HomeWeatherInsight: React.FC<HomeWeatherInsightProps> = ({
  weather,
}) => {
  const currentTemp =
    typeof weather.temp === 'number' && Number.isFinite(weather.temp) ? Math.round(weather.temp) : null;
  const humidity =
    typeof weather.humidity === 'number' && Number.isFinite(weather.humidity) ? Math.round(weather.humidity) : null;
  const rainProb =
    typeof weather.precipitationProbability === 'number' && Number.isFinite(weather.precipitationProbability)
      ? Math.round(weather.precipitationProbability)
      : null;
  const uvIndex =
    typeof weather.uvIndex === 'number' && Number.isFinite(weather.uvIndex) ? weather.uvIndex : null;
  const aqi: number | null =
    typeof weather.aqi === 'number' && Number.isFinite(weather.aqi)
      ? Math.round(weather.aqi)
      : typeof weather.aqiIndex === 'number' && Number.isFinite(weather.aqiIndex)
      ? Math.round(weather.aqiIndex)
      : null;
  const aqiInfo = aqi !== null ? getAqiMeaning(aqi) : null;

  const commuteInsight =
    rainProb !== null && rainProb >= 60
      ? 'Wet tarmac and reduced braking traction likely. Allow 10–15 min extra travel time.'
      : currentTemp !== null && currentTemp >= 36
      ? 'Elevated cabin heat load expected; check vehicle cooling and hydration.'
      : currentTemp === null && rainProb === null
      ? 'Awaiting surface weather telemetry for commute guidance.'
      : 'Road surfaces clear and visibility nominal for urban transit.';

  const fitnessInsight =
    aqi !== null && aqi > 150
      ? 'Particulate concentration unfavorable for heavy cardio. Prefer indoor exercise.'
      : rainProb !== null && rainProb >= 70
      ? 'Showers may interrupt outdoor sessions. Monitor short-range radar before departure.'
      : currentTemp !== null && currentTemp >= 32
      ? 'Hydrate thoroughly; cooler outdoor training windows are before 7:30 AM or after 6:00 PM.'
      : currentTemp === null && aqi === null
      ? 'Awaiting air quality and thermal telemetry.'
      : 'Favorable ambient thermal conditions for outdoor movement.';

  const healthInsight = aqiInfo?.healthImpact
    ? aqiInfo.healthImpact
    : humidity !== null && humidity >= 80
    ? 'High relative moisture may increase heat strain and indoor mold triggers. Maintain ventilation.'
    : 'Awaiting upstream particulate and humidity telemetry for respiratory risk guidance.';

  const solarInsight =
    uvIndex === null
      ? 'UV irradiance reading currently unavailable.'
      : uvIndex >= 7
      ? 'High UV radiation index. Broad-spectrum SPF 30+ and eye protection advised between 11:00 AM and 3:00 PM.'
      : 'Moderate solar radiation intensity. Standard sun precautions apply during peak midday.';

  return (
    <DataPanel id="homepage-weather-insights" className="flex flex-col gap-4">
      <SectionHeading
        title="Operational Guidance"
        subtitle="Condition-driven interpretation derived strictly from observed telemetry"
        icon={<Sparkles className="w-4 h-4 text-[#F59E0B]" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#35C7E8]">
            <Car className="w-4 h-4" />
            <span>Commute &amp; Travel</span>
          </div>
          <p className="text-xs text-[#B5C3D1] leading-relaxed">{commuteInsight}</p>
          <span className="text-[11px] font-mono text-[#8295A8] pt-2 border-t border-[#26394B]">
            Surface: {rainProb === null ? '—' : rainProb >= 50 ? 'Wet / Damp' : 'Dry'}
          </span>
        </div>

        <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#22C7A0]">
            <Bike className="w-4 h-4" />
            <span>Fitness &amp; Outdoors</span>
          </div>
          <p className="text-xs text-[#B5C3D1] leading-relaxed">{fitnessInsight}</p>
          <span className="text-[11px] font-mono text-[#8295A8] pt-2 border-t border-[#26394B]">
            Exertion: {currentTemp === null ? '—' : currentTemp >= 35 ? 'Caution' : 'Nominal'}
          </span>
        </div>

        <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
          <div
            className="flex items-center gap-2 text-xs font-semibold"
            style={{ color: aqiInfo ? aqiInfo.severityColor : '#8295A8' }}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Respiratory Health</span>
          </div>
          <p className="text-xs text-[#B5C3D1] leading-relaxed">{healthInsight}</p>
          <span className="text-[11px] font-mono text-[#8295A8] pt-2 border-t border-[#26394B] tabular-nums">
            {aqi !== null && aqiInfo ? `AQI ${aqi} · ${aqiInfo.category}` : 'AQI Unavailable'}
          </span>
        </div>

        <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F59E0B]">
            <SunMedium className="w-4 h-4" />
            <span>Solar Protection</span>
          </div>
          <p className="text-xs text-[#B5C3D1] leading-relaxed">{solarInsight}</p>
          <span className="text-[11px] font-mono text-[#8295A8] pt-2 border-t border-[#26394B] tabular-nums">
            {uvIndex !== null ? `UV Index ${uvIndex.toFixed(1)}` : 'UV Unavailable'}
          </span>
        </div>
      </div>
    </DataPanel>
  );
};

