import React from 'react';
import { GitCompare, HelpCircle, Layers } from 'lucide-react';
import { NWPModelId } from '../../data/nwpModels';
import { NWPModelStatus, NWPModelRun } from '../../types/nwp';
import { SourceStatus, ProvenanceStatus } from '../ui/ObservatoryPrimitives';

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
      classification: 'Regional / High Res',
      resolution: '3 km Grid',
      forecastHorizon: '72 Hours (0–3d)',
      provider: 'India Meteorological Dept.',
    },
    {
      id: 'GEFS',
      title: 'GEFS',
      subTitle: 'NOAA Global Ensemble',
      classification: 'Global Ensemble',
      resolution: '25 km (Ensemble)',
      forecastHorizon: '384 Hours (0–16d)',
      provider: 'NCEP / NOAA NOMADS',
    },
    {
      id: 'ECMWF',
      title: 'ECMWF',
      subTitle: 'IFS HRES Operational',
      classification: 'Global Medium Range',
      resolution: '9 km Native',
      forecastHorizon: '360 Hours (0–15d)',
      provider: 'ECMWF / Open-Meteo',
    },
  ];

  const mapProvenance = (status: NWPModelStatus): ProvenanceStatus => {
    if (status === 'LIVE') return 'LIVE';
    if (status === 'RECENT') return 'RECENT';
    if (status === 'STALE') return 'STALE';
    return 'UNAVAILABLE';
  };

  return (
    <section id="nwp-model-selector-workspace" className="flex flex-col gap-3 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#35C7E8]" />
          <h2 className="text-xs font-mono font-bold text-[#F3F6FA] uppercase tracking-wider">
            Operational Model Matrix
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onToggleCompareMode}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring ${
              isCompareMode
                ? 'bg-[#0B72B9] border-[#35C7E8] text-white'
                : 'bg-[#0B1927] border-[#26394B] text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A]'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-[#35C7E8]" />
            <span>{isCompareMode ? 'Exit Comparison' : 'Compare Models'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenExplanation}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#26394B] bg-[#0B1927] text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A] transition-colors flex items-center gap-1.5 text-xs cursor-pointer m-focus-ring"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#35C7E8]" />
            <span className="hidden md:inline">Model Guide</span>
          </button>
        </div>
      </div>

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
          const prov = mapProvenance(statusInfo.status);

          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectModel(m.id)}
              className={`group relative text-left rounded-xl p-4 transition-colors cursor-pointer flex flex-col justify-between gap-3 border m-focus-ring ${
                isSelected
                  ? 'bg-[#101F2E] border-[#35C7E8] shadow-[inset_0_2px_0_0_#35C7E8]'
                  : 'bg-[#0B1927] hover:bg-[#101F2E] border-[#26394B] hover:border-[#38536A]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span
                  className={`text-[10px] font-mono tracking-wider uppercase font-semibold truncate ${
                    isSelected ? 'text-[#35C7E8]' : 'text-[#8295A8]'
                  }`}
                >
                  {m.classification}
                </span>

                <SourceStatus
                  status={prov}
                  labelOverride={m.id === 'WRF' && prov === 'UNAVAILABLE' ? 'NOT CONFIGURED' : undefined}
                />
              </div>

              <div className="flex items-baseline justify-between gap-2 w-full">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight text-[#F3F6FA]">
                      {m.title}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#0B72B9] text-white uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#B5C3D1] mt-0.5">{m.subTitle}</p>
                </div>

                <span className="text-[11px] font-mono text-[#B5C3D1] bg-[#08131F] px-2 py-1 rounded border border-[#26394B] shrink-0">
                  {m.resolution}
                </span>
              </div>

              <div className="pt-2 border-t border-[#26394B] flex items-center justify-between w-full text-xs">
                {m.id === 'WRF' && prov === 'UNAVAILABLE' ? (
                  <span className="text-[11px] text-[#8295A8]">
                    IMD gateway credentials unconfigured · Zero fallback
                  </span>
                ) : firstPoint && typeof firstPoint.temperature2m === 'number' ? (
                  <div className="w-full flex items-center justify-between font-mono tabular-nums">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#F3F6FA]">
                        {firstPoint.temperature2m.toFixed(1)}°C
                      </span>
                      <span className="text-[11px] text-[#8295A8]">
                        {typeof firstPoint.precipitation === 'number'
                          ? `${firstPoint.precipitation.toFixed(1)} mm`
                          : '—'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#35C7E8]">
                      {m.forecastHorizon}
                    </span>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between font-mono text-[11px] text-[#8295A8]">
                    <span className="truncate">{m.provider}</span>
                    <span className="text-[#35C7E8] shrink-0">{m.forecastHorizon}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
