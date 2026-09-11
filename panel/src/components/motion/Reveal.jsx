import React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "../../lib/utils";
import { EASE } from "../../lib/motion";

export { EASE } from "../../lib/motion";

const offset = {
  up: { y: 24 },
  down: { y: -24 },
  left: { x: 32 },
  right: { x: -32 },
  none: {},
};

/**
 * Fade + slide a block into view once.
 *
 * The admin runs shorter distances and durations than the marketing site:
 * this is a tool someone uses forty times a day, so motion has to clarify
 * arrival without ever making them wait on it.
 */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.45,
  className,
  as = "div",
}) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      initial={{ opacity: 0, ...offset[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Parent that sequences its <StaggerItem> children as they enter. */
export function Stagger({ children, className }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Headline that reveals word by word. Page titles only — the site's signature
 * text animation, kept for the one heading per screen that earns it.
 */
export function RevealText({ text, className, as: Tag = "h1", delay = 0 }) {
  const reduced = useReducedMotion();
  if (reduced) return <Tag className={cn("text-balance", className)}>{text}</Tag>;

  const words = String(text).split(" ");
  return (
    <Tag className={cn("text-balance", className)}>
      <motion.span
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: delay } } }}
        className="inline"
      >
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
            <motion.span
              variants={{
                hidden: { y: "100%", opacity: 0 },
                show: { y: "0%", opacity: 1, transition: { duration: 0.55, ease: EASE } },
              }}
              className="inline-block"
            >
              {word}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
