import React, { useState, useMemo } from 'react';
import { NWPForecastPoint } from '../../types/nwp';
import { Thermometer, AlertCircle } from 'lucide-react';

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

  const chartPoints = useMemo(() => {
    return points.slice(0, horizonFilter);
  }, [points, horizonFilter]);

  if (chartPoints.length < 3) {
    return (
      <div className="nwp-card p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
        <AlertCircle className="w-5 h-5 text-slate-500" />
        <span className="text-xs font-mono text-[#AFC4D8]">
          NO FORECAST DATA AVAILABLE FOR TEMPERATURE OUTLOOK
        </span>
      </div>
    );
  }

  const temps = chartPoints.map((p) => p.temperature2m ?? 0);
  const minTemp = Math.floor(Math.min(...temps) - 1);
  const maxTemp = Math.ceil(Math.max(...temps) + 1);
  const tempRange = maxTemp - minTemp || 1;

  // Identify min and max point indices for markers
  let maxIdx = 0;
  let minIdx = 0;
  chartPoints.forEach((p, idx) => {
    if (typeof p.temperature2m === 'number') {
      if (p.temperature2m > (chartPoints[maxIdx].temperature2m ?? -Infinity)) maxIdx = idx;
      if (p.temperature2m < (chartPoints[minIdx].temperature2m ?? Infinity)) minIdx = idx;
    }
  });

  // SVG dimensions
  const svgWidth = 840;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 32;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingY * 2;

  // Compute point coordinates
  const coords = chartPoints.map((pt, i) => {
    const x = paddingX + (i / (chartPoints.length - 1)) * usableWidth;
    const t = pt.temperature2m ?? minTemp;
    const y = svgHeight - paddingY - ((t - minTemp) / tempRange) * usableHeight;
    return { x, y, pt };
  });

  // Build smooth bezier path
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
    <div className="nwp-card flex flex-col gap-3 rounded-2xl p-4 sm:p-5 shadow-md">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1D5278]/60">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
            Temperature Outlook — {modelName}
          </h3>
        </div>

        {/* Horizon selector: 24H, 48H, 72H, 7D */}
        <div className="flex items-center gap-1 bg-[#081F33] p-1 rounded-xl border border-[#1D5278] text-xs font-mono self-start sm:self-auto">
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
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer text-xs font-medium ${
                horizonFilter === opt.val
                  ? 'bg-[#1565C0] text-white font-bold shadow-xs'
                  : 'text-[#AFC4D8] hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tooltip Readout Bar */}
      <div className="flex items-center justify-between min-h-[28px] text-xs font-mono px-2">
        {activePoint ? (
          <div className="flex items-center gap-3 bg-[#102D44] border border-[#1D5278] px-3 py-1 rounded-lg text-white">
            <span className="text-[#29B6F6] font-bold">
              {formatDate(activePoint.validTime)} {formatHour(activePoint.validTime)}
            </span>
            <span>•</span>
            <span className="text-amber-300 font-bold">
              Temp: {activePoint.temperature2m}°C
            </span>
            {activePoint.apparentTemperature !== undefined && (
              <>
                <span>•</span>
                <span className="text-[#AFC4D8]">
                  Feels Like: {activePoint.apparentTemperature}°C
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="text-[#AFC4D8] text-[11px] font-sans">
            Hover over curve to inspect hourly temperature and apparent heat index.
          </span>
        )}

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-amber-300">Peak: {chartPoints[maxIdx]?.temperature2m}°C</span>
          <span className="text-[#29B6F6]">Min: {chartPoints[minIdx]?.temperature2m}°C</span>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[560px]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="nwpTempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#1565C0" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
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
                  stroke="#1D5278"
                  strokeOpacity="0.35"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#AFC4D8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {tempVal}°
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#nwpTempGrad)" />

          {/* Main temperature curve */}
          <path
            d={linePath}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Min & Max Peak Markers */}
          {coords[maxIdx] && (
            <g transform={`translate(${coords[maxIdx].x}, ${coords[maxIdx].y})`}>
              <circle r="4.5" fill="#F59E0B" stroke="#061A2B" strokeWidth="2" />
              <text y="-8" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="bold" fontFamily="monospace">
                MAX {coords[maxIdx].pt.temperature2m}°
              </text>
            </g>
          )}

          {coords[minIdx] && minIdx !== maxIdx && (
            <g transform={`translate(${coords[minIdx].x}, ${coords[minIdx].y})`}>
              <circle r="4.5" fill="#29B6F6" stroke="#061A2B" strokeWidth="2" />
              <text y="16" textAnchor="middle" fill="#29B6F6" fontSize="10" fontWeight="bold" fontFamily="monospace">
                MIN {coords[minIdx].pt.temperature2m}°
              </text>
            </g>
          )}

          {/* Interactive hover points & time labels */}
          {coords.map((c, i) => {
            const isStepLabel =
              coords.length <= 24
                ? i % 3 === 0
                : coords.length <= 48
                ? i % 6 === 0
                : i % 12 === 0;

            const isHovered = hoverIndex === i;

            return (
              <g key={i}>
                {isStepLabel && (
                  <text
                    x={c.x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill="#AFC4D8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {formatHour(c.pt.validTime)}
                  </text>
                )}

                {/* Hover trigger zone */}
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
                      stroke="#29B6F6"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <circle cx={c.x} cy={c.y} r="5" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2.5" />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
