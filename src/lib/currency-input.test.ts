import { describe, expect, test } from 'bun:test';
import { currencyMajorToMinor, normalizeCurrencyInput } from './currency-input';

describe('normalizeCurrencyInput', () => {
  test('preserves two decimal places with dot or comma separators', () => {
    expect(normalizeCurrencyInput('10.50')).toBe('10.50');
    expect(normalizeCurrencyInput('10,50')).toBe('10.50');
  });

  test('drops invalid characters and excess decimal places', () => {
    expect(normalizeCurrencyInput('MXN 10.509')).toBe('10.50');
  });
});

describe('currencyMajorToMinor', () => {
  test('converts decimal major units without floating point arithmetic', () => {
    expect(currencyMajorToMinor('10.50')).toBe('1050');
    expect(currencyMajorToMinor('10')).toBe('1000');
    expect(currencyMajorToMinor('0.01')).toBe('1');
  });

  test('rejects incomplete or invalid values', () => {
    expect(currencyMajorToMinor('.')).toBe('');
    expect(currencyMajorToMinor('10.500')).toBe('');
  });
});
