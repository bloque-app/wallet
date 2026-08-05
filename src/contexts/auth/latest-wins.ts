/**
 * A sequencer for overlapping async writes to the same piece of state, where
 * only the most recently *started* one should be allowed to land.
 *
 * The wallet resolves "who is signed in" from four places — `login`,
 * `completeOnboarding`, `refreshUser` and the mount-time `checkAuth` — any of
 * which can be in flight at once, each ending in `setCurrentUser`. Nothing
 * ordered them, so the winner was whichever `GET /identities/me` happened to
 * resolve last.
 *
 * That is not theoretical. Registering `pablo+test.5` while signed in as
 * `pablo+test.4` produced:
 *
 *     20:08:42.494  POST /origins/bloque-email/register   (creates test.5)
 *     20:08:42.976  GET  /identities/me                   (races it)
 *     20:08:43      register -> test.5
 *     20:08:43      me       -> test.4   ← old cookie, resolved last, won
 *
 * The account was created correctly and the browser stayed signed in as the
 * previous identity — so the wallet showed test.4's data, and skipped the
 * Terms gate because *test.4* had already accepted.
 *
 * `begin()` before the first await, `isCurrent(token)` before writing. A write
 * from a superseded attempt is dropped rather than applied late.
 */
export type LatestWins = {
  /** Claim a slot. Call before the first `await`, never after. */
  begin(): number;
  /** Whether the token from `begin()` is still the newest claim. */
  isCurrent(token: number): boolean;
};

export function makeLatestWins(): LatestWins {
  let latest = 0;
  return {
    begin: () => ++latest,
    isCurrent: (token: number) => token === latest,
  };
}
