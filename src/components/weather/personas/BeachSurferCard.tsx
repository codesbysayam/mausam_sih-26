import React from 'react';
import { AuthoritativeTide, AuthoritativeMarine } from '../../../services/authoritativeService';
import { UnavailableState } from '../../ui/ObservatoryPrimitives';
import { Waves, Anchor } from 'lucide-react';

interface BeachSurferCardProps {
  isCoastal: boolean;
  tides: AuthoritativeTide | null;
  marine: AuthoritativeMarine | null;
  city: string;
}

export const BeachSurferCard: React.FC<BeachSurferCardProps> = ({
  isCoastal,
  tides,
  marine,
  city,
}) => {
  const surfBadgeColor =
    !marine
      ? 'bg-[#08131F] text-[#8295A8] border-[#26394B]'
      : marine.surfCondition === 'Calm & Safe'
      ? 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35'
      : marine.surfCondition === 'Moderate Swell'
      ? 'bg-[#0B72B9]/15 text-[#7DD3FC] border-[#0B72B9]/35'
      : marine.surfCondition === 'Rough Waves'
      ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
      : 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35';

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#26394B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] text-[#35C7E8] flex items-center justify-center border border-[#26394B]">
              <Waves className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FA] uppercase tracking-wide">
                Beach, Surf &amp; Maritime
              </h3>
              <p className="text-[11px] text-[#8295A8]">
                Coastal Marine Hydrodynamics • {city}
              </p>
            </div>
          </div>
          {isCoastal ? (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${surfBadgeColor}`}>
              {marine?.surfCondition || 'Unavailable'}
            </span>
          ) : (
            <span className="text-[10px] font-mono bg-[#0B1927] text-[#8295A8] px-2 py-0.5 rounded border border-[#26394B]">
              Inland Sector
            </span>
          )}
        </div>

        {!isCoastal ? (
          <div className="mt-4 p-4 rounded-lg bg-[#0B1927] border border-[#26394B] text-center">
            <Waves className="w-7 h-7 text-[#8295A8] mx-auto" />
            <p className="text-xs text-[#B5C3D1] mt-2 leading-relaxed">
              {city} is an inland station. Marine swell, wave period, and sea-surface temperature telemetry apply only to coastal districts (e.g. Mumbai, Puri, Paradip, Chennai, Kochi, Visakhapatnam).
            </p>
          </div>
        ) : !marine && !tides ? (
          <div className="mt-4">
            <UnavailableState
              title="Coastal Marine Feed Unavailable"
              reason="Real-time wave buoy and hydrographic tide observations are currently unavailable for this coastal sector."
              source="Open-Meteo Marine"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 font-mono tabular-nums">
              <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8]">High Tide</span>
                  <span className="text-[10px] text-[#6EE7B7] font-bold">
                    {tides?.nextHighTide ? 'Flood' : '—'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-base font-bold text-[#F3F6FA]">
                    {tides?.nextHighTide?.time || 'Unavailable'}
                  </span>
                </div>
                <span className="text-[10px] text-[#35C7E8] block mt-1">
                  {tides?.nextHighTide?.heightMeters !== undefined
                    ? `Peak: +${tides.nextHighTide.heightMeters} m`
                    : 'Requires tide gauge'}
                </span>
              </div>

              <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8]">Low Tide</span>
                  <span className="text-[10px] text-[#FCD34D] font-bold">
                    {tides?.nextLowTide ? 'Ebb' : '—'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-base font-bold text-[#F3F6FA]">
                    {tides?.nextLowTide?.time || 'Unavailable'}
                  </span>
                </div>
                <span className="text-[10px] text-[#8295A8] block mt-1">
                  {tides?.nextLowTide?.heightMeters !== undefined
                    ? `Low: +${tides.nextLowTide.heightMeters} m`
                    : 'Requires tide gauge'}
                </span>
              </div>

              <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
                <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8] block">
                  Wave Height
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-[#F3F6FA]">
                    {typeof marine?.waveHeightMeters === 'number' ? marine.waveHeightMeters : '—'}
                  </span>
                  {typeof marine?.waveHeightMeters === 'number' && (
                    <span className="text-[10px] font-sans text-[#8295A8]">m</span>
                  )}
                </div>
                <span className="text-[10px] text-[#8295A8] block mt-1">
                  Period: {typeof marine?.wavePeriodSeconds === 'number' ? `${marine.wavePeriodSeconds}s` : '—'}
                </span>
              </div>

              <div className="p-3 bg-[#0B1927] rounded-lg border border-[#26394B]">
                <span className="text-[10px] font-sans uppercase font-bold text-[#8295A8] block">
                  Water Temp (SST)
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-[#22C7A0]">
                    {typeof marine?.seaSurfaceTemperatureC === 'number'
                      ? marine.seaSurfaceTemperatureC
                      : '—'}
                  </span>
                  {typeof marine?.seaSurfaceTemperatureC === 'number' && (
                    <span className="text-[10px] text-[#8295A8]">°C</span>
                  )}
                </div>
                <span className="text-[10px] font-sans text-[#8295A8] block mt-1">Sea Surface Temp</span>
              </div>
            </div>

            {marine?.marineAdvisory && (
              <div className="mt-3.5 p-3 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-start gap-2.5">
                <Anchor className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
                <p className="text-xs text-[#B5C3D1]">
                  <strong className="text-[#F3F6FA]">Marine Advisory:</strong> {marine.marineAdvisory}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#26394B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[#8295A8]">
        <span>Source: <strong className="text-[#B5C3D1]">{marine?.source || tides?.source || 'Open-Meteo Marine'}</strong></span>
        <span>Coastal Hydrography</span>
      </div>
    </div>
  );
};
