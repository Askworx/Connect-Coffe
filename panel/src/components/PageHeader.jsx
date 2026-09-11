import React from "react";

import { cn } from "../lib/utils";
import { Reveal, RevealText } from "./motion/Reveal";

/**
 * The admin's answer to the site's <SectionHeader>: eyebrow → title → intro,
 * with an optional action rail on the right.
 *
 * Carries two of the four signature elements DESIGN.md §5 asks for, because
 * this is the hero of every screen:
 *
 *   .grid-paper      the 34px measured drawing sheet, as an absolutely
 *                    positioned aria-hidden layer behind the hero, bleeding
 *                    to the edges of the working area and fading out before
 *                    it reaches the content below.
 *   .titanium-sheen  the brushed-metal gradient clipped to the h1. Available
 *                    behind `sheen`, but OFF by default: its lightest stop is
 *                    #8F887C, which reads as washed-out grey next to the solid
 *                    ink of every card title and table head on the same
 *                    screen. A console wants its headings dark. Pass
 *                    `sheen` to bring the gradient back on one page.
 *
 * The h1 is `.display-1`, per §3: that class is the page h1, one per page.
 * `.display-2` is a section h2 and belongs on the cards below.
 *
 * Never hand-roll a page heading. Everything a screen says about itself goes
 * through here, so the rhythm is the same on all fifteen and a new page
 * cannot quietly invent its own.
 */
export function PageHeader({ eyebrow, title, intro, action, className, children, sheen = false }) {
  return (
    <div className={cn("relative mb-10", className)}>
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-2xl">
          <Reveal duration={0.35}>
            <p className="eyebrow">{eyebrow}</p>
          </Reveal>

          <RevealText
            text={title}
            as="h1"
            className={cn("display-1 mt-3", sheen && "titanium-sheen")}
            delay={0.05}
          />

          {intro && (
            <Reveal delay={0.12} duration={0.4}>
              <p className="lead mt-4 max-w-[62ch]">{intro}</p>
            </Reveal>
          )}

          {children}
        </div>

        {action && (
          <Reveal delay={0.16} duration={0.4} className="flex shrink-0 flex-wrap items-center gap-3">
            {action}
          </Reveal>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
