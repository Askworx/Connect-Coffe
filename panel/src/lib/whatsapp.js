export const QR_MESSAGE = 'Hi';

const digits = (s) => (s || '').replace(/\D/g, '');


export const buildWhatsAppLink = (number) => {
  const d = digits(number);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(QR_MESSAGE)}` : '';
};
