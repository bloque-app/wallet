import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { VerificationStatus } from '~/domain/kyc/types';
import { RequireKyc } from './require-kyc';

const navigate = vi.fn();
const refreshUser = vi.fn(async () => {});
let kycStatus: VerificationStatus | undefined;

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('~/contexts/auth/auth-context', () => ({
  useAuth: () => ({ user: { kycStatus }, refreshUser }),
}));

function renderGate() {
  return render(
    <RequireKyc>
      <p>flow content</p>
    </RequireKyc>,
  );
}

describe('RequireKyc', () => {
  beforeEach(() => {
    navigate.mockClear();
    refreshUser.mockClear();
  });

  test('renders the flow for an approved user without re-reading the status', () => {
    kycStatus = 'approved';
    renderGate();

    expect(screen.getByText('flow content')).toBeInTheDocument();
    expect(refreshUser).not.toHaveBeenCalled();
  });

  test('stops a user who never started and sends them to verify on demand', () => {
    kycStatus = 'not_started';
    renderGate();

    expect(screen.queryByText('flow content')).not.toBeInTheDocument();
    expect(
      screen.getByText('Verifica tu identidad para mover dinero'),
    ).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalledWith({ to: '/kyc' });

    fireEvent.click(screen.getByText('Verificar identidad'));
    expect(navigate).toHaveBeenCalledWith({ to: '/kyc' });
  });

  test('re-reads the status once on entry when not approved', () => {
    kycStatus = 'awaiting_verification';
    renderGate();

    expect(
      screen.getByText('Tu verificación está en revisión'),
    ).toBeInTheDocument();
    expect(refreshUser).toHaveBeenCalledTimes(1);
  });

  test('shows the rejected copy for a rejected verification', () => {
    kycStatus = 'rejected';
    renderGate();

    expect(
      screen.getByText('No pudimos verificar tu identidad'),
    ).toBeInTheDocument();
    expect(screen.getByText('Reintentar verificación')).toBeInTheDocument();
  });

  test('an unconfirmed status retries the lookup instead of opening verification', async () => {
    kycStatus = undefined;
    renderGate();

    expect(
      screen.getByText('No pudimos confirmar tu verificación'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() => expect(refreshUser).toHaveBeenCalledTimes(2));
    expect(navigate).not.toHaveBeenCalledWith({ to: '/kyc' });
  });
});
