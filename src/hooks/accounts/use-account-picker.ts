import { useMemo } from 'react';
import type { Account, Product } from '~/domain/accounts/types';
import { useAccounts } from './use-accounts';

type AccountPickerOptions = {
  /** Only include accounts whose primary product is active. Default true. */
  requireActive?: boolean;
  /** Only include accounts holding a positive balance of this asset. */
  asset?: string;
  /** Only include accounts that have at least one product of this kind. */
  requireProductKind?: Product['kind'];
  /**
   * Only include accounts with an `external-us-bank` product in this Plaid
   * `linkStatus` — distinct from `requireActive`, which checks the primary
   * product's top-level `status`, not Plaid's linking state.
   */
  requireLinkStatus?: Extract<
    Product,
    { kind: 'external-us-bank' }
  >['linkStatus'];
};

function hasPositiveBalance(account: Account, asset: string): boolean {
  const entry = account.balances.find((balance) => balance.asset === asset);
  if (!entry) return false;
  try {
    return BigInt(entry.current) > 0n;
  } catch {
    return false;
  }
}

/**
 * Accounts a new product could be tied to, or an existing funded account
 * could be picked to act from — parametrized so both "which account should
 * this new card/BRE-B key/Polygon address join" and "which of my funded
 * BRE-B accounts should this send draw from" share one implementation.
 */
export function useAccountPicker(options: AccountPickerOptions = {}) {
  const accountsQuery = useAccounts();
  const {
    requireActive = true,
    asset,
    requireProductKind,
    requireLinkStatus,
  } = options;

  const accounts = useMemo(() => {
    return (accountsQuery.data ?? []).filter((account) => {
      const primary = account.products.find(
        (product) => product.urn === account.primaryUrn,
      );

      if (requireActive && primary?.status !== 'active') return false;
      if (asset && !hasPositiveBalance(account, asset)) return false;
      if (
        requireProductKind &&
        !account.products.some((product) => product.kind === requireProductKind)
      ) {
        return false;
      }
      if (
        requireLinkStatus &&
        !account.products.some(
          (product) =>
            product.kind === 'external-us-bank' &&
            product.linkStatus === requireLinkStatus,
        )
      ) {
        return false;
      }

      return true;
    });
  }, [
    accountsQuery.data,
    requireActive,
    asset,
    requireProductKind,
    requireLinkStatus,
  ]);

  return { accounts, isLoading: accountsQuery.isLoading };
}
