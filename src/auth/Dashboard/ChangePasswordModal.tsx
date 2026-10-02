// components/Dashboard/ChangePasswordModal.tsx
import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import {
  Notice,
  PasswordField,
  PasswordStrength,
  SubmitButton,
} from "../authKit";
import { changePassword } from "../../services/profileServices";
import Sheet from "../../components/Sheet/Sheet";

interface ChangePasswordModalProps {
  /** ISO time of the last change, when the server has one */
  passwordChangedAt?: string | null;
  onChanged: (passwordChangedAt: string) => void;
  onClose: () => void;
}

// Codes the server answers with (password.controller.js changePassword).
const ERROR_KEYS: Record<string, string> = {
  WRONG_PASSWORD: "dashboard.password.errors.wrongPassword",
  SAME_PASSWORD: "dashboard.password.errors.samePassword",
  PASSWORD_TOO_SHORT: "dashboard.password.errors.tooShort",
  PASSWORD_FIELDS_REQUIRED: "dashboard.password.errors.required",
};

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  passwordChangedAt,
  onChanged,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const lastChanged = passwordChangedAt
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "long" }).format(
        new Date(passwordChangedAt)
      )
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (next.length < 6) {
      setError(t("dashboard.password.errors.tooShort"));
      return;
    }
    if (next !== confirm) {
      setError(t("dashboard.password.errors.mismatch"));
      return;
    }

    setSaving(true);
    try {
      const result = await changePassword(current, next);
      setDone(true);
      onChanged(result.passwordChangedAt);
    } catch (err) {
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      if (data?.code === "RATE_LIMITED") {
        setError(
          t("dashboard.password.errors.tooManyAttempts", {
            minutes: Math.ceil((data.retryAfterSeconds ?? 900) / 60),
          })
        );
      } else if (data?.code && ERROR_KEYS[data.code]) {
        setError(t(ERROR_KEYS[data.code]));
      } else {
        setError(t("dashboard.password.errors.generic"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} labelledBy="password-modal-title">
      {/* Header */}
      <div className="p-5 flex items-center justify-between flex-shrink-0 border-b border-line">
        <div className="min-w-0">
          <h2 id="password-modal-title" className="text-lg font-bold text-black">
            {t("dashboard.password.title")}
          </h2>
          {lastChanged && (
            <p className="text-xs text-black/40">
              {t("dashboard.password.lastChanged", { date: lastChanged })}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-black/[0.04] hover:bg-black/10 transition-colors active:scale-90 duration-150"
          aria-label={t("dashboard.password.close")}
        >
          <IoClose size={18} className="text-black/60" />
        </button>
      </div>

      <div className="p-5 overflow-y-auto">
        {done ? (
          <>
            <Notice kind="success">{t("dashboard.password.success")}</Notice>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-[3px] bg-ink text-white text-sm font-semibold hover:bg-ink/90 active:scale-[0.99] transition-all"
            >
              {t("dashboard.password.done")}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <p className="text-sm text-black/60 leading-snug">
              {t("dashboard.password.lede")}
            </p>

            {/* Notice carries its own mb-5 for the auth pages; cancel it so
                the form's gap is the only spacing here. */}
            {error && (
              <div className="-mb-5">
                <Notice kind="error">{error}</Notice>
              </div>
            )}

            <PasswordField
              id="current-password"
              name="current-password"
              label={t("dashboard.password.current")}
              value={current}
              onChange={setCurrent}
              show={showCurrent}
              onToggleShow={() => setShowCurrent((v) => !v)}
              autoComplete="current-password"
              required
            />

            <PasswordField
              id="new-password"
              name="new-password"
              label={t("dashboard.password.new")}
              value={next}
              onChange={setNext}
              show={showNext}
              onToggleShow={() => setShowNext((v) => !v)}
              autoComplete="new-password"
              required
            >
              <PasswordStrength value={next} />
            </PasswordField>

            <PasswordField
              id="confirm-password"
              name="confirm-password"
              label={t("dashboard.password.confirm")}
              value={confirm}
              onChange={setConfirm}
              show={showNext}
              onToggleShow={() => setShowNext((v) => !v)}
              autoComplete="new-password"
              required
            />

            <SubmitButton
              loading={saving}
              disabled={!current || !next || !confirm}
              loadingLabel={t("dashboard.password.saving")}
            >
              {t("dashboard.password.submit")}
            </SubmitButton>
          </form>
        )}
      </div>
    </Sheet>
  );
};

export default ChangePasswordModal;
