import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "../../lib/utils";

/**
 * A native <select> wearing the Input's clothes. Native is deliberate: admin
 * filters get used with a keyboard all day, and the platform control is the
 * one every operator already knows.
 */
const Select = React.forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        data-slot="select"
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-input bg-white pl-3.5 pr-9 text-sm text-ink transition-colors outline-none",
          "focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/10 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-titanium-700"
      />
    </div>
  );
});

export { Select };
