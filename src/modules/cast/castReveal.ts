import type { CastMember, LocalizedText } from '../../services/storyServices';
import type { AppLocale } from '../../types/storyGroups';

/**
 * Which of a story's characters the student has met.
 *
 * A character is revealed once the student has REACHED the part they first
 * appear in — that part is now the one to listen to — so the name is known
 * before the ear meets it. Everyone further on is a silhouette that says which
 * part they arrive in, and nothing else.
 */

/**
 * The furthest part this student has reached in this story: the current part,
 * or the one after the furthest completed, whichever is later. Clamped into
 * the story, so a finished story reveals everyone.
 *
 * From the story's own progress only. `lastListenedLevel` is stored per
 * difficulty, not per story, and would leak one story's progress into another.
 */
export const reachedPart = ({
  completedParts,
  currentPart,
  totalParts,
}: {
  completedParts: readonly number[];
  currentPart?: number | null;
  totalParts: number;
}): number => {
  const furthestDone = completedParts.length ? Math.max(...completedParts) : 0;
  const reached = Math.max(1, currentPart ?? 1, furthestDone + 1);
  return Math.min(reached, Math.max(1, totalParts));
};

export interface RevealedCastCard {
  key: string;
  locked: false;
  firstPart: number;
  name: string;
  role: string;
  bio: string;
  imageUrl: string | null;
}

/**
 * A character not met yet. Deliberately carries no name, role, bio or image:
 * whatever renders it cannot give them away by accident.
 */
export interface LockedCastCard {
  key: string;
  locked: true;
  firstPart: number;
}

export type CastCard = RevealedCastCard | LockedCastCard;

/** The reader's language, falling back to the other one when it is empty. */
const inLocale = (pair: LocalizedText | undefined, locale: AppLocale): string => {
  const other: AppLocale = locale === 'ru' ? 'en' : 'ru';
  return pair?.[locale]?.trim() || pair?.[other]?.trim() || '';
};

/**
 * The cast as the page draws it: the characters met so far in the admin's
 * order, then the ones still to come, soonest first.
 */
export const castCards = (
  cast: readonly CastMember[],
  reached: number,
  locale: AppLocale,
): CastCard[] => {
  const revealed: CastCard[] = cast
    .filter((member) => member.firstPart <= reached)
    .map((member) => ({
      key: member.key,
      locked: false,
      firstPart: member.firstPart,
      name: inLocale(member.name, locale),
      role: inLocale(member.role, locale),
      bio: inLocale(member.bio, locale),
      imageUrl: member.imageUrl,
    }));
  const locked: CastCard[] = cast
    .filter((member) => member.firstPart > reached)
    .sort((a, b) => a.firstPart - b.firstPart)
    .map((member) => ({ key: member.key, locked: true, firstPart: member.firstPart }));
  return [...revealed, ...locked];
};

/** One stop on the cast timeline: a part, and who first appears in it. */
export interface CastTimelineColumn {
  part: number;
  /** The student has got this far. */
  reached: boolean;
  /** The part they are on now. */
  isNow: boolean;
  cards: CastCard[];
}

/**
 * The cast laid out along the story: one column for every part somebody first
 * appears in, plus the part the student is on — so "you are here" always has a
 * place, even when nobody new arrives in it. Parts in order; within a part the
 * cards keep the order `castCards` gave them.
 */
export const castTimeline = (cards: readonly CastCard[], reached: number): CastTimelineColumn[] => {
  if (cards.length === 0) return [];
  const parts = new Set(cards.map((card) => card.firstPart));
  parts.add(reached);
  return [...parts]
    .sort((a, b) => a - b)
    .map((part) => ({
      part,
      reached: part <= reached,
      isNow: part === reached,
      cards: cards.filter((card) => card.firstPart === part),
    }));
};

/**
 * Who the sheet shows first when it is opened from the stack rather than from
 * a face: the newest character met — the one the student is most likely to be
 * wondering about — or, before anyone is met, the first still to come.
 */
export const defaultCastFocus = (cards: readonly CastCard[]): string | null => {
  let newest: CastCard | undefined;
  for (const card of cards) {
    if (!card.locked && (!newest || card.firstPart > newest.firstPart)) newest = card;
  }
  return (newest ?? cards[0])?.key ?? null;
};
