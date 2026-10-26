type ApiErrorShape = { status?: unknown; code?: unknown; message?: unknown };

function asApiError(error: unknown): ApiErrorShape | null {
  return typeof error === 'object' && error !== null
    ? (error as ApiErrorShape)
    : null;
}

export function isAliasNotFoundError(error: unknown): boolean {
  const apiError = asApiError(error);
  if (!apiError) return false;
  return (
    apiError.status === 404 ||
    apiError.code === 'E_ALIAS_NOT_FOUND' ||
    apiError.message === 'E_ALIAS_NOT_FOUND'
  );
}

/**
 * Raw backend codes (`E_*`) and the SDK's passkey-approval errors, whose
 * messages are written for developers, are never shown to users; anything
 * else is.
 */
export function userFacingErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const apiError = asApiError(error);
  if (
    typeof apiError?.code === 'string' &&
    apiError.code.startsWith('E_APPROVAL')
  ) {
    return fallback;
  }
  const message = apiError?.message;
  if (typeof message !== 'string' || !message || message.startsWith('E_')) {
    return fallback;
  }
  return message;
}
