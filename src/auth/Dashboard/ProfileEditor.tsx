// components/Dashboard/ProfileEditor.tsx
import React, { useState, useRef, useEffect } from "react";
import { UserProfile } from "../../types/Dashboard";
import { AVATAR_OPTIONS, getAvatarById } from "../../config/avatars";
import { updateProfile } from "../../services/profileServices";

interface ProfileEditorProps {
  profile: UserProfile;
  onProfileUpdate: (updated: UserProfile) => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile,
  onProfileUpdate,
}) => {
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(profile.nickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const currentAvatar = getAvatarById(profile.avatar);

  // Focus input when editing starts
  useEffect(() => {
    if (editingNickname) nicknameRef.current?.focus();
  }, [editingNickname]);

  // Close avatar picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAvatarPicker(false);
      }
    };
    if (showAvatarPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAvatarPicker]);

  const saveAvatar = async (avatarId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile(token, { avatar: avatarId });
      onProfileUpdate(updated);
      setShowAvatarPicker(false);
    } catch {
      setError("Failed to save avatar.");
    } finally {
      setSaving(false);
    }
  };

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
      setError("Failed to save nickname.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowAvatarPicker((v) => !v)}
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-black overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          title="Change avatar"
        >
          <img
            src={currentAvatar.url}
            alt={currentAvatar.label}
            className="w-full h-full object-cover"
          />
          {/* Edit overlay */}
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-bold">
            ✏️
          </span>
        </button>

        {/* Avatar picker dropdown */}
        {showAvatarPicker && (
          <div className="absolute top-full left-0 mt-2 z-50 bg-white border-2 border-black rounded-xl p-3 shadow-lg w-64">
            <p className="text-xs font-bold text-black uppercase tracking-widest mb-2">
              Choose Avatar
            </p>
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => saveAvatar(av.id)}
                  disabled={saving}
                  className={`
                    w-10 h-10 rounded-full border-2 overflow-hidden transition-all
                    ${profile.avatar === av.id
                      ? "border-black ring-2 ring-black ring-offset-1"
                      : "border-gray-300 hover:border-black"}
                    disabled:opacity-50
                  `}
                  title={av.label}
                >
                  <img
                    src={av.url}
                    alt={av.label}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
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
              className="border-2 border-black rounded-lg px-2 py-1 text-base font-bold text-black focus:outline-none focus:ring-2 focus:ring-black w-full max-w-[180px]"
            />
            <button
              onClick={saveNickname}
              disabled={saving}
              className="px-2 py-1 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditingNickname(false);
                setNicknameInput(profile.nickname);
              }}
              className="px-2 py-1 border-2 border-black rounded-lg text-sm font-bold hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingNickname(true)}
            className="group flex items-center gap-1.5 text-left"
            title="Edit nickname"
          >
            <span className="text-lg sm:text-xl font-bold text-black break-words">
              {profile.nickname}
            </span>
            <span className="text-xs text-gray-400 group-hover:text-black transition-colors">
              ✏️
            </span>
          </button>
        )}
        <p className="text-xs text-gray-500 mt-0.5 truncate">{profile.email}</p>
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
    </div>
  );
};

export default ProfileEditor;