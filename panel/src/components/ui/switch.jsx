import * as React from "react";

import { cn } from "../../lib/utils";

function Switch({ checked, onCheckedChange, disabled, className, id, ...props }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-ink" : "bg-line-strong",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block size-4.5 rounded-full bg-white shadow-sm transition-transform duration-300",
          checked ? "translate-x-[22px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

export { Switch };
