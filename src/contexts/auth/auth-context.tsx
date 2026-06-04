import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { toast } from 'sonner';
import { apiFetch } from '~/lib/api-fetch';
import { createBloqueSdk } from '~/lib/bloque';
import type {
  LoginData,
  LoginResult,
  OnboardingProfile,
  PendingOnboarding,
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
  sendOTP: (method: 'email' | 'phone', alias: string) => Promise<void>;
  login: (data: LoginData) => Promise<LoginResult>;
  completeOnboarding: (
    pending: PendingOnboarding,
    profile: OnboardingProfile,
  ) => Promise<void>;
  logout: () => Promise<void>;
  user: User;
};

export const AuthContext = createContext<AuthContextProps | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const isAuthenticated = currentUser !== null;

  const setAuthenticatedUser = useCallback(
    (me: Awaited<ReturnType<ReturnType<typeof createBloqueSdk>['me']>>) => {
      setCurrentUser({
        urn: me.urn,
        name: me.profile.first_name,
        email: me.profile.email,
        kycStatus: me.metadata.kyc_verified ? 'approved' : 'rejected',
      });
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
        return;
      }
      toast.success(
        `OTP sent to your ${method === 'phone' ? 'phone' : 'email'}`,
      );
    },
    [],
  );

  const login = useCallback(
    async (data: LoginData): Promise<LoginResult> => {
      const alias = 'phone' in data ? data.phone : data.email;
      const origin = 'phone' in data ? 'bloque-whatsapp' : 'bloque-email';
      const method = 'phone' in data ? 'phone' : 'email';
      const sdk = createBloqueSdk(origin);

      try {
        await sdk.connect(origin, alias, data.code);
        const me = await sdk.me();
        setAuthenticatedUser(me);
        return { status: 'authenticated' };
      } catch (error) {
        if (isIdentityNotFoundError(error)) {
          return {
            status: 'onboarding_required',
            pending: { method, origin, alias, code: data.code },
          };
        }
        throw error;
      }
    },
    [setAuthenticatedUser],
  );

  const completeOnboarding = useCallback(
    async (pending: PendingOnboarding, profile: OnboardingProfile) => {
      const sdk = createBloqueSdk(pending.origin);
      await registerIdentityWithOtp(sdk, pending, profile);

      await sdk.connect(pending.origin, pending.alias, pending.code);
      const me = await sdk.me();
      setAuthenticatedUser(me);
    },
    [setAuthenticatedUser],
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'DELETE' });
    } catch (error) {
      console.error('Error logging out:', error);
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
      } catch (error) {
        console.error('Error checking auth:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setAuthenticatedUser]);

  return (
    <AuthContext.Provider
      value={{
        loading: loading,
        isAuthenticated,
        sendOTP,
        login,
        completeOnboarding,
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

type IdentityRegisterApi = {
  identity: {
    origins: {
      register: (
        alias: string,
        origin: string,
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
        },
      ) => Promise<{ accessToken: string }>;
    };
  };
};

async function registerIdentityWithOtp(
  sdk: ReturnType<typeof createBloqueSdk>,
  pending: PendingOnboarding,
  profile: OnboardingProfile,
) {
  const identitySdk = sdk as unknown as IdentityRegisterApi;
  await identitySdk.identity.origins.register(pending.alias, pending.origin, {
    type: 'individual',
    profile: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: pending.method === 'email' ? pending.alias : undefined,
      phone: pending.method === 'phone' ? pending.alias : undefined,
    },
    assertionResult: {
      alias: pending.alias,
      challengeType: 'OTP',
      value:
        pending.method === 'email'
          ? { code: pending.code, email: pending.alias }
          : { code: pending.code, phone: pending.alias },
    },
  });
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
