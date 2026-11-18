import React from 'react';
import { CloudRain, Thermometer, Wind, AlertTriangle, Activity, ShieldCheck, Navigation } from 'lucide-react';
import { CurrentWeather, LocationRecord, WeatherAlert } from '../../types';
import { WeatherDataBundle } from '../../services/weatherService';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface HomeWhatsHappeningNowProps {
  weatherBundle?: WeatherDataBundle | null;
  selectedLocation: LocationRecord;
  lastUpdated?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const HomeWhatsHappeningNow: React.FC<HomeWhatsHappeningNowProps> = ({
  weatherBundle,
  selectedLocation,
  lastUpdated,
}) => {
  const current = weatherBundle?.current;

  const locationCity = selectedLocation.city;
  const locationState = selectedLocation.state;
  const locationDisplay = selectedLocation.displayName || `${locationCity}, ${locationState}`;

  // 1. RAIN Telemetry & Status (null-safe)
  const rawPrecip = current?.precipitation ?? current?.precipitationMm;
  const hasPrecip = typeof rawPrecip === 'number' && Number.isFinite(rawPrecip);
  const precipMm = hasPrecip ? rawPrecip : null;
  const isRaining = current?.isRainingNow || (precipMm !== null && precipMm > 0);

  let rainLabel = 'Precipitation telemetry awaiting upstream sync';
  let rainDetail = 'Surface gauge or model grid has not reported precipitation yet';

  if (precipMm !== null) {
    if (precipMm > 35.5) {
      rainLabel = `Very heavy rainfall (${precipMm.toFixed(1)} mm/h)`;
      rainDetail = 'Extreme convective downpour recorded';
    } else if (precipMm >= 7.6) {
      rainLabel = `Heavy rainfall (${precipMm.toFixed(1)} mm/h)`;
      rainDetail = 'Active convective downpour in progress';
    } else if (precipMm >= 2.5) {
      rainLabel = `Moderate rainfall (${precipMm.toFixed(1)} mm/h)`;
      rainDetail = 'Steady precipitation active';
    } else if (precipMm > 0) {
      rainLabel = `Light rain / drizzle (${precipMm.toFixed(1)} mm/h)`;
      rainDetail = 'Active precipitation detected';
    } else {
      rainLabel = 'No rain currently observed';
      if (typeof current?.rainfallLast1h === 'number' && current.rainfallLast1h > 0) {
        rainDetail = `Recent 1h accumulation: ${current.rainfallLast1h.toFixed(1)} mm`;
      } else if (typeof current?.rainfallLast24h === 'number' && current.rainfallLast24h > 0) {
        rainDetail = `Past 24h accumulation: ${current.rainfallLast24h.toFixed(1)} mm`;
      } else {
        rainDetail = 'Zero surface precipitation at station grid';
      }
    }
  }

  // 2. TEMPERATURE Telemetry & Status
  const hasTemp = typeof current?.temp === 'number' && Number.isFinite(current.temp);
  const tempVal = hasTemp ? `${(current!.temp as number).toFixed(1)}°C` : '—';
  let tempDetail = 'Awaiting station thermal telemetry';
  if (hasTemp) {
    const t = current!.temp as number;
    const feels =
      typeof current?.feelsLike === 'number' && Number.isFinite(current.feelsLike)
        ? `Feels like ${current.feelsLike.toFixed(1)}°C`
        : '';
    const desc =
      t >= 42 ? 'Severe heatwave conditions' :
      t >= 38 ? 'Heatwave conditions' :
      t >= 32 ? 'Warm tropical thermal load' :
      t >= 25 ? 'Mild ambient temperatures' :
      t >= 16 ? 'Moderate seasonal conditions' :
      t >= 8 ? 'Cool temperatures' : 'Cold wave conditions';

    tempDetail = feels ? `${desc} · ${feels}` : desc;
  }

  // 3. WIND Telemetry & Status
  const hasWind = typeof current?.windSpeed === 'number' && Number.isFinite(current.windSpeed);
  const windSpeedStr = hasWind ? `${(current!.windSpeed as number).toFixed(1)} km/h` : '—';
  const windDir = current?.windDirection || 'Variable';
  let windDetail = 'Wind telemetry unavailable';
  if (hasWind) {
    const ws = current!.windSpeed as number;
    const gusts =
      typeof current?.windGusts === 'number' && Number.isFinite(current.windGusts) && current.windGusts > ws
        ? ` · Gusts ${current.windGusts.toFixed(1)} km/h`
        : '';
    const speedType =
      ws > 50 ? 'Gale force / squally' :
      ws > 30 ? 'Strong breezy flow' :
      ws > 15 ? 'Moderate breeze' :
      ws > 5 ? 'Gentle breeze' : 'Calm surface air';
    windDetail = `From ${windDir} · ${speedType}${gusts}`;
  }

  // 4. ACTIVE WARNINGS
  const allAlerts: WeatherAlert[] = weatherBundle?.alerts || [];
  const localAlert = allAlerts.find((a) => {
    const districts = (a.affectedDistricts || []).join(' ').toLowerCase();
    const area = (a.affectedArea || '').toLowerCase();
    const target = `${a.title} ${a.description} ${districts} ${area}`.toLowerCase();
    const cityLow = locationCity.toLowerCase();
    const stateLow = locationState.toLowerCase();
    const distLow = (selectedLocation.district || '').toLowerCase();
    return target.includes(cityLow) || (distLow && target.includes(distLow)) || (stateLow !== 'all india' && target.includes(stateLow));
  });

  const hasWarning = !!localAlert && localAlert.severity !== 'info';
  const warningLabel = localAlert
    ? `${localAlert.severity.toUpperCase()}: ${localAlert.title}`
    : 'No active local hazard warning';
  const warningDetail = localAlert
    ? `${locationCity} zone · ${localAlert.actionItem || 'Advisory in force'}`
    : 'Surface parameters within nominal thresholds';

  // 5. AIR QUALITY (NAQI)
  const aqiVal = current?.aqiIndex ?? current?.aqi;
  const hasAqi = typeof aqiVal === 'number' && Number.isFinite(aqiVal);
  let aqiLabel = 'Air quality unavailable';
  let aqiDetail = 'Awaiting CPCB / CAAQMS particulate sync';

  if (hasAqi) {
    const aqiNum = Math.round(aqiVal as number);
    const category =
      current?.aqiStatus ||
      (aqiNum <= 50 ? 'Good' :
       aqiNum <= 100 ? 'Satisfactory' :
       aqiNum <= 200 ? 'Moderate' :
       aqiNum <= 300 ? 'Poor' :
       aqiNum <= 400 ? 'Very Poor' : 'Severe');

    const dominant =
      typeof current?.aqiPm25 === 'number' && Number.isFinite(current.aqiPm25)
        ? `PM2.5: ${Math.round(current.aqiPm25)} µg/m³`
        : typeof current?.aqiPm10 === 'number' && Number.isFinite(current.aqiPm10)
        ? `PM10: ${Math.round(current.aqiPm10)} µg/m³`
        : 'Standard particulates';

    aqiLabel = `AQI ${aqiNum} — ${category}`;
    aqiDetail = `${dominant} · NAQI Standard`;
  }

  // Synthesized Operational Summary
  let smartSummary = 'Waiting for synchronized station telemetry to compile a local operational brief.';
  if (hasTemp && hasWind) {
    const rainSnippet =
      precipMm !== null
        ? isRaining
          ? `Active rainfall (${precipMm.toFixed(1)} mm/h) observed`
          : 'Dry surface conditions prevailing'
        : 'Surface temperature and wind active';
    const t = current!.temp as number;
    const ws = current!.windSpeed as number;
    const tempSnippet = t > 32 ? 'warm thermal load' : t > 22 ? 'mild ambient temperatures' : 'cool conditions';
    const windSnippet = ws > 20 ? 'elevated gusty winds' : 'gentle surface flow';
    const aqiSnippet = hasAqi && current?.aqiStatus ? ` with ${current.aqiStatus.toLowerCase()} air quality` : '';
    smartSummary = `${rainSnippet} across ${locationCity} with ${tempSnippet} (${tempVal}) and ${windSnippet} from ${windDir}${aqiSnippet}.`;
  }

  const status: CurrentWeather['observationStatus'] =
    current?.observationStatus || (current?.isLive ? 'LIVE' : hasTemp ? 'RECENT' : 'UNAVAILABLE');

  const stationSource =
    current?.observationSource ||
    (selectedLocation.imdStation ? `IMD Station (${selectedLocation.imdStation})` : 'Surface Telemetry Grid');

  const displayTime = lastUpdated || current?.lastUpdated || null;

  return (
    <DataPanel id="whats-happening-now-panel" className="flex flex-col justify-between gap-3">
      <div className="flex flex-col gap-3">
        <SectionHeading
          title="Current Field Brief"
          subtitle={`Operational summary for ${locationDisplay}`}
          action={<SourceStatus status={status} updatedAt={displayTime} />}
        />

        {/* Compact Metric List */}
        <div className="space-y-2 text-xs">
          <div
            className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
              isRaining
                ? 'bg-[#0B72B9]/12 border-[#35C7E8]/40'
                : 'm-panel-inset'
            }`}
          >
            <CloudRain className={`w-4 h-4 shrink-0 mt-0.5 ${isRaining ? 'text-[#35C7E8]' : 'text-[#8295A8]'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8295A8]">Rainfall</span>
                <span className="font-mono font-bold text-[#F3F6FA] tabular-nums">
                  {precipMm !== null ? `${precipMm.toFixed(1)} mm` : '—'}
                </span>
              </div>
              <p className="text-[#F3F6FA] font-medium mt-0.5">{rainLabel}</p>
              <p className="text-[11px] text-[#8295A8] mt-0.5 truncate">{rainDetail}</p>
            </div>
          </div>

          <div className="m-panel-inset p-2.5 flex items-start gap-2.5">
            <Thermometer className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8295A8]">Thermal Load</span>
                <span className="font-mono font-bold text-[#F59E0B] tabular-nums">{tempVal}</span>
              </div>
              <p className="text-[#F3F6FA] font-medium mt-0.5">{tempDetail}</p>
            </div>
          </div>

          <div className="m-panel-inset p-2.5 flex items-start gap-2.5">
            <Wind className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8295A8]">Wind Vector</span>
                <span className="font-mono font-bold text-[#F3F6FA] tabular-nums">{windSpeedStr}</span>
              </div>
              <p className="text-[#F3F6FA] font-medium mt-0.5">{windDetail}</p>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
              hasWarning ? 'bg-[#EF4444]/10 border-[#EF4444]/40' : 'm-panel-inset'
            }`}
          >
            {hasWarning ? (
              <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#22C7A0] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8295A8]">Warning Status</span>
                {hasWarning && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EF4444] text-white">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className={`font-semibold mt-0.5 ${hasWarning ? 'text-[#FCA5A5]' : 'text-[#F3F6FA]'}`}>
                {warningLabel}
              </p>
              <p className="text-[11px] text-[#8295A8] mt-0.5 truncate">{warningDetail}</p>
            </div>
          </div>

          <div className="m-panel-inset p-2.5 flex items-start gap-2.5">
            <Activity className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#8295A8]">Air Quality (NAQI)</span>
                <span className="font-mono font-bold text-[#F3F6FA] tabular-nums">
                  {hasAqi ? Math.round(aqiVal as number) : '—'}
                </span>
              </div>
              <p className="text-[#F3F6FA] font-medium mt-0.5">{aqiLabel}</p>
              <p className="text-[11px] text-[#8295A8] mt-0.5 truncate">{aqiDetail}</p>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#08131F] border border-[#26394B] text-xs text-[#B5C3D1] leading-relaxed">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#35C7E8] block mb-0.5">
            Meteorological Synthesis
          </span>
          {smartSummary}
        </div>
      </div>

      {/* Truthful Footer Provenance */}
      <div className="pt-2.5 border-t border-[#26394B] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8295A8]">
        <div className="flex items-center gap-1.5 truncate max-w-[300px]" title={stationSource}>
          <Navigation className="w-3.5 h-3.5 text-[#35C7E8] shrink-0" />
          <span className="truncate">Source: {stationSource}</span>
        </div>
        <span className="font-mono text-[10px] text-[#B5C3D1]">
          Feed: {status}
        </span>
      </div>
    </DataPanel>
  );
};

