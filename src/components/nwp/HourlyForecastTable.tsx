import React, { useState, useMemo } from 'react';
import { Clock, Flame, CloudRain, Wind } from 'lucide-react';
import { NWPForecastPoint } from '../../types/nwp';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';

interface HourlyForecastTableProps {
  points: NWPForecastPoint[];
  modelName: string;
}

export const HourlyForecastTable: React.FC<HourlyForecastTableProps> = ({
  points,
  modelName,
}) => {
  const [horizonFilter, setHorizonFilter] = useState<24 | 48 | 72 | 168>(24);

  const displayedPoints = useMemo(() => points.slice(0, horizonFilter), [points, horizonFilter]);

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
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
      <DataPanel className="flex flex-col gap-3">
        <SectionHeading
          title={`Hourly Model Forecast — ${modelName}`}
          icon={<Clock className="w-4 h-4" />}
        />
        <UnavailableState
          title={`No Hourly Forecast Points Available for ${modelName}`}
          reason="This model feed is currently unconfigured or did not return hourly numerical steps for this cycle."
        />
      </DataPanel>
    );
  }

  return (
    <DataPanel className="flex flex-col gap-4">
      <SectionHeading
        title={`Hourly Model Forecast — ${modelName}`}
        subtitle={`Discrete hourly grid values across ${displayedPoints.length}h`}
        icon={<Clock className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-1 bg-[#08131F] p-1 rounded-lg border border-[#26394B] text-xs font-mono">
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
                    ? 'bg-[#0B72B9] text-white font-semibold'
                    : 'text-[#8295A8] hover:text-[#F3F6FA]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {(highlights.maxTemp !== null || highlights.maxRain !== null || highlights.maxWind !== null) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#B5C3D1] tabular-nums">
          <span className="text-[#8295A8] font-sans">Horizon Peaks:</span>
          {highlights.maxTemp !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[#FCD34D]">
              <Flame className="w-3 h-3 text-[#F59E0B]" />
              <span>Peak Temp {highlights.maxTemp}°C</span>
            </span>
          )}
          {highlights.maxRain !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[#6EE7B7]">
              <CloudRain className="w-3 h-3 text-[#22C7A0]" />
              <span>Max Rain {highlights.maxRain} mm/h</span>
            </span>
          )}
          {highlights.maxWind !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[#7DD3FC]">
              <Wind className="w-3 h-3 text-[#35C7E8]" />
              <span>Max Wind {highlights.maxWind} km/h</span>
            </span>
          )}
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-xl border border-[#26394B] bg-[#08131F] no-scrollbar">
        <table className="w-full text-left text-xs border-collapse font-mono tabular-nums">
          <thead className="bg-[#0B1927] text-[10px] uppercase tracking-wider text-[#8295A8] border-b border-[#26394B]">
            <tr>
              <th className="py-2.5 px-3 sticky left-0 bg-[#0B1927] z-10">Time</th>
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

          <tbody className="divide-y divide-[#26394B]/60 text-[#B5C3D1]">
            {displayedPoints.map((pt, idx) => {
              const dateLabel = formatDateLabel(pt.validTime);
              const hourLabel = formatHour(pt.validTime);
              const isFirstHourOfDay = idx === 0 || hourLabel === '00:00';
              const isEven = idx % 2 === 0;

              const isMaxTemp = highlights.maxTemp !== null && pt.temperature2m === highlights.maxTemp;
              const isMaxRain = highlights.maxRain !== null && pt.precipitation === highlights.maxRain;
              const isMaxWind = highlights.maxWind !== null && pt.windSpeed10m === highlights.maxWind;

              return (
                <tr
                  key={idx}
                  className={`hover:bg-[#172A3B]/60 transition-colors ${
                    isEven ? 'bg-[#0B1927]/50' : 'bg-[#08131F]'
                  }`}
                >
                  <td
                    className={`py-2 px-3 whitespace-nowrap sticky left-0 z-10 font-semibold text-[#F3F6FA] border-r border-[#26394B]/70 ${
                      isEven ? 'bg-[#0B1927]' : 'bg-[#08131F]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{hourLabel}</span>
                      {isFirstHourOfDay && dateLabel && (
                        <span className="text-[9px] text-[#35C7E8] bg-[#101F2E] px-1 py-0.5 rounded border border-[#26394B] font-normal">
                          {dateLabel}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={
                        isMaxTemp
                          ? 'text-[#FCD34D] font-bold bg-[#F59E0B]/15 px-1.5 py-0.5 rounded'
                          : 'text-[#F3F6FA] font-medium'
                      }
                    >
                      {pt.temperature2m !== undefined ? `${pt.temperature2m}°` : '—'}
                    </span>
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-[#8295A8]">
                    {pt.apparentTemperature !== undefined ? `${pt.apparentTemperature}°` : '—'}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap">
                    {pt.precipitation !== undefined ? (
                      <span
                        className={
                          isMaxRain
                            ? 'text-[#6EE7B7] font-bold bg-[#22C7A0]/15 px-1.5 py-0.5 rounded'
                            : pt.precipitation > 0
                            ? 'text-[#7DD3FC] font-semibold'
                            : 'text-[#8295A8]'
                        }
                      >
                        {pt.precipitation} mm
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap">
                    {pt.precipitationProbability !== undefined ? (
                      <span
                        className={
                          pt.precipitationProbability >= 50
                            ? 'text-[#35C7E8] font-bold'
                            : pt.precipitationProbability > 0
                            ? 'text-[#B5C3D1]'
                            : 'text-[#8295A8]'
                        }
                      >
                        {pt.precipitationProbability}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap">
                    {pt.windSpeed10m !== undefined ? (
                      <span
                        className={
                          isMaxWind
                            ? 'text-[#7DD3FC] font-bold bg-[#35C7E8]/15 px-1.5 py-0.5 rounded'
                            : 'text-[#F3F6FA]'
                        }
                      >
                        {pt.windSpeed10m} km/h
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-[#8295A8]">
                    {pt.windGusts10m !== undefined ? `${pt.windGusts10m} km/h` : '—'}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-[#B5C3D1]">
                    {pt.pressureMSL !== undefined ? `${pt.pressureMSL} hPa` : '—'}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-[#B5C3D1]">
                    {pt.relativeHumidity !== undefined ? `${pt.relativeHumidity}%` : '—'}
                  </td>

                  <td className="py-2 px-3 whitespace-nowrap text-right text-[#B5C3D1]">
                    {pt.cloudCover !== undefined ? `${pt.cloudCover}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DataPanel>
  );
};
