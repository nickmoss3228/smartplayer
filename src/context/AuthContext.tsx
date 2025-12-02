import React, { createContext, useContext, useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import {
  User,
  // AuthError,
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
      const response = await axios.get<TokenValidationResponse>(`${API_BASE_URL}/validate-token`, {
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
      
      const response = await axios.post<AuthResponse>(`${API_BASE_URL}/login`, requestData);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      
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
      
      const response = await axios.post<AuthResponse>(`${API_BASE_URL}/signup`, requestData);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      
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
        await axios.post(`${API_BASE_URL}/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const requestPasswordReset = async (email: string): Promise<ResetPasswordResult> => {
    try {
      const requestData: ResetPasswordRequest = { email };
      
      await axios.post(`${API_BASE_URL}/request-reset`, requestData);
      
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
      
      await axios.post(`${API_BASE_URL}/reset`, requestData);
      
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