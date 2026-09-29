import { describe, expect, test } from 'bun:test';
import { selectShareableAlias } from './identity-alias';

describe('selectShareableAlias', () => {
  test('selects the active primary alias', () => {
    expect(
      selectShareableAlias([
        { alias: '+573001234567', status: 'active', is_primary: false },
        { alias: 'friend@example.com', status: 'active', is_primary: true },
      ]),
    ).toBe('friend@example.com');
  });

  test('does not expose inactive aliases', () => {
    expect(
      selectShareableAlias([
        {
          alias: 'old@example.com',
          status: 'inactive',
          is_primary: true,
        },
      ]),
    ).toBe('');
  });
});
