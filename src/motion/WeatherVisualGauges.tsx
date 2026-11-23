// ====================================================================
// MAUSAM - Animated Meteorological Instrumentation Gauges
// Honest, data-driven visual widgets (Humidity Ring, Wind Compass,
// Diurnal Sun Arc, AQI Arc & Pollutant Bars, UV Scale).
// Strictly preserves null/undefined as unavailable (never fabricates).
// ====================================================================

import React from 'react';
import { motion } from 'motion/react';
import { MOTION_EASE, MOTION_SPRING } from './tokens';
import { useMausamMotion } from './MotionProvider';
import { AnimatedCounter } from './primitives';

const isValidNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const CARDINAL_TO_DEG: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

export function resolveWindDegrees(direction?: string | null, degrees?: number | null): number | null {
  if (isValidNum(degrees)) return ((degrees % 360) + 360) % 360;
  if (!direction) return null;
  const clean = direction.trim().toUpperCase();
  if (clean in CARDINAL_TO_DEG) return CARDINAL_TO_DEG[clean];
  return null;
}

/* --------------------------------------------------------------------
 * 1. HumidityRingGauge — Circular animated SVG moisture ring
 * ------------------------------------------------------------------*/
export const HumidityRingGauge: React.FC<{
  humidity: number | null | undefined;
  size?: number;
}> = ({ humidity, size = 44 }) => {
  const { reducedMotion } = useMausamMotion();
  const valid = isValidNum(humidity);
  const clamped = valid ? Math.max(0, Math.min(100, humidity)) : 0;
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--m-border-strong)"
        strokeWidth="3"
      />
      {valid && (
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--weather-rain, var(--m-accent))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reducedMotion ? { strokeDashoffset: dashOffset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.7, ease: MOTION_EASE.ENTRANCE }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
};

/* --------------------------------------------------------------------
 * 2. WindCompassNeedle — Smooth spring-rotated wind bearing indicator
 * ------------------------------------------------------------------*/
export const WindCompassNeedle: React.FC<{
  direction?: string | null;
  degrees?: number | null;
  size?: number;
}> = ({ direction, degrees, size = 44 }) => {
  const { reducedMotion } = useMausamMotion();
  const resolvedDeg = resolveWindDegrees(direction, degrees);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx="22"
        cy="22"
        r="19"
        fill="none"
        stroke="var(--m-border-strong)"
        strokeWidth="1.5"
      />
      <text
        x="22"
        y="9"
        textAnchor="middle"
        fontSize="6.5"
        fill="var(--m-text-muted)"
        fontFamily="var(--font-mono)"
      >
        N
      </text>
      {resolvedDeg !== null ? (
        <motion.g
          style={{ originX: '22px', originY: '22px' }}
          initial={reducedMotion ? { rotate: resolvedDeg } : { rotate: 0 }}
          animate={{ rotate: resolvedDeg }}
          transition={MOTION_SPRING.NEEDLE}
        >
          <polygon points="22,11 25,24 22,21 19,24" fill="var(--weather-wind, var(--m-accent))" />
          <circle cx="22" cy="22" r="2.2" fill="var(--m-text-primary)" />
        </motion.g>
      ) : (
        <circle cx="22" cy="22" r="2.2" fill="var(--m-text-muted)" />
      )}
    </svg>
  );
};

/* --------------------------------------------------------------------
 * 3. AqiMeterArc — Semi-circular AQI dial with honest null handling
 * ------------------------------------------------------------------*/
export const AqiMeterArc: React.FC<{
  aqi: number | null | undefined;
  maxScale?: number;
}> = ({ aqi, maxScale = 500 }) => {
  const { reducedMotion } = useMausamMotion();
  const valid = isValidNum(aqi);
  const ratio = valid ? Math.max(0, Math.min(1, aqi / maxScale)) : 0;

  const strokeColor =
    !valid
      ? 'var(--m-border-strong)'
      : aqi <= 50
      ? 'var(--m-ok)'
      : aqi <= 100
      ? 'var(--m-watch)'
      : aqi <= 150
      ? 'var(--m-alert)'
      : 'var(--m-danger)';

  // Arc length for radius 48 semi-circle ≈ 150.8
  const arcLength = Math.PI * 48;
  const dashOffset = arcLength * (1 - ratio);

  return (
    <div className="relative flex flex-col items-center">
      <svg width="124" height="72" viewBox="0 0 124 72" aria-hidden="true">
        <path
          d="M 14 62 A 48 48 0 0 1 110 62"
          fill="none"
          stroke="var(--m-border-strong)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {valid && (
          <motion.path
            d="M 14 62 A 48 48 0 0 1 110 62"
            fill="none"
            stroke={strokeColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            initial={reducedMotion ? { strokeDashoffset: dashOffset } : { strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.75, ease: MOTION_EASE.CINEMATIC }}
          />
        )}
      </svg>
      <div className="-mt-7 text-center font-mono tabular-nums">
        <AnimatedCounter
          value={valid ? Math.round(aqi) : null}
          unavailableText="—"
          className="text-2xl font-bold text-[var(--m-text-primary)]"
        />
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------
 * 4. AnimatedMetricBar — Smooth scaleX horizontal indicator bar
 *    Uses transform: scaleX (compositor-only, zero layout thrash)
 * ------------------------------------------------------------------*/
export const AnimatedMetricBar: React.FC<{
  ratio: number | null;
  colorClass?: string;
  heightClass?: string;
}> = ({ ratio, colorClass = 'bg-[var(--m-accent)]', heightClass = 'h-1.5' }) => {
  const { reducedMotion } = useMausamMotion();
  const clamped = ratio !== null && Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;

  return (
    <div
      className={`w-full ${heightClass} rounded-full overflow-hidden bg-[var(--m-surface-3)] border border-[var(--m-border)]`}
      aria-hidden="true"
    >
      <motion.div
        className={`h-full w-full origin-left rounded-full ${colorClass}`}
        initial={reducedMotion ? { scaleX: clamped } : { scaleX: 0 }}
        whileInView={{ scaleX: clamped }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.65, ease: MOTION_EASE.ENTRANCE }}
      />
    </div>
  );
};
