import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  staffId: string | null;
  email: string;
  phone: string;
}

interface Session {
  user: User;
  expiresAt: string;
  lastActivity: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (phoneOrEmail: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string; redirectPath?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'wedring_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    try {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const parsedSession: Session = JSON.parse(storedSession);
        const expiresAt = new Date(parsedSession.expiresAt);

        if (expiresAt > new Date()) {
          setSession(parsedSession);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLastActivity = () => {
    if (session) {
      const updatedSession = {
        ...session,
        lastActivity: new Date().toISOString(),
      };
      setSession(updatedSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    }
  };

  useEffect(() => {
    if (session) {
      const interval = setInterval(updateLastActivity, 60000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const login = async (phoneOrEmail: string, password: string, rememberMe: boolean) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq.${phoneOrEmail},email.eq.${phoneOrEmail}`)
        .eq('password', password)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;

      if (!users || users.length === 0) {
        return { success: false, error: 'Invalid phone/email or password' };
      }

      const user = users[0];

      const expiresAt = rememberMe
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      const newSession: Session = {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          staffId: user.staff_id,
          email: user.email,
          phone: user.phone,
        },
        expiresAt: expiresAt.toISOString(),
        lastActivity: new Date().toISOString(),
      };

      setSession(newSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));

      const redirectPath = {
        admin: '/bookings',
        manager: '/bookings',
        staff: '/my-bookings',
      }[user.role as 'admin' | 'manager' | 'staff'];

      return { success: true, redirectPath };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        session,
        login,
        logout,
        isAuthenticated: !!session,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
