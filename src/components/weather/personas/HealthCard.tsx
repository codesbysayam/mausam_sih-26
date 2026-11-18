import React from 'react';
import { AuthoritativeAQI, AuthoritativePollen } from '../../../services/authoritativeService';
import { SourceStatus } from '../../ui/ObservatoryPrimitives';
import { HeartPulse, ShieldAlert } from 'lucide-react';

interface HealthCardProps {
  aqi: AuthoritativeAQI;
  pollen: AuthoritativePollen;
  uvIndex: number | null;
  uvRiskLabel: string;
  uvAdvice: string;
  humidity: number | null;
  ambientTemp?: number | null;
  city: string;
}

export const HealthCard: React.FC<HealthCardProps> = ({
  aqi,
  pollen,
  uvIndex,
  uvRiskLabel,
  uvAdvice,
  humidity,
  ambientTemp = null,
  city,
}) => {
  const aqiVal = typeof aqi?.aqi === 'number' && Number.isFinite(aqi.aqi) ? aqi.aqi : null;
  const pollenVal =
    typeof pollen?.overallIndex === 'number' && Number.isFinite(pollen.overallIndex)
      ? pollen.overallIndex
      : null;
  const uvVal = typeof uvIndex === 'number' && Number.isFinite(uvIndex) ? uvIndex : null;
  const humVal = typeof humidity === 'number' && Number.isFinite(humidity) ? Math.round(humidity) : null;
  const tempVal = typeof ambientTemp === 'number' && Number.isFinite(ambientTemp) ? ambientTemp : null;
  const dewPoint =
    tempVal !== null && humVal !== null ? Math.round(tempVal - (100 - humVal) / 5) : null;

  const aqiBadgeColor =
    aqiVal === null
      ? 'bg-[#08131F] text-[#8295A8] border-[#26394B]'
      : aqi.category === 'Good' || aqi.category === 'Satisfactory'
      ? 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35'
      : aqi.category === 'Moderate'
      ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
      : aqi.category === 'Poor'
      ? 'bg-[#F97316]/12 text-[#FDBA74] border-[#F97316]/35'
      : 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35';

  const uvBadgeColor =
    uvVal === null
      ? 'bg-[#08131F] text-[#8295A8] border-[#26394B]'
      : uvVal <= 2
      ? 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35'
      : uvVal <= 5
      ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
      : uvVal <= 7
      ? 'bg-[#F97316]/12 text-[#FDBA74] border-[#F97316]/35'
      : 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35';

  const pollenBadgeColor =
    pollenVal === null
      ? 'bg-[#08131F] text-[#8295A8] border-[#26394B]'
      : pollen.riskCategory === 'Low'
      ? 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35'
      : pollen.riskCategory === 'Moderate'
      ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
      : 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35';

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#26394B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] text-[#22C7A0] flex items-center justify-center border border-[#26394B]">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FA] uppercase tracking-wide">
                Health &amp; Environmental Air
              </h3>
              <p className="text-[11px] text-[#8295A8]">
                CPCB NAQI &amp; Aero-Allergen Feed • {city}
              </p>
            </div>
          </div>
          <SourceStatus status={aqiVal !== null ? 'LIVE' : 'UNAVAILABLE'} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 font-mono tabular-nums">
          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8]">CPCB AQI</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${aqiBadgeColor}`}>
                {aqiVal !== null ? aqi.category : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[#F3F6FA]">{aqiVal ?? '—'}</span>
              <span className="text-[10px] font-sans text-[#8295A8]">Index</span>
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1 truncate">
              Dominant: <strong className="text-[#F3F6FA]">{aqi?.dominantPollutant || '—'}</strong>
            </span>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8]">Pollen</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${pollenBadgeColor}`}>
                {pollenVal !== null ? pollen.riskCategory : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[#F3F6FA]">{pollenVal ?? '—'}</span>
              <span className="text-[10px] font-sans text-[#8295A8]">grains/m³</span>
            </div>
            <span className="text-[10px] text-[#8295A8] block mt-1 truncate">
              T: {pollen?.treePollen ?? '—'} • G: {pollen?.grassPollen ?? '—'}
            </span>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8]">UV Index</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${uvBadgeColor}`}>
                {uvVal !== null ? uvRiskLabel : '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[#F3F6FA]">
                {uvVal !== null ? uvVal.toFixed(1) : '—'}
              </span>
              <span className="text-[10px] text-[#8295A8]">/ 11+</span>
            </div>
            <span className="text-[10px] font-sans text-[#8295A8] block mt-1 truncate">
              {uvVal === null ? 'Unavailable' : uvVal >= 6 ? 'High Solar Flux' : 'Moderate Flux'}
            </span>
          </div>

          <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8]">Humidity</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0B72B9]/15 text-[#7DD3FC] border border-[#0B72B9]/35">
                {humVal === null ? '—' : humVal > 70 ? 'High' : humVal > 40 ? 'Normal' : 'Dry'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold text-[#F3F6FA]">{humVal ?? '—'}</span>
              <span className="text-[10px] text-[#8295A8]">% RH</span>
            </div>
            <span className="text-[10px] text-[#8295A8] block mt-1 truncate">
              Dew Pt: {dewPoint !== null ? `${dewPoint}°C` : '—'}
            </span>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#22C7A0] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="text-[#F3F6FA]">
              <strong>Health Guidance:</strong> {aqi?.healthAdvice || 'No special health advisories.'}
            </p>
            <p className="text-[11px] text-[#8295A8]">
              <strong>Allergy:</strong> {pollen?.allergyTip || 'Unavailable'} • <strong>UV:</strong> {uvAdvice}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#26394B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[#8295A8]">
        <span>Source: <strong className="text-[#B5C3D1]">{aqi?.source || 'CPCB & Open-Meteo Air Quality'}</strong></span>
        <span className="font-mono">
          {aqi?.lastUpdated
            ? `${new Date(aqi.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST`
            : '—'}
        </span>
      </div>
    </div>
  );
};
