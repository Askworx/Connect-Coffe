import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Form labels are sentence case at a readable size. The mono / uppercase /
 * tracked treatment is the drawing-sheet register and belongs on table heads
 * and eyebrows (`.spec-label`), where text is scanned rather than read — a
 * 10px tracked capital is measurably slower to read, and a form is the one
 * place in the app where someone is reading in order to act.
 */
const Label = React.forwardRef(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-[13px] font-medium leading-none text-ink select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export { Label };
