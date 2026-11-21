// auth/Dashboard/CharacterEditorDialog.tsx
//
// The character editor, opened from the Dashboard's «Персонаж» card or the
// portrait. Full screen on phones, a large centred dialog from `sm` up. Not a
// Sheet: dragging the figure round on the stage must never pull the window
// shut, so this one closes only from its button, the backdrop or Escape.
import React, { lazy, Suspense, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";

// Its own three.js canvas: the dashboard does not pay for 3D until it opens.
const CharacterCreator = lazy(() => import("../../modules/character/CharacterCreator"));

interface CharacterEditorDialogProps {
  onClose: () => void;
}

const CharacterEditorDialog: React.FC<CharacterEditorDialogProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-black/70 dialog-backdrop-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-editor-title"
        className="relative w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] bg-room sm:rounded-card overflow-y-auto flex flex-col dialog-panel-in shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 h-14 px-4 sm:px-6 bg-room/95 border-b border-line flex-shrink-0">
          <h2 id="character-editor-title" className="m-0 flex-1 text-[17px] font-extrabold text-ink">
            {t("dashboard.home.characterMade")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("dashboard.home.editorClose")}
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-black/[0.05] transition-colors focus-visible:outline-2 focus-visible:outline-signal"
          >
            <IoClose size={22} className="text-ink" />
          </button>
        </div>
        <div className="p-3 sm:p-6">
          <Suspense fallback={<div className="bg-white rounded-card border border-line h-96 animate-pulse" />}>
            <CharacterCreator inDialog />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default CharacterEditorDialog;
