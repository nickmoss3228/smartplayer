import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoLogInOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoAlertCircleOutline,
  IoSyncOutline,
} from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
// import { prefetchProgress } from "../../context/ProgressContext";

const Login = () => {
  const { t } = useTranslation();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const from = location.state?.from?.pathname || "/levels";

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn(usernameOrEmail, password);

    if (result.error) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    // Login successful - start prefetching immediately (don't await)
    // This runs in parallel with navigation, so data may already
    // be cached when the user reaches the levels page
    // prefetchProgress();

    // Navigate to the intended destination
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -top-24 -left-20 w-72 h-72 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-red-200/30 blur-3xl" />

      <div className="relative z-10 max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-black/5 animate-fade-in">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg animate-scale-in">
            <IoLogInOutline size={26} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black/90 mb-1.5">
            {t("login.title")}
          </h1>
          <p className="text-black/40 text-sm">{t("login.subtitle")}</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-2 animate-fade-in">
            <IoAlertCircleOutline size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="usernameOrEmail"
              className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5"
            >
              {t("login.usernameOrEmail")}
            </label>
            <div className="relative">
              <IoMailOutline
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none"
              />
              <input
                id="usernameOrEmail"
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t("login.usernameOrEmailPlaceholder")}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5"
            >
              {t("login.password")}
            </label>
            <div className="relative">
              <IoLockClosedOutline
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none"
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-11 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t("login.passwordPlaceholder")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
              </button>
            </div>
            <div className="text-right mt-2">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t("login.forgotPassword")}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-2xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <IoSyncOutline size={18} className="animate-spin" />
                {t("login.submitting")}
              </>
            ) : (
              t("login.submit")
            )}
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className="text-black/50 text-sm">
            {t("login.noAccount")}{" "}
            <Link
              to="/signup"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              {t("login.signUpLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
