import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

const SignUp = () => {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      setError(result.error.message)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="font-inherit max-w-md w-full bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">{t('signup.title')}</h1>
          <p className="text-gray-600">{t('signup.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-black mb-2">
              {t('signup.username')}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('signup.usernamePlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
              {t('signup.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('signup.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
              {t('signup.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('signup.passwordPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-2">
              {t('signup.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('signup.confirmPasswordPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('signup.submitting') : t('signup.submit')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            {t('signup.haveAccount')}{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              {t('signup.signInLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUp