import React from 'react';
import {
  CloudRain,
  Wind,
  Waves,
  Zap,
  Ship,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { WeatherSystemEvent, ThreatLevel } from '../../types/cyclone';

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
          bg: 'bg-[#EF4444]/15 border-[#EF4444]/60 text-[#EF4444]',
          label: 'RED ALERT (Action)',
          dot: 'bg-[#EF4444] animate-pulse',
        };
      case 'ORANGE':
        return {
          bg: 'bg-[#F97316]/15 border-[#F97316]/60 text-[#FB923C]',
          label: 'ORANGE ALERT (Be Prepared)',
          dot: 'bg-[#F97316]',
        };
      case 'YELLOW':
        return {
          bg: 'bg-[#EAB308]/15 border-[#EAB308]/60 text-[#FDE047]',
          label: 'YELLOW WATCH (Be Updated)',
          dot: 'bg-[#EAB308]',
        };
      case 'WATCH':
        return {
          bg: 'bg-[#38BDF8]/15 border-[#38BDF8]/60 text-[#38BDF8]',
          label: 'MONITORING WATCH',
          dot: 'bg-[#38BDF8]',
        };
      default:
        return {
          bg: 'bg-[#10B981]/15 border-[#10B981]/60 text-[#34D399]',
          label: 'NO ADVERSE THREAT',
          dot: 'bg-[#10B981]',
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
      {/* 5-Card Threat Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Threat 1: Rainfall */}
        <div className="bg-[#0B1523] border border-[#1E2E40] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-[#60A5FA]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Rainfall Threat
              </span>
            </div>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${rainBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-full ${rainBadge.dot}`} />
              <span>{rainBadge.label}</span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
              Target area: {affectedText}.
            </p>
          </div>
        </div>

        {/* Threat 2: Wind */}
        <div className="bg-[#0B1523] border border-[#1E2E40] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-[#FB923C]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Squall / Wind Threat
              </span>
            </div>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${windBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-full ${windBadge.dot}`} />
              <span>{windBadge.label}</span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
              Sustained: {activeSystem.maxSustainedWind}.
            </p>
          </div>
        </div>

        {/* Threat 3: Storm Surge */}
        <div className="bg-[#0B1523] border border-[#1E2E40] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Storm Surge
              </span>
            </div>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${surgeBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-full ${surgeBadge.dot}`} />
              <span>{surgeBadge.label}</span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
              {activeSystem.basin === 'Inland Central India'
                ? 'N/A - Inland system.'
                : 'Astronomical tidal surveillance active.'}
            </p>
          </div>
        </div>

        {/* Threat 4: Thunderstorm / Lightning */}
        <div className="bg-[#0B1523] border border-[#1E2E40] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FACC15]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Convection / Lightning
              </span>
            </div>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${thunderBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-full ${thunderBadge.dot}`} />
              <span>{thunderBadge.label}</span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
              Doppler convective reflectivity monitoring.
            </p>
          </div>
        </div>

        {/* Threat 5: Marine / Sea Conditions */}
        <div className="bg-[#0B1523] border border-[#1E2E40] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ship className="w-4 h-4 text-[#34D399]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Sea State &amp; Fishermen
              </span>
            </div>
          </div>
          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${marineBadge.bg}`}
            >
              <span className={`w-2 h-2 rounded-full ${marineBadge.dot}`} />
              <span>{marineBadge.label}</span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
              Official IMD Fishermen advisory in effect.
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Actions & Impact Potential (if provided) */}
      {(hasDamagePotential || hasSuggestedActions) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
          {hasDamagePotential && (
            <div className="bg-[#09111C] border border-[#1E2E40] rounded-xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase font-mono text-[#F59E0B]">
                <AlertTriangle className="w-4 h-4" />
                <span>Impact Assessment &amp; Potential Damage</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-xs text-[#CBD5E1]">
                {activeSystem.damagePotential!.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasSuggestedActions && (
            <div className="bg-[#09111C] border border-[#1E2E40] rounded-xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase font-mono text-[#10B981]">
                <CheckCircle2 className="w-4 h-4" />
                <span>IMD &amp; SDMA Recommended Actions</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-xs text-[#CBD5E1]">
                {activeSystem.suggestedActions!.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
