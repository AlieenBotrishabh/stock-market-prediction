import React, { useRef } from 'react';
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';

/**
 * ShinyText — Renders text with a continuously sweeping gradient shine.
 *
 * Props:
 *   text       — string to display
 *   baseColor  — base colour (default #64CEFB)
 *   shineColor — highlight colour (default #ffffff)
 *   speed      — animation duration in seconds (default 3)
 *   spread     — gradient angle in degrees (default 100)
 *   className  — additional Tailwind classes
 */
const ShinyText = ({
  text,
  baseColor = '#64CEFB',
  shineColor = '#ffffff',
  speed = 3,
  spread = 100,
  className = '',
}) => {
  const progress = useMotionValue(0);

  useAnimationFrame((t) => {
    // Oscillate 0 → 1 → 0 over `speed` seconds
    const cycle = (t / 1000 / speed) % 1;
    progress.set(cycle);
  });

  // Map progress 0→1 to backgroundPosition "-200%" → "200%"
  const bgPos = useTransform(progress, [0, 1], ['-200% center', '200% center']);

  const gradientStyle = {
    background: `linear-gradient(
      ${spread}deg,
      ${baseColor} 0%,
      ${baseColor} 35%,
      ${shineColor} 50%,
      ${baseColor} 65%,
      ${baseColor} 100%
    )`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    display: 'inline-block',
  };

  return (
    <motion.span
      style={{ ...gradientStyle, backgroundPosition: bgPos }}
      className={className}
    >
      {text}
    </motion.span>
  );
};

export default ShinyText;
