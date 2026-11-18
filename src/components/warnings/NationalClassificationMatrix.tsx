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
    badgeClass: 'bg-[#EF4444]/15 border-[#EF4444]/45 text-[#FCA5A5]',
    threshold:
      'Extremely Heavy Rainfall (≥ 204.5 mm in 24h), Super/Very Severe Cyclonic Storm (wind > 90 km/h), Violent Flash Flooding, or Severe Heatwave (> 45°C with severe departure).',
    action:
      'Immediate disaster response deployment (NDRF/SDRF). Total ban on coastal ventures. Evacuate vulnerable settlements. Follow all local administration movement restrictions.',
  },
  {
    level: 'Orange (Alert — Be Prepared)',
    colorName: 'Orange',
    colorHex: '#F97316',
    badgeClass: 'bg-[#F97316]/15 border-[#F97316]/45 text-[#FDBA74]',
    threshold:
      'Very Heavy Rainfall (115.6 mm to 204.4 mm in 24h), Squally Winds (50 to 70 km/h), Severe Thunderstorm with squall line / hail, or Elevated Heatwave conditions.',
    action:
      'Keep emergency kits ready. Secure loose outdoor fixtures and farm produce. Avoid travel through known waterlogging corridors. Fishermen to avoid deep sea.',
  },
  {
    level: 'Yellow (Watch — Be Updated)',
    colorName: 'Yellow',
    colorHex: '#EAB308',
    badgeClass: 'bg-[#EAB308]/15 border-[#EAB308]/45 text-[#FDE047]',
    threshold:
      'Heavy Rainfall (64.5 mm to 115.5 mm in 24h), Scattered Thunderstorm with lightning activity, Moderate Wind Gusts (40 to 50 km/h), or Dense Fog (visibility 50-200m).',
    action:
      'Monitor daily IMD district weather updates. Exercise caution while commuting. Seek immediate indoor shelter upon hearing thunder or noticing dark squall clouds.',
  },
  {
    level: 'Green (No Warning — Normal)',
    colorName: 'Green',
    colorHex: '#22C7A0',
    badgeClass: 'bg-[#22C7A0]/15 border-[#22C7A0]/45 text-[#6EE7B7]',
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

      <div className="overflow-x-auto border border-[#26394B] rounded-lg bg-[#08131F]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#26394B] bg-[#0B1927] text-[#8295A8] uppercase tracking-wider text-[10px] font-mono font-bold">
              <th className="py-2.5 px-3 border-r border-[#26394B] min-w-[170px]">Alert Level</th>
              <th className="py-2.5 px-3 border-r border-[#26394B] min-w-[110px]">Color Code</th>
              <th className="py-2.5 px-3 border-r border-[#26394B] min-w-[280px]">
                Atmospheric Threshold / Severity Meaning
              </th>
              <th className="py-2.5 px-3 min-w-[280px]">Standard Public Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#26394B] text-[#B5C3D1]">
            {MATRIX_ROWS.map((row, idx) => (
              <tr key={idx} className="hover:bg-[#101F2E]/50 transition-colors align-top">
                <td className="py-3 px-3 border-r border-[#26394B] font-bold text-[#F3F6FA] whitespace-nowrap">
                  {row.level}
                </td>

                <td className="py-3 px-3 border-r border-[#26394B]">
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

                <td className="py-3 px-3 border-r border-[#26394B] leading-relaxed text-[#F3F6FA]">
                  {row.threshold}
                </td>

                <td className="py-3 px-3 leading-relaxed text-[#B5C3D1]">
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
