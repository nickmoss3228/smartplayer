export interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  isPhoneVerified?: boolean;
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

/** One signed-in device, as shown in the "sign a device out" picker. */
export interface SessionDevice {
  deviceId: string;
  /** Coarse UA-derived name ("Chrome on Windows"). Display only. */
  label: string;
  lastSeenAt: string;
  createdAt?: string;
  /** Set only on GET /api/sessions — the device making the request. */
  current?: boolean;
}

/**
 * A login refused for hitting the device cap (HTTP 409).
 *
 * Carried as structured data rather than folded into AuthError, because the
 * caller has to *do* something with it: render the device list and let the
 * user free a slot. The ticket is a short-lived, single-purpose credential
 * that authorises exactly that one eviction — see signDeviceTicket() on the
 * backend.
 */
export interface DeviceLimitError {
  ticket: string;
  devices: SessionDevice[];
  message: string;
}

export interface AuthResult {
  user: User | null;
  error: AuthError | null;
  /**
   * Set when the credentials were correct but every device slot is taken.
   * `error` is populated alongside it, so any caller that only knows about
   * `error` still treats this as a failed sign-in rather than silently
   * succeeding with a null user. Callers that can offer the device picker
   * check this field first — see Login.tsx.
   */
  deviceLimit?: DeviceLimitError;
  phoneVerification?: PhoneVerificationRequired;
}

export interface PhoneVerificationRequired {
  ticket: string;
  /** Masked for display, e.g. "+7 *** *** 67" — never the full number. */
  phoneNumber: string;
}

/**
 * Outcome of asking for another SMS.
 *
 * `cooldown` is a success, not a failure: the previous code is still valid and
 * the server declined only to spend another message. The UI needs to say
 * "check the SMS you already have" rather than "a new code is on its way",
 * which is why this is distinct from a plain null-means-ok return.
 */
export interface ResendCodeResult {
  error: AuthError | null;
  cooldown: boolean;
}


export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signUp: (username: string, phoneNumber: string, email: string, password: string, consent: LegalConsent) => Promise<AuthResult>;
  verifyPhone: (ticket: string, code: string) => Promise<AuthResult>;
  resendPhoneCode: (ticket: string) => Promise<ResendCodeResult>;
  startPhoneVerification: (usernameOrEmail: string, password: string, phoneNumber: string) => Promise<AuthResult>;
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
 * What the signup form ticked, and which wording it ticked it against.
 *
 * Sent with the account rather than kept on the client: under 152-ФЗ the
 * operator has to be able to show that consent was given, and a checkbox whose
 * only record is a React state variable shows nothing. LEGAL_VERSION travels
 * with it so a later rewrite of the documents cannot quietly re-attribute an
 * old acceptance to new text.
 */
export interface LegalConsent {
  acceptedTerms: boolean;
  acceptedDataConsent: boolean;
}

export interface SignUpRequest {
  username: string;
  phoneNumber: string;
  email?: string;
  password: string;
  acceptedTerms: boolean;
  acceptedDataConsent: boolean;
  legalVersion: string;
}

export interface AuthResponse {
  token?: string;
  user?: User;
  code?: string;
  ticket?: string;
  phoneNumber?: string;
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
