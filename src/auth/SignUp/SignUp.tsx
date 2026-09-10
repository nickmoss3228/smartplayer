import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import {
  IoPersonAddOutline,
  IoPersonOutline,
  IoCallOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoAlertCircleOutline,
  IoSyncOutline,
  IoArrowBackOutline,
  IoCheckmarkCircleOutline,
} from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'
import { formatPhoneInput, isValidPhoneNumber } from '../../utils/phone'
import { legalPath } from '../../config/legal'

const SignUp = () => {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [verificationTicket, setVerificationTicket] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // Two boxes, not one. 152-ФЗ treats consent to processing personal data as a
  // separate act that has to be given knowingly and specifically, so bundling
  // it into "I accept the terms" would not be consent at all. Both start
  // unticked — a pre-ticked consent box is exactly what the law does not count.
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedDataConsent, setAcceptedDataConsent] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  // Server-masked ("+7 *** *** 67") — enough to confirm the right number was
  // used, without the page holding the full one.
  const [maskedPhone, setMaskedPhone] = useState('')
  // "Resend" succeeding without sending anything is the common case, and it is
  // not an error — kept apart from `error` so it can be worded as reassurance.
  const [resendNotice, setResendNotice] = useState('')

  const { signUp, verifyPhone, resendPhoneCode, user } = useAuth()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/levels'

  if (user) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    // Checked before anything else is looked at: nothing else about this form
    // matters if the person has not agreed to what happens with it.
    if (!acceptedTerms || !acceptedDataConsent) {
      setError(t('signup.errors.agreementsRequired'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('signup.errors.passwordMismatch'))
      return
    }

    if (password.length < 6) {
      setError(t('signup.errors.passwordLength'))
      return
    }

    // The shared normalizer, not a raw-input regex. The old check ran against
    // the unformatted string, so "+7 999 123-45-67" — the field's own
    // placeholder — was rejected here despite the server accepting it happily.
    if (!isValidPhoneNumber(phoneNumber)) {
      setError(t('signup.errors.invalidPhone'))
      return
    }

    setIsLoading(true)

    // The server records the acceptance against the account; a tick the
    // backend never hears about proves nothing after the fact.
    const result = await signUp(username, phoneNumber, email, password, {
      acceptedTerms,
      acceptedDataConsent,
    })
    // Checked first: signUp reports the verification step as an "error" too, so
    // testing result.error before this would show a bogus failure on the happy
    // path.
    if (result.phoneVerification) {
      setVerificationTicket(result.phoneVerification.ticket)
      setMaskedPhone(result.phoneVerification.phoneNumber)
    } else if (result.error) {
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

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!verificationTicket) return
    setError('')
    setResendNotice('')
    setIsLoading(true)
    const result = await verifyPhone(verificationTicket, verificationCode)
    if (result.error) setError(result.error.message)
    // No navigate() on success: verifyPhone sets the user in AuthContext, and
    // the <Navigate to={from}> guard at the top of this component takes it from
    // there on the very next render.
    setIsLoading(false)
  }

  const handleResend = async () => {
    if (!verificationTicket) return
    setError('')
    setResendNotice('')
    const { error: resendError, cooldown } = await resendPhoneCode(verificationTicket)
    if (resendError) setError(resendError.message)
    else setResendNotice(t(cooldown ? 'signup.phoneVerification.alreadySent' : 'signup.phoneVerification.sent'))
  }

  // Back to the details form. The username and password are still in state, so
  // a mistyped number costs one correction rather than a whole re-entry.
  const backToDetails = () => {
    setVerificationTicket(null)
    setVerificationCode('')
    setError('')
    setResendNotice('')
  }

  if (verificationTicket) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow border border-black/5">
          <h1 className="text-2xl font-bold mb-2">{t('signup.phoneVerification.title')}</h1>
          <p className="text-sm text-black/60 mb-6">
            {maskedPhone
              ? t('signup.phoneVerification.descriptionTo', { phone: maskedPhone })
              : t('signup.phoneVerification.description')}
          </p>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <IoAlertCircleOutline size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {resendNotice && (
            <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-start gap-2">
              <IoCheckmarkCircleOutline size={18} className="flex-shrink-0 mt-0.5" />
              <span>{resendNotice}</span>
            </div>
          )}
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder={t('signup.phoneVerification.codePlaceholder')}
              className="w-full px-4 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
              required
            />
            <button
              type="submit"
              disabled={isLoading || verificationCode.length < 6}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <IoSyncOutline size={18} className="animate-spin" />
                  {t('signup.submitting')}
                </>
              ) : (
                t('signup.phoneVerification.verify')
              )}
            </button>
          </form>
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={backToDetails}
              className="text-sm text-black/50 hover:text-black/80 font-medium flex items-center gap-1"
            >
              <IoArrowBackOutline size={16} />
              {t('signup.phoneVerification.back')}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {t('signup.phoneVerification.resend')}
            </button>
          </div>
        </div>
      </div>
    )
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
            <label htmlFor="phoneNumber" className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">
              {t('signup.phoneNumber')}
            </label>
            <div className="relative">
              <IoCallOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
              <input
                id="phoneNumber"
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneInput(e.target.value))}
                required
                className="w-full pl-11 pr-4 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t('signup.phonePlaceholder')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-black/40 mb-1.5">{t('signup.emailOptional')}</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-black/[0.03] border border-black/10 rounded-2xl" placeholder={t('signup.emailPlaceholder')} />
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

          {/* ── Agreements ──
              The links open in a new tab so reading one does not throw away a
              half-filled form. handleSubmit re-checks both flags rather than
              relying on the disabled button alone: `disabled` is a UI state, and
              the account is created by the request, not by the button. */}
          <div className="space-y-3 rounded-2xl bg-black/[0.02] border border-black/5 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs leading-relaxed text-black/60">
                <Trans
                  i18nKey="signup.agreements.terms"
                  components={{
                    terms: (
                      <Link
                        to={legalPath('terms')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
                      />
                    ),
                    privacy: (
                      <Link
                        to={legalPath('privacy')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
                      />
                    ),
                  }}
                />
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedDataConsent}
                onChange={(e) => setAcceptedDataConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs leading-relaxed text-black/60">
                <Trans
                  i18nKey="signup.agreements.dataConsent"
                  components={{
                    consent: (
                      <Link
                        to={legalPath('consent')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
                      />
                    ),
                  }}
                />
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !acceptedTerms || !acceptedDataConsent}
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
