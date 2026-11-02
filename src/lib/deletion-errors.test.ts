import { describe, expect, test } from 'bun:test';
import { BloqueAPIError } from '@bloque/sdk';
import { BrebKeyDeletionError } from '~/domain/accounts/breb-key-suggestions';
import {
  brebKeyDeletionRefusal,
  deletionErrorCode,
  pocketDeletionRefusal,
} from './deletion-errors';

describe('deletionErrorCode', () => {
  test('reads the code from SDK and wallet errors', () => {
    expect(
      deletionErrorCode(
        new BloqueAPIError('x', { code: 'E_ACCOUNT_HAS_BALANCE' }),
      ),
    ).toBe('E_ACCOUNT_HAS_BALANCE');
    expect(
      deletionErrorCode(
        new BrebKeyDeletionError('x', 'E_BREB_KEY_DELETION_FAILED'),
      ),
    ).toBe('E_BREB_KEY_DELETION_FAILED');
    expect(deletionErrorCode(new Error('E_DEFAULT_ACCOUNT_UNDELETABLE'))).toBe(
      'E_DEFAULT_ACCOUNT_UNDELETABLE',
    );
    expect(deletionErrorCode(new Error('network down'))).toBeUndefined();
  });
});

describe('deletion refusals', () => {
  test('explains the refusals that prove nothing was deleted', () => {
    expect(
      brebKeyDeletionRefusal(
        new BrebKeyDeletionError('x', 'E_BREB_KEY_DELETION_FAILED'),
      ),
    ).toBe('BRE-B no pudo cancelar la llave. Intenta de nuevo más tarde.');
    expect(
      pocketDeletionRefusal(
        new BloqueAPIError('x', { code: 'E_DEFAULT_ACCOUNT_UNDELETABLE' }),
      ),
    ).toBe('No puedes eliminar el bolsillo principal de tu cuenta.');
  });

  test('leaves any other error unexplained', () => {
    expect(
      brebKeyDeletionRefusal(new BloqueAPIError('x', { status: 500 })),
    ).toBeUndefined();
    expect(
      pocketDeletionRefusal(
        new BloqueAPIError('x', { code: 'E_ACCOUNT_NOT_FOUND' }),
      ),
    ).toBeUndefined();
  });
});
