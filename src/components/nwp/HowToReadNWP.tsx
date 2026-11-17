import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

export const HowToReadNWP: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const sections = [
    {
      q: 'What is NWP (Numerical Weather Prediction)?',
      a: 'NWP uses supercomputers to solve the fundamental mathematical Navier-Stokes equations of fluid dynamics and thermodynamics to project future states of the Earth’s atmosphere from current observations.',
    },
    {
      q: 'Why do weather models disagree?',
      a: 'Because models differ in their spatial resolution, mathematical approximations (parameterizations) of clouds and convection, initial observation assimilation methods, and geographic boundary assumptions.',
    },
    {
      q: 'What is ensemble spread?',
      a: 'In ensemble systems like GEFS (31 members), the spread is the statistical divergence between members. A narrow spread indicates high confidence; a wide spread indicates high atmospheric uncertainty.',
    },
    {
      q: 'What is forecast lead time?',
      a: 'Lead time is the number of hours into the future that the simulation predicts, starting from the model initialization time (00Z, 06Z, 12Z, or 18Z). Skill decreases as lead time extends.',
    },
    {
      q: 'What is model resolution?',
      a: 'Resolution is the horizontal grid cell size (e.g., 3 km vs 25 km). Finer resolution captures microscale terrain, thunderstorms, and coastal breezes; coarser resolution averages these over wider regions.',
    },
    {
      q: 'What is a model run?',
      a: 'A single complete supercomputer simulation cycle, typically initiated at standard synoptic hours (00:00, 06:00, 12:00, 18:00 UTC) as fresh global observations are ingested.',
    },
    {
      q: 'What is model-derived data?',
      a: 'Raw mathematical grid output directly produced by mathematical equations before human forecaster synthesis, regional bias correction, or local post-processing.',
    },
    {
      q: 'What is an official warning vs a model forecast?',
      a: 'A model forecast is a computer calculation of physical probabilities. An official warning is a legal public safety directive issued exclusively by authorized government meteorologists (such as IMD / NDMA).',
    },
  ];

  return (
    <div className="nwp-card flex flex-col gap-3 rounded-2xl p-4 sm:p-5 shadow-md w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#29B6F6]" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
            How to Read Model Forecasts
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#29B6F6] font-mono">
          <span>{isOpen ? 'Collapse Guide' : 'Expand Guide (8 Topics)'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#1D5278]/60 animate-fade-in text-xs font-sans">
          {sections.map((sec, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col gap-1">
              <span className="font-bold text-white text-xs">{sec.q}</span>
              <p className="text-[#AFC4D8] leading-relaxed text-[11px]">{sec.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
