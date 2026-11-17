import React, { useMemo } from 'react';
import { NWPForecastPoint } from '../../types/nwp';
import { Wind, Gauge, Droplets, Compass } from 'lucide-react';

interface WindPressureChartsProps {
  points: NWPForecastPoint[];
}

export const WindPressureCharts: React.FC<WindPressureChartsProps> = ({ points }) => {
  const chartPoints = useMemo(() => points.slice(0, 24), [points]);

  const currentPoint = chartPoints[0];
  const windDirDeg = currentPoint?.windDirection10m ?? 0;

  // Direction arrow symbol and cardinal based on degrees
  const getDirectionInfo = (deg: number) => {
    const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round((deg % 360) / 45) % 8;
    return {
      arrow: arrows[idx],
      cardinal: cardinals[idx],
      deg,
    };
  };

  const dirInfo = getDirectionInfo(windDirDeg);

  // Pressure range for MSLP chart
  const pressures = chartPoints.map((p) => p.pressureMSL).filter((p): p is number => typeof p === 'number');
  const minPressure = pressures.length > 0 ? Math.floor(Math.min(...pressures) - 2) : 1000;
  const maxPressure = pressures.length > 0 ? Math.ceil(Math.max(...pressures) + 2) : 1020;
  const pressRange = maxPressure - minPressure || 1;

  // Humidity range (0-100%)
  const humidities = chartPoints.map((p) => p.relativeHumidity).filter((h): h is number => typeof h === 'number');

  const svgW = 400;
  const svgH = 110;
  const padX = 25;
  const padY = 18;
  const uW = svgW - padX * 2;
  const uH = svgH - padY * 2;

  // Pressure path
  const pressCoords = chartPoints.map((p, i) => {
    const x = padX + (i / Math.max(chartPoints.length - 1, 1)) * uW;
    const val = p.pressureMSL ?? minPressure;
    const y = svgH - padY - ((val - minPressure) / pressRange) * uH;
    return { x, y, val };
  });

  const pressPath = pressCoords.reduce((acc, c, i) => {
    return i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
  }, '');

  // Humidity path
  const humidCoords = chartPoints.map((p, i) => {
    const x = padX + (i / Math.max(chartPoints.length - 1, 1)) * uW;
    const val = p.relativeHumidity ?? 50;
    const y = svgH - padY - (val / 100) * uH;
    return { x, y, val };
  });

  const humidPath = humidCoords.reduce((acc, c, i) => {
    return i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
  }, '');

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 13. WIND OUTLOOK */}
      <div className="nwp-card flex flex-col gap-3 rounded-2xl p-4 sm:p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1D5278]/60">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-[#29B6F6]" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
              Wind Outlook (10m Vector Field)
            </h3>
          </div>

          {/* Actual direction indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#081F33] border border-[#1D5278] text-xs font-mono">
            <span className="text-[#AFC4D8]">CURRENT DIRECTION:</span>
            <span className="text-[#29B6F6] font-bold">
              {dirInfo.arrow} {dirInfo.deg}° ({dirInfo.cardinal})
            </span>
          </div>
        </div>

        {/* 24-hr Wind & Gusts mini graph */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#081F33] border border-[#1D5278]">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Sustained Speed</span>
            <span className="text-xl font-bold font-mono text-white">
              {currentPoint?.windSpeed10m !== undefined ? `${currentPoint.windSpeed10m} km/h` : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">Mean 10-meter boundary velocity</span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#081F33] border border-[#1D5278]">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Peak Gust</span>
            <span className="text-xl font-bold font-mono text-[#29B6F6]">
              {currentPoint?.windGusts10m !== undefined ? `${currentPoint.windGusts10m} km/h` : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">Turbulent kinetic gust potential</span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#081F33] border border-[#1D5278]">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Vector Azimuth</span>
            <span className="text-xl font-bold font-mono text-amber-300">
              {currentPoint?.windDirection10m !== undefined ? `${currentPoint.windDirection10m}°` : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">Meteorological origin direction</span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#081F33] border border-[#1D5278]">
            <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Convective Threat</span>
            <span className="text-sm font-bold font-mono text-[#00E676] mt-1">
              {(currentPoint?.windGusts10m || 0) > 45 ? 'MODERATE GUST RISK' : 'NORMAL GRADIENT'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">Synoptic pressure driven</span>
          </div>
        </div>
      </div>

      {/* 14. PRESSURE + HUMIDITY (2 equal cards on desktop, 1 on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Sea Level Pressure */}
        <div className="nwp-card flex flex-col justify-between gap-3 rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
                Sea Level Pressure (MSLP)
              </h4>
            </div>
            <span className="text-xs font-mono font-bold text-purple-300">
              {currentPoint?.pressureMSL !== undefined ? `${currentPoint.pressureMSL} hPa` : '—'}
            </span>
          </div>

          <div className="w-full">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
              <line x1={padX} y1={padY} x2={svgW - padX} y2={padY} stroke="#1D5278" strokeDasharray="3 3" />
              <line x1={padX} y1={svgH - padY} x2={svgW - padX} y2={svgH - padY} stroke="#1D5278" strokeDasharray="3 3" />
              <path d={pressPath} fill="none" stroke="#C084FC" strokeWidth="2" />
              {pressCoords.length > 0 && (
                <circle cx={pressCoords[0].x} cy={pressCoords[0].y} r="3.5" fill="#C084FC" />
              )}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#AFC4D8] pt-1 border-t border-[#1D5278]/50">
            <span>Range: {minPressure} – {maxPressure} hPa</span>
            <span>24h Barometric Trend</span>
          </div>
        </div>

        {/* Card 2: Relative Humidity */}
        <div className="nwp-card flex flex-col justify-between gap-3 rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[#29B6F6]" />
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
                Relative Humidity
              </h4>
            </div>
            <span className="text-xs font-mono font-bold text-[#29B6F6]">
              {currentPoint?.relativeHumidity !== undefined ? `${currentPoint.relativeHumidity}%` : '—'}
            </span>
          </div>

          <div className="w-full">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
              <line x1={padX} y1={padY} x2={svgW - padX} y2={padY} stroke="#1D5278" strokeDasharray="3 3" />
              <line x1={padX} y1={svgH - padY} x2={svgW - padX} y2={svgH - padY} stroke="#1D5278" strokeDasharray="3 3" />
              <path d={humidPath} fill="none" stroke="#29B6F6" strokeWidth="2" />
              {humidCoords.length > 0 && (
                <circle cx={humidCoords[0].x} cy={humidCoords[0].y} r="3.5" fill="#29B6F6" />
              )}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#AFC4D8] pt-1 border-t border-[#1D5278]/50">
            <span>Dew Point: {currentPoint?.dewPoint2m !== undefined ? `${currentPoint.dewPoint2m}°C` : '—'}</span>
            <span>Boundary Layer Moisture</span>
          </div>
        </div>
      </div>
    </div>
  );
};
