import React, { useState, useMemo } from 'react';
import { NWPForecastPoint } from '../../types/nwp';
import { Clock, AlertCircle, ArrowUpRight, Flame, CloudRain, Wind } from 'lucide-react';

interface HourlyForecastTableProps {
  points: NWPForecastPoint[];
  modelName: string;
}

export const HourlyForecastTable: React.FC<HourlyForecastTableProps> = ({
  points,
  modelName,
}) => {
  const [horizonFilter, setHorizonFilter] = useState<24 | 48 | 72 | 168>(24);

  const displayedPoints = useMemo(() => {
    return points.slice(0, horizonFilter);
  }, [points, horizonFilter]);

  // Identify maximums strictly from actual returned data points
  const highlights = useMemo(() => {
    if (displayedPoints.length === 0) return { maxTemp: null, maxRain: null, maxWind: null };

    let maxTemp = -Infinity;
    let maxRain = 0;
    let maxWind = 0;

    displayedPoints.forEach((p) => {
      if (typeof p.temperature2m === 'number' && p.temperature2m > maxTemp) maxTemp = p.temperature2m;
      if (typeof p.precipitation === 'number' && p.precipitation > maxRain) maxRain = p.precipitation;
      if (typeof p.windSpeed10m === 'number' && p.windSpeed10m > maxWind) maxWind = p.windSpeed10m;
    });

    return {
      maxTemp: maxTemp > -Infinity ? maxTemp : null,
      maxRain: maxRain > 0 ? maxRain : null,
      maxWind: maxWind > 0 ? maxWind : null,
    };
  }, [displayedPoints]);

  const formatHour = (isoTime: string) => {
    try {
      const d = new Date(isoTime);
      if (isNaN(d.getTime())) return isoTime;
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${mins}`;
    } catch {
      return isoTime;
    }
  };

  const formatDateLabel = (isoTime: string) => {
    try {
      const d = new Date(isoTime);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (points.length === 0) {
    return (
      <div className="nwp-card p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
        <AlertCircle className="w-6 h-6 text-slate-500" />
        <p className="text-sm font-sans font-semibold text-slate-300">
          No hourly forecast points available for {modelName}.
        </p>
        <span className="text-xs text-[#AFC4D8]">
          This model feed is currently unconfigured or did not return hourly physics for this cycle.
        </span>
      </div>
    );
  }

  return (
    <div className="nwp-card flex flex-col gap-3 rounded-2xl p-4 sm:p-5 shadow-md">
      {/* Header & Horizon Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1D5278]/60">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#29B6F6]" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
            Hourly Model Forecast — {modelName}
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

      {/* Highlights Bar if peaks exist in dataset */}
      {(highlights.maxTemp !== null || highlights.maxRain !== null || highlights.maxWind !== null) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#AFC4D8] pb-1">
          <span className="text-slate-400 font-sans">Horizon Highlights:</span>
          {highlights.maxTemp !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#102D44] border border-[#1D5278] text-amber-300">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Peak Temp: {highlights.maxTemp}°C</span>
            </span>
          )}
          {highlights.maxRain !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#102D44] border border-[#1D5278] text-[#00E676]">
              <CloudRain className="w-3 h-3 text-[#00E676]" />
              <span>Max Rain: {highlights.maxRain} mm/h</span>
            </span>
          )}
          {highlights.maxWind !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#102D44] border border-[#1D5278] text-[#29B6F6]">
              <Wind className="w-3 h-3 text-[#29B6F6]" />
              <span>Max Wind: {highlights.maxWind} km/h</span>
            </span>
          )}
        </div>
      )}

      {/* Table Container: strictly constrained inside with horizontal scrolling ONLY */}
      <div className="w-full overflow-x-auto rounded-xl border border-[#1D5278]/80 bg-[#061A2B] no-scrollbar">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead className="bg-[#081F33] text-[10px] uppercase tracking-wider text-[#AFC4D8] border-b border-[#1D5278]">
            <tr>
              <th className="py-2.5 px-3 sticky left-0 bg-[#081F33] z-10">Time</th>
              <th className="py-2.5 px-3">Temp</th>
              <th className="py-2.5 px-3">Feels</th>
              <th className="py-2.5 px-3">Rain</th>
              <th className="py-2.5 px-3">Rain %</th>
              <th className="py-2.5 px-3">Wind</th>
              <th className="py-2.5 px-3">Gust</th>
              <th className="py-2.5 px-3">Pressure</th>
              <th className="py-2.5 px-3">Humidity</th>
              <th className="py-2.5 px-3 text-right">Cloud</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1D5278]/40 text-slate-200">
            {displayedPoints.map((pt, idx) => {
              const dateLabel = formatDateLabel(pt.validTime);
              const hourLabel = formatHour(pt.validTime);
              const isFirstHourOfDay = idx === 0 || formatHour(pt.validTime) === '00:00';
              const isEven = idx % 2 === 0;

              const isMaxTemp = highlights.maxTemp !== null && pt.temperature2m === highlights.maxTemp;
              const isMaxRain = highlights.maxRain !== null && pt.precipitation === highlights.maxRain;
              const isMaxWind = highlights.maxWind !== null && pt.windSpeed10m === highlights.maxWind;

              return (
                <tr
                  key={idx}
                  className={`hover:bg-[#102D44]/70 transition-colors ${
                    isEven ? 'bg-[#081F33]/40' : 'bg-[#061A2B]'
                  }`}
                >
                  {/* Sticky Time Column */}
                  <td
                    className={`py-2 px-3 whitespace-nowrap sticky left-0 z-10 font-bold text-white border-r border-[#1D5278]/50 ${
                      isEven ? 'bg-[#081F33]' : 'bg-[#061A2B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{hourLabel}</span>
                      {isFirstHourOfDay && (
                        <span className="text-[9px] text-[#29B6F6] bg-[#1565C0]/20 px-1 py-0.2 rounded border border-[#1565C0]/30 font-normal">
                          {dateLabel}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Temp with Peak Highlight */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        isMaxTemp ? 'text-amber-300 font-extrabold bg-amber-400/15 px-1.5 py-0.5 rounded' : 'text-amber-200'
                      }`}
                    >
                      {pt.temperature2m !== undefined ? `${pt.temperature2m}°` : '—'}
                    </span>
                  </td>

                  {/* Feels */}
                  <td className="py-2 px-3 whitespace-nowrap text-[#AFC4D8]">
                    {pt.apparentTemperature !== undefined ? `${pt.apparentTemperature}°` : '—'}
                  </td>

                  {/* Rain with Max Rain Highlight */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    {pt.precipitation !== undefined ? (
                      <span
                        className={
                          isMaxRain
                            ? 'text-[#00E676] font-bold bg-[#00E676]/15 px-1.5 py-0.5 rounded'
                            : pt.precipitation > 0
                            ? 'text-sky-300 font-semibold'
                            : 'text-slate-400'
                        }
                      >
                        {pt.precipitation} mm
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Rain % */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    {pt.precipitationProbability !== undefined ? (
                      <span
                        className={
                          pt.precipitationProbability >= 50
                            ? 'text-[#29B6F6] font-bold'
                            : pt.precipitationProbability > 0
                            ? 'text-slate-300'
                            : 'text-slate-500'
                        }
                      >
                        {pt.precipitationProbability}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Wind with Strongest Wind Highlight */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    {pt.windSpeed10m !== undefined ? (
                      <span
                        className={
                          isMaxWind
                            ? 'text-[#29B6F6] font-bold bg-[#1565C0]/25 px-1.5 py-0.5 rounded'
                            : 'text-slate-200'
                        }
                      >
                        {pt.windSpeed10m} km/h
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Gust */}
                  <td className="py-2 px-3 whitespace-nowrap text-[#AFC4D8]">
                    {pt.windGusts10m !== undefined ? `${pt.windGusts10m} km/h` : '—'}
                  </td>

                  {/* Pressure */}
                  <td className="py-2 px-3 whitespace-nowrap text-[#AFC4D8]">
                    {pt.pressureMSL !== undefined ? `${pt.pressureMSL} hPa` : '—'}
                  </td>

                  {/* Humidity */}
                  <td className="py-2 px-3 whitespace-nowrap text-[#AFC4D8]">
                    {pt.relativeHumidity !== undefined ? `${pt.relativeHumidity}%` : '—'}
                  </td>

                  {/* Cloud */}
                  <td className="py-2 px-3 whitespace-nowrap text-right text-[#AFC4D8]">
                    {pt.cloudCover !== undefined ? `${pt.cloudCover}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
