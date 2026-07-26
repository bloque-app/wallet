import { describe, expect, test } from 'bun:test';
import {
  formatAmount,
  formatCOP,
  formatKSM,
  formatPolygonAddress,
  formatUSD,
  getAssetPrecision,
  getMovementLabel,
  sortBalancesForDisplay,
} from './formatters';

describe('formatCOP', () => {
  test('formats with no decimal places', () => {
    // es-CO renders a non-breaking space (U+00A0) between symbol and amount.
    expect(formatCOP(500000)).toBe('$ 500.000');
  });

  test('formats zero', () => {
    expect(formatCOP(0)).toBe('$ 0');
  });
});

describe('formatUSD', () => {
  test('formats with two decimal places', () => {
    expect(formatUSD(26.955492)).toBe('$26.96');
  });
});

describe('formatKSM', () => {
  test('formats with four decimal places and a KSM suffix', () => {
    expect(formatKSM(1.5)).toBe('1.5000 KSM');
  });

  test('formats zero', () => {
    expect(formatKSM(0)).toBe('0.0000 KSM');
  });
});

describe('formatAmount', () => {
  test('dispatches to the right formatter per asset', () => {
    expect(formatAmount('COP', 1000)).toBe(formatCOP(1000));
    expect(formatAmount('USD', 10)).toBe(formatUSD(10));
    expect(formatAmount('KSM', 2)).toBe(formatKSM(2));
  });
});

describe('getAssetPrecision', () => {
  test('parses the precision suffix', () => {
    expect(getAssetPrecision('COPM/2')).toBe(2);
    expect(getAssetPrecision('DUSD/6')).toBe(6);
    expect(getAssetPrecision('KSM/12')).toBe(12);
  });

  test('defaults to 0 when the suffix is missing or invalid', () => {
    expect(getAssetPrecision('COPM')).toBe(0);
    expect(getAssetPrecision('COPM/not-a-number')).toBe(0);
  });
});

describe('formatPolygonAddress', () => {
  test('truncates long addresses to a head...tail form', () => {
    expect(
      formatPolygonAddress('0xd5e46B8b4a309b2BDAB9A0e60A2EBb3D915E1eCc'),
    ).toBe('0xd5e4...1eCc');
  });

  test('leaves short strings untouched', () => {
    expect(formatPolygonAddress('0x1234')).toBe('0x1234');
  });
});

describe('getMovementLabel', () => {
  test('labels a send differently by direction', () => {
    expect(getMovementLabel('send', 'incoming')).toBe('Transferencia recibida');
    expect(getMovementLabel('send', 'outgoing')).toBe('Transferencia enviada');
  });

  test('labels non-directional movement types', () => {
    expect(getMovementLabel('topup')).toBe('Recarga');
    expect(getMovementLabel('withdraw')).toBe('Retiro');
    expect(getMovementLabel('convert')).toBe('Conversión');
    expect(getMovementLabel('card')).toBe('Pago con tarjeta');
  });
});

describe('sortBalancesForDisplay', () => {
  test('hides KSM entirely — not a balance this app surfaces to users', () => {
    const result = sortBalancesForDisplay([
      { asset: 'COPM/2', current: '500000', pending: '0' },
      { asset: 'KSM/12', current: '1500000000000', pending: '0' },
      { asset: 'DUSD/6', current: '10000000', pending: '0' },
    ]);

    expect(result.map((b) => b.asset)).not.toContain('KSM/12');
  });

  test('puts USD first, keeping the rest in their original relative order', () => {
    const result = sortBalancesForDisplay([
      { asset: 'COPM/2', current: '500000', pending: '0' },
      { asset: 'DUSD/6', current: '10000000', pending: '0' },
    ]);

    expect(result.map((b) => b.asset)).toEqual(['DUSD/6', 'COPM/2']);
  });

  test('an all-KSM balance list collapses to empty', () => {
    const result = sortBalancesForDisplay([
      { asset: 'KSM/12', current: '1', pending: '0' },
    ]);

    expect(result).toEqual([]);
  });

  test('a list with no USD keeps its original order (stable sort)', () => {
    const result = sortBalancesForDisplay([
      { asset: 'COPM/2', current: '1', pending: '0' },
      { asset: 'KSM/12', current: '2', pending: '0' },
    ]);

    expect(result.map((b) => b.asset)).toEqual(['COPM/2']);
  });
});
