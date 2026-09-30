import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';

import { Button } from './ui/button';
import { buildWhatsAppLink } from '../lib/whatsapp';

/** The counter QR code: scanning it opens WhatsApp with "Hi" pre-filled. */
export default function WhatsAppQRCode({ number }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const link = buildWhatsAppLink(number);

  useEffect(() => {
    if (!link || !canvasRef.current) return undefined;
    let cancelled = false;
    QRCode.toCanvas(canvasRef.current, link, { width: 220, margin: 1 }, (err) => {
      if (cancelled) return;
      if (err) console.error(err);
      setError(err ? 'Could not draw the QR code.' : '');
    });
    return () => {
      cancelled = true;
    };
  }, [link]);

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = 'connect-whatsapp-qr.png';
    a.click();
  };

  if (!link) {
    return (
      <p className="text-[13px] text-text-secondary">
        Enter a WhatsApp number to generate the QR code.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl border border-border bg-white p-4 shadow-card">
        <canvas ref={canvasRef} width={220} height={220} />
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <p className="max-w-xs break-all text-center font-mono text-[11px] text-text-secondary">
        {link}
      </p>
      <Button type="button" variant="outline" onClick={download}>
        <Download />
        Download PNG
      </Button>
    </div>
  );
}
