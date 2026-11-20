import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, XCircle, BriefcaseMedical } from 'lucide-react';
import { HazardCategory } from '../../types/warningTypes';
import { SAFETY_GUIDANCE_DATABASE } from '../../data/nationalWarningsData';
import { renderHazardIcon } from './hazardIcon';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

interface SafetyGuidanceSectionProps {
  activeHazardFilter?: HazardCategory | 'all';
}

export const SafetyGuidanceSection: React.FC<SafetyGuidanceSectionProps> = ({
  activeHazardFilter = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<HazardCategory>('heavy_rain');

  useEffect(() => {
    if (activeHazardFilter !== 'all') {
      const match = SAFETY_GUIDANCE_DATABASE.find((g) => g.hazard === activeHazardFilter);
      if (match) {
        setSelectedCategory(match.hazard);
      }
    }
  }, [activeHazardFilter]);

  const activeGuidance =
    SAFETY_GUIDANCE_DATABASE.find((g) => g.hazard === selectedCategory) ||
    SAFETY_GUIDANCE_DATABASE[0];

  return (
    <DataPanel
      id="safety-guidance-protocols-section"
      className="flex flex-col gap-3.5"
    >
      <SectionHeading
        title="Safety Guidance & Standard Operating Procedures"
        subtitle="Citizen preparedness protocols by National Disaster Management Authority (NDMA)"
        icon={<ShieldCheck className="w-4 h-4" />}
        badge={
          <span className="text-[10px] font-mono font-bold text-[var(--m-text-secondary)] uppercase tracking-wider bg-[var(--m-surface-inset)] px-2 py-0.5 rounded border border-[var(--m-border)]">
            NDMA Protocol
          </span>
        }
      />

      <div
        role="tablist"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
      >
        {SAFETY_GUIDANCE_DATABASE.map((cat) => {
          const isSelected = selectedCategory === cat.hazard;
          return (
            <button
              key={cat.hazard}
              id={`tab-safety-${cat.hazard}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(cat.hazard)}
              className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isSelected
                  ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] border-[var(--m-accent)]'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] border-[var(--m-border)]'
              }`}
            >
              {renderHazardIcon(cat.icon, 'w-3.5 h-3.5')}
              <span>{cat.title.split('&')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-xl p-4 space-y-4">
        <div className="pb-3 border-b border-[var(--m-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[var(--m-accent)]">
            {renderHazardIcon(activeGuidance.icon, 'w-5 h-5')}
            <h4 className="text-sm sm:text-base font-bold text-[var(--m-text-primary)]">
              {activeGuidance.title}
            </h4>
          </div>
          <span className="text-xs text-[var(--m-text-muted)]">{activeGuidance.summary}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--m-surface-1)] border border-[var(--m-ok)]/35 rounded-lg p-3.5 space-y-2">
            <div className="text-xs font-mono font-bold text-[var(--m-ok)] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Mandatory Actions (DOs)</span>
            </div>

            <ul className="space-y-2 text-xs text-[var(--m-text-secondary)]">
              {activeGuidance.dos.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--m-ok)] font-bold mt-0.5">·</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[var(--m-surface-1)] border border-[var(--m-danger)]/35 rounded-lg p-3.5 space-y-2">
            <div className="text-xs font-mono font-bold text-[var(--m-danger)] uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              <span>Prohibited Actions (DONTs)</span>
            </div>

            <ul className="space-y-2 text-xs text-[var(--m-text-secondary)]">
              {activeGuidance.donts.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--m-danger)] font-bold mt-0.5">·</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {activeGuidance.emergencyKitList && activeGuidance.emergencyKitList.length > 0 && (
          <div className="pt-3 border-t border-[var(--m-border)]">
            <div className="text-xs font-mono font-bold text-[var(--m-watch)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BriefcaseMedical className="w-4 h-4" />
              <span>Essential Emergency Kit Checklist</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {activeGuidance.emergencyKitList.map((kitItem, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-lg px-2.5 py-2 text-[11px] text-[var(--m-text-secondary)] flex items-center gap-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
                  <span className="truncate">{kitItem}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DataPanel>
  );
};
