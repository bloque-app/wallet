import { describe, expect, test } from 'bun:test';
import { createBloqueSdk } from './bloque';

describe('createBloqueSdk', () => {
  test('configures the HTTP transport for long-running payment rails', () => {
    const sdk = createBloqueSdk('wallet-test');
    const { httpClient } = sdk as unknown as {
      httpClient: { _config: { timeout?: number } };
    };

    expect(httpClient._config.timeout).toBe(120_000);
  });
});
