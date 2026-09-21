import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { formatPhoneInput, isValidPhoneNumber } from '../../utils/phone'
import { legalPath } from '../../config/legal'
import { forwardedState, returnPathFrom } from '../returnTo'
import {
  AsideCopy,
  AuthShell,
  BackButton,
  CardLede,
  CardTitle,
  Divider,
  Eyebrow,
  Notice,
  OtpField,
  OutlineLink,
  PasswordField,
  PasswordStrength,
  PhoneField,
  StepRail,
  SubmitButton,
  TextField,
} from '../authKit'

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

  const from = returnPathFrom(location.state)

  if (user) {
    return <Navigate to={from} state={forwardedState(location.state)} replace />
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

    // Email is the identity while SMS verification is switched off: it is the
    // only way to reach this person, and the whole reason for collecting it.
    // The server enforces the same rule — this is just the faster answer.
    if (!email.trim()) {
      setError(t('signup.errors.emailRequired'))
      return
    }

    // The phone is optional now, but a phone that IS typed still has to be a
    // real one: the column is UNIQUE, and junk in it is a collision nobody can
    // explain later. The shared normalizer, not a raw-input regex — the old
    // check ran against the unformatted string, so "+7 999 123-45-67", the
    // field's own placeholder, was rejected despite the server accepting it.
    if (phoneNumber.trim() && !isValidPhoneNumber(phoneNumber)) {
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
      <AuthShell
        aside={<><AsideCopy title={t('auth.aside.verifyTitle')} /><StepRail current={2} /></>}
        asideFoot={t('auth.aside.verifyFoot')}
      >
        <Eyebrow>{t('auth.steps.code')}</Eyebrow>
        <CardTitle>{t('signup.phoneVerification.title')}</CardTitle>
        <CardLede>
          {maskedPhone
            ? t('signup.phoneVerification.descriptionTo', { phone: maskedPhone })
            : t('signup.phoneVerification.description')}
        </CardLede>

        {error && <Notice kind="error">{error}</Notice>}
        {resendNotice && <Notice kind="success">{resendNotice}</Notice>}

        <form onSubmit={handleVerify} className="flex flex-col gap-6">
          <OtpField
            value={verificationCode}
            onChange={setVerificationCode}
            label={t('signup.phoneVerification.codePlaceholder')}
          />
          <SubmitButton
            loading={isLoading}
            disabled={verificationCode.length < 6}
            loadingLabel={t('signup.submitting')}
          >
            {t('signup.phoneVerification.verify')}
          </SubmitButton>
        </form>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[#e0e7ed]">
          <BackButton onClick={backToDetails}>{t('signup.phoneVerification.back')}</BackButton>
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            className="text-sm font-semibold text-[#0f151c] hover:text-[#e5484d] disabled:opacity-50 cursor-pointer py-1"
          >
            {t('signup.phoneVerification.resend')}
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      aside={<><AsideCopy title={t('auth.aside.signupTitle')} /><StepRail current={1} /></>}
      asideFoot={t('auth.aside.signupFoot')}
    >
      <Eyebrow>{t('auth.steps.details')}</Eyebrow>
      <CardTitle>{t('signup.title')}</CardTitle>
      <CardLede>{t('signup.subtitle')}</CardLede>

      {error && <Notice kind="error">{error}</Notice>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          id="username"
          name="username"
          label={t('signup.username')}
          value={username}
          onChange={setUsername}
          autoComplete="username"
          placeholder={t('signup.usernamePlaceholder')}
          required
        />

        {/* Email carries the account while SMS verification is off. It was the
            optional field when the phone was the verified identity; those roles
            are swapped for now, and swap back when the OTP work lands. */}
        <TextField
          id="email"
          name="email"
          type="email"
          label={t('signup.email')}
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder={t('signup.emailPlaceholder')}
          required
        />

        {/* Kept, and kept optional. Nothing verifies it yet, but the column is
            there and a number collected now is one that does not have to be
            asked for again later. */}
        <PhoneField
          id="phoneNumber"
          label={t('signup.phoneNumberOptional')}
          value={phoneNumber}
          onChange={setPhoneNumber}
          format={formatPhoneInput}
          autoComplete="tel-national"
        />

        <PasswordField
          id="password"
          name="new-password"
          label={t('signup.password')}
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
          required
        >
          <PasswordStrength value={password} />
        </PasswordField>

        <PasswordField
          id="confirmPassword"
          name="confirm-password"
          label={t('signup.confirmPassword')}
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirmPassword}
          onToggleShow={() => setShowConfirmPassword((v) => !v)}
          autoComplete="new-password"
          required
        >
          {/* Told at the moment it becomes true, not after a round trip to the
              submit button. Only once the second field has content, so it does
              not accuse the user of a mismatch they are still typing. */}
          {confirmPassword.length > 0 && confirmPassword !== password && (
            <p className="mt-2 text-[13px] text-[#c2262b]">{t('signup.errors.passwordMismatch')}</p>
          )}
        </PasswordField>

        {/* ── Agreements ──
            The links open in a new tab so reading one does not throw away a
            half-filled form. handleSubmit re-checks both flags rather than
            relying on the disabled button alone: `disabled` is a UI state, and
            the account is created by the request, not by the button. */}
        <div className="flex flex-col gap-3 bg-[#f5f8fa] border border-[#e0e7ed] rounded-[3px] p-4">
          <label htmlFor="terms" className="flex items-start gap-3 text-[13px] leading-relaxed text-[#47586a] cursor-pointer">
            <input
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[#0f151c] cursor-pointer"
            />
            <span>
              <Trans
                i18nKey="signup.agreements.terms"
                components={{
                  terms: (
                    <Link
                      to={legalPath('terms')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0f151c] underline underline-offset-2 hover:text-[#e5484d]"
                    />
                  ),
                  privacy: (
                    <Link
                      to={legalPath('privacy')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0f151c] underline underline-offset-2 hover:text-[#e5484d]"
                    />
                  ),
                }}
              />
            </span>
          </label>

          <label htmlFor="consent" className="flex items-start gap-3 text-[13px] leading-relaxed text-[#47586a] cursor-pointer">
            <input
              id="consent"
              type="checkbox"
              checked={acceptedDataConsent}
              onChange={(e) => setAcceptedDataConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[#0f151c] cursor-pointer"
            />
            <span>
              <Trans
                i18nKey="signup.agreements.dataConsent"
                components={{
                  consent: (
                    <Link
                      to={legalPath('consent')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0f151c] underline underline-offset-2 hover:text-[#e5484d]"
                    />
                  ),
                }}
              />
            </span>
          </label>
        </div>

        <SubmitButton
          loading={isLoading}
          disabled={!acceptedTerms || !acceptedDataConsent}
          loadingLabel={t('signup.submitting')}
        >
          {t('signup.submit')}
        </SubmitButton>
      </form>

      <Divider>{t('signup.haveAccount')}</Divider>

      <OutlineLink to="/login" state={location.state}>
        {t('signup.signInLink')}
      </OutlineLink>
    </AuthShell>
  )
}

export default SignUp
