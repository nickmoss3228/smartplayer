export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthError {
  message: string;
  /** Machine-readable code from the API, e.g. "RATE_LIMITED". */
  code?: string;
  /** Seconds until the caller may retry — present on a 429. */
  retryAfterSeconds?: number;
}

export interface AuthResult {
  user: User | null;
  error: AuthError | null;
}


export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signUp: (username: string, email: string, password: string, consent: LegalConsent) => Promise<AuthResult>;
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

/**
 * The two consent flags are part of the request rather than an afterthought:
 * the server refuses a signup that does not carry both (AGREEMENTS_REQUIRED),
 * so a caller that cannot produce them cannot create an account.
 */
export interface LegalConsent {
  acceptedTerms: boolean;
  acceptedDataConsent: boolean;
  /** LEGAL_VERSION the form was showing, stamped onto the account. */
  legalVersion: string;
}

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
  acceptedDataConsent: boolean;
  legalVersion: string;
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
  error: AuthError | null;
}