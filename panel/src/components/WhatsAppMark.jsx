import React from 'react';

import { cn } from '../lib/utils';

/**
 * The WhatsApp glyph.
 *
 * This console does one thing — run a WhatsApp bot — and nothing on screen said
 * so except the words. The mark is the fastest way to say which channel every
 * lead, callback and broadcast on these pages actually travels over.
 *
 * On colour: DESIGN.md §2 asks you to resist adding a brand green, and that
 * rule is about this product's own palette. WhatsApp's green is not ours — it
 * is an attribution mark for somebody else's platform, the way a "sign in with"
 * button carries the provider's colour. It appears at 16–20px, twice per
 * screen at most, and never as a surface, a status, or a data colour. Pass
 * `tone="mono"` where it sits inside our own type, so it reads as a glyph in
 * the sentence rather than a badge stuck onto it.
 *
 * It is decorative wherever a label already names WhatsApp, so it takes
 * aria-hidden by default; pass a `title` on the rare occasion it stands alone.
 */
export function WhatsAppMark({ className, tone = 'brand', title }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
      className={cn(
        'shrink-0',
        tone === 'brand' ? 'text-[#25D366]' : 'text-current',
        className,
      )}
      fill="currentColor"
    >
      {title && <title>{title}</title>}
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

export default WhatsAppMark;
