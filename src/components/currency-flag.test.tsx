import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CurrencyFlag, isFlagCurrency } from './currency-flag';

describe('CurrencyFlag', () => {
  test('renders an accessible flag for each supported currency', () => {
    render(
      <>
        <CurrencyFlag currency="COP" />
        <CurrencyFlag currency="USD" />
        <CurrencyFlag currency="MXN" />
        <CurrencyFlag currency="BRL" />
      </>,
    );

    for (const name of ['Colombia', 'Estados Unidos', 'México', 'Brasil']) {
      expect(screen.getByRole('img', { name })).toBeInTheDocument();
    }
  });

  test('only recognizes currencies with a flag', () => {
    expect(isFlagCurrency('COP')).toBe(true);
    expect(isFlagCurrency('KSM')).toBe(false);
  });
});
