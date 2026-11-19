import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { DataPanel } from '../ui/ObservatoryPrimitives';

export const HowToReadNWP: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const sections = [
    {
      q: 'What is NWP (Numerical Weather Prediction)?',
      a: 'NWP uses supercomputers to solve fluid dynamics and thermodynamics equations to project future states of Earth’s atmosphere from current observations.',
    },
    {
      q: 'Why do weather models disagree?',
      a: 'Models differ in spatial grid resolution, cloud/convection parameterization schemes, initial observation assimilation methods, and boundary conditions.',
    },
    {
      q: 'What is ensemble spread?',
      a: 'In ensemble systems like GEFS, spread measures divergence across perturbed trajectories. Narrow spread means higher confidence; wide spread signals uncertainty.',
    },
    {
      q: 'What is forecast lead time?',
      a: 'Lead time is hours ahead from model initialization (00Z, 06Z, 12Z, or 18Z UTC). Predictive skill generally decreases as lead time grows.',
    },
    {
      q: 'What is model resolution?',
      a: 'Horizontal grid spacing (e.g., 3 km vs 25 km). Finer grids resolve terrain and localized convection; coarser grids average across wider areas.',
    },
    {
      q: 'What is a model run?',
      a: 'A single complete simulation cycle initiated at standard synoptic UTC hours as fresh global observations are assimilated.',
    },
    {
      q: 'What is model-derived data?',
      a: 'Raw grid output produced by mathematical equations prior to human forecaster synthesis or local statistical bias correction.',
    },
    {
      q: 'What is an official warning vs a model forecast?',
      a: 'A model forecast is a mathematical physics projection. An official warning is a statutory public safety advisory issued by IMD / NDMA / SDMAs.',
    },
  ];

  return (
    <DataPanel className="flex flex-col gap-3 w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 text-left cursor-pointer m-focus-ring rounded-lg"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)] shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[var(--m-text-primary)] tracking-tight">
            How to Read Model Forecasts
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[var(--m-accent)] font-mono">
          <span>{isOpen ? 'Collapse Guide' : 'Expand Guide (8 Topics)'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[var(--m-border)] text-xs">
          {sections.map((sec) => (
            <div key={sec.q} className="m-panel-inset p-3 flex flex-col gap-1">
              <span className="font-bold text-[var(--m-text-primary)] text-xs">{sec.q}</span>
              <p className="text-[var(--m-text-secondary)] leading-relaxed text-[11px]">{sec.a}</p>
            </div>
          ))}
        </div>
      )}
    </DataPanel>
  );
};
