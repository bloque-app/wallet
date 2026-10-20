import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import {
  type PasskeyFailureReason,
  PasskeyRegistrationError,
} from '~/domain/passkey/types';
import { PasskeyRegistration } from './passkey-registration';

function renderFailing(reason: PasskeyFailureReason) {
  const onRegister = vi.fn(async () => {
    throw new PasskeyRegistrationError(reason);
  });
  const onSignInAgain = vi.fn();
  render(
    <PasskeyRegistration
      supported
      onRegister={onRegister}
      onSignInAgain={onSignInAgain}
    />,
  );
  return { onRegister, onSignInAgain };
}

const startButton = () =>
  screen.getByRole('button', { name: 'Registrar passkey' });

describe('PasskeyRegistration', () => {
  test('starts the ceremony only from the button, then announces success', async () => {
    const onRegister = vi.fn(async () => {});
    render(
      <PasskeyRegistration
        supported
        onRegister={onRegister}
        onSignInAgain={vi.fn()}
      />,
    );

    expect(onRegister).not.toHaveBeenCalled();
    await userEvent.click(startButton());

    expect(onRegister).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Passkey registrada',
    );
  });

  test('a retryable failure shows its reason and retries through the same handler', async () => {
    const { onRegister } = renderFailing('cancelled');

    await userEvent.click(startButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se creó la passkey',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Intentar de nuevo' }),
    );

    expect(onRegister).toHaveBeenCalledTimes(2);
  });

  test('an unexpected error never shows a raw message', async () => {
    const onRegister = vi.fn(async () => {
      throw new Error('E_SOMETHING_INTERNAL');
    });
    render(
      <PasskeyRegistration
        supported
        onRegister={onRegister}
        onSignInAgain={vi.fn()}
      />,
    );

    await userEvent.click(startButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos registrar tu passkey');
    expect(alert).not.toHaveTextContent('E_SOMETHING_INTERNAL');
  });

  test('an invalid session offers signing in again, not a retry that would fail the same way', async () => {
    const { onSignInAgain } = renderFailing('session');

    await userEvent.click(startButton());
    await screen.findByRole('alert');

    expect(
      screen.queryByRole('button', { name: 'Intentar de nuevo' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Iniciar sesión de nuevo' }),
    );
    expect(onSignInAgain).toHaveBeenCalledTimes(1);
  });

  test('a failure retrying cannot fix points to support, with no button', async () => {
    renderFailing('blocked');

    await userEvent.click(startButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'soporte@bloque.team',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('an unsupported browser gets no button to press', () => {
    render(
      <PasskeyRegistration
        supported={false}
        onRegister={vi.fn()}
        onSignInAgain={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Este navegador no puede crear passkeys',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
