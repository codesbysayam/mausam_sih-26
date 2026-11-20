import React, { useState } from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import { CropAdvisory } from '../../types';
import {
  ChevronDown,
  ChevronUp,
  Droplet,
  Sprout,
  Bug,
  Tractor,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

interface CropAdvisoryAccordionProps {
  bulletin: ExtendedAgrometBulletin;
  selectedCrop?: string;
  onSelectCrop?: (cropName: string) => void;
}

export const CropAdvisoryAccordion: React.FC<CropAdvisoryAccordionProps> = ({
  bulletin,
  selectedCrop,
  onSelectCrop,
}) => {
  // Store expanded crop indices (default expand first crop or active selectedCrop)
  const initialIndex = Math.max(
    0,
    bulletin.crops.findIndex(
      (c) => c.cropName.toLowerCase() === (selectedCrop || '').toLowerCase()
    )
  );

  const [expandedCrops, setExpandedCrops] = useState<Record<number, boolean>>({
    [initialIndex >= 0 ? initialIndex : 0]: true,
  });

  const toggleCrop = (idx: number, cropName: string) => {
    setExpandedCrops((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
    if (onSelectCrop) {
      onSelectCrop(cropName);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'High':
        return 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/40';
      case 'Moderate':
        return 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/40';
      case 'Low':
      default:
        return 'bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/40';
    }
  };

  return (
    <div className="rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[var(--m-border)] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2ECC71]/15 border border-[#2ECC71]/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#2ECC71]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight">
              Crop-Specific Stage Advisory Matrix
            </h3>
          </div>
          <p className="text-xs text-[var(--m-text-muted)]">
            Detailed stage-wise agronomic recommendations issued by AMFU {bulletin.district} node.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-[var(--m-text-muted)]">
          <span>Crops Tracked:</span>
          <span className="font-mono font-bold text-[var(--m-text-primary)] px-2 py-0.5 rounded bg-[var(--m-surface-2)] border border-[var(--m-border-strong)]">
            {bulletin.crops.length} Priority Cultivars
          </span>
        </div>
      </div>

      {/* Expandable Crops List */}
      <div className="space-y-4">
        {bulletin.crops.map((crop, idx) => {
          const isExpanded = !!expandedCrops[idx];
          const isSelected =
            selectedCrop && crop.cropName.toLowerCase() === selectedCrop.toLowerCase();

          return (
            <div
              key={crop.cropName}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? 'bg-[var(--m-surface-1)] border-[#2ECC71]/50 shadow-lg'
                  : 'bg-[var(--m-surface-1)] border-[var(--m-border)] hover:border-[var(--m-border-strong)] hover:bg-[var(--m-surface-2)]'
              }`}
            >
              {/* Crop Row Trigger Header */}
              <button
                type="button"
                onClick={() => toggleCrop(idx, crop.cropName)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                      isExpanded
                        ? 'bg-[#2ECC71] text-[var(--m-on-accent)]'
                        : 'bg-[var(--m-surface-2)] text-[#2ECC71] border border-[var(--m-border-strong)]'
                    }`}
                  >
                    0{idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {crop.cropName}
                      </h4>
                      {isSelected && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/40 font-semibold uppercase">
                          Active Target
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${getRiskBadge(
                          crop.riskLevel
                        )}`}
                      >
                        {crop.riskLevel} Risk
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--m-text-muted)] mt-1">
                      <span className="text-[var(--m-accent)] font-medium font-mono">
                        Stage: {crop.stage}
                      </span>
                      <span className="text-[var(--m-text-muted)]">•</span>
                      <span className="truncate hidden sm:inline">{crop.riskAlert}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[var(--m-accent)] font-semibold hidden md:inline">
                    {isExpanded ? 'Collapse' : 'Expand Advisory'}
                  </span>
                  <div
                    className={`p-2 rounded-lg bg-[var(--m-surface-2)] text-[var(--m-text-muted)] transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-white bg-[#2ECC71]/20' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Crop Row Expanded Advisory Details */}
              {isExpanded && (
                <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-[var(--m-border)] space-y-4">
                  {/* Grid of 4 Detailed Functional Advisory Blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Irrigation Management */}
                    <div className="p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col justify-between hover:border-[var(--m-accent)]/40 transition-colors">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[var(--m-accent)] uppercase tracking-wider flex items-center gap-1.5">
                            <Droplet className="w-4 h-4 text-[var(--m-accent)]" />
                            Irrigation Management
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] font-mono">
                            Moisture Regime
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[var(--m-text-primary)] font-medium leading-relaxed mb-3">
                          {crop.irrigationAdvice}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[var(--m-border)] text-[11px] text-[var(--m-text-muted)] space-y-1">
                        <div>
                          <strong className="text-[var(--m-accent)]">Why:</strong> Avoid root zone waterlogging or water stress during key phenology phase.
                        </div>
                        <div className="flex items-center gap-1 text-[#2ECC71]">
                          <Clock className="w-3 h-3" />
                          <span>Window: Review after 48h convective precipitation</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Nutrient & Fertilizer Strategy */}
                    <div className="p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col justify-between hover:border-[#2ECC71]/40 transition-colors">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#2ECC71] uppercase tracking-wider flex items-center gap-1.5">
                            <Sprout className="w-4 h-4 text-[#2ECC71]" />
                            Nutrient &amp; Fertilizer
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#2ECC71]/15 text-[#2ECC71] font-mono">
                            NPK Splits
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[var(--m-text-primary)] font-medium leading-relaxed mb-3">
                          {crop.fertilizerAdvice}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[var(--m-border)] text-[11px] text-[var(--m-text-muted)] space-y-1">
                        <div>
                          <strong className="text-[#2ECC71]">Why:</strong> Prevent nitrogen leaching and ensure maximum canopy absorption.
                        </div>
                        <div className="flex items-center gap-1 text-[var(--m-watch)]">
                          <Clock className="w-3 h-3" />
                          <span>Window: Clear morning hours (08:00 – 11:00 AM) on dry foliage</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Plant Protection & IPM */}
                    <div className="p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col justify-between hover:border-[var(--m-danger)]/40 transition-colors">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[var(--m-danger)] uppercase tracking-wider flex items-center gap-1.5">
                            <Bug className="w-4 h-4 text-[var(--m-danger)]" />
                            Pest &amp; Disease IPM
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--m-danger-soft)] text-[var(--m-danger)] font-mono">
                            Biosecurity
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[var(--m-text-primary)] font-medium leading-relaxed mb-3">
                          {crop.pestDiseaseAdvice}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[var(--m-border)] text-[11px] text-[var(--m-text-muted)] space-y-1">
                        <div>
                          <strong className="text-[var(--m-danger)]">Why:</strong> High morning humidity accelerates spore germination and sucking insect spread.
                        </div>
                        <div className="flex items-center gap-1 text-[var(--m-accent)]">
                          <Clock className="w-3 h-3" />
                          <span>Scouting: Inspect lower leaf surface during 07:30 – 09:30 AM</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Cultural, Harvesting & Post-Harvest */}
                    <div className="p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex flex-col justify-between hover:border-[#A855F7]/40 transition-colors">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#A855F7] uppercase tracking-wider flex items-center gap-1.5">
                            <Tractor className="w-4 h-4 text-[#A855F7]" />
                            Harvesting &amp; Field Ops
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#A855F7]/15 text-[#A855F7] font-mono">
                            Post-Harvest
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[var(--m-text-primary)] font-medium leading-relaxed mb-3">
                          {crop.harvestingAdvice}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[var(--m-border)] text-[11px] text-[var(--m-text-muted)] space-y-1">
                        <div>
                          <strong className="text-[#A855F7]">Why:</strong> Prevent seed grain spoilage and maintain dry storage standards.
                        </div>
                        <div className="flex items-center gap-1 text-[var(--m-text-secondary)]">
                          <ShieldCheck className="w-3 h-3 text-[#2ECC71]" />
                          <span>Standard: Safe grain moisture threshold &lt;12–14%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Sowing / Cultural Footnote */}
                  <div className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-xs text-[var(--m-text-muted)] flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#2ECC71]" />
                      <span><strong>Cultural Practice:</strong> {crop.sowingAdvice}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--m-accent)]">
                      AMFU {bulletin.district} Advisory Code: {crop.cropName.slice(0, 3).toUpperCase()}-2026
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
