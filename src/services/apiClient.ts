// services/apiClient.ts
//
// The single axios instance every authenticated call should go through.
//
// Before this, ~18 modules each read the token out of localStorage and
// hand-built an Authorization header, which meant there was nowhere to put
// "the server rejected this token — end the session". The visible symptom was
// that an expired or banned session kept looking logged in: AuthContext.user
// stayed truthy while every individual request failed into its own
// console.error, and the user wasn't actually kicked out until the next full
// page load re-ran the one-time /validate-token check.

import axios, { AxiosError } from "axios";

/**
 * The one place the API origin is decided. Every module imports this rather
 * than re-deriving it — there used to be 15 copies of the same expression, and
 * one of them (FeedbackModal) had drifted to a different fallback port.
 *
 * Three cases, and the empty-string one is the important one:
 *
 *   undefined -> "http://localhost:3000"  local dev with no .env
 *   ""        -> "" (relative URLs)       SAME-ORIGIN: on the Yandex VM the
 *                                          browser talks to nginx, which
 *                                          proxies /api/ to the backend
 *                                          container (see nginx.conf). No CORS
 *                                          involved, and the deployment isn't
 *                                          pinned to a hostname.
 *   "https://host" -> that origin          explicit cross-origin backend
 *
 * Note `??` and not `||`: `||` treats "" as unset and would silently fall back
 * to localhost, which is exactly how a same-origin production build breaks.
 * Vite inlines this at BUILD time, so changing it needs a rebuild, not a restart.
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Don't attach the Authorization header (public endpoints). */
    skipAuth?: boolean;
    /** Don't treat a 401/403 on this call as an expired session. */
    skipAuthRedirect?: boolean;
  }
}

/**
 * Fired when the API rejects the stored token. AuthContext listens and tears
 * the session down.
 *
 * An event rather than a callback because AuthProvider sits OUTSIDE <Router>
 * (App.tsx), so it can't useNavigate, and it deliberately doesn't expose
 * setUser on its context value. This mirrors the existing
 * 'guest-progress-migrated' bridge already used between AuthContext and
 * ProgressContext.
 */
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

export type UnauthorizedReason = "expired" | "banned";

export interface AuthUnauthorizedDetail {
  reason: UnauthorizedReason;
}

/** One-shot handoff so Login.tsx can explain WHY the user landed there. */
export const SIGNED_OUT_REASON_KEY = "auth:signedOutReason";

export const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

api.interceptors.request.use((config) => {
  if (config.skipAuth) return config;
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A single page mount can fan out five or more parallel requests; when the
// token expires they all fail at once. Debounce so the teardown runs once.
let dispatching = false;

interface ApiErrorBody {
  message?: string;
  error?: string;
  code?: string;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const config = error.config;

    // Three independent guards, each load-bearing:
    //
    //  1. skipAuthRedirect — POST /api/login returns 401 for BAD CREDENTIALS,
    //     which is not an expired session. Same for signup, and for logout
    //     (where a 401 would re-trigger this handler with a dead token).
    //  2. hasToken — a 401 on a request we never authenticated (a guest on a
    //     public endpoint) must not "log out" someone who was never logged in.
    //  3. the debounce — parallel failures collapse into one teardown.
    const hasToken = !!localStorage.getItem("token");

    if ((status === 401 || status === 403) && !config?.skipAuthRedirect && hasToken) {
      const data = error.response?.data;
      // Prefer the machine-readable code, fall back to the message string so
      // this stays correct even against a backend that hasn't deployed the
      // `code` field yet.
      const banned =
        data?.code === "ACCOUNT_BANNED" ||
        data?.message === "This account has been banned.";

      if (!dispatching) {
        dispatching = true;
        setTimeout(() => {
          dispatching = false;
        }, 1000);

        window.dispatchEvent(
          new CustomEvent<AuthUnauthorizedDetail>(AUTH_UNAUTHORIZED_EVENT, {
            detail: { reason: banned ? "banned" : "expired" },
          })
        );
      }
    }

    return Promise.reject(error);
  }
);
