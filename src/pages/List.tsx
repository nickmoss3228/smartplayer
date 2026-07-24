import { useParams, useNavigate } from 'react-router-dom';
import { getStoryGroups, DifficultySlug, StoryGroup } from '../types/storyGroups';
import { useProgress } from '../context/ProgressContext';
import { useState, useMemo } from 'react';
import {
  IoSearchOutline,
  IoFunnelOutline,
  IoTimeOutline,
  IoBookOutline,
  IoCheckmarkCircle,
  IoEllipseOutline,
  IoPricetagOutline,
  IoChevronForward,
} from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

const difficultyThemes: Record<DifficultySlug, {
  gradient: string;
  hoverGradient: string;
  title: string;
  textColor: string;
  borderColor: string;
  progressColor: string;
  rowHover: string;
  badgeBg: string;
}> = {
  easy: {
    gradient: 'from-green-600 to-emerald-600',
    hoverGradient: 'hover:from-green-700 hover:to-emerald-700',
    title: 'Easy Level',
    textColor: 'text-green-600',
    borderColor: 'border-green-500/30',
    progressColor: 'bg-green-500',
    rowHover: 'hover:bg-green-50',
    badgeBg: 'bg-green-100 text-green-700',
  },
  medium: {
    gradient: 'from-yellow-600 to-orange-600',
    hoverGradient: 'hover:from-yellow-700 hover:to-orange-700',
    title: 'Medium Level',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-500/30',
    progressColor: 'bg-orange-500',
    rowHover: 'hover:bg-orange-50',
    badgeBg: 'bg-orange-100 text-orange-700',
  },
  hard: {
    gradient: 'from-red-600 to-purple-600',
    hoverGradient: 'hover:from-red-700 hover:to-purple-700',
    title: 'Hard Level',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-500/30',
    progressColor: 'bg-purple-500',
    rowHover: 'hover:bg-purple-50',
    badgeBg: 'bg-purple-100 text-purple-700',
  },
};

type SortKey = 'title' | 'topic' | 'progress';
type SortDir = 'asc' | 'desc';

const List = () => {
  const { difficulty } = useParams<{ difficulty: string }>();
  const navigate = useNavigate();
  const { getStoryData } = useProgress();
  const { t } = useTranslation();

  const diff = (difficulty || 'easy') as DifficultySlug;
  const stories = getStoryGroups(diff, t);
  const theme = difficultyThemes[diff] || difficultyThemes.easy;

  const getStoryProgress = (story: StoryGroup) => {
    const storyData = getStoryData(diff, story.slug);
    const completed = storyData.completedParts.length;
    const total = story.totalTracks;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const [search, _setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  const allTopics = useMemo(() => {
    const topics = stories
      .map(s => (s as any).topic as string | undefined)
      .filter(Boolean) as string[];
    return ['all', ...Array.from(new Set(topics))];
  }, [stories]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedFilteredStories = useMemo(() => {
    let result = [...stories];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          (s as any).topic?.toLowerCase().includes(q)
      );
    }

    if (topicFilter !== 'all') {
      result = result.filter(s => (s as any).topic === topicFilter);
    }

    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortKey === 'title') {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      } else if (sortKey === 'topic') {
        valA = ((a as any).topic || '').toLowerCase();
        valB = ((b as any).topic || '').toLowerCase();
      } else if (sortKey === 'progress') {
        valA = getStoryProgress(a).percentage;
        valB = getStoryProgress(b).percentage;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [stories, search, topicFilter, sortKey, sortDir, getStoryData, diff]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return (
      <span className={`ml-1 ${theme.textColor}`}>
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* Header */}
      <div className="max-w-5xl pt-20 mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-6 animate-fade-in">

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
              {t(`levelProgress.${diff}Title`)}
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {sortedFilteredStories.length} / {stories.length} {t(`list.stories`)}
            </p>
          </div>

          <div className="w-4 flex-shrink-0" />

        </div>

        <div>
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

      {/* Table */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* ── Desktop table header ── */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1.4fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <button
              onClick={() => handleSort('title')}
              className="flex items-center text-left hover:text-gray-600 transition-colors"
            >
              <IoBookOutline size={13} className="mr-1.5" />
              {t(`list.title`)}
              <SortIcon col="title" />
            </button>
            <button
              onClick={() => handleSort('topic')}
              className="flex items-center hover:text-gray-600 transition-colors"
            >
              {t(`list.topic`)}
              <SortIcon col="topic" />
            </button>
            <button
              onClick={() => handleSort('progress')}
              className="flex items-center hover:text-gray-600 transition-colors"
            >
              {t(`list.progress`)}
              <SortIcon col="progress" />
            </button>
          </div>

          {/* Rows */}
          {sortedFilteredStories.length > 0 ? (
            sortedFilteredStories.map((story, index) => {
              const { completed, total, percentage } = getStoryProgress(story);
              const isCompleted = percentage === 100;
              const topic = (story as any).topic as string | undefined;
              const duration = (story as any).duration as string | undefined;
              const borderClass =
                index !== sortedFilteredStories.length - 1
                  ? 'border-b border-gray-100'
                  : '';

              return (
                <div
                  key={story.slug}
                  onClick={() => navigate(`/levels/${diff}/${story.slug}`)}
                  className={`cursor-pointer transition-colors duration-150 ${theme.rowHover} ${borderClass}`}
                >

                  {/* ── MOBILE layout ── */}
                  <div className="sm:hidden flex items-center gap-3 px-4 py-4">

                    {/* Circular progress indicator */}
                    <div className="relative shrink-0 w-11 h-11">
                      <svg viewBox="0 0 40 40" className="w-11 h-11 -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-gray-100"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 16}
                          strokeDashoffset={2 * Math.PI * 16 * (1 - percentage / 100)}
                          className={`${theme.textColor} transition-all duration-500`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isCompleted ? (
                          <IoCheckmarkCircle size={16} className={theme.textColor} />
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-500">
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug truncate">
                        {story.title}
                      </p>

                      {story.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {story.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-2">
                        {topic && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${theme.badgeBg}`}
                          >
                            <IoPricetagOutline size={11} />
                            {topic}
                          </span>
                        )}
                        {duration && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px]">
                            <IoTimeOutline size={11} />
                            {duration}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 ml-auto">
                          {completed}/{total}
                        </span>
                      </div>
                    </div>

                    <IoChevronForward size={16} className="text-gray-300 shrink-0" />
                  </div>

                  {/* ── DESKTOP layout ── */}
                  <div className="hidden sm:grid grid-cols-[2fr_1fr_1.4fr] gap-1 px-5 py-4">
                    {/* Title + description */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {story.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {story.description}
                        </p>
                      </div>
                    </div>

                    {/* Topic */}
                    <div className="flex items-center">
                      {topic ? (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${theme.badgeBg}`}>
                          {topic}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <IoCheckmarkCircle size={16} className={theme.textColor} />
                      ) : (
                        <IoEllipseOutline size={16} className="text-gray-300" />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-400">{completed}/{total}</span>
                          <span className={`text-xs font-semibold ${theme.textColor}`}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${theme.progressColor} rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="text-center py-16 text-gray-400">
              <IoSearchOutline size={32} className="mx-auto mb-3 opacity-40" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default List;



// {/* Header */}
//       <div className="max-w-5xl pt-16 mx-auto px-4 sm:px-6">
//         <div className="flex items-center justify-between gap-2 sm:gap-4 mb-8 animate-fade-in">
//           {/* <NavigationArrow
//             direction="left"
//             difficulty={navigationState.prevDifficulty}
//             onClick={() => goToDifficulty(navigationState.prevDifficulty)}
//             disabled={!navigationState.prevDifficulty}
//           /> */}

//           <div className="text-center flex-1 min-w-0 px-2">
//             <button
//               onClick={() => navigate('/levels')}
//               className="flex items-left cursor-pointer gap-2 mt-6 mb-4 text-gray-500 hover:text-gray-800 transition-colors mx-auto text-sm"
//             >
//               <IoArrowBack size={16} />
//               {/* <span>Back to Levels</span> */}
//             </button>
//             <div className="text-xl sm:text-2xl font-bold text-gray-800 tracking-wide">
//               {t(`levelProgress.${diff}Title`)}
//             </div>
//             <p className="text-gray-400 text-sm mt-1">
//               {sortedFilteredStories.length} / {stories.length} stories
//             </p>
//           </div>

//           {/* <NavigationArrow
//             direction="right"
//             difficulty={navigationState.nextDifficulty}
//             onClick={() => goToDifficulty(navigationState.nextDifficulty)}
//             disabled={!navigationState.nextDifficulty}
//           /> */}
//         </div>


        {/* Filter bar */}
        {/* <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <IoSearchOutline
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stories..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 text-gray-700 placeholder-gray-400"
            />
          </div> */}