import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest, AUTH_TOKEN_KEY, ApiError } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

interface AuthSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInDemo: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;
    apiRequest<AuthUser>('/auth/me')
      .then((authenticatedUser) => {
        if (active) {
          setUser(authenticatedUser);
          setSession({ access_token: token, token_type: 'bearer', expires_in: 0, user: authenticatedUser });
        }
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const newSession = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(AUTH_TOKEN_KEY, newSession.access_token);
      setSession(newSession);
      setUser(newSession.user);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign in failed.' };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await apiRequest<{ user: AuthUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Account creation failed.' };
    }
  };

  const signInDemo = async () => {
    try {
      const newSession = await apiRequest<AuthSession>('/auth/demo', { method: 'POST' });
      localStorage.setItem(AUTH_TOKEN_KEY, newSession.access_token);
      setSession(newSession);
      setUser(newSession.user);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Demo sign in failed.' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setSession(null);
    setUser(null);
  };

  const resetPassword = async () => {
    try {
      await apiRequest<void>('/auth/password-reset', { method: 'POST' });
      return { error: null };
    } catch (error) {
      return { error: error instanceof ApiError ? error.message : 'Password reset is unavailable.' };
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signInDemo, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
