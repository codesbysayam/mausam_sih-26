import React from 'react';
import { AuthoritativeAlert } from '../../../services/authoritativeService';
import { Users, Umbrella, Sunrise, Sun, Bus } from 'lucide-react';

interface FamilyCommuteCardProps {
  morningCommuteStatus: 'Safe' | 'Caution' | 'Hazardous';
  eveningCommuteStatus: 'Safe' | 'Caution' | 'Hazardous';
  morningWindow: string;
  eveningWindow: string;
  rainExpectedDuringCommute: boolean;
  commuteRainSummary: string;
  schoolBusSafetyNote: string;
  severeWarnings: AuthoritativeAlert[];
  city: string;
}

export const FamilyCommuteCard: React.FC<FamilyCommuteCardProps> = ({
  morningCommuteStatus,
  eveningCommuteStatus,
  morningWindow,
  eveningWindow,
  rainExpectedDuringCommute,
  commuteRainSummary,
  schoolBusSafetyNote,
  severeWarnings,
  city,
}) => {
  const getStatusBadge = (status: 'Safe' | 'Caution' | 'Hazardous') => {
    switch (status) {
      case 'Safe':
        return 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35';
      case 'Caution':
        return 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35';
      case 'Hazardous':
        return 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35';
    }
  };

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#26394B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] text-[#F59E0B] flex items-center justify-center border border-[#26394B]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FA] uppercase tracking-wide">
                Parents &amp; Family Commute
              </h3>
              <p className="text-[11px] text-[#8295A8]">
                School Transit &amp; Rain Windows • {city}
              </p>
            </div>
          </div>
          {rainExpectedDuringCommute ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0B72B9]/15 text-[#7DD3FC] border border-[#0B72B9]/35 flex items-center gap-1">
              <Umbrella className="w-3 h-3" />
              Rain Alert
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#22C7A0]/12 text-[#6EE7B7] border border-[#22C7A0]/35">
              Clear Commute
            </span>
          )}
        </div>

        {rainExpectedDuringCommute && (
          <div className="mt-3.5 p-3 rounded-lg bg-[#0B72B9]/12 border border-[#0B72B9]/35 flex items-start gap-2.5 text-xs">
            <Umbrella className="w-4 h-4 shrink-0 text-[#35C7E8] mt-0.5" />
            <div>
              <strong className="block font-bold text-[#F3F6FA]">
                School Commute Rain Advisory
              </strong>
              <p className="text-[11px] text-[#B5C3D1] mt-0.5">
                {commuteRainSummary ||
                  'Precipitation forecast during morning drop-off or afternoon pickup windows. Allow extra travel time.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase font-bold text-[#F3F6FA] flex items-center gap-1.5">
                <Sunrise className="w-3.5 h-3.5 text-[#F59E0B]" />
                Morning Commute
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(morningCommuteStatus)}`}>
                {morningCommuteStatus}
              </span>
            </div>
            <div className="mt-2">
              <span className="font-mono tabular-nums text-[#F3F6FA] font-bold text-sm block">
                {morningWindow || '—'}
              </span>
              <p className="text-[11px] mt-1 text-[#8295A8]">
                {morningCommuteStatus === 'Safe'
                  ? 'Routine transit conditions for buses, cycling, and walking.'
                  : 'Wet roads or reduced visibility; allow extra margin.'}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#0B1927] rounded-lg border border-[#26394B]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase font-bold text-[#F3F6FA] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#F97316]" />
                Afternoon Commute
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(eveningCommuteStatus)}`}>
                {eveningCommuteStatus}
              </span>
            </div>
            <div className="mt-2">
              <span className="font-mono tabular-nums text-[#F3F6FA] font-bold text-sm block">
                {eveningWindow || '—'}
              </span>
              <p className="text-[11px] mt-1 text-[#8295A8]">
                {eveningCommuteStatus === 'Safe'
                  ? 'Normal afternoon return conditions across transit corridors.'
                  : 'Elevated afternoon heat or localized showers expected.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-start gap-2.5">
          <Bus className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-[#F3F6FA] font-semibold">Transit Safety Note</p>
            <p className="text-[11px] text-[#8295A8] mt-0.5 leading-relaxed">{schoolBusSafetyNote}</p>
          </div>
        </div>

        {severeWarnings.length > 0 && (
          <div className="mt-3 p-2.5 bg-[#EF4444]/12 rounded-lg border border-[#EF4444]/35 text-xs">
            <span className="font-bold text-[#FCA5A5] block">Active Hazard Warning</span>
            <p className="text-[11px] text-[#B5C3D1] mt-0.5">
              {severeWarnings[0].title}: {severeWarnings[0].actionItem}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#26394B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[#8295A8]">
        <span>Source: <strong className="text-[#B5C3D1]">Nowcast &amp; Hourly Transit Window</strong></span>
        <span>School Commute Focus</span>
      </div>
    </div>
  );
};
