import React, { useState, useMemo } from 'react';
import { NWPForecastPoint } from '../../types/nwp';
import { CloudRain, AlertCircle, Droplets } from 'lucide-react';

interface PrecipitationPanelProps {
  points: NWPForecastPoint[];
}

export const PrecipitationPanel: React.FC<PrecipitationPanelProps> = ({ points }) => {
  const [horizonFilter, setHorizonFilter] = useState<24 | 48 | 72>(24);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartPoints = useMemo(() => {
    return points.slice(0, horizonFilter);
  }, [points, horizonFilter]);

  // Total expected precipitation calculated from actual points
  const totalExpectedMm = useMemo(() => {
    const sum = chartPoints.reduce((acc, p) => acc + (p.precipitation || 0), 0);
    return Math.round(sum * 10) / 10;
  }, [chartPoints]);

  const maxPrecip = useMemo(() => {
    const max = Math.max(...chartPoints.map((p) => p.precipitation || 0));
    return Math.max(max, 3); // Minimum scale of 3mm for readable graph
  }, [chartPoints]);

  if (chartPoints.length < 3) {
    return (
      <div className="nwp-card p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
        <AlertCircle className="w-5 h-5 text-slate-500" />
        <span className="text-xs font-mono text-[#AFC4D8]">
          NO PRECIPITATION DATA AVAILABLE
        </span>
      </div>
    );
  }

  const svgWidth = 600;
  const svgHeight = 180;
  const paddingX = 35;
  const paddingY = 25;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingY * 2;

  // Probability line coordinates (0–100%)
  const probCoords = chartPoints.map((p, i) => {
    const x = paddingX + (i / (chartPoints.length - 1)) * usableWidth;
    const prob = p.precipitationProbability ?? 0;
    const y = svgHeight - paddingY - (prob / 100) * usableHeight;
    return { x, y, prob };
  });

  const probLinePath = probCoords.reduce((acc, c, i) => {
    return i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
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
    <div className="nwp-card flex flex-col gap-3 rounded-2xl p-4 sm:p-5 shadow-md">
      {/* Header with Title & Horizon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1D5278]/60">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-[#00E676]" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
            Precipitation Outlook
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Total Expected Badge strictly from actual points */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#081F33] border border-[#1D5278] text-xs font-mono">
            <span className="text-[#AFC4D8]">TOTAL EXPECTED:</span>
            <span className="text-[#00E676] font-bold">{totalExpectedMm} mm</span>
          </div>

          <div className="flex items-center gap-1 bg-[#081F33] p-1 rounded-xl border border-[#1D5278] text-xs font-mono">
            {([24, 48, 72] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizonFilter(h)}
                className={`px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer text-xs font-medium ${
                  horizonFilter === h
                    ? 'bg-[#1565C0] text-white font-bold'
                    : 'text-[#AFC4D8] hover:text-white'
                }`}
              >
                {h}H
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip & Legend Bar */}
      <div className="flex items-center justify-between min-h-[26px] text-xs font-mono px-1">
        {activePoint ? (
          <div className="flex items-center gap-2 bg-[#102D44] border border-[#1D5278] px-2.5 py-0.5 rounded text-white">
            <span className="text-[#29B6F6] font-bold">{formatHour(activePoint.validTime)}</span>
            <span>•</span>
            <span className="text-[#00E676] font-bold">Rain: {activePoint.precipitation || 0} mm</span>
            <span>•</span>
            <span className="text-amber-300">Prob: {activePoint.precipitationProbability || 0}%</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#AFC4D8] font-sans">
            Bars = Hourly Rainfall (mm) • Line = Rain Probability (%)
          </span>
        )}

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-[#00E676]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#00E676]" />
            <span>Rain (mm)</span>
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <span className="w-2 h-0.5 bg-amber-400" />
            <span>Probability (%)</span>
          </span>
        </div>
      </div>

      {/* Responsive Bar + Line Chart */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[480px]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Grid lines */}
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
                  stroke="#1D5278"
                  strokeOpacity="0.3"
                  strokeDasharray="3 3"
                />
                <text x={paddingX - 6} y={y + 3} textAnchor="end" fill="#00E676" fontSize="9" fontFamily="monospace">
                  {mmVal}m
                </text>
                <text x={svgWidth - paddingX + 6} y={y + 3} textAnchor="start" fill="#F59E0B" fontSize="9" fontFamily="monospace">
                  {pctVal}%
                </text>
              </g>
            );
          })}

          {/* Precipitation Bars */}
          {chartPoints.map((p, i) => {
            const barW = Math.max(usableWidth / chartPoints.length - 2, 4);
            const x = paddingX + (i / (chartPoints.length - 1)) * (usableWidth - barW);
            const val = p.precipitation || 0;
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
                  fill={isHovered ? '#69F0AE' : '#00E676'}
                  opacity={val > 0 ? (isHovered ? 1 : 0.85) : 0.15}
                />

                {/* Hover trigger column */}
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

          {/* Probability Line */}
          <path
            d={probLinePath}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="2 2"
          />

          {/* Hover highlight line */}
          {hoverIndex !== null && probCoords[hoverIndex] && (
            <circle
              cx={probCoords[hoverIndex].x}
              cy={probCoords[hoverIndex].y}
              r="4"
              fill="#FFFFFF"
              stroke="#F59E0B"
              strokeWidth="2"
            />
          )}

          {/* Time axis labels */}
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
                fill="#AFC4D8"
                fontSize="9"
                fontFamily="monospace"
              >
                {formatHour(p.validTime)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
