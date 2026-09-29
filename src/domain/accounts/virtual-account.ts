import type { Account } from './types';

/** An account anchored by an active pocket (virtual account). */
export function isActiveVirtualAccount(account: Account): boolean {
  const primary = account.products.find(
    (product) => product.urn === account.primaryUrn,
  );
  return primary?.kind === 'pocket' && primary.status === 'active';
}

export function hasActiveVirtualAccount(accounts: Account[]): boolean {
  return accounts.some(isActiveVirtualAccount);
}
