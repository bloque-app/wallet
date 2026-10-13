import { describe, expect, test } from 'bun:test';
import {
  inferBrebKeyType,
  isValidBrebKeyValue,
  normalizeBrebKeyValue,
} from './breb-key';

describe('inferBrebKeyType', () => {
  test('returns null for an empty value', () => {
    expect(inferBrebKeyType('   ')).toBeNull();
  });

  test('detects an alias', () => {
    expect(inferBrebKeyType('@MBP313')).toBe('ALPHA');
  });

  test('detects an email', () => {
    expect(inferBrebKeyType('bbva@pablodorado.com')).toBe('EMAIL');
  });

  test('detects a Colombian mobile number, with or without dial code', () => {
    expect(inferBrebKeyType('3001234567')).toBe('PHONE');
    expect(inferBrebKeyType('300 123 4567')).toBe('PHONE');
    expect(inferBrebKeyType('+57 300 123 4567')).toBe('PHONE');
  });

  test('treats other numeric values as an ID', () => {
    expect(inferBrebKeyType('1020304050')).toBe('ID');
    expect(inferBrebKeyType('1.020.304')).toBe('ID');
    expect(inferBrebKeyType('80123456')).toBe('ID');
  });

  test('falls back to alias for free text', () => {
    expect(inferBrebKeyType('MBP313')).toBe('ALPHA');
  });
});

describe('normalizeBrebKeyValue', () => {
  test('strips formatting and dial code from a phone', () => {
    expect(normalizeBrebKeyValue('PHONE', '+57 (300) 123-4567')).toBe(
      '3001234567',
    );
  });

  test('keeps only digits for an ID', () => {
    expect(normalizeBrebKeyValue('ID', ' 1.020.304.050 ')).toBe('1020304050');
  });

  test('lowercases an email', () => {
    expect(normalizeBrebKeyValue('EMAIL', ' Bbva@PabloDorado.com ')).toBe(
      'bbva@pablodorado.com',
    );
  });

  test('trims an alias without changing its case', () => {
    expect(normalizeBrebKeyValue('ALPHA', ' @MBP313 ')).toBe('@MBP313');
  });

  test('removes spaces from a BCODE', () => {
    expect(normalizeBrebKeyValue('BCODE', '0016 027 228')).toBe('0016027228');
  });
});

describe('isValidBrebKeyValue', () => {
  test('accepts well formed keys', () => {
    expect(isValidBrebKeyValue('PHONE', '3001234567')).toBe(true);
    expect(isValidBrebKeyValue('ID', '1020304050')).toBe(true);
    expect(isValidBrebKeyValue('EMAIL', 'bbva@pablodorado.com')).toBe(true);
    expect(isValidBrebKeyValue('ALPHA', '@MBP313')).toBe(true);
    expect(isValidBrebKeyValue('BCODE', '0016027228')).toBe(true);
  });

  test('rejects malformed keys', () => {
    expect(isValidBrebKeyValue('PHONE', '1001234567')).toBe(false);
    expect(isValidBrebKeyValue('ID', '123')).toBe(false);
    expect(isValidBrebKeyValue('EMAIL', 'bbva@pablodorado')).toBe(false);
    expect(isValidBrebKeyValue('ALPHA', 'MBP313')).toBe(false);
    expect(isValidBrebKeyValue('BCODE', '')).toBe(false);
  });
});
