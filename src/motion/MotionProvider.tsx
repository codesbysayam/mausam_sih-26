// ====================================================================
// MAUSAM - Global Motion Provider
// Bridges OS prefers-reduced-motion, ExperienceContext.reducedMotion,
// viewport tier, coarse pointer detection, and document visibility.
// ====================================================================

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { useExperience } from '../context/ExperienceContext';
import { getResponsiveMotionProfile, ResponsiveMotionProfile } from './tokens';

export interface MausamMotionContextValue extends ResponsiveMotionProfile {
  isDocumentVisible: boolean;
  shouldAnimateAmbient: boolean;
}

const DEFAULT_PROFILE: MausamMotionContextValue = {
  ...getResponsiveMotionProfile(1280, false, false),
  isDocumentVisible: true,
  shouldAnimateAmbient: true,
};

const MausamMotionContext = createContext<MausamMotionContextValue>(DEFAULT_PROFILE);

export const MotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reducedMotion: appReducedMotion, displayProfile } = useExperience();

  const [osReducedMotion, setOsReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [coarsePointer, setCoarsePointer] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');

    const onRmChange = (e: MediaQueryListEvent) => setOsReducedMotion(e.matches);
    const onPointerChange = (e: MediaQueryListEvent) => setCoarsePointer(e.matches);

    let rafResize = 0;
    const onResize = () => {
      if (rafResize) return;
      rafResize = window.requestAnimationFrame(() => {
        rafResize = 0;
        setViewportWidth(window.innerWidth);
      });
    };

    const onVisibility = () => setIsDocumentVisible(!document.hidden);

    rmQuery.addEventListener?.('change', onRmChange);
    pointerQuery.addEventListener?.('change', onPointerChange);
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      rmQuery.removeEventListener?.('change', onRmChange);
      pointerQuery.removeEventListener?.('change', onPointerChange);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafResize) window.cancelAnimationFrame(rafResize);
    };
  }, []);

  const effectiveReduced = appReducedMotion || osReducedMotion;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute(
      'data-reduced-motion',
      effectiveReduced ? 'true' : 'false'
    );
  }, [effectiveReduced]);

  const value = useMemo<MausamMotionContextValue>(() => {
    const profile = getResponsiveMotionProfile(
      viewportWidth,
      effectiveReduced,
      coarsePointer,
      displayProfile
    );
    return {
      ...profile,
      isDocumentVisible,
      shouldAnimateAmbient:
        !profile.reducedMotion && isDocumentVisible && profile.ambientIntensity !== 'static',
    };
  }, [viewportWidth, effectiveReduced, coarsePointer, displayProfile, isDocumentVisible]);

  return (
    <MausamMotionContext.Provider value={value}>
      <MotionConfig reducedMotion={effectiveReduced ? 'always' : 'never'}>
        {children}
      </MotionConfig>
    </MausamMotionContext.Provider>
  );
};

export function useMausamMotion(): MausamMotionContextValue {
  return useContext(MausamMotionContext);
}
