import React from 'react';

import { cn } from '../lib/utils';

/**
 * Renders a message the way WhatsApp will.
 *
 * These templates are edited in a plain textarea, so `*bold*` looks like
 * asterisks and a wall of text looks like a wall of text — you cannot tell
 * what the customer actually receives until it has already been sent. This
 * shows it: WhatsApp's four formatting marks, real line breaks, the emoji at
 * their rendered size, and the placeholders filled in with example values.
 *
 * The bubble is drawn in this system's palette rather than WhatsApp's green.
 * What has to be faithful is the CONTENT — where the bold falls, how long the
 * message runs, how many line breaks it carries. Importing another product's
 * brand colour into a panel governed by DESIGN.md §2 would buy nothing.
 */

// WhatsApp's four marks. Order matters: monospace is fenced and must be
// pulled out before the single-character marks can run inside it.
const RULES = [
  { pattern: /```([\s\S]+?)```/g, render: (text, key) => <code key={key} className="rounded bg-line/60 px-1 py-0.5 font-mono text-[12px]">{text}</code> },
  { pattern: /\*([^*\n]+)\*/g, render: (text, key) => <strong key={key} className="font-semibold text-ink">{text}</strong> },
  { pattern: /_([^_\n]+)_/g, render: (text, key) => <em key={key}>{text}</em> },
  { pattern: /~([^~\n]+)~/g, render: (text, key) => <s key={key} className="text-muted-text">{text}</s> },
];

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

function formatSegment(text, keyPrefix) {
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    const match = rule.pattern.exec(text);
    if (!match) continue;

    const before = text.slice(0, match.index);
    const after = text.slice(match.index + match[0].length);

    return [
      ...formatSegment(before, `${keyPrefix}b`),
      rule.render(match[1], `${keyPrefix}m`),
      ...formatSegment(after, `${keyPrefix}a`),
    ];
  }

  // Placeholders are shown filled in, and marked, so it is obvious which part
  // of the sentence is substituted at send time.
  const nodes = [];
  let last = 0;
  let match;
  PLACEHOLDER.lastIndex = 0;
  while ((match = PLACEHOLDER.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <span
        key={`${keyPrefix}p${match.index}`}
        title={`Replaced with the real ${match[1]} when sent`}
        className="rounded bg-champagne-100 px-1 font-medium text-ink"
      >
        {SAMPLE[match[1]] || match[1]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const SAMPLE = {
  name: 'Sandeep',
  company: 'Connect Speciality Coffee Roasters',
  phone: '+91 98765 43210',
  booking: '👤 Priya\n📅 Table · Saturday 14 Sep · 6 PM · 4 people',
};

export function WhatsAppPreview({
  message,
  caption,
  image,
  buttons = [],
  className,
  empty = 'Nothing to preview yet.',
}) {
  const text = (message || '').trim();
  const labels = buttons.map((b) => (b.title || '').trim()).filter(Boolean);

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-paper', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="spec-label">As the customer sees it</p>
        {text && (
          <p className="font-mono text-[10px] tabular-nums text-titanium-700">
            {text.length} chars · {text.split('\n').length} lines
          </p>
        )}
      </div>

      <div className="p-4">
        {text || image ? (
          <div className="max-w-[420px]">
          <div className="overflow-hidden rounded-xl rounded-tl-sm border border-border bg-white shadow-card">
            {image && (
              <img
                src={image}
                alt=""
                className="aspect-[4/3] w-full bg-paper object-cover"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden';
                }}
              />
            )}
            <div className="px-3.5 py-2.5">
            <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.55] text-body-text">
              {text.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {formatSegment(line, `l${i}`)}
                </React.Fragment>
              ))}
            </p>
            {caption && (
              <p className="mt-2 border-t border-border pt-2 text-[12px] text-text-secondary">
                {caption}
              </p>
            )}
            </div>
          </div>
          {/* Reply buttons sit under the bubble, as WhatsApp draws them. */}
          {labels.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {labels.map((label, i) => (
                <span
                  key={i}
                  className="rounded-lg border border-border bg-white py-2 text-center text-[13px] font-medium text-primary shadow-card"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          </div>
        ) : (
          <p className="text-[13px] italic text-muted-text">{empty}</p>
        )}
      </div>
    </div>
  );
}

/** The four marks WhatsApp understands, shown where someone is writing one. */
export function FormattingHint() {
  return (
    <p className="text-[12px] leading-relaxed text-text-secondary">
      WhatsApp formatting: <code className="font-mono text-ink">*bold*</code>,{' '}
      <code className="font-mono text-ink">_italic_</code>,{' '}
      <code className="font-mono text-ink">~strikethrough~</code>,{' '}
      <code className="font-mono text-ink">```monospace```</code>. A blank line
      starts a new paragraph.
    </p>
  );
}

export default WhatsAppPreview;
