import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoBookmark } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { useVocabProgress } from "../../components/Player/hooks/useVocabProgress";
import { useVocabBookmarks } from "../../modules/vocab/vocabBookmarks";
import { JarDrawing } from "../../modules/vocab/JarIcon";
import { lookupVocabPlaces, type VocabPlace } from "../../services/vocabProgressServices";
import { buttonPrimary, buttonSecondary } from "../../components/ui/buttonStyles";

const CHIPS = 4;
// Only the newest learned keys are looked up: the card shows four chips.
const LOOKUP_KEYS = 40;

/** The Dashboard's копилка card: the count, a few recent words, and the way in. */
const KopilkaCard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { learnedWords } = useVocabProgress(!!user);
  const bookmarks = useVocabBookmarks();
  const [places, setPlaces] = useState<VocabPlace[]>([]);

  // Newest last in the set, so the chips come from its tail, newest first.
  const recentKeys = useMemo(() => Array.from(learnedWords).slice(-LOOKUP_KEYS).reverse(), [learnedWords]);

  useEffect(() => {
    if (recentKeys.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const found = await lookupVocabPlaces(recentKeys, localStorage.getItem("token"));
        if (!cancelled) setPlaces(found);
      } catch {
        // The chips are decoration; the card still works without them.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recentKeys]);

  const chips = useMemo(() => {
    const seen = new Set<string>();
    const out: VocabPlace[] = [];
    for (const key of recentKeys) {
      const p = places.find((x) => x.key === key);
      if (p && !seen.has(p.key)) {
        seen.add(p.key);
        out.push(p);
      }
    }
    return out.slice(0, CHIPS);
  }, [places, recentKeys]);

  const count = learnedWords.size;
  const rest = Math.max(0, count - chips.length);
  const markCount = bookmarks.keys.length;

  return (
    <div className="bg-white rounded-card border border-line p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex items-center gap-4">
        <JarDrawing fresh={3} className="h-[70px] w-[62px] flex-shrink-0" />
        <div className="min-w-0">
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.16em] text-dim">{t("kopilka.title")}</p>
          <p className="m-0 text-2xl font-extrabold text-ink">{t("kopilka.words", { count })}</p>
          <p className="m-0 mt-0.5 flex items-center gap-1 text-[13px] text-dim">
            <IoBookmark size={12} aria-hidden="true" />
            {t("kopilka.marks", { count: markCount })}
          </p>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {chips.map((p) => (
            <span key={p.key} className="rounded-chip bg-room border border-line px-2 py-1 text-[13px] font-semibold">
              {p.word}
            </span>
          ))}
          {rest > 0 && (
            <span className="rounded-chip bg-room border border-line px-2 py-1 text-[13px] font-semibold text-dim">
              +{rest}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => navigate("/kopilka")} className={`${buttonSecondary} flex-1`}>
          {t("kopilka.open")}
        </button>
        <button
          type="button"
          onClick={() => navigate("/kopilka#review")}
          disabled={markCount === 0}
          className={`${buttonPrimary} flex-1`}
        >
          {t("kopilka.repeatMarks")}
        </button>
      </div>
    </div>
  );
};

export default KopilkaCard;
