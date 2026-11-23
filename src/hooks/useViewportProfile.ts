// ====================================================================
// MAUSAM - Viewport & Device Profile Classifier + React Hook
// Single source of truth for breakpoint tiers, orientation, coarse
// pointer detection, ultrawide/large-format detection, and safe resize
// subscriptions (rAF-throttled, zero memory leaks).
// ====================================================================

import { useEffect, useState } from 'react';

export type ViewportBreakpoint =
  | 'xs'       // 320px – 374px  (small mobile)
  | 'sm'       // 375px – 479px  (standard mobile)
  | 'md'       // 480px – 767px  (large mobile / phablet)
  | 'tablet'   // 768px – 1023px (tablet portrait & compact landscape)
  | 'laptop'   // 1024px – 1279px (laptop & tablet landscape)
  | 'desktop'  // 1280px – 1535px (laptop 14-16" / standard desktop / 720p)
  | 'large'    // 1536px – 1919px (large desktop)
  | 'xl4k';    // >= 1920px       (1080p / 1440p / ultrawide / 4K / projector / TV)

export type ViewportOrientation = 'portrait' | 'landscape';

export interface ViewportProfile {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: ViewportOrientation;
  breakpoint: ViewportBreakpoint;
  isSmallMobile: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
  isUltrawide: boolean;
  is4K: boolean;
  isShortLandscape: boolean;
  isCoarsePointer: boolean;
  recommendedGridCols: 1 | 2 | 3 | 4;
}

/**
 * Pure deterministic classifier for viewport width/height.
 * Fully unit-testable across all 22 target device viewports.
 */
export function classifyViewport(
  width: number,
  height: number,
  isCoarsePointer = false
): ViewportProfile {
  const safeW = Number.isFinite(width) && width > 0 ? Math.round(width) : 1280;
  const safeH = Number.isFinite(height) && height > 0 ? Math.round(height) : 720;
  const aspectRatio = Number((safeW / safeH).toFixed(3));
  const orientation: ViewportOrientation = safeW >= safeH ? 'landscape' : 'portrait';

  let breakpoint: ViewportBreakpoint;
  if (safeW < 375) {
    breakpoint = 'xs';
  } else if (safeW < 480) {
    breakpoint = 'sm';
  } else if (safeW < 768) {
    breakpoint = 'md';
  } else if (safeW < 1024) {
    breakpoint = 'tablet';
  } else if (safeW < 1280) {
    breakpoint = 'laptop';
  } else if (safeW < 1536) {
    breakpoint = 'desktop';
  } else if (safeW < 1920) {
    breakpoint = 'large';
  } else {
    breakpoint = 'xl4k';
  }

  const isSmallMobile = safeW < 375;
  const isMobile = safeW < 768;
  const isTablet = safeW >= 768 && safeW < 1024;
  const isLaptop = safeW >= 1024 && safeW < 1440;
  const isDesktop = safeW >= 1280;
  const isUltrawide = safeW >= 2200 && aspectRatio >= 2.0;
  const is4K = safeW >= 2560 && safeH >= 1440;
  const isShortLandscape = orientation === 'landscape' && safeH <= 500;

  let recommendedGridCols: 1 | 2 | 3 | 4 = 1;
  if (safeW >= 1536) {
    recommendedGridCols = 4;
  } else if (safeW >= 1024) {
    recommendedGridCols = 3;
  } else if (safeW >= 640) {
    recommendedGridCols = 2;
  }

  return {
    width: safeW,
    height: safeH,
    aspectRatio,
    orientation,
    breakpoint,
    isSmallMobile,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isUltrawide,
    is4K,
    isShortLandscape,
    isCoarsePointer,
    recommendedGridCols,
  };
}

function readCurrentProfile(): ViewportProfile {
  if (typeof window === 'undefined') {
    return classifyViewport(1280, 720, false);
  }
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return classifyViewport(window.innerWidth, window.innerHeight, coarse);
}

export function useViewportProfile(): ViewportProfile {
  const [profile, setProfile] = useState<ViewportProfile>(readCurrentProfile);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId = 0;
    const sync = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const next = readCurrentProfile();
        setProfile((prev) =>
          prev.width === next.width &&
          prev.height === next.height &&
          prev.isCoarsePointer === next.isCoarsePointer
            ? prev
            : next
        );
      });
    };

    const pointerMq = window.matchMedia?.('(pointer: coarse)');
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', sync, { passive: true });
    pointerMq?.addEventListener?.('change', sync);

    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      pointerMq?.removeEventListener?.('change', sync);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return profile;
}
