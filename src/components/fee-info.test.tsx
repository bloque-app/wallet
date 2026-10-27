import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { FeeInfo } from './fee-info';

describe('FeeInfo', () => {
  test('the fee drawer can be closed with its button', async () => {
    render(
      <FeeInfo fee="$ 500 + 0.2%" description="Cubre el procesamiento." />,
    );

    fireEvent.click(screen.getByRole('button', { name: '$ 500 + 0.2%' }));
    expect(
      await screen.findByText('Cubre el procesamiento.'),
    ).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'closed'));
  });
});
