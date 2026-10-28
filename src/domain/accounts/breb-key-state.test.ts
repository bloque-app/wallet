import { describe, expect, test } from 'bun:test';
import { brebKeyState, isRetryableBrebKey } from './breb-key-state';

describe('brebKeyState', () => {
  test('an active account whose key failed is failed', () => {
    expect(brebKeyState({ status: 'active', keyStatus: 'failed' })).toBe(
      'failed',
    );
  });

  test('an active account whose key is processing is in progress', () => {
    expect(brebKeyState({ status: 'active', keyStatus: 'processing' })).toBe(
      'in_progress',
    );
  });

  test('a registered key follows the account status', () => {
    expect(brebKeyState({ status: 'active', keyStatus: 'registered' })).toBe(
      'ready',
    );
    expect(brebKeyState({ status: 'frozen', keyStatus: 'registered' })).toBe(
      'suspended',
    );
  });

  test('failed and deleted accounts are failed and removed', () => {
    expect(brebKeyState({ status: 'creation_failed' })).toBe('failed');
    expect(brebKeyState({ status: 'deleted' })).toBe('removed');
    expect(brebKeyState({ status: 'active', keyStatus: 'unregistered' })).toBe(
      'removed',
    );
  });

  test('a key without provider status follows the account status', () => {
    expect(brebKeyState({ status: 'active' })).toBe('ready');
    expect(brebKeyState({ status: 'creation_in_progress' })).toBe(
      'in_progress',
    );
  });
});

describe('isRetryableBrebKey', () => {
  test('only failed and removed keys can be registered again', () => {
    expect(isRetryableBrebKey({ status: 'creation_failed' })).toBe(true);
    expect(isRetryableBrebKey({ status: 'deleted' })).toBe(true);
    expect(isRetryableBrebKey({ status: 'active', keyStatus: 'failed' })).toBe(
      true,
    );
    expect(isRetryableBrebKey({ status: 'active' })).toBe(false);
    expect(isRetryableBrebKey({ status: 'frozen' })).toBe(false);
    expect(
      isRetryableBrebKey({ status: 'active', keyStatus: 'processing' }),
    ).toBe(false);
  });
});
