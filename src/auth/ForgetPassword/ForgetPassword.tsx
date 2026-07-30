import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  IoKeyOutline,
  IoLockClosedOutline,
  IoMailOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoAlertCircleOutline,
  IoSyncOutline,
  IoCheckmarkCircleOutline,
  IoMailOpenOutline,
} from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'

const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
    <div className="pointer-events-none absolute -top-24 -left-20 w-72 h-72 rounded-full bg-blue-200/30 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-red-200/30 blur-3xl" />
    <div className="relative z-10 max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-black/5 animate-fade-in">
      {children}
    </div>
  </div>
)

const IconBadge: React.FC<{ icon: React.ReactNode; gradient?: string }> = ({
  icon,
  gradient = 'from-red-500 to-blue-600',
}) => (
  <div
    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-4 shadow-lg animate-scale-in`}
  >
    {icon}
  </div>
)

const ForgotPassword = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { requestPasswordReset, confirmPasswordReset } = useAuth()

  // Step 1: Request reset email
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Step 2: Reset password with token
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  // Common states
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await requestPasswordReset(email)

    if (result.error) {
      setError(result.error.message)
    } else {
      setEmailSent(true)
    }

    setIsLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError(t('forgotPassword.errors.passwordMismatch'))
      return
    }

    if (newPassword.length < 6) {
      setError(t('forgotPassword.errors.passwordTooShort'))
      return
    }

    if (!token) {
      setError(t('forgotPassword.errors.invalidToken'))
      return
    }

    setIsLoading(true)

    const result = await confirmPasswordReset(token, newPassword)

    if (result.error) {
      setError(result.error.message)
    } else {
      setResetSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    }

    setIsLoading(false)
  }

  // Reset password form (when token is present in URL)
  if (token) {
    if (resetSuccess) {
      return (
        <AuthShell>
          <div className="text-center">
            <IconBadge
              icon={<IoCheckmarkCircleOutline size={26} className="text-white" />}
              gradient="from-green-500 to-emerald-600"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-black/90 mb-1.5">
              {t('forgotPassword.resetSuccess.title')}
            </h1>
            <p className="text-black/50 text-sm">{t('forgotPassword.resetSuccess.message')}</p>
            <p className="text-black/40 text-sm mt-1">{t('forgotPassword.resetSuccess.redirecting')}</p>
          </div>
          <Link
            to="/login"
            className="mt-7 w-full inline-flex items-center justify-center py-3.5 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-2xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            {t('forgotPassword.resetSuccess.goToLogin')}
          </Link>
        </AuthShell>
      )
    }

    return (
      <AuthShell>
        <div className="text-center mb-7">
          <IconBadge icon={<IoKeyOutline size={24} className="text-white" />} />
          <h1 className="text-2xl sm:text-3xl font-bold text-black/90 mb-1.5">
            {t('forgotPassword.resetPassword.title')}
          </h1>
          <p className="text-black/40 text-sm">{t('forgotPassword.resetPassword.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-2 animate-fade-in">
            <IoAlertCircleOutline size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label htmlFor="newPassword" className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
              {t('forgotPassword.resetPassword.newPasswordLabel')}
            </label>
            <div className="relative">
              <IoLockClosedOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-11 pr-11 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t('forgotPassword.resetPassword.newPasswordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60 transition-colors"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
              {t('forgotPassword.resetPassword.confirmPasswordLabel')}
            </label>
            <div className="relative">
              <IoLockClosedOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-11 pr-11 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t('forgotPassword.resetPassword.confirmPasswordPlaceholder')}
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
                {t('forgotPassword.resetPassword.submitting')}
              </>
            ) : (
              t('forgotPassword.resetPassword.submitButton')
            )}
          </button>
        </form>

        <div className="mt-7 text-center">
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </AuthShell>
    )
  }

  // Request reset email form
  if (emailSent) {
    return (
      <AuthShell>
        <div className="text-center">
          <IconBadge
            icon={<IoMailOpenOutline size={24} className="text-white" />}
            gradient="from-blue-500 to-indigo-600"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-black/90 mb-1.5">
            {t('forgotPassword.emailSent.title')}
          </h1>
          <p className="text-black/50 text-sm mb-1">
            {t('forgotPassword.emailSent.message')} <span className="font-semibold text-black/80">{email}</span>
          </p>
          <p className="text-black/40 text-xs">{t('forgotPassword.emailSent.instructions')}</p>
        </div>

        <div className="mt-7 space-y-3">
          <button
            onClick={() => setEmailSent(false)}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-2xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            {t('forgotPassword.emailSent.tryAnother')}
          </button>
          <Link
            to="/login"
            className="block text-center text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="text-center mb-7">
        <IconBadge icon={<IoKeyOutline size={24} className="text-white" />} />
        <h1 className="text-2xl sm:text-3xl font-bold text-black/90 mb-1.5">
          {t('forgotPassword.title')}
        </h1>
        <p className="text-black/40 text-sm">{t('forgotPassword.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-2 animate-fade-in">
          <IoAlertCircleOutline size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRequestReset} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
            {t('forgotPassword.emailLabel')}
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
              placeholder={t('forgotPassword.emailPlaceholder')}
            />
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
              {t('forgotPassword.sending')}
            </>
          ) : (
            t('forgotPassword.sendButton')
          )}
        </button>
      </form>

      <div className="mt-7 text-center">
        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
          {t('forgotPassword.backToLogin')}
        </Link>
      </div>
    </AuthShell>
  )
}

export default ForgotPassword
