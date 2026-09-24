import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import {
  AuthShell,
  CardLede,
  CardTitle,
  Eyebrow,
  Notice,
  PasswordField,
  PasswordStrength,
  QuietLink,
  SecondaryButton,
  SubmitButton,
  TextField,
} from '../authKit'

/** Outlined square badge — the terminal states' one piece of iconography. */
const Badge = ({ stroke, children }: { stroke: string; children: React.ReactNode }) => (
  <div
    className="w-[46px] h-[46px] flex items-center justify-center border rounded-[3px] mb-5"
    style={{ borderColor: stroke }}
    aria-hidden="true"
  >
    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
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
  const redirectTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(redirectTimer.current), [])

  const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await requestPasswordReset(email)

    if (result.error) {
      // Reset requests are capped at 3/hour per IP (each one sends a real
      // email), so a 429 here is expected and needs its own message.
      setError(
        result.error.code === 'RATE_LIMITED'
          ? t('forgotPassword.errors.tooManyAttempts', {
              minutes: Math.ceil((result.error.retryAfterSeconds ?? 3600) / 60),
            })
          : result.error.message
      )
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
      setError(
        result.error.code === 'RATE_LIMITED'
          ? t('forgotPassword.errors.tooManyAttempts', {
              minutes: Math.ceil((result.error.retryAfterSeconds ?? 900) / 60),
            })
          : result.error.message
      )
    } else {
      setResetSuccess(true)
      // Kept so the effect above can cancel it. Leaving the timer dangling
      // meant a visitor who pressed "go to login" themselves was navigated a
      // second time three seconds later, from a component that was gone.
      redirectTimer.current = window.setTimeout(() => {
        navigate('/login')
      }, 3000)
    }

    setIsLoading(false)
  }

  // ── Setting a new password (a token is in the URL) ──────────────────────
  if (token) {
    if (resetSuccess) {
      return (
        <AuthShell
          asideFoot={t('auth.aside.newFoot')}
        >
          <Badge stroke="#1f8a4c"><path d="M4 12.5 9.5 18 20 6.5" /></Badge>
          <p className="m-0 mb-3.5 font-mono text-[11px] tracking-[0.18em] uppercase text-[#1f6b3f]">
            {t('forgotPassword.resetSuccess.title')}
          </p>
          <CardTitle>{t('forgotPassword.resetSuccess.title')}</CardTitle>
          <p className="m-0 mb-2 text-[15px] leading-relaxed text-dim">
            {t('forgotPassword.resetSuccess.message')}
          </p>
          {/* The reset now tears down every session server-side, so say so —
              otherwise the other devices simply stop working and it reads as a
              bug rather than as the protection it is. */}
          <p className="m-0 mb-2 text-[15px] leading-relaxed text-dim">
            {t('forgotPassword.resetSuccess.signedOutEverywhere')}
          </p>
          <p className="m-0 mb-7 text-[13px] text-muted">
            {t('forgotPassword.resetSuccess.redirecting')}
          </p>
          <Link
            to="/login"
            className="w-full h-[52px] flex items-center justify-center bg-ink text-white rounded-[3px] text-[15px] font-semibold no-underline hover:opacity-90"
          >
            {t('forgotPassword.resetSuccess.goToLogin')}
          </Link>
        </AuthShell>
      )
    }

    return (
      <AuthShell
        asideFoot={t('auth.aside.newFoot')}
      >
        <Eyebrow>{t('forgotPassword.title')}</Eyebrow>
        <CardTitle>{t('forgotPassword.resetPassword.title')}</CardTitle>
        <CardLede>{t('forgotPassword.resetPassword.subtitle')}</CardLede>

        {error && <Notice kind="error">{error}</Notice>}

        <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
          <PasswordField
            id="newPassword"
            name="new-password"
            label={t('forgotPassword.resetPassword.newPasswordLabel')}
            value={newPassword}
            onChange={setNewPassword}
            show={showNewPassword}
            onToggleShow={() => setShowNewPassword((v) => !v)}
            autoComplete="new-password"
            required
          >
            <PasswordStrength value={newPassword} />
          </PasswordField>

          <PasswordField
            id="confirmPassword"
            name="confirm-password"
            label={t('forgotPassword.resetPassword.confirmPasswordLabel')}
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirmPassword}
            onToggleShow={() => setShowConfirmPassword((v) => !v)}
            autoComplete="new-password"
            required
          >
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <p className="mt-2 text-[13px] text-signal-ink">
                {t('forgotPassword.errors.passwordMismatch')}
              </p>
            )}
          </PasswordField>

          <SubmitButton loading={isLoading} loadingLabel={t('forgotPassword.resetPassword.submitting')}>
            {t('forgotPassword.resetPassword.submitButton')}
          </SubmitButton>
        </form>

        <p className="mt-5 mb-0 text-[13px] leading-relaxed text-dim">
          {t('forgotPassword.resetSuccess.signedOutEverywhere')}
        </p>

        <div className="mt-7 text-center">
          <QuietLink to="/login">{t('forgotPassword.backToLogin')}</QuietLink>
        </div>
      </AuthShell>
    )
  }

  // ── The link has been sent ──────────────────────────────────────────────
  if (emailSent) {
    return (
      <AuthShell
        asideFoot={t('auth.aside.resetFoot')}
      >
        <Badge stroke="#0f151c">
          <path d="M3 6.5h18v11H3z" />
          <path d="m3.6 7 8.4 6 8.4-6" />
        </Badge>
        <Eyebrow>{t('forgotPassword.emailSent.title')}</Eyebrow>
        <CardTitle>{t('forgotPassword.emailSent.title')}</CardTitle>
        <p className="m-0 mb-1.5 text-[15px] leading-relaxed text-dim">
          {t('forgotPassword.emailSent.message')}{' '}
          <span className="font-semibold text-ink">{email}</span>
        </p>
        <p className="m-0 mb-7 text-[13px] text-muted">
          {t('forgotPassword.emailSent.instructions')}
        </p>

        <SecondaryButton onClick={() => setEmailSent(false)}>
          {t('forgotPassword.emailSent.tryAnother')}
        </SecondaryButton>

        <div className="mt-7 text-center">
          <QuietLink to="/login">{t('forgotPassword.backToLogin')}</QuietLink>
        </div>
      </AuthShell>
    )
  }

  // ── Asking for the link ─────────────────────────────────────────────────
  return (
    <AuthShell
      asideFoot={t('auth.aside.resetFoot')}
    >
      <Eyebrow>{t('forgotPassword.title')}</Eyebrow>
      <CardTitle>{t('forgotPassword.title')}</CardTitle>
      <CardLede>{t('forgotPassword.subtitle')}</CardLede>

      {error && <Notice kind="error">{error}</Notice>}

      <form onSubmit={handleRequestReset} className="flex flex-col gap-5">
        <TextField
          id="email"
          name="email"
          type="email"
          label={t('forgotPassword.emailLabel')}
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder={t('forgotPassword.emailPlaceholder')}
          required
        />
        <SubmitButton loading={isLoading} loadingLabel={t('forgotPassword.sending')}>
          {t('forgotPassword.sendButton')}
        </SubmitButton>
      </form>

      {/*
        Email is optional at signup now that phone is the verified identity, so
        an account can genuinely have no address for this form to reach. Say so
        here rather than letting those users submit a phone number into an email
        field and read the deliberately vague "if an account exists…" reply as
        confirmation that a link is coming.
      */}
      <div className="mt-6 p-4 bg-room border border-line rounded-[3px]">
        <p className="m-0 text-[13px] leading-relaxed text-[#47586a]">
          {t('forgotPassword.noEmailHint')}
        </p>
      </div>

      <div className="mt-7 text-center">
        <QuietLink to="/login">{t('forgotPassword.backToLogin')}</QuietLink>
      </div>
    </AuthShell>
  )
}

export default ForgotPassword
