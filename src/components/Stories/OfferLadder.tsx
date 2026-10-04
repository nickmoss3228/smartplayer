import { useTranslation } from 'react-i18next';
import { IoCheckmark } from 'react-icons/io5';
import {
  SET_TRACK_PRICE_MINOR,
  formatPrice,
} from '../../config/priceCatalog';
import { CHARACTER_COVER, type DifficultySlug, type StoryGroup } from '../../types/storyGroups';
import type { CatalogProduct } from '../../services/catalogServices';

/**
 * The three ways to buy, side by side: one story, a character's set, and
 * everything. Each card says what is inside it — covers, titles, how many
 * tracks and minutes — so the choice is between things you can see.
 *
 * Every number comes from the catalog. Nothing here decides a price; where the
 * catalog has no product yet (the all-levels bundle) the card says "soon".
 */

export type SetState = 'buy' | 'owned' | 'soon';

export interface SetOffer {
  product: CatalogProduct;
  /** Stories in the set that are on the shelf, in shelf order. */
  released: StoryGroup[];
  /** Stories in the set that are not out yet. */
  upcoming: number;
  /** What this buyer would pay, after what they already own. */
  priceMinor: number;
  /** The same tracks bought one story at a time. */
  fullMinor: number;
  /** Total listening time of the whole set, or of what is out so far. */
  minutes: number | null;
  minutesComplete: boolean;
  state: SetState;
  inCart: boolean;
}

export interface LevelSummary {
  difficulty: DifficultySlug;
  setTitle: string | null;
  tracks: number;
}

interface Props {
  /** Cheapest single story on this level, if any is sold. */
  cheapestMinor: number | null;
  sets: SetOffer[];
  levels: LevelSummary[];
  highlightSku?: string | null;
  setTitle: (character: string) => string;
  onToggleSet: (sku: string) => void;
}

const kicker = 'font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500';
const cardBase = 'flex flex-col gap-3 rounded-card bg-white p-5 sm:p-6';

const Thumbs = ({ covers, placeholders }: { covers: (string | undefined)[]; placeholders: number }) => (
  <div className="flex pr-3" aria-hidden="true">
    {covers.map((src, i) => (
      <div key={i} className="-mr-3 h-[60px] w-12 shrink-0 overflow-hidden rounded-tile border-2 border-white bg-gray-700">
        {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      </div>
    ))}
    {Array.from({ length: placeholders }, (_, i) => (
      <div key={`p${i}`} className="-mr-3 h-[60px] w-12 shrink-0 rounded-tile border-2 border-white bg-gray-700" />
    ))}
  </div>
);

const Check = () => <IoCheckmark className="h-3.5 w-3.5 shrink-0 text-green-700" aria-hidden="true" />;

export const OfferLadder = ({
  cheapestMinor,
  sets,
  levels,
  highlightSku,
  setTitle,
  onToggleSet,
}: Props) => {
  const { t } = useTranslation();

  const allStories = levels.length;
  const allTracks = levels.reduce((sum, l) => sum + l.tracks, 0);

  return (
    <section aria-label={t('shop.ladder.label')} className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* ── One story ─────────────────────────────────────────────────── */}
      <div className={`${cardBase} border border-gray-200`}>
        <span className={kicker}>{t('shop.ladder.single.kicker')}</span>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
          {t('shop.ladder.single.title')}
        </h2>
        <p className="text-sm leading-relaxed text-gray-600">{t('shop.ladder.single.body')}</p>
        <div className="mt-auto flex flex-col gap-3 pt-2">
          {cheapestMinor !== null && (
            <p className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">{t('shop.ladder.from')}</span>
              <span className="text-3xl font-extrabold tracking-tight tabular-nums text-gray-900">
                {formatPrice(cheapestMinor)}
              </span>
            </p>
          )}
          <a
            href="#shop-stories"
            className="flex h-11 items-center justify-center rounded-[3px] border border-gray-300 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
          >
            {t('shop.ladder.pickBelow')}
          </a>
        </div>
      </div>

      {/* ── The character's set ───────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {sets.map((offer) => {
          const { product } = offer;
          const saving =
            offer.fullMinor > offer.priceMinor
              ? Math.round((1 - offer.priceMinor / offer.fullMinor) * 100)
              : 0;
          const storyCount = product.storyKeys.length;
          return (
            <div
              key={product.sku}
              id={`sku-${product.sku}`}
              className={`${cardBase} relative border-2 border-gray-900 ${
                highlightSku === product.sku ? 'ring-2 ring-[#FFE24A] ring-offset-2' : ''
              }`}
            >
              {offer.state === 'buy' && saving > 0 && (
                <span className="absolute -top-3 right-5 rounded-chip bg-[#FFE24A] px-2.5 py-1 text-xs font-extrabold text-gray-900">
                  {t('shop.ladder.best', { percent: saving })}
                </span>
              )}
              <span className={kicker}>{t('shop.ladder.set.kicker')}</span>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
                {setTitle(product.character ?? '')}
              </h2>
              <Thumbs covers={offer.released.map((s) => s.cover)} placeholders={offer.upcoming} />
              <p className="text-sm font-bold text-gray-900">
                {t('shop.ladder.storiesCount', { count: storyCount })}
                {' · '}
                {t('shop.ladder.tracksCount', { count: product.parts })}
                {offer.minutes !== null && (
                  <>
                    {' · '}
                    {offer.minutesComplete
                      ? t('shop.ladder.minutes', { count: offer.minutes })
                      : t('shop.ladder.minutesSoFar', { count: offer.minutes })}
                  </>
                )}
              </p>
              <ul className="flex flex-col gap-1.5">
                {offer.released.map((s) => (
                  <li key={s.slug} className="flex items-center gap-2 text-[13px] text-gray-700">
                    <Check />
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <span className="font-mono text-[11px] tabular-nums text-gray-500">
                      {t('shelf.parts', { count: s.totalTracks })}
                    </span>
                  </li>
                ))}
                {offer.upcoming > 0 && (
                  <li className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('shop.ladder.moreSoon', { count: offer.upcoming })}</span>
                  </li>
                )}
              </ul>
              <div className="mt-auto flex flex-col gap-3 pt-2">
                {offer.state === 'owned' ? (
                  <p className="text-sm font-semibold text-green-700">{t('shop.ladder.allOwned')}</p>
                ) : (
                  <>
                    <p className="text-3xl font-extrabold tracking-tight tabular-nums text-gray-900">
                      {t('shop.ladder.perTrack', { price: formatPrice(SET_TRACK_PRICE_MINOR) })}
                    </p>
                    <p className="flex items-baseline gap-2 text-sm tabular-nums text-gray-600">
                      {t('shop.ladder.total', { price: formatPrice(offer.priceMinor) })}
                      {saving > 0 && <s className="text-gray-400">{formatPrice(offer.fullMinor)}</s>}
                    </p>
                  </>
                )}
                {offer.state !== 'owned' && (
                  <button
                    type="button"
                    onClick={() => onToggleSet(product.sku)}
                    disabled={offer.state === 'soon'}
                    aria-pressed={offer.inCart}
                    className={`h-11 rounded-[3px] text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      offer.inCart
                        ? 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}
                  >
                    {offer.state === 'soon'
                      ? t('shop.comingSoon')
                      : offer.inCart
                        ? t('shop.inCart')
                        : t('shop.addToCart')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {sets.length === 0 && (
          <div className={`${cardBase} border border-dashed border-gray-300`}>
            <span className={kicker}>{t('shop.ladder.set.kicker')}</span>
            <p className="text-sm text-gray-600">{t('shop.comingSoon')}</p>
          </div>
        )}
      </div>

      {/* ── Everything ────────────────────────────────────────────────────
          No all-levels product exists yet, so this card shows what it would
          hold and says "soon" rather than offering a price nobody has set. */}
      <div className={`${cardBase} border border-gray-200`}>
        <span className={kicker}>{t('shop.ladder.all.kicker')}</span>
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
          {t('shop.ladder.all.title')}
        </h2>
        <Thumbs covers={levels.map((l) => CHARACTER_COVER[l.difficulty])} placeholders={0} />
        <p className="text-sm font-bold text-gray-900">
          {t('shop.ladder.levelsCount', { count: allStories })}
          {' · '}
          {t('shop.ladder.tracksCount', { count: allTracks })}
        </p>
        <ul className="flex flex-col gap-1.5">
          {levels.map((l) => (
            <li key={l.difficulty} className="flex items-center gap-2 text-[13px] text-gray-700">
              <Check />
              <span className="min-w-0 flex-1 truncate">
                {t(`list.difficultyTitle.${l.difficulty}`)}
                {l.setTitle ? ` — ${l.setTitle}` : ''}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-gray-500">
                {t('shop.ladder.tracksShort', { count: l.tracks })}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <p className="text-3xl font-extrabold tracking-tight text-gray-400">{t('shop.comingSoon')}</p>
          <button
            type="button"
            disabled
            className="h-11 cursor-not-allowed rounded-[3px] border border-gray-300 bg-white text-sm font-bold text-gray-400"
          >
            {t('shop.comingSoon')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default OfferLadder;
