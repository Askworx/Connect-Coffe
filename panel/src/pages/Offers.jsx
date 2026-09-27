import React, { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle2, Gift, Image as ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';

import { getOffers, createOffer, updateOffer, deleteOffer, uploadImage } from '../api';

import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WhatsAppPreview, { FormattingHint } from '../components/WhatsAppPreview';
import { Reveal } from '../components/motion/Reveal';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Tabs } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../components/ui/dialog';

// Mirrors validateOffer and maxOffersShown in the bot's offers.go.
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 700;
const MAX_SHOWN = 5;
const charCount = (text) => [...text].length;

const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

// Uploaded photos are saved as "/uploads/<file>" so they keep working if the
// bot moves host; the panel needs the full address to show them.
const photoSrc = (url) => (url && url.startsWith('/uploads/') ? `${API_BASE}/api${url}` : url);

const SOURCE_TABS = [
  { value: 'none', label: 'No photo' },
  { value: 'local', label: 'Upload' },
  { value: 'url', label: 'Link' },
];

const emptyForm = () => ({
  id: 0,
  title: '',
  description: '',
  image_url: '',
  active: true,
  sort_order: 0,
  ends_on: '',
  localFile: null,
});

const hasEnded = (offer) => offer.ends_at && parseISO(offer.ends_at) <= new Date();

function offerStatus(offer) {
  if (!offer.active) return { label: 'Off', variant: 'muted' };
  if (hasEnded(offer)) return { label: 'Ended', variant: 'warning' };
  return { label: 'Live', variant: 'success' };
}

// The caption the bot builds in offerCaption, for the preview.
function previewCaption(form) {
  const parts = [form.title.trim() ? `*${form.title.trim()}*` : ''];
  if (form.description.trim()) parts.push(form.description.trim());
  if (form.ends_on) parts.push(`⏳ Until ${format(parseISO(form.ends_on), 'd MMM')}`);
  return parts.filter(Boolean).join('\n\n');
}

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [source, setSource] = useState('none');
  const [localPreview, setLocalPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'info' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getOffers();
      setOffers(data || []);
      setLoadError('');
    } catch (err) {
      console.error(err);
      setLoadError('The offers could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => localPreview && URL.revokeObjectURL(localPreview), [localPreview]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openEditor = (offer) => {
    setErrors({});
    setLocalPreview('');
    if (offer) {
      setForm({
        ...emptyForm(),
        id: offer.id,
        title: offer.title,
        description: offer.description,
        image_url: offer.image_url,
        active: offer.active,
        sort_order: offer.sort_order,
        ends_on: offer.ends_at ? format(parseISO(offer.ends_at), 'yyyy-MM-dd') : '',
      });
      setSource(offer.image_url ? (offer.image_url.startsWith('/uploads/') ? 'local' : 'url') : 'none');
    } else {
      setForm(emptyForm());
      setSource('none');
    }
    setEditorOpen(true);
  };

  const chooseFile = (file) => {
    if (!file) return;
    setField('localFile', file);
    setLocalPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Give the offer a title.';
    else if (charCount(form.title.trim()) > TITLE_LIMIT) next.title = `Keep it to ${TITLE_LIMIT} characters.`;
    if (charCount(form.description.trim()) > DESCRIPTION_LIMIT) {
      next.description = `Keep it to ${DESCRIPTION_LIMIT} characters.`;
    }
    if (source === 'url' && !/^https?:\/\//.test(form.image_url.trim())) {
      next.image = 'Paste a link starting with https://.';
    }
    if (source === 'local' && !form.localFile && !form.image_url.startsWith('/uploads/')) {
      next.image = 'Choose a photo to upload.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      let imageURL = '';
      if (source === 'url') imageURL = form.image_url.trim();
      if (source === 'local') {
        imageURL = form.image_url;
        if (form.localFile) {
          const { data } = await uploadImage(form.localFile);
          imageURL = data.url;
        }
      }
      // The offer runs to the end of the chosen day, café time.
      const endsAt = form.ends_on ? new Date(`${form.ends_on}T23:59:59+05:30`).toISOString() : null;
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        image_url: imageURL,
        active: form.active,
        sort_order: Number(form.sort_order) || 0,
        ends_at: endsAt,
      };
      if (form.id) await updateOffer(form.id, payload);
      else await createOffer(payload);
      setEditorOpen(false);
      load();
    } catch (err) {
      console.error(err);
      setModal({
        open: true,
        title: 'Not saved',
        message: err.response?.data || 'The offer was not saved. Check the fields and try again.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (offer) => {
    const next = { ...offer, active: !offer.active };
    setOffers((list) => list.map((o) => (o.id === offer.id ? next : o)));
    try {
      await updateOffer(offer.id, next);
    } catch (err) {
      console.error(err);
      setOffers((list) => list.map((o) => (o.id === offer.id ? offer : o)));
      setModal({ open: true, title: 'Not changed', message: 'The offer was not switched. Try again.', type: 'error' });
    }
  };

  const handleDelete = async () => {
    const offer = confirmDelete;
    if (!offer) return;
    try {
      await deleteOffer(offer.id);
      load();
    } catch (err) {
      console.error(err);
      setModal({ open: true, title: 'Not deleted', message: 'Refresh the page and try again.', type: 'error' });
    }
  };

  const liveCount = offers.filter((o) => o.active && !hasEnded(o)).length;
  const previewImage =
    source === 'local' ? localPreview || photoSrc(form.image_url) : source === 'url' ? form.image_url.trim() : '';

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Offers"
        intro="What customers see when they tap 🎁 Offers in WhatsApp. Switch an offer on to show it, off to hide it. Nothing is sent to anyone until they ask."
        action={
          <Button onClick={() => openEditor(null)}>
            <Plus />
            New offer
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border bg-white px-4 py-3">
        <p className="text-[13px] font-medium text-ink">
          Live now: <span className="tabular-nums text-primary">{liveCount}</span>
        </p>
        <p className="text-[12px] leading-relaxed text-text-secondary">
          A customer gets up to {MAX_SHOWN} live offers, lowest position number first.
          {liveCount > MAX_SHOWN && ` ${liveCount - MAX_SHOWN} will not be shown until others are switched off.`}
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

      {loading && offers.length === 0 && (
        <span className="mx-auto my-16 block size-6 animate-spin rounded-full border-2 border-line border-t-ink" />
      )}

      {!loading && offers.length === 0 && !loadError && (
        <Card className="px-5 py-16 text-center">
          <Gift aria-hidden="true" className="mx-auto size-6 text-titanium-300" />
          <p className="mt-3 font-heading text-base font-bold uppercase tracking-tight text-ink">No offers yet</p>
          <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-text-secondary">
            Add one with “New offer”. Until then, customers who tap Offers are told nothing is running.
          </p>
        </Card>
      )}

      <Reveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => {
            const status = offerStatus(offer);
            return (
              <Card key={offer.id} className="flex flex-col overflow-hidden">
                {offer.image_url ? (
                  <img
                    src={photoSrc(offer.image_url)}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full bg-paper object-cover"
                  />
                ) : (
                  <span className="flex aspect-[4/3] w-full items-center justify-center bg-paper text-titanium-700">
                    <ImageIcon className="size-6" />
                  </span>
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-ink">{offer.title}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  {offer.description && (
                    <p className="line-clamp-3 whitespace-pre-line text-[13px] leading-relaxed text-text-secondary">
                      {offer.description}
                    </p>
                  )}
                  <p className="text-[12px] text-text-secondary">
                    Position {offer.sort_order}
                    {offer.ends_at && ` · until ${format(parseISO(offer.ends_at), 'd MMM yyyy')}`}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
                    <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      <Switch
                        checked={offer.active}
                        onCheckedChange={() => toggleActive(offer)}
                        aria-label={`Show “${offer.title}” to customers`}
                      />
                      {offer.active ? 'On' : 'Off'}
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        aria-label={`Edit “${offer.title}”`}
                        onClick={() => openEditor(offer)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="destructive-outline"
                        size="icon-xs"
                        aria-label={`Delete “${offer.title}”`}
                        onClick={() => setConfirmDelete(offer)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Reveal>

      {/* ── Editor ──────────────────────────────────────────────────────── */}

      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} size="xl" labelledBy="offer-editor-title">
        <DialogHeader
          id="offer-editor-title"
          eyebrow="Marketing"
          title={form.id ? 'Edit offer' : 'New offer'}
          description="The preview shows what a customer gets on tapping Offers."
          onClose={() => setEditorOpen(false)}
        />

        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
          <DialogBody>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="offer-title">Title</Label>
                  <Input
                    id="offer-title"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Buy one, get one free on cappuccinos"
                    aria-invalid={!!errors.title}
                  />
                  <p className="font-mono text-[11px] tabular-nums text-text-secondary">
                    {charCount(form.title)}/{TITLE_LIMIT}
                  </p>
                  {errors.title && <p role="alert" className="text-[12px] text-danger">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer-description">Details</Label>
                  <Textarea
                    id="offer-description"
                    rows={5}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Every weekday 3–5 PM. Show this message at the counter."
                    aria-invalid={!!errors.description}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <FormattingHint />
                    <p className="font-mono text-[11px] tabular-nums text-text-secondary">
                      {charCount(form.description)}/{DESCRIPTION_LIMIT}
                    </p>
                  </div>
                  {errors.description && (
                    <p role="alert" className="text-[12px] text-danger">{errors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Photo</Label>
                  <Tabs value={source} onValueChange={setSource} items={SOURCE_TABS} layoutId="offer-photo-source" />
                  {source === 'url' && (
                    <Input
                      aria-label="Photo link"
                      value={form.image_url.startsWith('/uploads/') ? '' : form.image_url}
                      onChange={(e) => setField('image_url', e.target.value)}
                      placeholder="https://…/photo.jpg"
                      aria-invalid={!!errors.image}
                    />
                  )}
                  {source === 'local' && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
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
                    </>
                  )}
                  {errors.image && <p role="alert" className="text-[12px] text-danger">{errors.image}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="offer-ends">Show until (optional)</Label>
                    <Input
                      id="offer-ends"
                      type="date"
                      value={form.ends_on}
                      onChange={(e) => setField('ends_on', e.target.value)}
                    />
                    <p className="text-[12px] text-text-secondary">Hidden automatically after this day.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offer-position">Position</Label>
                    <Input
                      id="offer-position"
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setField('sort_order', e.target.value)}
                    />
                    <p className="text-[12px] text-text-secondary">Lower numbers are shown first.</p>
                  </div>
                </div>

                <label className="flex items-center gap-3 text-[13px] font-medium text-ink">
                  <Switch checked={form.active} onCheckedChange={(v) => setField('active', v)} />
                  Show to customers
                </label>
              </div>

              <div>
                <p className="eyebrow mb-3">Preview</p>
                <WhatsAppPreview
                  message={previewCaption(form)}
                  image={previewImage}
                  buttons={[{ title: '🎉 Claim' }, { title: '🏠 Home' }]}
                  empty="Write a title to see the offer here."
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Add offer'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete this offer?"
        message={confirmDelete ? `“${confirmDelete.title}” will be removed. Switch it off instead to keep it for later.` : ''}
        confirmText="Delete offer"
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
