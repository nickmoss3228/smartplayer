// import { Link } from 'react-router';
// import { useState } from 'react';

// const Levels = () => {
//   const [selectedLevel, setSelectedLevel] = useState('easy');

//   const levelStats = {
//     easy: { completed: 85, avgTime: '15 min', stories: 12 },
//     medium: { completed: 60, avgTime: '25 min', stories: 18 },
//     hard: { completed: 30, avgTime: '40 min', stories: 24 }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="text-center mb-12">
//           <h1 className="text-4xl font-bold text-gray-900 mb-4">Learning Dashboard</h1>
//           <p className="text-gray-600 text-lg">Track your progress and choose your next challenge</p>
//         </div>

//         {/* Stats Overview */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
//           {Object.entries(levelStats).map(([level, stats]) => (
//             <div
//               key={level}
//               onClick={() => setSelectedLevel(level)}
//               className={`
//                 bg-white rounded-xl p-6 shadow-lg cursor-pointer transition-all duration-300
//                 ${selectedLevel === level ? 'ring-2 ring-blue-500 shadow-xl' : 'hover:shadow-xl'}
//               `}
//             >
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-xl font-semibold text-gray-900 capitalize">{level}</h3>
//                 <div className={`
//                   w-4 h-4 rounded-full ${
//                     level === 'easy' ? 'bg-green-500' :
//                     level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
//                   }
//                 `}></div>
//               </div>
              
//               <div className="space-y-3">
//                 <div className="flex justify-between text-sm">
//                   <span className="text-gray-600">Completion Rate</span>
//                   <span className="font-semibold">{stats.completed}%</span>
//                 </div>
//                 <div className="w-full bg-gray-200 rounded-full h-2">
//                   <div
//                     className={`h-2 rounded-full ${
//                       level === 'easy' ? 'bg-green-500' :
//                       level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
//                     }`}
//                     style={{ width: `${stats.completed}%` }}
//                   ></div>
//                 </div>
//                 <div className="flex justify-between text-sm text-gray-600">
//                   <span>Avg. Time: {stats.avgTime}</span>
//                   <span>{stats.stories} Stories</span>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Selected Level Details */}
//         <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
//           <div className="grid md:grid-cols-2 gap-8 items-center">
//             <div>
//               <h2 className="text-3xl font-bold text-gray-900 mb-4 capitalize">
//                 {selectedLevel} Level
//               </h2>
//               <p className="text-gray-600 text-lg mb-6">
//                 {selectedLevel === 'easy' && "Perfect for beginners with clear, simple narratives and guided support."}
//                 {selectedLevel === 'medium' && "Balanced challenges with varied themes and moderate complexity."}
//                 {selectedLevel === 'hard' && "Advanced content for experienced listeners seeking maximum challenge."}
//               </p>
              
//               <div className="space-y-4 mb-8">
//                 {[
//                   selectedLevel === 'easy' ? ['🎯 Clear Audio', '📚 Basic Vocabulary', '⏰ Short Sessions'] :
//                   selectedLevel === 'medium' ? ['🌟 Natural Pace', '📖 Rich Content', '⚡ Moderate Length'] :
//                   ['🔥 Complex Stories', '🧠 Advanced Themes', '⏳ Extended Sessions']
//                 ][0].map((feature, index) => (
//                   <div key={index} className="flex items-center text-gray-700">
//                     <span className="mr-3">{feature.split(' ')[0]}</span>
//                     <span>{feature.substring(feature.indexOf(' ') + 1)}</span>
//                   </div>
//                 ))}
//               </div>

//               <Link to={`/levels/${selectedLevel}`}>
//                 <button className={`
//                   px-8 py-4 rounded-xl font-bold text-white shadow-lg
//                   transform hover:scale-105 transition-all duration-300
//                   ${selectedLevel === 'easy' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
//                     selectedLevel === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
//                     'bg-gradient-to-r from-red-500 to-pink-600'}
//                 `}>
//                   Start {selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Challenge
//                 </button>
//               </Link>
//     </div>

//             {/* Visual Progress Circle */}
//             <div className="flex justify-center">
//               <div className="relative w-48 h-48">
//                 <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
//                   {/* Background circle */}
//                   <circle
//                     cx="50"
//                     cy="50"
//                     r="40"
//                     stroke="currentColor"
//                     strokeWidth="8"
//                     fill="transparent"
//                     className="text-gray-200"
//                   />
//                   {/* Progress circle */}
//                   <circle
//                     cx="50"
//                     cy="50"
//                     r="40"
//                     stroke="currentColor"
//                     strokeWidth="8"
//                     fill="transparent"
//                     strokeDasharray={`${2 * Math.PI * 40}`}
//                     strokeDashoffset={`${2 * Math.PI * 40 * (1 - levelStats[selectedLevel].completed / 100)}`}
//                     className={`transition-all duration-1000 ${
//                       selectedLevel === 'easy' ? 'text-green-500' :
//                       selectedLevel === 'medium' ? 'text-yellow-500' : 'text-red-500'
//                     }`}
//                     strokeLinecap="round"
//                   />
//                 </svg>
//                 <div className="absolute inset-0 flex items-center justify-center">
//                   <div className="text-center">
//                     <div className="text-3xl font-bold text-gray-900">
//                       {levelStats[selectedLevel].completed}%
//                     </div>
//                     <div className="text-sm text-gray-600">Complete</div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Quick Actions */}
//         {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <div className="bg-white rounded-xl p-6 shadow-lg text-center">
//             <div className="text-2xl mb-3">📊</div>
//             <h3 className="font-semibold text-gray-900 mb-2">View Progress</h3>
//             <p className="text-gray-600 text-sm">Track your learning journey</p>
//           </div>
          
//           <div className="bg-white rounded-xl p-6 shadow-lg text-center">
//             <div className="text-2xl mb-3">🎧</div>
//             <h3 className="font-semibold text-gray-900 mb-2">Practice Mode</h3>
//             <p className="text-gray-600 text-sm">Repeat challenging sections</p>
//           </div>
          
//           <div className="bg-white rounded-xl p-6 shadow-lg text-center">
//             <div className="text-2xl mb-3">🏆</div>
//             <h3 className="font-semibold text-gray-900 mb-2">Achievements</h3>
//             <p className="text-gray-600 text-sm">Unlock badges and rewards</p>
//           </div>
//         </div> */}
//       </div>
//     </div>
//   );
// };

// export default Levels;

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router';

// const Medium = () => {
//   const navigate = useNavigate();
//   const [hoveredLevel, setHoveredLevel] = useState(null);
  
//   const handleLevelClick = () => {
//     navigate(`/player`);
//   };
  
//   // Positions for each level number - adjusted to follow the winding path shown in the image
//   const levelPositions = {
//     1: { top: '6%', left: '41%' },
//     2: { top: '19%', left: '79%' },
//     3: { top: '25%', left: '18%' },
//     4: { top: '42%', left: '25%' },
//     5: { top: '47%', left: '45%' },
//     6: { top: '58%', left: '80%' },
//     7: { top: '73%', left: '40%' },
//     8: { top: '86%', left: '15%' },
//     9: { top: '93%', left: '55%' },
//     10: { top: '84%', left: '83.5%' }
//   };
  
//   return (
//     <div className="flex justify-center items-center min-h-screen bg-gray-900 p-4">
//       {/* Enhanced Blackboard */}
//       <div className="relative w-[800px] h-[600px] bg-gradient-to-br from-green-900 via-green-800 to-green-900
//                       border-8 border-amber-900/80 rounded-sm shadow-2xl overflow-hidden blackboard-texture">
        
//         {/* Additional chalk dust and wear effects */}
//         <div className="absolute inset-0 bg-white opacity-[0.03]"></div>
//         <div className="absolute top-6 right-8 w-28 h-6 bg-white opacity-[0.05] rounded-full blur-sm"></div>
//         <div className="absolute bottom-8 left-6 w-20 h-4 bg-white opacity-[0.04] rounded-full blur-sm"></div>
//         <div className="absolute top-1/3 left-1/4 w-16 h-3 bg-white opacity-[0.03] rounded-full blur-sm"></div>

//         {/* Enhanced SVG Path - designed to match the winding path */}
//         <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
//           <defs>
//             <filter id="roughPaper">
//               <feTurbulence baseFrequency="0.04" numOctaves="5" result="noise" seed="2"/>
//               <feDisplacementMap in="SourceGraphic" in2="noise" scale="1"/>
//             </filter>
//           </defs>
//           <path
//             d="M300,40 C900,50 750,160 120,150 C30,150 90,250 350,280
//                C950,200 680,350 400,420 C100,480 0,420 130,520
//                C380,580 550,560 680,480"
//             fill="none"
//             stroke="rgb(248 248 242)"
//             strokeWidth="3"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             className="chalk-path"
//             filter="url(#roughPaper)"
//             opacity="0.85"
//           />
//         </svg>
        
//         {/* Enhanced Circle around numbers */}
//         {Object.entries(levelPositions).map(([level, position]) => (
//           <div
//             key={`circle-${level}`}
//             className={`absolute w-16 h-16 rounded-full border-2 transition-all duration-300 chalk-path
//                      ${hoveredLevel === level
//                        ? 'border-[rgb(248_248_242)]/80 shadow-[0_0_25px_rgba(248,248,242,0.4)]'
//                        : 'border-[rgb(248_248_242)]/50'}`}
//             style={{
//               top: `calc(${position.top} - 2rem)`,
//               left: `calc(${position.left} - 2rem)`,
//             }}
//           />
//         ))}
        
//         {/* Enhanced Level Numbers */}
//         {Object.entries(levelPositions).map(([level, position]) => (
//           <div
//             key={level}
//             className="absolute group"
//             style={{
//               top: position.top,
//               left: position.left,
//               transform: 'translate(-50%, -50%)'
//             }}
//           >
//             {/* Enhanced hover circle effect */}
//             <div className={`absolute w-20 h-20 rounded-full transition-all duration-500 -translate-x-1/2 -translate-y-1/2
//                           ${hoveredLevel === level
//                             ? 'bg-[rgb(248_248_242)]/10 shadow-[0_0_30px_rgba(248,248,242,0.3)]'
//                             : 'bg-[rgb(248_248_242)]/0'}`}></div>
            
//             {/* Enhanced level number */}
//             <button
//               onClick={() => handleLevelClick(level)}
//               onMouseEnter={() => setHoveredLevel(level)}
//               onMouseLeave={() => setHoveredLevel(null)}
//               className={`relative text-4xl font-bold cursor-pointer z-10
//                         transition-all duration-300 chalk-text
//                         select-none active:scale-95
//                         ${hoveredLevel === level
//                           ? 'text-[rgb(248_248_242)] scale-110 chalk-number-glow'
//                           : 'text-[rgb(248_248_242)]/90'}`}
//               style={{ fontFamily: 'var(--font-chalk)' }}
//             >
//               {level}
//             </button>
            
//             {/* Add a subtle chalk smudge effect on hover */}
//             <div className={`absolute w-12 h-12 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-700
//                           ${hoveredLevel === level
//                             ? 'bg-[rgb(248_248_242)]/5 blur-none'
//                             : 'bg-[rgb(248_248_242)]/0 blur-sm'}`}></div>
//           </div>
//         ))}
        
//         {/* Enhanced Medium difficulty label */}
//         <div className="absolute bottom-[40%] right-[83%] transform rotate-[-5deg]">
//           <span className="text-[rgb(248_248_242)]/80 text-3xl font-bold chalk-text select-none"
//                 style={{ fontFamily: 'var(--font-chalk)' }}>
//             Medium
//           </span>
//           {/* Subtle underline chalk mark */}
//           <div className="w-20 h-0.5 bg-[rgb(248_248_242)]/60 mt-1 transform rotate-1 chalk-path"></div>
//         </div>
        
//         {/* Additional chalk marks for authenticity */}
//         <div className="absolute top-8 left-8 w-3 h-3 bg-[rgb(248_248_242)]/30 rounded-full blur-sm"></div>
//         <div className="absolute top-12 left-12 w-2 h-8 bg-[rgb(248_248_242)]/20 rounded-full blur-sm transform rotate-12"></div>
        
//         {/* Chalk tray at the bottom */}
//         <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-3
//                        bg-amber-800/60 rounded-sm shadow-inner">
//           <div className="w-16 h-2 bg-[rgb(248_248_242)]/80 rounded-full mt-0.5 ml-2 shadow-sm"></div>
//           <div className="w-8 h-1.5 bg-[rgb(248_248_242)]/60 rounded-full mt-0.5 ml-20 shadow-sm"></div>
//         </div>
        
//         {/* Corner wear marks */}
//         <div className="absolute top-0 right-0 w-8 h-8 bg-[rgb(248_248_242)]/5 rounded-bl-full"></div>
//         <div className="absolute bottom-0 left-0 w-6 h-6 bg-[rgb(248_248_242)]/5 rounded-tr-full"></div>
//       </div>
//     </div>
//   );
// };

// export default Medium

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router';

// const Hard = () => {
//   const navigate = useNavigate();
//   const [hoveredLevel, setHoveredLevel] = useState(null);

//   const handleLevelClick = () => {
//     navigate(`/player`);
//   };

//   // Adjusted positions for each level number to be centered vertically
//   const levelPositions = {
//     1: { top: '17%', left: '13.5%' },      // Top of outer rectangle
//     2: { top: '60%', left: '12%' },       // Left side of outer rectangle
//     3: { top: '89%', left: '30%' },       // Bottom-left of outer rectangle
//     4: { top: '89%', left: '80%' },       // Bottom-right of outer rectangle
//     5: { top: '50%', left: '91.8%' },     // Right side of outer rectangle
//     6: { top: '18%', left: '55%' },       // Top-right of outer rectangle
//     7: { top: '30%', left: '27%' },       // Top of middle rectangle
//     8: { top: '72%', left: '55%' },       // Bottom of middle rectangle
//     9: { top: '50%', left: '65%' },       // Right of middle rectangle
//     10: { top: '50%', left: '50.4%' }     // Center (innermost rectangle)
//   };

//   return (
//     <div className="flex justify-center items-center min-h-screen bg-gray-900 p-4">
//       {/* Enhanced Blackboard */}
//       <div className="relative w-[800px] h-[600px] bg-gradient-to-br from-green-900 via-green-800 to-green-900
//                       border-8 border-amber-900/80 rounded-sm shadow-2xl overflow-hidden blackboard-texture">
        
//         {/* Additional chalk dust and wear effects */}
//         <div className="absolute inset-0 bg-white opacity-[0.03]"></div>
//         <div className="absolute top-10 left-10 w-24 h-5 bg-white opacity-[0.05] rounded-full blur-sm transform rotate-12"></div>
//         <div className="absolute bottom-12 right-12 w-18 h-4 bg-white opacity-[0.04] rounded-full blur-sm transform -rotate-6"></div>
//         <div className="absolute top-2/3 left-1/3 w-14 h-3 bg-white opacity-[0.03] rounded-full blur-sm transform rotate-45"></div>

//         {/* Enhanced SVG Path - adjusted to be centered vertically */}
//         <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
//           <defs>
//             <filter id="roughPaper">
//               <feTurbulence baseFrequency="0.04" numOctaves="5" result="noise" seed="3"/>
//               <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2"/>
//             </filter>
//           </defs>
//           <path
//             d="M80,100 L80,500 L720,500 L720,100 L200,100 M200,100 L200,450 L600,450 L600,150 L300,150 M300,150 L300,400 L500,400 L500,200 L400,200 L400,300"
//             fill="none"
//             stroke="rgb(248 248 242)"
//             strokeWidth="3"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             className="chalk-path"
//             filter="url(#roughPaper)"
//             opacity="0.85"
//           />
//         </svg>

//         {/* Enhanced random chalk smudges */}
//         <div className="absolute top-[35%] right-[15%] w-8 h-1 bg-[rgb(248_248_242)]/30 transform rotate-12 blur-sm chalk-path"></div>
//         <div className="absolute bottom-[25%] left-[35%] w-4 h-1 bg-[rgb(248_248_242)]/25 transform -rotate-6 blur-sm chalk-path"></div>
//         <div className="absolute top-[65%] right-[35%] w-6 h-1 bg-[rgb(248_248_242)]/30 transform rotate-45 blur-sm chalk-path"></div>
//         <div className="absolute top-[45%] left-[20%] w-3 h-1 bg-[rgb(248_248_242)]/20 transform rotate-90 blur-sm chalk-path"></div>
//         <div className="absolute bottom-[40%] right-[25%] w-5 h-1 bg-[rgb(248_248_242)]/25 transform -rotate-12 blur-sm chalk-path"></div>

//         {/* Enhanced Level Numbers with Hover Effects */}
//         {Object.entries(levelPositions).map(([level, position]) => (
//           <div
//             key={level}
//             className="absolute group"
//             style={{
//               top: position.top,
//               left: position.left,
//               transform: 'translate(-50%, -50%)'
//             }}
//           >
//             {/* Enhanced hover circle effect */}
//             <div className={`absolute w-20 h-20 rounded-full transition-all duration-500 -translate-x-1/2 -translate-y-1/2
//                           ${hoveredLevel === level
//                             ? 'bg-[rgb(248_248_242)]/10 shadow-[0_0_30px_rgba(248,248,242,0.3)]'
//                             : 'bg-[rgb(248_248_242)]/0'}`}></div>
            
//             {/* Enhanced circle border */}
//             <div className={`absolute w-16 h-16 rounded-full border-2 transition-all duration-300 chalk-path
//                           -translate-x-1/2 -translate-y-1/2
//                           ${hoveredLevel === level
//                             ? 'border-[rgb(248_248_242)]/80 shadow-[0_0_25px_rgba(248,248,242,0.4)]'
//                             : 'border-[rgb(248_248_242)]/50'}`}></div>
            
//             {/* Enhanced level number */}
//             <button
//               onClick={() => handleLevelClick(level)}
//               onMouseEnter={() => setHoveredLevel(level)}
//               onMouseLeave={() => setHoveredLevel(null)}
//               className={`relative text-4xl font-bold cursor-pointer z-10
//                         transition-all duration-300 chalk-text
//                         select-none active:scale-95
//                         ${hoveredLevel === level
//                           ? 'text-[rgb(248_248_242)] scale-110 chalk-number-glow'
//                           : 'text-[rgb(248_248_242)]/90'}`}
//               style={{ fontFamily: 'var(--font-chalk)' }}
//             >
//               {level}
//             </button>
            
//             {/* Add a subtle chalk smudge effect on hover */}
//             <div className={`absolute w-12 h-12 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-700
//                           ${hoveredLevel === level
//                             ? 'bg-[rgb(248_248_242)]/5 blur-none'
//                             : 'bg-[rgb(248_248_242)]/0 blur-sm'}`}></div>
//           </div>
//         ))}

//         {/* Enhanced "Final" text in bottom right */}
//         <div className="absolute bottom-4 right-6">
//           <span className="text-[rgb(248_248_242)]/80 text-2xl font-bold italic chalk-text select-none"
//                 style={{ fontFamily: 'var(--font-chalk)' }}>
//             Final
//           </span>
//           {/* Decorative chalk underline */}
//           <div className="w-12 h-0.5 bg-[rgb(248_248_242)]/50 mt-1 transform rotate-1 chalk-path"></div>
//           {/* Small decorative dot */}
//           <div className="absolute -right-2 -top-1 w-1 h-1 bg-[rgb(248_248_242)]/60 rounded-full"></div>
//         </div>

//         {/* Hard difficulty label (top left) */}
//         <div className="absolute top-4 left-6 transform -rotate-2">
//           <span className="text-[rgb(248_248_242)]/70 text-3xl font-bold chalk-text select-none"
//                 style={{ fontFamily: 'var(--font-chalk)' }}>
//             Hard
//           </span>
//           {/* Emphasis underline */}
//           <div className="w-16 h-0.5 bg-[rgb(248_248_242)]/60 mt-1 transform rotate-2 chalk-path"></div>
//           <div className="w-12 h-0.5 bg-[rgb(248_248_242)]/40 mt-0.5 ml-2 transform -rotate-1 chalk-path"></div>
//         </div>
        
//         {/* Additional maze-like chalk marks for complexity theme */}
//         <div className="absolute top-16 right-20 w-2 h-8 bg-[rgb(248_248_242)]/20 transform rotate-12 blur-sm"></div>
//         <div className="absolute top-20 right-16 w-8 h-2 bg-[rgb(248_248_242)]/20 transform -rotate-12 blur-sm"></div>
//         <div className="absolute bottom-16 left-16 w-2 h-6 bg-[rgb(248_248_242)]/25 transform rotate-45 blur-sm"></div>
//         <div className="absolute bottom-20 left-20 w-6 h-2 bg-[rgb(248_248_242)]/25 transform -rotate-45 blur-sm"></div>
        
//         {/* Chalk tray at the bottom with used chalk pieces */}
//         <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-36 h-3
//                        bg-amber-800/60 rounded-sm shadow-inner">
//           <div className="w-14 h-2 bg-[rgb(248_248_242)]/80 rounded-full mt-0.5 ml-2 shadow-sm"></div>
//           <div className="w-8 h-1.5 bg-[rgb(248_248_242)]/60 rounded-full mt-0.5 ml-18 shadow-sm"></div>
//           <div className="w-6 h-1.5 bg-[rgb(248_248_242)]/70 rounded-full mt-0.5 ml-26 shadow-sm"></div>
//         </div>
        
//         {/* Corner wear marks - more worn due to "hard" usage */}
//         <div className="absolute top-0 right-0 w-10 h-10 bg-[rgb(248_248_242)]/6 rounded-bl-full"></div>
//         <div className="absolute top-0 left-0 w-8 h-8 bg-[rgb(248_248_242)]/5 rounded-br-full"></div>
//         <div className="absolute bottom-0 left-0 w-8 h-8 bg-[rgb(248_248_242)]/5 rounded-tr-full"></div>
//         <div className="absolute bottom-0 right-0 w-6 h-6 bg-[rgb(248_248_242)]/4 rounded-tl-full"></div>

//         {/* Extra wear spots for "hard" theme */}
//         <div className="absolute top-1/4 left-3 w-4 h-4 bg-[rgb(248_248_242)]/3 rounded-full blur-sm"></div>
//         <div className="absolute bottom-1/4 right-3 w-3 h-3 bg-[rgb(248_248_242)]/4 rounded-full blur-sm"></div>
//       </div>
//     </div>
//   );
// };

// export default Hard;

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

// import React, { useState } from 'react';
// import axios from 'axios';

// const LoginForm = () => {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [token, setToken] = useState(null);
//   const [cabinetData, setCabinetData] = useState(null);

//   const handleLogin = async () => {
//     try {
//       const response = await axios.post('http://localhost:5000/login', { username, password });
//       setToken(response.data.token);
//       alert('Login successful!');
//     } catch (error) {
//       const errorMessage = error.response ? error.response.data.message : error.message;
//     alert('Login failed: ' + errorMessage);
//     }
//   };

//   const getCabinet = async () => {
//     if (!token) return alert('Please login first');
//     try {
//       const response = await axios.get('http://localhost:5000/cabinet', {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setCabinetData(response.data);
//     } catch (error) {
//       const errorMessage = error.response ? error.response.data.message : error.message;
//     alert('Error: ' + errorMessage);
//     }
//   };

//   return (
//     <div>
//       <h2>Login</h2>
//       <input type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} />
//       <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
//       <button onClick={handleLogin}>Login</button>

//       <h2>Cabinet</h2>
//       <button onClick={getCabinet}>Get Cabinet Data</button>
//       {cabinetData && <pre>{JSON.stringify(cabinetData, null, 2)}</pre>}
//     </div>
//   );
// };

// export default LoginForm;