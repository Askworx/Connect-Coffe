import React from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts a metric up to its value once, the first time the tile is seen.
 *
 * The number is rendered as text, not as an animated node, so the final value
 * is what a screen reader announces and what a reduced-motion visitor sees
 * immediately — the animation is decoration over a value that is always there.
 */
export function CountUp({ value, duration = 0.9, className }) {
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const target = Number(value) || 0;
  const [display, setDisplay] = React.useState(reduced ? target : 0);

  React.useEffect(() => {
    if (reduced || !inView) {
      setDisplay(target);
      return undefined;
    }
    const controls = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, target, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
    </span>
  );
}
