import { describe, expect, test } from 'bun:test';
import { buildReceiptPdf, receiptFileName } from './receipt';

describe('receiptFileName', () => {
  test('names the file after the movement reference', () => {
    expect(receiptFileName('tx_123-abc')).toBe('comprobante-tx_123-abc.pdf');
  });

  test('strips characters that are unsafe in file names', () => {
    expect(receiptFileName('did:bloque:tx/1')).toBe(
      'comprobante-didbloquetx1.pdf',
    );
  });

  test('falls back when the reference has no usable characters', () => {
    expect(receiptFileName('::')).toBe('comprobante-bloque.pdf');
  });
});

describe('buildReceiptPdf', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
  const pdf = buildReceiptPdf(jpeg, 1440, 1200);
  const text = new TextDecoder('latin1').decode(pdf);

  test('produces a one-page PDF that embeds the JPEG as-is', () => {
    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Count 1');
    expect(text).toContain('/Filter /DCTDecode');
    expect(text).toContain('/Width 1440 /Height 1200');
    expect(text).toContain(`/Length ${jpeg.length}`);
  });

  test('points startxref and every xref entry at the right byte offsets', () => {
    const startxref = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');

    const entries = [...text.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) =>
      Number(m[1]),
    );
    expect(entries).toHaveLength(5);
    entries.forEach((offset, index) => {
      expect(text.slice(offset, offset + 8)).toBe(`${index + 1} 0 obj\n`);
    });
  });
});
