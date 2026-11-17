import React from 'react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelRun } from '../../types/nwp';
import { Activity, Clock, Calendar, Database, ShieldCheck } from 'lucide-react';

interface ForecastStatusStripProps {
  modelId: NWPModelId;
  runData?: NWPModelRun;
  ageLabel: string;
}

export const ForecastStatusStrip: React.FC<ForecastStatusStripProps> = ({
  modelId,
  runData,
  ageLabel,
}) => {
  const isUnavailable = !runData || runData.status === 'UNAVAILABLE';
  const isLive = runData?.status === 'LIVE';

  const formatUtcRun = (isoStr?: string) => {
    if (!isoStr) return 'Uninitialized';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Uninitialized';
      const day = d.getUTCDate();
      const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const hours = String(d.getUTCHours()).padStart(2, '0');
      return `${day} ${month} ${hours} UTC`;
    } catch {
      return 'Uninitialized';
    }
  };

  const statusText =
    modelId === 'WRF' && isUnavailable
      ? 'WRF SOURCE NOT CONFIGURED'
      : isUnavailable
      ? `${modelId} UNAVAILABLE`
      : isLive
      ? `${modelId} OPERATIONAL LIVE`
      : `${modelId} RECENT`;

  const statusColor =
    modelId === 'WRF' && isUnavailable
      ? 'text-slate-400'
      : isUnavailable
      ? 'text-[#FF8A80]'
      : isLive
      ? 'text-[#00E676]'
      : 'text-[#29B6F6]';

  const dotColor =
    modelId === 'WRF' && isUnavailable
      ? 'bg-slate-500'
      : isUnavailable
      ? 'bg-[#E74C3C]'
      : isLive
      ? 'bg-[#00E676]'
      : 'bg-[#29B6F6]';

  return (
    <div
      id="nwp-forecast-status-strip"
      className="w-full bg-[#081F33] border border-[#1D5278] rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-xs no-scrollbar shadow-xs"
    >
      <div className="flex items-center gap-6 whitespace-nowrap min-w-0">
        {/* Model Status */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Model Status:</span>
          <span className={`inline-flex items-center gap-1.5 font-bold font-mono text-xs ${statusColor}`}>
            <span className={`w-2 h-2 rounded-full ${dotColor} ${isLive ? 'animate-pulse' : ''}`} />
            <span>{statusText}</span>
          </span>
        </div>

        <span className="text-slate-700 hidden sm:inline">|</span>

        {/* Run */}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#29B6F6]" />
          <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Run:</span>
          <span className="text-white font-mono font-medium">
            {isUnavailable ? '—' : formatUtcRun(runData?.runTime)}
          </span>
        </div>

        <span className="text-slate-700 hidden md:inline">|</span>

        {/* Forecast Horizon */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#00E676]" />
          <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Forecast:</span>
          <span className="text-white font-mono font-medium">
            {isUnavailable ? '—' : runData?.forecastHours ? `0–${Math.round(runData.forecastHours / 24)} DAYS` : '0–15 DAYS'}
          </span>
        </div>

        <span className="text-slate-700 hidden lg:inline">|</span>

        {/* Data Age */}
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Data Age:</span>
          <span className="text-white font-mono font-medium">{ageLabel}</span>
        </div>

        <span className="text-slate-700 hidden xl:inline">|</span>

        {/* Source */}
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[#29B6F6]" />
          <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Source:</span>
          <span className="text-white font-sans text-xs truncate max-w-[200px]">
            {runData?.source || (modelId === 'ECMWF' ? 'Open-Meteo / ECMWF' : runData?.provider || 'Official Stream')}
          </span>
        </div>
      </div>

      <div className="hidden 2xl:flex items-center gap-1 text-[11px] text-[#AFC4D8] shrink-0 font-sans">
        <ShieldCheck className="w-3.5 h-3.5 text-[#00E676]" />
        <span>Verified Synoptic Physics</span>
      </div>
    </div>
  );
};
