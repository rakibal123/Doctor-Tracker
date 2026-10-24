'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  networkError: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const router = useRouter();

  /**
   * Refreshes the session on demand via GET /api/v1/auth/me.
   */
  const checkSession = useCallback(async () => {
    try {
      const res = await api.get<{ user: AuthUser }>('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isNetworkError) {
          setNetworkError(error.message);
        } else if (error.status === 401) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }
  }, []);

  // Initial session check on mount (executed asynchronously)
  useEffect(() => {
    let isMounted = true;

    const verifyInitialSession = async () => {
      try {
        const res = await api.get<{ user: AuthUser }>('/auth/me');
        if (isMounted) {
          if (res.data?.user) {
            setUser(res.data.user);
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        if (isMounted) {
          if (error instanceof ApiError) {
            if (error.isNetworkError) {
              setNetworkError(error.message);
            } else if (error.status === 401) {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifyInitialSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Authenticates user with email and password via POST /api/v1/auth/login.
   */
  const login = async (credentials: LoginCredentials) => {
    setNetworkError(null);
    const res = await api.post<{ user: AuthUser }>('/auth/login', credentials);

    if (res.data?.user) {
      setUser(res.data.user);
      router.push('/dashboard');
    }
  };

  /**
   * Clears the session on backend via POST /api/v1/auth/logout.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      router.push('/login');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Logout failed. Please check your network connection.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        networkError,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
