import type { AliasCheckResult } from './types';

/** Whether an alias lookup result belongs to the given origin. */
export function isAliasOfOrigin(found: unknown, origin: string): boolean {
  if (!found || typeof found !== 'object') return false;
  return (found as { origin?: unknown }).origin === origin;
}

/**
 * Registered only when the alias is active on `origin`. Not found, not yet
 * verified, or held by another origin all mean the user must sign up here.
 */
export async function resolveAliasStatus(
  lookup: () => Promise<unknown>,
  origin: string,
): Promise<AliasCheckResult> {
  try {
    const found = await lookup();
    return isAliasOfOrigin(found, origin)
      ? { status: 'registered' }
      : { status: 'not_registered' };
  } catch (error) {
    if (hasStatus(error, 404) || hasCode(error, 'E_ALIAS_NOT_VERIFIED')) {
      return { status: 'not_registered' };
    }
    throw error;
  }
}

/** Registration refused because the identity already exists on the origin. */
export function isIdentityAlreadyExistsError(error: unknown): boolean {
  return hasCode(error, 'E_IDENTITY_ALREADY_EXISTS');
}

function hasStatus(error: unknown, status: number): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as { status?: unknown }).status === status;
}

function hasCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code: c, message } = error as { code?: unknown; message?: unknown };
  return c === code || message === code;
}
