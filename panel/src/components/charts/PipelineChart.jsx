import React from 'react';

import { cn } from '../../lib/utils';

/**
 * Where every lead currently stands, as one horizontal stacked bar.
 *
 * One bar rather than four tiles, because the question is a share question —
 * "how much of the pipeline is still untouched?" — and a share is read off a
 * length, not off four numbers the reader has to divide in their head.
 *
 * Colour is the status vocabulary from `lib/leadStatus.js`, ordered by stage
 * rather than by size, so the bar always reads left-to-right in the order a
 * lead actually moves. Adjacent stages clear ΔE 27.8 in normal vision and 27.3
 * under deuteranopia (validated), and the champagne segment sits below 3:1
 * against the card — so identity is never carried by the fill: every stage is
 * direct-labelled beneath the bar with its own count and share.
 */

export function PipelineChart({ stages, className }) {
  const [hovered, setHovered] = React.useState(null);

  const total = stages.reduce((sum, s) => sum + s.count, 0);

  if (total === 0) {
    return (
      <div className={cn('py-10 text-center', className)}>
        <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
          No leads yet
        </p>
        <p className="mx-auto mt-2 max-w-[38ch] text-[13px] leading-relaxed text-text-secondary">
          Leads appear here automatically when someone asks for a quotation or a
          call through the WhatsApp bot. Nothing needs to be entered by hand.
        </p>
      </div>
    );
  }

  const share = (count) => Math.round((count / total) * 100);

  return (
    <div className={cn('relative', className)}>
      {/* The bar. Segments are separated by a 2px surface gap so two stages
          never bleed into one another, and the light champagne segment carries
          a hairline so it stays visible against the white card. */}
      <div className="flex h-9 w-full gap-[2px] overflow-hidden rounded">
        {stages.map((stage, index) => {
          if (stage.count === 0) return null;
          const active = hovered === index;

          return (
            <button
              key={stage.key}
              type="button"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              onClick={stage.onClick}
              aria-label={`${stage.label}: ${stage.count} of ${total} leads`}
              className={cn(
                'relative h-full min-w-[6px] rounded-[3px] transition-opacity duration-300',
                stage.needsOutline && 'ring-1 ring-inset ring-border-strong',
                hovered !== null && !active && 'opacity-40',
              )}
              style={{ flexBasis: `${(stage.count / total) * 100}%` }}
            >
              <span aria-hidden="true" className={cn('absolute inset-0 rounded-[3px]', stage.fill)} />
            </button>
          );
        })}
      </div>

      {/* Direct labels. Every stage is listed whether or not it has a segment —
          a stage sitting at zero is information, not an absence. */}
      <ul className="mt-5 divide-y divide-border border-t border-border">
        {stages.map((stage, index) => (
          <li
            key={stage.key}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              'flex items-baseline gap-3 py-3 transition-opacity duration-300',
              hovered !== null && hovered !== index && 'opacity-50',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-2 shrink-0 translate-y-[-1px] rounded-sm',
                stage.fill,
                stage.needsOutline && 'ring-1 ring-inset ring-border-strong',
              )}
            />

            <span className="min-w-0 flex-1">
              <span className="text-[13px] font-medium text-ink">{stage.label}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-text-secondary">
                {stage.description}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="font-mono text-[13px] tabular-nums text-ink">{stage.count}</span>
              <span className="ml-2 font-mono text-[11px] tabular-nums text-titanium-700">
                {share(stage.count)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PipelineChart;
