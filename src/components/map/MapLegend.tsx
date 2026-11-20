import React from 'react';

interface MapLegendProps {
  metric: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({ metric }) => {
  const normalizedMetric = (metric || '').toLowerCase();

  const getLegendItems = () => {
    if (normalizedMetric.includes('temp')) {
      return [
        { label: '≤ 15°C Cold', color: '#91B6CC' },
        { label: '16–22°C Mild', color: '#78AEB6' },
        { label: '23–26°C Optimal', color: '#5C9A79' },
        { label: '27–30°C Warm', color: '#E6B96B' },
        { label: '31–34°C Hot', color: '#D98548' },
        { label: '≥ 35°C Heatwave', color: '#C94F4B' },
      ];
    }
    if (normalizedMetric.includes('rain')) {
      return [
        { label: '0 mm (Dry)', color: '#202424' },
        { label: '< 5 mm (Light)', color: '#A7C5C5' },
        { label: '5–15 mm (Moderate)', color: '#78AEB6' },
        { label: '15–30 mm (Heavy)', color: '#5C9A79' },
        { label: '> 30 mm (Very Heavy)', color: '#D8B14F' },
      ];
    }
    if (normalizedMetric.includes('aqi') || normalizedMetric.includes('air')) {
      return [
        { label: '0–50 Good', color: '#5C9A79' },
        { label: '51–100 Satisfactory', color: '#89977B' },
        { label: '101–200 Moderate', color: '#D8B14F' },
        { label: '201–300 Poor', color: '#D98548' },
        { label: '301–400 Very Poor', color: '#C94F4B' },
        { label: '> 400 Severe', color: '#8B2635' },
      ];
    }
    if (normalizedMetric.includes('humid') || normalizedMetric.includes('rh')) {
      return [
        { label: '< 40% Dry', color: '#D98548' },
        { label: '40–55% Comfortable', color: '#E6B96B' },
        { label: '55–70% Normal', color: '#89977B' },
        { label: '70–85% Humid', color: '#A7C5C5' },
        { label: '> 85% Very Humid', color: '#78AEB6' },
      ];
    }
    if (normalizedMetric.includes('wind')) {
      return [
        { label: '≤ 10 km/h Light', color: '#A7C5C5' },
        { label: '11–20 km/h Moderate', color: '#9CAF9A' },
        { label: '21–35 km/h Fresh', color: '#E6B96B' },
        { label: '36–50 km/h Strong', color: '#D98548' },
        { label: '> 50 km/h Squall', color: '#C94F4B' },
      ];
    }
    if (normalizedMetric.includes('warn')) {
      return [
        { label: 'Normal (Routine)', color: '#5C9A79' },
        { label: 'Yellow Watch', color: '#D8B14F' },
        { label: 'Orange Alert', color: '#D98548' },
        { label: 'Red Warning', color: '#C94F4B' },
      ];
    }
    return [
      { label: '≤ 15°C Cold', color: '#91B6CC' },
      { label: '16–22°C Mild', color: '#78AEB6' },
      { label: '23–26°C Optimal', color: '#5C9A79' },
      { label: '27–30°C Warm', color: '#E6B96B' },
      { label: '31–34°C Hot', color: '#D98548' },
      { label: '≥ 35°C Heatwave', color: '#C94F4B' },
    ];
  };

  const items = getLegendItems();

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--m-text-secondary)] bg-[var(--m-surface-inset)] p-3 rounded-xl border border-[var(--m-border)]">
      <span className="font-mono font-semibold text-[var(--m-text-primary)] text-[10px] uppercase tracking-wider shrink-0">
        Legend
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 bg-[var(--m-surface-inset)] px-2 py-0.5 rounded-md border border-[var(--m-border)]"
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/15"
              style={{ backgroundColor: it.color }}
            />
            <span className="text-[10px] font-mono text-[var(--m-text-secondary)] whitespace-nowrap">
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
