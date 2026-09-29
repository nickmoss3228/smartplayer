// modules/school/phraseBook.ts
//
// The school's lines in the player's language. bubbles.ts decides WHO says
// WHAT KIND of thing; this reads the lines themselves out of the locale files
// (`school.speech.*`), so the canvas stays free of i18n and a new language is
// a new block of JSON, not new code.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GreetingTime, PHRASE_POOLS, PhraseBook, PhrasePool } from "./bubbles";

type Translate = (key: string, options?: Record<string, unknown>) => unknown;

const GREETINGS: GreetingTime[] = ["morning", "afternoon", "evening", "late"];

/** A PhraseBook from any i18next-shaped `t`. */
export function phraseBookFrom(t: Translate): PhraseBook {
  const list = (pool: PhrasePool): string[] => {
    const lines = t(`school.speech.${pool}`, { returnObjects: true, defaultValue: null });
    return Array.isArray(lines) ? lines.filter((l): l is string => typeof l === "string" && l.length > 0) : [];
  };
  const pools = Object.fromEntries(PHRASE_POOLS.map((p) => [p, list(p)])) as Record<PhrasePool, string[]>;
  const greeting = Object.fromEntries(
    GREETINGS.map((g) => [g, String(t(`school.speech.greeting.${g}`))]),
  ) as Record<GreetingTime, string>;
  return {
    ...pools,
    greeting,
    quote: (word) => String(t("school.speech.quote", { word })),
  };
}

/** The phrase book for the language the page is in, rebuilt when it changes. */
export function usePhraseBook(): PhraseBook {
  const { t, i18n } = useTranslation();
  return useMemo(
    () => phraseBookFrom(t as unknown as Translate),
    // `t` is stable across a language change; the language is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );
}
