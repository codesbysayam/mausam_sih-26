import React, { useState } from 'react';
import { NWPModelId, NWP_MODEL_DEFINITIONS } from '../../data/nwpModels';
import { NWPModelRun } from '../../types/nwp';
import {
  ExternalLink,
  Settings,
  X,
  Key,
  Globe,
  Save,
  CheckCircle2,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

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
  const [imdUrl, setImdUrl] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('mausam_imd_wrf_url') || '' : '';
  });
  const [imdToken, setImdToken] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('mausam_imd_wrf_token') || '' : '';
  });
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
      return `${day} ${month} ${hours}Z UTC Run`;
    } catch {
      return '—';
    }
  };

  const getStatusBadge = () => {
    if (modelId === 'WRF' && isUnavailable) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#102D44] border border-[#1D5278] text-[#AFC4D8] text-xs font-mono font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          SOURCE NOT CONFIGURED
        </span>
      );
    }

    if (isUnavailable) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#102D44] border border-[#1D5278] text-[#AFC4D8] text-xs font-mono font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          DATA UNAVAILABLE
        </span>
      );
    }

    if (runData?.status === 'LIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#00E676]/15 border border-[#00E676]/35 text-[#00E676] text-xs font-mono font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E676]" />
          </span>
          ● LIVE
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#29B6F6]/15 border border-[#29B6F6]/35 text-[#29B6F6] text-xs font-mono font-bold">
        <Clock className="w-3.5 h-3.5" />
        {runData?.status || 'RECENT'}
      </span>
    );
  };

  // Model full title
  const modelFullName =
    modelId === 'ECMWF'
      ? 'ECMWF IFS HRES'
      : modelId === 'GEFS'
      ? 'NOAA GEFS v12 Global Ensemble'
      : 'IMD WRF-ARW Regional Model';

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 6. MODEL OVERVIEW CARD */}
      <div className="bg-[#0B263D]/90 border border-[#1D5278] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1D5278]/60">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#29B6F6]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
              Model Overview — {modelFullName}
            </h3>
          </div>

          <a
            href={def.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#29B6F6] hover:underline flex items-center gap-1 font-sans"
          >
            <span>Official Documentation</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* 2-Column Responsive Layout: Left (Specs) / Right (Status & Delivery) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* Left Column: MODEL, PROVIDER, RUN, RESOLUTION, FORECAST RANGE */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Model</span>
              <span className="text-white font-bold text-xs sm:text-sm tracking-tight mt-0.5 truncate">
                {modelFullName}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">{def.modelFamily}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Provider</span>
              <span className="text-white font-semibold text-xs sm:text-sm tracking-tight mt-0.5 truncate">
                {runData?.provider || def.provider.split('/')[0]}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">{def.domain}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Run (UTC)</span>
              <span className="text-white font-mono font-bold text-xs sm:text-sm mt-0.5 truncate">
                {isUnavailable ? '—' : formatRunDate(runData?.runTime)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {isUnavailable ? 'No active cycle' : 'Synoptic cycle'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Resolution</span>
              <span className="text-white font-mono font-bold text-xs sm:text-sm mt-0.5 truncate">
                {runData?.resolution || def.spatialResolution || '—'}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">
                {def.ensembleMembers && def.ensembleMembers > 1 ? `${def.ensembleMembers} Members` : 'Deterministic'}
              </span>
            </div>

            <div className="flex flex-col col-span-2 sm:col-span-2">
              <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Forecast Range</span>
              <span className="text-white font-bold text-xs sm:text-sm mt-0.5 truncate">
                {isUnavailable ? def.forecastRange : runData?.forecastHours ? `${runData.forecastHours} Hours (${Math.round(runData.forecastHours / 24)} Days)` : def.forecastRange}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">Hourly temporal discretization</span>
            </div>
          </div>

          {/* Right Column: STATUS, LAST UPDATED, SOURCE */}
          <div className="flex flex-col justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-[#1D5278]/60 md:pl-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Status</span>
                <div className="mt-1">{getStatusBadge()}</div>
              </div>

              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Last Updated</span>
                <span className="text-white font-mono text-xs sm:text-sm font-semibold mt-1">
                  {runData?.fetchedAt ? new Date(runData.fetchedAt).toLocaleTimeString() : ageLabel}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Latency: {ageLabel}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#081F33] border border-[#1D5278] flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-mono text-[#AFC4D8]">Source Delivery</span>
                <span className="text-white text-xs font-medium truncate mt-0.5">
                  {runData?.source || (modelId === 'ECMWF' ? 'Open-Meteo → ECMWF IFS HRES' : def.provider)}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#102D44] text-[10px] text-[#29B6F6] font-mono shrink-0">
                Verified Provider
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. WRF UNAVAILABLE STATE (Neutral informational styling, NOT a huge red alert) */}
      {modelId === 'WRF' && isUnavailable && (
        <div
          id="wrf-informational-panel"
          className="bg-[#0B263D]/80 border border-[#1D5278] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-[#102D44] border border-[#1D5278] flex items-center justify-center text-[#29B6F6] shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  WRF — Regional High-Resolution Forecast
                </h4>
                <span className="px-2 py-0.5 rounded bg-[#102D44] border border-[#1D5278] text-[10px] font-mono text-[#AFC4D8]">
                  SOURCE NOT CONFIGURED
                </span>
              </div>

              <p className="text-xs text-[#AFC4D8] leading-relaxed max-w-2xl font-sans">
                Live IMD WRF output requires an authorized data-access configuration. MAUSAM does not substitute another model for unavailable WRF data.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#102D44] hover:bg-[#1565C0] border border-[#1D5278] hover:border-[#29B6F6] text-xs font-semibold text-white transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-[#29B6F6]" />
            <span>View Data Requirements</span>
          </button>
        </div>
      )}

      {/* IMD WRF Configuration & Data Requirements Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0B263D] border border-[#1D5278] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-xs font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#1D5278]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#29B6F6]" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Configure IMD WRF Operational Source
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded text-[#AFC4D8] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#AFC4D8] leading-relaxed">
              Live IMD WRF (ARW 3 km / 9 km) operational forecast feeds require authenticated institutional access to the IMD HPC infrastructure. When credentials are unconfigured, MAUSAM adheres strictly to scientific honesty and displays <strong>SOURCE NOT CONFIGURED</strong> rather than interpolating synthetic data.
            </p>

            <form onSubmit={handleSaveConfig} className="flex flex-col gap-3 font-mono">
              <div>
                <label className="text-[11px] text-[#AFC4D8] font-semibold block mb-1">
                  IMD WRF API Gateway URL:
                </label>
                <div className="flex items-center bg-[#061A2B] border border-[#1D5278] rounded-lg px-3 py-2 text-white">
                  <Globe className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="url"
                    value={imdUrl}
                    onChange={(e) => setImdUrl(e.target.value)}
                    placeholder="https://nwp.imd.gov.in/api/v1/wrf"
                    className="w-full bg-transparent border-none outline-hidden text-xs text-white placeholder-slate-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block font-sans">
                  Environment fallback: IMD_WRF_API_URL
                </span>
              </div>

              <div>
                <label className="text-[11px] text-[#AFC4D8] font-semibold block mb-1">
                  IMD API Token / Bearer Key:
                </label>
                <div className="flex items-center bg-[#061A2B] border border-[#1D5278] rounded-lg px-3 py-2 text-white">
                  <Key className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="password"
                    value={imdToken}
                    onChange={(e) => setImdToken(e.target.value)}
                    placeholder="Enter institutional IMD authorization key"
                    className="w-full bg-transparent border-none outline-hidden text-xs text-white placeholder-slate-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block font-sans">
                  Environment fallback: IMD_API_TOKEN
                </span>
              </div>

              {saveSuccess && (
                <div className="p-2 rounded bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] text-xs flex items-center gap-1.5 font-sans">
                  <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                  <span>Configuration saved successfully. Refreshing workspace...</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1D5278]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#1D5278] bg-[#081F33] text-[#AFC4D8] hover:text-white transition-colors cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1565C0] hover:bg-[#0B3D91] text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
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
