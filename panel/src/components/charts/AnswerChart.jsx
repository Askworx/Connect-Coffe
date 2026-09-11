import React from 'react';

import { cn } from '../../lib/utils';

/**
 * What people chose on a quiz, one row per option.
 *
 * Two categories, not three: the correct option and the rest. That is the only
 * distinction anybody reads a quiz result for, and it keeps the palette to a
 * validated pair — success #4A6A4E against ink #1C1A17 separates by ΔE 27.8 in
 * normal vision and 27.3 under deuteranopia. Colour never carries it alone:
 * the correct row is named "Correct answer" in words and every bar is
 * direct-labelled with its count and share.
 */

export function AnswerChart({ options, total, correctAnswer, className }) {
  if (!total) return null;

  return (
    <ul className={cn('space-y-3', className)}>
      {options.map((option) => {
        const isCorrect = option.key === correctAnswer;
        const pct = Math.round((option.count / total) * 100);

        return (
          <li key={option.key}>
            <div className="flex items-baseline justify-between gap-4">
              <p className="min-w-0 text-[13px] text-body-text">
                <span className="font-mono text-[11px] tracking-[0.12em] text-titanium-700">
                  {option.key}
                </span>
                <span className="ml-2 text-ink">{option.label}</span>
                {isCorrect && (
                  <span className="ml-2 font-mono text-[10px] tracking-[0.12em] uppercase text-success">
                    Correct answer
                  </span>
                )}
              </p>
              <p className="shrink-0 font-mono text-[12px] tabular-nums text-titanium-700">
                <span className="text-ink">{option.count}</span> · {pct}%
              </p>
            </div>

            {/* 6px track, 4px rounded ends, recessive ground. A zero-count
                option keeps its track so the row still reads as an option
                rather than disappearing. */}
            <div
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line"
            >
              <div
                className={cn('h-full rounded-full', isCorrect ? 'bg-success' : 'bg-ink')}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default AnswerChart;
