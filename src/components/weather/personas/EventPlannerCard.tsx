import React from 'react';
import { getWeatherVisualConfig } from '../../../utils/weatherIcons';
import { Calendar, TrendingUp } from 'lucide-react';

interface EventPlannerCardProps {
  extendedForecast: Array<{
    date: string;
    dayOfWeek: string;
    tempMax: number | null;
    tempMin: number | null;
    condition: string;
    icon: string;
    rainProbabilityPercent: number | null;
    comfortIndexValue: number | null;
    comfortCategory: 'Pleasant' | 'Comfortable' | 'Warm & Humid' | 'Uncomfortable' | 'Stifling';
  }>;
  comfortIndexToday: number | null;
  comfortCategoryToday: 'Pleasant' | 'Comfortable' | 'Warm & Humid' | 'Uncomfortable' | 'Stifling';
  eventRecommendation: string;
  city: string;
}

export const EventPlannerCard: React.FC<EventPlannerCardProps> = ({
  extendedForecast,
  comfortIndexToday,
  comfortCategoryToday,
  eventRecommendation,
  city,
}) => {
  const getComfortBadge = (cat: string) => {
    switch (cat) {
      case 'Pleasant':
      case 'Comfortable':
        return 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35';
      case 'Warm & Humid':
        return 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35';
      case 'Uncomfortable':
        return 'bg-[#F97316]/12 text-[#FDBA74] border-[#F97316]/35';
      default:
        return 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35';
    }
  };

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#26394B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B1927] text-[#22C7A0] flex items-center justify-center border border-[#26394B]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FA] uppercase tracking-wide">
                Event Planners &amp; Venue Logistics
              </h3>
              <p className="text-[11px] text-[#8295A8]">
                7-Day Extended Forecast &amp; Thermal Comfort • {city}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getComfortBadge(comfortCategoryToday)}`}>
            Comfort: {comfortCategoryToday}
            {typeof comfortIndexToday === 'number' ? ` (${comfortIndexToday})` : ''}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs text-left font-mono tabular-nums">
            <thead>
              <tr className="border-b border-[#26394B] text-[10px] font-sans uppercase text-[#8295A8]">
                <th className="pb-2 font-bold">Day</th>
                <th className="pb-2 font-bold text-center">Condition</th>
                <th className="pb-2 font-bold text-right">Max / Min</th>
                <th className="pb-2 font-bold text-right">Rain Prob</th>
                <th className="pb-2 font-bold text-right">Comfort</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26394B]/60">
              {extendedForecast.slice(0, 7).map((item, idx) => {
                const visual = getWeatherVisualConfig(item.condition);
                const CondIcon = visual.icon;
                const rainPct =
                  typeof item.rainProbabilityPercent === 'number' && Number.isFinite(item.rainProbabilityPercent)
                    ? item.rainProbabilityPercent
                    : null;

                return (
                  <tr key={idx} className="hover:bg-[#0B1927] transition-colors">
                    <td className="py-2 font-sans text-[#F3F6FA] font-medium">
                      <span>{item.dayOfWeek}</span>
                      <span className="text-[10px] font-mono text-[#8295A8] block">{item.date}</span>
                    </td>
                    <td className="py-2 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <CondIcon className={`w-4 h-4 ${visual.iconColor}`} />
                        <span className="text-[11px] text-[#B5C3D1] hidden sm:inline">{item.condition || '—'}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-bold">
                      <span className="text-[#F3F6FA]">
                        {typeof item.tempMax === 'number' ? `${item.tempMax}°` : '—'}
                      </span>
                      <span className="text-[#8295A8] text-[10px] ml-1">
                        / {typeof item.tempMin === 'number' ? `${item.tempMin}°` : '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`text-xs font-bold ${
                          rainPct === null
                            ? 'text-[#8295A8]'
                            : rainPct > 50
                            ? 'text-[#35C7E8]'
                            : rainPct > 25
                            ? 'text-[#FCD34D]'
                            : 'text-[#6EE7B7]'
                        }`}
                      >
                        {rainPct !== null ? `${rainPct}%` : '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-sans">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border inline-block ${getComfortBadge(
                          item.comfortCategory
                        )}`}
                      >
                        {item.comfortCategory}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[#0B1927] border border-[#26394B] flex items-start gap-2.5">
          <TrendingUp className="w-4 h-4 text-[#22C7A0] shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-[#F3F6FA] font-semibold">Venue Logistics &amp; Setup Advisory</p>
            <p className="text-[11px] text-[#8295A8] mt-0.5 leading-relaxed">{eventRecommendation}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#26394B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[#8295A8]">
        <span>Source: <strong className="text-[#B5C3D1]">Extended Numerical Forecast &amp; Thermal Comfort Model</strong></span>
        <span>7-Day Projection</span>
      </div>
    </div>
  );
};
