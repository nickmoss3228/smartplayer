import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { prefetchProgress } from "../context/ProgressContext";

const Login = () => {
  const { t } = useTranslation();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
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
    prefetchProgress();
    
    // Navigate to the intended destination
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">{t('login.title')}</h1>
          <p className="text-gray-600">
            {t('login.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="usernameOrEmail"
              className="block text-sm font-medium text-black mb-2"
            >
              {t('login.usernameOrEmail')}
            </label>
            <input
              id="usernameOrEmail"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('login.usernameOrEmailPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-black mb-2"
            >
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('login.passwordPlaceholder')}
            />
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            {t('login.noAccount')}{' '}
            <Link
              to="/signup"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('login.signUpLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;