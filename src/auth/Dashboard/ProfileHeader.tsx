// auth/Dashboard/ProfileHeader.tsx
//
// The top of the Dashboard: who you are. The portrait is a photo of your
// character and opens its editor; the name is changed from «Аккаунт» below.
import React from "react";
import { useTranslation } from "react-i18next";
import { IoPencil } from "react-icons/io5";
import { useCharacter } from "../../context/CharacterContext";
import { useCharacterPortrait } from "../../modules/character/useCharacterPortrait";

interface ProfileHeaderProps {
  name: string;
  email?: string | null;
  onOpenCharacter: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ name, email, onOpenCharacter }) => {
  const { t } = useTranslation();
  const { character } = useCharacter();
  const portrait = useCharacterPortrait(character);

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onOpenCharacter}
        aria-haspopup="dialog"
        title={t("dashboard.home.characterEdit")}
        className="group relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full ring-2 ring-black/10 overflow-hidden flex-shrink-0 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      >
        {portrait && <img src={portrait} alt="" className="w-full h-full object-cover" />}
        <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
          <IoPencil size={16} aria-hidden="true" />
        </span>
        <span className="sr-only">{t("dashboard.home.characterEdit")}</span>
      </button>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-lg sm:text-xl font-extrabold text-ink break-words">{name}</p>
        {email && <p className="m-0 mt-0.5 text-[13px] text-dim truncate">{email}</p>}
      </div>
    </div>
  );
};

export default ProfileHeader;
