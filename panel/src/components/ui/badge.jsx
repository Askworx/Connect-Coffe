import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

/**
 * Chips are `rounded-full`, mono, 10px, tracked and uppercase — the site's
 * tag treatment. Status variants use the admin status ramp (DESIGN.md §Status).
 *
 * The asymmetric left padding is deliberate. `letter-spacing` adds its space
 * AFTER every character including the last, so a tracked word carries an
 * invisible trailing gap. `justify-center` then centres the box *including*
 * that gap, which leaves the visible letters sitting left of centre — the
 * more tracking, the worse it reads. Adding the same amount back on the left
 * puts the glyphs, rather than the box, in the middle of the pill.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border pl-[calc(0.625rem+0.08em)] pr-2.5 py-0.5 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-white",
        secondary: "border-transparent bg-champagne-100 text-graphite-700",
        outline: "border-border bg-white text-titanium-700",
        muted: "border-border bg-paper text-titanium-700",
        success: "border-transparent bg-success-light text-success",
        warning: "border-transparent bg-warning-light text-warning",
        danger: "border-transparent bg-danger-light text-danger",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

function Badge({ className, variant, ...props }) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
