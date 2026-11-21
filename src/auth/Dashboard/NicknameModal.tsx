// auth/Dashboard/NicknameModal.tsx
// The name other players see, changed from the Dashboard's «Аккаунт» list.
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import { Notice, SubmitButton, TextField } from "../authKit";
import { updateProfile } from "../../services/profileServices";
import { UserProfile } from "../../types/Dashboard";
import Sheet from "../../components/Sheet/Sheet";

const MAX_LENGTH = 30;

interface NicknameModalProps {
  profile: UserProfile;
  onSaved: (updated: UserProfile) => void;
  onClose: () => void;
}

const NicknameModal: React.FC<NicknameModalProps> = ({ profile, onSaved, onClose }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(profile.nickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const trimmed = value.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || trimmed === profile.nickname) {
      onClose();
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      onSaved(await updateProfile(token, { nickname: trimmed }));
      onClose();
    } catch {
      setError(t("dashboard.profile.nicknameSaveError"));
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} labelledBy="nickname-modal-title">
      <div className="p-5 flex items-center justify-between flex-shrink-0 border-b border-line">
        <div className="min-w-0">
          <h2 id="nickname-modal-title" className="text-lg font-bold text-black">
            {t("dashboard.home.name")}
          </h2>
          <p className="text-xs text-black/40">{t("dashboard.home.nameHint")}</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-black/[0.04] hover:bg-black/10 transition-colors active:scale-90 duration-150"
          aria-label={t("dashboard.profile.cancel")}
        >
          <IoClose size={18} className="text-black/60" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5" noValidate>
        {/* Notice carries its own mb-5 for the auth pages; cancel it so the
            form's gap is the only spacing here. */}
        {error && (
          <div className="-mb-5">
            <Notice kind="error">{error}</Notice>
          </div>
        )}
        <TextField
          id="nickname"
          name="nickname"
          label={t("dashboard.home.name")}
          hint={`${value.length} / ${MAX_LENGTH}`}
          value={value}
          onChange={(v) => setValue(v.slice(0, MAX_LENGTH))}
          autoComplete="nickname"
          required
        />
        <SubmitButton loading={saving} disabled={!trimmed} loadingLabel={t("character.saving")}>
          {t("dashboard.profile.save")}
        </SubmitButton>
      </form>
    </Sheet>
  );
};

export default NicknameModal;
