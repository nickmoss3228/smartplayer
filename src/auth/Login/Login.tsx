import { useState, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  SIGNED_OUT_REASON_KEY,
  UnauthorizedReason,
} from "../../services/apiClient";
import { DeviceLimitError } from "../../types/Auth";
import { formatPhoneInput, isValidPhoneNumber } from "../../utils/phone";
import DeviceLimitPanel from "./DeviceLimitPanel";
import { forwardedState, returnPathFrom } from "../returnTo";
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
  PhoneField,
  QuietLink,
  StepRail,
  SubmitButton,
  TextField,
  Waveform,
} from "../authKit";
// import { prefetchProgress } from "../../context/ProgressContext";

const Login = () => {
  const { t } = useTranslation();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationTicket, setVerificationTicket] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneEnrollmentRequired, setPhoneEnrollmentRequired] = useState(false);
  const [enrollmentPhone, setEnrollmentPhone] = useState('');
  // Server-masked ("+7 *** *** 67"), so the user can confirm which number the
  // code went to without the page ever holding the full one.
  const [maskedPhone, setMaskedPhone] = useState('');
  // Outcome of the last "resend" press. Separate from `error` because the
  // common case — "you already have a working code" — is not a failure.
  const [resendNotice, setResendNotice] = useState('');
  // Why the user landed here, when they were pushed rather than navigating.
  const [notice, setNotice] = useState<UnauthorizedReason | null>(null);
  // Set when the password was right but the account is out of device slots.
  const [deviceLimit, setDeviceLimit] = useState<DeviceLimitError | null>(null);

  const { signIn, verifyPhone, resendPhoneCode, startPhoneVerification, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const from = returnPathFrom(location.state);
  const returnState = forwardedState(location.state);

  // A forced logout (expired or banned token) leaves a one-shot flag behind —
  // see the auth:unauthorized handler in AuthContext. Read and clear it so the
  // explanation shows exactly once.
  useEffect(() => {
    const reason = sessionStorage.getItem(
      SIGNED_OUT_REASON_KEY
    ) as UnauthorizedReason | null;
    if (reason) {
      sessionStorage.removeItem(SIGNED_OUT_REASON_KEY);
      setNotice(reason);
    }
  }, []);

  if (user) {
    return <Navigate to={from} state={returnState} replace />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await attemptSignIn();
  };

  // Extracted from the submit handler so the device picker can retry the exact
  // same sign-in after freeing a slot. The credentials are still in state —
  // the form is never cleared — so there is nothing to re-enter.
  const attemptSignIn = async () => {
    setError("");
    setNotice(null);
    setDeviceLimit(null);
    setIsLoading(true);

    const result = await signIn(usernameOrEmail, password);

    if (result.phoneVerification) {
      setVerificationTicket(result.phoneVerification.ticket);
      setMaskedPhone(result.phoneVerification.phoneNumber);
      setIsLoading(false);
      return;
    }
    if (result.error?.code === 'PHONE_REQUIRED') {
      setPhoneEnrollmentRequired(true);
      setIsLoading(false);
      return;
    }

    // Checked before `error`, which is also populated: this is a failed
    // sign-in the user can actually resolve here, rather than a dead end.
    if (result.deviceLimit) {
      setDeviceLimit(result.deviceLimit);
      setIsLoading(false);
      return;
    }

    if (result.error) {
      // A 429 from the login throttle carries a code plus how long to wait, so
      // show a localized countdown rather than the server's English string.
      setError(
        result.error.code === "RATE_LIMITED"
          ? t("login.errors.tooManyAttempts", {
              minutes: Math.ceil((result.error.retryAfterSeconds ?? 900) / 60),
            })
          : result.error.message
      );
      setIsLoading(false);
      return;
    }

    // Login successful - start prefetching immediately (don't await)
    // This runs in parallel with navigation, so data may already
    // be cached when the user reaches the levels page
    // prefetchProgress();

    // Navigate to the intended destination
    navigate(from, { replace: true, state: returnState });
  };

  const handlePhoneEnrollment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setResendNotice('');

    // Validated against the shared normalizer, not a raw-string regex, so the
    // browser accepts exactly what the server does — including the spaced and
    // hyphenated form the placeholder itself suggests.
    if (!isValidPhoneNumber(enrollmentPhone)) {
      setError(t('signup.errors.invalidPhone'));
      return;
    }

    setIsLoading(true);
    const result = await startPhoneVerification(usernameOrEmail, password, enrollmentPhone);
    if (result.phoneVerification) {
      setVerificationTicket(result.phoneVerification.ticket);
      setMaskedPhone(result.phoneVerification.phoneNumber);
    } else if (result.error) {
      setError(result.error.message);
    }
    setIsLoading(false);
  };

  const handlePhoneVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!verificationTicket) return;
    setError('');
    setResendNotice('');
    setIsLoading(true);
    const result = await verifyPhone(verificationTicket, verificationCode);
    if (result.deviceLimit) {
      // The code was accepted; the account is simply out of slots. Drop back to
      // the sign-in card so the picker is visible, and leave the ticket behind
      // — the phone is verified now, so retrying is a plain sign-in.
      setVerificationTicket(null);
      setPhoneEnrollmentRequired(false);
      setDeviceLimit(result.deviceLimit);
    } else if (result.error) {
      setError(result.error.message);
    } else {
      navigate(from, { replace: true, state: returnState });
    }
    setIsLoading(false);
  };

  const handleResend = async () => {
    if (!verificationTicket) return;
    setError('');
    setResendNotice('');
    const { error: resendError, cooldown } = await resendPhoneCode(verificationTicket);
    if (resendError) setError(resendError.message);
    else setResendNotice(t(cooldown ? 'signup.phoneVerification.alreadySent' : 'signup.phoneVerification.sent'));
  };

  // Leaves whichever verification step is open and returns to the plain form.
  // Without it the card is a trap: every path into verification replaces the
  // sign-in form outright, and the only way back out was a page reload.
  const backToSignIn = () => {
    setVerificationTicket(null);
    setPhoneEnrollmentRequired(false);
    setVerificationCode('');
    setError('');
    setResendNotice('');
  };

  /*
    Three mutually exclusive cards, and the exclusivity is the point. These
    used to be a ternary chain for the two verification steps plus a separate
    `!verificationTicket` guard around the sign-in form, which agreed with the
    chain in every case but one: during phone enrolment there was no ticket
    yet, so the enrolment form AND the full sign-in form rendered on top of
    each other. One conditional, one card.
  */
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

        <form onSubmit={handlePhoneVerification} className="flex flex-col gap-6">
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
          <BackButton onClick={backToSignIn}>{t('signup.phoneVerification.back')}</BackButton>
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
    );
  }

  if (phoneEnrollmentRequired) {
    return (
      <AuthShell
        aside={<AsideCopy title={t('auth.aside.verifyTitle')} />}
        asideFoot={t('auth.aside.verifyFoot')}
      >
        <Eyebrow>{t('auth.steps.code')}</Eyebrow>
        <CardTitle>{t('signup.phoneVerification.addTitle')}</CardTitle>
        <CardLede>{t('signup.phoneVerification.addDescription')}</CardLede>

        {error && <Notice kind="error">{error}</Notice>}

        <form onSubmit={handlePhoneEnrollment} className="flex flex-col gap-6">
          <PhoneField
            id="enrollmentPhone"
            label={t('signup.phoneNumber')}
            value={enrollmentPhone}
            onChange={setEnrollmentPhone}
            format={formatPhoneInput}
            required
          />
          <SubmitButton loading={isLoading} loadingLabel={t('signup.submitting')}>
            {t('signup.phoneVerification.send')}
          </SubmitButton>
        </form>

        <div className="mt-6 pt-5 border-t border-[#e0e7ed]">
          <BackButton onClick={backToSignIn}>{t('signup.phoneVerification.back')}</BackButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      aside={
        <div className="flex flex-col gap-6 lg:gap-8">
          <AsideCopy title={t('auth.aside.loginTitle')} />
          <Waveform />
          <p className="m-0 font-mono text-[10px] lg:text-[11px] tracking-[0.14em] uppercase text-[#93a4b4] max-w-[40ch]">
            {t('auth.aside.loginBody')}
          </p>
        </div>
      }
      asideFoot={t('auth.aside.site')}
    >
      <Eyebrow>{t('login.submit')}</Eyebrow>
      <CardTitle>{t('login.title')}</CardTitle>
      <CardLede>{t('login.subtitle')}</CardLede>

      {notice && (
        <Notice
          kind={
            notice === 'banned'
              ? 'error'
              : // Amber, not the neutral blue an expiry gets: being signed out
                // by another device is something the account holder should
                // actually look at, not routine housekeeping.
                notice === 'device_revoked'
                ? 'warn'
                : 'info'
          }
        >
          {notice === 'banned'
            ? t('login.errors.accountBanned')
            : notice === 'device_revoked'
              ? t('login.errors.sessionRevoked')
              : t('login.errors.sessionExpired')}
        </Notice>
      )}

      {deviceLimit && (
        <DeviceLimitPanel
          limit={deviceLimit}
          onFreed={attemptSignIn}
          onCancel={() => setDeviceLimit(null)}
        />
      )}

      {error && <Notice kind="error">{error}</Notice>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          id="usernameOrEmail"
          name="username"
          label={t('login.usernameOrEmail')}
          value={usernameOrEmail}
          onChange={setUsernameOrEmail}
          // Without a name and an autocomplete token the browser's password
          // manager has nothing to key on, so a saved login never offers
          // itself and every visit is typed out by hand.
          autoComplete="username"
          placeholder={t('login.usernameOrEmailPlaceholder')}
          required
        />

        <PasswordField
          id="password"
          name="password"
          label={t('login.password')}
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          autoComplete="current-password"
          required
        >
          <div className="mt-2.5 text-right">
            <QuietLink to="/forgot-password">{t('login.forgotPassword')}</QuietLink>
          </div>
        </PasswordField>

        <SubmitButton loading={isLoading} loadingLabel={t('login.submitting')}>
          {t('login.submit')}
        </SubmitButton>
      </form>

      <Divider>{t('auth.newHere')}</Divider>

      {/* Carry the return path across, or switching to sign-up forgets which
          story the visitor was about to buy. */}
      <OutlineLink to="/signup" state={location.state}>
        {t('login.signUpLink')}
      </OutlineLink>
    </AuthShell>
  );
};

export default Login;
