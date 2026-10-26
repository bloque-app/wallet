import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import {
  type PasskeyFailureReason,
  PasskeyRegistrationError,
} from '~/domain/passkey/types';
import { PasskeyRegistration } from './passkey-registration';

function renderFailing(reason: PasskeyFailureReason) {
  const onStart = vi.fn(async () => {
    throw new PasskeyRegistrationError(reason);
  });
  const onSignInAgain = vi.fn();
  render(
    <PasskeyRegistration
      registered={false}
      onStart={onStart}
      onSignInAgain={onSignInAgain}
    />,
  );
  return { onStart, onSignInAgain };
}

const startButton = () =>
  screen.getByRole('button', { name: 'Registrar passkey' });

describe('PasskeyRegistration', () => {
  test('leaves for the identity app only from the button, and stays busy while it does', async () => {
    const onStart = vi.fn(async () => {});
    render(
      <PasskeyRegistration
        registered={false}
        onStart={onStart}
        onSignInAgain={vi.fn()}
      />,
    );

    expect(onStart).not.toHaveBeenCalled();
    await userEvent.click(startButton());

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Abriendo la página de passkey…' }),
    ).toBeDisabled();
  });

  test('back from the identity app, it confirms the registration', () => {
    render(
      <PasskeyRegistration
        registered
        onStart={vi.fn()}
        onSignInAgain={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Passkey registrada');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('a retryable failure shows its reason and retries through the same handler', async () => {
    const { onStart } = renderFailing('unavailable');

    await userEvent.click(startButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos abrir la página de passkey',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Intentar de nuevo' }),
    );

    expect(onStart).toHaveBeenCalledTimes(2);
  });

  test('an unexpected error never shows a raw message', async () => {
    const onStart = vi.fn(async () => {
      throw new Error('E_SOMETHING_INTERNAL');
    });
    render(
      <PasskeyRegistration
        registered={false}
        onStart={onStart}
        onSignInAgain={vi.fn()}
      />,
    );

    await userEvent.click(startButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos abrir la página de passkey');
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
});
