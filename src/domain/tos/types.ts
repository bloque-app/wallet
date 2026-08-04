/**
 * Domain layer for Terms of Service acceptance.
 *
 * No SDK or React imports here, ever — this is the app's own model of "has
 * this person accepted the terms", independent of how compliance shapes its
 * wire responses today. Adapters (src/infra/) are the only place SDK shapes
 * get translated. Mirrors src/domain/kyc/types.ts.
 *
 * Separate from the KYC domain on purpose: accepting the terms and passing
 * identity verification are independent processes that can happen in either
 * order, and conflating them makes states like "verified but never accepted"
 * impossible to represent.
 */

/** Whether the terms still need accepting before the account can be used. */
export type TosStatus = 'accepted' | 'required' | 'unknown';

export type TosGate = {
  /**
   * The hosted gate to navigate the user to.
   *
   * Short-lived and single-purpose. Never cache or persist it, and never
   * build one by hand: the capability token lives in the URL *fragment*,
   * which browsers don't send to servers, and it is bound to one identity
   * and one acceptance.
   */
  url: string;
};
