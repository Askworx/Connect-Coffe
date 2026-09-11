import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

/**
 * Ported from the marketing site. Primary is ink on white — this system's
 * emphatic colour is darkness, not a brand hue. Pills (`rounded-full`) are
 * reserved for the site's marketing CTAs; the admin uses the rounded-lg cut
 * so a dense toolbar does not read as a row of lozenges.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-hover active:translate-y-px",
        outline:
          "border-line-strong bg-white text-ink hover:border-ink hover:bg-paper active:translate-y-px",
        secondary:
          "bg-champagne-100 text-graphite-700 hover:bg-champagne active:translate-y-px",
        ghost: "text-body-text hover:bg-paper hover:text-ink",
        destructive: "bg-danger text-white hover:bg-danger/90 active:translate-y-px",
        "destructive-outline":
          "border-danger/30 bg-white text-danger hover:bg-danger-light hover:border-danger/60",
        success: "bg-success text-white hover:bg-success/90 active:translate-y-px",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-9 px-4 text-[13px]",
        xs: "h-8 px-3 text-[12px]",
        lg: "h-12 px-7 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-xs": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

export { Button, buttonVariants };
