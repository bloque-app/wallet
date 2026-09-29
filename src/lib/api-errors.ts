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

/** Raw backend codes (`E_*`) are never shown to users; anything else is. */
export function userFacingErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const message = asApiError(error)?.message;
  if (typeof message !== 'string' || !message || message.startsWith('E_')) {
    return fallback;
  }
  return message;
}
