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

export interface PendingOnboarding {
  method: LoginMethod;
  origin: 'bloque-email' | 'bloque-whatsapp';
  alias: string;
  code: string;
}

export interface OnboardingProfile {
  firstName: string;
  lastName: string;
}

export interface PendingProfileOnboarding {
  method: LoginMethod;
  origin: 'bloque-email' | 'bloque-whatsapp';
  alias: string;
  profile: OnboardingProfile;
}

export type AliasCheckResult =
  | { status: 'registered' }
  | { status: 'not_registered' };

export type LoginResult =
  | { status: 'authenticated' }
  | { status: 'onboarding_required'; pending: PendingOnboarding };
