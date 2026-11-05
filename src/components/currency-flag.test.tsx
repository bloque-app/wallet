import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CurrencyFlag, isFlagCurrency } from './currency-flag';

describe('CurrencyFlag', () => {
  test('renders an accessible flag for each supported currency', () => {
    render(
      <>
        <CurrencyFlag currency="COP" labelled />
        <CurrencyFlag currency="USD" labelled />
        <CurrencyFlag currency="MXN" labelled />
        <CurrencyFlag currency="BRL" labelled />
      </>,
    );

    for (const name of ['Colombia', 'Estados Unidos', 'México', 'Brasil']) {
      expect(screen.getByRole('img', { name })).toBeInTheDocument();
    }
  });

  test('stays out of the accessible name by default', () => {
    render(
      <button type="button">
        <CurrencyFlag currency="USD" />
        USD
      </button>,
    );

    expect(screen.getByRole('button', { name: 'USD' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('only recognizes currencies with a flag', () => {
    expect(isFlagCurrency('COP')).toBe(true);
    expect(isFlagCurrency('KSM')).toBe(false);
  });
});
