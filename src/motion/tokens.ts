// ====================================================================
// MAUSAM - Unified Motion Architecture Tokens & Pure Classifiers
// Single source of truth for timing, easing, spring physics, stagger,
// viewport thresholds, responsive motion scaling, and weather moods.
// ====================================================================

export const MOTION_DURATION = {
  FAST: 0.18,
  STANDARD: 0.36,
  EMPHASIS: 0.56,
  CINEMATIC: 0.9,
  AMBIENT: 10,
} as const;

export const MOTION_EASE = {
  FEEDBACK: [0.2, 0.8, 0.2, 1] as const,
  ENTRANCE: [0.16, 1, 0.3, 1] as const,
  CINEMATIC: [0.22, 1, 0.36, 1] as const,
  EXIT: [0.4, 0, 1, 1] as const,
};

export const MOTION_SPRING = {
  SNAPPY: { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.72 },
  TACTILE: { type: 'spring' as const, stiffness: 340, damping: 28, mass: 0.85 },
  GENTLE: { type: 'spring' as const, stiffness: 210, damping: 26, mass: 1 },
  INDICATOR: { type: 'spring' as const, stiffness: 480, damping: 36, mass: 0.65 },
  NEEDLE: { type: 'spring' as const, stiffness: 120, damping: 18, mass: 0.9 },
};

export const MOTION_STAGGER = {
  TIGHT: 0.035,
  STANDARD: 0.06,
  RELAXED: 0.09,
} as const;

export const MOTION_VIEWPORT = {
  once: true,
  amount: 0.12 as const,
};

export type MotionDeviceTier = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveMotionProfile {
  tier: MotionDeviceTier;
  reducedMotion: boolean;
  coarsePointer: boolean;
  allowParallax: boolean;
  allowMagnetic: boolean;
  allowHoverLift: boolean;
  ambientIntensity: 'full' | 'subtle' | 'static';
  durationScale: number;
  revealOffsetY: number;
}

export function getResponsiveMotionProfile(
  viewportWidth: number,
  reducedMotion: boolean,
  coarsePointer: boolean,
  displayProfile: 'standard' | 'projector' | 'tv' = 'standard'
): ResponsiveMotionProfile {
  const tier: MotionDeviceTier =
    viewportWidth >= 1024 ? 'desktop' : viewportWidth >= 640 ? 'tablet' : 'mobile';

  if (reducedMotion) {
    return {
      tier,
      reducedMotion: true,
      coarsePointer,
      allowParallax: false,
      allowMagnetic: false,
      allowHoverLift: false,
      ambientIntensity: 'static',
      durationScale: 0,
      revealOffsetY: 0,
    };
  }

  // Projector & Smart TV modes prioritize crisp readability and zero hover/parallax distraction
  if (displayProfile === 'projector' || displayProfile === 'tv') {
    return {
      tier: 'desktop',
      reducedMotion: false,
      coarsePointer: false,
      allowParallax: false,
      allowMagnetic: false,
      allowHoverLift: false,
      ambientIntensity: 'static',
      durationScale: 0.7,
      revealOffsetY: 8,
    };
  }

  if (tier === 'mobile') {
    return {
      tier,
      reducedMotion: false,
      coarsePointer,
      allowParallax: false,
      allowMagnetic: false,
      allowHoverLift: false,
      ambientIntensity: 'static',
      durationScale: 0.8,
      revealOffsetY: 12,
    };
  }

  if (tier === 'tablet') {
    return {
      tier,
      reducedMotion: false,
      coarsePointer,
      allowParallax: false,
      allowMagnetic: false,
      allowHoverLift: !coarsePointer,
      ambientIntensity: 'subtle',
      durationScale: 0.9,
      revealOffsetY: 16,
    };
  }

  return {
    tier: 'desktop',
    reducedMotion: false,
    coarsePointer,
    allowParallax: true,
    allowMagnetic: !coarsePointer,
    allowHoverLift: !coarsePointer,
    ambientIntensity: 'full',
    durationScale: 1,
    revealOffsetY: 20,
  };
}

export type WeatherAtmosphereMood =
  | 'CLEAR_DAY'
  | 'CLEAR_NIGHT'
  | 'CLOUDY'
  | 'RAIN'
  | 'THUNDERSTORM'
  | 'FOG'
  | 'SNOW';

/**
 * Pure classifier that maps any observed weather condition string + day/night flag
 * into a consistent atmospheric backdrop mood. Never fabricates data.
 */
export function classifyWeatherAtmosphere(
  condition?: string | null,
  isDay: boolean = true
): WeatherAtmosphereMood {
  const text = (condition || '').toLowerCase();
  if (/thunder|storm|lightning|squall|cyclone|gale/.test(text)) {
    return 'THUNDERSTORM';
  }
  if (/snow|sleet|blizzard|hail|ice|freezing/.test(text)) {
    return 'SNOW';
  }
  if (/rain|shower|drizzle|monsoon|downpour|wet/.test(text)) {
    return 'RAIN';
  }
  if (/fog|mist|haze|smoke|dust|smog/.test(text)) {
    return 'FOG';
  }
  if (/cloud|overcast|partly/.test(text)) {
    return 'CLOUDY';
  }
  return isDay ? 'CLEAR_DAY' : 'CLEAR_NIGHT';
}
