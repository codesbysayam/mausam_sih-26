// ====================================================================
// MAUSAM Observatory Controls Guide, Keyboard Hint & Guided Tours
// Non-blocking on initial entry; opens via Help button or `?` shortcut.
// Presents Mouse/Keyboard vs Touch tabs, renderer/quality status, and
// one-click scientific guided tours across the Indian Subcontinent.
// ====================================================================

import React, { useState } from 'react';
import {
  Compass,
  MousePointerClick,
  Keyboard,
  Smartphone,
  ArrowRight,
  X,
  HelpCircle,
} from 'lucide-react';
import { GUIDED_TOURS, useExperience } from '../../context/ExperienceContext';

export const FirstVisitGuide: React.FC = () => {
  const {
    showControlsGuide,
    openControlsGuide,
    dismissControlsGuide,
    setMode,
    rendererMode,
    qualityTier,
    activeTourId,
    tourStepIndex,
    startTour,
    nextTourStep,
    stopTour,
  } = useExperience();

  const [controlsTab, setControlsTab] = useState<'desktop' | 'touch'>('desktop');

  const activeTour = activeTourId ? GUIDED_TOURS.find((t) => t.id === activeTourId) : null;
  const activeStep = activeTour?.steps[tourStepIndex] || null;

  return (
    <>
      {/* Active Guided Tour Narration Banner */}
      {activeTour && activeStep && (
        <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-30 w-[min(460px,calc(100vw-24px))] spatial-hud-surface-elevated rounded-xl px-4 py-3 pointer-events-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--m-accent)] tabular-nums">
                Guided Tour · Step {tourStepIndex + 1}/{activeTour.steps.length}
              </div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] mt-0.5">
                {activeStep.title}
              </h3>
              <p className="text-xs text-[var(--m-text-secondary)] mt-1 leading-relaxed">
                {activeStep.summary}
              </p>
            </div>
            <button
              type="button"
              onClick={stopTour}
              aria-label="Exit guided tour"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer shrink-0 m-focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={stopTour}
              className="px-3 min-h-[36px] sm:min-h-[32px] rounded-lg text-xs text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] cursor-pointer m-focus-ring"
            >
              Exit Tour
            </button>
            <button
              type="button"
              onClick={nextTourStep}
              className="px-3.5 min-h-[36px] sm:min-h-[32px] rounded-lg bg-[var(--m-accent)] text-[#07111B] text-xs font-semibold flex items-center gap-1 cursor-pointer m-focus-ring"
            >
              <span>
                {tourStepIndex + 1 >= activeTour.steps.length ? 'Finish' : 'Next Sector'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Subtle Non-Blocking Desktop Control Hint (bottom-right) */}
      {!showControlsGuide && !activeTour && (
        <button
          type="button"
          onClick={openControlsGuide}
          className="hidden xl:inline-flex fixed right-3 bottom-3 z-20 spatial-hud-surface rounded-lg px-2.5 py-1.5 items-center gap-2 text-[10px] font-mono text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] transition-colors cursor-pointer pointer-events-auto m-focus-ring"
          title="Open Observatory Controls & Guided Tours (?)"
        >
          <HelpCircle className="w-3 h-3 text-[var(--m-accent)] shrink-0" />
          <span>Drag: Orbit · Scroll: Zoom · Click: Inspect · R: Reset · ?: Help</span>
        </button>
      )}

      {/* On-Demand Observatory Controls & Guided Tours Modal */}
      {showControlsGuide && !activeTour && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="MAUSAM 3D Atmospheric Observatory Controls"
          className="fixed bottom-[104px] left-1/2 -translate-x-1/2 z-40 w-[min(580px,calc(100vw-20px))] spatial-hud-surface-elevated rounded-2xl p-4 pointer-events-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--m-accent)]">
                <span>MAUSAM Atmospheric Observatory</span>
                <span className="text-[var(--m-text-muted)]">·</span>
                <span className="text-[var(--m-text-secondary)]">
                  {rendererMode === '3d' ? '3D Relief' : '2D Map'} ({qualityTier})
                </span>
              </div>
              <h2 className="text-base font-bold text-[var(--m-text-primary)] mt-0.5">
                Spatial Navigation &amp; Guided Atmospheric Tours
              </h2>
            </div>
            <button
              type="button"
              onClick={dismissControlsGuide}
              aria-label="Close controls guide"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer m-focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop vs Touch Controls Tabs */}
          <div className="flex items-center gap-1.5 mt-3">
            <button
              type="button"
              onClick={() => setControlsTab('desktop')}
              aria-pressed={controlsTab === 'desktop'}
              className={`px-3 min-h-[32px] rounded-lg text-xs font-semibold flex items-center gap-1.5 border cursor-pointer m-focus-ring ${
                controlsTab === 'desktop'
                  ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/45 text-[var(--m-text-primary)]'
                  : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)]'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Mouse &amp; Keyboard</span>
            </button>
            <button
              type="button"
              onClick={() => setControlsTab('touch')}
              aria-pressed={controlsTab === 'touch'}
              className={`px-3 min-h-[32px] rounded-lg text-xs font-semibold flex items-center gap-1.5 border cursor-pointer m-focus-ring ${
                controlsTab === 'touch'
                  ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/45 text-[var(--m-text-primary)]'
                  : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Touch &amp; Mobile</span>
            </button>
          </div>

          {controlsTab === 'desktop' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 text-xs">
              <div className="bg-[var(--m-surface-inset)] rounded-lg p-2.5 border border-[var(--m-border)] flex items-start gap-2">
                <Compass className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[var(--m-text-primary)]">Orbit &amp; Pan</div>
                  <div className="text-[11px] text-[var(--m-text-muted)]">
                    Left-drag orbits, right-drag pans across India, scroll zooms.
                  </div>
                </div>
              </div>
              <div className="bg-[var(--m-surface-inset)] rounded-lg p-2.5 border border-[var(--m-border)] flex items-start gap-2">
                <MousePointerClick className="w-4 h-4 text-[var(--m-ok)] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[var(--m-text-primary)]">Inspect Beacons</div>
                  <div className="text-[11px] text-[var(--m-text-muted)]">
                    Click any state pylon, Doppler dome, or use the Stations list.
                  </div>
                </div>
              </div>
              <div className="bg-[var(--m-surface-inset)] rounded-lg p-2.5 border border-[var(--m-border)] flex items-start gap-2">
                <Keyboard className="w-4 h-4 text-[var(--m-watch)] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[var(--m-text-primary)]">Shortcuts</div>
                  <div className="text-[11px] text-[var(--m-text-muted)]">
                    Arrows/WASD pan · +/- zoom · R resets · ? toggles guide.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 text-xs">
              <div className="bg-[var(--m-surface-inset)] rounded-lg p-2.5 border border-[var(--m-border)]">
                <div className="font-semibold text-[var(--m-text-primary)]">
                  One-Finger Orbit &amp; Pinch Zoom
                </div>
                <div className="text-[11px] text-[var(--m-text-muted)] mt-0.5">
                  Drag with one finger to rotate around India; pinch with two fingers to zoom or
                  drag horizontally.
                </div>
              </div>
              <div className="bg-[var(--m-surface-inset)] rounded-lg p-2.5 border border-[var(--m-border)]">
                <div className="font-semibold text-[var(--m-text-primary)]">
                  Tap Stations or Open Classic
                </div>
                <div className="text-[11px] text-[var(--m-text-muted)] mt-0.5">
                  Tap any marker to inspect regional telemetry, or switch to Classic for a low-GPU
                  text-first briefing.
                </div>
              </div>
            </div>
          )}

          {/* Quick Guided Tours */}
          <div className="mt-3 pt-2.5 border-t border-[var(--m-border)]">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--m-text-muted)] mb-1.5">
              Guided Tours
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GUIDED_TOURS.map((tour) => (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => startTour(tour.id)}
                  className="px-3 min-h-[36px] sm:min-h-[32px] rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] hover:border-[var(--m-accent)]/50 text-[11px] text-[var(--m-text-primary)] transition-colors cursor-pointer m-focus-ring"
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
              className="text-xs text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] underline cursor-pointer min-h-[36px] sm:min-h-[32px]"
            >
              Switch to Classic Accessible View
            </button>
            <button
              type="button"
              onClick={dismissControlsGuide}
              className="px-4 min-h-[40px] sm:min-h-[36px] rounded-lg bg-[var(--m-accent)] text-[#07111B] text-xs font-bold hover:opacity-95 cursor-pointer m-focus-ring"
            >
              Resume Exploring
            </button>
          </div>
        </div>
      )}
    </>
  );
};
