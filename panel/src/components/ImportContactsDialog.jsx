import React, { useMemo, useState } from 'react';
import { FileUp, Info } from 'lucide-react';

import { importContacts } from '../api';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/dialog';

const digits = (s) => (s || '').replace(/\D/g, '');

// A number the bot can store: 10 digits (Indian), 0 + 10 digits, or a full
// international number. The server normalises and checks again.
const looksValid = (phone) => {
  const d = digits(phone);
  return d.length === 10 || (d.length === 11 && d.startsWith('0')) || (d.length >= 11 && d.length <= 15);
};

/** Split one CSV line, honouring double quotes around a field. */
const splitLine = (line, delimiter) => {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
};

/** Contacts from a phone's .vcf export: one name and first number per card. */
const parseVCard = (text) =>
  text
    .split(/BEGIN:VCARD/i)
    .slice(1)
    .map((card) => ({
      name: (card.match(/^FN[^:]*:(.*)$/im)?.[1] || '').trim(),
      phone: (card.match(/^TEL[^:]*:(.*)$/im)?.[1] || '').trim(),
    }))
    .filter((c) => c.phone);

/**
 * Contacts from a CSV or pasted lines. A header row is used when it names the
 * columns (phone / mobile / number, and name); otherwise each row's number is
 * the cell with the most digits and its name the first other cell.
 */
const parseRows = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const first = lines[0];
  const delimiter = [',', ';', '\t'].reduce((best, d) =>
    first.split(d).length > first.split(best).length ? d : best,
  ',');
  const rows = lines.map((l) => splitLine(l, delimiter));

  const header = rows[0].map((c) => c.toLowerCase());
  const phoneCol = header.findIndex((c) => /phone|mobile|number|whatsapp|contact|cell/.test(c));
  const nameCol = header.findIndex((c) => /name/.test(c));
  if (phoneCol >= 0 && digits(rows[0][phoneCol]).length < 7) {
    return rows.slice(1).map((r) => ({ phone: r[phoneCol] || '', name: nameCol >= 0 ? r[nameCol] || '' : '' }));
  }

  return rows.map((r) => {
    let phoneIdx = 0;
    r.forEach((cell, i) => {
      if (digits(cell).length > digits(r[phoneIdx]).length) phoneIdx = i;
    });
    const name = r.find((cell, i) => i !== phoneIdx && cell && digits(cell).length < 7) || '';
    return { phone: r[phoneIdx] || '', name };
  });
};

const parse = (text, filename = '') =>
  /\.vcf$/i.test(filename) || /BEGIN:VCARD/i.test(text) ? parseVCard(text) : parseRows(text);

export default function ImportContactsDialog({ open, onClose, onImported }) {
  const [text, setText] = useState('');
  const [filename, setFilename] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const parsed = useMemo(() => {
    const seen = new Set();
    const all = parse(text, filename).filter((c) => {
      const key = digits(c.phone).slice(-10);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { valid: all.filter((c) => looksValid(c.phone)), invalid: all.filter((c) => !looksValid(c.phone)) };
  }, [text, filename]);

  const reset = () => {
    setText('');
    setFilename('');
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const readFile = (file) => {
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      setError('Excel files cannot be read directly — in Excel choose File → Save As → CSV, then pick that file.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setFilename(file.name);
      setText(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const submit = async () => {
    setImporting(true);
    setError('');
    try {
      const { data } = await importContacts(parsed.valid.map((c) => ({ phone: c.phone, name: c.name })));
      reset();
      onImported(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'The import did not go through. Try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} size="lg" labelledBy="import-contacts">
      <DialogHeader
        id="import-contacts"
        eyebrow="Contacts"
        title="Import contacts"
        description="Upload a CSV or a phone contacts file (.vcf), or paste one contact per line."
        onClose={close}
      />
      <DialogBody className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-light px-4 py-3">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-[13px] leading-relaxed text-body-text">
            Imported people receive offers <strong>after they message Connect</strong> — WhatsApp’s
            free 24-hour window starts with their message. Invite them with your WhatsApp link or a
            QR code at the counter. Only import people who agreed to hear from you.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-file">File</Label>
          <input
            id="import-file"
            type="file"
            accept=".csv,.txt,.vcf,.xlsx,.xls"
            onChange={(e) => readFile(e.target.files[0])}
            className="w-full rounded-lg border border-dashed border-line-strong bg-paper p-4 text-[13px] text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-[12px] file:font-medium file:text-white"
          />
          <p className="text-[12px] text-text-secondary">
            A CSV with columns like <code className="font-mono text-ink">Name, Phone</code> works, in
            any order. From Excel: File → Save As → CSV.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-paste">Or paste</Label>
          <Textarea
            id="import-paste"
            rows={5}
            value={filename ? '' : text}
            disabled={!!filename}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Priya Sharma, 98765 43210\nRahul, +91 91234 56789'}
            className="font-mono text-[12px]"
          />
          {filename && (
            <button type="button" onClick={reset} className="text-[12px] font-medium text-primary underline underline-offset-2">
              Clear {filename}
            </button>
          )}
        </div>

        {(parsed.valid.length > 0 || parsed.invalid.length > 0) && (
          <div className="rounded-xl border border-border bg-white">
            <p className="border-b border-border px-4 py-2.5 text-[13px] text-ink">
              <span className="font-medium tabular-nums">{parsed.valid.length}</span> ready to import
              {parsed.invalid.length > 0 && (
                <span className="text-danger">
                  {' '}· {parsed.invalid.length} skipped (not a phone number)
                </span>
              )}
            </p>
            <ul className="divide-y divide-border">
              {parsed.valid.slice(0, 5).map((c, i) => (
                <li key={i} className="flex justify-between gap-4 px-4 py-2 text-[13px]">
                  <span className="truncate text-ink">{c.name || 'No name'}</span>
                  <span className="font-mono text-[12px] text-text-secondary">{c.phone}</span>
                </li>
              ))}
              {parsed.valid.length > 5 && (
                <li className="px-4 py-2 text-[12px] text-text-secondary">
                  and {parsed.valid.length - 5} more
                </li>
              )}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={importing || parsed.valid.length === 0}>
          <FileUp />
          {importing
            ? 'Importing…'
            : `Import ${parsed.valid.length || ''} ${parsed.valid.length === 1 ? 'contact' : 'contacts'}`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
