import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  test('puts the back button before the title', async () => {
    const onBack = vi.fn();
    render(<PageHeader title="Enviar a bancos colombianos" onBack={onBack} />);

    const back = screen.getByRole('button', { name: 'Volver' });
    const title = screen.getByRole('heading', {
      name: 'Enviar a bancos colombianos',
    });
    expect(
      back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await userEvent.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('hides the back button on steps without one', () => {
    render(<PageHeader title="Recargar" />);

    expect(
      screen.queryByRole('button', { name: 'Volver' }),
    ).not.toBeInTheDocument();
  });
});
