import { useState, useEffect } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoLogInOutline,
  IoPersonOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoAlertCircleOutline,
  IoSyncOutline,
  IoInformationCircleOutline,
  IoCallOutline,
  IoArrowBackOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import {
  SIGNED_OUT_REASON_KEY,
  UnauthorizedReason,
} from "../../services/apiClient";
import { DeviceLimitError } from "../../types/Auth";
import { formatPhoneInput, isValidPhoneNumber } from "../../utils/phone";
import DeviceLimitPanel from "./DeviceLimitPanel";
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

  const from = location.state?.from?.pathname || "/levels";

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
    return <Navigate to={from} replace />;
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
    navigate(from, { replace: true });
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
      navigate(from, { replace: true });
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

        {/*
          Three mutually exclusive cards, and the exclusivity is the point.
          These used to be a ternary chain for the two verification steps plus
          a separate `!verificationTicket` guard around the sign-in form, which
          agreed with the chain in every case but one: during phone enrolment
          there was no ticket yet, so the enrolment form AND the full sign-in
          form rendered on top of each other. One conditional, one card.
        */}
        {verificationTicket ? (
          <>
            <h2 className="text-xl font-bold mb-2">{t('signup.phoneVerification.title')}</h2>
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
            <form onSubmit={handlePhoneVerification} className="space-y-4">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                placeholder={t('signup.phoneVerification.codePlaceholder')}
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
                onClick={backToSignIn}
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
          </>
        ) : phoneEnrollmentRequired ? (
          <>
            <h2 className="text-xl font-bold mb-2">{t('signup.phoneVerification.addTitle')}</h2>
            <p className="text-sm text-black/60 mb-6">{t('signup.phoneVerification.addDescription')}</p>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <IoAlertCircleOutline size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handlePhoneEnrollment} className="space-y-4">
              <div className="relative">
                <IoCallOutline size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
                <input
                  type="tel"
                  value={enrollmentPhone}
                  onChange={(e) => setEnrollmentPhone(formatPhoneInput(e.target.value))}
                  className="w-full pl-11 pr-4 py-3 bg-black/[0.03] border border-black/10 rounded-2xl text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
                  placeholder={t('signup.phonePlaceholder')}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <IoSyncOutline size={18} className="animate-spin" />
                    {t('signup.submitting')}
                  </>
                ) : (
                  t('signup.phoneVerification.send')
                )}
              </button>
            </form>
            <button
              type="button"
              onClick={backToSignIn}
              className="mt-5 text-sm text-black/50 hover:text-black/80 font-medium flex items-center gap-1"
            >
              <IoArrowBackOutline size={16} />
              {t('signup.phoneVerification.back')}
            </button>
          </>
        ) : (
          <>
        {notice && (
          <div
            className={`mb-6 p-3.5 rounded-2xl text-sm flex items-start gap-2 animate-fade-in ${
              notice === "banned"
                ? "bg-red-50 border border-red-200 text-red-700"
                : // Amber, not the neutral blue an expiry gets: being signed
                  // out by another device is something the account holder
                  // should actually look at, not routine housekeeping.
                  notice === "device_revoked"
                  ? "bg-amber-50 border border-amber-200 text-amber-800"
                  : "bg-blue-50 border border-blue-200 text-blue-700"
            }`}
          >
            <IoInformationCircleOutline size={18} className="flex-shrink-0 mt-0.5" />
            <span>
              {notice === "banned"
                ? t("login.errors.accountBanned")
                : notice === "device_revoked"
                  ? t("login.errors.sessionRevoked")
                  : t("login.errors.sessionExpired")}
            </span>
          </div>
        )}

        {deviceLimit && (
          <DeviceLimitPanel
            limit={deviceLimit}
            onFreed={attemptSignIn}
            onCancel={() => setDeviceLimit(null)}
          />
        )}

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
              <IoPersonOutline
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
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
