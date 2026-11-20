import React, { useState, useMemo } from 'react';
import { Thermometer } from 'lucide-react';
import { NWPForecastPoint } from '../../types/nwp';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';

interface TemperatureChartProps {
  points: NWPForecastPoint[];
  modelName: string;
}

export const TemperatureChart: React.FC<TemperatureChartProps> = ({
  points,
  modelName,
}) => {
  const [horizonFilter, setHorizonFilter] = useState<24 | 48 | 72 | 168>(24);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartPoints = useMemo(
    () => points.slice(0, horizonFilter).filter((p) => typeof p.temperature2m === 'number' && Number.isFinite(p.temperature2m)),
    [points, horizonFilter]
  );

  if (chartPoints.length < 3) {
    return (
      <DataPanel className="flex flex-col gap-3">
        <SectionHeading
          title={`Temperature Outlook — ${modelName}`}
          icon={<Thermometer className="w-4 h-4" />}
        />
        <UnavailableState
          title="Temperature Outlook Unavailable"
          reason={`Insufficient numerical temperature points from ${modelName} to plot a continuous thermal curve.`}
        />
      </DataPanel>
    );
  }

  const temps = chartPoints.map((p) => p.temperature2m as number);
  const minTemp = Math.floor(Math.min(...temps) - 1);
  const maxTemp = Math.ceil(Math.max(...temps) + 1);
  const tempRange = maxTemp - minTemp || 1;

  let maxIdx = 0;
  let minIdx = 0;
  chartPoints.forEach((p, idx) => {
    const val = p.temperature2m as number;
    if (val > (chartPoints[maxIdx].temperature2m as number)) maxIdx = idx;
    if (val < (chartPoints[minIdx].temperature2m as number)) minIdx = idx;
  });

  const svgWidth = 840;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 32;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingY * 2;

  const coords = chartPoints.map((pt, i) => {
    const x = paddingX + (i / (chartPoints.length - 1)) * usableWidth;
    const t = pt.temperature2m as number;
    const y = svgHeight - paddingY - ((t - minTemp) / tempRange) * usableHeight;
    return { x, y, pt };
  });

  const linePath = coords.reduce((acc, c, i) => {
    if (i === 0) return `M ${c.x} ${c.y}`;
    const prev = coords[i - 1];
    const midX = (prev.x + c.x) / 2;
    return `${acc} C ${midX} ${prev.y}, ${midX} ${c.y}, ${c.x} ${c.y}`;
  }, '');

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${svgHeight - paddingY} L ${coords[0].x} ${svgHeight - paddingY} Z`;

  const activePoint = hoverIndex !== null ? chartPoints[hoverIndex] : null;

  const formatHour = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${String(d.getHours()).padStart(2, '0')}:00`;
    } catch {
      return isoStr;
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <DataPanel className="flex flex-col gap-3">
      <SectionHeading
        title={`Temperature Outlook — ${modelName}`}
        subtitle="2m surface air temperature curve"
        icon={<Thermometer className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-1 bg-[var(--m-surface-inset)] p-1 rounded-lg border border-[var(--m-border)] text-xs font-mono">
            {([
              { label: '24H', val: 24 },
              { label: '48H', val: 48 },
              { label: '72H', val: 72 },
              { label: '7D', val: 168 },
            ] as const).map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setHorizonFilter(opt.val)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
                  horizonFilter === opt.val
                    ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] font-semibold'
                    : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 min-h-[28px] text-xs font-mono tabular-nums px-1">
        {activePoint ? (
          <div className="flex items-center gap-2.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] px-3 py-1 rounded-lg text-[var(--m-text-primary)]">
            <span className="text-[var(--m-accent)] font-bold">
              {formatDate(activePoint.validTime)} {formatHour(activePoint.validTime)}
            </span>
            <span className="text-[var(--m-border-strong)]">·</span>
            <span className="text-[var(--weather-hot)] font-bold">
              Temp: {activePoint.temperature2m}°C
            </span>
            {activePoint.apparentTemperature !== undefined && (
              <>
                <span className="text-[var(--m-border-strong)]">·</span>
                <span className="text-[var(--m-text-secondary)]">
                  Feels: {activePoint.apparentTemperature}°C
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="text-[var(--m-text-muted)] text-[11px] font-sans">
            Hover across the curve to inspect hourly temperature steps.
          </span>
        )}

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-[var(--m-watch)]">Peak: {chartPoints[maxIdx]?.temperature2m}°C</span>
          <span className="text-[var(--m-accent)]">Min: {chartPoints[minIdx]?.temperature2m}°C</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[560px]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="nwpTempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E27B55" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#E6B96B" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + ratio * usableHeight;
            const tempVal = Math.round(maxTemp - ratio * tempRange);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="rgba(226, 219, 200, 0.14)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#898B83"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {tempVal}°
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#nwpTempGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#E27B55"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coords[maxIdx] && (
            <g transform={`translate(${coords[maxIdx].x}, ${coords[maxIdx].y})`}>
              <circle r="4.5" fill="#E27B55" stroke="#0B0C0D" strokeWidth="2" />
              <text y="-8" textAnchor="middle" fill="#E6B96B" fontSize="10" fontWeight="bold" fontFamily="monospace">
                MAX {coords[maxIdx].pt.temperature2m}°
              </text>
            </g>
          )}

          {coords[minIdx] && minIdx !== maxIdx && (
            <g transform={`translate(${coords[minIdx].x}, ${coords[minIdx].y})`}>
              <circle r="4.5" fill="#91B6CC" stroke="#0B0C0D" strokeWidth="2" />
              <text y="16" textAnchor="middle" fill="#A7C5C5" fontSize="10" fontWeight="bold" fontFamily="monospace">
                MIN {coords[minIdx].pt.temperature2m}°
              </text>
            </g>
          )}

          {coords.map((c, i) => {
            const isStepLabel =
              coords.length <= 24 ? i % 3 === 0 : coords.length <= 48 ? i % 6 === 0 : i % 12 === 0;
            const isHovered = hoverIndex === i;

            return (
              <g key={i}>
                {isStepLabel && (
                  <text
                    x={c.x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill="#898B83"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {formatHour(c.pt.validTime)}
                  </text>
                )}

                <rect
                  x={c.x - usableWidth / coords.length / 2}
                  y={0}
                  width={usableWidth / coords.length}
                  height={svgHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIndex(i)}
                />

                {isHovered && (
                  <g>
                    <line
                      x1={c.x}
                      y1={paddingY}
                      x2={c.x}
                      y2={svgHeight - paddingY}
                      stroke="#C5A46D"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <circle cx={c.x} cy={c.y} r="5" fill="#F0EEE7" stroke="#E27B55" strokeWidth="2.5" />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </DataPanel>
  );
};
