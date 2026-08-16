import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  IoPersonAddOutline,
  IoPersonOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoAlertCircleOutline,
  IoSyncOutline,
} from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'

const SignUp = () => {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { signUp, user } = useAuth()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/levels'

  if (user) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('signup.errors.passwordMismatch'))
      return
    }

    if (password.length < 6) {
      setError(t('signup.errors.passwordLength'))
      return
    }

    if (!email.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
      setError(t('signup.errors.invalidEmail'))
      return
    }

    setIsLoading(true)

    const result = await signUp(username, email, password)
    if (result.error) {
      // A 429 from the signup throttle carries how long to wait — localize it
      // rather than showing the server's English string.
      setError(
        result.error.code === 'RATE_LIMITED'
          ? t('signup.errors.tooManyAttempts', {
              minutes: Math.ceil((result.error.retryAfterSeconds ?? 3600) / 60),
            })
          : result.error.message
      )
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-red-200/30 blur-3xl" />

      <div className="relative z-10 font-inherit max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-black/5 animate-fade-in">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg animate-scale-in">
            <IoPersonAddOutline size={24} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black/90 mb-1.5">{t('signup.title')}</h1>
          <p className="text-black/40 text-sm">{t('signup.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-2 animate-fade-in">
            <IoAlertCircleOutline size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
              {t('signup.username')}
            </label>
            <div className="relative">
              <IoPersonOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t('signup.usernamePlaceholder')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
              {t('signup.email')}
            </label>
            <div className="relative">
              <IoMailOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t('signup.emailPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
              {t('signup.password')}
            </label>
            <div className="relative">
              <IoLockClosedOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-11 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t('signup.passwordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
              {t('signup.confirmPassword')}
            </label>
            <div className="relative">
              <IoLockClosedOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-11 pr-11 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t('signup.confirmPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
              </button>
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
                {t('signup.submitting')}
              </>
            ) : (
              t('signup.submit')
            )}
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className="text-black/50 text-sm">
            {t('signup.haveAccount')}{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              {t('signup.signInLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUp
