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
import type { LoginData } from './types';

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
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  user: User;
};

export const AuthContext = createContext<AuthContextProps | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const isAuthenticated = currentUser !== null;

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

  const login = useCallback(async (data: LoginData) => {
    const alias = 'phone' in data ? data.phone : data.email;
    const origin = 'phone' in data ? 'bloque-whatsapp' : 'bloque-email';
    const sdk = createBloqueSdk(origin);

    const result = await sdk.connect(origin, alias, data.code);
    if (result.error) {
      toast.error('Upps, something went wrong. Please try again.');
      return;
    }
    const me = await sdk.me();
    setCurrentUser({
      urn: me.urn,
      name: me.profile.first_name,
      email: me.profile.email,
      kycStatus: me.metadata.kyc_verified ? 'approved' : 'rejected',
    });
  }, []);

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
          setCurrentUser({
            urn: me.urn,
            name: me.profile.first_name,
            email: me.profile.email,
            kycStatus: me.metadata.kyc_verified ? 'approved' : 'rejected',
          });
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loading: loading,
        isAuthenticated,
        sendOTP,
        login,
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
