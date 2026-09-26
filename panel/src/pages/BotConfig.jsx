import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Plus, Trash2, Pencil, X, AlertCircle, Search } from 'lucide-react';

import { getSettings, updateSettings, getFaqs, saveFaq, deleteFaq } from '../api';

import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WhatsAppPreview, { FormattingHint } from '../components/WhatsAppPreview';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs } from '../components/ui/tabs';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../components/ui/dialog';
import { Reveal } from '../components/motion/Reveal';
import { cn } from '../lib/utils';

/**
 * Automation — everything the bot says without a person involved.
 *
 * Each field here is a message that goes to a real customer or a real
 * colleague, so every one is edited beside a preview of how WhatsApp will
 * actually render it. Previously they were bare textareas: `*bold*` looked
 * like asterisks and nobody could see the result until it had been sent.
 *
 * Fields are grouped by WHO RECEIVES the message rather than by which
 * database key holds it, because that is the question someone arrives with.
 */

const GROUPS = [
  {
    id: 'welcome',
    label: 'Welcome & menu',
    blurb:
      'The first thing a customer sees when they say hi, and the menu they ask for. {{company}} is replaced with the cafe name.',
    fields: [
      {
        key: 'welcome_body',
        label: 'Welcome message',
        help: 'Sent when somebody says hi, with a photo and the Menu / Book / Visit Us buttons.',
        image: 'welcome_image',
        placeholders: ['company'],
      },
      {
        key: 'menu_body',
        label: 'Menu message',
        help: 'Sent after the menu, above the Book / Visit Us buttons.',
        placeholders: ['company'],
      },
      {
        key: 'menu_pdf',
        label: 'Menu PDF',
        help: 'Link to the menu as one PDF. Customers get a single file they scroll through. Leave empty to send the photos below instead.',
        plain: true,
      },
      {
        key: 'menu_pdf_name',
        label: 'Menu PDF file name',
        help: 'The name customers see on the attachment, ending in .pdf.',
        plain: true,
      },
      {
        key: 'menu_images',
        label: 'Menu photos',
        help: 'Used only when no menu PDF is set. One photo link per line, each sent as its own photo, in this order.',
        plain: true,
        multiline: true,
      },
      {
        key: 'fallback_body',
        label: 'When the bot does not understand',
        help: 'Sent when a message is not a button or a known question. The team is alerted to real questions.',
      },
    ],
  },
  {
    id: 'booking',
    label: 'Booking',
    blurb: 'The questions a customer answers to book a table or a workshop seat, one at a time.',
    fields: [
      { key: 'booking_intro', label: 'Choose what to book', help: 'Shown above the Table / Workshop buttons.', placeholders: ['company'] },
      { key: 'booking_date_prompt', label: 'Ask for the date' },
      { key: 'booking_time_prompt', label: 'Ask for the time' },
      { key: 'booking_people_prompt', label: 'Ask how many people' },
      { key: 'booking_name_prompt', label: 'Ask for the name' },
      {
        key: 'booking_done',
        label: 'Booking received',
        help: '{{booking}} becomes the name and the booking details.',
        placeholders: ['booking'],
      },
    ],
  },
  {
    id: 'visit',
    label: 'Visit us',
    blurb: 'Address, hours and directions. A map pin is sent too once the coordinates are filled in.',
    fields: [
      { key: 'visit_body', label: 'Visit us message', placeholders: ['company'] },
      {
        key: 'location_lat',
        label: 'Map pin — latitude',
        help: 'From Google Maps: right-click the cafe, click the numbers to copy them. The first number goes here.',
        plain: true,
      },
      { key: 'location_lng', label: 'Map pin — longitude', help: 'The second number.', plain: true },
      { key: 'location_name', label: 'Map pin — name', plain: true },
    ],
  },
  {
    id: 'promotion',
    label: 'Follow-up offer',
    blurb:
      'Sent automatically a set time after someone first messages, while they are still inside the free 24-hour window. Each person gets it once per repeat period.',
    fields: [
      {
        key: 'promo_body',
        label: 'Follow-up offer',
        help: 'Sent with the photo and Book Now / Menu / Stop offers buttons.',
        image: 'promo_image',
        placeholders: ['company'],
      },
      { key: 'promo_enabled', label: 'Turned on', help: 'Type on or off.', plain: true },
      { key: 'promo_delay_minutes', label: 'Send after (minutes)', help: 'Minutes after their first message. 60 = one hour.', plain: true },
      { key: 'promo_repeat_days', label: 'Once every (days)', help: 'The same person does not get it again for this many days.', plain: true },
    ],
  },
  {
    id: 'other',
    label: 'Offers & subscriptions',
    blurb: 'The line added under every offer, and the replies to STOP and SUBSCRIBE.',
    fields: [
      { key: 'poster_footer', label: 'Under every offer', help: 'Added below the message of every offer you send.' },
      { key: 'optout_done', label: 'After STOP', help: 'Sent when a customer stops offers.' },
      { key: 'optin_done', label: 'After SUBSCRIBE', help: 'Sent when a customer turns offers back on.' },
    ],
  },
];

/**
 * Every button the bot shows, by action. A label belongs to the action, not
 * the screen, so changing one changes it everywhere it appears.
 */
const BUTTON_GROUPS = [
  {
    label: 'Main buttons',
    help: 'On the welcome message and after most replies.',
    buttons: [
      { key: 'view_menu', label: 'Menu' },
      { key: 'book', label: 'Book' },
      { key: 'visit', label: 'Visit us' },
      { key: 'main_menu', label: 'Home (back to the welcome message)' },
    ],
  },
  {
    label: 'Booking',
    help: 'The choice at the start of a booking.',
    buttons: [
      { key: 'book_table', label: 'Table' },
      { key: 'book_workshop', label: 'Workshop' },
    ],
  },
  {
    label: 'Follow-up offer',
    help: 'Under the automatic follow-up offer.',
    buttons: [
      { key: 'book_now', label: 'Book now' },
      { key: 'opt_out', label: 'Stop offers' },
    ],
  },
];

// WhatsApp truncates a button title at 20 characters. An emoji counts as
// more than one, which is why several of these sit close to the edge.
const BUTTON_LIMIT = 20;

const AREAS = [
  { value: 'messages', label: 'Messages' },
  { value: 'replies', label: 'Auto-replies' },
  { value: 'buttons', label: 'Buttons' },
];

const BotConfig = () => {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const [area, setArea] = useState('messages');
  const [group, setGroup] = useState('welcome');
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });

  const [faqDialog, setFaqDialog] = useState(null); // null | {} | faq
  const [confirmDeleteFaq, setConfirmDeleteFaq] = useState(null);
  const [faqSearch, setFaqSearch] = useState('');

  const notify = (title, message, type = 'success') =>
    setModal({ open: true, title, message, type });

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [settingsRes, faqRes] = await Promise.all([getSettings(), getFaqs()]);
      setSettings(settingsRes.data || {});
      setSaved(settingsRes.data || {});
      setFaqs(faqRes.data || []);
    } catch (err) {
      console.error(err);
      setLoadError(
        'Could not load the bot configuration. The server did not respond — check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Which fields differ from what is on the server. Naming them means the save
  // bar can say what it is about to change instead of just "unsaved changes".
  const changed = useMemo(
    () => Object.keys(settings).filter((key) => settings[key] !== saved[key]),
    [settings, saved],
  );

  const setField = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  // Appended rather than inserted at the caret: a placeholder chip is a
  // reminder that the token exists, and dropping it at the end is easier to
  // undo than guessing where the cursor was.
  const insertPlaceholder = (key, token) =>
    setSettings((current) => ({ ...current, [key]: `${current[key] || ''}${token}` }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      setSaved(settings);
      notify(
        'Bot updated',
        `${changed.length} ${changed.length === 1 ? 'message is' : 'messages are'} now live. The next person who triggers ${changed.length === 1 ? 'it' : 'them'} will get the new wording.`,
      );
    } catch (err) {
      console.error(err);
      notify(
        'Could not save',
        'Nothing was changed on the bot. Your edits are still on screen — check your connection and save again.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => setSettings(saved);

  const handleFaqSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const editing = faqDialog?.id;

    try {
      await saveFaq({
        id: editing || 0,
        keywords: form.get('keywords'),
        answer: form.get('answer'),
      });
      setFaqDialog(null);
      const faqRes = await getFaqs();
      setFaqs(faqRes.data || []);
      notify(
        editing ? 'Auto-reply updated' : 'Auto-reply added',
        'The bot will use it on the next matching message.',
      );
    } catch (err) {
      console.error(err);
      notify('Could not save the auto-reply', 'Nothing was saved. Please try again.', 'error');
    }
  };

  const handleFaqDelete = async () => {
    try {
      await deleteFaq(confirmDeleteFaq.id);
      setFaqs((current) => current.filter((f) => f.id !== confirmDeleteFaq.id));
      notify('Auto-reply deleted', 'The bot will no longer reply to those keywords.');
    } catch (err) {
      console.error(err);
      notify('Could not delete the auto-reply', 'Nothing was changed. Please try again.', 'error');
    }
  };

  const visibleFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        (f.keywords || '').toLowerCase().includes(q) ||
        (f.answer || '').toLowerCase().includes(q),
    );
  }, [faqs, faqSearch]);

  const activeGroup = GROUPS.find((g) => g.id === group) || GROUPS[0];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="size-7 animate-spin rounded-full border-2 border-line border-t-ink" />
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-titanium-700">
          Loading automation
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
        isOpen={!!confirmDeleteFaq}
        onClose={() => setConfirmDeleteFaq(null)}
        onConfirm={handleFaqDelete}
        type="danger"
        title="Delete this auto-reply?"
        message={
          confirmDeleteFaq
            ? `The bot will stop replying to “${confirmDeleteFaq.keywords}”. Anyone asking about it will fall through to the support menu instead. This cannot be undone.`
            : ''
        }
        confirmText="Delete auto-reply"
      />

      <PageHeader
        eyebrow="Bot"
        title="Bot Settings"
        intro="Everything the bot says without a person involved. Each message is shown exactly as WhatsApp will render it, so you can see what a customer receives before it goes out."
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
        <div className="mb-6">
          <Tabs
            value={area}
            onValueChange={setArea}
            layoutId="automation-area"
            items={AREAS.map((a) => ({
              ...a,
              count: a.value === 'replies' ? faqs.length : undefined,
            }))}
          />
        </div>
      </Reveal>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      {area === 'messages' && (
        <>
          <Reveal delay={0.04}>
            <div className="mb-6 flex flex-col gap-4">
              <Tabs
                value={group}
                onValueChange={setGroup}
                layoutId="automation-group"
                items={GROUPS.map((g) => ({ value: g.id, label: g.label }))}
              />
              <p className="max-w-[68ch] text-[13px] leading-relaxed text-text-secondary">
                {activeGroup.blurb}
              </p>
            </div>
          </Reveal>

          <div className="flex flex-col gap-6">
            {activeGroup.fields.map((field, index) => (
              <Reveal key={field.key} delay={0.06 + index * 0.03}>
                <MessageField
                  field={field}
                  value={settings[field.key] || ''}
                  imageValue={field.image ? settings[field.image] || '' : undefined}
                  dirty={changed.includes(field.key)}
                  onChange={setField}
                  onInsert={insertPlaceholder}
                />
              </Reveal>
            ))}
          </div>
        </>
      )}

      {area === 'buttons' && (
        <div className="flex flex-col gap-6">
          <Reveal delay={0.04}>
            <p className="max-w-[72ch] text-[13px] leading-relaxed text-text-secondary">
              A label belongs to the action, not to the screen — changing
              “Menu” here changes it everywhere the bot shows it. WhatsApp cuts
              a button at {BUTTON_LIMIT} characters.
            </p>
          </Reveal>

          {BUTTON_GROUPS.map((group, groupIndex) => (
            <Reveal key={group.label} delay={0.06 + groupIndex * 0.03}>
              <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                    {group.label}
                  </h2>
                  <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-text-secondary">
                    {group.help}
                  </p>
                </div>

                <div className="divide-y divide-border">
                  {group.buttons.map((button) => {
                    const value = settings[`btn_${button.key}`] ?? '';
                    const tooLong = value.length > BUTTON_LIMIT;

                    return (
                      <div
                        key={button.key}
                        className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-start"
                      >
                        <div className="md:w-56">
                          <Label htmlFor={`btn_${button.key}`}>{button.label}</Label>
                          {button.where && (
                            <p className="mt-2 text-[12px] leading-snug text-text-secondary">
                              {button.where}
                            </p>
                          )}
                          {changed.includes(`btn_${button.key}`) && (
                            <Badge variant="warning" className="mt-2">
                              Unsaved
                            </Badge>
                          )}
                        </div>

                        <div className="flex-1">
                          <Input
                            id={`btn_${button.key}`}
                            value={value}
                            aria-invalid={tooLong || undefined}
                            onChange={(event) => setField(`btn_${button.key}`, event.target.value)}
                          />
                          <p
                            className={cn(
                              'mt-2 font-mono text-[11px] tabular-nums',
                              tooLong ? 'text-danger' : 'text-titanium-700',
                            )}
                          >
                            {value.length} / {BUTTON_LIMIT}
                            {tooLong && ' — WhatsApp will cut this off'}
                          </p>
                        </div>

                        {/* What it looks like on the phone. */}
                        <div className="md:w-52">
                          <span
                            className={cn(
                              'inline-flex w-full items-center justify-center truncate rounded-lg border px-3 py-2 text-[13px]',
                              tooLong
                                ? 'border-danger/30 bg-danger-light text-danger'
                                : 'border-border bg-paper text-ink',
                            )}
                          >
                            {value.slice(0, BUTTON_LIMIT) || '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {/* ── Auto-replies ─────────────────────────────────────────────────── */}
      {area === 'replies' && (
        <Reveal delay={0.04}>
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                  Keyword auto-replies
                </h2>
                <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-text-secondary">
                  When a customer’s message contains any of the keywords, the bot
                  sends that answer instead of the support menu. Keywords are
                  matched anywhere in the message and are not case sensitive.
                </p>
              </div>

              <Button onClick={() => setFaqDialog({})}>
                <Plus />
                Add auto-reply
              </Button>
            </div>

            {faqs.length > 0 && (
              <div className="border-b border-border px-5 py-3">
                <div className="relative max-w-xs">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-titanium-700"
                  />
                  <Input
                    value={faqSearch}
                    onChange={(event) => setFaqSearch(event.target.value)}
                    placeholder="Search keywords or answers"
                    aria-label="Search auto-replies"
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            {visibleFaqs.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <p className="font-heading text-base font-bold uppercase tracking-tight text-ink">
                  {faqs.length === 0 ? 'No auto-replies yet' : 'Nothing matches that search'}
                </p>
                <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed text-text-secondary">
                  {faqs.length === 0
                    ? 'Add one for a question you answer often — pricing, location, lead times. The bot will answer it instantly instead of handing the person a menu.'
                    : 'Try a different word, or clear the search to see all of them.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visibleFaqs.map((faq) => (
                  <li key={faq.id} className="px-5 py-4 transition-colors hover:bg-paper">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          {(faq.keywords || '')
                            .split(',')
                            .map((word) => word.trim())
                            .filter(Boolean)
                            .map((word) => (
                              <Badge key={word} variant="secondary">
                                {word}
                              </Badge>
                            ))}
                        </div>

                        <p className="mt-3 max-w-[72ch] whitespace-pre-wrap text-[13px] leading-relaxed text-body-text">
                          {faq.answer}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Edit the auto-reply for ${faq.keywords}`}
                          title="Edit"
                          onClick={() => setFaqDialog(faq)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="destructive-outline"
                          aria-label={`Delete the auto-reply for ${faq.keywords}`}
                          title="Delete"
                          onClick={() => setConfirmDeleteFaq(faq)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      )}

      {/* ── Save bar ─────────────────────────────────────────────────────── */}
      {/* Only appears when something is actually different, and names how many
          messages are about to change rather than saying "unsaved changes". */}
      {changed.length > 0 && area !== 'replies' && (
        <div className="sticky bottom-0 z-20 mt-8 -mx-5 border-t border-border bg-white/95 px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
            <p className="text-[13px] text-body-text">
              <span className="font-medium text-ink">
                {changed.length} {changed.length === 1 ? 'message' : 'messages'}
              </span>{' '}
              edited and not yet live.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDiscard} disabled={saving}>
                <X />
                Discard changes
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save />
                {saving ? 'Saving' : 'Save and go live'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ dialog ───────────────────────────────────────────────────── */}
      <Dialog open={!!faqDialog} onClose={() => setFaqDialog(null)} labelledBy="faq-dialog" size="lg">
        <DialogHeader
          id="faq-dialog"
          eyebrow="Auto-reply"
          title={faqDialog?.id ? 'Edit auto-reply' : 'Add an auto-reply'}
          description="The bot answers instantly when a customer’s message contains one of these keywords."
          onClose={() => setFaqDialog(null)}
        />
        <form onSubmit={handleFaqSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-keywords">Keywords</Label>
              <Input
                id="faq-keywords"
                name="keywords"
                required
                defaultValue={faqDialog?.keywords || ''}
                placeholder="price, cost, quotation, how much"
              />
              <p className="text-[12px] leading-relaxed text-text-secondary">
                Separate with commas. Matched anywhere in the message and not
                case sensitive, so “price” also catches “What is the pricing?”.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea
                id="faq-answer"
                name="answer"
                required
                rows={6}
                defaultValue={faqDialog?.answer || ''}
                placeholder="Pricing depends on scope, so we quote per project. Share your requirement and an engineer will come back with a written proposal within two working days."
              />
              <FormattingHint />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFaqDialog(null)}>
              Cancel
            </Button>
            <Button type="submit">{faqDialog?.id ? 'Save changes' : 'Add auto-reply'}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
};

/** One editable message, with its rendered result beside it. */
const MessageField = ({ field, value, imageValue, dirty, onChange, onInsert }) => (
  <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-[15px] font-bold uppercase tracking-tight text-ink">
            {field.label}
          </h3>
          {dirty && <Badge variant="warning">Unsaved</Badge>}
        </div>
        {field.help && (
          <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-text-secondary">
            {field.help}
          </p>
        )}
        {field.placeholders?.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="spec-label">Accepts</span>
            {field.placeholders.map((name) => (
              <button
                key={name}
                type="button"
                title={`Insert {{${name}}}`}
                onClick={() => onInsert(field.key, `{{${name}}}`)}
                className="rounded-full border border-border bg-paper px-2.5 py-0.5 font-mono text-[11px] text-titanium-700 transition-colors hover:border-ink hover:text-ink"
              >
                {`{{${name}}}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

    <div
      className={cn(
        'gap-6 p-5',
        field.imageOnly || field.plain ? 'block' : 'grid grid-cols-1 lg:grid-cols-2',
      )}
    >
      {field.plain ? (
        <div className="space-y-2">
          <Label htmlFor={field.key}>Value</Label>
          {field.multiline ? (
            <Textarea
              id={field.key}
              rows={4}
              value={value}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="font-mono text-[12px] leading-relaxed"
            />
          ) : (
            <Input
              id={field.key}
              value={value}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="sm:max-w-[20rem]"
            />
          )}
        </div>
      ) : field.imageOnly ? (
        <div className="space-y-2">
          <Label htmlFor={field.key}>Image URL</Label>
          <Input
            id={field.key}
            value={value}
            onChange={(event) => onChange(field.key, event.target.value)}
            placeholder="https://…"
          />
        </div>
      ) : (
      <div className="space-y-2">
        <Label htmlFor={field.key}>Message</Label>
        <Textarea
          id={field.key}
          rows={10}
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          className="font-mono text-[12px] leading-relaxed"
        />
        <FormattingHint />

        {field.image && (
          <div className="space-y-2 pt-2">
            <Label htmlFor={field.image}>Image URL</Label>
            <Input
              id={field.image}
              value={imageValue}
              onChange={(event) => onChange(field.image, event.target.value)}
              placeholder="https://…"
            />
          </div>
        )}
      </div>

      )}

      {!field.imageOnly && !field.plain && (
        <WhatsAppPreview
          message={value}
          image={imageValue || undefined}
          empty="Type a message to see it here."
        />
      )}
    </div>
  </div>
);

export default BotConfig;
