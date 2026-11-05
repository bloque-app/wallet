import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const navigate = vi.fn();
const mutateAsync = vi.fn();
const profile = {
  phone: '+573001234567',
  birthdate: '1990-01-01',
  address_line1: 'Calle 1',
  city: 'Bogotá',
  state: 'Cundinamarca',
  postal_code: '110111',
  country_of_residence_code: 'COL',
};

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useSearch: () => ({}),
  }),
}));

vi.mock('~/hooks/identity/use-identity-profile', () => ({
  useIdentityProfile: () => ({ data: profile, isLoading: false }),
  useUpdateIdentityProfile: () => ({ mutateAsync, isPending: false }),
}));

const { Route } = await import('./index');
const EditProfilePage = Route.options.component as ComponentType;

function phoneInput() {
  return screen.getByLabelText('Teléfono') as HTMLInputElement;
}

describe('edit profile phone', () => {
  beforeEach(() => {
    navigate.mockReset();
    mutateAsync.mockReset().mockResolvedValue(undefined);
  });

  test('splits the stored phone into country and national number', () => {
    render(<EditProfilePage />);

    expect(phoneInput().value).toBe('3001234567');
    expect(
      screen.getByRole('combobox', { name: 'País del celular' }),
    ).toHaveTextContent('+57');
  });

  test('saves the phone with the country code and plus sign', async () => {
    render(<EditProfilePage />);

    fireEvent.change(phoneInput(), { target: { value: '321 355 8313' } });
    fireEvent.submit(phoneInput().closest('form') as HTMLFormElement);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0]?.[0]).toMatchObject({
      phone: '+573213558313',
    });
  });

  test('rejects a Colombian number without 10 digits', async () => {
    render(<EditProfilePage />);

    fireEvent.change(phoneInput(), { target: { value: '321355' } });
    fireEvent.submit(phoneInput().closest('form') as HTMLFormElement);

    expect(
      await screen.findByText(
        'Número de celular inválido. Revisa el país y el número.',
      ),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
