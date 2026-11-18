import React, { useState, useMemo } from 'react';
import { CloudRain } from 'lucide-react';
import { NWPForecastPoint } from '../../types/nwp';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';

interface PrecipitationPanelProps {
  points: NWPForecastPoint[];
}

export const PrecipitationPanel: React.FC<PrecipitationPanelProps> = ({ points }) => {
  const [horizonFilter, setHorizonFilter] = useState<24 | 48 | 72>(24);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartPoints = useMemo(() => points.slice(0, horizonFilter), [points, horizonFilter]);

  const hasPrecipSeries = useMemo(
    () => chartPoints.some((p) => typeof p.precipitation === 'number' || typeof p.precipitationProbability === 'number'),
    [chartPoints]
  );

  const totalExpectedMm = useMemo(() => {
    const valid = chartPoints.filter((p) => typeof p.precipitation === 'number');
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, p) => acc + (p.precipitation as number), 0);
    return Math.round(sum * 10) / 10;
  }, [chartPoints]);

  const maxPrecip = useMemo(() => {
    const max = Math.max(...chartPoints.map((p) => (typeof p.precipitation === 'number' ? p.precipitation : 0)), 0);
    return Math.max(max, 3);
  }, [chartPoints]);

  if (chartPoints.length < 3 || !hasPrecipSeries) {
    return (
      <DataPanel className="flex flex-col gap-3">
        <SectionHeading
          title="Precipitation Outlook"
          icon={<CloudRain className="w-4 h-4" />}
        />
        <UnavailableState
          title="Precipitation Telemetry Unavailable"
          reason="Model cycle did not return hourly precipitation or probability fields for this coordinate."
        />
      </DataPanel>
    );
  }

  const svgWidth = 600;
  const svgHeight = 180;
  const paddingX = 35;
  const paddingY = 25;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingY * 2;

  const probCoords = chartPoints
    .map((p, i) => {
      if (typeof p.precipitationProbability !== 'number') return null;
      const x = paddingX + (i / (chartPoints.length - 1)) * usableWidth;
      const y = svgHeight - paddingY - (p.precipitationProbability / 100) * usableHeight;
      return { x, y, i };
    })
    .filter((c): c is { x: number; y: number; i: number } => c !== null);

  const probLinePath = probCoords.reduce((acc, c, idx) => {
    return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
  }, '');

  const activePoint = hoverIndex !== null ? chartPoints[hoverIndex] : null;

  const formatHour = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${String(d.getHours()).padStart(2, '0')}:00`;
    } catch {
      return isoStr;
    }
  };

  return (
    <DataPanel className="flex flex-col gap-3">
      <SectionHeading
        title="Precipitation Outlook"
        subtitle="Hourly QPF accumulation (mm) and occurrence probability"
        icon={<CloudRain className="w-4 h-4" />}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#08131F] border border-[#26394B] text-xs font-mono tabular-nums">
              <span className="text-[#8295A8]">TOTAL:</span>
              <span className="text-[#22C7A0] font-bold">
                {totalExpectedMm !== null ? `${totalExpectedMm} mm` : '—'}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-[#08131F] p-1 rounded-lg border border-[#26394B] text-xs font-mono">
              {([24, 48, 72] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonFilter(h)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
                    horizonFilter === h
                      ? 'bg-[#0B72B9] text-white font-semibold'
                      : 'text-[#8295A8] hover:text-[#F3F6FA]'
                  }`}
                >
                  {h}H
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 min-h-[26px] text-xs font-mono tabular-nums px-1">
        {activePoint ? (
          <div className="flex items-center gap-2 bg-[#08131F] border border-[#26394B] px-2.5 py-0.5 rounded-lg text-[#F3F6FA]">
            <span className="text-[#35C7E8] font-bold">{formatHour(activePoint.validTime)}</span>
            <span className="text-[#26394B]">·</span>
            <span className="text-[#6EE7B7] font-bold">
              Rain: {typeof activePoint.precipitation === 'number' ? `${activePoint.precipitation} mm` : '—'}
            </span>
            <span className="text-[#26394B]">·</span>
            <span className="text-[#FCD34D]">
              Prob: {typeof activePoint.precipitationProbability === 'number' ? `${activePoint.precipitationProbability}%` : '—'}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-[#8295A8] font-sans">
            Bars = Hourly Rainfall (mm) · Dashed Line = Probability (%)
          </span>
        )}

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#6EE7B7]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#22C7A0]" />
            <span>Rain (mm)</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#FCD34D]">
            <span className="w-3 h-0.5 bg-[#F59E0B]" />
            <span>Probability (%)</span>
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[480px]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {[0, 0.5, 1].map((r, i) => {
            const y = paddingY + r * usableHeight;
            const mmVal = Math.round((1 - r) * maxPrecip * 10) / 10;
            const pctVal = Math.round((1 - r) * 100);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#26394B"
                  strokeOpacity="0.6"
                  strokeDasharray="3 3"
                />
                <text x={paddingX - 6} y={y + 3} textAnchor="end" fill="#22C7A0" fontSize="9" fontFamily="monospace">
                  {mmVal}
                </text>
                <text x={svgWidth - paddingX + 6} y={y + 3} textAnchor="start" fill="#F59E0B" fontSize="9" fontFamily="monospace">
                  {pctVal}%
                </text>
              </g>
            );
          })}

          {chartPoints.map((p, i) => {
            const barW = Math.max(usableWidth / chartPoints.length - 2, 4);
            const x = paddingX + (i / (chartPoints.length - 1)) * (usableWidth - barW);
            const val = typeof p.precipitation === 'number' ? p.precipitation : 0;
            const barH = (val / maxPrecip) * usableHeight;
            const y = svgHeight - paddingY - barH;
            const isHovered = hoverIndex === i;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(barH, val > 0 ? 2 : 0)}
                  rx="1.5"
                  fill={isHovered ? '#6EE7B7' : '#22C7A0'}
                  opacity={val > 0 ? (isHovered ? 1 : 0.85) : 0.12}
                />

                <rect
                  x={x - 1}
                  y={0}
                  width={barW + 2}
                  height={svgHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              </g>
            );
          })}

          {probLinePath && (
            <path
              d={probLinePath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeDasharray="3 2"
            />
          )}

          {hoverIndex !== null && (() => {
            const hoveredProb = probCoords.find((c) => c.i === hoverIndex);
            if (!hoveredProb) return null;
            return (
              <circle
                cx={hoveredProb.x}
                cy={hoveredProb.y}
                r="4"
                fill="#F3F6FA"
                stroke="#F59E0B"
                strokeWidth="2"
              />
            );
          })()}

          {chartPoints.map((p, i) => {
            const step = chartPoints.length <= 24 ? 4 : chartPoints.length <= 48 ? 8 : 12;
            if (i % step !== 0) return null;
            const x = paddingX + (i / (chartPoints.length - 1)) * usableWidth;

            return (
              <text
                key={i}
                x={x}
                y={svgHeight - 6}
                textAnchor="middle"
                fill="#8295A8"
                fontSize="9"
                fontFamily="monospace"
              >
                {formatHour(p.validTime)}
              </text>
            );
          })}
        </svg>
      </div>
    </DataPanel>
  );
};
