import { describe, expect, test } from 'bun:test';
import {
  isValidInternationalPhone,
  normalizeInternationalPhone,
  PHONE_COUNTRIES,
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
