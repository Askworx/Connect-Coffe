/**
 * Lead status vocabulary — the single definition for the whole app.
 *
 * It previously lived duplicated in Dashboard.jsx and Leads.jsx, which is how
 * "In progress" and "Deal Closed" ended up meaning the same state under two
 * names. Anything that renders a lead status reads it from here.
 *
 * `action` is the sentence shown on the button that moves a lead INTO this
 * state, written as an instruction rather than a noun — "Mark as called", not
 * "Called" — so the operator can tell a label apart from a control.
 */
export const LEAD_STATUS = {
  new: {
    label: 'New',
    badge: 'default',
    // Champagne, not ink. The `default` badge is an INK pill, so an ink dot is
    // invisible on it — it still took its 6px plus the 6px flex gap, which
    // pushed "NEW" ~6px right and made the pill look badly centred. A status
    // dot has to contrast with the badge it sits on, not with the page.
    dot: 'bg-champagne',
    description: 'Requested through the bot. Nobody has confirmed it yet.',
  },
  called: {
    label: 'Confirmed',
    badge: 'warning',
    dot: 'bg-warning',
    action: 'Mark as confirmed',
    description: 'The cafe has confirmed the booking with the customer.',
  },
  in_progress: {
    label: 'Rescheduled',
    badge: 'secondary',
    dot: 'bg-titanium',
    action: 'Mark as rescheduled',
    description: 'Moved to a different date or time.',
  },
  converted: {
    label: 'Visited',
    badge: 'success',
    dot: 'bg-success',
    action: 'Mark as visited',
    description: 'They came in.',
  },
};

export const getLeadStatus = (status) => LEAD_STATUS[status] || LEAD_STATUS.new;

/**
 * Enquiry type filters.
 *
 * The tabs used to render the raw keys — "all", "expert", "quote" — which told
 * the operator nothing about what separated one from another. The `help` line
 * is shown beneath the table so the distinction is stated, not inferred.
 */
export const LEAD_FILTERS = [
  {
    value: 'all',
    label: 'All bookings',
    help: 'Every table and workshop booking made through the bot.',
  },
  {
    value: 'table',
    label: 'Tables',
    help: 'Table bookings.',
  },
  {
    value: 'workshop',
    label: 'Workshops',
    help: 'Workshop seats — coffee painting, brewing classes and tastings.',
  },
];
