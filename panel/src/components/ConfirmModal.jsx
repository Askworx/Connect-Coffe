import React from 'react';
import { AlertCircle } from 'lucide-react';

import { Dialog, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

const THEMES = {
  danger: { tile: 'bg-danger-light text-danger', variant: 'destructive', eyebrow: 'Destructive' },
  success: { tile: 'bg-success-light text-success', variant: 'success', eyebrow: 'Confirm' },
  info: { tile: 'bg-champagne-100 text-ink', variant: 'default', eyebrow: 'Confirm' },
};

/**
 * A decision the operator cannot take back. It says plainly what will happen
 * and puts the reversible option (Cancel) first, so the destructive button is
 * never the one under the thumb by default.
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  type = 'danger',
}) => {
  const theme = THEMES[type] || THEMES.info;

  return (
    <Dialog open={!!isOpen} onClose={onClose} size="sm" labelledBy="confirm-title">
      <DialogBody className="px-8 pb-2 pt-8">
        <div className={`flex size-12 items-center justify-center rounded-xl ${theme.tile}`}>
          <AlertCircle className="size-6" />
        </div>

        <p className="eyebrow mt-6">{theme.eyebrow}</p>

        <h2
          id="confirm-title"
          className="mt-2 font-heading text-2xl font-extrabold uppercase tracking-tight text-ink"
        >
          {title}
        </h2>

        {message && (
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-body-text">{message}</p>
        )}
      </DialogBody>

      <DialogFooter className="border-t-0 bg-white px-8 pb-8 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          variant={theme.variant}
          onClick={() => {
            onConfirm?.();
            onClose?.();
          }}
          className="flex-1"
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default ConfirmModal;
