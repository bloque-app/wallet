import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
}));

const { ExecutionOutcomeStep } = await import('./execution-outcome-step');

describe('ExecutionOutcomeStep', () => {
  beforeEach(() => navigate.mockReset());

  test('checks the status in movements without a toast', async () => {
    render(
      <ExecutionOutcomeStep
        amount={10_000}
        orderId="order-1"
        execution={{ kind: 'none' }}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /Verificar estado/ }),
    );
    expect(navigate).toHaveBeenCalledWith({ to: '/movements' });
  });

  test('returns home when done', async () => {
    render(
      <ExecutionOutcomeStep
        amount={10_000}
        orderId="order-1"
        execution={{ kind: 'none' }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(navigate).toHaveBeenCalledWith({ to: '/' });
  });

  test('reports a problem to support with the order id', () => {
    render(
      <ExecutionOutcomeStep
        amount={10_000}
        orderId="order-1"
        execution={{ kind: 'none' }}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Reportar problema' }),
    ).toHaveAttribute(
      'href',
      'mailto:soporte@bloque.team?subject=Problema%20con%20la%20orden%20order-1&body=Hola%2C%20tengo%20un%20problema%20con%20la%20orden%20order-1.',
    );
  });

  test('puts the payment link first when the order has one', () => {
    render(
      <ExecutionOutcomeStep
        amount={10_000}
        orderId="order-1"
        execution={{ kind: 'redirect', url: 'https://pay.example/1' }}
      />,
    );

    const [first, second] = screen.getAllByRole('button');
    expect(first).toHaveTextContent('Abrir enlace');
    expect(second).toHaveTextContent('Listo');
  });
});
