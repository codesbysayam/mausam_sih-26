import React, { useState } from 'react';
import {
  ExternalLink,
  Settings,
  X,
  Key,
  Globe,
  Save,
  CheckCircle2,
  Info,
  Layers,
} from 'lucide-react';
import { NWPModelId, NWP_MODEL_DEFINITIONS } from '../../data/nwpModels';
import { NWPModelRun } from '../../types/nwp';
import { DataPanel, SectionHeading, SourceStatus, ProvenanceStatus } from '../ui/ObservatoryPrimitives';

interface ModelOverviewProps {
  modelId: NWPModelId;
  runData?: NWPModelRun;
  ageLabel: string;
}

export const ModelOverview: React.FC<ModelOverviewProps> = ({
  modelId,
  runData,
  ageLabel,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [imdUrl, setImdUrl] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('mausam_imd_wrf_url') || '' : ''
  );
  const [imdToken, setImdToken] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('mausam_imd_wrf_token') || '' : ''
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const def = NWP_MODEL_DEFINITIONS[modelId];
  const isUnavailable = !runData || runData.status === 'UNAVAILABLE';

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      if (imdUrl.trim()) {
        localStorage.setItem('mausam_imd_wrf_url', imdUrl.trim());
      } else {
        localStorage.removeItem('mausam_imd_wrf_url');
      }
      if (imdToken.trim()) {
        localStorage.setItem('mausam_imd_wrf_token', imdToken.trim());
      } else {
        localStorage.removeItem('mausam_imd_wrf_token');
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowConfigModal(false);
        window.location.reload();
      }, 800);
    }
  };

  const formatRunDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '—';
      const day = d.getUTCDate();
      const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const hours = String(d.getUTCHours()).padStart(2, '0');
      return `${day} ${month} ${hours}Z UTC`;
    } catch {
      return '—';
    }
  };

  const provStatus: ProvenanceStatus = isUnavailable
    ? 'UNAVAILABLE'
    : runData?.status === 'LIVE'
    ? 'LIVE'
    : runData?.status === 'STALE'
    ? 'STALE'
    : 'RECENT';

  const modelFullName =
    modelId === 'ECMWF'
      ? 'ECMWF IFS HRES'
      : modelId === 'GEFS'
      ? 'NOAA GEFS v12 Global Ensemble'
      : 'IMD WRF-ARW Regional Model';

  const membersCount = runData?.ensembleStats?.membersCount ?? def.ensembleMembers;

  return (
    <div className="flex flex-col gap-3 w-full">
      <DataPanel className="flex flex-col gap-4">
        <SectionHeading
          title={`Model Overview — ${modelFullName}`}
          icon={<Layers className="w-4 h-4" />}
          action={
            <a
              href={def.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#35C7E8] hover:underline inline-flex items-center gap-1"
            >
              <span>Official Documentation</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="m-panel-inset p-3 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono text-[#8295A8]">Model</span>
              <span className="text-[#F3F6FA] font-bold text-xs sm:text-sm truncate">{modelFullName}</span>
              <span className="text-[11px] text-[#8295A8]">{def.modelFamily}</span>
            </div>

            <div className="m-panel-inset p-3 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono text-[#8295A8]">Provider</span>
              <span className="text-[#F3F6FA] font-semibold text-xs sm:text-sm truncate">
                {runData?.provider || def.provider.split('/')[0]}
              </span>
              <span className="text-[11px] text-[#8295A8]">{def.domain}</span>
            </div>

            <div className="m-panel-inset p-3 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono text-[#8295A8]">Run (UTC)</span>
              <span className="text-[#F3F6FA] font-mono font-bold text-xs sm:text-sm tabular-nums truncate">
                {isUnavailable ? '—' : formatRunDate(runData?.runTime)}
              </span>
              <span className="text-[11px] text-[#8295A8] font-mono">
                {isUnavailable ? 'No active cycle' : 'Synoptic cycle'}
              </span>
            </div>

            <div className="m-panel-inset p-3 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-mono text-[#8295A8]">Resolution</span>
              <span className="text-[#F3F6FA] font-mono font-bold text-xs sm:text-sm truncate">
                {runData?.resolution || def.spatialResolution || '—'}
              </span>
              <span className="text-[11px] text-[#8295A8]">
                {membersCount && membersCount > 1 ? `${membersCount} Members` : 'Deterministic'}
              </span>
            </div>

            <div className="m-panel-inset p-3 flex flex-col gap-0.5 col-span-2">
              <span className="text-[10px] uppercase font-mono text-[#8295A8]">Forecast Range</span>
              <span className="text-[#F3F6FA] font-bold text-xs sm:text-sm truncate">
                {isUnavailable
                  ? def.forecastRange
                  : runData?.forecastHours
                  ? `${runData.forecastHours} Hours (${Math.round(runData.forecastHours / 24)} Days)`
                  : def.forecastRange}
              </span>
              <span className="text-[11px] text-[#8295A8]">Hourly temporal discretization</span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-[#26394B] md:pl-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-mono text-[#8295A8]">Feed Status</span>
                <SourceStatus
                  status={provStatus}
                  labelOverride={modelId === 'WRF' && isUnavailable ? 'SOURCE NOT CONFIGURED' : undefined}
                />
              </div>

              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-mono text-[#8295A8]">Last Synced</span>
                <span className="text-[#F3F6FA] font-mono text-xs sm:text-sm font-semibold mt-0.5 tabular-nums">
                  {runData?.fetchedAt ? new Date(runData.fetchedAt).toLocaleTimeString() : '—'}
                </span>
                <span className="text-[11px] text-[#8295A8] font-mono">Age: {ageLabel}</span>
              </div>
            </div>

            <div className="m-panel-inset p-3 flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-mono text-[#8295A8]">Source Delivery</span>
                <span className="text-[#F3F6FA] text-xs font-medium truncate mt-0.5">
                  {runData?.source || (modelId === 'ECMWF' ? 'Open-Meteo → ECMWF IFS HRES' : def.provider)}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#101F2E] border border-[#26394B] text-[10px] text-[#35C7E8] font-mono shrink-0">
                {isUnavailable ? 'Disconnected' : 'Verified Stream'}
              </span>
            </div>
          </div>
        </div>
      </DataPanel>

      {modelId === 'WRF' && isUnavailable && (
        <DataPanel id="wrf-informational-panel" variant="inset" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8] shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-[#F3F6FA]">
                  WRF — Regional High-Resolution Forecast
                </h4>
                <span className="px-2 py-0.5 rounded bg-[#101F2E] border border-[#26394B] text-[10px] font-mono text-[#B5C3D1]">
                  SOURCE NOT CONFIGURED
                </span>
              </div>

              <p className="text-xs text-[#B5C3D1] leading-relaxed max-w-2xl">
                Live IMD WRF output requires an authorized data-access configuration. MAUSAM does not substitute another model for unavailable WRF data.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#101F2E] hover:bg-[#172A3B] border border-[#26394B] hover:border-[#38536A] text-xs font-semibold text-[#F3F6FA] transition-colors cursor-pointer shrink-0 m-focus-ring"
          >
            <Settings className="w-3.5 h-3.5 text-[#35C7E8]" />
            <span>Configure Source</span>
          </button>
        </DataPanel>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg m-panel-elevated p-5 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#26394B]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#35C7E8]" />
                <h4 className="text-sm font-bold text-[#F3F6FA] uppercase tracking-wider">
                  Configure IMD WRF Operational Source
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#172A3B] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#B5C3D1] leading-relaxed">
              Live IMD WRF (ARW 3 km / 9 km) operational forecast feeds require authenticated institutional access to the IMD HPC infrastructure. When unconfigured, MAUSAM displays <strong className="text-[#F3F6FA]">SOURCE NOT CONFIGURED</strong> rather than interpolating synthetic data.
            </p>

            <form onSubmit={handleSaveConfig} className="flex flex-col gap-3 font-mono">
              <div>
                <label className="text-[11px] text-[#B5C3D1] font-semibold block mb-1">
                  IMD WRF API Gateway URL
                </label>
                <div className="flex items-center bg-[#08131F] border border-[#26394B] rounded-lg px-3 py-2 text-[#F3F6FA]">
                  <Globe className="w-3.5 h-3.5 text-[#8295A8] mr-2 shrink-0" />
                  <input
                    type="url"
                    value={imdUrl}
                    onChange={(e) => setImdUrl(e.target.value)}
                    placeholder="https://nwp.imd.gov.in/api/v1/wrf"
                    className="w-full bg-transparent border-none outline-hidden text-xs text-[#F3F6FA] placeholder-[#8295A8]/60"
                  />
                </div>
                <span className="text-[10px] text-[#8295A8] mt-1 block font-sans">
                  Environment fallback: IMD_WRF_API_URL
                </span>
              </div>

              <div>
                <label className="text-[11px] text-[#B5C3D1] font-semibold block mb-1">
                  IMD API Token / Bearer Key
                </label>
                <div className="flex items-center bg-[#08131F] border border-[#26394B] rounded-lg px-3 py-2 text-[#F3F6FA]">
                  <Key className="w-3.5 h-3.5 text-[#8295A8] mr-2 shrink-0" />
                  <input
                    type="password"
                    value={imdToken}
                    onChange={(e) => setImdToken(e.target.value)}
                    placeholder="Enter institutional IMD authorization key"
                    className="w-full bg-transparent border-none outline-hidden text-xs text-[#F3F6FA] placeholder-[#8295A8]/60"
                  />
                </div>
                <span className="text-[10px] text-[#8295A8] mt-1 block font-sans">
                  Environment fallback: IMD_API_TOKEN
                </span>
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-lg bg-[#22C7A0]/12 border border-[#22C7A0]/35 text-[#6EE7B7] text-xs flex items-center gap-1.5 font-sans">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Configuration saved. Refreshing workspace...</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#26394B]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#26394B] bg-[#0B1927] text-[#B5C3D1] hover:text-[#F3F6FA] transition-colors cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[#0B72B9] hover:bg-[#0E82CF] text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Apply</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
