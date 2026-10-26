import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  type ApprovalOperation,
  ApprovalRequiredError,
  type SavedApproval,
} from '~/domain/approval/types';
import {
  readPendingApproval,
  savePendingApproval,
} from '~/lib/pending-approval';

const navigate = vi.fn();
const toastError = vi.fn();
const toastInfo = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('sonner', () => ({
  toast: { error: toastError, info: toastInfo },
}));

const { useApprovalRedirect } = await import(
  '~/hooks/approval/use-approval-redirect'
);

const OPERATION: ApprovalOperation = {
  kind: 'breb-order',
  params: {
    rateSig: 'rate-sig-1',
    amountSrc: '1000000',
    depositInformation: {
      resolutionId: 'resolution-1',
      destinationKey: { keyValue: '3001234567' },
    },
    args: { sourceAccountUrn: 'did:bloque:account:breb:source' },
  },
};

const PENDING = {
  approvalToken: 'token-1',
  approvalUrl: 'https://id.dev-bloque.app/approve#token-1',
  expiresAt: Date.now() + 60_000,
};

const originalLocation = window.location;
const assign = vi.fn();

function setLocation(pathname: string, search = '') {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, pathname, search, assign },
  });
}

describe('useApprovalRedirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
    navigate.mockReset();
    assign.mockReset();
    toastError.mockReset();
    toastInfo.mockReset();
    setLocation('/breb-keys/pay-transfer', '?from=%2Fbreb-keys');
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  test('ignores errors that are not approval ones', () => {
    const { result } = renderHook(() => useApprovalRedirect());

    expect(result.current(new Error('E_RATE_EXPIRED'), OPERATION)).toBe(false);
    expect(readPendingApproval()).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  test('saves the exact operation and leaves for the approval page', () => {
    const { result } = renderHook(() => useApprovalRedirect());

    const handled = result.current(
      new ApprovalRequiredError(PENDING),
      OPERATION,
      { amount: 10_000, asset: 'COP' },
    );

    expect(handled).toBe(true);
    expect(readPendingApproval()).toEqual({
      operation: OPERATION,
      pending: PENDING,
      returnTo: '/breb-keys/pay-transfer?from=%2Fbreb-keys',
      display: { amount: 10_000, asset: 'COP' },
    });
    expect(assign).toHaveBeenCalledWith(PENDING.approvalUrl);
  });

  test('tells the person when there is no approval page to go to', () => {
    const { result } = renderHook(() => useApprovalRedirect());

    const handled = result.current(
      new ApprovalRequiredError({ ...PENDING, approvalUrl: undefined }),
      OPERATION,
    );

    expect(handled).toBe(true);
    expect(toastError).toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(readPendingApproval()).toBeNull();
  });

  test('goes to /approval when back on the page with a saved operation', () => {
    const saved: SavedApproval = {
      operation: OPERATION,
      pending: PENDING,
      returnTo: '/breb-keys/pay-transfer?from=%2Fbreb-keys',
    };
    savePendingApproval(saved);

    renderHook(() => useApprovalRedirect());

    expect(navigate).toHaveBeenCalledWith({ href: '/approval', replace: true });
  });

  test('leaves other pages alone', () => {
    savePendingApproval({
      operation: OPERATION,
      pending: PENDING,
      returnTo: '/send/bloque-friends',
    });

    renderHook(() => useApprovalRedirect());

    expect(navigate).not.toHaveBeenCalled();
  });

  test('goes to /approval when the page is restored from the back/forward cache', () => {
    renderHook(() => useApprovalRedirect());
    expect(navigate).not.toHaveBeenCalled();

    savePendingApproval({
      operation: OPERATION,
      pending: PENDING,
      returnTo: '/breb-keys/pay-transfer',
    });
    act(() => {
      const event = new Event('pageshow') as PageTransitionEvent;
      Object.defineProperty(event, 'persisted', { value: true });
      window.dispatchEvent(event);
    });

    expect(navigate).toHaveBeenCalledWith({ href: '/approval', replace: true });
  });
});
