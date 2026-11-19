import React from 'react';
import { Table2 } from 'lucide-react';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface MatrixRow {
  level: string;
  colorName: string;
  colorHex: string;
  badgeClass: string;
  threshold: string;
  action: string;
}

const MATRIX_ROWS: MatrixRow[] = [
  {
    level: 'Red (Warning — Take Action)',
    colorName: 'Red',
    colorHex: '#EF4444',
    badgeClass: 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/45 text-[var(--m-danger)]',
    threshold:
      'Extremely Heavy Rainfall (≥ 204.5 mm in 24h), Super/Very Severe Cyclonic Storm (wind > 90 km/h), Violent Flash Flooding, or Severe Heatwave (> 45°C with severe departure).',
    action:
      'Immediate disaster response deployment (NDRF/SDRF). Total ban on coastal ventures. Evacuate vulnerable settlements. Follow all local administration movement restrictions.',
  },
  {
    level: 'Orange (Alert — Be Prepared)',
    colorName: 'Orange',
    colorHex: '#F97316',
    badgeClass: 'bg-[var(--m-alert-soft)] border-[var(--m-alert)]/45 text-[var(--m-alert)]',
    threshold:
      'Very Heavy Rainfall (115.6 mm to 204.4 mm in 24h), Squally Winds (50 to 70 km/h), Severe Thunderstorm with squall line / hail, or Elevated Heatwave conditions.',
    action:
      'Keep emergency kits ready. Secure loose outdoor fixtures and farm produce. Avoid travel through known waterlogging corridors. Fishermen to avoid deep sea.',
  },
  {
    level: 'Yellow (Watch — Be Updated)',
    colorName: 'Yellow',
    colorHex: '#EAB308',
    badgeClass: 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/45 text-[var(--m-watch)]',
    threshold:
      'Heavy Rainfall (64.5 mm to 115.5 mm in 24h), Scattered Thunderstorm with lightning activity, Moderate Wind Gusts (40 to 50 km/h), or Dense Fog (visibility 50-200m).',
    action:
      'Monitor daily IMD district weather updates. Exercise caution while commuting. Seek immediate indoor shelter upon hearing thunder or noticing dark squall clouds.',
  },
  {
    level: 'Green (No Warning — Normal)',
    colorName: 'Green',
    colorHex: '#22C7A0',
    badgeClass: 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/45 text-[var(--m-ok)]',
    threshold:
      'Routine seasonal meteorological conditions. No severe weather or high-impact weather hazards predicted over the subdivision during the forecast period.',
    action:
      'Normal daily outdoor, agricultural, commercial, and maritime operations may proceed without weather-induced restrictions. Follow routine advisories.',
  },
];

export const NationalClassificationMatrix: React.FC = () => {
  return (
    <DataPanel
      id="national-classification-matrix-section"
      className="flex flex-col gap-3.5"
    >
      <SectionHeading
        title="National Meteorological Classification Matrix"
        subtitle="Authoritative 4-stage warning thresholds & standard operating procedures (IMD)"
        icon={<Table2 className="w-4 h-4" />}
        badge={<SourceStatus status="REFERENCE" labelOverride="IMD SOP" />}
      />

      <div className="overflow-x-auto border border-[var(--m-border)] rounded-lg bg-[var(--m-surface-inset)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--m-border)] bg-[var(--m-surface-1)] text-[var(--m-text-muted)] uppercase tracking-wider text-[10px] font-mono font-bold">
              <th className="py-2.5 px-3 border-r border-[var(--m-border)] min-w-[170px]">Alert Level</th>
              <th className="py-2.5 px-3 border-r border-[var(--m-border)] min-w-[110px]">Color Code</th>
              <th className="py-2.5 px-3 border-r border-[var(--m-border)] min-w-[280px]">
                Atmospheric Threshold / Severity Meaning
              </th>
              <th className="py-2.5 px-3 min-w-[280px]">Standard Public Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--m-border)] text-[var(--m-text-secondary)]">
            {MATRIX_ROWS.map((row, idx) => (
              <tr key={idx} className="hover:bg-[var(--m-surface-2)]/50 transition-colors align-top">
                <td className="py-3 px-3 border-r border-[var(--m-border)] font-bold text-[var(--m-text-primary)] whitespace-nowrap">
                  {row.level}
                </td>

                <td className="py-3 px-3 border-r border-[var(--m-border)]">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${row.badgeClass}`}
                  >
                    <span
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: row.colorHex }}
                    />
                    <span>{row.colorName}</span>
                  </span>
                </td>

                <td className="py-3 px-3 border-r border-[var(--m-border)] leading-relaxed text-[var(--m-text-primary)]">
                  {row.threshold}
                </td>

                <td className="py-3 px-3 leading-relaxed text-[var(--m-text-secondary)]">
                  {row.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataPanel>
  );
};
