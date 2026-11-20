import React from 'react';
import {
  CloudRain,
  Wind,
  Waves,
  Zap,
  Ship,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { WeatherSystemEvent, ThreatLevel } from '../../types/cyclone';
import { DataPanel } from '../ui/ObservatoryPrimitives';

interface CycloneThreatMatrixProps {
  activeSystem: WeatherSystemEvent;
}

export const CycloneThreatMatrix: React.FC<CycloneThreatMatrixProps> = ({
  activeSystem,
}) => {
  const getThreatBadge = (level: ThreatLevel) => {
    switch (level) {
      case 'RED':
        return {
          bg: 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/45 text-[var(--m-danger)]',
          label: 'RED ALERT',
          dot: 'bg-[#EF4444]',
        };
      case 'ORANGE':
        return {
          bg: 'bg-[var(--m-alert-soft)] border-[var(--m-alert)]/45 text-[var(--m-alert)]',
          label: 'ORANGE ALERT',
          dot: 'bg-[#F97316]',
        };
      case 'YELLOW':
        return {
          bg: 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/45 text-[var(--m-watch)]',
          label: 'YELLOW WATCH',
          dot: 'bg-[#EAB308]',
        };
      case 'WATCH':
        return {
          bg: 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/45 text-[var(--m-accent)]',
          label: 'MONITORING',
          dot: 'bg-[var(--m-accent)]',
        };
      default:
        return {
          bg: 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/40 text-[var(--m-ok)]',
          label: 'NO THREAT',
          dot: 'bg-[#22C7A0]',
        };
    }
  };

  const rainBadge = getThreatBadge(activeSystem.rainfallThreat);
  const windBadge = getThreatBadge(activeSystem.windThreat);
  const surgeBadge = getThreatBadge(activeSystem.stormSurgeThreat);
  const thunderBadge = getThreatBadge(activeSystem.thunderstormThreat);
  const marineBadge = getThreatBadge(activeSystem.coastalConditionsThreat || 'NO_WARNING');

  const affectedText =
    Array.isArray(activeSystem.affectedStates) && activeSystem.affectedStates.length > 0
      ? activeSystem.affectedStates.join(', ')
      : 'Open ocean / unpopulated sectors';

  const hasDamagePotential =
    Array.isArray(activeSystem.damagePotential) && activeSystem.damagePotential.length > 0;
  const hasSuggestedActions =
    Array.isArray(activeSystem.suggestedActions) && activeSystem.suggestedActions.length > 0;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <DataPanel className="flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-[var(--m-accent)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-text-primary)]">
              Rainfall Threat
            </span>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold font-mono border ${rainBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-sm ${rainBadge.dot}`} />
              <span>{rainBadge.label}</span>
            </div>
            <p className="text-xs text-[var(--m-text-secondary)] mt-2 leading-relaxed">
              Target area: {affectedText}.
            </p>
          </div>
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-[var(--m-alert)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-text-primary)]">
              Squall / Wind
            </span>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold font-mono border ${windBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-sm ${windBadge.dot}`} />
              <span>{windBadge.label}</span>
            </div>
            <p className="text-xs text-[var(--m-text-secondary)] mt-2 leading-relaxed">
              Sustained: {activeSystem.maxSustainedWind || '—'}.
            </p>
          </div>
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-[var(--m-accent)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-text-primary)]">
              Storm Surge
            </span>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold font-mono border ${surgeBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-sm ${surgeBadge.dot}`} />
              <span>{surgeBadge.label}</span>
            </div>
            <p className="text-xs text-[var(--m-text-secondary)] mt-2 leading-relaxed">
              {activeSystem.basin === 'Inland Central India'
                ? 'Inland system — no coastal surge.'
                : 'Astronomical tidal surveillance active.'}
            </p>
          </div>
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--m-watch)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-text-primary)]">
              Lightning
            </span>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold font-mono border ${thunderBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-sm ${thunderBadge.dot}`} />
              <span>{thunderBadge.label}</span>
            </div>
            <p className="text-xs text-[var(--m-text-secondary)] mt-2 leading-relaxed">
              Doppler convective reflectivity monitoring.
            </p>
          </div>
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2">
            <Ship className="w-4 h-4 text-[var(--m-ok)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--m-text-primary)]">
              Sea State
            </span>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold font-mono border ${marineBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-sm ${marineBadge.dot}`} />
              <span>{marineBadge.label}</span>
            </div>
            <p className="text-xs text-[var(--m-text-secondary)] mt-2 leading-relaxed">
              IMD fishermen marine advisory.
            </p>
          </div>
        </DataPanel>
      </div>

      {(hasDamagePotential || hasSuggestedActions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasDamagePotential && (
            <DataPanel variant="inset" className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase font-mono text-[var(--m-watch)]">
                <AlertTriangle className="w-4 h-4" />
                <span>Impact Assessment &amp; Potential Damage</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-xs text-[var(--m-text-secondary)]">
                {activeSystem.damagePotential!.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[var(--m-watch)] font-bold">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </DataPanel>
          )}

          {hasSuggestedActions && (
            <DataPanel variant="inset" className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase font-mono text-[var(--m-ok)]">
                <CheckCircle2 className="w-4 h-4" />
                <span>IMD &amp; SDMA Recommended Actions</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-xs text-[var(--m-text-secondary)]">
                {activeSystem.suggestedActions!.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[var(--m-ok)] font-bold">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </DataPanel>
          )}
        </div>
      )}
    </div>
  );
};
