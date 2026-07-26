/**
 * Domain layer for the Payments/Transfers bounded context (topup, convert,
 * send, PSE, cashout, bank transfers, BRE-B payouts, rates).
 *
 * No SDK or React imports here, ever — mirrors src/domain/accounts/types.ts.
 * Adapters (src/infra/) are the only place SDK/wire shapes get translated
 * into these types.
 */

/**
 * A cleaned-up projection of the SDK's `SwapRate` — keeps only the fields
 * the UI actually reads. Drops internal-only fields (`id`, `swapSig`,
 * `maker`, `fee`, `at`, `fromMediums`, `toMediums`, `fromLimits`,
 * `toLimits`, `createdAt`, `updatedAt`) that nothing in this app consumes.
 */
export type Rate = {
  /** Rate signature — pass this to `create*Order` calls as `rateSig`. */
  sig: string;
  /** Exchange ratio (destination per source unit). */
  ratio: number;
  /** Rate tuple [sourceAmount, destinationAmount], both bigint strings-as-numbers. */
  rate: [number, number];
  fromAsset: string;
  toAsset: string;
  /** Timestamp until which this rate is valid. */
  until: string;
};

/**
 * A REAL, complete projection of the SDK's `SwapOrder` — every field the
 * wire type exposes, translated 1:1 (unlike the old `breb.ts` stopgap,
 * which only ever fabricated `{ order: { id } }`).
 */
export type PaymentOrder = {
  id: string;
  orderSig: string;
  rateSig: string;
  swapSig: string;
  taker: string;
  maker: string;
  fromAsset: string;
  toAsset: string;
  fromMedium: string;
  toMedium: string;
  fromAmount: string;
  toAmount: string;
  at: string;
  graphId: string;
  status: string;
  metadata?: Record<string, unknown>;
  webhookUrl?: string;
  failureReason?: string;
  failureDetails?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/**
 * What the app should do next after creating a swap order — replaces every
 * duplicated `getExecutionRedirectUrl(how: unknown)` across the routes.
 *
 * The `breb-deposit` case was previously silently swallowed: a paused
 * BRE-B on-ramp (redirect-less — the payer must send COP via their bank's
 * BRE-B app using `keyValue`/`amount`) has no `url` to redirect to, so the
 * old duck-typed `'url' in how` check returned `undefined` and the UI had
 * nothing to show the user.
 */
export type ExecutionOutcome =
  | { kind: 'redirect'; url: string }
  | {
      kind: 'breb-deposit';
      keyValue: string;
      amount: string;
      depositAccountUrn: string;
      depositStatus: string;
    }
  | { kind: 'none' };
