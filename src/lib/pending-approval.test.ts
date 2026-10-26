import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { SavedApproval } from '~/domain/approval/types';
import {
  clearPendingApproval,
  readPendingApproval,
  savePendingApproval,
} from './pending-approval';

const SAVED: SavedApproval = {
  operation: {
    kind: 'transfer',
    input: {
      sourceUrn: 'did:bloque:account:virtual:source',
      destinationUrn: 'did:bloque:account:virtual:dest',
      amount: '1000000',
      asset: 'COPM/2',
    },
  },
  pending: {
    approvalToken: 'token-1',
    approvalUrl: 'https://id.dev-bloque.app/approve#token-1',
    expiresAt: 1_800_000_000_000,
  },
  returnTo: '/send/bloque-friends',
  display: { amount: 10_000, asset: 'COP' },
};

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

describe('pending approval storage', () => {
  const original = globalThis.sessionStorage;

  beforeEach(() => {
    globalThis.sessionStorage = memoryStorage();
  });

  afterEach(() => {
    globalThis.sessionStorage = original;
  });

  test('reads back what was saved, until cleared', () => {
    expect(savePendingApproval(SAVED)).toBe(true);
    expect(readPendingApproval()).toEqual(SAVED);

    clearPendingApproval();
    expect(readPendingApproval()).toBeNull();
  });

  test('ignores a malformed entry', () => {
    sessionStorage.setItem(
      'bloque:pending-approval',
      JSON.stringify({ operation: { kind: 'transfer' }, returnTo: '/' }),
    );
    expect(readPendingApproval()).toBeNull();

    sessionStorage.setItem('bloque:pending-approval', '{not json');
    expect(readPendingApproval()).toBeNull();
  });

  test('says when it could not save', () => {
    globalThis.sessionStorage = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(savePendingApproval(SAVED)).toBe(false);
  });
});
