import { useTranslation } from 'react-i18next';
import { IoCheckmark } from 'react-icons/io5';
import { formatPrice } from '../../config/priceCatalog';
import { CHARACTER_COVER, type DifficultySlug, type StoryGroup } from '../../types/storyGroups';
import type { CatalogProduct } from '../../services/catalogServices';
import { useEntitlements } from '../../context/EntitlementsContext';
import { useSubscribe } from '../../hooks/useSubscribe';

/**
 * The two ways to buy, side by side: a subscription to the level on screen, or
 * to all three. Each card says what is inside it — covers, titles, how many
 * tracks and minutes — so the choice is between things you can see.
 *
 * Every number comes from the catalog. A plan someone already has turns into
 * its end date and a "renew" button; renewing adds the days to the end.
 */

export interface LevelSummary {
  difficulty: DifficultySlug;
  /** The level's character, by name. */
  character: string | null;
  /** Released stories and their tracks — what can be heard today. */
  stories: number;
  tracks: number;
}

interface Props {
  difficulty: DifficultySlug;
  level: CatalogProduct | null;
  all: CatalogProduct | null;
  /** This level's stories that are out, in shelf order. */
  released: StoryGroup[];
  /** Stories in the level's subscription that are not out yet. */
  upcoming: number;
  /** Listening time of what is out, when known. */
  minutes: number | null;
  minutesComplete: boolean;
  levels: LevelSummary[];
  /** Ringed — set when the paywall sent the learner here. */
  highlightSku?: string | null;
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

/** At most this many covers in a row, so a long level does not overflow the card. */
const MAX_THUMBS = 6;

export const SubscriptionPlans = ({
  difficulty,
  level,
  all,
  released,
  upcoming,
  minutes,
  minutesComplete,
  levels,
  highlightSku,
}: Props) => {
  const { t, i18n } = useTranslation();
  const { activeUntil, canBuy } = useEntitlements();
  const { subscribe, busySku, error, paymentsEnabled, signedIn } = useSubscribe();

  const date = (d: Date) => d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' });
  const levelTitle = t(`list.difficultyTitle.${difficulty}`);
  const allUntil = all ? activeUntil(all.sku) : null;

  // "Everything" against the same levels bought one by one.
  const separatelyMinor = level ? level.amountMinor * levels.length : 0;
  const saving =
    all && separatelyMinor > all.amountMinor
      ? Math.round((1 - all.amountMinor / separatelyMinor) * 100)
      : 0;

  const allTracks = levels.reduce((sum, l) => sum + l.tracks, 0);
  const releasedTracks = released.reduce((sum, s) => sum + s.totalTracks, 0);

  /** Price, what this account has, and the one button that fits. */
  const footer = (product: CatalogProduct, coveredUntil: Date | null) => {
    const until = activeUntil(product.sku);
    const sellable = canBuy(product.sku);
    const busy = busySku === product.sku;

    // Already inside the all-levels subscription: nothing to sell here.
    if (coveredUntil && !until) {
      return (
        <p className="text-sm font-semibold text-green-700">
          {t('shop.plans.coveredByAll', { date: date(coveredUntil) })}
        </p>
      );
    }

    const label = !sellable
      ? t('shop.comingSoon')
      : !signedIn
        ? t('shop.plans.loginToSubscribe')
        : !paymentsEnabled
          ? t('shop.paymentsDisabled')
          : until
            ? t('shop.plans.renew', { count: product.durationDays ?? 0 })
            : t('shop.plans.subscribe');

    return (
      <>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-3xl font-extrabold tracking-tight tabular-nums text-gray-900">
            {formatPrice(product.amountMinor)}
          </span>
          <span className="text-sm text-gray-600">
            {t('shop.plans.perPeriod', { count: product.durationDays ?? 0 })}
          </span>
        </p>
        {until && (
          <p className="text-sm font-semibold text-green-700">
            {t('shop.plans.activeUntil', { date: date(until) })}
          </p>
        )}
        <button
          type="button"
          onClick={() => subscribe(product.sku)}
          // A guest can always press it: that is what signs them in.
          disabled={!sellable || busy || (signedIn && !paymentsEnabled)}
          className={`h-11 rounded-[3px] text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            until
              ? 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }`}
        >
          {busy ? t('shop.plans.redirecting') : label}
        </button>
      </>
    );
  };

  return (
    <section aria-label={t('shop.plans.label')} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ── This level ─────────────────────────────────────────────────── */}
        {level ? (
          <div
            id={`sku-${level.sku}`}
            className={`${cardBase} border border-gray-200 ${
              highlightSku === level.sku ? 'ring-2 ring-[#FFE24A] ring-offset-2' : ''
            }`}
          >
            <span className={kicker}>{t('shop.plans.level.kicker')}</span>
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
              {t('shop.plans.level.title', { level: levelTitle })}
            </h2>
            <Thumbs
              covers={released.slice(0, MAX_THUMBS).map((s) => s.cover)}
              placeholders={Math.min(upcoming, Math.max(0, MAX_THUMBS - released.length))}
            />
            <p className="text-sm font-bold text-gray-900">
              {t('shop.plans.storiesCount', { count: released.length })}
              {' · '}
              {t('shop.plans.tracksCount', { count: releasedTracks })}
              {minutes !== null && (
                <>
                  {' · '}
                  {minutesComplete
                    ? t('shop.plans.minutes', { count: minutes })
                    : t('shop.plans.minutesSoFar', { count: minutes })}
                </>
              )}
            </p>
            <ul className="flex flex-col gap-1.5">
              {released.map((s) => (
                <li key={s.slug} className="flex items-center gap-2 text-[13px] text-gray-700">
                  <Check />
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  <span className="font-mono text-[11px] tabular-nums text-gray-500">
                    {t('shelf.parts', { count: s.totalTracks })}
                  </span>
                </li>
              ))}
              {upcoming > 0 && (
                <li className="flex items-center gap-2 text-[13px] text-gray-500">
                  <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{t('shop.plans.moreSoon', { count: upcoming })}</span>
                </li>
              )}
            </ul>
            <p className="text-xs text-gray-500">{t('shop.plans.newStoriesIncluded')}</p>
            <div className="mt-auto flex flex-col gap-3 pt-2">{footer(level, allUntil)}</div>
          </div>
        ) : (
          <div className={`${cardBase} border border-dashed border-gray-300`}>
            <span className={kicker}>{t('shop.plans.level.kicker')}</span>
            <p className="text-sm text-gray-600">{t('shop.comingSoon')}</p>
          </div>
        )}

        {/* ── Every level ────────────────────────────────────────────────── */}
        {all && (
          <div
            id={`sku-${all.sku}`}
            className={`${cardBase} relative border-2 border-gray-900 ${
              highlightSku === all.sku ? 'ring-2 ring-[#FFE24A] ring-offset-2' : ''
            }`}
          >
            {!allUntil && saving > 0 && (
              <span className="absolute -top-3 right-5 rounded-chip bg-[#FFE24A] px-2.5 py-1 text-xs font-extrabold text-gray-900">
                {t('shop.plans.best', { percent: saving })}
              </span>
            )}
            <span className={kicker}>{t('shop.plans.all.kicker')}</span>
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
              {t('shop.plans.all.title')}
            </h2>
            <Thumbs covers={levels.map((l) => CHARACTER_COVER[l.difficulty])} placeholders={0} />
            <p className="text-sm font-bold text-gray-900">
              {t('shop.plans.levelsCount', { count: levels.length })}
              {' · '}
              {t('shop.plans.tracksCount', { count: allTracks })}
            </p>
            <ul className="flex flex-col gap-1.5">
              {levels.map((l) => (
                <li key={l.difficulty} className="flex items-center gap-2 text-[13px] text-gray-700">
                  <Check />
                  <span className="min-w-0 flex-1 truncate">
                    {t(`list.difficultyTitle.${l.difficulty}`)}
                    {l.character ? ` — ${l.character}` : ''}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-gray-500">
                    {t('shop.plans.tracksShort', { count: l.tracks })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500">{t('shop.plans.newStoriesIncluded')}</p>
            {saving > 0 && level && (
              <p className="text-xs text-gray-500">
                {t('shop.plans.separately', {
                  count: levels.length,
                  price: formatPrice(separatelyMinor),
                })}
              </p>
            )}
            <div className="mt-auto flex flex-col gap-3 pt-2">{footer(all, null)}</div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs leading-relaxed text-gray-500">{t('shop.plans.footnote')}</p>
    </section>
  );
};

export default SubscriptionPlans;
