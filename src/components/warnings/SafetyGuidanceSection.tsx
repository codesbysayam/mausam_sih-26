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
          <span className="text-[10px] font-mono font-bold text-[#B5C3D1] uppercase tracking-wider bg-[#08131F] px-2 py-0.5 rounded border border-[#26394B]">
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
                  ? 'bg-[#0B72B9] text-white border-[#35C7E8]'
                  : 'bg-[#08131F] text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E] border-[#26394B]'
              }`}
            >
              {renderHazardIcon(cat.icon, 'w-3.5 h-3.5')}
              <span>{cat.title.split('&')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-[#08131F] border border-[#26394B] rounded-xl p-4 space-y-4">
        <div className="pb-3 border-b border-[#26394B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#35C7E8]">
            {renderHazardIcon(activeGuidance.icon, 'w-5 h-5')}
            <h4 className="text-sm sm:text-base font-bold text-[#F3F6FA]">
              {activeGuidance.title}
            </h4>
          </div>
          <span className="text-xs text-[#8295A8]">{activeGuidance.summary}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0B1927] border border-[#22C7A0]/35 rounded-lg p-3.5 space-y-2">
            <div className="text-xs font-mono font-bold text-[#6EE7B7] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Mandatory Actions (DOs)</span>
            </div>

            <ul className="space-y-2 text-xs text-[#B5C3D1]">
              {activeGuidance.dos.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#6EE7B7] font-bold mt-0.5">·</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#0B1927] border border-[#EF4444]/35 rounded-lg p-3.5 space-y-2">
            <div className="text-xs font-mono font-bold text-[#FCA5A5] uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              <span>Prohibited Actions (DONTs)</span>
            </div>

            <ul className="space-y-2 text-xs text-[#B5C3D1]">
              {activeGuidance.donts.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#FCA5A5] font-bold mt-0.5">·</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {activeGuidance.emergencyKitList && activeGuidance.emergencyKitList.length > 0 && (
          <div className="pt-3 border-t border-[#26394B]">
            <div className="text-xs font-mono font-bold text-[#FDE047] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BriefcaseMedical className="w-4 h-4" />
              <span>Essential Emergency Kit Checklist</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {activeGuidance.emergencyKitList.map((kitItem, idx) => (
                <div
                  key={idx}
                  className="bg-[#0B1927] border border-[#26394B] rounded-lg px-2.5 py-2 text-[11px] text-[#B5C3D1] flex items-center gap-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#35C7E8] shrink-0" />
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
