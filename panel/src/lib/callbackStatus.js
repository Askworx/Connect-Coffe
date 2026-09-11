/**
 * Callback status vocabulary — the single definition for the whole app.
 *
 * The keys are the ones the server writes: rows arrive as 'pending', and
 * `markCallbackDone` runs `UPDATE callbacks SET status = 'done'`. The page used
 * to set 'completed' on its optimistic update, so a row read "completed" the
 * moment it was clicked and "done" again after the next load — one state under
 * two words on the same screen.
 */
export const CALLBACK_STATUS = {
  pending: {
    label: 'Waiting',
    badge: 'warning',
    dot: 'bg-warning',
    description: 'Nobody has phoned them back yet.',
  },
  done: {
    label: 'Called back',
    badge: 'success',
    dot: 'bg-success',
    description: 'Someone has phoned them. Nothing further is outstanding.',
  },
};

export const getCallbackStatus = (status) =>
  CALLBACK_STATUS[status] || {
    label: 'Not recognised',
    badge: 'muted',
    dot: 'bg-titanium-300',
    description: 'This request carries a status the panel does not know about.',
  };

export const CALLBACK_FILTERS = [
  {
    value: 'pending',
    label: 'Waiting',
    help: 'Customers who asked for a call and have not had one yet. These are the ones the dashboard counts.',
  },
  {
    value: 'done',
    label: 'Called back',
    help: 'Requests somebody has already dealt with. Kept so you can see what was handled and when.',
  },
  {
    value: 'all',
    label: 'All',
    help: 'Every callback the bot has taken, in the order they came in.',
  },
];
