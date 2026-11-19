import React from 'react';
import { Info, Check, ShieldAlert, Sparkles } from 'lucide-react';
import { NWPModelId } from '../../data/nwpModels';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

interface WhatThisModelDoesProps {
  modelId: NWPModelId;
}

export const WhatThisModelDoes: React.FC<WhatThisModelDoesProps> = ({ modelId }) => {
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
        'Higher sensitivity to initial conditions',
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
        'Smoothed ensemble mean may dampen peak extremes',
        'Requires interpreting spread rather than a single deterministic line',
      ],
    },
    ECMWF: {
      explanation:
        'ECMWF IFS (Integrated Forecasting System) is a leading medium-range global weather model ingesting worldwide satellite observations through continuous 4D-Var data assimilation.',
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
        '500 hPa planetary wave accuracy',
        'Sub-seasonal atmospheric phase transitions',
      ],
      limitations: [
        'Global scale dampens isolated convective updrafts',
        'Localized urban microclimates are generalized',
        'Full raw operational tiers require institutional access',
        'Updates in 12-hour primary synoptic cycles',
      ],
    },
  }[modelId];

  return (
    <DataPanel className="flex flex-col gap-4 w-full">
      <SectionHeading
        title={`What This Model Does — ${modelId}`}
        subtitle="Physical capabilities and operational boundaries"
        icon={<Info className="w-4 h-4" />}
      />

      <p className="text-xs sm:text-sm text-[var(--m-text-secondary)] leading-relaxed">
        {modelContent.explanation}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="m-panel-inset p-3.5 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[var(--m-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--m-accent)]" />
            <span>What It Predicts</span>
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-[var(--m-text-secondary)]">
            {modelContent.predicts.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="text-[var(--m-accent)] font-bold">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="m-panel-inset p-3.5 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[var(--m-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[var(--m-ok)]" />
            <span>Best Used For</span>
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-[var(--m-text-secondary)]">
            {modelContent.bestFor.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="text-[var(--m-ok)] font-bold">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="m-panel-inset p-3.5 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[var(--m-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--m-watch)]" />
            <span>Limitations</span>
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-[var(--m-text-secondary)]">
            {modelContent.limitations.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="text-[var(--m-watch)] font-bold">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DataPanel>
  );
};
