import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { IoArrowForward } from 'react-icons/io5';
import MilkGlass from '../../Levels/MilkGlass';
import type { DifficultySlug } from '../../../types/storyGroups';
import { landingStore, useLanding } from '../landingStore';

const LEVELS: DifficultySlug[] = ['easy', 'medium', 'hard'];

/** How full each level's glass sits, as on /levels. */
const SHELF_FILL: Record<DifficultySlug, number> = { easy: 0.28, medium: 0.58, hard: 0.92 };

const FAT_KEY: Record<DifficultySlug, string> = {
  easy: 'levels.fatEasy',
  medium: 'levels.fatMedium',
  hard: 'levels.fatHard',
};

/**
 * Chapter 5: the three levels, told as glasses of milk. In the 3D scene the
 * glasses follow the level picked here (and picking one there picks it here:
 * the choice lives in the landing store); without the scene, the card shows
 * the three glasses as a still.
 */
export function LevelCard() {
  const { t } = useTranslation();
  const is3d = useLanding((s) => s.is3d);
  const level = useLanding((s) => s.level);

  return (
    <section className="ch" data-ch="5">
      <div className="card">
        {/* Only built without the scene: the glasses keep a wave going on the main thread, which nobody sees behind display:none. */}
        {!is3d && (
          <div className="still still-glasses">
            {LEVELS.map((d) => (
              <span key={d}>
                <MilkGlass fill={SHELF_FILL[d]} selected className="h-auto w-full" style={{ color: `var(--${d})` }} />
              </span>
            ))}
          </div>
        )}
        <p className="eyebrow">{t('levels.fatLabel')}</p>
        <h2>{t('howToUse.pick.title')}</h2>
        <p>{t('howToUse.pick.text')}</p>
        <div className="lvl-pick">
          {LEVELS.map((d) => (
            <button key={d} type="button" aria-pressed={level === d} onClick={() => landingStore.set({ level: d })}>
              <b className="tnum">{t(FAT_KEY[d])}</b>
              <small>{t(`levels.${d}`)}</small>
            </button>
          ))}
        </div>
        <Link className="btn btn-primary" to={`/levels/${level}`}>
          {t('landing.levels.start', { story: t(`landing.levels.lead.${level}`) })}
          <IoArrowForward aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
