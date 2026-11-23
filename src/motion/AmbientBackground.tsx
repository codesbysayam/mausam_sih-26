// ====================================================================
// MAUSAM - Weather-Reactive Atmospheric Ambient Backdrop
// Subtle, GPU-composited atmospheric gradients & restrained streaks
// keyed to live weather condition. Automatically pauses when hidden
// and degrades cleanly to a calm static tint on mobile / reduced-motion.
// ====================================================================

import React, { useMemo } from 'react';
import { classifyWeatherAtmosphere, WeatherAtmosphereMood } from './tokens';
import { useMausamMotion } from './MotionProvider';

interface AmbientBackgroundProps {
  condition?: string | null;
  isDay?: boolean;
  className?: string;
}

const MOOD_GRADIENTS: Record<WeatherAtmosphereMood, string> = {
  CLEAR_DAY:
    'radial-gradient(ellipse 70% 55% at 82% 8%, rgba(212, 168, 83, 0.14), transparent 65%), radial-gradient(ellipse 55% 45% at 15% 90%, rgba(56, 189, 248, 0.08), transparent 60%)',
  CLEAR_NIGHT:
    'radial-gradient(ellipse 65% 50% at 85% 12%, rgba(99, 102, 241, 0.14), transparent 65%), radial-gradient(ellipse 50% 40% at 18% 85%, rgba(56, 189, 248, 0.07), transparent 60%)',
  CLOUDY:
    'radial-gradient(ellipse 75% 55% at 70% 10%, rgba(148, 163, 184, 0.14), transparent 65%), radial-gradient(ellipse 55% 45% at 20% 80%, rgba(100, 116, 139, 0.10), transparent 60%)',
  RAIN:
    'radial-gradient(ellipse 75% 55% at 75% 10%, rgba(56, 189, 248, 0.15), transparent 65%), radial-gradient(ellipse 55% 45% at 22% 85%, rgba(14, 165, 233, 0.10), transparent 60%)',
  THUNDERSTORM:
    'radial-gradient(ellipse 75% 55% at 78% 12%, rgba(245, 158, 11, 0.14), transparent 62%), radial-gradient(ellipse 60% 45% at 20% 85%, rgba(99, 102, 241, 0.14), transparent 60%)',
  FOG:
    'radial-gradient(ellipse 85% 55% at 50% 25%, rgba(148, 163, 184, 0.16), transparent 70%), radial-gradient(ellipse 70% 45% at 50% 90%, rgba(203, 213, 225, 0.10), transparent 65%)',
  SNOW:
    'radial-gradient(ellipse 75% 55% at 75% 12%, rgba(186, 230, 253, 0.16), transparent 65%), radial-gradient(ellipse 60% 45% at 25% 85%, rgba(224, 242, 254, 0.10), transparent 60%)',
};

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  condition,
  isDay = true,
  className = '',
}) => {
  const { shouldAnimateAmbient, ambientIntensity } = useMausamMotion();

  const mood = useMemo(
    () => classifyWeatherAtmosphere(condition, isDay),
    [condition, isDay]
  );

  const showRainStreaks =
    shouldAnimateAmbient && (mood === 'RAIN' || mood === 'THUNDERSTORM');
  const showCloudDrift =
    shouldAnimateAmbient && (mood === 'CLOUDY' || mood === 'FOG' || mood === 'SNOW');
  const showSolarGlow =
    shouldAnimateAmbient && (mood === 'CLEAR_DAY' || mood === 'CLEAR_NIGHT');

  const streakCount = ambientIntensity === 'full' ? 10 : 5;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] z-0 ${className}`}
    >
      {/* Base condition-keyed atmospheric gradient */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ background: MOOD_GRADIENTS[mood] }}
      />

      {/* Subtle solar/lunar breathing aura */}
      {showSolarGlow && (
        <div className="mausam-ambient-aura absolute -top-20 -right-16 w-72 h-72 rounded-full opacity-45" />
      )}

      {/* Subtle drifting atmospheric veil for cloudy/fog/snow */}
      {showCloudDrift && (
        <div className="mausam-ambient-drift absolute inset-y-0 -left-1/4 w-[150%] opacity-30" />
      )}

      {/* Restrained compositor-only rain streaks */}
      {showRainStreaks && (
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: streakCount }).map((_, idx) => (
            <span
              key={idx}
              className="mausam-rain-streak absolute top-0 w-[1px] h-14 bg-gradient-to-b from-transparent via-[var(--m-accent)] to-transparent"
              style={{
                left: `${8 + idx * (86 / streakCount)}%`,
                animationDelay: `${(idx * 0.37) % 2.2}s`,
                animationDuration: `${1.3 + (idx % 3) * 0.35}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
