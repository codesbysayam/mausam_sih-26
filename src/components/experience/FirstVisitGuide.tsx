// ====================================================================
// MAUSAM First-Visit Spatial Controls Guide & Guided Atmospheric Tours
// Teaches drag/zoom/keyboard spatial interaction cleanly and offers
// one-click camera + layer tours across India without visual clutter.
// ====================================================================

import React from 'react';
import { Compass, MousePointerClick, Keyboard, ArrowRight, X } from 'lucide-react';
import { GUIDED_TOURS, useExperience } from '../../context/ExperienceContext';

export const FirstVisitGuide: React.FC = () => {
  const {
    showControlsGuide,
    dismissControlsGuide,
    setMode,
    activeTourId,
    tourStepIndex,
    startTour,
    nextTourStep,
    stopTour,
  } = useExperience();

  const activeTour = activeTourId ? GUIDED_TOURS.find((t) => t.id === activeTourId) : null;
  const activeStep = activeTour?.steps[tourStepIndex] || null;

  return (
    <>
      {/* Active Guided Tour Narration Banner */}
      {activeTour && activeStep && (
        <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-30 w-[min(460px,calc(100vw-24px))] spatial-hud-surface-elevated rounded-xl px-4 py-3 pointer-events-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#35C7E8]">
                Guided Tour · Step {tourStepIndex + 1}/{activeTour.steps.length}
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">{activeStep.title}</h3>
              <p className="text-xs text-[#B8C7D9] mt-1 leading-relaxed">{activeStep.summary}</p>
            </div>
            <button
              type="button"
              onClick={stopTour}
              aria-label="Exit guided tour"
              className="p-1 rounded text-[#7F93A8] hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={stopTour}
              className="px-2.5 py-1 rounded-lg text-xs text-[#7F93A8] hover:text-white cursor-pointer"
            >
              Exit Tour
            </button>
            <button
              type="button"
              onClick={nextTourStep}
              className="px-3 py-1 rounded-lg bg-[#35C7E8] text-[#05101C] text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{tourStepIndex + 1 >= activeTour.steps.length ? 'Finish' : 'Next Sector'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Dismissible First-Visit Spatial Orientation Overlay */}
      {showControlsGuide && !activeTour && (
        <div
          role="dialog"
          aria-label="Spatial Atmosphere Controls Guide"
          className="fixed bottom-[94px] left-1/2 -translate-x-1/2 z-30 w-[min(560px,calc(100vw-20px))] spatial-hud-surface-elevated rounded-2xl p-4 pointer-events-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#35C7E8]">
                Interactive 3D Atmospheric Environment
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Explore India&apos;s live atmosphere in space and time
              </h2>
            </div>
            <button
              type="button"
              onClick={dismissControlsGuide}
              aria-label="Dismiss guide"
              className="p-1 rounded-lg text-[#7F93A8] hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
            <div className="bg-[#07111D]/70 rounded-lg p-2.5 border border-[#84A8CC]/12 flex items-start gap-2">
              <Compass className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Orbit &amp; Zoom</div>
                <div className="text-[11px] text-[#7F93A8]">Drag or scroll / pinch to fly smoothly over regions.</div>
              </div>
            </div>
            <div className="bg-[#07111D]/70 rounded-lg p-2.5 border border-[#84A8CC]/12 flex items-start gap-2">
              <MousePointerClick className="w-4 h-4 text-[#36C6B0] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Inspect Stations</div>
                <div className="text-[11px] text-[#7F93A8]">Click any state beacon or Doppler radar dome.</div>
              </div>
            </div>
            <div className="bg-[#07111D]/70 rounded-lg p-2.5 border border-[#84A8CC]/12 flex items-start gap-2">
              <Keyboard className="w-4 h-4 text-[#E8B64D] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Keyboard Keys</div>
                <div className="text-[11px] text-[#7F93A8]">WASD / Arrows · +/- zoom · R to recenter India.</div>
              </div>
            </div>
          </div>

          {/* Quick Guided Tours */}
          <div className="mt-3 pt-2.5 border-t border-[#84A8CC]/15">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#7F93A8] mb-1.5">
              Guided Tours
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GUIDED_TOURS.map((tour) => (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => startTour(tour.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#07111D]/80 border border-[#84A8CC]/20 hover:border-[#35C7E8]/50 text-[11px] text-[#F4F7FB] transition-colors cursor-pointer"
                >
                  {tour.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                dismissControlsGuide();
                setMode('classic');
              }}
              className="text-xs text-[#7F93A8] hover:text-white underline cursor-pointer"
            >
              Switch to Classic Accessible View
            </button>
            <button
              type="button"
              onClick={dismissControlsGuide}
              className="px-4 py-1.5 rounded-lg bg-[#35C7E8] text-[#05101C] text-xs font-bold hover:opacity-95 cursor-pointer"
            >
              Start Exploring
            </button>
          </div>
        </div>
      )}
    </>
  );
};
