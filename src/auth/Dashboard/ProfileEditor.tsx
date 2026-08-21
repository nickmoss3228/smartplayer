// components/Dashboard/ProfileEditor.tsx
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IoPencil, IoClose } from "react-icons/io5";
import { UserProfile } from "../../types/Dashboard";
import { useCharacter } from "../../context/CharacterContext";
import { useCharacterPortrait } from "../../modules/character/useCharacterPortrait";
import { updateProfile } from "../../services/profileServices";

interface ProfileEditorProps {
  profile: UserProfile;
  onProfileUpdate: (updated: UserProfile) => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile,
  onProfileUpdate,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { character } = useCharacter();
  const portrait = useCharacterPortrait(character);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(profile.nickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingNickname) nicknameRef.current?.focus();
  }, [editingNickname]);

  const saveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed === profile.nickname) {
      setEditingNickname(false);
      setNicknameInput(profile.nickname);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile(token, { nickname: trimmed });
      onProfileUpdate(updated);
      setEditingNickname(false);
    } catch {
      setError(t("dashboard.profile.nicknameSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="relative">
        {/* Editing lives in Room's Character tab (single source of truth for
            customization UI) — this is a read-only preview that deep-links there. */}
        <button
          onClick={() => navigate("/room?tab=character")}
          className="group relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full ring-2 ring-black/10 overflow-hidden flex-shrink-0 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-black/40 focus:ring-offset-2"
          title={t("dashboard.profile.changeAvatar")}
        >
          <img
            src={portrait}
            alt={profile.nickname}
            className="w-full h-full object-cover"
          />
          {/* Edit overlay */}
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
            <IoPencil size={16} />
          </span>
        </button>
      </div>

      {/* Nickname + email */}
      <div className="flex-1 min-w-0">
        {editingNickname ? (
          <div className="flex items-center gap-2">
            <input
              ref={nicknameRef}
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNickname();
                if (e.key === "Escape") {
                  setEditingNickname(false);
                  setNicknameInput(profile.nickname);
                }
              }}
              maxLength={30}
              className="bg-black/[0.04] rounded-xl px-3 py-1.5 text-base font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/30 w-full max-w-[180px]"
            />
            <button
              onClick={saveNickname}
              disabled={saving}
              className="px-3 py-1.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-black/80 disabled:opacity-50 transition-colors"
            >
              {saving ? "…" : t("dashboard.profile.save")}
            </button>
            <button
              onClick={() => {
                setEditingNickname(false);
                setNicknameInput(profile.nickname);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/[0.04] hover:bg-black/10 transition-colors flex-shrink-0"
              aria-label={t("dashboard.profile.cancel")}
            >
              <IoClose size={16} className="text-black/60" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingNickname(true)}
            className="group flex items-center gap-1.5 text-left"
            title={t("dashboard.profile.editNickname")}
          >
            <span className="text-lg sm:text-xl font-bold text-black break-words">
              {profile.nickname}
            </span>
            <IoPencil size={13} className="text-black/25 group-hover:text-black/60 transition-colors flex-shrink-0" />
          </button>
        )}
        <p className="text-xs text-black/40 mt-0.5 truncate">{profile.email}</p>
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
    </div>
  );
};

export default ProfileEditor;