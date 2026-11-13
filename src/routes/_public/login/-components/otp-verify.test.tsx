import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { OTPVerify } from './otp-verify';

// input-otp measures itself; jsdom has neither of these.
document.elementFromPoint = () => null;
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const navigate = vi.fn();
const login = vi.fn(
  async (): Promise<{ status: string }> => ({ status: 'authenticated' }),
);
const sendOTP = vi.fn(async () => {});

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate }),
}));

vi.mock('~/contexts/auth/auth-context', () => ({
  useAuth: () => ({ sendOTP, login }),
}));

describe('OTPVerify', () => {
  test('lands on the page the user was sent to log in from', async () => {
    render(
      <OTPVerify
        method="email"
        contact="alice@example.com"
        resendAvailableAt={0}
        redirectTo="/passkey"
        onResendAvailableAtChange={vi.fn()}
        onVerified={vi.fn()}
        onBack={vi.fn()}
        onOnboardingRequired={vi.fn()}
        onAlreadyRegistered={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByRole('textbox'), '123456');

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        href: '/passkey',
        replace: true,
      }),
    );
    expect(login).toHaveBeenCalledWith({
      code: '123456',
      email: 'alice@example.com',
    });
  });

  test('goes back to the profile step when this origin has no identity', async () => {
    login.mockResolvedValueOnce({ status: 'onboarding_required' });
    const onOnboardingRequired = vi.fn();
    render(
      <OTPVerify
        method="phone"
        contact="573155085949"
        resendAvailableAt={0}
        redirectTo="/"
        onResendAvailableAtChange={vi.fn()}
        onVerified={vi.fn()}
        onBack={vi.fn()}
        onOnboardingRequired={onOnboardingRequired}
        onAlreadyRegistered={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByRole('textbox'), '123456');

    await waitFor(() => expect(onOnboardingRequired).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalledWith({ href: '/', replace: true });
  });

  test('sends a new code to sign in when the identity already exists', async () => {
    login.mockResolvedValueOnce({ status: 'already_registered' });
    sendOTP.mockClear();
    const onAlreadyRegistered = vi.fn();
    const onResendAvailableAtChange = vi.fn();
    render(
      <OTPVerify
        method="email"
        contact="alice@example.com"
        resendAvailableAt={0}
        redirectTo="/"
        onResendAvailableAtChange={onResendAvailableAtChange}
        onVerified={vi.fn()}
        onBack={vi.fn()}
        onOnboardingRequired={vi.fn()}
        onAlreadyRegistered={onAlreadyRegistered}
      />,
    );

    await userEvent.type(screen.getByRole('textbox'), '123456');

    await waitFor(() =>
      expect(screen.getByText(/Ya tienes una cuenta/)).toBeTruthy(),
    );
    expect(onAlreadyRegistered).toHaveBeenCalled();
    expect(sendOTP).toHaveBeenCalledWith('email', 'alice@example.com');
    expect(onResendAvailableAtChange).toHaveBeenCalled();
  });

  test('says so when the new code for an existing account cannot be sent', async () => {
    login.mockResolvedValueOnce({ status: 'already_registered' });
    sendOTP.mockRejectedValueOnce(new Error('down'));
    const onResendAvailableAtChange = vi.fn();
    render(
      <OTPVerify
        method="email"
        contact="alice@example.com"
        resendAvailableAt={0}
        redirectTo="/"
        onResendAvailableAtChange={onResendAvailableAtChange}
        onVerified={vi.fn()}
        onBack={vi.fn()}
        onOnboardingRequired={vi.fn()}
        onAlreadyRegistered={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByRole('textbox'), '123456');

    await waitFor(() =>
      expect(
        screen.getByText(/no pudimos enviarte un nuevo codigo/),
      ).toBeTruthy(),
    );
    expect(onResendAvailableAtChange).not.toHaveBeenCalled();
    expect(screen.getByText('Reenviar codigo')).toBeTruthy();
  });
});
