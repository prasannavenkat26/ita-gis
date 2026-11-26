import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest, AUTH_TOKEN_KEY, ApiError } from '@/lib/api';
import { LOCAL_DEMO_TOKEN, LOCAL_DEMO_USER_KEY } from '@/lib/demoApi';

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

    if (token === LOCAL_DEMO_TOKEN) {
      try {
        const storedUser = localStorage.getItem(LOCAL_DEMO_USER_KEY);
        const localUser = storedUser ? JSON.parse(storedUser) as AuthUser : null;
        if (localUser?.id === 'local-demo-user' && localUser.email === 'demo@local') {
          setUser(localUser);
          setSession({ access_token: LOCAL_DEMO_TOKEN, token_type: 'bearer', expires_in: 0, user: localUser });
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(LOCAL_DEMO_USER_KEY);
      }
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
      const savedUser = localStorage.getItem(LOCAL_DEMO_USER_KEY);
      const demoUser: AuthUser = savedUser
        ? JSON.parse(savedUser) as AuthUser
        : { id: 'local-demo-user', email: 'demo@local', created_at: new Date().toISOString() };
      if (demoUser.id !== 'local-demo-user' || demoUser.email !== 'demo@local') {
        throw new Error("Local demo account data is invalid. Clear this site's storage and try again.");
      }
      const newSession: AuthSession = {
        access_token: LOCAL_DEMO_TOKEN,
        token_type: 'bearer',
        expires_in: 0,
        user: demoUser,
      };
      localStorage.setItem(LOCAL_DEMO_USER_KEY, JSON.stringify(demoUser));
      localStorage.setItem(AUTH_TOKEN_KEY, LOCAL_DEMO_TOKEN);
      setSession(newSession);
      setUser(demoUser);
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

  const resetPassword = async (email: string) => {
    try {
      await apiRequest<void>('/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
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
