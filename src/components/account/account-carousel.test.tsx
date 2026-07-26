import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { Account } from '~/domain/accounts/types';
import { AccountCarousel } from './account-carousel';

function makeAccount(overrides: Partial<Account>): Account {
  return {
    ledgerId: 'ledger-1',
    label: 'Main',
    primaryUrn: 'did:bloque:account:virtual:main',
    products: [
      {
        kind: 'pocket',
        urn: 'did:bloque:account:virtual:main',
        status: 'active',
        label: 'Main',
        balances: [],
      },
    ],
    balances: [{ asset: 'COPM/2', current: '150000', pending: '0' }],
    ...overrides,
  };
}

describe('AccountCarousel', () => {
  test('renders one card per account with its label and balance', () => {
    const accounts = [
      makeAccount({ ledgerId: 'ledger-1', label: 'Main' }),
      makeAccount({ ledgerId: 'ledger-2', label: 'PawHaus' }),
    ];

    render(
      <AccountCarousel
        accounts={accounts}
        asset="COPM/2"
        precision={2}
        unit="COP"
        value={null}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('PawHaus')).toBeInTheDocument();
    expect(screen.queryByText('Seleccionada')).not.toBeInTheDocument();
  });

  test('calls onChange with the clicked account ledgerId', () => {
    const accounts = [
      makeAccount({ ledgerId: 'ledger-1', label: 'Main' }),
      makeAccount({ ledgerId: 'ledger-2', label: 'PawHaus' }),
    ];
    const onChange = vi.fn();

    render(
      <AccountCarousel
        accounts={accounts}
        asset="COPM/2"
        precision={2}
        unit="COP"
        value={null}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Cuenta PawHaus/));

    expect(onChange).toHaveBeenCalledWith('ledger-2');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('marks the selected account as active and shows the "Seleccionada" badge', () => {
    const accounts = [
      makeAccount({ ledgerId: 'ledger-1', label: 'Main' }),
      makeAccount({ ledgerId: 'ledger-2', label: 'PawHaus' }),
    ];

    render(
      <AccountCarousel
        accounts={accounts}
        asset="COPM/2"
        precision={2}
        unit="COP"
        value="ledger-2"
        onChange={() => {}}
      />,
    );

    expect(screen.getByText('Seleccionada')).toBeInTheDocument();
    expect(screen.getByLabelText(/Cuenta PawHaus/)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText(/Cuenta Main/)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('formats the balance chip using the given asset/precision/unit', () => {
    const accounts = [
      makeAccount({
        ledgerId: 'ledger-1',
        label: 'Main',
        balances: [{ asset: 'COPM/2', current: '150050', pending: '0' }],
      }),
    ];

    render(
      <AccountCarousel
        accounts={accounts}
        asset="COPM/2"
        precision={2}
        unit="COP"
        value={null}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText('1500.50 COP')).toBeInTheDocument();
  });
});
