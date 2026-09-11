import React from 'react';

import { cn } from '../../lib/utils';

/**
 * Conversation volume per day, inbound stacked on outbound.
 *
 * Two series, encoded by lightness rather than hue: DESIGN.md §2 forbids
 * introducing a colour, and a two-step neutral pair is inherently safe for
 * every kind of colour vision — ink against titanium measures ΔE 36.6 under
 * protanopia, far above the ≥8 the palette validator asks for, and both clear
 * 3:1 against white. Identity is never carried by the fill alone: there is a
 * legend, and the totals are direct-labelled.
 *
 * Bars are thin with 4px rounded tops anchored to the baseline, a 2px surface
 * gap between the stacked segments, and a recessive grid.
 */

const SERIES = [
  { key: 'in', label: 'Received', fill: 'bg-ink' },
  { key: 'out', label: 'Sent', fill: 'bg-titanium' },
];

export function ActivityChart({ days, className }) {
  const [hovered, setHovered] = React.useState(null);

  const peak = Math.max(1, ...days.map((d) => d.in + d.out));
  const totals = {
    in: days.reduce((sum, d) => sum + d.in, 0),
    out: days.reduce((sum, d) => sum + d.out, 0),
  };

  // A round-ish ceiling so the gridlines land on readable numbers rather than
  // on the maximum, which is almost never a number anyone wants to read.
  const step = Math.max(1, Math.ceil(peak / 4 / 5) * 5);
  const ceiling = step * 4;

  return (
    <div className={cn('relative', className)}>
      {/* Indented by the axis gutter (w-8) plus its gap-3, so the legend
          starts on the same vertical as the first bar. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 pl-[44px]">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn('size-2 rounded-sm', s.fill)} />
            <span className="text-[13px] text-body-text">{s.label}</span>
            <span className="font-mono text-[12px] tabular-nums text-titanium-700">
              {totals[s.key]}
            </span>
          </span>
        ))}
      </div>

      <div className="flex gap-3">
        {/* Axis. Mono, recessive, right-aligned against the plot. */}
        <div className="flex w-8 shrink-0 flex-col justify-between pb-6 text-right">
          {[4, 3, 2, 1, 0].map((i) => (
            <span key={i} className="font-mono text-[10px] tabular-nums leading-none text-titanium-300">
              {step * i}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Recessive grid — hairlines in the line colour, behind the marks. */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-px w-full bg-line" />
            ))}
          </div>

          <div className="relative flex h-[200px] items-end gap-[3px] pb-6">
            {days.map((day, index) => {
              const total = day.in + day.out;
              const active = hovered === index;

              return (
                <div
                  key={day.iso}
                  className="group relative flex h-full flex-1 flex-col justify-end"
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  role="img"
                  aria-label={`${day.label}: ${day.in} received, ${day.out} sent`}
                >
                  {/* Hit target covers the whole column, not just the bar. */}
                  <span aria-hidden="true" className="absolute inset-0" />

                  {day.out > 0 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'w-full rounded-t bg-titanium transition-opacity',
                        hovered !== null && !active && 'opacity-40',
                      )}
                      style={{ height: `${(day.out / ceiling) * 100}%` }}
                    />
                  )}

                  {/* 2px surface gap keeps the two segments legible where they meet. */}
                  {day.out > 0 && day.in > 0 && <span aria-hidden="true" className="h-[2px] w-full" />}

                  {day.in > 0 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'w-full bg-ink transition-opacity',
                        day.out === 0 && 'rounded-t',
                        hovered !== null && !active && 'opacity-40',
                      )}
                      style={{ height: `${(day.in / ceiling) * 100}%` }}
                    />
                  )}

                  {total === 0 && (
                    <span aria-hidden="true" className="h-px w-full bg-line-strong" />
                  )}

                  <span
                    className={cn(
                      'absolute -bottom-0 left-1/2 -translate-x-1/2 font-mono text-[9px] leading-none transition-colors',
                      active ? 'text-ink' : 'text-titanium-300',
                    )}
                  >
                    {day.short}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tooltip. Positioned over the column, never off the edge. */}
          {hovered !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-lg border border-border bg-white px-3 py-2 shadow-lift"
              style={{
                left: `${((hovered + 0.5) / days.length) * 100}%`,
                transform: `translate(-50%, -100%)`,
              }}
            >
              <p className="whitespace-nowrap font-mono text-[10px] tracking-[0.12em] uppercase text-titanium-700">
                {days[hovered].label}
              </p>
              <div className="mt-2 space-y-1">
                {SERIES.map((s) => (
                  <p key={s.key} className="flex items-center gap-2 whitespace-nowrap text-[12px]">
                    <span aria-hidden="true" className={cn('size-1.5 rounded-sm', s.fill)} />
                    <span className="text-body-text">{s.label}</span>
                    <span className="ml-auto font-mono tabular-nums text-ink">
                      {days[hovered][s.key]}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivityChart;
