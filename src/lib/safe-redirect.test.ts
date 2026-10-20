import { describe, expect, test } from 'bun:test';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  test('keeps an in-app path, search included', () => {
    expect(safeRedirectPath('/passkey')).toBe('/passkey');
    expect(safeRedirectPath('/send?to=alice')).toBe('/send?to=alice');
  });

  test('falls back when there is no redirect', () => {
    expect(safeRedirectPath(undefined)).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
  });

  test('never leaves the wallet', () => {
    expect(safeRedirectPath('https://evil.example')).toBe('/');
    expect(safeRedirectPath('//evil.example')).toBe('/');
    expect(safeRedirectPath('/\\evil.example')).toBe('/');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/');
  });
});
