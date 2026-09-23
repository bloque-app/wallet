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

export interface PendingOnboarding {
  method: LoginMethod;
  origin: WalletOrigin;
  alias: string;
  code: string;
}

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
  | { status: 'onboarding_required'; pending: PendingOnboarding };
