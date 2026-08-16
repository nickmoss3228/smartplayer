import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import {
  api,
  AUTH_UNAUTHORIZED_EVENT,
  SIGNED_OUT_REASON_KEY,
  AuthUnauthorizedDetail,
} from '../services/apiClient';
import { fetchAchievements, syncListeningTime } from '../services/achievementServices';
import {
  getTotalListeningSeconds,
  setTotalListeningSeconds,
  clearListeningTime,
} from '../hooks/useListeningTimer';
import {
  hasGuestProgress,
  buildGuestMigrationPayload,
  clearGuestProgress,
} from '../services/guestProgress';
import { migrateGuestProgress } from '../services/guestProgressServices';
import {
  User,
  AuthError,
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


export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Normalises an axios failure into an AuthError, preserving the machine-readable
 * bits a 429 carries so the form can render a localized "too many attempts"
 * message with a real countdown instead of the server's English string.
 */
const toAuthError = (error: unknown, fallback: string): AuthError => {
  const axiosError = error as AxiosError<{
    message?: string;
    code?: string;
    retryAfterSeconds?: number;
  }>;
  const data = axiosError.response?.data;

  if (axiosError.response?.status === 429) {
    const headerRetry = Number(axiosError.response.headers?.['retry-after']);
    return {
      message: data?.message ?? 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
      retryAfterSeconds:
        data?.retryAfterSeconds ?? (Number.isFinite(headerRetry) ? headerRetry : undefined),
    };
  }

  return { message: data?.message || fallback, code: data?.code };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      checkTokenValidity();
    } else {
      setLoading(false);
    }
  }, []);

  // Everything signOut does locally, minus the server round-trips. The forced
  // path below reuses this but must NOT call /api/logout — that request would
  // fail with the same already-rejected token.
  const clearLocalSession = useCallback((): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('progressData');
    localStorage.removeItem('progressCacheTime');
    // signOut has always missed this one: migrateGuestProgressIfAny clears it
    // but signOut didn't, so the next account signing in on this browser could
    // paint the previous account's cached dashboard before its fetch landed.
    sessionStorage.removeItem('dashboardData');
    // Prevent this account's local total from bleeding into whichever account
    // signs in next on this browser.
    clearListeningTime();
    setUser(null);
  }, []);

  // Forced logout, driven by the response interceptor in services/apiClient.ts.
  //
  // No navigation happens here and none is needed: setUser(null) re-renders
  // every ProtectedRoute, which hits its own <Navigate to="/login" replace />.
  // That matters because AuthProvider sits outside <Router> and so cannot
  // useNavigate. Routes a guest may view simply degrade to guest mode, which is
  // the correct outcome. The only thing that has to cross the boundary is the
  // reason, handed to Login.tsx as a one-shot sessionStorage flag.
  useEffect(() => {
    const onUnauthorized = (event: Event): void => {
      const reason =
        (event as CustomEvent<AuthUnauthorizedDetail>).detail?.reason ?? 'expired';
      sessionStorage.setItem(SIGNED_OUT_REASON_KEY, reason);
      // Deliberately no listening-time flush: that call needs the very token
      // the server just rejected, so it would fail and re-enter this handler.
      clearLocalSession();
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [clearLocalSession]);

  // The local listening-time counter is a single global localStorage key,
  // shared by whichever account is currently signed in on this browser. Seed
  // it from the server's authoritative total on every login/signup so a
  // previous account's leftover count (or a stale value from an abnormal
  // session end) never bleeds into the newly signed-in user's stats.
  const seedListeningTimeFromServer = async (token: string): Promise<void> => {
    try {
      const { stats } = await fetchAchievements(token);
      setTotalListeningSeconds(stats.listeningSeconds ?? 0);
    } catch (error) {
      console.error('Failed to seed listening time on login:', error);
    }
  };

  // A guest who tried the free trial levels before signing up (or before
  // logging into an existing account) has their level/quiz/vocab progress
  // sitting in localStorage — fold it into the account here so they never
  // have to redo the trial. Fire-and-forget: a migration failure must never
  // block the sign-in/sign-up flow itself, and nothing is lost since the
  // local copy is only cleared once the server confirms it was applied.
  const migrateGuestProgressIfAny = async (token: string): Promise<void> => {
    if (!hasGuestProgress()) return;
    try {
      await migrateGuestProgress(token, buildGuestMigrationPayload());
      clearGuestProgress();
      // Avoid the fire-and-forget progress prefetch below caching stale
      // pre-migration data under the same keys Dashboard/List read from.
      localStorage.removeItem('progressData');
      localStorage.removeItem('progressCacheTime');
      sessionStorage.removeItem('dashboardData');
      // ProgressContext already ran its one-time post-login fetch before this
      // migration finished, so its in-memory cache is now stale — tell it to
      // refetch (List.tsx/LevelProgress.tsx read from that cache and would
      // otherwise never see the migrated progress for the rest of the session).
      window.dispatchEvent(new Event('guest-progress-migrated'));
    } catch (error) {
      console.error('Failed to migrate guest progress:', error);
    }
  };

  const checkTokenValidity = async (): Promise<void> => {
    try {
      // No skipAuthRedirect: a 401 here genuinely IS a dead session, and
      // letting the interceptor fire keeps the teardown in one place.
      const response = await api.get<TokenValidationResponse>('/api/validate-token');
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
      
      // skipAuthRedirect: a 401 here means "wrong password", not "your session
      // died" — without the flag a failed login attempt would sign out a user
      // who is already logged in in another tab.
      const response = await api.post<AuthResponse>('/api/login', requestData, {
        skipAuthRedirect: true,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      seedListeningTimeFromServer(token);

    // Prefetch progress data immediately after successful login
      setTimeout(async () => {
        try {
          // We can't use useProgress here directly, but we can make the API call.
          // The token was written to localStorage above, so apiClient's request
          // interceptor attaches it — no manual header needed.
          const [easyResponse, mediumResponse, hardResponse] = await Promise.all([
            api.get('/api/progress/easy'),
            api.get('/api/progress/medium'),
            api.get('/api/progress/hard'),
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

      migrateGuestProgressIfAny(token);

      return { user, error: null };
    } catch (error) {
      return { user: null, error: toAuthError(error, 'Login failed') };
    }
  };

  const signUp = async (username: string, email: string, password: string): Promise<AuthResult> => {
    try {
      const requestData: SignUpRequest = {
        username,
        email,
        password
      };
      
      const response = await api.post<AuthResponse>('/api/signup', requestData, {
        skipAuthRedirect: true,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      seedListeningTimeFromServer(token);

      // Also prefetch on signup
      setTimeout(async () => {
        try {
          const [easyResponse, mediumResponse, hardResponse] = await Promise.all([
            api.get('/api/progress/easy'),
            api.get('/api/progress/medium'),
            api.get('/api/progress/hard'),
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

      migrateGuestProgressIfAny(token);

      return { user, error: null };
    } catch (error) {
      return { user: null, error: toAuthError(error, 'Registration failed') };
    }
  };

  const signOut = async (): Promise<void> => {
    const token = localStorage.getItem('token');
    if (token) {
      // Flush the final unsynced seconds before wiping the counter below —
      // independent of the /api/logout call so a logout-endpoint failure
      // can't also swallow this user's last few minutes of listening time.
      await syncListeningTime(token, getTotalListeningSeconds()).catch((error) => {
        console.error('Failed to flush listening time on logout:', error);
      });
      try {
        // skipAuthRedirect: if the token is already dead this 401s, and
        // firing the forced-logout path from inside a deliberate logout would
        // be redundant at best and re-entrant at worst.
        await api.post('/api/logout', {}, { skipAuthRedirect: true });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    clearLocalSession();
  };

  const requestPasswordReset = async (email: string): Promise<ResetPasswordResult> => {
    try {
      const requestData: ResetPasswordRequest = { email };

      // skipAuth: unauthenticated by definition — no point leaking a bearer
      // token to an endpoint that ignores it.
      await api.post('/api/request-reset', requestData, { skipAuth: true });

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: toAuthError(error, 'Failed to send reset email') };
    }
  };

  const confirmPasswordReset = async (token: string, newPassword: string): Promise<ResetPasswordResult> => {
    try {
      const requestData: ResetPasswordConfirmRequest = { token, newPassword };

      await api.post('/api/reset', requestData, { skipAuth: true });

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: toAuthError(error, 'Failed to reset password') };
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