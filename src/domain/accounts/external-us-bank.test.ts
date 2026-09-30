import { describe, expect, test } from 'bun:test';
import {
  isFailedUsBank,
  isLinkingUsBank,
  isUsableUsBank,
  isUsBankLinkSettled,
  visibleProducts,
} from './external-us-bank';
import type { ExternalUsBankProduct, Product } from './types';

function bank(
  status: string,
  linkStatus: ExternalUsBankProduct['linkStatus'],
): Product {
  return {
    kind: 'external-us-bank',
    urn: `bank-${status}-${linkStatus}`,
    status,
    linkStatus,
    label: 'Bank',
    balances: [],
  };
}

const pocket: Product = {
  kind: 'pocket',
  urn: 'pocket-1',
  status: 'active',
  label: 'Pocket',
  balances: [],
};

describe('isUsableUsBank', () => {
  test('accepts an active account with an active link', () => {
    expect(isUsableUsBank(bank('active', 'active'))).toBe(true);
  });

  test('rejects an active link whose account is still being created', () => {
    expect(isUsableUsBank(bank('creation_in_progress', 'active'))).toBe(false);
  });

  test('rejects an active account still pending its link', () => {
    expect(isUsableUsBank(bank('active', 'pending_link'))).toBe(false);
  });

  test('rejects other product kinds', () => {
    expect(isUsableUsBank(pocket)).toBe(false);
  });
});

describe('isFailedUsBank', () => {
  test('accepts a failed account creation', () => {
    expect(isFailedUsBank(bank('creation_failed', 'pending_link'))).toBe(true);
  });

  test('accepts a failed link', () => {
    expect(isFailedUsBank(bank('creation_in_progress', 'link_failed'))).toBe(
      true,
    );
  });

  test('rejects an account still in progress', () => {
    expect(isFailedUsBank(bank('creation_in_progress', 'active'))).toBe(false);
  });

  test('rejects other product kinds', () => {
    expect(isFailedUsBank({ ...pocket, status: 'creation_failed' })).toBe(
      false,
    );
  });
});

describe('isLinkingUsBank', () => {
  test('accepts an active link whose account is still being created', () => {
    expect(isLinkingUsBank(bank('creation_in_progress', 'active'))).toBe(true);
  });

  test('rejects a usable bank', () => {
    expect(isLinkingUsBank(bank('active', 'active'))).toBe(false);
  });

  test('rejects a link still pending', () => {
    expect(isLinkingUsBank(bank('creation_in_progress', 'pending_link'))).toBe(
      false,
    );
  });
});

describe('isUsBankLinkSettled', () => {
  test('is settled once usable or failed', () => {
    expect(isUsBankLinkSettled(bank('active', 'active'))).toBe(true);
    expect(isUsBankLinkSettled(bank('creation_failed', 'pending_link'))).toBe(
      true,
    );
  });

  test('is not settled while linking or pending', () => {
    expect(isUsBankLinkSettled(bank('creation_in_progress', 'active'))).toBe(
      false,
    );
    expect(
      isUsBankLinkSettled(bank('creation_in_progress', 'pending_link')),
    ).toBe(false);
  });
});

describe('visibleProducts', () => {
  test('hides failed US bank links and keeps everything else', () => {
    const usable = bank('active', 'active');
    const linking = bank('creation_in_progress', 'active');
    const failed = bank('creation_failed', 'pending_link');

    expect(visibleProducts([pocket, usable, linking, failed])).toEqual([
      pocket,
      usable,
      linking,
    ]);
  });
});
