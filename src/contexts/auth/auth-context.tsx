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
import type { VerificationStatus } from '~/domain/kyc/types';
import type { TosStatus } from '~/domain/tos/types';
import { apiFetch } from '~/lib/api-fetch';
import { createBloqueSdk, resetBloque } from '~/lib/bloque';
import { queryClient } from '~/lib/query-client';
import { deriveKycStatus } from './kyc-status';
import { makeLatestWins } from './latest-wins';
import { deriveTosStatus } from './tos-status';
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
  phone: string;
  personalIdNumber: string;
  personalIdType: string;
  kycStatus?: VerificationStatus;
  /** Whether this identity still owes a Terms of Service acceptance. */
  tosStatus?: TosStatus;
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
  /** Silently re-fetches the current profile without affecting `loading` or signing the user out on failure. */
  refreshUser: () => Promise<void>;
  /**
   * Re-reads only the Terms of Service status, for a session that has been
   * open long enough to have gone stale. Deliberately narrower than
   * `refreshUser`: it must be cheap enough to run on a timer and on every
   * window focus.
   */
  refreshTosStatus: () => Promise<void>;
  user: User;
};

function originForMethod(
  method: LoginMethod,
): 'bloque-whatsapp' | 'bloque-email' {
  return method === 'phone' ? 'bloque-whatsapp' : 'bloque-email';
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  /**
   * Orders the four overlapping paths that can resolve "who is signed in", so
   * a superseded `GET /identities/me` cannot land after a newer one. See
   * `latest-wins.ts` for the incident this comes from.
   */
  const authSeqRef = useRef(makeLatestWins());
  /** Whose session the memoized SDK client currently holds. */
  const signedInUrnRef = useRef<string | null>(null);
  const pendingOnboardingSessionRef = useRef<OnboardingSession | null>(null);
  const pendingProfileOnboardingRef = useRef<PendingProfileOnboarding | null>(
    null,
  );

  const isAuthenticated = currentUser !== null;

  const setAuthenticatedUser = useCallback(
    async (
      me: Awaited<ReturnType<ReturnType<typeof createBloqueSdk>['me']>>,
    ) => {
      // Claimed before the first await, so a slower earlier caller cannot
      // overwrite a newer identity when it eventually resolves.
      const token = authSeqRef.current.begin();

      // Any change of identity invalidates the memoized authenticated client,
      // which still holds the previous session. Tracked on a ref rather than
      // read out of state: a state updater must stay pure, and React may run
      // it twice.
      if (signedInUrnRef.current && signedInUrnRef.current !== me.urn) {
        resetBloque();
      }
      signedInUrnRef.current = me.urn;

      // Concurrent, not sequential: both are on the login path and each has
      // its own 5s ceiling, so chaining them would double the worst case a
      // user waits for the wallet to appear.
      const [kycStatus, tosStatus] = await Promise.all([
        deriveKycStatus(me.urn),
        deriveTosStatus(me.urn),
      ]);

      // Superseded while those were in flight — drop it rather than land a
      // stale identity over the current one.
      if (!authSeqRef.current.isCurrent(token)) return;

      setCurrentUser({
        urn: me.urn,
        name: me.profile.first_name,
        email: me.profile.email,
        phone: me.profile.phone,
        personalIdNumber: me.profile.personal_id_number,
        personalIdType: me.profile.personal_id_type,
        kycStatus,
        tosStatus,
      });
    },
    [],
  );

  const checkAlias = useCallback(
    async (method: LoginMethod, alias: string): Promise<AliasCheckResult> => {
      const origin = originForMethod(method);
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
      const origin = originForMethod(method);
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
      const method = 'phone' in data ? 'phone' : 'email';
      const origin = originForMethod(method);
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
        await setAuthenticatedUser(me);
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
      await setAuthenticatedUser(me);
    },
    [setAuthenticatedUser],
  );

  const resetOnboardingState = useCallback(() => {
    pendingOnboardingSessionRef.current = null;
    pendingProfileOnboardingRef.current = null;
  }, []);

  /**
   * Screens whose data can go stale between the once-per-session `checkAuth`
   * fetch and a later visit (e.g. completing KYC updates `phone`/personal ID
   * fields) can call this to pick up fresh values. Deliberately silent on
   * failure — a background refresh hiccup shouldn't sign the user out.
   */
  const refreshUser = useCallback(async () => {
    try {
      const sdk = createBloqueSdk();
      const me = await sdk.me();
      if (me) {
        setAuthenticatedUser(me);
      }
    } catch {
      console.error('Error refreshing user profile');
    }
  }, [setAuthenticatedUser]);

  /**
   * A new document version activating, or a grace period lapsing, can make a
   * signed-in user non-compliant without them doing anything. Nothing else
   * re-reads this: the status is resolved once at authentication, so without
   * this a tab left open across a release would never notice.
   *
   * Silent on failure, and leaves the previous value alone — `deriveTosStatus`
   * already maps its own failures to 'unknown', and overwriting a known
   * 'accepted' with that on a network blip would prompt someone who is
   * perfectly compliant.
   */
  const refreshTosStatus = useCallback(async () => {
    const urn = currentUser?.urn;
    if (!urn) return;

    const tosStatus = await deriveTosStatus(urn);
    if (tosStatus === 'unknown') return;

    // Functional update, and compared before writing: this runs on a timer and
    // on every focus, so a new object each time would re-render the whole tree
    // for nothing.
    setCurrentUser((latest) =>
      latest && latest.tosStatus !== tosStatus
        ? { ...latest, tosStatus }
        : latest,
    );
  }, [currentUser?.urn]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'DELETE' });
    } catch {
      console.error('Error logging out');
    } finally {
      queryClient.clear();
      localStorage.clear();
      // The memoized client holds the session that was just ended.
      resetBloque();
      signedInUrnRef.current = null;
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
          await setAuthenticatedUser(me);
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
        refreshUser,
        refreshTosStatus,
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
