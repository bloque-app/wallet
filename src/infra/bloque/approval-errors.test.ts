import { afterEach, describe, expect, test } from 'bun:test';
import {
  BloqueApprovalExpiredError,
  BloqueApprovalInvalidError,
  BloqueApprovalPendingError,
  BloqueApprovalRequiredError,
  BloqueApprovalUnavailableError,
  BloqueValidationError,
} from '@bloque/sdk';
import {
  ApprovalFailedError,
  ApprovalRequiredError,
} from '~/domain/approval/types';
import { sdkApprovalOptions, toApprovalError } from './approval-errors';

const EXPIRES_AT = Date.parse('2026-10-26T12:00:00.000Z');

function requiredError(extra: Record<string, unknown> = {}) {
  return new BloqueApprovalRequiredError('', {
    status: 428,
    code: 'E_APPROVAL_REQUIRED',
    response: {
      extra_details: {
        approval_token: 'token-1',
        approval_url: 'https://id.dev-bloque.app/approve#token-1',
        expires_at: EXPIRES_AT,
        summary: { operation: 'swap.take', fields: { amount: '1000' } },
        ...extra,
      },
    },
  });
}

function invalidError(reason: string) {
  return new BloqueApprovalInvalidError('', {
    status: 403,
    code: 'E_APPROVAL_INVALID',
    response: { extra_details: { reason } },
  });
}

describe('toApprovalError', () => {
  test('turns a 428 into ApprovalRequiredError with the pending approval', () => {
    const error = toApprovalError(requiredError());

    expect(error).toBeInstanceOf(ApprovalRequiredError);
    expect((error as ApprovalRequiredError).pending).toEqual({
      approvalToken: 'token-1',
      approvalUrl: 'https://id.dev-bloque.app/approve#token-1',
      expiresAt: EXPIRES_AT,
      summary: { operation: 'swap.take', fields: { amount: '1000' } },
    });
  });

  test('leaves a 428 without an approval token as is', () => {
    const original = requiredError({ approval_token: undefined });
    expect(toApprovalError(original)).toBe(original);
  });

  test.each([
    ['passkey_not_registered', 'passkey_not_registered'],
    ['operation_mismatch', 'mismatch'],
    ['args_not_approved', 'mismatch'],
    ['passkey_rejected', 'rejected'],
    ['passkey_not_owned_by_identity', 'rejected'],
  ])('maps E_APPROVAL_INVALID %s to %s', (reason, expected) => {
    const error = toApprovalError(invalidError(reason));
    expect(error).toBeInstanceOf(ApprovalFailedError);
    expect((error as ApprovalFailedError).reason).toBe(
      expected as ApprovalFailedError['reason'],
    );
  });

  test('maps pending, expired and unavailable approvals', () => {
    const pending = toApprovalError(new BloqueApprovalPendingError());
    const expired = toApprovalError(
      new BloqueApprovalExpiredError('', { code: 'E_APPROVAL_EXPIRED' }),
    );
    const unavailable = toApprovalError(
      new BloqueApprovalUnavailableError('', {
        code: 'E_APPROVAL_UNAVAILABLE',
      }),
    );

    expect((pending as ApprovalFailedError).reason).toBe('not_approved');
    expect((expired as ApprovalFailedError).reason).toBe('expired');
    expect((unavailable as ApprovalFailedError).reason).toBe('unavailable');
  });

  test('leaves any other error as is', () => {
    const original = new BloqueValidationError('E_INVALID_REQUEST');
    expect(toApprovalError(original)).toBe(original);
  });
});

describe('sdkApprovalOptions', () => {
  const originalWindow = globalThis.window;

  function setLocation(href: string) {
    const url = new URL(href);
    (globalThis as { window?: unknown }).window = {
      location: { protocol: url.protocol, origin: url.origin },
    };
  }

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  test('sends the /approval return URL on the first call over https', () => {
    setLocation('https://account.dev-bloque.app/send/bloque-friends');
    expect(sdkApprovalOptions()).toEqual({
      approvalReturnUrl: 'https://account.dev-bloque.app/approval',
    });
  });

  test('sends only the approval when repeating the call', () => {
    setLocation('https://account.dev-bloque.app/approval');
    expect(sdkApprovalOptions({ approval: 'approval-1' })).toEqual({
      approval: 'approval-1',
    });
  });

  test('sends no return URL off https, which Origins would refuse', () => {
    setLocation('http://localhost:3000/send');
    expect(sdkApprovalOptions()).toEqual({});
  });
});
