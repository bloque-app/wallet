import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PasskeyRegistrationError } from '~/domain/passkey/types';
import { PasskeyRegistration } from './passkey-registration';

describe('PasskeyRegistration', () => {
  test('starts the ceremony only from the button, then confirms', async () => {
    const onRegister = vi.fn(async () => {});
    render(<PasskeyRegistration supported onRegister={onRegister} />);

    expect(onRegister).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar passkey' }),
    );

    expect(onRegister).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Passkey registrada')).toBeInTheDocument();
  });

  test('a failure shows its reason and lets the user retry', async () => {
    const onRegister = vi.fn(async () => {
      throw new PasskeyRegistrationError('cancelled');
    });
    render(<PasskeyRegistration supported onRegister={onRegister} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar passkey' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se creó la passkey',
    );
    expect(
      screen.getByRole('button', { name: 'Intentar de nuevo' }),
    ).toBeInTheDocument();
  });

  test('an unexpected error never shows a raw message', async () => {
    const onRegister = vi.fn(async () => {
      throw new Error('E_SOMETHING_INTERNAL');
    });
    render(<PasskeyRegistration supported onRegister={onRegister} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar passkey' }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos registrar tu passkey');
    expect(alert).not.toHaveTextContent('E_SOMETHING_INTERNAL');
  });

  test('an unsupported browser gets no button to press', () => {
    render(<PasskeyRegistration supported={false} onRegister={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Este navegador no puede crear passkeys',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
