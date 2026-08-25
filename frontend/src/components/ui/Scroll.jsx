import React, { useRef } from 'react';
import {
  motion, useScroll, useTransform, useSpring, useMotionValue,
  useReducedMotion, useInView,
} from 'framer-motion';

/**
 * Scroll-driven animation primitives.
 *
 * All of these degrade to a plain static render under
 * prefers-reduced-motion — scroll-linked movement is the most common
 * trigger for motion sensitivity, so it is switched off wholesale rather
 * than merely shortened.
 *
 * They rely on framer-motion 12, already a dependency; no scroll library
 * is added.
 */

/** Shared easing — a soft decelerate that reads as "settling into place". */
export const EASE = [0.22, 1, 0.36, 1];

/**
 * Fade and lift into view as the element is scrolled to.
 *
 * `once` keeps it from re-animating when scrolling back up, which
 * otherwise feels twitchy on a long page.
 */
export const Reveal = ({
  children,
  delay = 0,
  y = 28,
  duration = 0.7,
  once = true,
  className = '',
  amount = 0.25,
}) => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Staggered container: children marked with `<Stagger.Item>` animate in
 * sequence as the group enters view.
 */
export const Stagger = ({
  children,
  className = '',
  stagger = 0.07,
  delay = 0,
  once = true,
  amount = 0.15,
}) => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
};

Stagger.Item = function StaggerItem({ children, className = '', y = 24 }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Parallax: moves at a different rate to the scroll, giving the section
 * depth. `speed` is the fraction of scroll distance to offset by —
 * negative moves against the scroll.
 */
export const Parallax = ({ children, speed = 0.15, className = '' }) => {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const raw = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
};

/**
 * A thin progress bar pinned to the top of the viewport showing how far
 * down the page you are.
 *
 * Progress is measured manually rather than with `useScroll()`. That hook
 * caches the scrollable height when it mounts, and this page mounts while
 * it is still only the hero — once quotes load the document grows from
 * ~500px to ~8,300px and the cached bounds are never recomputed, leaving
 * the bar pinned at zero. A ResizeObserver on the body keeps the bounds
 * correct as content streams in.
 */
export const ScrollProgress = ({ className = '' }) => {
  const reduceMotion = useReducedMotion();
  const barRef = useRef(null);

  React.useEffect(() => {
    if (reduceMotion) return undefined;
    const el = barRef.current;
    if (!el) return undefined;

    // The transform is written straight to the node inside a rAF rather
    // than routed through a motion value. Driving it through
    // useSpring(useMotionValue) did not propagate here — the bar stayed
    // pinned at scaleX(0) even with window.scrollY reporting correctly —
    // and a scroll indicator has to be exact, not merely animated.
    let frame = null;
    let current = 0;
    let target = 0;

    const measure = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      target = scrollable > 0
        ? Math.min(1, Math.max(0, window.scrollY / scrollable))
        : 0;
      if (frame == null) frame = requestAnimationFrame(tick);
    };

    // Light easing toward the target so the bar glides rather than snaps.
    const tick = () => {
      current += (target - current) * 0.18;
      if (Math.abs(target - current) < 0.0005) current = target;
      el.style.transform = `scaleX(${current})`;
      frame = current === target ? null : requestAnimationFrame(tick);
    };

    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);

    // The document keeps growing as sections load in, so the scrollable
    // height measured at mount is not the final one.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      observer.disconnect();
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div
      ref={barRef}
      style={{ transform: 'scaleX(0)' }}
      className={`fixed top-0 left-0 right-0 h-0.5 origin-left z-50 will-change-transform
                  bg-gradient-to-r from-accent-blue via-accent-green to-accent-blue ${className}`}
      aria-hidden="true"
    />
  );
};

/**
 * Counts up to `value` the first time it scrolls into view.
 * Used for headline statistics, where a number that assembles itself reads
 * as live rather than printed.
 */
export const CountUpOnView = ({
  value,
  format = (v) => Math.round(v).toLocaleString('en-IN'),
  duration = 1.4,
  className = '',
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = React.useState(reduceMotion ? format(value) : format(0));

  React.useEffect(() => {
    if (reduceMotion || !inView || typeof value !== 'number') {
      setDisplay(format(value));
      return undefined;
    }
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      // easeOutExpo — fast start, long settle.
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
      setDisplay(format(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, duration, reduceMotion]);

  return <span ref={ref} className={`tabular-nums ${className}`}>{display}</span>;
};

/** Section heading that wipes in from behind a mask as it enters view. */
export const MaskedHeading = ({ children, className = '', delay = 0 }) => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: '110%' }}
        whileInView={{ y: '0%' }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.8, delay, ease: EASE }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default {
  Reveal, Stagger, Parallax, ScrollProgress, CountUpOnView, MaskedHeading, EASE,
};
