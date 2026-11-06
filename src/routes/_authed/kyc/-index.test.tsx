import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType, ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const getVerification = vi.fn();
const startVerification = vi.fn();
const refreshUser = vi.fn(async () => {});

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useRouter: () => ({ history: { back: vi.fn() } }),
}));

vi.mock('~/contexts/auth/auth-context', () => ({
  useAuth: () => ({ user: { urn: 'did:bloque:wallet:user' }, refreshUser }),
}));

vi.mock('~/infra/bloque/compliance-repository', () => ({
  bloqueComplianceRepository: { getVerification, startVerification },
}));

const { Route } = await import('./index');
const KycPage = Route.options.component as ComponentType;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <KycPage />
    </QueryClientProvider>,
  );
}

describe('KYC route', () => {
  beforeEach(() => {
    getVerification.mockReset();
    startVerification.mockReset();
  });

  test('a rejected user whose new verification fails to start sees an error, not an endless loader', async () => {
    getVerification.mockResolvedValue({
      status: 'rejected',
      url: 'https://verify.example.com/spent',
    });
    startVerification.mockRejectedValue(new Error('502'));

    renderPage();

    expect(
      await screen.findByText(
        'No fue posible iniciar la verificación en este momento.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Iniciando verificación KYC...'),
    ).not.toBeInTheDocument();
  });

  test('retrying after a failed start mints a new verification', async () => {
    getVerification.mockResolvedValue({ status: 'rejected' });
    startVerification
      .mockRejectedValueOnce(new Error('502'))
      .mockResolvedValueOnce({
        status: 'rejected',
        url: 'https://verify.example.com/fresh',
      });

    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reintentar' }),
    );

    expect(await screen.findByTitle('Verificación KYC')).toHaveAttribute(
      'src',
      'https://verify.example.com/fresh',
    );
    expect(startVerification).toHaveBeenCalledTimes(2);
  });

  test('a started verification shows the provider page', async () => {
    getVerification.mockResolvedValue({ status: 'rejected' });
    startVerification.mockResolvedValue({
      status: 'rejected',
      url: 'https://verify.example.com/fresh',
    });

    renderPage();

    expect(await screen.findByTitle('Verificación KYC')).toHaveAttribute(
      'src',
      'https://verify.example.com/fresh',
    );
  });
});
