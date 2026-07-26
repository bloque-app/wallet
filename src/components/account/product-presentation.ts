import { CreditCard, KeyRound, Landmark, Wallet } from 'lucide-react';
import type { Product } from '~/domain/accounts/types';

export function getProductKindLabel(kind: Product['kind']): string {
  switch (kind) {
    case 'card':
      return 'Tarjeta';
    case 'breb':
      return 'BRE-B';
    case 'polygon':
      return 'Polygon';
    case 'pocket':
      return 'Cuenta';
    default:
      return 'Otro';
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
