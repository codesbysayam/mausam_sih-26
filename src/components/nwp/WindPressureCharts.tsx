import React, { useMemo } from 'react';
import { Wind, Gauge, Droplets } from 'lucide-react';
import { NWPForecastPoint } from '../../types/nwp';
import { DataPanel, SectionHeading, MetricValue, UnavailableState } from '../ui/ObservatoryPrimitives';

interface WindPressureChartsProps {
  points: NWPForecastPoint[];
}

export const WindPressureCharts: React.FC<WindPressureChartsProps> = ({ points }) => {
  const chartPoints = useMemo(() => points.slice(0, 24), [points]);
  const currentPoint = chartPoints[0];

  const getDirectionInfo = (deg?: number) => {
    if (typeof deg !== 'number' || !Number.isFinite(deg)) return null;
    const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round((deg % 360) / 45) % 8;
    return {
      arrow: arrows[idx],
      cardinal: cardinals[idx],
      deg,
    };
  };

  const dirInfo = getDirectionInfo(currentPoint?.windDirection10m);

  const validPressures = chartPoints
    .map((p, i) => (typeof p.pressureMSL === 'number' && Number.isFinite(p.pressureMSL) ? { i, val: p.pressureMSL } : null))
    .filter((v): v is { i: number; val: number } => v !== null);

  const minPressure = validPressures.length > 0 ? Math.floor(Math.min(...validPressures.map((v) => v.val)) - 2) : null;
  const maxPressure = validPressures.length > 0 ? Math.ceil(Math.max(...validPressures.map((v) => v.val)) + 2) : null;
  const pressRange = minPressure !== null && maxPressure !== null ? maxPressure - minPressure || 1 : 1;

  const validHumidities = chartPoints
    .map((p, i) => (typeof p.relativeHumidity === 'number' && Number.isFinite(p.relativeHumidity) ? { i, val: p.relativeHumidity } : null))
    .filter((v): v is { i: number; val: number } => v !== null);

  const svgW = 400;
  const svgH = 110;
  const padX = 25;
  const padY = 18;
  const uW = svgW - padX * 2;
  const uH = svgH - padY * 2;

  const pressCoords =
    minPressure !== null
      ? validPressures.map((v) => {
          const x = padX + (v.i / Math.max(chartPoints.length - 1, 1)) * uW;
          const y = svgH - padY - ((v.val - minPressure) / pressRange) * uH;
          return { x, y, val: v.val };
        })
      : [];

  const pressPath = pressCoords.reduce((acc, c, idx) => (idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`), '');

  const humidCoords = validHumidities.map((v) => {
    const x = padX + (v.i / Math.max(chartPoints.length - 1, 1)) * uW;
    const y = svgH - padY - (v.val / 100) * uH;
    return { x, y, val: v.val };
  });

  const humidPath = humidCoords.reduce((acc, c, idx) => (idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`), '');

  const gustStatus =
    typeof currentPoint?.windGusts10m === 'number'
      ? currentPoint.windGusts10m > 45
        ? 'MODERATE GUST RISK'
        : 'NORMAL GRADIENT'
      : '—';

  return (
    <div className="flex flex-col gap-4 w-full">
      <DataPanel className="flex flex-col gap-4">
        <SectionHeading
          title="Wind Outlook (10m Vector Field)"
          subtitle="Surface flow, peak gusts, and directional azimuth"
          icon={<Wind className="w-4 h-4" />}
          action={
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#08131F] border border-[#26394B] text-xs font-mono tabular-nums">
              <span className="text-[#8295A8]">DIRECTION:</span>
              <span className="text-[#35C7E8] font-bold">
                {dirInfo ? `${dirInfo.arrow} ${dirInfo.deg}° (${dirInfo.cardinal})` : '—'}
              </span>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="m-panel-inset p-3.5">
            <MetricValue
              label="Sustained Speed"
              value={currentPoint?.windSpeed10m}
              unit="km/h"
              precision={1}
              hint="Mean 10m boundary velocity"
            />
          </div>

          <div className="m-panel-inset p-3.5">
            <MetricValue
              label="Peak Gust"
              value={currentPoint?.windGusts10m}
              unit="km/h"
              precision={1}
              valueClassName="text-xl sm:text-2xl font-bold text-[#35C7E8]"
              hint="Turbulent gust potential"
            />
          </div>

          <div className="m-panel-inset p-3.5">
            <MetricValue
              label="Vector Azimuth"
              value={currentPoint?.windDirection10m}
              unit="°"
              precision={0}
              valueClassName="text-xl sm:text-2xl font-bold text-[#FCD34D]"
              hint="Meteorological origin bearing"
            />
          </div>

          <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-1">
            <span className="text-[11px] font-medium text-[#8295A8] uppercase tracking-wider">
              Gust Regime
            </span>
            <span
              className={`text-sm font-bold font-mono ${
                gustStatus === 'MODERATE GUST RISK'
                  ? 'text-[#FCD34D]'
                  : gustStatus === 'NORMAL GRADIENT'
                  ? 'text-[#6EE7B7]'
                  : 'text-[#8295A8]'
              }`}
            >
              {gustStatus}
            </span>
            <span className="text-[11px] text-[#8295A8]">
              {typeof currentPoint?.windGusts10m === 'number' ? 'Synoptic pressure driven' : 'Gust telemetry unavailable'}
            </span>
          </div>
        </div>
      </DataPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DataPanel className="flex flex-col justify-between gap-3">
          <SectionHeading
            title="Sea Level Pressure (MSLP)"
            icon={<Gauge className="w-4 h-4" />}
            action={
              <span className="text-xs font-mono font-bold text-[#35C7E8] tabular-nums">
                {typeof currentPoint?.pressureMSL === 'number' ? `${currentPoint.pressureMSL} hPa` : '—'}
              </span>
            }
          />

          {pressCoords.length >= 2 ? (
            <>
              <div className="w-full">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                  <line x1={padX} y1={padY} x2={svgW - padX} y2={padY} stroke="#26394B" strokeDasharray="3 3" />
                  <line x1={padX} y1={svgH - padY} x2={svgW - padX} y2={svgH - padY} stroke="#26394B" strokeDasharray="3 3" />
                  <path d={pressPath} fill="none" stroke="#A78BFA" strokeWidth="2" />
                  <circle cx={pressCoords[0].x} cy={pressCoords[0].y} r="3.5" fill="#A78BFA" />
                </svg>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8295A8] pt-2 border-t border-[#26394B] tabular-nums">
                <span>Range: {minPressure} – {maxPressure} hPa</span>
                <span>24h Barometric Trend</span>
              </div>
            </>
          ) : (
            <UnavailableState
              title="Pressure Series Unavailable"
              reason="MSLP time-series was not returned in this model stream."
            />
          )}
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-3">
          <SectionHeading
            title="Relative Humidity"
            icon={<Droplets className="w-4 h-4" />}
            action={
              <span className="text-xs font-mono font-bold text-[#35C7E8] tabular-nums">
                {typeof currentPoint?.relativeHumidity === 'number' ? `${currentPoint.relativeHumidity}%` : '—'}
              </span>
            }
          />

          {humidCoords.length >= 2 ? (
            <>
              <div className="w-full">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                  <line x1={padX} y1={padY} x2={svgW - padX} y2={padY} stroke="#26394B" strokeDasharray="3 3" />
                  <line x1={padX} y1={svgH - padY} x2={svgW - padX} y2={svgH - padY} stroke="#26394B" strokeDasharray="3 3" />
                  <path d={humidPath} fill="none" stroke="#35C7E8" strokeWidth="2" />
                  <circle cx={humidCoords[0].x} cy={humidCoords[0].y} r="3.5" fill="#35C7E8" />
                </svg>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8295A8] pt-2 border-t border-[#26394B] tabular-nums">
                <span>Dew Point: {typeof currentPoint?.dewPoint2m === 'number' ? `${currentPoint.dewPoint2m}°C` : '—'}</span>
                <span>Boundary Layer Moisture</span>
              </div>
            </>
          ) : (
            <UnavailableState
              title="Humidity Series Unavailable"
              reason="2m relative humidity series was not supplied by this model stream."
            />
          )}
        </DataPanel>
      </div>
    </div>
  );
};
