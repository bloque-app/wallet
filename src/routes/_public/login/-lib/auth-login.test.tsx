import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const register = vi.fn();
const connect = vi.fn();
const me = vi.fn();

vi.mock('~/lib/bloque', () => ({
  createBloqueSdk: () => ({
    me,
    connect,
    identity: { origins: { register } },
  }),
  resetBloque: vi.fn(),
}));

vi.mock('~/lib/api-fetch', () => ({ apiFetch: vi.fn() }));

const { AuthProvider, useAuth } = await import('~/contexts/auth/auth-context');

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const PROFILE = {
  method: 'email' as const,
  alias: 'alice@example.com',
  origin: '30m' as const,
  profile: { firstName: 'Alice', lastName: 'Doe' },
};

async function renderAuth() {
  const view = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view.result;
}

describe('login', () => {
  beforeEach(() => {
    register.mockReset();
    connect.mockReset();
    me.mockReset();
    // The mount-time session check finds nobody signed in.
    me.mockRejectedValueOnce({ status: 401 });
  });

  test('a mistyped code keeps the profile, so the next code still signs up', async () => {
    const auth = await renderAuth();
    act(() => auth.current.setPendingProfileOnboarding(PROFILE));

    register.mockRejectedValueOnce({ status: 400, message: 'E_INVALID_OTP' });
    await expect(
      auth.current.login({ email: 'alice@example.com', code: '111111' }),
    ).rejects.toMatchObject({ message: 'E_INVALID_OTP' });

    register.mockResolvedValueOnce({ accessToken: 't' });
    me.mockResolvedValueOnce({
      urn: 'did:bloque:30m:alice@example.com',
      profile: {},
    });
    await auth.current
      .login({ email: 'alice@example.com', code: '222222' })
      .catch(() => undefined);

    expect(register).toHaveBeenCalledTimes(2);
    expect(connect).not.toHaveBeenCalled();
  });

  test('an existing identity drops the profile, so the next code signs in', async () => {
    const auth = await renderAuth();
    act(() => auth.current.setPendingProfileOnboarding(PROFILE));

    register.mockRejectedValueOnce({
      status: 409,
      message: 'E_IDENTITY_ALREADY_EXISTS',
    });
    expect(
      await auth.current.login({ email: 'alice@example.com', code: '111111' }),
    ).toEqual({ status: 'already_registered' });

    connect.mockResolvedValueOnce({});
    me.mockResolvedValueOnce({
      urn: 'did:bloque:30m:alice@example.com',
      profile: {},
    });
    await auth.current
      .login({ email: 'alice@example.com', code: '222222' })
      .catch(() => undefined);

    expect(register).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith('30m', 'alice@example.com', '222222');
  });

  test('a sign-in with no identity on the origin asks for the profile', async () => {
    const auth = await renderAuth();

    connect.mockResolvedValueOnce({});
    me.mockRejectedValueOnce({ status: 404, message: 'E_IDENTITY_NOT_FOUND' });

    expect(
      await auth.current.login({ email: 'alice@example.com', code: '111111' }),
    ).toEqual({ status: 'onboarding_required' });
    expect(register).not.toHaveBeenCalled();
  });
});
