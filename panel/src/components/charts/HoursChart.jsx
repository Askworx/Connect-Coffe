import React from 'react';

import { cn } from '../../lib/utils';

/**
 * What time of day people message the bot, over the same window as the volume
 * chart. One series, so no legend — the card title names it.
 *
 * Twenty-four thin bars rather than four "morning / afternoon" blocks: the
 * useful answer here is "calls start at 10 and stop at 7", which a four-bucket
 * chart cannot say. Hours are labelled every six, so the axis stays readable
 * at a narrow card width.
 */

const AXIS_HOURS = [0, 6, 12, 18];

const formatHour = (hour) => {
  const suffix = hour < 12 ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}${suffix}`;
};

export function HoursChart({ hours, className }) {
  const [hovered, setHovered] = React.useState(null);

  const peak = Math.max(1, ...hours.map((h) => h.count));
  const total = hours.reduce((sum, h) => sum + h.count, 0);

  // The busiest stretch, stated in words. A distribution is worth reading only
  // if somebody can act on it, and the action here is "staff those hours".
  const busiest = hours.reduce(
    (best, h, index) => (h.count > hours[best].count ? index : best),
    0,
  );

  return (
    <div className={cn('relative', className)}>
      <p className="mb-5 text-[13px] leading-relaxed text-text-secondary">
        {total === 0
          ? 'No messages in this window yet.'
          : `Busiest around ${formatHour(busiest)} — ${hours[busiest].count} of ${total} messages.`}
      </p>

      <div className="relative">
        {/* Recessive baseline only. A full grid behind 24 thin bars is noise. */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-6 h-px bg-line" />

        <div className="relative flex h-[120px] items-end gap-[2px] pb-6">
          {hours.map((hour, index) => {
            const active = hovered === index;

            return (
              <div
                key={hour.hour}
                className="group relative flex h-full flex-1 flex-col justify-end"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="img"
                aria-label={`${formatHour(hour.hour)}: ${hour.count} ${
                  hour.count === 1 ? 'message' : 'messages'
                }`}
              >
                {/* Hit target covers the column, not just the bar. */}
                <span aria-hidden="true" className="absolute inset-0" />

                {hour.count > 0 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'w-full rounded-t bg-ink transition-opacity',
                      hovered !== null && !active && 'opacity-40',
                    )}
                    style={{ height: `${(hour.count / peak) * 100}%` }}
                  />
                ) : (
                  <span aria-hidden="true" className="h-px w-full bg-line-strong" />
                )}

                {AXIS_HOURS.includes(hour.hour) && (
                  <span
                    className={cn(
                      'absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] leading-none transition-colors',
                      active ? 'text-ink' : 'text-titanium-300',
                    )}
                  >
                    {formatHour(hour.hour)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {hovered !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 rounded-lg border border-border bg-white px-3 py-2 shadow-lift"
            style={{
              left: `${((hovered + 0.5) / hours.length) * 100}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="whitespace-nowrap font-mono text-[10px] tracking-[0.12em] uppercase text-titanium-700">
              {formatHour(hours[hovered].hour)}–{formatHour((hours[hovered].hour + 1) % 24)}
            </p>
            <p className="mt-1 whitespace-nowrap text-[12px] text-body-text">
              <span className="font-mono tabular-nums text-ink">{hours[hovered].count}</span>{' '}
              {hours[hovered].count === 1 ? 'message' : 'messages'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HoursChart;
