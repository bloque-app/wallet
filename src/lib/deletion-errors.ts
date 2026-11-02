import i18n from '~/i18n/config';

/** Backend or provider code of a failed deletion, when it carries one. */
export function deletionErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code === 'string') return code;
  return typeof message === 'string' && message.startsWith('E_')
    ? message
    : undefined;
}

/**
 * Why the backend refused to delete a BRE-B key. Undefined when the error
 * does not prove nothing was deleted.
 */
export function brebKeyDeletionRefusal(error: unknown): string | undefined {
  switch (deletionErrorCode(error)) {
    case 'E_ACCOUNT_HAS_BALANCE':
      return i18n.t('brebKeys.manageKeys.deleteBalanceError');
    case 'E_BREB_KEY_DELETION_FAILED':
      return i18n.t('brebKeys.manageKeys.deleteProviderError');
    default:
      return undefined;
  }
}

/**
 * Why the backend refused to delete a pocket. Undefined when the error does
 * not prove nothing was deleted.
 */
export function pocketDeletionRefusal(error: unknown): string | undefined {
  switch (deletionErrorCode(error)) {
    case 'E_ACCOUNT_HAS_BALANCE':
      return i18n.t('accounts.detail.deleteBalanceError');
    case 'E_DEFAULT_ACCOUNT_UNDELETABLE':
      return i18n.t('accounts.detail.deleteDefaultError');
    default:
      return undefined;
  }
}
