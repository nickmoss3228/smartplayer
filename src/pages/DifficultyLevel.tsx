// import React from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useProgress } from '..context/ProgressContext.tsx';

// const DifficultyLevel = ({ difficulty }) => {
//   const navigate = useNavigate();
//   const { [difficulty]: levelData, completeLevel } = useProgress();
  
//   const { completedLevels, currentLevel, totalLevels } = levelData;
  
//   const difficultyConfig = {
//     easy: {
//       title: 'Easy Level',
//       gradient: 'from-green-900 via-emerald-900 to-teal-800',
//       completedColor: 'from-green-400 to-green-600',
//       currentColor: 'from-blue-400 to-blue-600',
//       borderCompleted: 'border-green-300',
//       borderCurrent: 'border-blue-300'
//     },
//     medium: {
//       title: 'Medium Level',
//       gradient: 'from-orange-900 via-red-900 to-pink-800',
//       completedColor: 'from-orange-400 to-orange-600',
//       currentColor: 'from-yellow-400 to-yellow-600',
//       borderCompleted: 'border-orange-300',
//       borderCurrent: 'border-yellow-300'
//     },
//     hard: {
//       title: 'Hard Level',
//       gradient: 'from-purple-900 via-indigo-900 to-blue-800',
//       completedColor: 'from-purple-400 to-purple-600',
//       currentColor: 'from-red-400 to-red-600',
//       borderCompleted: 'border-purple-300',
//       borderCurrent: 'border-red-300'
//     }
//   };

//   const config = difficultyConfig[difficulty];
  
//   const handleLevelClick = (level) => {
//     if (level <= currentLevel) {
//       navigate(`/player?difficulty=${difficulty}&level=${level}`);
//     }
//   };
  
//   const getLevelStatus = (level) => {
//     if (completedLevels.includes(level)) return 'completed';
//     if (level === currentLevel) return 'current';
//     if (level < currentLevel) return 'available';
//     return 'locked';
//   };
  
//   const getLevelStyles = (level) => {
//     const status = getLevelStatus(level);
    
//     switch (status) {
//       case 'completed':
//         return `bg-gradient-to-br ${config.completedColor} text-white shadow-lg transform hover:scale-105 cursor-pointer border-2 ${config.borderCompleted}`;
//       case 'current':
//         return `bg-gradient-to-br ${config.currentColor} text-white shadow-lg transform hover:scale-105 cursor-pointer border-2 ${config.borderCurrent} animate-pulse`;
//       case 'available':
//         return 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 shadow-md transform hover:scale-105 cursor-pointer border-2 border-gray-200';
//       default:
//         return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-100';
//     }
//   };
  
//   const getLevelIcon = (level) => {
//     const status = getLevelStatus(level);
    
//     switch (status) {
//       case 'completed':
//         return '✓';
//       case 'current':
//         return '▶';
//       case 'locked':
//         return '🔒';
//       default:
//         return level;
//     }
//   };
  
//   return (
//     <div className={`min-h-screen bg-gradient-to-br ${config.gradient} p-8`}>
//       <div className="max-w-4xl mx-auto">
//         {/* Header */}
//         <div className="text-center mb-12">
//           <h1 className="text-4xl font-bold text-white mb-4">{config.title} Progress</h1>
//           <div className="flex items-center justify-center space-x-4 text-white/80">
//             <div className="flex items-center space-x-2">
//               <div className="w-4 h-4 bg-green-500 rounded"></div>
//               <span>Completed</span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <div className="w-4 h-4 bg-blue-500 rounded animate-pulse"></div>
//               <span>Current</span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <div className="w-4 h-4 bg-gray-400 rounded"></div>
//               <span>Locked</span>
//             </div>
//           </div>
//         </div>
        
//         {/* Progress Overview */}
//         <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="text-xl font-semibold text-white">Overall Progress</h2>
//             <span className="text-white/80">{completedLevels.length}/{totalLevels} Completed</span>
//           </div>
//           <div className="w-full bg-white/20 rounded-full h-3">
//             <div 
//               className={`bg-gradient-to-r ${config.completedColor} h-3 rounded-full transition-all duration-500`}
//               style={{ width: `${(completedLevels.length / totalLevels) * 100}%` }}
//             ></div>
//           </div>
//         </div>
        
//         {/* Level Grid */}
//         <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
//           {[...Array(totalLevels)].map((_, index) => {
//             const level = index + 1;
//             return (
//               <div
//                 key={level}
//                 onClick={() => handleLevelClick(level)}
//                 className={`
//                   relative aspect-square rounded-2xl flex flex-col items-center justify-center
//                   transition-all duration-300 ${getLevelStyles(level)}
//                 `}
//               >
//                 {/* Level icon/number */}
//                 <div className="text-3xl font-bold mb-2">
//                   {getLevelIcon(level)}
//                 </div>
                
//                 {/* Level label */}
//                 <div className="text-sm font-medium">
//                   Level {level}
//                 </div>
                
//                 {/* Completion badge */}
//                 {completedLevels.includes(level) && (
//                   <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
//                     <span className="text-yellow-900 text-lg">★</span>
//                   </div>
//                 )}
                
//                 {/* Current level indicator */}
//                 {level === currentLevel && (
//                   <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
//                     <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
        
//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
//           <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
//             <div className="text-3xl font-bold text-green-400 mb-2">{completedLevels.length}</div>
//             <div className="text-white/80">Levels Completed</div>
//           </div>
//           <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
//             <div className="text-3xl font-bold text-blue-400 mb-2">{totalLevels - currentLevel + 1}</div>
//             <div className="text-white/80">Levels Remaining</div>
//           </div>
//           <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
//             <div className="text-3xl font-bold text-purple-400 mb-2">{Math.round((completedLevels.length / totalLevels) * 100)}%</div>
//             <div className="text-white/80">Progress</div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DifficultyLevel;