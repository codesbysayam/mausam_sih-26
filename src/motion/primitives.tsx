// ====================================================================
// MAUSAM - Core Motion Primitives
// Compositor-only (transform, opacity, clip-path), reduced-motion-safe,
// touch-friendly, zero-CLS reusable animation components.
// ====================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  AnimatePresence,
  HTMLMotionProps,
} from 'motion/react';
import {
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_SPRING,
  MOTION_STAGGER,
  MOTION_VIEWPORT,
} from './tokens';
import { useMausamMotion } from './MotionProvider';

/* --------------------------------------------------------------------
 * 1. PageTransition — Seamless route / workspace entry & exit wrapper
 * ------------------------------------------------------------------*/
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
  id,
}) => {
  const { reducedMotion, durationScale } = useMausamMotion();

  if (reducedMotion) {
    return (
      <div id={id} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        duration: MOTION_DURATION.STANDARD * durationScale,
        ease: MOTION_EASE.ENTRANCE,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* --------------------------------------------------------------------
 * 2. SectionReveal — Scroll-triggered section choreography
 * ------------------------------------------------------------------*/
interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}

export const SectionReveal: React.FC<SectionRevealProps> = ({
  children,
  className = '',
  delay = 0,
  id,
}) => {
  const { reducedMotion, durationScale, revealOffsetY } = useMausamMotion();

  if (reducedMotion) {
    return (
      <div id={id} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: revealOffsetY }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={MOTION_VIEWPORT}
      transition={{
        duration: MOTION_DURATION.EMPHASIS * durationScale,
        delay,
        ease: MOTION_EASE.ENTRANCE,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* --------------------------------------------------------------------
 * 3. TextReveal — Masked word-by-word editorial headline reveal
 * ------------------------------------------------------------------*/
interface TextRevealProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'p';
  className?: string;
  delay?: number;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  as = 'span',
  className = '',
  delay = 0,
}) => {
  const { reducedMotion, durationScale } = useMausamMotion();
  const Tag = as;

  if (reducedMotion || !text) {
    return <Tag className={className}>{text}</Tag>;
  }

  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block overflow-hidden align-bottom mr-[0.26em] last:mr-0"
          aria-hidden="true"
        >
          <motion.span
            className="inline-block"
            initial={{ y: '105%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              duration: MOTION_DURATION.STANDARD * durationScale,
              delay: delay + index * MOTION_STAGGER.TIGHT,
              ease: MOTION_EASE.CINEMATIC,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};

/* --------------------------------------------------------------------
 * 4. StaggerContainer & StaggerItem — Coordinated metric / card grids
 * ------------------------------------------------------------------*/
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  immediate?: boolean;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className = '',
  staggerDelay = MOTION_STAGGER.STANDARD,
  immediate = false,
}) => {
  const { reducedMotion, durationScale } = useMausamMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay * durationScale,
      },
    },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      {...(immediate
        ? { animate: 'visible' }
        : { whileInView: 'visible', viewport: MOTION_VIEWPORT })}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  className = '',
  interactive = false,
}) => {
  const { reducedMotion, allowHoverLift, durationScale } = useMausamMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: MOTION_DURATION.STANDARD * durationScale,
            ease: MOTION_EASE.ENTRANCE,
          },
        },
      }}
      whileHover={interactive && allowHoverLift ? { y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={MOTION_SPRING.TACTILE}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* --------------------------------------------------------------------
 * 5. ParallaxLayer — Desktop-only scroll-linked depth offset
 * ------------------------------------------------------------------*/
interface ParallaxLayerProps {
  children: React.ReactNode;
  className?: string;
  distance?: number;
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  className = '',
  distance = 24,
}) => {
  const { allowParallax } = useMausamMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  if (!allowParallax) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
};

/* --------------------------------------------------------------------
 * 6. MagneticButton — Subtle desktop cursor affinity + tactile press
 *    Never degrades touch ergonomics or button click accuracy.
 * ------------------------------------------------------------------*/
interface MagneticButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  strength?: number;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  strength = 4,
  className = '',
  onMouseMove,
  onMouseLeave,
  disabled,
  ...rest
}) => {
  const { allowMagnetic, reducedMotion } = useMausamMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseMove?.(e);
    if (!allowMagnetic || disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setOffset({
      x: Math.max(-strength, Math.min(strength, relX * strength)),
      y: Math.max(-strength, Math.min(strength, relY * strength)),
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(e);
    if (offset.x !== 0 || offset.y !== 0) {
      setOffset({ x: 0, y: 0 });
    }
  };

  return (
    <motion.button
      {...rest}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={reducedMotion ? undefined : { x: offset.x, y: offset.y }}
      whileTap={reducedMotion || disabled ? undefined : { scale: 0.97 }}
      transition={MOTION_SPRING.SNAPPY}
      className={className}
    >
      {children}
    </motion.button>
  );
};

/* --------------------------------------------------------------------
 * 7. AnimatedCounter — Smooth rAF number interpolation for telemetry
 *    Strictly preserves 0 vs null/undefined (never fabricates readings).
 * ------------------------------------------------------------------*/
interface AnimatedCounterProps {
  value: number | null | undefined;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  unavailableText?: string;
  durationMs?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
  unavailableText = '—',
  durationMs = 420,
  className = '',
}) => {
  const { reducedMotion } = useMausamMotion();
  const isValid = typeof value === 'number' && Number.isFinite(value);
  const [displayValue, setDisplayValue] = useState<number | null>(isValid ? value : null);
  const prevValueRef = useRef<number | null>(isValid ? value : null);

  useEffect(() => {
    if (!isValid) {
      prevValueRef.current = null;
      setDisplayValue(null);
      return;
    }

    const from = prevValueRef.current;
    const to = value as number;

    if (reducedMotion || from === null || from === to) {
      prevValueRef.current = to;
      setDisplayValue(to);
      return;
    }

    let frameId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      } else {
        prevValueRef.current = to;
        setDisplayValue(to);
      }
    };

    frameId = window.requestAnimationFrame(step);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      prevValueRef.current = to;
    };
  }, [value, isValid, reducedMotion, durationMs]);

  if (!isValid || displayValue === null) {
    return <span className={`tabular-nums ${className}`}>{unavailableText}</span>;
  }

  const formatted =
    decimals > 0 ? displayValue.toFixed(decimals) : String(Math.round(displayValue));

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

/* --------------------------------------------------------------------
 * 8. ImageReveal — Smooth clip-path & settle reveal for media/maps
 * ------------------------------------------------------------------*/
interface ImageRevealProps {
  children: React.ReactNode;
  className?: string;
}

export const ImageReveal: React.FC<ImageRevealProps> = ({ children, className = '' }) => {
  const { reducedMotion, durationScale } = useMausamMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={MOTION_VIEWPORT}
      transition={{
        duration: MOTION_DURATION.EMPHASIS * durationScale,
        ease: MOTION_EASE.CINEMATIC,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* --------------------------------------------------------------------
 * 9. ScrollProgress — Precision hairline reading progress indicator
 * ------------------------------------------------------------------*/
export const ScrollProgress: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { reducedMotion } = useMausamMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 34,
    restDelta: 0.001,
  });

  if (reducedMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX, transformOrigin: '0% 50%' }}
      className={`fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none bg-[var(--m-accent)] opacity-85 ${className}`}
    />
  );
};

/* --------------------------------------------------------------------
 * 10. WeatherTransition — Smooth state crossfade on location/data switch
 * ------------------------------------------------------------------*/
interface WeatherTransitionProps {
  transitionKey: string | number;
  children: React.ReactNode;
  className?: string;
}

export const WeatherTransition: React.FC<WeatherTransitionProps> = ({
  transitionKey,
  children,
  className = '',
}) => {
  const { reducedMotion, durationScale } = useMausamMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{
          duration: MOTION_DURATION.FAST * durationScale,
          ease: MOTION_EASE.FEEDBACK,
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
