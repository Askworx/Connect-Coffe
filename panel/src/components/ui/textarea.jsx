import * as React from "react";

import { cn } from "../../lib/utils";

const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-lg border border-input bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink transition-colors outline-none",
        "placeholder:text-muted-text",
        "focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/10 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60",
        "aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger/15",
        className,
      )}
      {...props}
    />
  );
});

export { Textarea };
