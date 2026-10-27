import type { BrebKeyProduct } from './types';

/** Where a BRE-B key stands, from its account and provider key status. */
export type BrebKeyState =
  | 'ready'
  | 'suspended'
  | 'in_progress'
  | 'failed'
  | 'removed';

export function brebKeyState(
  product: Pick<BrebKeyProduct, 'status' | 'keyStatus'>,
): BrebKeyState {
  if (product.status === 'deleted' || product.keyStatus === 'unregistered') {
    return 'removed';
  }
  if (product.status === 'creation_failed' || product.keyStatus === 'failed') {
    return 'failed';
  }
  if (
    product.status === 'creation_in_progress' ||
    product.keyStatus === 'processing'
  ) {
    return 'in_progress';
  }
  if (product.status === 'frozen') return 'suspended';
  return 'ready';
}

/** Failed and removed keys can be registered again. */
export function isRetryableBrebKey(
  product: Pick<BrebKeyProduct, 'status' | 'keyStatus'>,
): boolean {
  const state = brebKeyState(product);
  return state === 'failed' || state === 'removed';
}

/** The provider refused the key because it already exists in BRE-B. */
export const BREB_KEY_ALREADY_REGISTERED_CODE = 'KEY007';
