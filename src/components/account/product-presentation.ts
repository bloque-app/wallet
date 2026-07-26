import { CreditCard, KeyRound, Landmark, Wallet } from 'lucide-react';
import type { Product } from '~/domain/accounts/types';
import i18n from '~/i18n/config';

export function getProductKindLabel(kind: Product['kind']): string {
  switch (kind) {
    case 'card':
      return i18n.t('accounts.productKind.card');
    case 'breb':
      return i18n.t('accounts.productKind.breb');
    case 'polygon':
      return i18n.t('accounts.productKind.polygon');
    case 'pocket':
      return i18n.t('accounts.productKind.pocket');
    default:
      return i18n.t('accounts.productKind.other');
  }
}

export function getProductKindIcon(kind: Product['kind']) {
  switch (kind) {
    case 'card':
      return CreditCard;
    case 'breb':
      return KeyRound;
    case 'polygon':
      return Wallet;
    default:
      return Landmark;
  }
}
