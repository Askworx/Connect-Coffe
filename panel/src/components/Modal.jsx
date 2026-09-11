import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

import { Dialog, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

const TYPES = {
  success: {
    Icon: CheckCircle2,
    tile: 'bg-success-light text-success',
    eyebrow: 'Saved',
  },
  error: {
    Icon: AlertCircle,
    tile: 'bg-danger-light text-danger',
    eyebrow: 'Not saved',
  },
  info: {
    Icon: Info,
    tile: 'bg-champagne-100 text-ink',
    eyebrow: 'Notice',
  },
};

/** Result acknowledgement. One action, no decisions to make. */
const Modal = ({ isOpen, onClose, title, message, type = 'success' }) => {
  const config = TYPES[type] || TYPES.info;
  const { Icon } = config;

  return (
    <Dialog open={!!isOpen} onClose={onClose} size="sm" labelledBy="modal-title">
      <DialogBody className="px-8 pb-2 pt-8">
        <div className={`flex size-12 items-center justify-center rounded-xl ${config.tile}`}>
          <Icon className="size-6" />
        </div>

        <p className="eyebrow mt-6">{config.eyebrow}</p>

        <h2
          id="modal-title"
          className="mt-2 font-heading text-2xl font-extrabold uppercase tracking-tight text-ink"
        >
          {title}
        </h2>

        {message && (
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-body-text">{message}</p>
        )}
      </DialogBody>

      <DialogFooter className="border-t-0 bg-white px-8 pb-8 pt-4">
        <Button onClick={onClose} className="w-full">
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default Modal;
