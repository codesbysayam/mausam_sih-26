import React from 'react';
import { X, BookOpen, Layers, Cpu, Globe, HelpCircle } from 'lucide-react';

interface ModelExplanationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelExplanation: React.FC<ModelExplanationProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: '1. What is Numerical Weather Prediction (NWP)?',
      content:
        'Numerical Weather Prediction uses supercomputers and fluid dynamic equations (Navier-Stokes equations, thermodynamic energy balance, and radiative transfer) to simulate the future state of the Earth’s atmosphere starting from current observations.',
    },
    {
      title: '2. What is WRF?',
      content:
        'The Weather Research and Forecasting (WRF) model is a non-hydrostatic mesoscale system developed by NCAR/NOAA. Operational meteorological agencies (such as IMD) configure WRF over regional domains at 3 km resolution to explicitly resolve severe thunderstorms, terrain effects, and squall lines without convective parameterization.',
    },
    {
      title: '3. What is GEFS?',
      content:
        'The Global Ensemble Forecast System (GEFS), developed by NOAA/NCEP, consists of 31 perturbed ensemble members running at ~25 km resolution out to 16 days. It generates multiple plausible futures to quantify atmospheric uncertainty and compute risk probabilities.',
    },
    {
      title: '4. What is ECMWF IFS?',
      content:
        'The Integrated Forecasting System (IFS) operated by the European Centre for Medium-Range Weather Forecasts (ECMWF) is globally acknowledged as the top-performing medium-range global model. Ingesting global satellite radiances via continuous 4D-Var data assimilation, it provides 9 km deterministic guidance.',
    },
    {
      title: '5. Why do models disagree?',
      content:
        'Models disagree because they use different mathematical formulations (dynamical cores), different grid resolutions, different physics approximations for clouds/radiation, and assimilate observational data differently.',
    },
    {
      title: '6. What is ensemble spread?',
      content:
        'Ensemble spread is the standard deviation or range among ensemble members. A narrow spread signifies strong model agreement and high forecast confidence; a wide spread indicates high sensitivity to initial chaos and lower certainty.',
    },
    {
      title: '7. Why does forecast accuracy decrease with lead time?',
      content:
        'The atmosphere is a chaotic non-linear system (the butterfly effect). Small observational errors in initial temperature, humidity, or wind double every few days, causing skill to decay significantly past day 7–10.',
    },
    {
      title: '8. Why can local weather differ from a global model?',
      content:
        'A global model averages atmospheric variables across a 9 km to 25 km grid cell. Local microclimates, urban heat islands, narrow valleys, and isolated thunderstorm cells often occur well below global grid resolution.',
    },
    {
      title: '9. Which values are model output vs calculated by MAUSAM?',
      content:
        'All raw hourly temperatures, rain totals, wind vectors, pressure, and CAPE are direct numerical outputs from the respective provider model runs. MAUSAM only computes derived metrics like model-to-model agreement, relative age, and threshold classifications without fabricating or smoothing the raw physics.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0B1523] border border-[#1E3A5F] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E2E40] flex items-center justify-between bg-[#080E18]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-base sm:text-lg font-bold font-mono text-white">
              How to Read Numerical Weather Prediction Models
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2E40] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans text-slate-300 divide-y divide-slate-800">
          {sections.map((s, idx) => (
            <div key={idx} className={idx > 0 ? 'pt-3.5' : ''}>
              <h3 className="font-mono font-bold text-sky-300 text-xs sm:text-sm mb-1">
                {s.title}
              </h3>
              <p className="leading-relaxed text-slate-300 text-xs sm:text-[13px]">
                {s.content}
              </p>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1E2E40] bg-[#080E18] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>MAUSAM Meteorological Education Division</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
