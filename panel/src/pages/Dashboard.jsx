import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO, subDays, startOfDay } from 'date-fns';
import { ArrowRight, AlertCircle, Megaphone } from 'lucide-react';

import { getLeads, getMessageSummary, getContacts, getCampaigns } from '../api';
import { formatSlug } from '../utils';
import { getLeadStatus, LEAD_STATUS } from '../lib/leadStatus';
import { getBroadcastStatus } from '../lib/broadcastStatus';
import { isInWindow } from '../lib/replyWindow';

import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import ActivityChart from '../components/charts/ActivityChart';
import HoursChart from '../components/charts/HoursChart';
import DonutChart from '../components/charts/DonutChart';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '../components/ui/table';
import { Reveal } from '../components/motion/Reveal';

const EMPTY_SUMMARY = { daily: [], hourly: [], total: 0 };
const REFRESH_MS = 30000;
const WINDOW_DAYS = 14;

// Booking statuses in the order a booking moves through them.
const STATUS_ORDER = ['new', 'called', 'in_progress', 'converted'];

const headline = (offer) =>
  (offer.caption || '').split('\n').find((l) => l.trim())?.replace(/[*_~`]/g, '').trim() || 'Offer';

const Dashboard = () => {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [leadsRes, summaryRes, contactsRes, offersRes] = await Promise.all([
        getLeads({ limit: 100, offset: 0 }),
        getMessageSummary(WINDOW_DAYS),
        getContacts(),
        getCampaigns({ limit: 50, offset: 0 }),
      ]);
      setLeads(leadsRes.data?.data || leadsRes.data || []);
      setSummary(summaryRes.data || EMPTY_SUMMARY);
      setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : []);
      setOffers((offersRes.data?.data || []).filter((c) => c.type === 'poster'));
    } catch (err) {
      console.error(err);
      setLoadError('Could not load the overview. The server did not respond — try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  // ── Headline figures ───────────────────────────────────────────────────────
  const figures = useMemo(() => {
    const subscribed = contacts.filter((c) => !c.opt_out);
    const sent = offers.filter((o) => o.status === 'sent');
    return {
      contacts: contacts.length,
      reachable: subscribed.filter((c) => isInWindow(c.last_incoming_at)).length,
      outside: subscribed.filter((c) => !isInWindow(c.last_incoming_at)).length,
      optedOut: contacts.length - subscribed.length,
      waiting: leads.filter((l) => (l.status || 'new') === 'new').length,
      offersSent: sent.length,
      peopleReached: sent.reduce((sum, o) => sum + (o.total_sent || 0), 0),
    };
  }, [contacts, leads, offers]);

  // ── Donuts ─────────────────────────────────────────────────────────────────
  const byStatus = useMemo(
    () =>
      STATUS_ORDER.map((key) => ({
        key,
        label: LEAD_STATUS[key].label,
        value: leads.filter((l) => (l.status || 'new') === key).length,
      })),
    [leads],
  );

  const byType = useMemo(
    () => [
      { key: 'table', label: 'Table', value: leads.filter((l) => (l.company || '').toLowerCase() === 'table').length },
      { key: 'workshop', label: 'Workshop', value: leads.filter((l) => (l.company || '').toLowerCase() === 'workshop').length },
    ],
    [leads],
  );

  const audience = useMemo(
    () => [
      { key: 'reachable', label: 'Free to message now', value: figures.reachable },
      { key: 'outside', label: 'Outside the 24-hour window', value: figures.outside },
      { key: 'opted-out', label: 'Opted out of offers', value: figures.optedOut },
    ],
    [figures],
  );

  // ── Conversation volume ────────────────────────────────────────────────────
  const activity = useMemo(() => {
    const byDay = new Map(summary.daily.map((d) => [d.day, d]));
    const today = startOfDay(new Date());
    return Array.from({ length: WINDOW_DAYS }, (_, i) => {
      const date = subDays(today, WINDOW_DAYS - 1 - i);
      const row = byDay.get(format(date, 'yyyy-MM-dd'));
      return {
        iso: date.toISOString(),
        date,
        label: format(date, 'EEEE d MMMM'),
        short: format(date, 'd'),
        in: row?.incoming || 0,
        out: row?.outgoing || 0,
      };
    });
  }, [summary]);

  const hours = useMemo(() => {
    const byHour = new Map(summary.hourly.map((h) => [h.hour, h.count]));
    return Array.from({ length: 24 }, (_, hour) => ({ hour, count: byHour.get(hour) || 0 }));
  }, [summary]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="size-7 animate-spin rounded-full border-2 border-line border-t-primary" />
        <p className="text-[13px] text-text-secondary">Loading overview</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Overview"
        intro="Who you can reach right now, what the bot has booked, and how your offers are doing. Refreshes every 30 seconds."
      />

      {loadError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-light px-4 py-3">
          <AlertCircle aria-hidden="true" className="mt-1 size-4 shrink-0 text-danger" />
          <div>
            <p className="text-[13px] font-medium text-danger">{loadError}</p>
            <button type="button" onClick={load} className="mt-1 text-[13px] font-medium text-danger underline underline-offset-2">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Headline figures ────────────────────────────────────────────── */}
      <Reveal>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Contacts"
            value={figures.contacts}
            hint="Everyone who has messaged, plus imports"
            actionLabel="Open contacts"
            onClick={() => navigate('/contacts')}
          />
          <StatCard
            label="Reachable now, free"
            value={figures.reachable}
            hint="Messaged in the last 24 hours"
            actionLabel="Send an offer"
            onClick={() => navigate('/campaigns')}
          />
          <StatCard
            label="Bookings to confirm"
            value={figures.waiting}
            tone="attention"
            hint="New bookings nobody has confirmed"
            zeroHint="Every booking is confirmed"
            actionLabel="Open bookings"
            onClick={() => navigate('/leads')}
          />
          <StatCard
            label="Offers sent"
            value={figures.offersSent}
            hint={`${figures.peopleReached} ${figures.peopleReached === 1 ? 'delivery' : 'deliveries'} in total`}
            actionLabel="Open offers"
            onClick={() => navigate('/campaigns')}
          />
        </div>
      </Reveal>

      {/* ── Donuts ──────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Reveal delay={0.04}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <p className="eyebrow">Bookings</p>
                <CardTitle className="mt-2">By status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <DonutChart slices={byStatus} totalLabel={leads.length === 1 ? 'booking' : 'bookings'} emptyText="No bookings yet." />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.06}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <p className="eyebrow">Bookings</p>
                <CardTitle className="mt-2">Tables or workshops</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <DonutChart slices={byType} totalLabel={leads.length === 1 ? 'booking' : 'bookings'} emptyText="No bookings yet." />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <p className="eyebrow">Contacts</p>
                <CardTitle className="mt-2">Who you can reach</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <DonutChart slices={audience} totalLabel={figures.contacts === 1 ? 'contact' : 'contacts'} emptyText="No contacts yet." />
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {/* ── Conversations ───────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Reveal delay={0.1}>
            <Card>
              <CardHeader>
                <div>
                  <p className="eyebrow">Last {WINDOW_DAYS} days</p>
                  <CardTitle className="mt-2">Messages</CardTitle>
                  <CardDescription className="mt-2">
                    Received from customers and sent by the bot, each day.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ActivityChart days={activity} />
              </CardContent>
            </Card>
          </Reveal>
        </div>
        <Reveal delay={0.12}>
          <Card>
            <CardHeader>
              <div>
                <p className="eyebrow">Last {WINDOW_DAYS} days</p>
                <CardTitle className="mt-2">Busiest hours</CardTitle>
                <CardDescription className="mt-2">
                  When customers message — a good time to send an offer.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <HoursChart hours={hours} />
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {/* ── Recent bookings and offers ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Reveal delay={0.14}>
            <Card>
              <CardHeader>
                <div>
                  <p className="eyebrow">Latest</p>
                  <CardTitle className="mt-2">Recent bookings</CardTitle>
                </div>
                <CardAction>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
                    View all
                    <ArrowRight />
                  </Button>
                </CardAction>
              </CardHeader>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead className="w-[30%]">Booked by</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead className="w-32 text-center">Status</TableHead>
                    <TableHead className="w-36 text-right">Received</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {leads.slice(0, 6).map((lead, index) => {
                    const status = getLeadStatus(lead.status);
                    return (
                      <TableRow key={lead.id || index}>
                        <TableCell>
                          <p className="font-medium text-ink">{lead.name ? formatSlug(lead.name) : 'Name not given'}</p>
                          <p className="mt-1 font-mono text-[11px] text-text-secondary">+{lead.phone}</p>
                        </TableCell>
                        <TableCell className="text-text-secondary">{lead.requirement || '—'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={status.badge}>
                            <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-text-secondary">
                          {lead.created_at
                            ? formatDistanceToNow(parseISO(lead.created_at), { addSuffix: true })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {leads.length === 0 && <TableEmpty colSpan={4}>No bookings yet</TableEmpty>}
                </TableBody>
              </Table>
            </Card>
          </Reveal>
        </div>

        <Reveal delay={0.16}>
          <Card>
            <CardHeader>
              <div>
                <p className="eyebrow">Latest</p>
                <CardTitle className="mt-2">Recent offers</CardTitle>
              </div>
              <CardAction>
                <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
                  View all
                  <ArrowRight />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {offers.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Megaphone aria-hidden="true" className="size-6 text-titanium-300" />
                  <p className="mt-3 text-[13px] text-text-secondary">No offers sent yet.</p>
                  <Button size="sm" className="mt-4" onClick={() => navigate('/campaigns')}>
                    Send your first offer
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {offers.slice(0, 5).map((offer) => {
                    const status = getBroadcastStatus(offer.status);
                    return (
                      <li key={offer.id} className="flex items-center gap-3 py-3">
                        {offer.image_url ? (
                          <img src={offer.image_url} alt="" className="size-11 shrink-0 rounded-lg bg-paper object-cover" />
                        ) : (
                          <span className="size-11 shrink-0 rounded-lg bg-paper" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-ink">{headline(offer)}</p>
                          <p className="mt-0.5 text-[12px] text-text-secondary">
                            {offer.scheduled_at ? format(parseISO(offer.scheduled_at), "d MMM, h:mm a") : '—'}
                            {offer.status === 'sent' && ` · to ${offer.total_sent}`}
                          </p>
                        </div>
                        <Badge variant={status.badge}>{status.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </>
  );
};

export default Dashboard;
