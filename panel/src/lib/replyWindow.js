/**
 * WhatsApp's 24-hour reply window.
 *
 * The bot can send an ordinary message — a reply, a poster, a quiz — only to
 * someone who has messaged it in the last 24 hours, and inside that window it
 * costs nothing. Outside it Meta rejects anything that is not a paid, approved
 * template. The server applies the same rule when it sends (it matches phones
 * on their last ten digits); this is the panel's reading of it, from each
 * contact's `last_incoming_at`.
 */
export const WINDOW_MS = 24 * 60 * 60 * 1000;

const toTime = (value) => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

/** The later of several timestamps, ignoring empty ones. */
export const latest = (...values) => {
  const times = values.map(toTime).filter((t) => t !== null);
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
};

export const isInWindow = (lastIncomingAt, now = Date.now()) => {
  const t = toTime(lastIncomingAt);
  return t !== null && now - t < WINDOW_MS;
};

const formatRemaining = (ms) => {
  const minutes = Math.max(1, Math.floor(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

/**
 * What to tell the operator about one contact: whether a reply will go
 * through, and for how much longer.
 */
export const describeWindow = (lastIncomingAt, now = Date.now()) => {
  const t = toTime(lastIncomingAt);
  if (t === null) {
    return { open: false, label: 'Has not messaged yet — they need to message first' };
  }
  const remaining = t + WINDOW_MS - now;
  if (remaining <= 0) {
    return { open: false, label: 'Reply window closed — they need to message first' };
  }
  return { open: true, label: `Free to reply for ${formatRemaining(remaining)}` };
};
