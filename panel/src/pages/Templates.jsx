import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, FileCheck2, Plus, RefreshCw, Trash2, X } from 'lucide-react';

import {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  deleteWhatsAppTemplate,
  setWhatsAppTemplateActions,
  uploadImage,
} from '../api';
import { BUTTON_ACTIONS, actionLabel, guessAction } from '../lib/buttonActions';

import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WhatsAppPreview, { FormattingHint } from '../components/WhatsAppPreview';
import { Reveal } from '../components/motion/Reveal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../components/ui/dialog';

// Mirrors templateDraft.check in the bot's template_submit.go.
const BODY_LIMIT = 1024;
const BUTTON_LIMIT = 25;
const MAX_BUTTONS = 3;
const charCount = (text) => [...text].length;

// Meta names templates in lowercase with underscores; the operator types a
// normal title and this turns it into one.
const toTemplateName = (title) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

// Meta's statuses, in the café's words.
function templateStatus(t) {
  switch (t.status) {
    case 'APPROVED':
      return { label: 'Approved', variant: 'success' };
    case 'PENDING':
    case 'IN_APPEAL':
      return { label: 'In review', variant: 'warning' };
    case 'REJECTED':
      return { label: 'Rejected', variant: 'danger' };
    case 'PAUSED':
      return { label: 'Paused', variant: 'muted' };
    default:
      return { label: (t.status || 'Unknown').toLowerCase(), variant: 'muted' };
  }
}

const REJECTION = {
  INVALID_FORMAT: 'The text or layout breaks one of WhatsApp’s formatting rules.',
  PROMOTIONAL: 'Meta judged it promotional in a category that does not allow that.',
  ABUSIVE_CONTENT: 'Meta judged the content as against its policies.',
  TAG_CONTENT_MISMATCH: 'The text did not match the marketing category.',
  SCAM: 'Meta flagged it as possibly misleading.',
};

const component = (t, type) => (t.components || []).find((c) => c.type === type);

const quickReplies = (t) => (component(t, 'BUTTONS')?.buttons || []).filter((b) => b.type === 'QUICK_REPLY');

const rejectionText = (t) =>
  t.status === 'REJECTED' && t.rejected_reason && t.rejected_reason !== 'NONE'
    ? REJECTION[t.rejected_reason] || t.rejected_reason
    : '';

const LANGUAGES = { en: 'English', en_US: 'English (US)', en_GB: 'English (UK)' };

const emptyForm = () => ({
  title: '',
  body: '',
  buttons: [
    { title: 'See Menu', action: 'view_menu' },
    { title: 'Address', action: 'visit' },
  ],
  localFile: null,
});

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [localPreview, setLocalPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const [viewing, setViewing] = useState(null);
  const [viewActions, setViewActions] = useState([]);
  const [savingActions, setSavingActions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'info' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getWhatsAppTemplates();
      setTemplates(data?.data || []);
      setLoadError(data?.error || '');
    } catch (err) {
      console.error(err);
      setLoadError('The templates could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Meta's answer can arrive any time; while something is in review, look
  // again every few minutes so the page never shows a stale status for long.
  const anyInReview = templates.some((t) => t.status === 'PENDING' || t.status === 'IN_APPEAL');
  useEffect(() => {
    if (!anyInReview) return undefined;
    const timer = setInterval(load, 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, [anyInReview, load]);

  useEffect(() => () => localPreview && URL.revokeObjectURL(localPreview), [localPreview]);

  // Opening a template loads what its buttons do; one made before actions
  // could be set starts blank so the choice is made on purpose.
  const openTemplate = (t) => {
    setViewing(t);
    setViewActions(quickReplies(t).map((_, i) => t.actions?.[i] || ''));
  };
  const actionsChanged =
    !!viewing && viewActions.some((a, i) => a !== (viewing.actions?.[i] || ''));

  const saveViewActions = async () => {
    setSavingActions(true);
    try {
      await setWhatsAppTemplateActions(viewing.name, viewActions);
      const saved = { ...viewing, actions: viewActions };
      setViewing(saved);
      setTemplates((list) => list.map((t) => (t.name === saved.name ? saved : t)));
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Not saved',
        message: err.response?.data?.error || 'The button actions were not saved. Try again.',
        type: 'error',
      });
    } finally {
      setSavingActions(false);
    }
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setButton = (i, key, value) =>
    setForm((f) => ({ ...f, buttons: f.buttons.map((b, j) => (j === i ? { ...b, [key]: value } : b)) }));

  // A sent template cannot be edited, so "edit" means starting a new one from
  // its text; the photo has to be chosen again.
  const openEditor = (from) => {
    setForm(
      from
        ? {
            ...emptyForm(),
            body: component(from, 'BODY')?.text || '',
            buttons: quickReplies(from)
              .map((b, i) => ({ title: b.text, action: from.actions?.[i] || guessAction(b.text) }))
              .slice(0, MAX_BUTTONS),
          }
        : emptyForm(),
    );
    setErrors({});
    setLocalPreview('');
    setEditorOpen(true);
  };

  const chooseFile = (file) => {
    if (!file) return;
    setField('localFile', file);
    setLocalPreview(URL.createObjectURL(file));
  };

  const name = toTemplateName(form.title);
  const taken = templates.some((t) => t.name === name);

  const validate = () => {
    const next = {};
    if (!name) next.title = 'Give the template a name.';
    else if (taken) next.title = 'A template with this name already exists. Choose another.';
    if (!form.body.trim()) next.body = 'Write the message.';
    else if (charCount(form.body.trim()) > BODY_LIMIT) next.body = `Keep it to ${BODY_LIMIT} characters.`;
    else if (form.body.includes('{{')) next.body = 'Remove the {{ }}; the bot cannot fill them in.';
    if (!form.localFile) next.image = 'Choose a photo.';
    else if (!/^image\/(jpeg|png)$/.test(form.localFile.type)) next.image = 'Use a JPG or PNG photo.';
    else if (form.localFile.size > 5 * 1024 * 1024) next.image = 'Use a photo under 5 MB.';
    const buttons = form.buttons.map((b) => b.title.trim());
    if (buttons.some((b) => !b)) next.buttons = 'Fill in every button, or remove the empty one.';
    else if (buttons.some((b) => charCount(b) > BUTTON_LIMIT)) next.buttons = `Keep each button to ${BUTTON_LIMIT} characters.`;
    else if (new Set(buttons).size !== buttons.length) next.buttons = 'Two buttons cannot have the same text.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSending(true);
    try {
      const { data: upload } = await uploadImage(form.localFile);
      await createWhatsAppTemplate({
        name,
        body: form.body.trim(),
        image_url: upload.url,
        buttons: form.buttons.map((b) => b.title.trim()),
        actions: form.buttons.map((b) => b.action),
      });
      setEditorOpen(false);
      setModal({
        open: true,
        title: 'Sent to Meta',
        message:
          'Meta usually reviews a template within 24 hours. Once it shows Approved here, pick it under Broadcasts → Who gets it → Everyone.',
        type: 'success',
      });
      load();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Not sent',
        message: err.response?.data?.error || 'The template was not sent. Check the fields and try again.',
        type: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    const t = confirmDelete;
    if (!t) return;
    try {
      await deleteWhatsAppTemplate(t.name);
      load();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Not deleted',
        message: err.response?.data?.error || 'Refresh the page and try again.',
        type: 'error',
      });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Templates"
        intro="WhatsApp only lets you message people who wrote to you in the last 24 hours. To reach everyone else, Meta must first approve the message as a template. Write one here and it goes to Meta for review."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => load()} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
              Refresh
            </Button>
            <Button onClick={() => openEditor(null)}>
              <Plus />
              New template
            </Button>
          </div>
        }
      />

      <div className="mb-6 rounded-xl border border-border bg-white px-4 py-3 text-[12px] leading-relaxed text-text-secondary">
        <p>
          <span className="font-medium text-ink">One template works for many offers.</span> The photo is
          replaced by each offer’s own poster when it is sent; only the text stays the same. Make a new
          template when the wording needs to change. Meta charges for each template message delivered.
        </p>
      </div>

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
              onClick={() => load()}
              className="mt-1 text-[13px] font-medium text-danger underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {loading && templates.length === 0 && (
        <span className="mx-auto my-16 block size-6 animate-spin rounded-full border-2 border-line border-t-ink" />
      )}

      {!loading && templates.length === 0 && !loadError && (
        <Card className="px-5 py-16 text-center">
          <FileCheck2 aria-hidden="true" className="mx-auto size-6 text-titanium-300" />
          <p className="mt-3 font-heading text-base font-bold uppercase tracking-tight text-ink">No templates yet</p>
          <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
            Add one with “New template”. Until one is approved, offers reach only people who messaged in the
            last 24 hours.
          </p>
        </Card>
      )}

      <Reveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => {
            const status = templateStatus(t);
            const body = component(t, 'BODY')?.text || '';
            const buttons = quickReplies(t).map((b) => b.text);
            const reason = rejectionText(t);
            return (
              <Card
                key={t.id || t.name}
                role="button"
                tabIndex={0}
                aria-label={`Open ${t.name}`}
                onClick={() => openTemplate(t)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    openTemplate(t);
                  }
                }}
                className="flex cursor-pointer flex-col gap-3 p-4 transition-shadow hover:shadow-lift focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="break-all font-mono text-[13px] font-medium text-ink">{t.name}</p>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                {reason && (
                  <p className="rounded-lg bg-danger-light px-3 py-2 text-[12px] leading-relaxed text-danger">
                    {reason} Change the wording and send a new template.
                  </p>
                )}
                {t.problem && t.status === 'APPROVED' && (
                  <p className="text-[12px] text-warning">Cannot be used for offers: {t.problem}.</p>
                )}
                <p className="line-clamp-5 whitespace-pre-line text-[13px] leading-relaxed text-text-secondary">
                  {body}
                </p>
                {buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {buttons.map((b, i) => (
                      <span
                        key={b}
                        title={t.actions?.[i] ? actionLabel(t.actions[i]) : 'Not set yet: open the template to choose'}
                        className="rounded-md border border-border bg-paper px-2 py-1 text-[12px] text-primary"
                      >
                        {b}
                        <span className="text-text-secondary">
                          {' → '}
                          {t.actions?.[i] ? actionLabel(t.actions[i]).replace(/^Show /, '') : 'not set'}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[12px] font-medium text-primary">View</span>
                  <Button
                    variant="destructive-outline"
                    size="icon-xs"
                    aria-label={`Delete ${t.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(t);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Reveal>

      {/* ── One template ────────────────────────────────────────────────── */}

      <Dialog open={!!viewing} onClose={() => setViewing(null)} size="xl" labelledBy="template-view-title">
        {viewing && (
          <>
            <DialogHeader
              id="template-view-title"
              eyebrow="Template"
              title={viewing.name}
              description="Meta does not allow changes to a sent template. To change the wording, start a new one from it."
              onClose={() => setViewing(null)}
            />
            <DialogBody>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Badge variant={templateStatus(viewing).variant}>{templateStatus(viewing).label}</Badge>
                    {(viewing.status === 'PENDING' || viewing.status === 'IN_APPEAL') && (
                      <p className="text-[12px] text-text-secondary">Meta usually answers within 24 hours.</p>
                    )}
                  </div>
                  {rejectionText(viewing) && (
                    <p className="rounded-lg bg-danger-light px-3 py-2 text-[13px] leading-relaxed text-danger">
                      {rejectionText(viewing)} Change the wording and send a new template.
                    </p>
                  )}
                  {viewing.problem && viewing.status === 'APPROVED' && (
                    <p className="text-[13px] text-warning">Cannot be used for offers: {viewing.problem}.</p>
                  )}
                  {viewing.status === 'APPROVED' && !viewing.problem && (
                    <p className="text-[13px] leading-relaxed text-text-secondary">
                      Ready to use: in Broadcasts, choose <span className="font-medium text-ink">Who gets it → Everyone</span>{' '}
                      and pick <code className="font-mono text-ink">{viewing.name}</code>. The offer’s own poster replaces
                      the sample photo.
                    </p>
                  )}
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
                    <dt className="text-text-secondary">Category</dt>
                    <dd className="text-ink">{(viewing.category || '').toLowerCase()}</dd>
                    <dt className="text-text-secondary">Language</dt>
                    <dd className="text-ink">{LANGUAGES[viewing.language] || viewing.language}</dd>
                    {viewing.id && (
                      <>
                        <dt className="text-text-secondary">Meta ID</dt>
                        <dd className="font-mono text-ink">{viewing.id}</dd>
                      </>
                    )}
                  </dl>
                  <div className="space-y-2">
                    <p className="eyebrow">Message</p>
                    <p className="whitespace-pre-wrap rounded-lg border border-border bg-paper px-3 py-2.5 text-[13px] leading-relaxed text-body-text">
                      {component(viewing, 'BODY')?.text}
                    </p>
                  </div>
                  {quickReplies(viewing).length > 0 && (
                    <div className="space-y-2">
                      <p className="eyebrow">What the buttons do</p>
                      <p className="text-[12px] text-text-secondary">
                        Saved here, not at Meta, so you can change it any time.
                      </p>
                      {quickReplies(viewing).map((b, i) => (
                        <div key={b.text} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-3">
                          <span className="truncate rounded-md border border-border bg-paper px-3 py-2 text-[13px] text-primary">
                            {b.text}
                          </span>
                          <Select
                            aria-label={`What ${b.text} does`}
                            value={viewActions[i] || ''}
                            onChange={(e) =>
                              setViewActions((list) => list.map((a, j) => (j === i ? e.target.value : a)))
                            }
                          >
                            {!viewActions[i] && <option value="">Choose what it does</option>}
                            {BUTTON_ACTIONS.map((action) => (
                              <option key={action.value} value={action.value}>
                                {action.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      ))}
                      {actionsChanged && (
                        <Button type="button" onClick={saveViewActions} disabled={savingActions || viewActions.some((a) => !a)}>
                          {savingActions ? 'Saving…' : 'Save button actions'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <p className="eyebrow mb-3">Preview</p>
                  <WhatsAppPreview
                    message={component(viewing, 'BODY')?.text || ''}
                    image={component(viewing, 'HEADER')?.example?.header_handle?.[0] || ''}
                    buttons={quickReplies(viewing).map((b) => ({ title: b.text }))}
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="destructive-outline"
                onClick={() => {
                  setConfirmDelete(viewing);
                  setViewing(null);
                }}
              >
                <Trash2 />
                Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const from = viewing;
                  setViewing(null);
                  openEditor(from);
                }}
              >
                <Copy />
                New template from this
              </Button>
              <Button type="button" onClick={() => setViewing(null)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* ── Editor ──────────────────────────────────────────────────────── */}

      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} size="xl" labelledBy="template-editor-title">
        <DialogHeader
          id="template-editor-title"
          eyebrow="Marketing"
          title="New template"
          description="Sent to Meta for review. It cannot be edited once sent."
          onClose={() => setEditorOpen(false)}
        />

        <form onSubmit={handleSend} className="flex min-h-0 flex-1 flex-col">
          <DialogBody>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="template-title">Name</Label>
                  <Input
                    id="template-title"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Weekend special"
                    aria-invalid={!!errors.title}
                  />
                  <p className="text-[12px] text-text-secondary">
                    Only you see this.{name && <> Saved as <code className="font-mono text-ink">{name}</code>.</>}
                  </p>
                  {errors.title && <p role="alert" className="text-[12px] text-danger">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Photo</Label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    aria-label="Photo file"
                    onChange={(e) => chooseFile(e.target.files[0])}
                    className="w-full rounded-lg border border-dashed border-line-strong bg-paper p-4 text-[13px] text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-[12px] file:font-medium file:text-white"
                  />
                  {form.localFile && (
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-success">
                      <CheckCircle2 aria-hidden="true" className="size-3.5" />
                      {form.localFile.name}
                    </p>
                  )}
                  <p className="text-[12px] text-text-secondary">
                    A sample for Meta’s reviewers, JPG or PNG. Each offer sends its own poster in its place.
                  </p>
                  {errors.image && <p role="alert" className="text-[12px] text-danger">{errors.image}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-body">Message</Label>
                  <Textarea
                    id="template-body"
                    rows={7}
                    value={form.body}
                    onChange={(e) => setField('body', e.target.value)}
                    placeholder={'☕ *Weekend Special* at Connect!\n\nAny two coffees for ₹299, Saturday and Sunday.\n\n📸 instagram.com/connect_roasters'}
                    aria-invalid={!!errors.body}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <FormattingHint />
                    <p className="font-mono text-[11px] tabular-nums text-text-secondary">
                      {charCount(form.body)}/{BODY_LIMIT}
                    </p>
                  </div>
                  {errors.body && <p role="alert" className="text-[12px] text-danger">{errors.body}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Buttons</Label>
                  <p className="text-[12px] text-text-secondary">
                    The text goes to Meta. What each button does is saved here, and you can change it later from the
                    template.
                  </p>
                  {form.buttons.map((b, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-2">
                      <Input
                        aria-label={`Button ${i + 1} text`}
                        value={b.title}
                        maxLength={BUTTON_LIMIT}
                        onChange={(e) => setButton(i, 'title', e.target.value)}
                      />
                      <Select
                        aria-label={`Button ${i + 1} action`}
                        value={b.action}
                        onChange={(e) => setButton(i, 'action', e.target.value)}
                      >
                        {BUTTON_ACTIONS.map((action) => (
                          <option key={action.value} value={action.value}>
                            {action.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Remove button ${i + 1}`}
                        onClick={() => setField('buttons', form.buttons.filter((_, j) => j !== i))}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                  {form.buttons.length < MAX_BUTTONS && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setField('buttons', [
                          ...form.buttons,
                          {
                            title: '',
                            action:
                              BUTTON_ACTIONS.find((a) => !form.buttons.some((b) => b.action === a.value))?.value ||
                              BUTTON_ACTIONS[0].value,
                          },
                        ])
                      }
                    >
                      <Plus />
                      Add button
                    </Button>
                  )}
                  {errors.buttons && <p role="alert" className="text-[12px] text-danger">{errors.buttons}</p>}
                </div>

                <div className="rounded-lg border border-border bg-paper px-3 py-2.5 text-[12px] leading-relaxed text-text-secondary">
                  <p className="font-medium text-ink">Gets approved faster</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    <li>Say plainly what the offer is and when it runs.</li>
                    <li>Write links as plain text on their own line.</li>
                    <li>Avoid ALL CAPS, “URGENT” and lots of exclamation marks.</li>
                  </ul>
                </div>
              </div>

              <div>
                <p className="eyebrow mb-3">Preview</p>
                <WhatsAppPreview
                  message={form.body}
                  image={localPreview}
                  buttons={form.buttons.map((b) => ({ title: b.title }))}
                  empty="Write the message to see it here."
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Send to Meta for approval'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete this template?"
        message={
          confirmDelete
            ? `“${confirmDelete.name}” will be removed from WhatsApp. Offers scheduled with it will not reach people outside the 24-hour window, and Meta will not let you reuse the name for a while.`
            : ''
        }
        confirmText="Delete template"
      />

      <Modal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </>
  );
}
