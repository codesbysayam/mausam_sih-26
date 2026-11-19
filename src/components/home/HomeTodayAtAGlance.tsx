import React from 'react';
import { CurrentWeather, DailyForecastItem } from '../../types';
import {
  Thermometer,
  CloudRain,
  Wind,
  Droplets,
  Sun,
  Eye,
  Gauge,
  Compass,
  ArrowUp,
  ArrowDown,
  Activity,
} from 'lucide-react';
import { getAqiMeaning, getHumidityMeaning, getRainProbabilityMeaning, getWindMeaning } from '../../services/humanWeatherEngine';

interface HomeTodayAtAGlanceProps {
  weather: CurrentWeather;
  todayForecast?: DailyForecastItem;
}

export const HomeTodayAtAGlance: React.FC<HomeTodayAtAGlanceProps> = ({
  weather,
  todayForecast,
}) => {
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

  const currentTemp = isNum(weather.temp) ? Math.round(weather.temp) : null;
  const highTemp = isNum(todayForecast?.high)
    ? Math.round(todayForecast.high)
    : isNum(weather.high)
    ? Math.round(weather.high)
    : null;
  const lowTemp = isNum(todayForecast?.low)
    ? Math.round(todayForecast.low)
    : isNum(weather.low)
    ? Math.round(weather.low)
    : null;
  const tempSpan = highTemp !== null && lowTemp !== null ? highTemp - lowTemp : null;

  const humidity = isNum(weather.humidity) ? Math.round(weather.humidity) : null;
  const windSpeed = isNum(weather.windSpeed) ? Math.round(weather.windSpeed) : null;
  const rainProb = isNum(weather.precipitationProbability) ? Math.round(weather.precipitationProbability) : null;
  const windDeg = isNum(weather.windDirectionDeg) ? Math.round(weather.windDirectionDeg) : null;
  const gustSpeed = isNum(weather.windGusts) ? Math.round(weather.windGusts) : null;
  const precipMm = isNum(weather.precipitationMm)
    ? weather.precipitationMm
    : isNum(weather.precipitation)
    ? weather.precipitation
    : null;

  const aqiVal: number | null =
    isNum(weather.aqi) && weather.aqi > 0
      ? Math.round(weather.aqi)
      : null;
  const uvVal = isNum(weather.uvIndex) ? weather.uvIndex : null;
  const pressure = isNum(weather.pressure) ? weather.pressure : null;
  const visibility = isNum(weather.visibility) ? weather.visibility : null;
  const dewPoint = isNum(weather.dewPoint)
    ? Math.round(weather.dewPoint)
    : currentTemp !== null && humidity !== null
    ? Math.round(currentTemp - (100 - humidity) / 5)
    : null;

  const aqiInfo = aqiVal !== null
    ? getAqiMeaning(aqiVal)
    : { category: 'Unavailable', severityColor: '#93A4B8' };
  const humidityInfo = humidity !== null
    ? getHumidityMeaning(humidity)
    : { headline: 'Unavailable' };
  const windInfo = windSpeed !== null
    ? getWindMeaning(windSpeed, weather.windDirection || '—')
    : { headline: 'Unavailable' };
  const rainInfo = rainProb !== null
    ? getRainProbabilityMeaning(rainProb)
    : { headline: 'Unavailable' };

  return (
    <section id="homepage-today-at-a-glance" className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1499E8]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#F4F7FA]">
            Today at a Glance
          </h2>
        </div>
        <p className="text-xs text-[#93A4B8]">
          Everything important about your atmosphere, in one view.
        </p>
      </div>

      {/* Visual Composition Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Thermal Trajectory & Temperature Range */}
        <div className="rounded-2xl bg-[#0B141E] border border-[#162331] p-5 flex flex-col justify-between gap-3 hover:border-[#1499E8]/30 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FF9F43]/15 text-[#FF9F43] flex items-center justify-center">
                <Thermometer className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F7FA]">
                Temperature &amp; Range
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#93A4B8]">
              {tempSpan !== null ? `Span ${tempSpan}°C` : 'Span —'}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div>
              <span className="text-3xl font-light text-[#F4F7FA] tracking-tight">
                {currentTemp !== null ? `${currentTemp}°C` : '—'}
              </span>
              <span className="text-xs text-[#93A4B8] block mt-0.5">Current surface temp</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 bg-[#071018] px-2.5 py-1 rounded-lg border border-[#162331]">
                <ArrowUp className="w-3.5 h-3.5 text-[#EF5350]" />
                <span className="text-[#93A4B8]">High</span>
                <strong className="text-[#F4F7FA]">{highTemp !== null ? `${highTemp}°` : '—'}</strong>
              </div>
              <div className="flex items-center gap-1 bg-[#071018] px-2.5 py-1 rounded-lg border border-[#162331]">
                <ArrowDown className="w-3.5 h-3.5 text-[#43C7F4]" />
                <span className="text-[#93A4B8]">Low</span>
                <strong className="text-[#F4F7FA]">{lowTemp !== null ? `${lowTemp}°` : '—'}</strong>
              </div>
            </div>
          </div>

          {/* Mini thermal range indicator bar */}
          <div>
            <div className="w-full h-2 bg-[#162331] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-[#43C7F4] via-[#FFC857] to-[#EF5350] rounded-full"
                style={{ width: currentTemp !== null ? '100%' : '0%' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#93A4B8] mt-1.5 font-mono">
              <span>Min {lowTemp !== null ? `${lowTemp}°C` : '—'}</span>
              <span className="text-[#D1DCE8]">{currentTemp !== null ? 'Diurnal cycle' : 'Awaiting telemetry'}</span>
              <span>Max {highTemp !== null ? `${highTemp}°C` : '—'}</span>
            </div>
          </div>
        </div>

        {/* 2. Precipitation Risk & Hydrometeors */}
        <div className="rounded-2xl bg-[#0B141E] border border-[#162331] p-5 flex flex-col justify-between gap-3 hover:border-[#1499E8]/30 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1499E8]/15 text-[#43C7F4] flex items-center justify-center">
                <CloudRain className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F7FA]">
                Precipitation Probability
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#43C7F4]">
              {rainInfo.headline}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div>
              <span className="text-3xl font-light text-[#43C7F4] tracking-tight">
                {rainProb !== null ? `${rainProb}%` : '—'}
              </span>
              <span className="text-xs text-[#93A4B8] block mt-0.5">Precipitation potential</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[#F4F7FA] block">
                {rainProb === null ? 'Unavailable' : rainProb >= 50 ? 'Intermittent Showers' : 'Dry Intervals'}
              </span>
              <span className="text-[11px] text-[#93A4B8]">
                Observed: {precipMm !== null ? `${precipMm} mm` : '—'}
              </span>
            </div>
          </div>

          {/* Horizontal probability bar */}
          <div>
            <div className="w-full h-2 bg-[#162331] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1499E8] to-[#43C7F4] transition-all duration-500 rounded-full"
                style={{ width: `${rainProb !== null ? Math.max(5, rainProb) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#93A4B8] mt-1.5 font-mono">
              <span>0% None</span>
              <span>50% Moderate</span>
              <span>100% Guaranteed</span>
            </div>
          </div>
        </div>

        {/* 3. Wind Vector & Surface Aerodynamics */}
        <div className="rounded-2xl bg-[#0B141E] border border-[#162331] p-5 flex flex-col justify-between gap-3 hover:border-[#1499E8]/30 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#22C7A0]/15 text-[#22C7A0] flex items-center justify-center">
                <Wind className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F7FA]">
                Wind &amp; Gust Profile
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#22C7A0]">
              {windInfo.headline}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div>
              <span className="text-3xl font-light text-[#F4F7FA] tracking-tight">
                {windSpeed !== null ? windSpeed : '—'}{' '}
                {windSpeed !== null && <span className="text-base font-normal text-[#93A4B8]">km/h</span>}
              </span>
              <span className="text-xs text-[#93A4B8] block mt-0.5">
                Direction:{' '}
                <strong className="text-[#F4F7FA] font-medium">
                  {weather.windDirection || '—'}
                  {windDeg !== null ? ` (${windDeg}°)` : ''}
                </strong>
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#071018] border border-[#162331] flex items-center justify-center text-[#22C7A0]">
              <Compass className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#93A4B8] pt-2 border-t border-[#162331]">
            <span>Gusts: <strong className="text-[#F4F7FA] font-mono">{gustSpeed !== null ? `${gustSpeed} km/h` : '—'}</strong></span>
            <span>{windSpeed === null ? 'Telemetry unavailable' : windSpeed >= 20 ? 'Fresh Breeze' : windSpeed >= 12 ? 'Gentle Breeze' : 'Light Air'}</span>
          </div>
        </div>

        {/* 4. Air Quality & National AQI */}
        <div className="rounded-2xl bg-[#0B141E] border border-[#162331] p-5 flex flex-col justify-between gap-3 hover:border-[#1499E8]/30 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFC857]/15 text-[#FFC857] flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F7FA]">
                National AQI
              </span>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${aqiInfo.severityColor}15`,
                color: aqiInfo.severityColor,
                borderColor: `${aqiInfo.severityColor}40`,
              }}
            >
              {aqiInfo.category}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-1 tabular-nums">
            <div>
              <span className="text-3xl font-light tracking-tight" style={{ color: aqiInfo.severityColor }}>
                {aqiVal !== null ? aqiVal : '—'}
              </span>
              <span className="text-xs text-[#93A4B8] block mt-0.5">PM2.5 Primary Pollutant</span>
            </div>
            <div className="text-right text-xs text-[#93A4B8]">
              <div>PM2.5: <strong className="text-[#F4F7FA]">{isNum(weather.aqiPm25) ? `${Math.round(weather.aqiPm25)} µg/m³` : '—'}</strong></div>
              <div>PM10: <strong className="text-[#F4F7FA]">{isNum(weather.aqiPm10) ? `${Math.round(weather.aqiPm10)} µg/m³` : '—'}</strong></div>
            </div>
          </div>

          <div className="w-full bg-[#162331] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${aqiVal !== null ? Math.min(100, (aqiVal / 300) * 100) : 0}%`,
                backgroundColor: aqiInfo.severityColor,
              }}
            />
          </div>
        </div>

        {/* 5. Relative Humidity & Dew Point */}
        <div className="rounded-2xl bg-[#0B141E] border border-[#162331] p-5 flex flex-col justify-between gap-3 hover:border-[#1499E8]/30 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1499E8]/15 text-[#43C7F4] flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F7FA]">
                Humidity &amp; Dew Point
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#D1DCE8]">
              {humidityInfo.headline}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div>
              <span className="text-3xl font-light text-[#F4F7FA] tracking-tight">
                {humidity !== null ? `${humidity}%` : '—'}
              </span>
              <span className="text-xs text-[#93A4B8] block mt-0.5">Relative moisture content</span>
            </div>
            <div className="text-right text-xs">
              <span className="text-[#93A4B8] block">Dew Point</span>
              <strong className="text-[#43C7F4] text-base font-semibold">
                {dewPoint !== null ? `${dewPoint}°C` : '—'}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#93A4B8] pt-2 border-t border-[#162331]">
            <span>
              Air Vapor Saturation:{' '}
              {humidity === null ? '—' : humidity >= 80 ? 'Heavy' : humidity >= 60 ? 'Moderate' : 'Dry'}
            </span>
            <span>Comfort: {humidity === null ? '—' : humidity <= 65 ? 'Optimal' : 'Muggy'}</span>
          </div>
        </div>

        {/* 6. Solar UV Index & Optical Visibility */}
        <div className="rounded-2xl bg-[#0B141E] border border-[#162331] p-5 flex flex-col justify-between gap-3 hover:border-[#1499E8]/30 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFC857]/15 text-[#FFC857] flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F7FA]">
                UV &amp; Optical Visibility
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#FFC857]">
              {uvVal === null ? 'Unavailable' : uvVal >= 8 ? 'Very High' : uvVal >= 6 ? 'High' : 'Moderate'}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-1 tabular-nums">
            <div>
              <span className="text-3xl font-light text-[#FFC857] tracking-tight">{uvVal ?? '—'}</span>
              <span className="text-xs text-[#93A4B8] block mt-0.5">/ 11+ Index (Solar Noon Peak)</span>
            </div>
            <div className="text-right text-xs">
              <div className="flex items-center gap-1 justify-end text-[#D1DCE8]">
                <Eye className="w-3.5 h-3.5 text-[#22C7A0]" />
                <span>{visibility !== null ? `${visibility} km` : '—'} Visibility</span>
              </div>
              <div className="flex items-center gap-1 justify-end text-[#93A4B8] mt-0.5">
                <Gauge className="w-3.5 h-3.5 text-[#1499E8]" />
                <span>{pressure !== null ? `${pressure} hPa` : '—'} Pressure</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#93A4B8] pt-2 border-t border-[#162331]">
            <span>Peak UV Window: 11:30 AM – 2:30 PM</span>
            <span>{pressure !== null ? 'Barometer Active' : 'Barometer Unavailable'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
