import { describe, expect, it } from 'bun:test';
import { makeLatestWins } from './latest-wins';

describe('makeLatestWins', () => {
  it('lets a lone attempt through', () => {
    const seq = makeLatestWins();
    expect(seq.isCurrent(seq.begin())).toBe(true);
  });

  it('drops an earlier attempt that resolves last', () => {
    // The exact production shape: a stale `me` starts first, a newer one
    // starts second, and the stale one comes back last. Without this it wins
    // and the app stays signed in as the previous identity.
    const seq = makeLatestWins();
    const stale = seq.begin();
    const fresh = seq.begin();

    expect(seq.isCurrent(stale)).toBe(false);
    expect(seq.isCurrent(fresh)).toBe(true);
  });

  it('keeps only the newest of many overlapping attempts', () => {
    // Four callers can be in flight at once: login, completeOnboarding,
    // refreshUser and the mount-time checkAuth.
    const seq = makeLatestWins();
    const tokens = [seq.begin(), seq.begin(), seq.begin(), seq.begin()];

    expect(tokens.filter((t) => seq.isCurrent(t))).toEqual([tokens[3]]);
  });

  it('does not let a superseded attempt become current again', () => {
    const seq = makeLatestWins();
    const first = seq.begin();
    seq.begin();
    seq.begin();
    expect(seq.isCurrent(first)).toBe(false);
  });
});
