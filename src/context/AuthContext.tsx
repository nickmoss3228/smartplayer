import React, { createContext, useContext, useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import {
  User,
  AuthResult,
  AuthContextValue,
  AuthProviderProps,
  LoginRequest,
  SignUpRequest,
  AuthResponse,
  TokenValidationResponse,
  ResetPasswordRequest,
  ResetPasswordConfirmRequest,
  ResetPasswordResult
} from '../types/Auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      checkTokenValidity(token);
    } else {
      setLoading(false);
    }
  }, []);

  const checkTokenValidity = async (token: string): Promise<void> => {
    try {
      const response = await axios.get<TokenValidationResponse>(`${API_BASE_URL}/api/validate-token`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string): Promise<AuthResult> => {
    try {
      const requestData: LoginRequest = {
        usernameOrEmail: username,
        password
      };
      
      const response = await axios.post<AuthResponse>(`${API_BASE_URL}/api/login`, requestData);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      
    // Prefetch progress data immediately after successful login
      setTimeout(async () => {
        try {
          // We can't use useProgress here directly, but we can make the API call
          const headers = { Authorization: `Bearer ${token}` };
          const [easyResponse, mediumResponse, hardResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/progress/easy`, { headers }),
            axios.get(`${API_BASE_URL}/api/progress/medium`, { headers }),
            axios.get(`${API_BASE_URL}/api/progress/hard`, { headers }),
          ]);

          const progressData = {
            easy: { ...easyResponse.data, loading: false },
            medium: { ...mediumResponse.data, loading: false },
            hard: { ...hardResponse.data, loading: false },
            initialLoad: false,
          };

          // Cache the data
          localStorage.setItem('progressData', JSON.stringify(progressData));
          localStorage.setItem('progressCacheTime', Date.now().toString());
        } catch (error) {
          console.error('Failed to prefetch progress:', error);
        }
      }, 0);
      
      return { user, error: null };
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Login failed';
      return { user: null, error: { message: errorMessage } };
    }
  };

  const signUp = async (username: string, email: string, password: string): Promise<AuthResult> => {
    try {
      const requestData: SignUpRequest = {
        username,
        email,
        password
      };
      
      const response = await axios.post<AuthResponse>(`${API_BASE_URL}/api/signup`, requestData);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      
      // Also prefetch on signup
      setTimeout(async () => {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const [easyResponse, mediumResponse, hardResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/progress/easy`, { headers }),
            axios.get(`${API_BASE_URL}/api/progress/medium`, { headers }),
            axios.get(`${API_BASE_URL}/api/progress/hard`, { headers }),
          ]);

          const progressData = {
            easy: { ...easyResponse.data, loading: false },
            medium: { ...mediumResponse.data, loading: false },
            hard: { ...hardResponse.data, loading: false },
            initialLoad: false,
          };

          localStorage.setItem('progressData', JSON.stringify(progressData));
          localStorage.setItem('progressCacheTime', Date.now().toString());
          console.log('✅ Progress data prefetched and cached');
        } catch (error) {
          console.error('Failed to prefetch progress:', error);
        }
      }, 0);
      
      return { user, error: null };
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Registration failed';
      return { user: null, error: { message: errorMessage } };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post(`${API_BASE_URL}/api/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('progressData');
      localStorage.removeItem('progressCacheTime');
      setUser(null);
    }
  };

  const requestPasswordReset = async (email: string): Promise<ResetPasswordResult> => {
    try {
      const requestData: ResetPasswordRequest = { email };
      
      await axios.post(`${API_BASE_URL}/api/request-reset`, requestData);
      
      return { success: true, error: null };
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Failed to send reset email';
      return { success: false, error: { message: errorMessage } };
    }
  };

  const confirmPasswordReset = async (token: string, newPassword: string): Promise<ResetPasswordResult> => {
    try {
      const requestData: ResetPasswordConfirmRequest = { token, newPassword };
      
      await axios.post(`${API_BASE_URL}/api/reset`, requestData);
      
      return { success: true, error: null };
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || 'Failed to reset password';
      return { success: false, error: { message: errorMessage } };
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    confirmPasswordReset
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};