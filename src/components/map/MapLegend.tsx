import React from 'react';

interface MapLegendProps {
  metric: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({ metric }) => {
  const normalizedMetric = (metric || '').toLowerCase();

  const getLegendItems = () => {
    if (normalizedMetric.includes('temp')) {
      return [
        { label: '≤ 15°C Cold', color: '#35C7E8' },
        { label: '16–22°C Mild', color: '#0B72B9' },
        { label: '23–26°C Optimal', color: '#22C7A0' },
        { label: '27–30°C Warm', color: '#F59E0B' },
        { label: '31–34°C Hot', color: '#F97316' },
        { label: '≥ 35°C Heatwave', color: '#EF4444' },
      ];
    }
    if (normalizedMetric.includes('rain')) {
      return [
        { label: '0 mm (Dry)', color: '#101F2E' },
        { label: '< 5 mm (Light)', color: '#0B72B9' },
        { label: '5–15 mm (Moderate)', color: '#35C7E8' },
        { label: '15–30 mm (Heavy)', color: '#22C7A0' },
        { label: '> 30 mm (Very Heavy)', color: '#F59E0B' },
      ];
    }
    if (normalizedMetric.includes('aqi') || normalizedMetric.includes('air')) {
      return [
        { label: '0–50 Good', color: '#22C7A0' },
        { label: '51–100 Satisfactory', color: '#84CC16' },
        { label: '101–200 Moderate', color: '#F59E0B' },
        { label: '201–300 Poor', color: '#F97316' },
        { label: '301–400 Very Poor', color: '#EF4444' },
        { label: '> 400 Severe', color: '#991B1B' },
      ];
    }
    if (normalizedMetric.includes('humid') || normalizedMetric.includes('rh')) {
      return [
        { label: '< 40% Dry', color: '#F97316' },
        { label: '40–55% Comfortable', color: '#F59E0B' },
        { label: '55–70% Normal', color: '#35C7E8' },
        { label: '70–85% Humid', color: '#0B72B9' },
        { label: '> 85% Very Humid', color: '#22C7A0' },
      ];
    }
    if (normalizedMetric.includes('wind')) {
      return [
        { label: '≤ 10 km/h Light', color: '#35C7E8' },
        { label: '11–20 km/h Moderate', color: '#22C7A0' },
        { label: '21–35 km/h Fresh', color: '#F59E0B' },
        { label: '36–50 km/h Strong', color: '#F97316' },
        { label: '> 50 km/h Squall', color: '#EF4444' },
      ];
    }
    if (normalizedMetric.includes('warn')) {
      return [
        { label: 'Normal (Routine)', color: '#22C7A0' },
        { label: 'Yellow Watch', color: '#F59E0B' },
        { label: 'Orange Alert', color: '#F97316' },
        { label: 'Red Warning', color: '#EF4444' },
      ];
    }
    return [
      { label: '≤ 15°C Cold', color: '#35C7E8' },
      { label: '16–22°C Mild', color: '#0B72B9' },
      { label: '23–26°C Optimal', color: '#22C7A0' },
      { label: '27–30°C Warm', color: '#F59E0B' },
      { label: '31–34°C Hot', color: '#F97316' },
      { label: '≥ 35°C Heatwave', color: '#EF4444' },
    ];
  };

  const items = getLegendItems();

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#B5C3D1] bg-[#08131F] p-3 rounded-xl border border-[#26394B]">
      <span className="font-mono font-semibold text-[#F3F6FA] text-[10px] uppercase tracking-wider shrink-0">
        Legend
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 bg-[#0B1927] px-2 py-0.5 rounded-md border border-[#26394B]"
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/15"
              style={{ backgroundColor: it.color }}
            />
            <span className="text-[10px] font-mono text-[#B5C3D1] whitespace-nowrap">
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
