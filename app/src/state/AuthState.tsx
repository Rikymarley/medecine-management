import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiUser } from '../services/api';

type AuthState = {
  token: string | null;
  user: ApiUser | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    phone?: string;
    ninu?: string;
    specialty?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    password: string;
    password_confirmation: string;
    role: 'doctor' | 'pharmacy' | 'patient';
    pharmacy_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'med-app-token';
const USER_KEY = 'user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.me(token);
        setUser(me);
        localStorage.setItem(USER_KEY, JSON.stringify(me));
      } catch {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await api.login({ email, password });
    setToken(response.token);
    localStorage.setItem(TOKEN_KEY, response.token);
    setUser(response.user);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  };

  const register = async (payload: {
    name: string;
    email: string;
    phone?: string;
    ninu?: string;
    specialty?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    password: string;
    password_confirmation: string;
    role: 'doctor' | 'pharmacy' | 'patient';
    pharmacy_name?: string;
  }) => {
    const response = await api.register(payload);
    setToken(response.token);
    localStorage.setItem(TOKEN_KEY, response.token);
    setUser(response.user);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  };

  const logout = async () => {
    if (token) {
      await api.logout(token).catch(() => undefined);
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
