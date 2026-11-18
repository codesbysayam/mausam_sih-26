import React from 'react';
import { X, BookOpen } from 'lucide-react';

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
        'The Weather Research and Forecasting (WRF) model is a non-hydrostatic mesoscale system. Operational agencies (such as IMD) configure WRF over regional domains down to 3 km resolution to explicitly resolve severe thunderstorms, terrain effects, and squall lines.',
    },
    {
      title: '3. What is GEFS?',
      content:
        'The Global Ensemble Forecast System (GEFS), operated by NOAA/NCEP, runs 31 perturbed ensemble members at ~25 km resolution out to 16 days to quantify atmospheric uncertainty and compute risk probabilities.',
    },
    {
      title: '4. What is ECMWF IFS?',
      content:
        'The Integrated Forecasting System (IFS) operated by ECMWF is a leading medium-range global model ingesting worldwide satellite radiances via continuous 4D-Var data assimilation.',
    },
    {
      title: '5. Why do models disagree?',
      content:
        'Models disagree because they use different dynamical cores, horizontal grid resolutions, physics parameterizations for clouds and convection, and assimilate observations differently.',
    },
    {
      title: '6. What is ensemble spread?',
      content:
        'Ensemble spread is the range among ensemble members. Narrow spread signifies strong agreement and higher confidence; wide spread indicates sensitivity to initial chaos and lower certainty.',
    },
    {
      title: '7. Why does forecast accuracy decrease with lead time?',
      content:
        'The atmosphere is a chaotic non-linear system. Small observational errors amplify over days, causing forecast skill to decay noticeably past day 7–10.',
    },
    {
      title: '8. Why can local weather differ from a global model?',
      content:
        'A global model averages atmospheric variables across a 9 km to 25 km grid cell. Urban heat islands, valleys, and isolated thunderstorms occur below global grid resolution.',
    },
    {
      title: '9. Model output vs calculated metrics',
      content:
        'Raw hourly temperatures, rainfall totals, wind vectors, pressure, and CAPE come directly from the upstream model streams. MAUSAM computes inter-model spread and age labels without fabricating missing fields.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="m-panel-elevated w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#26394B] flex items-center justify-between bg-[#08131F]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#35C7E8]" />
            <h2 className="text-base sm:text-lg font-bold font-mono text-[#F3F6FA]">
              How to Read NWP Models
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#172A3B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-[#B5C3D1] divide-y divide-[#26394B]">
          {sections.map((s, idx) => (
            <div key={s.title} className={idx > 0 ? 'pt-3.5' : ''}>
              <h3 className="font-mono font-bold text-[#7DD3FC] text-xs sm:text-sm mb-1">
                {s.title}
              </h3>
              <p className="leading-relaxed text-[#B5C3D1] text-xs sm:text-[13px]">
                {s.content}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[#26394B] bg-[#08131F] flex items-center justify-between text-[11px] font-mono text-[#8295A8]">
          <span>MAUSAM Meteorological Reference</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[#0B72B9] hover:bg-[#0E82CF] text-white font-semibold transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
