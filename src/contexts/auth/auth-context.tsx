import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { apiFetch } from '~/lib/api-fetch';
import { createBloqueSdk } from '~/lib/bloque';
import type {
  AliasCheckResult,
  LoginData,
  LoginMethod,
  LoginResult,
  OnboardingProfile,
  PendingOnboarding,
  PendingProfileOnboarding,
} from './types';

interface User {
  urn: string;
  name: string;
  email: string;
  kycStatus?: 'approved' | 'in_review' | 'rejected' | 'not_verified';
}

export type AuthContextProps = {
  loading: boolean;
  isAuthenticated: boolean;
  checkAlias: (method: LoginMethod, alias: string) => Promise<AliasCheckResult>;
  sendOTP: (method: 'email' | 'phone', alias: string) => Promise<void>;
  setPendingProfileOnboarding: (data: PendingProfileOnboarding | null) => void;
  login: (data: LoginData) => Promise<LoginResult>;
  completeOnboarding: (
    pending: PendingOnboarding,
    profile: OnboardingProfile,
  ) => Promise<void>;
  resetOnboardingState: () => void;
  logout: () => Promise<void>;
  user: User;
};

export const AuthContext = createContext<AuthContextProps | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const pendingOnboardingSessionRef = useRef<OnboardingSession | null>(null);
  const pendingProfileOnboardingRef = useRef<PendingProfileOnboarding | null>(
    null,
  );

  const isAuthenticated = currentUser !== null;

  const setAuthenticatedUser = useCallback(
    (me: Awaited<ReturnType<ReturnType<typeof createBloqueSdk>['me']>>) => {
      setCurrentUser({
        urn: me.urn,
        name: me.profile.first_name,
        email: me.profile.email,
        kycStatus: me.metadata.kyc_verified ? 'approved' : 'not_verified',
      });
    },
    [],
  );

  const checkAlias = useCallback(
    async (method: LoginMethod, alias: string): Promise<AliasCheckResult> => {
      const origin = method === 'phone' ? 'bloque-whatsapp' : 'bloque-email';
      const sdk = createBloqueSdk(origin);
      const identitySdk = sdk as unknown as AliasLookupApi;

      try {
        await identitySdk.identity.aliases.get(alias);
        return { status: 'registered' };
      } catch (error) {
        if (isNotFoundError(error)) {
          return { status: 'not_registered' };
        }
        throw error;
      }
    },
    [],
  );

  const sendOTP = useCallback(
    async (method: 'email' | 'phone', alias: string) => {
      const origin = method === 'phone' ? 'bloque-whatsapp' : 'bloque-email';
      const sdk = createBloqueSdk(origin);

      const result = await sdk.assert(origin, alias);
      if (!result.value) {
        toast.error('Upps, something went wrong. Please try again.');
        throw new Error('Failed to send OTP');
      }

      toast.success(
        `OTP sent to your ${method === 'phone' ? 'phone' : 'email'}`,
      );
    },
    [],
  );

  const setPendingProfileOnboarding = useCallback(
    (data: PendingProfileOnboarding | null) => {
      pendingProfileOnboardingRef.current = data;
    },
    [],
  );

  const login = useCallback(
    async (data: LoginData): Promise<LoginResult> => {
      const alias = 'phone' in data ? data.phone : data.email;
      const origin = 'phone' in data ? 'bloque-whatsapp' : 'bloque-email';
      const method = 'phone' in data ? 'phone' : 'email';
      const sdk = createBloqueSdk(origin);
      const registerApi = sdk as unknown as OriginRegisterApi;

      try {
        if (pendingProfileOnboardingRef.current) {
          const pendingProfile = pendingProfileOnboardingRef.current;
          await registerApi.identity.origins.register(alias, origin, {
            type: 'individual',
            profile: {
              firstName: pendingProfile.profile.firstName,
              lastName: pendingProfile.profile.lastName,
              email:
                pendingProfile.method === 'email'
                  ? pendingProfile.alias
                  : undefined,
              phone:
                pendingProfile.method === 'phone'
                  ? pendingProfile.alias
                  : undefined,
            },
            assertionResult: {
              alias,
              challengeType: 'OTP',
              value:
                method === 'email'
                  ? { code: data.code, email: alias }
                  : { code: data.code, phone: alias },
            },
            extraContext: {},
          });
          pendingOnboardingSessionRef.current = null;
        } else {
          const session = await sdk.connect(origin, alias, data.code);
          pendingOnboardingSessionRef.current = session;
        }

        const me = await sdk.me();
        pendingOnboardingSessionRef.current = null;
        pendingProfileOnboardingRef.current = null;
        setAuthenticatedUser(me);
        return { status: 'authenticated' };
      } catch (error) {
        if (isIdentityNotFoundError(error)) {
          return {
            status: 'onboarding_required',
            pending: { method, origin, alias, code: data.code },
          };
        }

        pendingOnboardingSessionRef.current = null;
        pendingProfileOnboardingRef.current = null;
        throw error;
      }
    },
    [setAuthenticatedUser],
  );

  const completeOnboarding = useCallback(
    async (pending: PendingOnboarding, profile: OnboardingProfile) => {
      const sdk = createBloqueSdk(pending.origin);
      const session = pendingOnboardingSessionRef.current;

      if (!session) {
        throw new Error('Missing onboarding session');
      }

      await session.identity.updateMe({
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: pending.method === 'email' ? pending.alias : undefined,
          phone: pending.method === 'phone' ? pending.alias : undefined,
        },
      });

      const me = await sdk.me();
      pendingOnboardingSessionRef.current = null;
      pendingProfileOnboardingRef.current = null;
      setAuthenticatedUser(me);
    },
    [setAuthenticatedUser],
  );

  const resetOnboardingState = useCallback(() => {
    pendingOnboardingSessionRef.current = null;
    pendingProfileOnboardingRef.current = null;
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'DELETE' });
    } catch {
      console.error('Error logging out');
    } finally {
      localStorage.clear();
      setCurrentUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const sdk = createBloqueSdk();
        const me = await sdk.me();
        if (me) {
          setAuthenticatedUser(me);
        }
      } catch {
        console.error('Error checking auth');
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, [setAuthenticatedUser]);

  return (
    <AuthContext.Provider
      value={{
        loading,
        isAuthenticated,
        checkAlias,
        sendOTP,
        setPendingProfileOnboarding,
        login,
        completeOnboarding,
        resetOnboardingState,
        logout,
        user: currentUser as User,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

function isIdentityNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('status' in error && (error as { status?: unknown }).status === 404) {
    const code = (error as { code?: unknown }).code;
    const message = (error as { message?: unknown }).message;
    return (
      code === 'E_IDENTITY_NOT_FOUND' || message === 'E_IDENTITY_NOT_FOUND'
    );
  }
  return false;
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return 'status' in error && (error as { status?: unknown }).status === 404;
}

type OnboardingSession = {
  identity: {
    updateMe: (params: {
      profile?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      };
    }) => Promise<unknown>;
  };
};

type AliasLookupApi = {
  identity: {
    aliases: {
      get: (alias: string) => Promise<unknown>;
    };
  };
};

type OriginRegisterApi = {
  identity: {
    origins: {
      register: (
        alias: string,
        origin: 'bloque-email' | 'bloque-whatsapp',
        params: {
          type: 'individual';
          profile: {
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
          };
          assertionResult: {
            alias: string;
            challengeType: 'OTP';
            value: { code: string; email?: string; phone?: string };
          };
          extraContext: Record<string, unknown>;
        },
      ) => Promise<{ accessToken: string }>;
    };
  };
};
