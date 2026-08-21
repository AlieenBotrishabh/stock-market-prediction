import React, { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'framer-motion';

/**
 * A number that eases to its new value and flashes on change.
 *
 * This is the detail that makes a markets page feel live rather than
 * static. Direction of the flash is derived from the actual delta, so it
 * always tells the truth about which way the price moved.
 *
 * Respects prefers-reduced-motion: the value updates instantly and the
 * flash is suppressed.
 */
const AnimatedNumber = ({
  value,
  format = (v) => v.toFixed(2),
  className = '',
  flash = true,
  duration = 0.6,
}) => {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(typeof value === 'number' ? value : 0);
  const [display, setDisplay] = useState(
    typeof value === 'number' ? format(value) : value,
  );
  const [flashDir, setFlashDir] = useState(null);
  const previous = useRef(value);

  useEffect(() => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      setDisplay(value ?? '—');
      previous.current = value;
      return undefined;
    }

    const from = typeof previous.current === 'number' ? previous.current : value;

    if (flash && from !== value && Number.isFinite(from)) {
      setFlashDir(value > from ? 'up' : 'down');
      // Clear so the same direction can retrigger on the next tick.
      const t = setTimeout(() => setFlashDir(null), 900);
      previous.current = value;
      if (reduceMotion) {
        setDisplay(format(value));
        motionValue.set(value);
        return () => clearTimeout(t);
      }
      const controls = animate(motionValue, value, {
        duration,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => setDisplay(format(v)),
      });
      return () => { controls.stop(); clearTimeout(t); };
    }

    previous.current = value;
    if (reduceMotion) {
      setDisplay(format(value));
      motionValue.set(value);
      return undefined;
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
    // `format` is intentionally excluded: callers usually pass an inline
    // arrow, which would otherwise retrigger the animation every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, flash, duration, reduceMotion]);

  const flashClass =
    !flash || reduceMotion || !flashDir
      ? ''
      : flashDir === 'up'
        ? 'animate-flash-up'
        : 'animate-flash-down';

  return (
    <span className={`tabular-nums rounded px-0.5 ${flashClass} ${className}`}>
      {display}
    </span>
  );
};

export default AnimatedNumber;
