import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentType, StrictMode } from 'react';
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

function renderPage({ strict = false } = {}) {
  const queryClient = new QueryClient();
  const page = (
    <QueryClientProvider client={queryClient}>
      <ApprovalPage />
    </QueryClientProvider>
  );
  return render(strict ? <StrictMode>{page}</StrictMode> : page);
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

  test('collects and repeats only once when mounted twice', async () => {
    savePendingApproval(SAVED);
    collect.mockResolvedValue('approval-1');
    run.mockResolvedValue({ kind: 'done' });

    renderPage({ strict: true });

    expect(await screen.findByText('Operación aprobada')).toBeInTheDocument();
    expect(collect).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  test('marks the repeat as sent while it is in flight', async () => {
    savePendingApproval(SAVED);
    collect.mockResolvedValue('approval-1');
    let inFlight: SavedApproval | null = null;
    run.mockImplementation(async () => {
      inFlight = readPendingApproval();
      return { kind: 'done' };
    });

    renderPage();

    await screen.findByText('Operación aprobada');
    expect(inFlight).toMatchObject({ replayStartedAt: expect.any(Number) });
  });

  test('does not repeat again a repeat already sent from an earlier load', async () => {
    savePendingApproval({ ...SAVED, replayStartedAt: Date.now() });

    renderPage();

    expect(
      await screen.findByText('No pudimos confirmar tu operación'),
    ).toBeInTheDocument();
    expect(collect).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(readPendingApproval()).toBeNull();
  });

  test.each([
    ['refused', new ApprovalFailedError('rejected')],
    ['expired', new ApprovalFailedError('expired')],
    ['failed', new Error('network down')],
  ])('does not say nothing was sent when the repeat is %s', async (_, error) => {
    savePendingApproval(SAVED);
    collect.mockResolvedValue('approval-1');
    run.mockRejectedValue(error);

    renderPage();

    expect(
      await screen.findByText('No pudimos confirmar tu operación'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver movimientos' }),
    );
    expect(navigate).toHaveBeenCalledWith({ to: '/movements' });
  });

  test('drops an approval that expired before it was collected', async () => {
    savePendingApproval(SAVED);
    collect.mockRejectedValue(new ApprovalFailedError('expired'));

    renderPage();

    expect(await screen.findByText('La aprobación expiró')).toBeInTheDocument();
    expect(run).not.toHaveBeenCalled();
    expect(readPendingApproval()).toBeNull();
  });

  test('retries collecting when approvals were unavailable', async () => {
    savePendingApproval(SAVED);
    collect
      .mockRejectedValueOnce(new ApprovalFailedError('unavailable'))
      .mockResolvedValueOnce('approval-1');
    run.mockResolvedValue({ kind: 'done' });

    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reintentar' }),
    );

    expect(await screen.findByText('Operación aprobada')).toBeInTheDocument();
    expect(collect).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenCalledTimes(1);
  });

  test('says a card change was applied, not sent', async () => {
    savePendingApproval({
      ...SAVED,
      operation: { kind: 'activate-card', urn: 'did:bloque:account:card:1' },
      display: undefined,
    });
    collect.mockResolvedValue('approval-1');
    run.mockResolvedValue({ kind: 'done' });

    renderPage();

    expect(await screen.findByText('Cambio aprobado')).toBeInTheDocument();
  });

  test('returns to the account list after an approved pocket deletion', async () => {
    savePendingApproval({
      ...SAVED,
      operation: {
        kind: 'delete-pocket',
        urn: 'did:bloque:account:virtual:1',
      },
      display: undefined,
    });
    collect.mockResolvedValue('approval-1');
    run.mockResolvedValue({ kind: 'done' });

    renderPage();

    expect(await screen.findByText('Bolsillo eliminado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/accounts' });
  });

  test('returns to the keys page after an approved BRE-B key deletion', async () => {
    savePendingApproval({
      ...SAVED,
      operation: {
        kind: 'delete-breb-key',
        urn: 'did:bloque:account:breb:1',
      },
      returnTo: '/breb-keys/manage-keys',
      display: undefined,
    });
    collect.mockResolvedValue('approval-1');
    run.mockResolvedValue({ kind: 'done' });

    renderPage();

    expect(await screen.findByText('Llave eliminada')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(navigate).toHaveBeenCalledWith({ href: '/breb-keys/manage-keys' });
  });
});
