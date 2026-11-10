import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Movement } from '~/lib/formatters';

const downloadReceipt = vi.fn();

vi.mock('~/lib/receipt', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/receipt')>()),
  downloadReceipt: (...args: unknown[]) => downloadReceipt(...args),
}));

const { MovementDetailDrawer } = await import('./movement-detail-drawer');

const MOVEMENT: Movement = {
  id: 'm-1',
  type: 'send',
  asset: 'COP',
  amount: 10_000,
  status: 'completed',
  createdAt: '2026-11-05T15:00:00.000Z',
  reference: 'ref-123',
  counterparty: 'Ana',
  direction: 'outgoing',
};

describe('MovementDetailDrawer', () => {
  beforeEach(() => downloadReceipt.mockReset().mockResolvedValue(undefined));

  test('hides the fee row when the movement has no known fee', () => {
    render(<MovementDetailDrawer movement={MOVEMENT} open onClose={vi.fn()} />);

    expect(screen.queryByText('Comisión')).not.toBeInTheDocument();
  });

  test('downloads a PDF receipt for the movement', async () => {
    render(<MovementDetailDrawer movement={MOVEMENT} open onClose={vi.fn()} />);

    fireEvent.click(
      screen.getByRole('button', { name: /Descargar comprobante/ }),
    );

    await waitFor(() => expect(downloadReceipt).toHaveBeenCalledTimes(1));
    const [content, fileName] = downloadReceipt.mock.calls[0] ?? [];
    expect(fileName).toBe('comprobante-ref-123.pdf');
    expect(content).toMatchObject({
      title: 'Comprobante de movimiento',
      status: 'Completado',
    });
    expect(content.rows).toContainEqual({
      label: 'Referencia',
      value: 'ref-123',
    });
  });

  test('shows the fee in its own asset, on screen and in the receipt', async () => {
    render(
      <MovementDetailDrawer
        movement={{
          ...MOVEMENT,
          asset: 'USD',
          fee: { amount: 501, asset: 'COP' },
        }}
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Comisión')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Descargar comprobante/ }),
    );

    await waitFor(() => expect(downloadReceipt).toHaveBeenCalledTimes(1));
    const [content] = downloadReceipt.mock.calls[0] ?? [];
    const feeRow = content.rows.find(
      (row: { label: string }) => row.label === 'Comisión',
    );
    expect(feeRow?.value).toMatch(/501/);
  });

  test('shows what the recipient receives, on screen and in the receipt', async () => {
    render(
      <MovementDetailDrawer
        movement={{
          ...MOVEMENT,
          amount: 1000,
          fee: { amount: 501, asset: 'COP' },
        }}
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Se recibe')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Descargar comprobante/ }),
    );

    await waitFor(() => expect(downloadReceipt).toHaveBeenCalledTimes(1));
    const [content] = downloadReceipt.mock.calls[0] ?? [];
    const receivedRow = content.rows.find(
      (row: { label: string }) => row.label === 'Se recibe',
    );
    expect(receivedRow?.value).toMatch(/499/);
  });

  test('no received row when the fee is in another asset', () => {
    render(
      <MovementDetailDrawer
        movement={{
          ...MOVEMENT,
          asset: 'USD',
          fee: { amount: 501, asset: 'COP' },
        }}
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('Se recibe')).not.toBeInTheDocument();
  });

  test('incoming: shows the original amount, on screen and in the receipt', async () => {
    render(
      <MovementDetailDrawer
        movement={{
          ...MOVEMENT,
          type: 'topup',
          direction: 'incoming',
          amount: 499,
          fee: { amount: 501, asset: 'COP' },
        }}
        open
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Monto original')).toBeInTheDocument();
    expect(screen.queryByText('Se recibe')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Descargar comprobante/ }),
    );

    await waitFor(() => expect(downloadReceipt).toHaveBeenCalledTimes(1));
    const [content] = downloadReceipt.mock.calls[0] ?? [];
    const row = content.rows.find(
      (r: { label: string }) => r.label === 'Monto original',
    );
    expect(row?.value).toMatch(/1\.000/);
  });
});
