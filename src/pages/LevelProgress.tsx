

// import React, { useEffect, useState } from 'react';
// import { useTranslation } from 'react-i18next';
// import { themes } from '../modules/levelprogress/themes.levelprogress';
// import { LevelProgressProps, Theme } from '../types/LevelProgress';
// import { useLevelProgress } from '../hooks/useLevelProgress';
// import {
//   loadLastListened,
//   saveLastListened,
// } from '../modules/levelprogress/levelprogress.module';
// import { useLocation, useNavigate } from 'react-router';
// import { CongratsModal } from '../modules/levelprogress/congratsModule';
// import { LevelProgressSkeleton } from '../modules/levelprogress/LevelProgressSkeleton';
// import { useProgress } from '../context/ProgressContext';
// import { getAudioTracksByDifficulty } from '../modules/audiodata/audioDataByDiffculty';
// import { StoryPreviewModal } from '../modules/storypreview/StoryPreviewModal';
// import {
//   storyPreviewData,
//   StoryPreview,
// } from '../modules/storypreview/storyPreviewData';
// import { getOrderedComics } from '../components/Player/Comics/ComicsDisplay';
// import { preloadImages } from '../services/preload';
// import { usePreloadStoryAssets } from '../hooks/usePreloadStoryAssets';
// import type { Difficulty } from '../types/Player';
// import { useAuth } from '../context/AuthContext';
// import { FREE_TRIAL_STORIES } from '../constants/trial';

// const LevelProgress: React.FC<LevelProgressProps> = (props) => {
//   const { t } = useTranslation();
//   const location = useLocation();
//   const navigate = useNavigate();

//   // know whether the user is signed in 
//   const { user } = useAuth();
  
//   const [showCongrats, setShowCongrats] = useState(false);
//   const [previewLevel, setPreviewLevel] = useState<number | null>(null);
//   const [previewData, setPreviewData] = useState<StoryPreview | null>(null);
//   const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  
//   const [lastListenedLevel, setLastListenedLevel] = useState<number | null>(
//     () => loadLastListened(props.difficulty ?? 'easy'),
//   );

//   useEffect(() => {
//     setLastListenedLevel(loadLastListened(props.difficulty ?? 'easy'));
//   }, [props.difficulty]);

//   const { getStoryData, isInitialLoad } = useProgress();

//   const storyData = getStoryData(
//     props.difficulty ?? 'easy',
//     props.storySlug ?? 'leo',
//   );

//   const isLoading = !!user && storyData.loading && isInitialLoad;

//   const completedLevels = props.completedLevels?.length
//     ? props.completedLevels
//     : storyData.completedParts;
//   const currentLevel = props.currentLevel ?? storyData.currentPart;

//   const audioTracks = getAudioTracksByDifficulty(
//     props.difficulty ?? 'easy',
//   );

//   // Fallback to audioTracks.length so the grid renders for guests too ─────
//   const totalLevels =
//     props.totalLevels ?? (storyData.totalParts || audioTracks.length);
  
//   const {
//     difficulty,
//     handleLevelClick,
//     goToDifficulty,
//     getLevelData,
//     progressPercentage,
//     navigationState,
//   } = useLevelProgress({
//     ...props,
//     completedLevels,
//     currentLevel,
//     totalLevels,
//   });

//   const theme: Theme = themes[difficulty] || themes.easy;
//   const { preloadAudioAssets } = usePreloadStoryAssets(difficulty as Difficulty);
//   const comics = getOrderedComics(difficulty);

//   const isAllCompleted =
//     completedLevels.length === totalLevels ||
//     (completedLevels.length === totalLevels - 1 && currentLevel > totalLevels);

//   const getCongratsKey = (diff: string) => `congrats_shown_${diff}`;
//   const hasShownCongrats = (diff: string) =>
//     localStorage.getItem(getCongratsKey(diff)) === 'true';
//   const markCongratsShown = (diff: string) =>
//     localStorage.setItem(getCongratsKey(diff), 'true');

//   useEffect(() => {
//     window.scrollTo(0, 0);
//   }, [location.pathname]);

//   useEffect(() => {
//     const previewUrls = audioTracks
//       .map((track) => {
//         const data = storyPreviewData[`${difficulty}-${track.id}`];
//         return (data as any)?.coverImage as string | undefined;
//       })
//       .filter((url): url is string => Boolean(url));
//     preloadImages(previewUrls);

//     const comicUrls = (comics as any[])
//       .map((c) => (typeof c === 'string' ? c : c?.src ?? c?.cover ?? c?.image))
//       .filter((url): url is string => typeof url === 'string' && url.length > 0);
//     preloadImages(comicUrls);
//   }, [difficulty]);

//   useEffect(() => {
//     if (isAllCompleted && !hasShownCongrats(difficulty)) {
//       const timer = setTimeout(() => {
//         setShowCongrats(true);
//         markCongratsShown(difficulty);
//       }, 500);
//       return () => clearTimeout(timer);
//     }
//   }, [isAllCompleted, difficulty]);

//   if (isLoading) return <LevelProgressSkeleton />;

//   // ─── Helpers ──────────────────────────────────────────────────────────────

//   const getStatusRingClass = (status: string) => {
//     switch (status) {
//       case 'completed': return 'ring-2 ring-green-400/80';
//       case 'current':   return 'ring-2 ring-white/80';
//       case 'locked':
//       default:          return 'ring-1 ring-white/20';
//     }
//   };

//   const isTrialLocked = (level: number): boolean =>
//     !user && level > FREE_TRIAL_STORIES;

//   // ─── Handlers ─────────────────────────────────────────────────────────────
//   const handleLevelCardClick = (level: number) => {
//     // intercept before doing anything else 
//     if (isTrialLocked(level)) {
//       setShowRegisterPrompt(true);
//       return;
//     }
//     const key = `${difficulty}-${level}`;
//     const data = storyPreviewData[key] ?? null;
//     setPreviewLevel(level);
//     setPreviewData(data);
//     preloadAudioAssets(level);
//   };

//   const handleStartListening = () => {
//     if (previewLevel !== null) {
//       setLastListenedLevel(previewLevel);
//       saveLastListened(difficulty, previewLevel);
//       handleLevelClick(previewLevel);
//     }
//     setPreviewLevel(null);
//     setPreviewData(null);
//   };

//   const handleClosePreview = () => {
//     setPreviewLevel(null);
//     setPreviewData(null);
//   };

//   const handleCloseCongrats = () => setShowCongrats(false);

//   const handleNextDifficulty = () => {
//     setShowCongrats(false);
//     if (navigationState.nextDifficulty) {
//       goToDifficulty(navigationState.nextDifficulty);
//     }
//   };

//   return (
//     <div
//       className={`min-h-screen bg-gradient-to-br ${theme.background} p-8 transition-all duration-1000 ease-in-out`}
//     >
//       <div className="max-w-4xl pt-12 mx-auto">

//         {/* Header */}
//         <div className="relative flex items-center mb-10 animate-fade-in">
//           <button
//             onClick={() => navigate(`/levels/${difficulty}`)}
//             className="absolute left-0 flex items-center gap-1.5 text-black/60 cursor-pointer hover:text-black transition-colors text-sm z-10"
//           >
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="h-4 w-4"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//               strokeWidth={2}
//             >
//               <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
//             </svg>
//             <span className="hidden sm:inline">Вернуться</span>
//           </button>

//           <div className="w-full text-center px-14 sm:px-20 transform transition-all duration-700 ease-in-out">
//             <div className="text-sm sm:text-2xl md:text-2xl font-bold text-black/80 mb-1 sm:mb-2 tracking-wider transition-all duration-700 animate-slide-down">
//               {t(`levelProgress.${difficulty}Title`)}
//             </div>
//             <h1 className="text-2xl sm:text-4xl md:text-4xl font-bold text-black/80 transition-all duration-700 animate-slide-up break-words">
//               {theme.subtitle}
//             </h1>
//           </div>
//         </div>

//         {/* Progress Overview */}
//         <div className="backdrop-blur-sm rounded-2xl p-6 mb-5 transition-all duration-500 animate-fade-in-delay-2 hover:bg-white/80">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="text-sm font-semibold text-black/80">
//               {t('levelProgress.overallProgress')}
//             </h2>
//             <span className="text-black/80 text-sm">
//               {completedLevels.length}/{totalLevels}{' '}
//               {t('levelProgress.completedCount')}
//             </span>
//           </div>
//           <div className="w-full bg-white/20 rounded-full h-3">
//             <div
//               className={`bg-gradient-to-r ${theme.progressGradient} h-3 rounded-full transition-all duration-700 ease-in-out`}
//               style={{ width: `${progressPercentage}%` }}
//             />
//           </div>
//         </div>

//         {/* Level Grid */}
//         <div className="grid grid-cols-2 md:grid-cols-5 gap-5 animate-fade-in-delay-3">
//           {Array.from({ length: totalLevels }, (_, index) => {
//             const level = index + 1;
//             const levelData = getLevelData(level, lastListenedLevel);
//             const isCompleted = completedLevels.includes(level);
//             const locked = isTrialLocked(level); // ── NEW
//             const trackTitle =
//               audioTracks.find((tr) => tr.id === level.toString())?.title ||
//               `${t('levelProgress.levelLabel')} ${level}`;

//             return (
//               <div
//                 key={level}
//                 onClick={() => handleLevelCardClick(level)}
//                 className="group cursor-pointer animate-scale-in flex flex-col gap-2 transition-transform duration-300 hover:-translate-y-1 active:scale-95"
//                 style={{ animationDelay: `${index * 50}ms` }}
//               >
//                 {/* Square cover */}
//                 <div
//                   className={`
//                     relative w-full aspect-square rounded-xl overflow-hidden
//                     bg-gradient-to-br from-white/30 to-white/10
//                     shadow-md group-hover:shadow-xl transition-shadow duration-300
//                     ${getStatusRingClass(levelData.status)}
//                   `}
//                 >
//                   {/* Comic artwork */}
//                   {comics[level - 1] ? (
//                     <img
//                       src={comics[level - 1]}
//                       alt={trackTitle}
//                       draggable={false}
//                       className={`
//                         w-full h-full object-cover object-center
//                         scale-[1.65] group-hover:scale-[1.82]
//                         transition-transform duration-500 ease-out
//                         ${locked ? 'brightness-50' : ''}
//                       `}
//                     />
//                   ) : (
//                     <div
//                       className={`
//                         w-full h-full flex items-center justify-center
//                         bg-gradient-to-br ${theme.progressGradient} opacity-70
//                       `}
//                     >
//                       <span className="text-white/60 text-4xl font-bold select-none">♪</span>
//                     </div>
//                   )}

//                   {/* ── NEW: Lock overlay for trial-locked stories ────────── */}
//                   {locked && (
//                     <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl z-10 gap-1.5">
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         className="w-7 h-7 text-white/95 drop-shadow"
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2.5"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                       >
//                         <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
//                         <path d="M7 11V7a5 5 0 0 1 10 0v4" />
//                       </svg>
//                       <span className="text-white/90 text-[10px] font-semibold tracking-widest uppercase drop-shadow">
//                         {t('trial.register')}
//                       </span>
//                     </div>
//                   )}
//                   {/* ─────────────────────────────────────────────────────── */}

//                   {/* Top-left badge: number / green check (hidden under lock overlay) */}
//                   {!locked && (
//                     <div
//                       className={`
//                         absolute top-2 left-2 w-7 h-7 rounded-full z-10
//                         flex items-center justify-center shadow-md text-xs font-bold
//                         ${isCompleted ? 'bg-green-500 text-white' : 'bg-white/90 text-black/80'}
//                       `}
//                     >
//                       {isCompleted ? (
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           viewBox="0 0 24 24"
//                           fill="none"
//                           stroke="currentColor"
//                           strokeWidth="3"
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           className="w-4 h-4"
//                         >
//                           <polyline points="20 6 9 17 4 12" />
//                         </svg>
//                       ) : (
//                         level
//                       )}
//                     </div>
//                   )}

//                   {/* ── NEW: FREE badge on trial-accessible stories for guests ── */}
//                   {!user && level <= FREE_TRIAL_STORIES && (
//                     <div className="absolute top-2 right-2 z-10 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow tracking-wide uppercase">
//                       {t('trial.free')}
//                     </div>
//                   )}
//                   {/* ─────────────────────────────────────────────────────── */}
//                 </div>

//                 {/* Title */}
//                 <div
//                   className={`text-sm font-medium leading-tight line-clamp-2 px-0.5 transition-colors ${
//                     locked ? 'text-black/35' : 'text-black/80'
//                   }`}
//                 >
//                   {trackTitle}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* Legend */}
//       <div className="text-center mt-22 animate-fade-in-delay-1">
//         <div className="flex text-xs items-center justify-center gap-4 text-black/80 flex-wrap gap-y-2">
//           <div className="flex items-center gap-2">
//             <div className="w-5 h-5 rounded-full bg-white/90 text-black/80 flex items-center justify-center text-[10px] font-bold shadow-sm ring-1 ring-white/20">
//               1
//             </div>
//             <span>{t('levelProgress.locked')}</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm">
//               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
//                 <polyline points="20 6 9 17 4 12" />
//               </svg>
//             </div>
//             <span>{t('levelProgress.completed')}</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${theme.progressGradient} ring-2 ring-white/80 shadow-sm`} />
//             <span>{t('levelProgress.current')}</span>
//           </div>
//         </div>
//       </div>

//       {/* ── Existing modals ─────────────────────────────────────────────────── */}
//       <CongratsModal
//         isOpen={showCongrats}
//         onClose={handleCloseCongrats}
//         difficulty={difficulty}
//         theme={theme}
//         onNextDifficulty={handleNextDifficulty}
//         hasNextDifficulty={!!navigationState.nextDifficulty}
//       />

//       <StoryPreviewModal
//         isOpen={previewLevel !== null}
//         onClose={handleClosePreview}
//         onStart={handleStartListening}
//         preview={previewData}
//         theme={theme}
//       />

//       {/* Trial gate modal */}
//       {showRegisterPrompt && (
//         <div
//           className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
//           onClick={() => setShowRegisterPrompt(false)}
//         >
//           <div
//             className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in"
//             onClick={(e) => e.stopPropagation()}
//           >
//             {/* Icon */}
//             <div
//               className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.progressGradient} flex items-center justify-center mx-auto mb-5 shadow-lg`}
//             >
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 className="w-8 h-8 text-white"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeWidth="2.5"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               >
//                 <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
//                 <path d="M7 11V7a5 5 0 0 1 10 0v4" />
//               </svg>
//             </div>

//             <h2 className="text-xl font-bold text-gray-900 mb-2">
//               {t('trial.unlockTitle')}
//             </h2>
//             <p className="text-gray-500 text-sm mb-6 leading-relaxed">
//               {t('trial.unlockDescription', { count: FREE_TRIAL_STORIES })}
//             </p>

//             {/* Primary CTA */}
//             <button
//               onClick={() =>
//                 navigate('/signup', {
//                   state: { fromTrial: true, returnTo: location.pathname },
//                 })
//               }
//               className={`w-full py-3 rounded-xl bg-gradient-to-r ${theme.progressGradient} text-white font-semibold mb-3 hover:opacity-90 active:scale-95 transition-all shadow-md`}
//             >
//               {t('trial.createAccount')}
//             </button>

//             {/* Secondary CTA */}
//             <button
//               onClick={() =>
//                 navigate('/login', { state: { returnTo: location.pathname } })
//               }
//               className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 active:scale-95 transition-all mb-4"
//             >
//               {t('trial.login')}
//             </button>

//             {/* Dismiss */}
//             <button
//               onClick={() => setShowRegisterPrompt(false)}
//               className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
//             >
//               {t('trial.maybeLater')}
//             </button>
//           </div>
//         </div>
//       )}
//       {/* ─────────────────────────────────────────────────────────────────── */}
//     </div>
//   );
// };

// export default LevelProgress;