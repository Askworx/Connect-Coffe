/**
 * Broadcast status vocabulary — the single definition for the whole app.
 *
 * The keys are the ones the server actually writes: `campaigns.status` defaults
 * to 'scheduled', the scheduler claims a due row as 'sending' before it sends a
 * single message, marks it 'sent' afterwards, and cancelling sets 'cancelled'. Anything else is a row the bot will never send, so it gets
 * a fallback that says so rather than an empty badge — the page previously
 * rendered a status it did not recognise as no badge at all, which read as a
 * styling bug rather than as the data problem it was.
 */
export const BROADCAST_STATUS = {
  scheduled: {
    label: 'Scheduled',
    badge: 'warning',
    dot: 'bg-warning',
    description: 'Waiting to go out. It can still be cancelled.',
  },
  sending: {
    label: 'Sending',
    badge: 'default',
    dot: 'bg-champagne',
    description:
      'Going out to contacts right now. It can no longer be cancelled. A broadcast stuck here means the server stopped mid-send.',
  },
  sent: {
    label: 'Sent',
    badge: 'success',
    dot: 'bg-success',
    description: 'Already delivered. It cannot be recalled.',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'danger',
    dot: 'bg-danger',
    description: 'Stopped before it went out. Nobody received it.',
  },
};

export const UNRECOGNISED_STATUS = {
  label: 'Not recognised',
  badge: 'muted',
  dot: 'bg-titanium-300',
  description:
    'This broadcast carries a status the bot does not act on, so it will never be sent. Cancel it and schedule it again.',
};

export const getBroadcastStatus = (status) => BROADCAST_STATUS[status] || UNRECOGNISED_STATUS;

export const BROADCAST_TYPES = {
  quiz: {
    label: 'Quiz',
    summary: 'A question with three options. Replies are counted and scored.',
  },
  poster: {
    label: 'Poster',
    summary: 'An image with a caption and up to three buttons people can tap.',
  },
};

export const getBroadcastType = (type) =>
  BROADCAST_TYPES[type] || { label: 'Broadcast', summary: '' };
