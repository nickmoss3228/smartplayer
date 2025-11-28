import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

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
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-black mb-2">
                {t('forgotPassword.resetSuccess.title')}
              </h1>
              <p className="text-gray-600">{t('forgotPassword.resetSuccess.message')}</p>
              <p className="text-gray-600 mt-2">{t('forgotPassword.resetSuccess.redirecting')}</p>
            </div>
            <Link
              to="/login"
              className="inline-block py-3 px-6 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition-all duration-300"
            >
              {t('forgotPassword.resetSuccess.goToLogin')}
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">
              {t('forgotPassword.resetPassword.title')}
            </h1>
            <p className="text-gray-600">{t('forgotPassword.resetPassword.subtitle')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-black mb-2">
                {t('forgotPassword.resetPassword.newPasswordLabel')}
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('forgotPassword.resetPassword.newPasswordPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-2">
                {t('forgotPassword.resetPassword.confirmPasswordLabel')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('forgotPassword.resetPassword.confirmPasswordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading 
                ? t('forgotPassword.resetPassword.submitting') 
                : t('forgotPassword.resetPassword.submitButton')
              }
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Request reset email form
  if (emailSent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">
              {t('forgotPassword.emailSent.title')}
            </h1>
            <p className="text-gray-600 mb-4">
              {t('forgotPassword.emailSent.message')} <span className="font-semibold">{email}</span>
            </p>
            <p className="text-gray-500 text-sm">
              {t('forgotPassword.emailSent.instructions')}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setEmailSent(false)}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition-all duration-300"
            >
              {t('forgotPassword.emailSent.tryAnother')}
            </button>
            <Link
              to="/login"
              className="block text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            {t('forgotPassword.title')}
          </h1>
          <p className="text-gray-600">
            {t('forgotPassword.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRequestReset} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
              {t('forgotPassword.emailLabel')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('forgotPassword.emailPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('forgotPassword.sending') : t('forgotPassword.sendButton')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword