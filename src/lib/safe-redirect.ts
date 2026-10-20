/**
 * The in-app path to land on after signing in, from an untrusted `?redirect=`
 * value, or `fallback`.
 *
 * Only same-origin absolute paths are accepted. Anything that could leave the
 * wallet (`https://…`, protocol-relative `//host`, `/\host`, which browsers
 * normalize to `//host`) falls back, so the login page can't be used as an
 * open redirect.
 */
export function safeRedirectPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
