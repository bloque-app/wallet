import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  ApprovalFailedError,
  type SavedApproval,
} from '~/domain/approval/types';
import {
  readPendingApproval,
  savePendingApproval,
} from '~/lib/pending-approval';

const navigate = vi.fn();
const collect = vi.fn();
const run = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
}));

vi.mock('~/infra/bloque/approval-repository', () => ({
  bloqueApprovalRepository: { collect, run },
}));

const { Route } = await import('./index');
const ApprovalPage = Route.options.component as ComponentType;

const SAVED: SavedApproval = {
  operation: {
    kind: 'transfer',
    input: {
      sourceUrn: 'did:bloque:account:virtual:source',
      destinationUrn: 'did:bloque:account:virtual:dest',
      amount: '1000000',
      asset: 'COPM/2',
      metadata: { reference: 'bloque-friend-1' },
    },
  },
  pending: {
    approvalToken: 'token-1',
    approvalUrl: 'https://id.dev-bloque.app/approve#token-1',
    expiresAt: Date.now() + 60_000,
  },
  returnTo: '/send/bloque-friends',
  display: { amount: 10_000, asset: 'COP' },
};

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ApprovalPage />
    </QueryClientProvider>,
  );
}

describe('approval return page', () => {
  beforeEach(() => {
    sessionStorage.clear();
    navigate.mockReset();
    collect.mockReset();
    run.mockReset();
  });

  test('repeats the approved operation once and shows it was sent', async () => {
    savePendingApproval(SAVED);
    collect.mockResolvedValue('approval-1');
    run.mockResolvedValue({ kind: 'done' });

    renderPage();

    expect(await screen.findByText('Operación aprobada')).toBeInTheDocument();
    expect(collect).toHaveBeenCalledWith(SAVED.pending);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(SAVED.operation, 'approval-1');
    expect(readPendingApproval()).toBeNull();
  });

  test('runs nothing when the person came back without approving', async () => {
    savePendingApproval(SAVED);
    collect.mockRejectedValue(new ApprovalFailedError('not_approved'));

    renderPage();

    expect(
      await screen.findByText('Operación no aprobada'),
    ).toBeInTheDocument();
    expect(run).not.toHaveBeenCalled();
    // Still approvable until it expires.
    expect(readPendingApproval()).toEqual(SAVED);
    expect(
      screen.getByRole('button', { name: 'Aprobar ahora' }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Cancelar operación' }),
    );
    expect(readPendingApproval()).toBeNull();
    expect(navigate).toHaveBeenCalledWith({ href: '/send/bloque-friends' });
  });

  test('says the rate expired when the approved order could not be placed', async () => {
    savePendingApproval(SAVED);
    collect.mockResolvedValue('approval-1');
    run.mockRejectedValue(new ApprovalFailedError('rate_expired'));

    renderPage();

    expect(await screen.findByText('La tasa expiró')).toBeInTheDocument();
    expect(readPendingApproval()).toBeNull();
  });

  test('sends the person to register their passkey when it is not registered', async () => {
    savePendingApproval(SAVED);
    collect.mockResolvedValue('approval-1');
    run.mockRejectedValue(new ApprovalFailedError('passkey_not_registered'));

    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Registrar passkey' }),
    );
    expect(navigate).toHaveBeenCalledWith({ to: '/passkey' });
  });

  test('says there is nothing to approve without a saved operation', async () => {
    renderPage();

    expect(await screen.findByText('Nada por aprobar')).toBeInTheDocument();
    expect(collect).not.toHaveBeenCalled();
  });
});
