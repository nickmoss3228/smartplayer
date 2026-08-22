import { useParams, useNavigate } from 'react-router-dom';
import { useStoryGroups, DifficultySlug, StoryGroup } from '../types/storyGroups';
import { useProgress } from '../context/ProgressContext';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  IoSearchOutline,
  IoFunnelOutline,
  IoBookOutline,
  IoNewspaperOutline,
  IoCheckmark,
  IoPlay,
} from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

/**
 * Story cards are 4:5 crops of each story's own comic page with the title set
 * in a caption plate, the way a comic puts narration inside the panel. The art
 * is monochrome, so progress is the one piece of colour on a card — red, the
 * same red the player's timeMarkers already use.
 *
 * Level identity (the milk-fat metaphor) never rides on hue alone: the tag
 * carries the fat numeral and a filled-segment meter as well as the colour, so
 * it survives colour-blind viewing.
 */
const levelAccents: Record<DifficultySlug, {
  fill: string;
  text: string;
  segments: number;
  fatKey: string;
}> = {
  easy:   { fill: 'bg-emerald-600', text: 'text-emerald-700', segments: 1, fatKey: 'fatEasy' },
  medium: { fill: 'bg-orange-600',  text: 'text-orange-700',  segments: 2, fatKey: 'fatMedium' },
  hard:   { fill: 'bg-purple-600',  text: 'text-purple-700',  segments: 3, fatKey: 'fatHard' },
};

const categoryOrder: StoryGroup['category'][] = ['general', 'news'];

const List = () => {
  const { difficulty } = useParams<{ difficulty: string }>();
  const navigate = useNavigate();
  const { getStoryData } = useProgress();
  const { t } = useTranslation();

  const diff = (difficulty || 'easy') as DifficultySlug;
  const stories = useStoryGroups(diff, t);
  const accent = levelAccents[diff] || levelAccents.easy;

  const getStoryProgress = (story: StoryGroup) => {
    const storyData = getStoryData(diff, story.slug);
    const completed = storyData.completedParts.length;
    const total = story.totalTracks;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const [topicFilter, setTopicFilter] = useState<string>('all');

  const allTopics = useMemo(() => {
    const topics = stories
      .map(s => (s as any).topic as string | undefined)
      .filter(Boolean) as string[];
    return ['all', ...Array.from(new Set(topics))];
  }, [stories]);

  // Cards are browsed by eye, so stories keep the order they are authored in
  // (storyGroupsRaw, then published DB stories) rather than being alphabetised
  // the way the old sortable table did it.
  const filteredStories = useMemo(() => {
    if (topicFilter === 'all') return stories;
    return stories.filter(s => (s as any).topic === topicFilter);
  }, [stories, topicFilter]);

  /**
   * Cards are held at opacity 0 by the [data-list-reveal] rule in App.css and
   * released as they scroll into view, so a story below the fold plays its
   * entrance when you actually reach it rather than finishing unseen — most of
   * the Easy grid sits below the fold on a phone.
   *
   * Re-runs when the story list changes, because useStoryGroups appends
   * published DB stories after its fetch resolves; without that, a story that
   * arrived late would never be observed and would stay invisible.
   */
  const stageRef = useRef<HTMLDivElement>(null);

  const groupedStories = useMemo(() => {
    const byCategory = new Map<StoryGroup['category'], StoryGroup[]>();
    for (const story of filteredStories) {
      const list = byCategory.get(story.category) ?? [];
      list.push(story);
      byCategory.set(story.category, list);
    }
    return categoryOrder
      .filter(cat => byCategory.has(cat))
      .map(cat => ({ category: cat, stories: byCategory.get(cat)! }));
  }, [filteredStories]);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;

    const cards = Array.from(
      root.querySelectorAll<HTMLElement>('[data-list-reveal="out"]')
    );
    if (cards.length === 0) return;

    const reveal = (el: Element) => el.setAttribute('data-list-reveal', 'in');

    if (typeof IntersectionObserver === 'undefined') {
      cards.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      },
      // A sliver is enough: the card should already be moving by the time it
      // clears the fold, not start once it is fully on screen.
      { threshold: 0.08, rootMargin: '0px 0px -5% 0px' }
    );

    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [groupedStories]);

  /** Colour + numeral + filled segments, so the level reads three ways. */
  const FatMeter = () => (
    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-gray-500">
      <span className="flex gap-[2px]" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className={`block h-3 w-[5px] rounded-[1px] ${
              i < accent.segments ? accent.fill : 'bg-gray-200'
            }`}
          />
        ))}
      </span>
      <span>
        {t('levels.fatLabel')}{' '}
        <span className={`font-semibold tabular-nums ${accent.text}`}>
          {t(`levels.${accent.fatKey}`)}
        </span>
      </span>
    </span>
  );

  const renderCard = (story: StoryGroup, index: number) => {
    const { completed, total, percentage } = getStoryProgress(story);
    const isCompleted = total > 0 && completed >= total;
    const hasStarted = completed > 0;
    const nextPart = Math.min(completed + 1, total);

    // No cover art yet: news placeholders, and anything built in the Story
    // Builder (dbStoryToGroup carries no image). These get a halftone screen
    // and a category icon rather than a stretched-out placeholder.
    const FallbackIcon = story.category === 'news' ? IoNewspaperOutline : IoBookOutline;

    const stateLabel = isCompleted
      ? t('list.completed')
      : hasStarted
        ? `${t('list.next')} ${nextPart}`
        : t('list.start');

    return (
      <button
        key={story.slug}
        type="button"
        onClick={() => navigate(`/levels/${diff}/${story.slug}`)}
        data-list-reveal="out"
        // Panels land in reading order. The stagger is capped so a long shelf
        // never turns the entrance into a queue you have to wait out.
        style={{ '--list-delay': `${Math.min(index, 7) * 55}ms` } as React.CSSProperties}
        className={`group relative block w-full cursor-pointer overflow-hidden rounded-lg text-left aspect-[4/5] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${
          story.cover ? 'bg-gray-900' : 'bg-white border border-gray-200'
        }`}
      >
        {story.cover ? (
          <img
            src={story.cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-105"
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

        {/* Where you are, readable without hovering — phones have no hover. */}
        {(hasStarted || isCompleted) && (
          <span
            className={`list-card__chip absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded px-1.5 py-[3px] text-[10px] font-semibold tabular-nums ${
              isCompleted ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
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
        )}

        {/* The caption plate. On a pointer device it slides down on hover to
            uncover the art; on touch it simply stays put. */}
        <span className="absolute inset-x-[7%] top-1/2 z-10 block -translate-y-1/2 rounded-[3px] bg-gray-900 px-2.5 py-2 text-white transition-transform duration-500 ease-out sm:group-hover:translate-y-0">
          <span className="block text-[11px] font-bold uppercase leading-tight tracking-wide line-clamp-3 sm:text-[13px]">
            {story.title}
          </span>
          <span className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/15 pt-1.5 text-[9px] uppercase tracking-wider text-white/70 sm:text-[10px]">
            <span className="truncate">{stateLabel}</span>
            <span className="shrink-0 tabular-nums">
              {completed}/{total}
            </span>
          </span>
        </span>

        {/* Progress sits in the panel's bottom gutter. */}
        <span
          className={`absolute inset-x-0 bottom-0 z-10 block h-1 ${
            story.cover ? 'bg-black/40' : 'bg-gray-200'
          }`}
        >
          {/* Width is the real value; the entrance scales it in from the left,
              so the bar inks itself rather than animating layout. */}
          <span
            className="list-card__fill block h-full bg-red-500"
            style={{ width: `${percentage}%` }}
          />
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* Header */}
      <div className="max-w-5xl pt-20 mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4 animate-fade-in">

          <button
            onClick={() => navigate('/levels')}
            className="flex items-center cursor-pointer gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="text-center flex-1 min-w-0 px-2">
            <div className="text-xl sm:text-2xl font-bold text-gray-800 tracking-wide">
              {t(`list.difficultyTitle.${diff}`)}
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {filteredStories.length} / {stories.length} {t(`list.stories`)}
            </p>
          </div>

          <div className="w-4 flex-shrink-0" />

        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 animate-fade-in-delay-1">
          <FatMeter />

          {allTopics.length > 1 && (
            <div className="relative">
              <IoFunnelOutline
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <select
                value={topicFilter}
                onChange={e => setTopicFilter(e.target.value)}
                className="pl-8 pr-8 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 text-gray-700 appearance-none cursor-pointer"
              >
                {allTopics.map(topic => (
                  <option key={topic} value={topic}>
                    {topic === 'all' ? 'All Topics' : topic}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Story groups */}
      <div ref={stageRef} className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        {groupedStories.length > 0 ? (
          groupedStories.map(({ category, stories: groupStories }) => (
            <div key={category}>
              {groupedStories.length > 1 && (
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1 animate-fade-in-delay-2">
                  {t(`list.category.${category}`)}
                </h2>
              )}
              {/* Medium and Hard ship a single story each. One half-width card
                  stranded on an empty page reads as a bug, so a lone story runs
                  as a hero card instead of a one-item grid. */}
              <div
                className={
                  groupStories.length === 1
                    ? 'grid grid-cols-1 sm:max-w-xs'
                    : 'grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4'
                }
              >
                {groupStories.map((story, index) => renderCard(story, index))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="text-center py-16 text-gray-400">
              <IoSearchOutline size={32} className="mx-auto mb-3 opacity-40" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default List;
