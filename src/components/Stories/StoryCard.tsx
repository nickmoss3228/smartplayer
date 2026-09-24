import { useEffect, useRef } from 'react';
import { IoBookOutline, IoNewspaperOutline, IoLockClosed, IoCheckmark, IoPlay } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import type { StoryGroup, DifficultySlug } from '../../types/storyGroups';
import { formatPrice } from '../../config/priceCatalog';
import { useCatalog } from '../../context/CatalogContext';
import { SHOP_ENABLED } from '../../config/features';

/**
 * One story on the shelf.
 *
 * The card IS the comic panel: 4:5 crop of the story's own art, monochrome, with
 * the title set in a caption plate the way a comic puts narration inside the
 * panel. Owning a story is a STATE on this card rather than a separate page —
 * that is the whole idea behind merging the shop and the library, and it means
 * the offer reaches a learner while they are browsing rather than only if they
 * go looking for a shop.
 *
 * Progress is the one piece of colour, and it is the level's own accent, read
 * from themes.levelprogress so a card can never drift from the level picker.
 */

/**
 * Four stories on a level share one character portrait, so showing the same
 * crop four times would read as a bug. The crop is picked from the slug, so it
 * is stable across renders and sessions (a card must not jump when the list
 * refetches) while differing between siblings.
 */
const CROPS = ['50% 18%', '32% 40%', '68% 32%', '50% 62%', '22% 55%', '78% 50%'];

const cropFor = (slug: string) => {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return CROPS[hash % CROPS.length];
};


/**
 * Reveals the card as it scrolls into view.
 *
 * This lives ON THE CARD, not on the page, and that is the fix for a real bug:
 * App.css holds `[data-list-reveal]` at opacity 0 until something sets it to
 * "in". The observer used to live in List.tsx, so when the card became a shared
 * component every OTHER surface — /stories, /shop, /library — rendered cards
 * that were laid out and clickable but completely invisible. A page cannot
 * forget to do this if the card does it itself.
 *
 * It also fails in the safe direction: with no IntersectionObserver the card is
 * shown immediately rather than hidden forever. A decorative animation must
 * never have "invisible" as the state it gets stuck in.
 */
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => el.setAttribute('data-list-reveal', 'in');

    if (typeof IntersectionObserver === 'undefined') {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal();
          observer.unobserve(entry.target);
        }
      },
      // A sliver is enough: the card should already be moving by the time it
      // clears the fold, not start once it is fully on screen.
      { threshold: 0.08, rootMargin: '0px 0px -5% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

interface BaseProps {
  story: StoryGroup;
  difficulty: DifficultySlug;
  /** Level accent, as a var(--color-*) reference from themes.levelprogress. */
  accent: string;
  completed: number;
  /** Entrance stagger only — capped by the caller. */
  index: number;
  onOpen: () => void;
}

/**
 * Every locked card shows what it is and what it costs underneath — parts,
 * price, and a buy button when the caller passes `onBuy`. Once owned, that row
 * turns into a green "available".
 *
 * 'shop'   — the shelf at /stories · /shop · /library. The buy button toggles
 *            the basket, so it reflects `inCart`.
 * 'browse' — the level shelf at /levels/:difficulty, i.e. the learner's own
 *            library. It never sells: List.tsx passes no `onBuy`, and a
 *            story that is locked but has free parts is drawn as an open
 *            one — no padlock, no dimmed art — because it CAN be heard. A
 *            padlock on a card that plays was reading as "you can't open
 *            this". The free allowance is named under the card instead.
 */
interface Props extends BaseProps {
  variant?: 'browse' | 'shop';
  inCart?: boolean;
  /** Omit to show the price without a button (e.g. not sellable here). */
  onBuy?: () => void;
  /** Opens the "what's inside" preview. */
  onPreview?: () => void;
}

export const StoryCard = ({
  story,
  accent,
  completed,
  index,
  variant = 'browse',
  inCart = false,
  onOpen,
  onBuy,
  onPreview,
}: Props) => {
  const { t } = useTranslation();

  const total = story.totalTracks;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isCompleted = total > 0 && completed >= total;
  const hasStarted = completed > 0;
  const nextPart = Math.min(completed + 1, total);

  // Decided by the server and carried on the list response — the client never
  // works out entitlement for itself.
  const { getProduct } = useCatalog();
  const isLocked = story.locked === true;
  const isShop = variant === 'shop';
  // Locked, but its first parts play — in the library that is not a lock.
  const showLock = isLocked && !(!isShop && (story.freeParts ?? 0) > 0);
  // The story on its own — the smallest purchase that unlocks it.
  const product = isLocked ? getProduct(story.requiredSkus?.[0] ?? '') : null;
  const freeHint = !isLocked
    ? null
    : story.previewSeconds
      ? t('shelf.freePreview', { seconds: story.previewSeconds })
      : (story.freeParts ?? 0) > 0
        ? t('shelf.freeParts', { count: story.freeParts })
        : null;

  const FallbackIcon = story.category === 'news' ? IoNewspaperOutline : IoBookOutline;

  const revealRef = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={revealRef}
      className="relative"
      style={
        {
          '--list-delay': `${Math.min(index, 7) * 55}ms`,
          '--level-accent': accent,
        } as React.CSSProperties
      }
      data-list-reveal="out"
    >
      <button
        type="button"
        onClick={onOpen}
        className={`group relative block w-full cursor-pointer overflow-hidden rounded-[2px] text-left aspect-[4/5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--level-accent)] focus-visible:ring-offset-2 ${
          story.cover ? 'bg-gray-900' : 'bg-white border border-gray-200'
        }`}
      >
        {story.cover ? (
          <img
            src={story.cover}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ objectPosition: cropFor(story.slug) }}
            // Locked art is desaturated and dimmed: it reads as "not yours yet"
            // without hiding what you would be buying.
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-105 ${
              showLock ? 'opacity-45 grayscale' : ''
            }`}
          />
        ) : (
          <>
            <span
              className="absolute inset-0 text-gray-400 opacity-60"
              style={{
                backgroundImage: 'radial-gradient(currentColor 1.1px, transparent 1.2px)',
                backgroundSize: '6px 6px',
              }}
              aria-hidden="true"
            />
            <span className="absolute inset-x-0 top-[18%] flex justify-center text-gray-400">
              <FallbackIcon size={28} aria-hidden="true" />
            </span>
          </>
        )}

        {/* Top-left chip: a padlock, or where you got to. The two can never
            both apply — a locked story has no progress to report. */}
        {showLock ? (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center rounded-[2px] bg-gray-900/90 p-1 text-white">
            <IoLockClosed size={11} aria-hidden="true" />
          </span>
        ) : (
          (hasStarted || isCompleted) && (
            <span
              className={`list-card__chip absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-[2px] px-1.5 py-[3px] text-[10px] font-semibold tabular-nums ${
                isCompleted ? 'bg-gray-900 text-white' : 'bg-[var(--level-accent)] text-white'
              }`}
            >
              {isCompleted ? (
                <IoCheckmark size={11} aria-hidden="true" />
              ) : (
                <>
                  <IoPlay size={9} aria-hidden="true" />
                  {nextPart}
                </>
              )}
            </span>
          )
        )}

        {/* The caption plate. Slides down on hover to uncover the art on a
            pointer device; stays put on touch, which has no hover.

            The title, and nothing else. It used to carry a second row with a
            state word ("Start" / "Next 3") and a completed/total counter, but
            that is three pieces of text stacked on one 4:5 panel to say what
            the panel already says twice: the padlock-or-progress chip sits in
            the top-left corner, and the accent progress bar runs along the
            bottom edge. */}
        <span className="absolute inset-x-[7%] top-1/2 z-10 block -translate-y-1/2 rounded-[2px] bg-gray-900 px-2.5 py-2 text-white transition-transform duration-500 ease-out sm:group-hover:translate-y-0">
          <span className="block text-[11px] font-bold uppercase leading-tight tracking-wide line-clamp-3 sm:text-[13px]">
            {story.title}
          </span>
        </span>

        {/* Progress lives in the panel's bottom gutter. Hidden while locked — a
            0% bar under a padlock reads as failure rather than as not-bought. */}
        {!showLock && (
          <span className="absolute inset-x-0 bottom-0 z-10 block h-1 bg-black/40">
            <span
              className="list-card__fill block h-full bg-[var(--level-accent)]"
              style={{ width: `${percentage}%` }}
            />
          </span>
        )}
      </button>

      {/* Below the panel: "available", or parts · price · buy. Kept outside
          the card button so "open" and "buy" are two separate targets —
          nesting them would make the whole card ambiguous to a keyboard. */}
      <div className="font-mono mt-1.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em]">
        {!isShop && isLocked ? (
          <>
            {/* "3 parts free" only means something next to a shop that sells
                the rest. With the shop off it is just a number that reads
                like a limit, so the row keeps its parts count and nothing
                else. Comes back by itself when SHOP_ENABLED does. */}
            <span className="min-w-0 truncate font-semibold text-green-600">
              {SHOP_ENABLED ? freeHint : null}
            </span>
            <span className="shrink-0 tabular-nums text-gray-400">
              {t('shelf.parts', { count: total })}
            </span>
          </>
        ) : !isLocked ? (
          <>
            <span className="font-semibold text-green-600">{t('shelf.yours')}</span>
            <span className="shrink-0 tabular-nums text-gray-400">
              {t('shelf.parts', { count: total })}
            </span>
          </>
        ) : (
          <>
            <span className="min-w-0 truncate tabular-nums text-gray-500">
              {t('shelf.parts', { count: total })}
              {product && (
                <>
                  <span className="mx-1 text-gray-300">·</span>
                  <span className="font-bold text-gray-900">{formatPrice(product.amountMinor)}</span>
                </>
              )}
            </span>
            {onBuy && product && (
              <button
                type="button"
                onClick={onBuy}
                className={`font-mono shrink-0 cursor-pointer rounded-[2px] px-2 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  isShop && inCart
                    ? 'border border-gray-300 text-gray-500 hover:bg-gray-50'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {isShop && inCart ? t('shop.inCart') : t('shop.buy')}
              </button>
            )}
          </>
        )}
      </div>
      {isLocked && isShop && (freeHint || onPreview) && (
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-gray-400">
          <span className="min-w-0 truncate">{freeHint}</span>
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="shrink-0 cursor-pointer font-semibold text-gray-600 underline underline-offset-2 transition-colors hover:text-gray-900"
            >
              {t('shop.whatsInside')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryCard;
