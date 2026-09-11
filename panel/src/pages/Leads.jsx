import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { RefreshCw, AlertCircle } from 'lucide-react';

import { getLeads, updateLeadStatus } from '../api';
import { formatSlug } from '../utils';
import { LEAD_STATUS, LEAD_FILTERS, getLeadStatus } from '../lib/leadStatus';

import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import PageHeader from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Tabs } from '../components/ui/tabs';
import { Select } from '../components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import { Reveal } from '../components/motion/Reveal';

const PAGE_SIZE = 10;

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  const [pendingChange, setPendingChange] = useState(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const fetchLeads = useCallback(async () => {
    setLoadError('');
    try {
      const resp = await getLeads({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setLeads(resp.data.data || []);
      setTotal(resp.data.total || 0);
    } catch (err) {
      // A failure has to reach the person using the page. Logging it to the
      // console leaves them looking at a stale table with no idea it is stale.
      console.error(err);
      setLoadError(
        'Could not load leads. The server did not respond — check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const applyStatusChange = async ({ id, status }) => {
    try {
      await updateLeadStatus(id, status);
      setModal({
        open: true,
        title: 'Booking updated',
        message: `This booking is now marked "${getLeadStatus(status).label}".`,
        type: 'success',
      });
      fetchLeads();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Could not update the booking',
        message:
          'The change was not saved. Nothing has been altered — please check your connection and try again.',
        type: 'error',
      });
    }
  };

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        if (activeFilter === 'all') return true;
        // The bot saves the booking type (Table or Workshop) in `company`.
        return (lead.company || '').toLowerCase() === activeFilter;
      }),
    [leads, activeFilter],
  );

  const activeFilterMeta = LEAD_FILTERS.find((f) => f.value === activeFilter) || LEAD_FILTERS[0];
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  // Which moves are offered depends on where the lead already is, so the row
  // never shows an action that would be a no-op.
  const nextStatuses = (status) => {
    if (status === 'converted') return [];
    if (status === 'new') return ['called', 'in_progress', 'converted'];
    if (status === 'called') return ['in_progress', 'converted'];
    return ['converted'];
  };

  return (
    <>
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      {/* Changing a lead's status is not reversible from this screen, so it
          asks first and names both the lead and the new state. */}
      <ConfirmModal
        isOpen={!!pendingChange}
        onClose={() => setPendingChange(null)}
        onConfirm={() => pendingChange && applyStatusChange(pendingChange)}
        type="info"
        title={pendingChange ? `Mark as ${getLeadStatus(pendingChange.status).label.toLowerCase()}?` : ''}
        message={
          pendingChange
            ? `${pendingChange.name} will be moved to "${getLeadStatus(pendingChange.status).label}". ${getLeadStatus(pendingChange.status).description}`
            : ''
        }
        confirmText="Update booking"
      />

      <PageHeader
        eyebrow="Customers"
        title="Bookings"
        intro="Table and workshop bookings made through WhatsApp. Confirm each one with the customer in the Inbox, then record it here — the dashboard follows what you mark."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetchLeads();
            }}
          >
            <RefreshCw />
            Refresh
          </Button>
        }
      />

      <Reveal>
        <div className="mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={activeFilter}
              onValueChange={setActiveFilter}
              items={LEAD_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
            />

            {/* Counted against what is actually on screen. The filter runs on
                the page the server returned, so "of 12 in total" beside a
                filtered figure would be comparing two different things. */}
            <p className="text-[13px] text-text-secondary">
              {activeFilter === 'all' ? (
                <>
                  Showing{' '}
                  <span className="font-medium tabular-nums text-ink">{leads.length}</span> of{' '}
                  <span className="tabular-nums">{total}</span>{' '}
                  {total === 1 ? 'booking' : 'bookings'}
                </>
              ) : (
                <>
                  <span className="font-medium tabular-nums text-ink">{filteredLeads.length}</span>{' '}
                  of <span className="tabular-nums">{leads.length}</span> on this page
                </>
              )}
            </p>
          </div>

          {/* The filter explains itself rather than leaving the operator to work
              out what separates a consultation from a quotation request. It sits
              under the tabs it describes, not adrift below the whole row. */}
          <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-text-secondary">
            {activeFilterMeta.help}
          </p>
        </div>
      </Reveal>

      {loadError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-light px-4 py-3.5"
        >
          <AlertCircle className="mt-1 size-4 shrink-0 text-danger" />
          <div>
            <p className="text-[13px] font-medium text-danger">{loadError}</p>
            <button
              type="button"
              onClick={fetchLeads}
              className="mt-1 text-[13px] font-medium text-danger underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <Reveal delay={0.06}>
        <Card>
          {/* Every column carries an explicit width. Without them the browser
              sized each one from its content, so the status pill and the
              action control landed on a different vertical in every row and
              the right edge of the table sawtoothed. */}
          <Table className="min-w-[1080px] table-fixed">
            <TableHeader>
              <tr>
                <TableHead className="w-[22%]">Name &amp; phone</TableHead>
                <TableHead className="w-[16%] text-center">Type</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead className="w-36 text-center">Received</TableHead>
                <TableHead className="w-36 text-center">Status</TableHead>
                <TableHead className="w-52 text-right">Update status</TableHead>
              </tr>
            </TableHeader>

            <TableBody>
              {filteredLeads.map((lead, index) => {
                const status = getLeadStatus(lead.status);
                const name = lead.name ? formatSlug(lead.name) : 'Name not given';

                // The number they asked to be called on, and the one they
                // wrote in from, are usually the same. Rendering both left
                // every row showing one number twice — and contact_phone
                // came through without the plus the other line had, so the
                // pair did not even match.
                const wroteInFrom = `+${lead.phone}`;
                const callOn = lead.contact_phone
                  ? `+${String(lead.contact_phone).replace(/^\+/, '')}`
                  : wroteInFrom;

                return (
                  <TableRow key={lead.id || index}>
                    {/* align-top throughout: these cells run to two and three
                        lines, and centring each one against the others left
                        nothing sharing a baseline. The first line of every
                        cell now starts on the same vertical. */}
                    <TableCell className="align-top">
                      <p className="font-medium text-ink">{name}</p>
                      <p className="mt-1 font-mono text-[11px] text-titanium-700">
                        {callOn}
                      </p>
                      {callOn !== wroteInFrom && (
                        <p className="mt-1 text-[11px] text-muted-text">
                          Wrote in from {wroteInFrom}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="align-top text-center text-text-secondary">
                      {lead.company ? formatSlug(lead.company) : 'Not given'}
                    </TableCell>

                    <TableCell className="align-top">
                      <p className="max-w-[52ch] leading-relaxed">
                        {lead.requirement || 'No details given'}
                      </p>
                    </TableCell>

                    {/* Recency is what a leads list is read by, so it earns a
                        column of its own rather than trailing the enquiry text
                        at a different indent on every row. */}
                    <TableCell className="align-top whitespace-nowrap text-center text-text-secondary">
                      {lead.created_at ? (
                        <span title={format(new Date(lead.created_at), "d MMMM yyyy 'at' h:mm a")}>
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>

                    <TableCell className="align-top text-center">
                      <Badge variant={status.badge}>
                        <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </Badge>
                    </TableCell>

                    {/* One control of one width, on one line. A new lead
                        offered three buttons here, a called lead two and a won
                        lead none, so the column wrapped to a second row on
                        some leads and collapsed on others. The moves are the
                        same moves — the confirmation still names the one
                        chosen before anything is written. */}
                    <TableCell className="align-top text-right">
                      {nextStatuses(lead.status).length > 0 ? (
                        <div className="ml-auto w-44">
                          <Select
                            aria-label={`Update the status of ${name}`}
                            value=""
                            onChange={(event) => {
                              if (!event.target.value) return;
                              setPendingChange({ id: lead.id, status: event.target.value, name });
                            }}
                            className="h-9 text-[13px]"
                          >
                            <option value="">Move to…</option>
                            {nextStatuses(lead.status).map((next) => (
                              <option key={next} value={next}>
                                {LEAD_STATUS[next].action}
                              </option>
                            ))}
                          </Select>
                        </div>
                      ) : (
                        <span className="inline-flex h-9 items-center text-[13px] text-success">
                          Closed as won
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredLeads.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    {/* An empty state is the best teaching moment in an admin
                        panel — say what belongs here and how it gets here. */}
                    <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                      {activeFilter === 'all' ? 'No leads yet' : 'Nothing under this filter'}
                    </p>
                    <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
                      {activeFilter === 'all'
                        ? 'Leads appear here automatically when someone requests a consultation or a quotation through the WhatsApp bot. Nothing needs to be entered by hand.'
                        : 'No lead currently matches this filter. Switch to "All enquiries" to see everything the bot has captured.'}
                    </p>
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-4 border-t border-border bg-paper px-5 py-3.5">
              <p className="text-[13px] text-text-secondary">
                Page <span className="font-medium tabular-nums text-ink">{page + 1}</span> of{' '}
                <span className="tabular-nums">{lastPage + 1}</span>
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= lastPage}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Reveal>
    </>
  );
};

export default Leads;
