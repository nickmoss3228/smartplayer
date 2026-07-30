import React, { useState, useCallback } from "react";
import { ComicsModal } from "./ComicsModal";
import { getOrderedComics, comicManifest, orderedComicsEasy } from "./comicsData";

export { getOrderedComics, comicManifest, orderedComicsEasy };

// ─── Preview card ─────────────────────────────────────────────────────────────
interface ComicsDisplayProps {
  /** 1-based story index */
  storyIndex: number;
  title?: string;
  /** "easy" | "medium" | "hard" — selects the correct character folder */
  variant?: "card" | "circular";
  difficulty: string;
}

export const ComicsDisplay: React.FC<ComicsDisplayProps> = ({
  storyIndex,
  title,
  difficulty,
  variant = "card",
}) => {
  const [open, setOpen] = useState(false);

  const comics = getOrderedComics(difficulty);
  const src = comics[storyIndex - 1];

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  // ── empty-state ────────────────────────────────────────────────
  if (!src) {
    if (variant === "circular") {
      return (
        <div
          className="h-full max-h-full w-auto max-w-full aspect-square mx-auto rounded-2xl
                  bg-white/10 border border-white/15 flex items-center justify-center"
        >
          <span
            className="text-white/40 text-xs uppercase tracking-widest
                     font-semibold font-['Montserrat']"
          >
            Comics
          </span>
        </div>
      );
    }
    return (
      <div
        className="w-[70%] max-w-[280px] aspect-square mx-auto rounded-2xl
                      bg-white/10 border border-white/15 flex items-center justify-center"
      >
        <span
          className="text-white/40 text-xs uppercase tracking-widest
                         font-semibold font-['Montserrat']"
        >
          Comics
        </span>
      </div>
    );
  }

  // ── CIRCULAR variant (desktop PlayerControls button) ──────────
  if (variant === "circular") {
    return (
      <>
        <button
          onClick={handleOpen}
          aria-label="Open comic"
          className="
            w-14 h-14 rounded-full overflow-hidden
            border-2 border-white/30 hover:border-white/70
            bg-white/10 cursor-pointer group relative
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
            transition-all duration-200 active:scale-95 shadow-lg
          "
        >
          <img
            src={src}
            alt={title ?? "Comic"}
            draggable={false}
            className="
              w-full h-full object-cover object-center
              scale-[1.65] group-hover:scale-[1.85]
              transition-transform duration-500 ease-out
            "
          />
          <div
            className="absolute inset-0 rounded-full
                          shadow-[inset_0_0_14px_rgba(0,0,0,0.45)]
                          pointer-events-none"
          />
          <div
            className="
            absolute inset-0 rounded-full flex items-center justify-center
            bg-black/0 group-hover:bg-black/30
            transition-colors duration-300 pointer-events-none
          "
          >
            <span
              className="
              text-white text-[7px] uppercase tracking-widest
              font-semibold font-['Montserrat']
              opacity-0 group-hover:opacity-100
              transition-opacity duration-300
            "
            >
              View
            </span>
          </div>
        </button>

        {open && <ComicsModal src={src} title={title} onClose={handleClose} />}
      </>
    );
  }

  // ── CARD variant (original) ────────────────────────────────────
  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Open comic"
        className="
        h-full max-h-full w-auto max-w-full aspect-square rounded-2xl overflow-hidden
        bg-white/10 border border-white/15 cursor-pointer group relative block
        focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
      "
      >
        <img
          src={src}
          alt={title ?? "Comics preview"}
          draggable={false}
          className="
          w-full h-full object-cover object-center
          scale-[1.65] group-hover:scale-[1.82]
          transition-transform duration-500 ease-out
        "
        />
        {/* rest unchanged */}
      </button>
      {open && <ComicsModal src={src} title={title} onClose={handleClose} />}
    </>
  );
};

export default ComicsDisplay;
