import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { IoExpandOutline } from "react-icons/io5";
import { ComicsModal } from "./ComicsModal";

// ─── Preview card ─────────────────────────────────────────────────────────────
interface ComicsDisplayProps {
  /** Kept so existing callers compile; neither selects the page any more. */
  storyIndex?: number;
  difficulty?: string;
  title?: string;
  /** card: the phone's square preview. banner: the desktop column's wide crop. */
  variant?: "card" | "banner";
  /**
   * The page to show, already resolved by modules/story/resolveStory.ts.
   *
   * This component used to fall back to comicsData’s manifest when no src was
   * given, but that manifest is keyed by DIFFICULTY alone, so it always
   * returned the level’s built-in character’s pages — any second story on the
   * same level silently displayed the wrong artwork. Resolution now happens in
   * one place that knows which story owns those pages.
   */
  src?: string | null;
}

export const ComicsDisplay: React.FC<ComicsDisplayProps> = ({
  title,
  src,
  variant = "card",
}) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  // ── empty-state ────────────────────────────────────────────────
  if (!src) {
    // The desktop column simply leaves the banner out when there is no page.
    if (variant === "banner") return null;
    return (
      <div
        className="w-[70%] max-w-[280px] aspect-square mx-auto rounded-[3px]
                      bg-white/10 border border-white/15 flex items-center justify-center"
      >
        <span
          className="text-white/40 text-[10px] uppercase tracking-[0.16em] font-mono"
        >
          Comics
        </span>
      </div>
    );
  }

  // ── BANNER variant (desktop player column) ────────────────────
  // The top of the page, as wide as the column and as tall as the column can
  // spare; the whole page opens in ComicsModal.
  if (variant === "banner") {
    return (
      <>
        <button
          onClick={handleOpen}
          aria-label={t("player.wholeComic")}
          className="group relative block h-full w-full cursor-pointer overflow-hidden rounded-card bg-white/10
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <img
            src={src}
            alt={title ?? ""}
            draggable={false}
            className="h-full w-full select-none object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-[3px] bg-black/70 px-3 py-1.5 text-[12.5px] font-semibold text-white">
            <IoExpandOutline size={15} aria-hidden="true" />
            {t("player.wholeComic")}
          </span>
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
        h-full max-h-full w-auto max-w-full aspect-square rounded-[3px] overflow-hidden
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
