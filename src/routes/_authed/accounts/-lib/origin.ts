export type AccountsOrigin = 'home' | 'profile' | 'card';

export const ACCOUNTS_ORIGIN_ROUTES: Record<AccountsOrigin, string> = {
  home: '/',
  profile: '/profile',
  card: '/card',
};

export function parseAccountsOrigin(
  value: unknown,
): AccountsOrigin | undefined {
  return value === 'home' || value === 'profile' || value === 'card'
    ? value
    : undefined;
}
