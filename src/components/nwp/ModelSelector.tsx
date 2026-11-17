import React from 'react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelStatus, NWPModelRun } from '../../types/nwp';
import { GitCompare, HelpCircle, Activity, Radio, Cpu, Layers } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: NWPModelId;
  onSelectModel: (model: NWPModelId) => void;
  isCompareMode: boolean;
  onToggleCompareMode: () => void;
  onOpenExplanation: () => void;
  modelStatuses: Record<NWPModelId, { status: NWPModelStatus; ageLabel: string }>;
  modelsData?: Partial<Record<NWPModelId, NWPModelRun | null>>;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  isCompareMode,
  onToggleCompareMode,
  onOpenExplanation,
  modelStatuses,
  modelsData,
}) => {
  const modelCards: Array<{
    id: NWPModelId;
    title: string;
    subTitle: string;
    classification: string;
    resolution: string;
    forecastHorizon: string;
    provider: string;
  }> = [
    {
      id: 'WRF',
      title: 'WRF',
      subTitle: 'IMD WRF-ARW',
      classification: 'REGIONAL / HIGH RESOLUTION',
      resolution: '3 km Grid',
      forecastHorizon: '72 Hours (0–3d)',
      provider: 'India Meteorological Dept.',
    },
    {
      id: 'GEFS',
      title: 'GEFS',
      subTitle: 'NOAA Global Ensemble',
      classification: 'GLOBAL ENSEMBLE',
      resolution: '25 km (31 Members)',
      forecastHorizon: '384 Hours (0–16d)',
      provider: 'NCEP / NOAA NOMADS',
    },
    {
      id: 'ECMWF',
      title: 'ECMWF',
      subTitle: 'IFS HRES Operational',
      classification: 'GLOBAL MEDIUM RANGE',
      resolution: '9 km Native',
      forecastHorizon: '360 Hours (0–15d)',
      provider: 'ECMWF / Open-Meteo',
    },
  ];

  return (
    <section id="nwp-model-selector-workspace" className="flex flex-col gap-3 w-full">
      {/* Workspace Subheading & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#29B6F6]" />
          <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
            Operational Model Selector & Live State Matrix
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onToggleCompareMode}
            className={`h-9 sm:h-10 px-3.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
              isCompareMode
                ? 'bg-[#1565C0] border-[#29B6F6] text-white shadow-md'
                : 'bg-[#081F33] border-[#1D5278] text-[#AFC4D8] hover:text-white hover:border-[#29B6F6]'
            }`}
            title="Compare WRF, GEFS and ECMWF models side-by-side"
          >
            <GitCompare className="w-4 h-4 text-[#29B6F6]" />
            <span className="whitespace-nowrap font-sans">
              {isCompareMode ? 'Exit Comparison' : 'Compare Models'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenExplanation}
            className="h-9 sm:h-10 px-3 rounded-xl border border-[#1D5278] bg-[#081F33] text-[#AFC4D8] hover:text-white hover:border-[#29B6F6] transition-colors flex items-center gap-1.5 text-xs font-sans cursor-pointer shadow-sm"
            title="Learn how NWP models operate"
          >
            <HelpCircle className="w-4 h-4 text-[#29B6F6]" />
            <span className="hidden md:inline font-sans">Model Guide</span>
          </button>
        </div>
      </div>

      {/* 3 Interactive Model Cards Grid (Guaranteed No-Clipping Layout) */}
      <div
        role="tablist"
        aria-label="Numerical Weather Prediction Model Selector"
        className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full items-stretch"
      >
        {modelCards.map((m) => {
          const isSelected = selectedModel === m.id && !isCompareMode;
          const statusInfo = modelStatuses[m.id] || { status: 'UNAVAILABLE', ageLabel: 'Checking' };
          const run = modelsData ? modelsData[m.id] : null;
          const firstPoint = run?.points?.[0];

          const isLive = statusInfo.status === 'LIVE';
          const isRecent = statusInfo.status === 'RECENT';
          const isUnavailable = statusInfo.status === 'UNAVAILABLE' || m.id === 'WRF';

          return (
            <div
              key={m.id}
              role="tab"
              tabIndex={0}
              aria-selected={isSelected}
              onClick={() => onSelectModel(m.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectModel(m.id);
                }
              }}
              className={`group relative text-left rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 border shadow-sm ${
                isSelected
                  ? 'bg-gradient-to-b from-[#0E3557] to-[#0A263F] border-[#29B6F6] ring-1 ring-[#29B6F6]/40 shadow-lg shadow-sky-950/40'
                  : 'bg-[#081F33]/90 hover:bg-[#0B263D] border-[#1D5278] hover:border-[#29B6F6]/50'
              }`}
            >
              {/* Active Workspace Accent Bar */}
              {isSelected && (
                <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-[#29B6F6] to-transparent" />
              )}

              {/* Card Top: Classification & Real Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-mono tracking-wider uppercase font-bold truncate ${
                    isSelected ? 'text-[#29B6F6]' : 'text-[#8FA8BF]'
                  }`}
                >
                  {m.classification}
                </span>

                {m.id === 'WRF' ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-slate-800/80 text-slate-300 border-slate-600/50 shrink-0">
                    SOURCE NOT CONFIGURED
                  </span>
                ) : isLive ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-[#00E676]/15 text-[#00E676] border-[#00E676]/40 shrink-0">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00E676]" />
                    </span>
                    LIVE
                  </span>
                ) : isRecent ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-[#29B6F6]/15 text-[#29B6F6] border-[#29B6F6]/40 shrink-0">
                    <Radio className="w-2.5 h-2.5" />
                    RECENT
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-[#E74C3C]/15 text-[#FF8A80] border-[#E74C3C]/30 shrink-0">
                    UNAVAILABLE
                  </span>
                )}
              </div>

              {/* Card Mid: Model Main Name & Subtitle */}
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-[#E1F5FE] transition-colors">
                      {m.title}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1565C0] text-white uppercase tracking-wider">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#AFC4D8] font-medium mt-0.5">{m.subTitle}</p>
                </div>

                {/* Model Resolution Badge */}
                <span className="text-[11px] font-mono text-[#AFC4D8] bg-[#061A2B] px-2 py-1 rounded border border-[#1D5278]/60 shrink-0">
                  {m.resolution}
                </span>
              </div>

              {/* Card Bottom: Live Real Preview or Scientific Explanation */}
              <div className="pt-2 border-t border-[#1D5278]/40 flex items-center justify-between text-[11px] font-sans">
                {m.id === 'WRF' ? (
                  <p className="text-[11px] text-slate-400 italic leading-snug">
                    Live IMD feed unconfigured • Scientific zero-fake policy
                  </p>
                ) : firstPoint && typeof firstPoint.temperature2m === 'number' ? (
                  <div className="w-full flex items-center justify-between text-[#E1F5FE]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">
                        {firstPoint.temperature2m.toFixed(1)}°C
                      </span>
                      <span className="text-[10px] text-[#AFC4D8] font-mono">
                        Rain: {firstPoint.precipitation?.toFixed(1) || '0.0'} mm
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#29B6F6]">
                      {m.forecastHorizon}
                    </span>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between text-[#AFC4D8]">
                    <span className="text-[10px] font-mono">{m.provider}</span>
                    <span className="text-[10px] font-mono text-[#29B6F6]">
                      {m.forecastHorizon}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
