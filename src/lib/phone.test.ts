import { describe, expect, test } from 'bun:test';
import {
  findPhoneCountry,
  isValidBrazilPhone,
  isValidInternationalPhone,
  joinInternationalPhone,
  normalizeBrazilPhoneInput,
  normalizeInternationalPhone,
  PHONE_COUNTRIES,
  splitInternationalPhone,
} from './phone';

const colombia = PHONE_COUNTRIES.find((country) => country.code === 'CO');

describe('normalizeInternationalPhone', () => {
  test('adds the selected country code to a local number', () => {
    expect(normalizeInternationalPhone('57', '321 355 8313')).toBe(
      '573213558313',
    );
  });

  test('does not duplicate a country code pasted with the number', () => {
    expect(normalizeInternationalPhone('57', '+57 321 355 8313')).toBe(
      '573213558313',
    );
  });

  test('removes formatting characters', () => {
    expect(normalizeInternationalPhone('1', '(415) 555-0100')).toBe(
      '14155550100',
    );
  });
});

describe('isValidInternationalPhone', () => {
  test('accepts an international number without the plus sign', () => {
    expect(isValidInternationalPhone('573213558313')).toBe(true);
  });

  test('rejects numbers outside the E.164 length limit', () => {
    expect(isValidInternationalPhone('57123')).toBe(false);
    expect(isValidInternationalPhone('1'.repeat(16))).toBe(false);
  });

  test('requires 10 national digits for Colombia', () => {
    expect(isValidInternationalPhone('573213558313', colombia)).toBe(true);
    expect(isValidInternationalPhone('573213558', colombia)).toBe(false);
    expect(isValidInternationalPhone('5732135583130', colombia)).toBe(false);
  });
});

describe('splitInternationalPhone', () => {
  test('splits a stored Colombian number with plus sign', () => {
    expect(splitInternationalPhone('+573001234567')).toEqual({
      countryCode: 'CO',
      nationalNumber: '3001234567',
    });
  });

  test('splits a stored number without plus sign', () => {
    expect(splitInternationalPhone('573001234567')).toEqual({
      countryCode: 'CO',
      nationalNumber: '3001234567',
    });
  });

  test('matches the longest dial code first', () => {
    expect(splitInternationalPhone('+593991234567')).toEqual({
      countryCode: 'EC',
      nationalNumber: '991234567',
    });
  });

  test('uses the first country listed for a shared dial code', () => {
    expect(splitInternationalPhone('+14155550100')).toEqual({
      countryCode: 'US',
      nationalNumber: '4155550100',
    });
  });

  test('leaves the country empty when it cannot be told apart', () => {
    expect(splitInternationalPhone('4155550100')).toEqual({
      countryCode: '',
      nationalNumber: '4155550100',
    });
    expect(splitInternationalPhone('+4915112345678')).toEqual({
      countryCode: '',
      nationalNumber: '4915112345678',
    });
  });

  test('keeps a bare national number under the default country', () => {
    expect(splitInternationalPhone('3001234567')).toEqual({
      countryCode: 'CO',
      nationalNumber: '3001234567',
    });
    expect(splitInternationalPhone('')).toEqual({
      countryCode: 'CO',
      nationalNumber: '',
    });
  });
});

describe('joinInternationalPhone', () => {
  const brazil = findPhoneCountry('BR');
  const colombia = findPhoneCountry('CO');
  if (!brazil || !colombia) throw new Error('missing countries');

  test('always prepends the dial code when the country has no fixed length', () => {
    expect(joinInternationalPhone(brazil, '55991234567')).toBe('5555991234567');
  });

  test('accepts the dial code already typed for a fixed-length country', () => {
    expect(joinInternationalPhone(colombia, '573001234567')).toBe(
      '573001234567',
    );
    expect(joinInternationalPhone(colombia, '300 123 4567')).toBe(
      '573001234567',
    );
  });
});

describe('US numbers', () => {
  const us = findPhoneCountry('US');

  test('require 10 national digits', () => {
    expect(isValidInternationalPhone('14155550100', us)).toBe(true);
    expect(isValidInternationalPhone('1415555010', us)).toBe(false);
  });
});

describe('Brazilian PIX phone', () => {
  test('keeps only national digits', () => {
    expect(normalizeBrazilPhoneInput('(11) 91234-5678')).toBe('11912345678');
    expect(normalizeBrazilPhoneInput('+55 11 91234-5678')).toBe('11912345678');
    expect(normalizeBrazilPhoneInput('5511912345678')).toBe('11912345678');
  });

  test('keeps an area code 55 number', () => {
    expect(normalizeBrazilPhoneInput('55 99123-4567')).toBe('55991234567');
  });

  test('validates area code plus 8 or 9 digits', () => {
    expect(isValidBrazilPhone('11912345678')).toBe(true);
    expect(isValidBrazilPhone('1132345678')).toBe(true);
    expect(isValidBrazilPhone('0191234567')).toBe(false);
    expect(isValidBrazilPhone('119123456')).toBe(false);
  });
});
