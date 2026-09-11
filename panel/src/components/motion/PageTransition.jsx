import React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { EASE } from "../../lib/motion";

/**
 * Wraps a routed page so navigating settles rather than snaps. Short and
 * small on purpose — a page change should read as one movement, not a slide
 * show, and a reduced-motion visitor gets the final state immediately.
 */
export function PageTransition({ children, className }) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
