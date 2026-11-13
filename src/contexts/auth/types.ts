type LoginEmail = {
  email: string;
};

type LoginPhone = {
  phone: string;
};

export type LoginData = (LoginEmail | LoginPhone) & {
  code: string;
};

export type LoginMethod = 'email' | 'phone';

export const WALLET_ORIGIN = '30m' as const;
export type WalletOrigin = typeof WALLET_ORIGIN;

export interface OnboardingProfile {
  firstName: string;
  lastName: string;
}

export interface PendingProfileOnboarding {
  method: LoginMethod;
  origin: WalletOrigin;
  alias: string;
  profile: OnboardingProfile;
}

export type AliasCheckResult =
  | { status: 'registered' }
  | { status: 'not_registered' };

export type LoginResult =
  | { status: 'authenticated' }
  /** Signed in with a code, but this origin has no identity: sign up first. */
  | { status: 'onboarding_required' }
  /** Tried to sign up, but the identity exists: sign in with a new code. */
  | { status: 'already_registered' };
