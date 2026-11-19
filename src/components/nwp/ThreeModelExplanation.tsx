import React from 'react';
import { Layers, Mountain, Activity, Compass } from 'lucide-react';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

export const ThreeModelExplanation: React.FC = () => {
  const models = [
    {
      name: 'WRF',
      title: 'Regional High-Resolution',
      icon: Mountain,
      accent: 'text-[var(--m-accent)]',
      what: 'A regional non-hydrostatic simulation focusing on India and surrounding waters down to 3 km grid spacing.',
      why: 'Global models smooth out mountains, valleys, and coastlines. WRF resolves localized sea breezes and convective thunderclouds.',
      bestFor: 'Hyper-local rainstorms, squall lines, and short-term (1–3 day) forecasts.',
    },
    {
      name: 'GEFS',
      title: 'Global Ensemble (31 Members)',
      icon: Activity,
      accent: 'text-[var(--m-watch)]',
      what: 'An ensemble system running 31 parallel simulations with slightly perturbed initial conditions up to 16 days out.',
      why: 'The atmosphere is chaotic. Multiple trajectories quantify event probability rather than relying on one deterministic curve.',
      bestFor: 'Assessing forecast confidence, calculating rain probability, and 1–2 week planning.',
    },
    {
      name: 'ECMWF',
      title: 'Global Medium Range (IFS)',
      icon: Compass,
      accent: 'text-[var(--m-ok)]',
      what: 'The European Centre model, widely recognized for global medium-range atmospheric accuracy.',
      why: 'Ingests global satellite radiances continuously through 4-Dimensional variational data assimilation.',
      bestFor: 'Tracking major storms, synoptic troughs, temperature waves, and 5–15 day guidance.',
    },
  ];

  return (
    <DataPanel className="flex flex-col gap-4 w-full">
      <SectionHeading
        title="Understanding the Three NWP Systems"
        subtitle="Operational role of regional, ensemble, and global cores"
        icon={<Layers className="w-4 h-4" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {models.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.name} className="m-panel-inset p-4 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${m.accent}`} />
                  <span className="font-bold text-[var(--m-text-primary)] text-sm font-mono tracking-tight">
                    {m.name}
                  </span>
                  <span className="text-[11px] text-[var(--m-text-muted)] truncate">
                    ({m.title})
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  <div>
                    <strong className="text-[10px] block font-mono uppercase text-[var(--m-accent)]">
                      What It Is
                    </strong>
                    <p className="text-[var(--m-text-secondary)] leading-relaxed mt-0.5">{m.what}</p>
                  </div>

                  <div>
                    <strong className="text-[10px] block font-mono uppercase text-[var(--m-watch)]">
                      Why It Matters
                    </strong>
                    <p className="text-[var(--m-text-secondary)] leading-relaxed mt-0.5">{m.why}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--m-border)] text-xs">
                <span className="text-[10px] font-mono uppercase text-[var(--m-text-muted)] block">
                  Best Used For
                </span>
                <span className="text-[var(--m-text-primary)] font-medium">{m.bestFor}</span>
              </div>
            </div>
          );
        })}
      </div>
    </DataPanel>
  );
};
