import React from 'react';
import { NWPModelId, NWP_MODEL_DEFINITIONS } from '../../data/nwpModels';
import { Info, Check, ShieldAlert, Sparkles, Layers } from 'lucide-react';

interface WhatThisModelDoesProps {
  modelId: NWPModelId;
}

export const WhatThisModelDoes: React.FC<WhatThisModelDoesProps> = ({ modelId }) => {
  const def = NWP_MODEL_DEFINITIONS[modelId];

  const modelContent = {
    WRF: {
      explanation:
        'WRF (Weather Research and Forecasting) is a regional non-hydrostatic numerical simulation system configured to resolve complex mesoscale atmospheric processes across India at up to 3 km resolution.',
      predicts: [
        'Convective Precipitation & Downpours',
        'Localized Squalls & Microbursts',
        'Sea-Breeze Circulation Fronts',
        'Surface 2m Temperature & Heat Index',
        'Orography & Mountain Wave Dynamics',
        'Cloud Layers & Convective Updrafts',
      ],
      bestFor: [
        'Short-range synoptic weather (0–72 Hours)',
        'Resolving localized coastal & terrain storms',
        'High-resolution precipitation pinpointing',
        'Diurnal cycle temperature peaks',
      ],
      limitations: [
        'Limited to regional Indian domain',
        'Higher computational sensitivity to initial conditions',
        'Forecast skill degrades significantly beyond 72 hours',
        'Requires authenticated IMD institutional gateway access',
      ],
    },
    GEFS: {
      explanation:
        'GEFS (Global Ensemble Forecast System) runs 31 concurrent global simulations initialized with microscopic perturbations to explicitly quantify forecast uncertainty and generate probability envelopes.',
      predicts: [
        'Ensemble Mean & Median Temperature',
        'Precipitation Occurrence Probability (%)',
        'Wind Gust Envelope & Member Spread',
        'Atmospheric Stability Indices',
        'Synoptic Pressure Envelopes',
        '16-Day Medium-Range Atmospheric Waves',
      ],
      bestFor: [
        'Medium-range planning (3–16 Days)',
        'Quantifying forecast confidence and uncertainty',
        'Probabilistic extreme event risk detection',
        'Alternative scenario planning (member clustering)',
      ],
      limitations: [
        'Coarser spatial grid (~25 km) cannot resolve micro-scale storms',
        'Underpredicts hyper-localized flash flooding',
        'Smoothed ensemble mean may dampen peak extreme values',
        'Requires interpreting spread rather than single deterministic point',
      ],
    },
    ECMWF: {
      explanation:
        'ECMWF IFS (Integrated Forecasting System) is the global gold standard for medium-range weather prediction, ingesting millions of worldwide satellite observations through continuous 4D-Var data assimilation.',
      predicts: [
        'Global Synoptic Planetary Wave Patterns',
        'Deep Low-Pressure & Monsoon Trough Paths',
        'Global Surface Temperature & Relative Humidity',
        'Quantitative Precipitation Forecast (QPF)',
        'Mean Sea Level Barometric Pressure',
        '10m Wind Fields & Upper-Level Jet Streams',
      ],
      bestFor: [
        'Global medium-range forecasts (0–15 Days)',
        'Synoptic storm tracking & pressure field evolution',
        'Unrivaled 500 hPa planetary wave accuracy',
        'Sub-seasonal atmospheric phase transitions',
      ],
      limitations: [
        'Hydrostatic formulations at global scale dampen micro-updrafts',
        'Localized urban microclimates are generalized',
        'Full high-resolution operational dataset is restricted by open data tiers',
        'Updates in 12-hour primary synoptic cycles',
      ],
    },
  }[modelId];

  return (
    <div className="nwp-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 shadow-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#29B6F6]" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
            What This Model Does — {modelId}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#AFC4D8]">
          Physical Capabilities &amp; Disclaimers
        </span>
      </div>

      {/* Short explanation */}
      <p className="text-xs sm:text-sm text-[#AFC4D8] leading-relaxed font-sans">
        {modelContent.explanation}
      </p>

      {/* 3 Columns: What it Predicts, Best For, Limitations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Column 1: What it Predicts */}
        <div className="p-3.5 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-2">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#29B6F6]" />
            <span>What It Predicts</span>
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-[#AFC4D8] font-sans">
            {modelContent.predicts.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[#29B6F6] font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Best For */}
        <div className="p-3.5 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-2">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#00E676]" />
            <span>Best Used For</span>
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-[#AFC4D8] font-sans">
            {modelContent.bestFor.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[#00E676] font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Limitations */}
        <div className="p-3.5 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-2">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Limitations</span>
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-[#AFC4D8] font-sans">
            {modelContent.limitations.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
