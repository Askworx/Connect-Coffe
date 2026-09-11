import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { UserPlus, Search, MessageSquare, Trash2, AlertCircle, Send, FileUp } from 'lucide-react';

import { getContacts, saveContact, sendMessage, deleteContact, toggleOptOut } from '../api';
import { formatSlug } from '../utils';

import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import ImportContactsDialog from '../components/ImportContactsDialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs } from '../components/ui/tabs';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import { Reveal } from '../components/motion/Reveal';

/**
 * Contacts — everyone who has messaged the WhatsApp bot.
 *
 * Rebuilt from a version that reported every outcome through `alert()` and
 * asked for delete confirmation through `window.confirm()`. Both are browser
 * chrome that looks nothing like the app, cannot say what is about to happen,
 * and get clicked through on reflex — on a screen where one of the actions
 * permanently removes a customer.
 */

const FILTERS = [
  { value: 'all', label: 'All contacts', help: 'Everyone who has messaged the bot, plus anyone you added or imported.' },
  {
    value: 'subscribed',
    label: 'Receiving offers',
    help: 'These contacts get your offers whenever they are inside their free 24-hour window.',
  },
  {
    value: 'opted-out',
    label: 'Opted out',
    help: 'These contacts asked not to receive broadcasts. They are skipped automatically — you can still message them one to one.',
  },
];

// WhatsApp rejects a free-form message outside a 24-hour window after the
// customer's last message, so the limit is worth showing before sending.
const MESSAGE_LIMIT = 1000;

const Contacts = () => {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
  const [dialog, setDialog] = useState(null);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pendingOptOut, setPendingOptOut] = useState(null);

  const notify = (title, message, type = 'success') =>
    setModal({ open: true, title, message, type });

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const resp = await getContacts();
      setContacts(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error(err);
      setLoadError(
        'Could not load contacts. The server did not respond — check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () => ({
      total: contacts.length,
      subscribed: contacts.filter((c) => !c.opt_out).length,
      optedOut: contacts.filter((c) => c.opt_out).length,
    }),
    [contacts],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter((c) => {
        if (filter === 'subscribed' && c.opt_out) return false;
        if (filter === 'opted-out' && !c.opt_out) return false;
        if (!q) return true;
        return (
          (c.name || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q)
        );
      })
      .sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));
  }, [contacts, search, filter]);

  const activeFilter = FILTERS.find((f) => f.value === filter) || FILTERS[0];

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleAddContact = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get('name');

    try {
      await saveContact({ name, phone: form.get('phone'), company: form.get('company') });
      setDialog(null);
      await load();
      notify('Contact saved', `${name || 'The contact'} can now be included in broadcasts.`);
    } catch (err) {
      console.error(err);
      notify(
        'Could not save the contact',
        'Nothing was saved. Check that the number is not already on the list, then try again.',
        'error',
      );
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!messageTarget || !messageBody.trim()) return;

    setSending(true);
    try {
      await sendMessage(messageTarget.phone, messageBody);
      setDialog(null);
      setMessageBody('');
      notify('Message sent', `Delivered to ${messageTarget.name || messageTarget.phone} on WhatsApp.`);
    } catch (err) {
      console.error(err);
      notify(
        'Could not send the message',
        'Nothing was sent. WhatsApp only allows a free-form reply within 24 hours of the customer’s last message — after that a template is required.',
        'error',
      );
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact(confirmDelete.id);
      await load();
      notify('Contact deleted', `${confirmDelete.name || confirmDelete.phone} has been removed.`);
    } catch (err) {
      console.error(err);
      notify('Could not delete the contact', 'Nothing was changed. Please try again.', 'error');
    }
  };

  const handleOptOut = async (contact) => {
    // Optimistic, because a switch that waits on the network reads as broken.
    // Reverted below if the server disagrees.
    const next = !contact.opt_out;
    setContacts((current) =>
      current.map((c) => (c.id === contact.id ? { ...c, opt_out: next } : c)),
    );
    setPendingOptOut(contact.id);

    try {
      await toggleOptOut(contact.id, next);
    } catch (err) {
      console.error(err);
      setContacts((current) =>
        current.map((c) => (c.id === contact.id ? { ...c, opt_out: !next } : c)),
      );
      notify(
        'Could not change the subscription',
        'The setting has been put back as it was. Please try again.',
        'error',
      );
    } finally {
      setPendingOptOut(null);
    }
  };

  const openMessage = (contact) => {
    setMessageTarget(contact);
    setMessageBody('');
    setDialog('message');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="size-7 animate-spin rounded-full border-2 border-line border-t-ink" />
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-titanium-700">
          Loading contacts
        </p>
      </div>
    );
  }

  return (
    <>
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete this contact?"
        message={
          confirmDelete
            ? `${confirmDelete.name || confirmDelete.phone} will be removed from the contact list and from every future broadcast. Their past conversation stays on record. This cannot be undone.`
            : ''
        }
        confirmText="Delete contact"
      />

      <PageHeader
        eyebrow="Customers"
        title="Contacts"
        intro="Everyone who has messaged Connect on WhatsApp is added here automatically. Import your existing customers from a CSV or your phone's contacts."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDialog('import')}>
              <FileUp />
              Import
            </Button>
            <Button onClick={() => setDialog('add')}>
              <UserPlus />
              Add contact
            </Button>
          </div>
        }
      />

      {loadError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-light px-4 py-3"
        >
          <AlertCircle aria-hidden="true" className="mt-1 size-4 shrink-0 text-danger" />
          <div>
            <p className="text-[13px] font-medium text-danger">{loadError}</p>
            <button
              type="button"
              onClick={load}
              className="mt-1 text-[13px] font-medium text-danger underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <Reveal>
        <div className="hairline-grid mb-6 grid grid-cols-1 overflow-hidden rounded-xl sm:grid-cols-3">
          <StatCard label="Total contacts" value={summary.total} hint="People who have messaged the bot" />
          <StatCard
            label="Receiving broadcasts"
            value={summary.subscribed}
            hint="Will get your next announcement"
          />
          <StatCard
            label="Opted out"
            value={summary.optedOut}
            hint="Skipped automatically on every broadcast"
          />
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={filter}
            onValueChange={setFilter}
            layoutId="contacts-filter"
            items={FILTERS.map((f) => ({
              value: f.value,
              label: f.label,
              count:
                f.value === 'all'
                  ? summary.total
                  : f.value === 'subscribed'
                    ? summary.subscribed
                    : summary.optedOut,
            }))}
          />

          <div className="relative w-full lg:max-w-xs">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-titanium-700"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, company or number"
              aria-label="Search contacts"
              className="pl-9"
            />
          </div>
        </div>

        <p className="mb-6 text-[13px] leading-relaxed text-text-secondary">
          {activeFilter.help}
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Card>
          <Table className="min-w-[880px]">
            <TableHeader>
              <tr>
                <TableHead>Name &amp; number</TableHead>
                <TableHead className="text-center">Company</TableHead>
                <TableHead className="text-center">First contact</TableHead>
                <TableHead className="text-center">Broadcasts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>

            <TableBody>
              {visible.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <p className="font-medium text-ink">
                      {contact.name ? formatSlug(contact.name) : 'Name not given'}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-titanium-700">+{contact.phone}</p>
                  </TableCell>

                  <TableCell className="text-center text-text-secondary">
                    {contact.company ? formatSlug(contact.company) : 'Not given'}
                  </TableCell>

                  <TableCell className="text-center text-text-secondary">
                    {contact.joined_at ? (
                      <span title={format(parseISO(contact.joined_at), "d MMMM yyyy 'at' h:mm a")}>
                        {formatDistanceToNow(parseISO(contact.joined_at), { addSuffix: true })}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-center gap-3">
                      <Switch
                        checked={!contact.opt_out}
                        disabled={pendingOptOut === contact.id}
                        onCheckedChange={() => handleOptOut(contact)}
                        aria-label={`${contact.opt_out ? 'Include' : 'Exclude'} ${contact.name || contact.phone} in broadcasts`}
                      />
                      <Badge variant={contact.opt_out ? 'muted' : 'success'}>
                        {contact.opt_out ? 'Opted out' : 'Subscribed'}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="xs" variant="outline" onClick={() => openMessage(contact)}>
                        <Send />
                        Message
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Open conversation with ${contact.name || contact.phone}`}
                        title="Open conversation"
                        onClick={() => navigate(`/messages?phone=${contact.phone}`)}
                      >
                        <MessageSquare />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="destructive-outline"
                        aria-label={`Delete ${contact.name || contact.phone}`}
                        title="Delete contact"
                        onClick={() => setConfirmDelete(contact)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                      {contacts.length === 0 ? 'No contacts yet' : 'Nothing under this filter'}
                    </p>
                    <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-text-secondary">
                      {contacts.length === 0
                        ? 'Contacts are added automatically the first time someone messages the WhatsApp bot. You can also add one by hand if you already have their number.'
                        : 'No contact matches this filter and search. Switch to “All contacts” to see everyone.'}
                    </p>
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>

          {visible.length > 0 && (
            <div className="border-t border-border bg-paper px-5 py-3">
              <p className="text-[13px] text-text-secondary">
                Showing <span className="font-medium tabular-nums text-ink">{visible.length}</span>{' '}
                of {summary.total} {summary.total === 1 ? 'contact' : 'contacts'}
              </p>
            </div>
          )}
        </Card>
      </Reveal>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}

      <ImportContactsDialog
        open={dialog === 'import'}
        onClose={() => setDialog(null)}
        onImported={(result) => {
          setDialog(null);
          load();
          notify(
            'Contacts imported',
            `${result.added} added, ${result.updated} already on the list${
              result.invalid?.length ? `, ${result.invalid.length} skipped as invalid` : ''
            }.`,
          );
        }}
      />

      <Dialog open={dialog === 'add'} onClose={() => setDialog(null)} labelledBy="add-contact">
        <DialogHeader
          id="add-contact"
          eyebrow="Customers"
          title="Add a contact"
          description="Only needed for someone who has not messaged the bot yet — everyone else is added automatically."
          onClose={() => setDialog(null)}
        />
        <form onSubmit={handleAddContact}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Full name</Label>
              <Input id="contact-name" name="name" placeholder="Rajesh Menon" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">WhatsApp number</Label>
              <Input
                id="contact-phone"
                name="phone"
                required
                inputMode="numeric"
                placeholder="919876543210"
              />
              <p className="text-[12px] leading-relaxed text-text-secondary">
                Country code first, no plus sign or spaces.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-company">Company</Label>
              <Input id="contact-company" name="company" placeholder="Northline Polymers" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="submit">Save contact</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={dialog === 'message'} onClose={() => setDialog(null)} labelledBy="send-message">
        <DialogHeader
          id="send-message"
          eyebrow="Direct message"
          title={`Message ${messageTarget?.name ? formatSlug(messageTarget.name) : messageTarget?.phone || ''}`}
          description="Goes to this one person on WhatsApp immediately. It does not affect their broadcast setting."
          onClose={() => setDialog(null)}
        />
        <form onSubmit={handleSendMessage}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message-body">Message</Label>
              <Textarea
                id="message-body"
                rows={5}
                required
                maxLength={MESSAGE_LIMIT}
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="Hello — following up on your enquiry about the VFD retrofit."
              />
              <p className="text-right font-mono text-[11px] tabular-nums text-titanium-700">
                {messageBody.length} / {MESSAGE_LIMIT}
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-paper px-4 py-3">
              <AlertCircle aria-hidden="true" className="mt-1 size-4 shrink-0 text-titanium-700" />
              <p className="text-[13px] leading-relaxed text-text-secondary">
                WhatsApp only allows a free-form message within 24 hours of this
                person’s last message to you. Outside that window it will be
                rejected and an approved template is required.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !messageBody.trim()}>
              {sending ? 'Sending' : 'Send message'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
};

export default Contacts;
