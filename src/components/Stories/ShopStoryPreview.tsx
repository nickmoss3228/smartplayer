import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoClose, IoLockClosed, IoPause, IoPlay } from 'react-icons/io5';
import type { DifficultySlug, StoryGroup } from '../../types/storyGroups';
import { fetchPublishedStory } from '../../services/storyServices';
import { resolveStory, type ResolvedStory } from '../../modules/story/resolveStory';
import { useCart } from '../../context/CartContext';
import { useEntitlements } from '../../context/EntitlementsContext';
import {
  formatPrice,
  storyKey,
  storySku,
  PREVIEW_SECONDS,
} from '../../config/priceCatalog';
import { useCatalog } from '../../context/CatalogContext';

interface Props {
  difficulty: DifficultySlug;
  story: StoryGroup;
  onClose: () => void;
}

/** Enough words to show the register of the story, not a vocabulary list. */
const WORDS_SHOWN = 6;

/**
 * "What's inside" — a spoiler of a story before it is bought.
 *
 * Built only from what the server already hands everyone: part 1 is always
 * audible to a non-owner (in full for a long story, as a timed preview for a
 * short one), so its audio, comic page and words are the honest sample. Later
 * parts show their titles and a padlock — enough to see the shape of the story
 * without giving it away.
 *
 * The sample stops at PREVIEW_SECONDS whatever the story's allowance, because
 * this is a taste in a shop, not the lesson; the free parts themselves are one
 * click away on the story's own page.
 */
export const ShopStoryPreview = ({ difficulty, story, onClose }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { has, add } = useCart();
  const { canBuy, ownedStories } = useEntitlements();
  const { getProduct, setForStory, priceFor } = useCatalog();

  const [resolved, setResolved] = useState<ResolvedStory | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedStory(difficulty, story.slug).then((dbStory) => {
      if (!cancelled) setResolved(resolveStory(difficulty, story.slug, dbStory));
    });
    return () => {
      cancelled = true;
    };
  }, [difficulty, story.slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Never leave a sample playing behind a closed modal.
  useEffect(() => () => audioRef.current?.pause(), []);

  const key = storyKey(difficulty, story.slug);
  const locked = story.locked === true;
  const freeParts = locked ? (story.freeParts ?? 0) : Infinity;
  const previewSeconds = locked ? (story.previewSeconds ?? null) : null;
  const firstTrack = resolved?.tracks[0];
  const words = (firstTrack?.vocabulary ?? []).slice(0, WORDS_SHOWN);

  const single = getProduct(storySku(key));
  const set = story.category === 'general' ? setForStory(key) : null;
  const setPrice = set ? priceFor(set, ownedStories) : 0;
  const canListenFree = freeParts > 0 || previewSeconds !== null;

  const partOpen = (n: number) =>
    !locked || n <= freeParts || (previewSeconds !== null && n === 1);

  const openStory = () => navigate(`/levels/${difficulty}/${story.slug}`);

  const toggleSample = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      if (el.currentTime >= PREVIEW_SECONDS) el.currentTime = 0;
      void el.play();
    } else {
      el.pause();
    }
  };

  const buy = (sku: string) => {
    add(sku);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={story.title}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: the story's own art, title over it. */}
        <div className="relative h-40 shrink-0 bg-gray-900">
          {story.cover && (
            <img src={story.cover} alt="" className="h-full w-full object-cover opacity-80" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shopPreview.close')}
            className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <IoClose size={18} aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-5 pb-3 pt-10">
            <p className="text-[10px] uppercase tracking-widest text-white/60">
              {t(`list.category.${story.category}`)} · {t('shelf.parts', { count: story.totalTracks })}
            </p>
            <h2 className="text-xl font-black leading-tight text-white">{story.title}</h2>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {story.description && (
            <p className="text-sm leading-relaxed text-gray-600">{story.description}</p>
          )}

          {/* The sample. */}
          {firstTrack?.audio && (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <button
                type="button"
                onClick={toggleSample}
                aria-label={playing ? t('controls.pause') : t('controls.play')}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-900 text-white transition-transform active:scale-95"
              >
                {playing ? <IoPause size={18} /> : <IoPlay size={18} className="ml-0.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-800">
                  {t('shopPreview.sample', { seconds: PREVIEW_SECONDS })}
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gray-900"
                    style={{ width: `${Math.min(elapsed / PREVIEW_SECONDS, 1) * 100}%` }}
                  />
                </div>
              </div>
              <audio
                ref={audioRef}
                src={firstTrack.audio}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  setElapsed(el.currentTime);
                  if (el.currentTime >= PREVIEW_SECONDS) el.pause();
                }}
              />
            </div>
          )}

          {firstTrack?.comicUrl && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t('shopPreview.comic')}
              </p>
              <img
                src={firstTrack.comicUrl}
                alt=""
                loading="lazy"
                className="max-h-56 w-full rounded-md object-cover object-top"
              />
            </div>
          )}

          {words.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t('shopPreview.words')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {words.map((word) => (
                  <span
                    key={word.audioKey || word.word}
                    className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-700"
                  >
                    {word.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {t('shopPreview.parts')}
            </p>
            {resolved ? (
              <ol className="divide-y divide-gray-100">
                {resolved.tracks.map((track, i) => {
                  const n = i + 1;
                  const open = partOpen(n);
                  const isPreview = locked && open && n > freeParts;
                  return (
                    <li key={track.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-gray-700">
                        <span className="mr-2 tabular-nums text-gray-400">{n}</span>
                        {track.title}
                      </span>
                      {!locked ? null : !open ? (
                        <IoLockClosed size={12} className="shrink-0 text-gray-400" aria-hidden="true" />
                      ) : isPreview ? (
                        <span className="shrink-0 text-[10px] uppercase text-gray-400">
                          {t('shelf.previewBadge', { seconds: previewSeconds })}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-semibold uppercase text-green-600">
                          {t('shopPreview.free')}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="py-2 text-xs text-gray-400">{t('shopPreview.loading')}</p>
            )}
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-gray-100 px-5 py-4">
          {!locked ? (
            <button
              type="button"
              onClick={openStory}
              className="w-full cursor-pointer rounded-sm bg-green-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('shopPreview.listen')}
            </button>
          ) : (
            <>
              {single && canBuy(single.sku) && (
                <button
                  type="button"
                  onClick={() => buy(single.sku)}
                  disabled={has(single.sku)}
                  className="w-full cursor-pointer rounded-sm bg-gray-900 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
                >
                  {has(single.sku)
                    ? t('shop.inCart')
                    : `${t('shopPreview.buyStory')} · ${formatPrice(single.amountMinor)}`}
                </button>
              )}
              {set && canBuy(set.sku) && setPrice > 0 && (
                <button
                  type="button"
                  onClick={() => buy(set.sku)}
                  disabled={has(set.sku)}
                  className="w-full cursor-pointer rounded-sm border-2 border-gray-900 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
                >
                  {has(set.sku)
                    ? t('shop.inCart')
                    : `${t(`shelf.sets.${set.character}`)} · ${formatPrice(setPrice)}`}
                </button>
              )}
              {canListenFree && (
                <button
                  type="button"
                  onClick={openStory}
                  className="w-full cursor-pointer py-1.5 text-xs font-semibold text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-900"
                >
                  {t('shopPreview.listenFree')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopStoryPreview;
