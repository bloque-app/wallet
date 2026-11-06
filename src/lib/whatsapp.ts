/** `wa.me` deep link that opens a chat with `number` and a prefilled `text`. */
export function buildWhatsAppUrl(number: string, text: string) {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
