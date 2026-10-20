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
const login = vi.fn(async () => ({ status: 'authenticated' }));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate }),
}));

vi.mock('~/contexts/auth/auth-context', () => ({
  useAuth: () => ({ sendOTP: vi.fn(), login }),
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
});
