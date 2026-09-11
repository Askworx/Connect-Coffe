import * as React from "react";

import { cn } from "../../lib/utils";

const Input = React.forwardRef(function Input({ className, type, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-input bg-white px-3.5 py-2 text-sm text-ink transition-colors outline-none",
        "placeholder:text-muted-text",
        "focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/10 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60",
        "aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger/15",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        className,
      )}
      {...props}
    />
  );
});

export { Input };
