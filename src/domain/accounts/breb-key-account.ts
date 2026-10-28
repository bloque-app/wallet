import type { Account, BrebKeyProduct } from './types';

export type BrebKeyAccount = {
  product: BrebKeyProduct;
  accountLabel: string;
};

export function brebKeyAccounts(
  accounts: Account[] | undefined,
): BrebKeyAccount[] {
  return (accounts ?? []).flatMap((account) =>
    account.products
      .filter((product): product is BrebKeyProduct => product.kind === 'breb')
      .map((product) => ({ product, accountLabel: account.label })),
  );
}
