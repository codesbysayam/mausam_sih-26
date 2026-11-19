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
        return 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35';
      case 'Warm & Humid':
        return 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35';
      case 'Uncomfortable':
        return 'bg-[var(--m-alert-soft)] text-[var(--m-alert)] border-[var(--m-alert)]/35';
      default:
        return 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';
    }
  };

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] text-[var(--m-ok)] flex items-center justify-center border border-[var(--m-border)]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
                Event Planners &amp; Venue Logistics
              </h3>
              <p className="text-[11px] text-[var(--m-text-muted)]">
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
              <tr className="border-b border-[var(--m-border)] text-[10px] font-sans uppercase text-[var(--m-text-muted)]">
                <th className="pb-2 font-bold">Day</th>
                <th className="pb-2 font-bold text-center">Condition</th>
                <th className="pb-2 font-bold text-right">Max / Min</th>
                <th className="pb-2 font-bold text-right">Rain Prob</th>
                <th className="pb-2 font-bold text-right">Comfort</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--m-border-strong)]">
              {extendedForecast.slice(0, 7).map((item, idx) => {
                const visual = getWeatherVisualConfig(item.condition);
                const CondIcon = visual.icon;
                const rainPct =
                  typeof item.rainProbabilityPercent === 'number' && Number.isFinite(item.rainProbabilityPercent)
                    ? item.rainProbabilityPercent
                    : null;

                return (
                  <tr key={idx} className="hover:bg-[var(--m-surface-1)] transition-colors">
                    <td className="py-2 font-sans text-[var(--m-text-primary)] font-medium">
                      <span>{item.dayOfWeek}</span>
                      <span className="text-[10px] font-mono text-[var(--m-text-muted)] block">{item.date}</span>
                    </td>
                    <td className="py-2 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <CondIcon className={`w-4 h-4 ${visual.iconColor}`} />
                        <span className="text-[11px] text-[var(--m-text-secondary)] hidden sm:inline">{item.condition || '—'}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-bold">
                      <span className="text-[var(--m-text-primary)]">
                        {typeof item.tempMax === 'number' ? `${item.tempMax}°` : '—'}
                      </span>
                      <span className="text-[var(--m-text-muted)] text-[10px] ml-1">
                        / {typeof item.tempMin === 'number' ? `${item.tempMin}°` : '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`text-xs font-bold ${
                          rainPct === null
                            ? 'text-[var(--m-text-muted)]'
                            : rainPct > 50
                            ? 'text-[var(--m-accent)]'
                            : rainPct > 25
                            ? 'text-[var(--m-watch)]'
                            : 'text-[var(--m-ok)]'
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

        <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-start gap-2.5">
          <TrendingUp className="w-4 h-4 text-[var(--m-ok)] shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-[var(--m-text-primary)] font-semibold">Venue Logistics &amp; Setup Advisory</p>
            <p className="text-[11px] text-[var(--m-text-muted)] mt-0.5 leading-relaxed">{eventRecommendation}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[var(--m-text-muted)]">
        <span>Source: <strong className="text-[var(--m-text-secondary)]">Extended Numerical Forecast &amp; Thermal Comfort Model</strong></span>
        <span>7-Day Projection</span>
      </div>
    </div>
  );
};
