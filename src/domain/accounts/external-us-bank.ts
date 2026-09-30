import type { ExternalUsBankProduct, Product } from './types';

function isExternalUsBank(product: Product): product is ExternalUsBankProduct {
  return product.kind === 'external-us-bank';
}

/** A linked US bank that can source an ACH payin right now. */
export function isUsableUsBank(product: Product): boolean {
  return (
    isExternalUsBank(product) &&
    product.status === 'active' &&
    product.linkStatus === 'active'
  );
}

/** A linking attempt that will never become usable. */
export function isFailedUsBank(product: Product): boolean {
  return (
    isExternalUsBank(product) &&
    (product.status === 'creation_failed' ||
      product.linkStatus === 'link_failed')
  );
}

/** Plaid finished linking but the backend hasn't activated the account yet. */
export function isLinkingUsBank(product: Product): boolean {
  return (
    isExternalUsBank(product) &&
    product.status === 'creation_in_progress' &&
    product.linkStatus === 'active'
  );
}

/** A linking attempt that won't change state anymore without user action. */
export function isUsBankLinkSettled(product: Product): boolean {
  return isUsableUsBank(product) || isFailedUsBank(product);
}

/** Products worth showing to the user — failed US bank links are hidden. */
export function visibleProducts(products: Product[]): Product[] {
  return products.filter((product) => !isFailedUsBank(product));
}
