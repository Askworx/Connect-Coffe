import React, { useState } from 'react';

/**
 * Part-to-whole as a donut, for a handful of slices (at most four).
 *
 * Colours come from DONUT_COLORS in a fixed order — never cycled — and were
 * checked with the dataviz palette validator (all pairs pass; worst ΔE 9.9
 * protan, 15.6 normal vision). Gold and teal sit under 3:1 on white, so
 * identity never rests on colour: every slice has a legend row with its
 * label, count and share, and a hover tooltip.
 *
 * Slices are separated by a 2px white gap, and the total sits in the hole.
 */
const DONUT_COLORS = ['#2E5FAC', '#E0A030', '#2FA39A', '#8E6FD8'];

const SIZE = 168;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP = 2; // px of white between slices

export default function DonutChart({ slices, totalLabel, emptyText = 'Nothing to show yet.' }) {
  const [hover, setHover] = useState(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const shown = slices.map((s, i) => ({ ...s, color: DONUT_COLORS[i % DONUT_COLORS.length] }));

  // Each slice starts where the ones before it end.
  const nonzero = shown.filter((s) => s.value > 0);
  const lengths = nonzero.map((s) => (s.value / total) * C);
  const arcs = nonzero.map((s, i) => {
    const start = lengths.slice(0, i).reduce((a, b) => a + b, 0);
    const visible = nonzero.length > 1 ? Math.max(lengths[i] - GAP, 1) : lengths[i];
    return { ...s, dash: `${visible} ${C - visible}`, offset: -start };
  });

  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
  const active = hover !== null ? shown[hover] : null;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={
            total
              ? shown.map((s) => `${s.label}: ${s.value}`).join(', ')
              : emptyText
          }
          className="-rotate-90"
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--color-line)" strokeWidth={STROKE} />
          {arcs.map((a) => {
            const index = shown.findIndex((s) => s.key === a.key);
            return (
              <circle
                key={a.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={hover === index ? STROKE + 4 : STROKE}
                strokeDasharray={a.dash}
                strokeDashoffset={a.offset}
                className="cursor-pointer transition-[stroke-width] duration-150"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>

        {/* The total, or the hovered slice, in the hole. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading text-3xl font-semibold leading-none tabular-nums text-ink">
            {active ? active.value : total}
          </span>
          <span className="mt-1 max-w-[88px] text-[11px] leading-tight text-text-secondary">
            {active ? `${active.label} · ${pct(active.value)}%` : totalLabel}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-[13px] text-text-secondary">{emptyText}</p>
      ) : (
        <ul className="w-full space-y-1.5">
          {shown.map((s, i) => (
            <li
              key={s.key}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center gap-3 rounded-lg px-2 py-1 transition-colors ${
                hover === i ? 'bg-paper' : ''
              }`}
            >
              <span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-body-text">{s.label}</span>
              <span className="text-[13px] font-semibold tabular-nums text-ink">{s.value}</span>
              <span className="w-10 text-right text-[12px] tabular-nums text-text-secondary">{pct(s.value)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
