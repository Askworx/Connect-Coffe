import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "../../lib/utils";

/**
 * Segmented control. The active pill is a shared layout element, so switching
 * tabs slides the ink rather than cutting to it — motion that clarifies which
 * of the two you came from.
 */
function Tabs({ value, onValueChange, items, className, layoutId = "tab-pill" }) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-paper p-1",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "relative rounded-full px-4 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors",
              active ? "text-champagne-100" : "text-titanium-700 hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {item.label}
              {item.count != null && (
                <span className={cn("tabular-nums", active ? "text-champagne-600" : "text-titanium-300")}>
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { Tabs };
