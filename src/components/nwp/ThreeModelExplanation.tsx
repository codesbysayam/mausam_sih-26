import React from 'react';
import { Layers, Mountain, Activity, Compass, ArrowRight } from 'lucide-react';

export const ThreeModelExplanation: React.FC = () => {
  const models = [
    {
      name: 'WRF',
      title: 'Regional High-Resolution',
      icon: Mountain,
      accent: 'text-[#29B6F6]',
      what: 'A high-precision regional simulation focusing exclusively on India and surrounding waters down to 3 km grid spacing.',
      why: 'Because global models smooth out mountains, rivers, and cities. WRF zooms in to simulate localized sea breezes and thunderclouds.',
      bestFor: 'Hyper-local rainstorms, squall lines, and short-term (1–3 day) localized forecasts.',
    },
    {
      name: 'GEFS',
      title: 'Global Ensemble (31 Members)',
      icon: Activity,
      accent: 'text-amber-400',
      what: 'An ensemble system running 31 parallel simulations with slightly altered initial conditions up to 16 days out.',
      why: 'Because the atmosphere is chaotic. Running 31 scenarios reveals the probability of extreme events rather than guessing a single outcome.',
      bestFor: 'Assessing forecast confidence, calculating rain probability, and planning 1 to 2 weeks ahead.',
    },
    {
      name: 'ECMWF',
      title: 'Global Medium Range (IFS)',
      icon: Compass,
      accent: 'text-[#00E676]',
      what: 'The European Centre model, universally ranked as the highest-accuracy medium-range global forecast system in the world.',
      why: 'It ingests hundreds of millions of worldwide satellite radiances using continuous 4-Dimensional data assimilation.',
      bestFor: 'Tracking major storms, synoptic weather changes, temperature waves, and 5 to 15-day guidance.',
    },
  ];

  return (
    <div className="nwp-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 shadow-md w-full">
      <div className="flex items-center justify-between pb-2 border-b border-[#1D5278]/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#29B6F6]" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-sans">
            Understanding the Three NWP Systems
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#AFC4D8]">
          Plain-English Guide for Decision Makers
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {models.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.name}
              className="p-4 rounded-xl bg-[#081F33] border border-[#1D5278] flex flex-col justify-between gap-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${m.accent}`} />
                  <span className="font-extrabold text-white text-sm font-mono tracking-tight">
                    {m.name}
                  </span>
                  <span className="text-[10px] text-[#AFC4D8] font-sans truncate">
                    ({m.title})
                  </span>
                </div>

                <div className="mt-2 flex flex-col gap-2 text-xs font-sans">
                  <div>
                    <strong className="text-white text-[11px] block font-mono uppercase text-[#29B6F6]">
                      WHAT IT IS:
                    </strong>
                    <p className="text-[#AFC4D8] leading-relaxed mt-0.5">{m.what}</p>
                  </div>

                  <div>
                    <strong className="text-white text-[11px] block font-mono uppercase text-amber-300">
                      WHY IT MATTERS:
                    </strong>
                    <p className="text-[#AFC4D8] leading-relaxed mt-0.5">{m.why}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1D5278]/60 text-xs font-sans">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Best Used For:
                </span>
                <span className="text-white font-medium">{m.bestFor}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
