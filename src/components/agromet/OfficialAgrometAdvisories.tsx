import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
} from '../ui/ObservatoryPrimitives';

interface OfficialAgrometAdvisoriesProps {
  bulletin: ExtendedAgrometBulletin;
}

export const OfficialAgrometAdvisories: React.FC<OfficialAgrometAdvisoriesProps> = ({
  bulletin,
}) => {
  const [expandedCrop, setExpandedCrop] = useState<string | null>(bulletin.crops[0]?.cropName || null);

  return (
    <DataPanel id="agromet-official-advisories" className="space-y-4">
      <SectionHeading
        title="Official Gramin Krishi Mausam Sewa (GKMS) Bulletins"
        subtitle="State Agricultural University & IMD Agromet Field Unit (AMFU) reference directives"
        icon={<FileText className="w-4 h-4" />}
        badge={<SourceStatus status="REFERENCE" labelOverride="AMFU BULLETIN" />}
      />

      <div className="m-panel-inset p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        <div>
          <span className="text-[var(--m-text-muted)] block text-[10px] uppercase">Bulletin Reference</span>
          <span className="text-[var(--m-text-primary)] font-bold">{bulletin.bulletinNo}</span>
        </div>
        <div>
          <span className="text-[var(--m-text-muted)] block text-[10px] uppercase">Agromet Field Unit</span>
          <span className="text-[var(--m-text-primary)] font-bold truncate block" title={bulletin.amfuUnit}>
            {bulletin.amfuUnit}
          </span>
        </div>
        <div>
          <span className="text-[var(--m-text-muted)] block text-[10px] uppercase">Reference Issue Date</span>
          <span className="text-[var(--m-text-primary)] font-bold">
            {bulletin.issueDate} ({bulletin.issueDay})
          </span>
        </div>
        <div>
          <span className="text-[var(--m-text-muted)] block text-[10px] uppercase">Validity Window</span>
          <span className="text-[var(--m-ok)] font-bold">{bulletin.validPeriod}</span>
        </div>
      </div>

      <div className="m-panel-inset p-4 space-y-1.5">
        <h3 className="text-[11px] font-mono font-bold text-[var(--m-accent)] uppercase tracking-wider">
          Synoptic Advisory Summary
        </h3>
        <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">{bulletin.weatherSummary}</p>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-[11px] font-mono font-bold text-[var(--m-text-muted)] uppercase tracking-wider px-1">
          Crop-Wise Stage Specific Directives ({bulletin.crops.length} Crops)
        </h3>

        <div className="space-y-2.5">
          {bulletin.crops.map((crop) => {
            const isExpanded = expandedCrop === crop.cropName;

            return (
              <div
                key={crop.cropName}
                className="rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedCrop(isExpanded ? null : crop.cropName)}
                  aria-expanded={isExpanded}
                  className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--m-surface-2)]/60 transition-colors cursor-pointer m-focus-ring"
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-sm font-mono font-bold text-[var(--m-text-primary)]">
                      {crop.cropName}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--m-accent)] bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/25 px-2 py-0.5 rounded">
                      Stage: {crop.stage}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                        crop.riskLevel === 'High'
                          ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/35 text-[var(--m-danger)]'
                          : 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/35 text-[var(--m-ok)]'
                      }`}
                    >
                      Risk: {crop.riskLevel}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[var(--m-text-muted)] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--m-text-muted)] shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-[var(--m-border)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="space-y-1 bg-[var(--m-surface-inset)] p-3 rounded-lg border border-[var(--m-border)]">
                      <strong className="text-[var(--m-ok)] font-mono text-[10px] block uppercase">
                        Sowing &amp; Field Prep
                      </strong>
                      <p className="text-[var(--m-text-secondary)] text-[11px] leading-relaxed">{crop.sowingAdvice}</p>
                    </div>

                    <div className="space-y-1 bg-[var(--m-surface-inset)] p-3 rounded-lg border border-[var(--m-border)]">
                      <strong className="text-[var(--m-accent)] font-mono text-[10px] block uppercase">
                        Irrigation Management
                      </strong>
                      <p className="text-[var(--m-text-secondary)] text-[11px] leading-relaxed">{crop.irrigationAdvice}</p>
                    </div>

                    <div className="space-y-1 bg-[var(--m-surface-inset)] p-3 rounded-lg border border-[var(--m-border)]">
                      <strong className="text-[var(--m-watch)] font-mono text-[10px] block uppercase">
                        Nutrient &amp; Fertilizer
                      </strong>
                      <p className="text-[var(--m-text-secondary)] text-[11px] leading-relaxed">{crop.fertilizerAdvice}</p>
                    </div>

                    <div className="space-y-1 bg-[var(--m-surface-inset)] p-3 rounded-lg border border-[var(--m-border)]">
                      <strong className="text-[var(--m-danger)] font-mono text-[10px] block uppercase">
                        Pest &amp; Disease Defense
                      </strong>
                      <p className="text-[var(--m-text-secondary)] text-[11px] leading-relaxed">{crop.pestDiseaseAdvice}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DataPanel>
  );
};
