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
        return 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35';
      case 'Caution':
        return 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35';
      case 'Hazardous':
        return 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';
    }
  };

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] text-[var(--m-watch)] flex items-center justify-center border border-[var(--m-border)]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
                Parents &amp; Family Commute
              </h3>
              <p className="text-[11px] text-[var(--m-text-muted)]">
                School Transit &amp; Rain Windows • {city}
              </p>
            </div>
          </div>
          {rainExpectedDuringCommute ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35 flex items-center gap-1">
              <Umbrella className="w-3 h-3" />
              Rain Alert
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--m-ok-soft)] text-[var(--m-ok)] border border-[var(--m-ok)]/35">
              Clear Commute
            </span>
          )}
        </div>

        {rainExpectedDuringCommute && (
          <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/35 flex items-start gap-2.5 text-xs">
            <Umbrella className="w-4 h-4 shrink-0 text-[var(--m-accent)] mt-0.5" />
            <div>
              <strong className="block font-bold text-[var(--m-text-primary)]">
                School Commute Rain Advisory
              </strong>
              <p className="text-[11px] text-[var(--m-text-secondary)] mt-0.5">
                {commuteRainSummary ||
                  'Precipitation forecast during morning drop-off or afternoon pickup windows. Allow extra travel time.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase font-bold text-[var(--m-text-primary)] flex items-center gap-1.5">
                <Sunrise className="w-3.5 h-3.5 text-[var(--m-watch)]" />
                Morning Commute
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(morningCommuteStatus)}`}>
                {morningCommuteStatus}
              </span>
            </div>
            <div className="mt-2">
              <span className="font-mono tabular-nums text-[var(--m-text-primary)] font-bold text-sm block">
                {morningWindow || '—'}
              </span>
              <p className="text-[11px] mt-1 text-[var(--m-text-muted)]">
                {morningCommuteStatus === 'Safe'
                  ? 'Routine transit conditions for buses, cycling, and walking.'
                  : 'Wet roads or reduced visibility; allow extra margin.'}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase font-bold text-[var(--m-text-primary)] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[var(--m-alert)]" />
                Afternoon Commute
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(eveningCommuteStatus)}`}>
                {eveningCommuteStatus}
              </span>
            </div>
            <div className="mt-2">
              <span className="font-mono tabular-nums text-[var(--m-text-primary)] font-bold text-sm block">
                {eveningWindow || '—'}
              </span>
              <p className="text-[11px] mt-1 text-[var(--m-text-muted)]">
                {eveningCommuteStatus === 'Safe'
                  ? 'Normal afternoon return conditions across transit corridors.'
                  : 'Elevated afternoon heat or localized showers expected.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-start gap-2.5">
          <Bus className="w-4 h-4 text-[var(--m-watch)] shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-[var(--m-text-primary)] font-semibold">Transit Safety Note</p>
            <p className="text-[11px] text-[var(--m-text-muted)] mt-0.5 leading-relaxed">{schoolBusSafetyNote}</p>
          </div>
        </div>

        {severeWarnings.length > 0 && (
          <div className="mt-3 p-2.5 bg-[var(--m-danger-soft)] rounded-lg border border-[var(--m-danger)]/35 text-xs">
            <span className="font-bold text-[var(--m-danger)] block">Active Hazard Warning</span>
            <p className="text-[11px] text-[var(--m-text-secondary)] mt-0.5">
              {severeWarnings[0].title}: {severeWarnings[0].actionItem}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[var(--m-text-muted)]">
        <span>Source: <strong className="text-[var(--m-text-secondary)]">Nowcast &amp; Hourly Transit Window</strong></span>
        <span>School Commute Focus</span>
      </div>
    </div>
  );
};
