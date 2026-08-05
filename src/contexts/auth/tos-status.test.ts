import { describe, expect, it } from 'bun:test';
import type { TosStatus } from '~/domain/tos/types';
import { deriveTosStatus } from './tos-status';

describe('deriveTosStatus', () => {
  it('passes the repository answer through', async () => {
    expect(await deriveTosStatus('did:bloque:x', async () => 'required')).toBe(
      'required',
    );
    expect(await deriveTosStatus('did:bloque:x', async () => 'accepted')).toBe(
      'accepted',
    );
  });

  it('asks about the identity it was given', async () => {
    let asked: string | undefined;
    await deriveTosStatus('did:bloque:bloque-email:a@b.c', async (urn) => {
      asked = urn;
      return 'accepted';
    });
    expect(asked).toBe('did:bloque:bloque-email:a@b.c');
  });

  it('reports unknown rather than throwing out of the login path', async () => {
    // This runs inside `setAuthenticatedUser`, so a throw here would fail the
    // whole sign-in over a compliance hiccup.
    const status = await deriveTosStatus('did:bloque:x', async () => {
      throw new Error('compliance is down');
    });
    expect(status).toBe('unknown');
  });

  it('gives up rather than stalling sign-in on a hanging service', async () => {
    const hang = new Promise<TosStatus>(() => {});
    const started = Date.now();
    const status = await deriveTosStatus('did:bloque:x', () => hang);

    expect(status).toBe('unknown');
    // The 5s ceiling, not the SDK's ~2 minute retry budget.
    expect(Date.now() - started).toBeLessThan(30_000);
  }, 40_000);
});
