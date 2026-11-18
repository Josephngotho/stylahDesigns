export function buildWhatsAppLink(rawNumber: string | undefined, message: string): string | null {
  if (!rawNumber) return null;
  const digits = rawNumber.replace(/[^\d]/g, '');
  if (!digits || digits.length < 9) return null;
  const normalized = digits.startsWith('0') ? `254${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
