import { beforeEach, describe, expect, test } from 'vitest';
import {
  clearPendingLogin,
  readPendingLogin,
  savePendingLogin,
} from './pending-login';

describe('pending login', () => {
  beforeEach(() => clearPendingLogin());

  test('keeps the sign-up profile across a reload', () => {
    savePendingLogin({
      method: 'phone',
      contact: '573155085949',
      resendAvailableAt: 1,
      profile: { firstName: 'Hector', lastName: 'Zapata' },
    });

    expect(readPendingLogin()).toEqual({
      method: 'phone',
      contact: '573155085949',
      resendAvailableAt: 1,
      profile: { firstName: 'Hector', lastName: 'Zapata' },
    });
  });

  test('a sign-in has no profile', () => {
    savePendingLogin({
      method: 'email',
      contact: 'a@b.co',
      resendAvailableAt: 1,
    });
    expect(readPendingLogin()).toEqual({
      method: 'email',
      contact: 'a@b.co',
      resendAvailableAt: 1,
    });
  });

  test('drops a malformed profile', () => {
    sessionStorage.setItem(
      'bloque:pending-otp-login',
      JSON.stringify({
        method: 'email',
        contact: 'a@b.co',
        resendAvailableAt: 1,
        profile: { firstName: 1 },
      }),
    );
    expect(readPendingLogin()?.profile).toBeUndefined();
  });
});
