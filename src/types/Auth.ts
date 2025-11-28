export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthError {
  message: string;
}

export interface AuthResult {
  user: User | null;
  error: AuthError | null;
}


export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signUp: (username: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<ResetPasswordResult>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<ResetPasswordResult>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface TokenValidationResponse {
  user: User;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResult {
  success: boolean;
  error: { message: string } | null;
}