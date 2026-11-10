import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { Movement } from '~/lib/formatters';
import { MovementRow } from './movement-row';

const MOVEMENT: Movement = {
  id: 'm-1',
  type: 'withdraw',
  asset: 'COP',
  amount: 50_000,
  status: 'completed',
  createdAt: '2026-11-05T15:00:00.000Z',
  reference: 'ref-1',
  direction: 'outgoing',
};

describe('MovementRow', () => {
  test('shows the order fee under the amount', () => {
    render(
      <MovementRow
        movement={{ ...MOVEMENT, fee: { amount: 501, asset: 'COP' } }}
      />,
    );

    expect(screen.getByText(/Comisión/)).toHaveTextContent(/501/);
  });

  test('shows no fee when none was recorded', () => {
    render(<MovementRow movement={MOVEMENT} />);

    expect(screen.queryByText(/Comisión/)).not.toBeInTheDocument();
  });
});
