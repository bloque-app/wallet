import { describe, expect, test } from 'bun:test';
import { buildSupportMailto } from './support';

describe('buildSupportMailto', () => {
  test('encodes subject and body for the support inbox', () => {
    expect(
      buildSupportMailto('Problema con la orden 123', 'Hola, ayuda & gracias'),
    ).toBe(
      'mailto:soporte@bloque.team?subject=Problema%20con%20la%20orden%20123&body=Hola%2C%20ayuda%20%26%20gracias',
    );
  });

  test('omits the body when none is given', () => {
    expect(buildSupportMailto('Ayuda')).toBe(
      'mailto:soporte@bloque.team?subject=Ayuda',
    );
  });
});
