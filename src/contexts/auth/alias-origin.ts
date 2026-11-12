/** Whether an alias lookup result belongs to the given origin. */
export function isAliasOfOrigin(found: unknown, origin: string): boolean {
  if (!found || typeof found !== 'object') return false;
  return (found as { origin?: unknown }).origin === origin;
}
