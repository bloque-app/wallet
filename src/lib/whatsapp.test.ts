import { describe, expect, test } from 'bun:test';
import { buildWhatsAppUrl } from './whatsapp';

describe('buildWhatsAppUrl', () => {
  test('strips non-digits from the number', () => {
    expect(buildWhatsAppUrl('+57 300-123 4567', 'Hola')).toBe(
      'https://wa.me/573001234567?text=Hola',
    );
  });

  test('encodes the prefilled text', () => {
    expect(buildWhatsAppUrl('573001234567', 'Hola, soy a+b@x.co')).toBe(
      'https://wa.me/573001234567?text=Hola%2C%20soy%20a%2Bb%40x.co',
    );
  });
});
