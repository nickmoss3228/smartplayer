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


// import { Link } from 'react-router';
// import { useState, useEffect } from 'react';

// const Levels = () => {
//   const [selectedLevel, setSelectedLevel] = useState(null);
//   const [isVisible,  setIsVisible] = useState(false);

//   useEffect(() => {
//     setIsVisible(true);
//   }, []);

//   const levels = [
//     {
//       id: 'easy',
//       title: 'ROOKIE',
//       subtitle: 'Easy Mode',
//       features: ['Clear Audio', 'Simple Vocabulary', 'Guided Experience'],
//       color: 'green',
//       gradient: 'from-green-500 to-emerald-600',
//       glowColor: 'shadow-green-500/50'
//     },
//     {
//       id: 'medium',
//       title: 'WARRIOR',
//       subtitle: 'Medium Mode',
//       features: ['Moderate Pace', 'Mixed Themes', 'Balanced Challenge'],
//       color: 'yellow',
//       gradient: 'from-yellow-500 to-orange-600',
//       glowColor: 'shadow-yellow-500/50'
//     },
//     {
//       id: 'hard',
//       title: 'LEGEND',
//       subtitle: 'Hard Mode',
//       features: ['Complex Stories', 'Fast Pace', 'Expert Level'],
//       color: 'red',
//       gradient: 'from-red-500 to-purple-600',
//       glowColor: 'shadow-red-500/50'
//     }
//   ];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
//       {/* Animated Background */}
//       {/* <div className="absolute inset-0">
//         {[...Array(50)].map((_, i) => (
//           <div
//             key={i}
//             className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
//             style={{
//               left: `${Math.random() * 100}%`,
//               top: `${Math.random() * 100}%`,
//               animationDelay: `${Math.random() * 3}s`
//             }}
//           ></div>
//         ))}
//       </div> */}

//       <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
//         {/* Header */}
//         <div className={`text-center mb-12 transform transition-all duration-1000 ${
//           isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
//         }`}>
//           <h1 className="text-6xl font-bold text-white mb-4 tracking-wider">
//             SELECT <span className="text-green-400">DIFFICULTY</span>
//           </h1>
//           <p className="text-xl text-gray-300 max-w-2xl mx-auto">
//             Choose your path and prove your listening mastery
//           </p>
//         </div>

//         {/* Level Selection */}
//         <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full">
//           {levels.map((level, index) => (
//             <div
//               key={level.id}
//               className={`transform transition-all duration-700 ${
//                 isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
//               }`}
//               style={{ transitionDelay: `${index * 200}ms` }}
//             >
//               <Link to={`/levels/${level.id}`}>
//                 <div
//                   onMouseEnter={() => setSelectedLevel(level.id)}
//                   onMouseLeave={() => setSelectedLevel(null)}
//                   className={`
//                     relative group cursor-pointer
//                     bg-gray-800/50 backdrop-blur-sm border border-gray-700
//                     rounded-2xl p-8 hover:scale-105 transition-all duration-300
//                     ${selectedLevel === level.id ? `${level.glowColor} shadow-2xl scale-105` : 'shadow-xl'}
//                   `}
//                 >
//                   {/* Level Badge */}
//                   <div className={`
//                     absolute -top-4 left-1/2 transform -translate-x-1/2
//                     px-6 py-2 bg-gradient-to-r ${level.gradient} rounded-full
//                     text-white font-bold text-sm tracking-wide
//                   `}>
//                     LEVEL {index + 1}
//                   </div>

//                   {/* Title */}
//                   <div className="text-center mt-6 mb-6">
//                     <h3 className="text-3xl font-bold text-white mb-2 tracking-wider">
//                       {level.title}
//                     </h3>
//                     <p className="text-gray-400 text-lg">{level.subtitle}</p>
//                   </div>

//                   {/* Features */}
//                   <div className="space-y-3 mb-8">
//                     {level.features.map((feature, i) => (
//                       <div key={i} className="flex items-center text-gray-300">
//                         <div className={`w-2 h-2 bg-gradient-to-r ${level.gradient} rounded-full mr-3`}></div>
//                         {feature}
//                       </div>
//                     ))}
//                   </div>

//                   {/* Action Button */}
//                   <div className={`
//                     w-full py-4 bg-gradient-to-r ${level.gradient}
//                     text-white font-bold text-center rounded-xl
//                     transform group-hover:scale-105 transition-all duration-300
//                     group-hover:shadow-lg
//                   `}>
//                     ENTER MISSION
//                   </div>

//                   {/* Glow Effect */}
//                   <div className={`
//                     absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
//                     bg-gradient-to-r ${level.gradient} blur-xl -z-10
//                     transition-opacity duration-300
//                   `}></div>
//                 </div>
//               </Link>
//             </div>
//           ))}
//         </div>

//         {/* Stats Bar */}
//         {/* <div className={`mt-12 flex space-x-8 transform transition-all duration-1000 delay-500 ${
//           isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
//         }`}>
//           {['🏆 Achievements', '📊 Progress', '⚡ Streak'].map((stat, i) => (
//             <div key={i} className="text-center">
//               <div className="text-2xl text-white mb-1">{stat.split(' ')[0]}</div>
//               <div className="text-gray-400 text-sm">{stat.split(' ')[1]}</div>
//             </div>
//           ))}
//         </div> */}
//       </div>
//     </div>
//   );
// };

// export default Levels;





//wavesurfer - progressBar.tsx

// import React, {
//   useEffect,
//   useRef,
//   useState,
//   useMemo,
//   useCallback,
// } from "react";
// import WaveSurfer from "wavesurfer.js";
// import { FaVolumeHigh } from "react-icons/fa6";
// import { FaVolumeMute } from "react-icons/fa";
// import { IoPause, IoPlay, IoRepeat, IoArrowForward } from "react-icons/io5";
// import { WaveformPlayerProps } from "../types";
// import {
//   WaveformContainer,
//   HoverEffect,
//   Button,
//   TimeLabel,
//   VolumeControl,
//   VolumeIcon,
//   VolumeSlider,
//   ControlsContainer,
//   SubtitlesContainer,
//   SubtitleText,
//   SubtitlesButton,
//   TimeMarkersContainer,
//   TimeMarkerLine,
//   TimeMarkerLabel,
//   PlayModeContainer,
//   PlayModeToggle,
//   NavigationControls,
//   NavButton,
//   DropdownContainer,
//   VolumeSpeedContainer,
//   DropdownButton,
//   DropdownItem,
//   DropdownMenu,
// } from "../styledComponents";

// import { useAppSelector, useAppDispatch } from "../hooks/hooks";
// import {
//   setCurrentMarkerIndex,
//   setIsPlaying,
//   setVolume,
//   setIsMuted,
//   setPlaybackRate,
//   setSubtitlesVisible,
//   setIsPlayMode,
//   setCurrentTime,
//   setDurationSeconds,
//   setDuration,
//   setActiveSubtitle,
// } from "../store/playerslice";

// const formatTime = (time: number) => {
//   if (!isFinite(time)) return "0:00";

//   const minutes = Math.floor(time / 60);
//   const seconds = Math.floor(time % 60);
//   return `${minutes}:${seconds.toString().padStart(2, "0")}`;
// };

// interface WaveSurferRef {
//   current: WaveSurfer | null;
// }

// const WaveformPlayer: React.FC<WaveformPlayerProps> = React.memo(
//   ({ audioUrl, subtitles, timeMarkers, onWavesurferMount }) => {
//     const waveformRef = useRef<HTMLDivElement>(null);
//     const wavesurfer: WaveSurferRef = useRef(null);
//     const playbackRates: number[] = [0.85, 0.9, 1.0, 1.1, 1.2];

//     // Simplified state management
//     const [isInitialized, setIsInitialized] = useState(false);
//     const intervalRef = useRef<any | null>(null);

//     const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);

//     const dispatch = useAppDispatch();

//     const {
//       currentMarkerIndex,
//       isPlaying,
//       volume,
//       isMuted,
//       playbackRate,
//       subtitlesVisible,
//       isPlayMode,
//       currentTime,
//       durationSeconds,
//       duration,
//       activeSubtitle,
//     } = useAppSelector((state) => state.player);

//     // Helper function to get current segment bounds
//     const getCurrentSegmentBounds = useCallback(() => {
//       if (!timeMarkers?.length || currentMarkerIndex < 0) {
//         return { start: 0, end: durationSeconds || Infinity };
//       }
//       const currentMarker = timeMarkers[currentMarkerIndex];
//       const nextMarker = timeMarkers[currentMarkerIndex + 1];

//       const start =
//         typeof currentMarker === "object" ? currentMarker.time : currentMarker;
//       const end = nextMarker
//         ? typeof nextMarker === "object"
//           ? nextMarker.time
//           : nextMarker
//         : durationSeconds || Infinity;

//       return { start, end };
//     }, [timeMarkers, currentMarkerIndex, durationSeconds]);

//     // Мемоизируем функцию обновления активного субтитра
//     const updateActiveSubtitle = useCallback(
//       (currentTimeValue: number) => {
//         if (!subtitles?.length) {
//           dispatch(setActiveSubtitle(""));
//           return;
//         }

//         const currentSubtitle = subtitles.find(
//           (sub) =>
//             currentTimeValue >= sub.startTime && currentTimeValue <= sub.endTime
//         );
//         dispatch(
//           setActiveSubtitle(currentSubtitle ? currentSubtitle.text : "")
//         );
//       },
//       [subtitles, dispatch]
//     );

//     // Update current marker based on time
//     const updateCurrentMarkerIndex = useCallback(
//       (currentTimeValue: number) => {
//         if (!timeMarkers?.length || !isPlayMode) return;

//         // Don't update if we're very close to stopping
//         const { end } = getCurrentSegmentBounds();
//         if (currentTimeValue >= end - 0.1) return;

//         const newIndex = timeMarkers.findIndex((marker, index) => {
//           const currentMarkerTime =
//             typeof marker === "object" ? marker.time : marker;
//           let nextMarkerTime: number;

//           if (index < timeMarkers.length - 1) {
//             const nextMarker = timeMarkers[index + 1];
//             nextMarkerTime =
//               typeof nextMarker === "object" ? nextMarker.time : nextMarker;
//           } else {
//             nextMarkerTime = durationSeconds || Infinity;
//           }

//           return (
//             currentTimeValue >= currentMarkerTime &&
//             currentTimeValue < nextMarkerTime
//           );
//         });

//         if (newIndex >= 0 && newIndex !== currentMarkerIndex) {
//           dispatch(setCurrentMarkerIndex(newIndex));
//         }
//       },
//       [timeMarkers, isPlayMode, durationSeconds, currentMarkerIndex, dispatch]
//     );

//     // Remove the existing interval useEffect and replace with:
//     useEffect(() => {
//       if (!wavesurfer.current || !isInitialized) return;

//       const instance = wavesurfer.current;
//       let animationFrame: number;

//       const updateProgress = () => {
//         if (!instance) return;

//         const currentTimeValue = instance.getCurrentTime();
//         dispatch(setCurrentTime(formatTime(currentTimeValue)));
//         updateActiveSubtitle(currentTimeValue);

//         // Handle stopping BEFORE updating marker index
//         if (isPlayMode && timeMarkers?.length) {
//           const { end } = getCurrentSegmentBounds();

//           // More precise stopping with smaller threshold
//           if (currentTimeValue >= end - 0.02) {
//             instance.pause();
//             // Ensure we don't update marker index after stopping
//             if (isPlaying) {
//               animationFrame = requestAnimationFrame(updateProgress);
//             }
//             return;
//           }
//         }

//         // Update marker index only if we're not stopping
//         updateCurrentMarkerIndex(currentTimeValue);

//         if (isPlaying) {
//           animationFrame = requestAnimationFrame(updateProgress);
//         }
//       };

//       if (isPlaying) {
//         animationFrame = requestAnimationFrame(updateProgress);
//       }

//       return () => {
//         if (animationFrame) {
//           cancelAnimationFrame(animationFrame);
//         }
//       };
//     }, [
//       isPlaying,
//       isInitialized,
//       isPlayMode,
//       getCurrentSegmentBounds,
//       updateActiveSubtitle,
//       updateCurrentMarkerIndex,
//       dispatch,
//     ]);

//     // Main WaveSurfer initialization
//     useEffect(() => {
//       if (!waveformRef.current || !audioUrl) return;

//       console.log("Initializing wavesurfer");

//       // Clean up existing instance
//       if (wavesurfer.current) {
//         wavesurfer.current.destroy();
//       }

//       wavesurfer.current = WaveSurfer.create({
//         container: waveformRef.current,
//         waveColor: "#8cef7eff",
//         progressColor: "#3caa3c",
//         cursorColor: "#45a049",
//         barWidth: 4,
//         barRadius: 3,
//         cursorWidth: 3,
//         height: 100,
//         barGap: 2,
//         normalize: true,
//         fillParent: true,
//         mediaControls: false,
//         hideScrollbar: true,
//         interact: true,
//       });

//       const instance = wavesurfer.current;

//       // Event handlers
//       instance.on("ready", () => {
//         console.log("WaveSurfer ready");
//         instance.setVolume(isMuted ? 0 : volume);
//         instance.setPlaybackRate(playbackRate);

//         const totalDuration = instance.getDuration();
//         dispatch(setDurationSeconds(totalDuration));
//         dispatch(setDuration(formatTime(totalDuration)));

//         setIsInitialized(true);

//         if (onWavesurferMount) {
//           onWavesurferMount(instance);
//         }
//       });

//       instance.on("play", () => {
//         console.log("WaveSurfer play event");
//         dispatch(setIsPlaying(true));
//       });

//       instance.on("pause", () => {
//         console.log("WaveSurfer pause event");
//         dispatch(setIsPlaying(false));
//       });

//       instance.on("finish", () => {
//         console.log("WaveSurfer finish event");
//         dispatch(setIsPlaying(false));
//       });

//       instance.on("error", (error) => {
//         console.error("WaveSurfer error:", error);
//         dispatch(setIsPlaying(false));
//       });

//       // Hover effect
//       const handlePointerMove = (e: PointerEvent) => {
//         const hover = waveformRef.current?.querySelector(
//           "#hover"
//         ) as HTMLElement;
//         if (hover && e instanceof PointerEvent) {
//           hover.style.width = `${e.offsetX}px`;
//         }
//       };

//       waveformRef.current.addEventListener("pointermove", handlePointerMove);

//       // Load audio
//       instance.load(audioUrl);

//       return () => {
//         if (intervalRef.current) {
//           clearInterval(intervalRef.current);
//         }
//         waveformRef.current?.removeEventListener(
//           "pointermove",
//           handlePointerMove
//         );
//         if (instance) {
//           instance.unAll();
//           instance.destroy();
//         }
//         setIsInitialized(false);
//       };
//     }, [audioUrl]); // Only depend on audioUrl

//     // Memoize the handlers
//     const handlePlayPause = useCallback(() => {
//       if (!wavesurfer.current || !isInitialized) {
//         console.log("WaveSurfer not ready");
//         return;
//       }
//       try {
//         if (isPlaying) {
//           wavesurfer.current.pause();
//         } else {
//           // In sentence mode, check if we need to go to segment start
//           if (isPlayMode) {
//             const currentTime = wavesurfer.current.getCurrentTime();
//             const { start, end } = getCurrentSegmentBounds();

//             // If we're outside the current segment or at the end, go to start
//             if (currentTime < start || currentTime >= end - 0.05) {
//               wavesurfer.current.setTime(start);
//             }
//           }
//           wavesurfer.current.play();
//         }
//       } catch (error) {
//         console.error("Playback error:", error);
//         dispatch(setIsPlaying(false));
//       }
//     }, [
//       isPlaying,
//       isInitialized,
//       isPlayMode,
//       getCurrentSegmentBounds,
//       dispatch,
//     ]);

//     // Navigation functions
//     const goToNextSentence = useCallback(() => {
//       if (
//         !timeMarkers?.length ||
//         currentMarkerIndex >= timeMarkers.length - 1 ||
//         !wavesurfer.current ||
//         !isPlayMode
//       ) {
//         return;
//       }

//       const nextIndex = currentMarkerIndex + 1;
//       const nextMarker = timeMarkers[nextIndex];
//       const nextTime =
//         typeof nextMarker === "object" ? nextMarker.time : nextMarker;

//       dispatch(setCurrentMarkerIndex(nextIndex));
//       wavesurfer.current.setTime(nextTime);
//       wavesurfer.current.play();
//     }, [isPlayMode, timeMarkers, currentMarkerIndex, dispatch]);

//     const togglePlayMode = useCallback(() => {
//       const wasPlaying = isPlaying;

//       if (wasPlaying) {
//         wavesurfer.current?.pause();
//       }

//       const newPlayMode = !isPlayMode;
//       dispatch(setIsPlayMode(newPlayMode));

//       // If enabling sentence mode, go to appropriate segment
//       if (newPlayMode && timeMarkers?.length && wavesurfer.current) {
//         const currentTime = wavesurfer.current.getCurrentTime();

//         let markerIndex = 0;
//         for (let i = 0; i < timeMarkers.length; i++) {
//           const markerTime = (
//             typeof timeMarkers[i] === "object"
//               ? (timeMarkers[i] as { time: number }).time
//               : timeMarkers[i]
//           ) as number;
//           if (currentTime >= markerTime) {
//             markerIndex = i;
//           } else {
//             break;
//           }
//         }

//         dispatch(setCurrentMarkerIndex(markerIndex));
//         const marker = timeMarkers[markerIndex];
//         const markerTime = typeof marker === "object" ? marker.time : marker;
//         wavesurfer.current.setTime(markerTime);
//       }
//     }, [isPlaying, isPlayMode, timeMarkers, dispatch]);

//     const handleMuteToggle = useCallback(() => {
//       const newMutedState = !isMuted;
//       dispatch(setIsMuted(newMutedState));
//       wavesurfer.current?.setVolume(newMutedState ? 0 : volume);
//     }, [isPlayMode, isMuted, volume, dispatch]);

//     // click on the window to close the dropdown
//     useEffect(() => {
//       const handleClickOutside = (event: MouseEvent) => {
//         if (
//           event.target instanceof Element &&
//           !event.target.closest(".speed-dropdown")
//         ) {
//           setIsSpeedDropdownOpen(false);
//         }
//       };

//       document.addEventListener("mousedown", handleClickOutside);
//       return () =>
//         document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     const changePlaybackRate = useCallback(
//       (rate: number) => {
//         dispatch(setPlaybackRate(rate));
//         wavesurfer.current?.setPlaybackRate(rate);
//       },
//       [dispatch]
//     );

//     // Create dropdown render function
//     const renderSpeedDropdown = useMemo(
//       () => (
//         <DropdownContainer className="speed-dropdown">
//           <DropdownButton
//             onClick={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}
//           >
//             {playbackRate}x
//           </DropdownButton>
//           <DropdownMenu $isOpen={isSpeedDropdownOpen}>
//             {playbackRates.map((speed) => (
//               <DropdownItem
//                 key={speed}
//                 $active={playbackRate === speed}
//                 onClick={() => {
//                   changePlaybackRate(speed);
//                   setIsSpeedDropdownOpen(false);
//                 }}
//               >
//                 {speed}x
//               </DropdownItem>
//             ))}
//           </DropdownMenu>
//         </DropdownContainer>
//       ),
//       [playbackRate, isSpeedDropdownOpen, changePlaybackRate]
//     );

//     const replayCurrentSentence = useCallback(() => {
//       if (!timeMarkers?.length || !wavesurfer.current || !isPlayMode) return;

//       // Always use the current marker index, don't recalculate
//       const markerIndex = Math.max(0, currentMarkerIndex);
//       const currentMarker = timeMarkers[markerIndex];
//       const start =
//         typeof currentMarker === "object" ? currentMarker.time : currentMarker;

//       console.log(
//         `Replaying sentence ${markerIndex + 1} starting at ${start}s`
//       );

//       wavesurfer.current.setTime(start);
//       // Small delay to ensure setTime completes
//       setTimeout(() => {
//         wavesurfer.current?.play();
//       }, 10);

//       clearTimeout(intervalRef.current);
//     }, [isPlayMode, timeMarkers, currentMarkerIndex]);

//     const handleVolumeChange = useCallback(
//       (e: React.ChangeEvent<HTMLInputElement>) => {
//         const newVolume = parseFloat(e.target.value);
//         dispatch(setVolume(newVolume));
//         dispatch(setIsMuted(newVolume === 0));
//         wavesurfer.current?.setVolume(newVolume);
//       },
//       [dispatch]
//     );

//     const toggleSubtitles = useCallback(() => {
//       dispatch(setSubtitlesVisible(!subtitlesVisible));
//     }, [subtitlesVisible, dispatch]);

//     const handleMarkerClick = useCallback(
//       async (time: number) => {
//         if (!wavesurfer.current) return;

//         try {
//           // In sentence mode we upadte currentMarkerIndex
//           if (isPlayMode) {
//             const markerIndex = timeMarkers.findIndex((marker, index) => {
//               const markerTime =
//                 typeof marker === "object" ? marker.time : marker;
//               const nextMarker = timeMarkers[index + 1];
//               const nextTime = nextMarker
//                 ? typeof nextMarker === "object"
//                   ? nextMarker.time
//                   : nextMarker
//                 : durationSeconds;

//               return time >= markerTime && time < nextTime;
//             });

//             if (markerIndex >= 0) {
//               dispatch(setCurrentMarkerIndex(markerIndex));
//             }
//           }

//           wavesurfer.current.seekTo(time / durationSeconds);
//           await new Promise((resolve) => setTimeout(resolve, 50));
//           await wavesurfer.current.play();
//           dispatch(setIsPlaying(true));
//         } catch (error) {
//           console.error("Error in handleMarkerClick:", error);
//           dispatch(setIsPlaying(false));
//         }
//       },
//       [durationSeconds, dispatch, isPlayMode, timeMarkers]
//     );

//     // Memoize the markers
//     const renderTimeMarkers = useCallback(() => {
//       if (durationSeconds === 0) return null;

//       return (
//         <TimeMarkersContainer>
//           {timeMarkers.map((marker, index) => {
//             const position = (marker.time / durationSeconds) * 100;

//             return (
//               <TimeMarkerLine
//                 key={index}
//                 $position={position}
//                 color={marker.color}
//                 onClick={() => handleMarkerClick(marker.time)}
//                 title={`Jump to ${marker.label}`}
//               >
//                 <TimeMarkerLabel>{marker.label}</TimeMarkerLabel>
//               </TimeMarkerLine>
//             );
//           })}
//         </TimeMarkersContainer>
//       );
//     }, [durationSeconds, timeMarkers, handleMarkerClick]);

//     // add the shortcut key bindings
//     useEffect(() => {
//       const handleKeyPress = (e: KeyboardEvent) => {
//         switch (e.code) {
//           case "Space":
//             e.preventDefault();
//             handlePlayPause();
//             break;
//           case "ArrowRight":
//             if (isPlayMode) goToNextSentence();
//             break;
//           case "KeyR":
//             if (isPlayMode) replayCurrentSentence();
//             break;
//         }
//       };

//       window.addEventListener("keydown", handleKeyPress);
//       return () => window.removeEventListener("keydown", handleKeyPress);
//     }, [handlePlayPause, goToNextSentence, replayCurrentSentence, isPlayMode]);

//     return (
//       <div className="waveform-overlay">
//         <WaveformContainer ref={waveformRef}>
//           <HoverEffect id="hover" />
//           <TimeLabel id="time">{currentTime}</TimeLabel>
//           <TimeLabel id="duration">{duration}</TimeLabel>
//           {renderTimeMarkers()}
//         </WaveformContainer>

//         <SubtitlesContainer $visible={subtitlesVisible}>
//           <SubtitleText>{activeSubtitle}</SubtitleText>
//         </SubtitlesContainer>

//         <ControlsContainer>
//           {/* 1. Sentence Mode (maintains space) */}
//           <PlayModeContainer>
//             <PlayModeToggle $active={isPlayMode} onClick={togglePlayMode}>
//               Sentence Mode: {isPlayMode ? "ON" : "OFF"}
//             </PlayModeToggle>
//             <NavigationControls>
//               <NavButton disabled={!isPlayMode} onClick={replayCurrentSentence}>
//                 <IoRepeat style={{ fontSize: "24px" }} />
//               </NavButton>
//               <NavButton disabled={!isPlayMode} onClick={goToNextSentence}>
//                 <IoArrowForward style={{ fontSize: "24px" }} />
//               </NavButton>
//             </NavigationControls>
//           </PlayModeContainer>

//           {/* 2. Play/Pause Button in the middle */}
//           <Button onClick={handlePlayPause}>
//             {isPlaying ? (
//               <IoPause
//                 style={{
//                   fontSize: "30px",
//                   width: "60px",
//                   height: "60px",
//                   borderRadius: "30px",
//                 }}
//               />
//             ) : (
//               <IoPlay
//                 style={{
//                   fontSize: "30px",
//                   width: "60px",
//                   height: "60px",
//                   borderRadius: "30px",
//                 }}
//               />
//             )}
//           </Button>

//           {/* 3. Volume and Speed Controls */}
//           <VolumeSpeedContainer>
//             <VolumeControl>
//               <VolumeIcon onClick={handleMuteToggle}>
//                 {isMuted ? (
//                   <FaVolumeMute size={24} />
//                 ) : (
//                   <FaVolumeHigh size={24} />
//                 )}
//               </VolumeIcon>
//               <VolumeSlider
//                 type="range"
//                 min="0"
//                 max="1"
//                 step="0.01"
//                 value={isMuted ? 0 : volume}
//                 onChange={handleVolumeChange}
//               />
//             </VolumeControl>

//             {renderSpeedDropdown}
//           </VolumeSpeedContainer>

//           {/* 4. Subtitles Button */}
//           <SubtitlesButton onClick={toggleSubtitles} $active={subtitlesVisible}>
//             CC
//           </SubtitlesButton>
//         </ControlsContainer>
//       </div>
//     );
//   }
// );
// WaveformPlayer.displayName = "WaveformPlayer";

// export default WaveformPlayer;






























// import React, { useCallback } from "react";
// import { WaveformPlayerProps } from "../types";
// import {
//   WaveformContainer,
//   HoverEffect,
//   TimeLabel,
//   SubtitlesContainer,
//   SubtitleText,
// } from "../styledComponents";

// import { useAppSelector, useAppDispatch } from "../hooks/hooks";
// import { setSubtitlesVisible } from "../store/playerslice";

// // Custom hooks
// import { useWaveSurfer } from "../hooks/useWavesurfer";
// import { usePlayerControls } from "../hooks/usePlayerControls";
// import { useTimeTracking } from "../hooks/useTimeTracking";
// import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

// // Components
// import { TimeMarkers } from "../components/Timemarkers.tsx"
// import { PlayerControls } from "../components/PlayerControls.tsx";

// const WaveformPlayer: React.FC<WaveformPlayerProps> = React.memo(
//   ({ audioUrl, subtitles, timeMarkers, onWavesurferMount }) => {
//     const dispatch = useAppDispatch();
    
//     const {
//       subtitlesVisible,
//       isPlaying,
//       isPlayMode,
//       currentTime,
//       duration,
//       activeSubtitle,
//       durationSeconds
//     } = useAppSelector((state) => state.player);

//     // Custom hooks
//     const { waveformRef, wavesurfer, isInitialized } = useWaveSurfer(audioUrl, onWavesurferMount);
//     const {
//       handlePlayPause,
//       goToNextSentence,
//       replayCurrentSentence,
//       togglePlayMode,
//       getCurrentSegmentBounds
//     } = usePlayerControls(wavesurfer, isInitialized);
    
//     useTimeTracking(wavesurfer, isInitialized, getCurrentSegmentBounds);
//     useKeyboardShortcuts({
//       handlePlayPause,
//       goToNextSentence,
//       replayCurrentSentence,
//       isPlayMode
//     });

//     const toggleSubtitles = useCallback(() => {
//       dispatch(setSubtitlesVisible(!subtitlesVisible));
//     }, [subtitlesVisible, dispatch]);

//     // Hover effect handler
//     const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
//       const hover = waveformRef.current?.querySelector("#hover") as HTMLElement;
//       if (hover) {
//         hover.style.width = `${e.nativeEvent.offsetX}px`;
//       }
//     }, []);

//     return (
//       <div className="waveform-overlay">
//         <WaveformContainer ref={waveformRef} onPointerMove={handlePointerMove}>
//           <HoverEffect id="hover" />
//           <TimeLabel id="time">{currentTime}</TimeLabel>
//           <TimeLabel id="duration">{duration}</TimeLabel>
          
//           {timeMarkers && (
//             <TimeMarkers
//               timeMarkers={timeMarkers}
//               durationSeconds={durationSeconds}
//               wavesurfer={wavesurfer}
//             />
//           )}
//         </WaveformContainer>

//         <SubtitlesContainer $visible={subtitlesVisible}>
//           <SubtitleText>{activeSubtitle}</SubtitleText>
//         </SubtitlesContainer>

//         <PlayerControls
//           isPlaying={isPlaying}
//           isPlayMode={isPlayMode}
//           subtitlesVisible={subtitlesVisible}
//           handlePlayPause={handlePlayPause}
//           togglePlayMode={togglePlayMode}
//           replayCurrentSentence={replayCurrentSentence}
//           goToNextSentence={goToNextSentence}
//           toggleSubtitles={toggleSubtitles}
//         />
//       </div>
//     );
//   }
// );

// WaveformPlayer.displayName = "WaveformPlayer";

// export default WaveformPlayer;

// debug menu
{
  /* <div className="track-selector">
          <label htmlFor="track-select">Select Audio Track: </label>
          <select
            id="track-select"
            value={selectedTrackId}
            onChange={handleTrackChange}
          >
            {audioTracks.map(track => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
        </div> */
}


// //Easy level Audios

// import { AudioTrack } from "../types";

// export const audioTracks: AudioTrack[] = [
//   {
//     id: "1",
//     title: "Leo's Life",
//     audio: Leoslife,
//     subtitles: [...]
//       { startTime: 0.1, endTime: 1, text: "Meet Leo." },
//       { startTime: 1.3, endTime: 3.3, text: "Leo is a happy young man." },
//       { startTime: 4, endTime: 5.5, text: "He is 26 years old." },
//       {
//         startTime: 6.2,
//         endTime: 9,
//         text: "He lives in a small flat with his cat, Ginger.",
//       },
//       { startTime: 9.8, endTime: 11.2, text: "He works at a local shop." },
//       {
//         startTime: 11.8,
//         endTime: 15.5,
//         text: "He loves his job because he meets many friendly people every day.",
//       },
//       {
//         startTime: 16.2,
//         endTime: 24.5,
//         text: "Leo enjoys simple things, like walking in the park, listening to music, and drinking warm tea in the evening. ",
//       },
//       {
//         startTime: 25.2,
//         endTime: 29,
//         text: "He always has a smile on his face and likes to help others.",
//       },
//       { startTime: 29.6, endTime: 32, text: "People say Leo is very kind." },
//       {
//         startTime: 32.6,
//         endTime: 36,
//         text: "He has a lot of friends and he sees them every weekend.",
//       },
//       {
//         startTime: 36.7,
//         endTime: 41.5,
//         text: "The story of Leo starts in a small town named Neverland, ",
//       },
//       {
//         startTime: 41.8,
//         endTime: 45.7,
//         text: "where he was born and lives today.",
//       },
//       { startTime: 46, endTime: 48, text: "And here is his story…" },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 1.5, label: "2", color: "red" },
//       { time: 4, label: "3", color: "red" },
//       { time: 6.1, label: "4", color: "red" },
//       { time: 9.7, label: "5", color: "red" },
//       { time: 11.8, label: "6", color: "red" },
//       { time: 16, label: "7", color: "red" },
//       { time: 24.8, label: "8", color: "red" },
//       { time: 29.4, label: "9", color: "red" },
//       { time: 32.5, label: "10", color: "red" },
//       { time: 36.6, label: "11", color: "red" },
//       { time: 45.8, label: "12", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "How old is Leo?",
//         options: [
//           "24 years old",
//           "26 years old",
//           "28 years old",
//           "25 years old",
//         ],
//         correctAnswer: 1,
//         referenceTime: 4,
//       },
//       {
//         question: "What is the name of Leo's cat?",
//         options: ["Tiger", "Ginger", "Fluffy", "Shadow"],
//         correctAnswer: 1,
//         referenceTime: 8,
//       },
//       {
//         question: "Where does Leo work?",
//         options: [
//           "At a restaurant",
//           "At a local shop",
//           "At a bank",
//           "At a school",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What is the name of the town where Leo lives?",
//         options: ["Wonderland", "Neverland", "Fairyland", "Dreamland"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo enjoy doing in his free time?",
//         options: [
//           "Playing video games",
//           "Walking in the park and listening to music",
//           "Watching movies",
//           "Reading books",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//     ],
//   },
//   {
//     id: "2",
//     title: "Leo's Mornings",
//     audio: Leosmornings,
//     subtitles: [
//       { startTime: 0.1, endTime: 2.7, text: "2. Leo's mornings." },
//       {
//         startTime: 3,
//         endTime: 6.2,
//         text: "Every morning, Leo wakes up at six o'clock. ",
//       },
//       {
//         startTime: 6.6,
//         endTime: 10.8,
//         text: "First, he gets out of bed, goes to the kitchen and makes a cup of tea. ",
//       },
//       {
//         startTime: 11.2,
//         endTime: 15,
//         text: "While his tea cools down, he feeds Ginger, his cat. ",
//       },
//       {
//         startTime: 15.4,
//         endTime: 19.8,
//         text: "After that, Leo eats breakfast, usually toast with jam.",
//       },
//       {
//         startTime: 20.3,
//         endTime: 24.3,
//         text: "Then, he brushes his teeth and gets dressed for work at the shop. ",
//       },
//       { startTime: 24.7, endTime: 27, text: "He wears a shirt and trousers." },
//       {
//         startTime: 27.6,
//         endTime: 31,
//         text: "Before he leaves, he always says goodbye to Ginger.",
//       },
//       {
//         startTime: 31.6,
//         endTime: 35.4,
//         text: "He enjoys his quiet mornings before the busy day starts",
//       },
//       {
//         startTime: 36,
//         endTime: 39.7,
//         text: "But, one day, the morning didn’t go as planned.",
//       },
//       {
//         startTime: 40.3,
//         endTime: 45,
//         text: "On one summer Monday morning he woke up late and he didn’t have breakfast. ",
//       },
//       {
//         startTime: 45.6,
//         endTime: 51,
//         text: "Then, he forgot to feed his cat, Ginger, and even didn’t wear his lucky socks. ",
//       },
//       {
//         startTime: 51.4,
//         endTime: 56.2,
//         text: "The car didn’t start, so he had to walk to the bus stop.",
//       },
//       {
//         startTime: 56.7,
//         endTime: 64.1,
//         text: "At work, the boss told him that he was very upset about the progress he had at work.",
//       },
//       {
//         startTime: 64.5,
//         endTime: 72.1,
//         text: "At the end of the day, he came back home and watched his favorite TV show about animals.",
//       },
//       { startTime: 72.5, endTime: 74.5, text: "He wanted to relax." },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3, label: "2", color: "red" },
//       { time: 6.5, label: "3", color: "red" },
//       { time: 11.1, label: "4", color: "red" },
//       { time: 15.5, label: "5", color: "red" },
//       { time: 20.1, label: "6", color: "red" },
//       { time: 24.5, label: "7", color: "red" },
//       { time: 27.5, label: "8", color: "red" },
//       { time: 31.6, label: "9", color: "red" },
//       { time: 35.5, label: "10", color: "red" },
//       { time: 40, label: "11", color: "red" },
//       { time: 45, label: "12", color: "red" },
//       { time: 51.7, label: "13", color: "red" },
//       { time: 56.5, label: "14", color: "red" },
//       { time: 64.3, label: "15", color: "red" },
//       { time: 72.4, label: "16", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What time does Leo wake up every morning?",
//         options: [
//           "Five o'clock",
//           "Six o'clock",
//           "Seven o'clock",
//           "Eight o'clock",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo do first when he wakes up?",
//         options: [
//           "Takes a shower",
//           "Makes a cup of tea",
//           "Feeds his cat",
//           "Brushes his teeth",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo usually eat for breakfast?",
//         options: [
//           "Cereal with milk",
//           "Toast with jam",
//           "Eggs and bacon",
//           "Pancakes",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What happened on the bad morning?",
//         options: [
//           "He overslept and missed breakfast",
//           "He got sick",
//           "His car broke down",
//           "He forgot his keys",
//         ],
//         correctAnswer: 0,
//         referenceTime: 0,
//       },
//       {
//         question: "How did Leo get to work on the bad day?",
//         options: [
//           "He drove his car",
//           "He walked to the bus stop",
//           "He called a taxi",
//           "His friend gave him a ride",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//     ],
//   },
//   {
//     id: "3",
//     title: "Leo's Favorite Food",
//     audio: Leosfavoritefood,
//     subtitles: [
//       { startTime: 0.1, endTime: 3.2, text: "3. Leo's favorite food." },
//       { startTime: 3.5, endTime: 4.8, text: "Leo loves to eat." },
//       { startTime: 5.1, endTime: 7, text: "His favorite food is pizza." },
//       {
//         startTime: 7.4,
//         endTime: 10.3,
//         text: "He likes pizza with lots of cheese and tomatoes.",
//       },
//       {
//         startTime: 10.8,
//         endTime: 14.4,
//         text: "Sometimes, on his day off, he makes pizza at home. ",
//       },
//       {
//         startTime: 14.8,
//         endTime: 17.7,
//         text: "He buys fresh dough from the bakery where he works.",
//       },
//       {
//         startTime: 18,
//         endTime: 20.4,
//         text: "He also likes his mother’s apple pie.",
//       },
//       { startTime: 20.8, endTime: 22.5, text: "She makes it every Sunday." },
//       {
//         startTime: 23.2,
//         endTime: 26.2,
//         text: "Leo thinks his mother is the best cook in the world.",
//       },
//       {
//         startTime: 26.7,
//         endTime: 31,
//         text: "He also enjoys simple snacks like apples and bananas.",
//       },
//       {
//         startTime: 31.5,
//         endTime: 37,
//         text: "He says eating good food makes him feel happy and full of energy for the day.",
//       },
//       {
//         startTime: 37.7,
//         endTime: 42,
//         text: "Sometimes, when he is at home – he makes lasagna –",
//       },
//       {
//         startTime: 42.8,
//         endTime: 46.7,
//         text: "– his cat Ginger really likes this meal.",
//       },
//       { startTime: 47.5, endTime: 50, text: "He is trying to eat healthily," },
//       {
//         startTime: 50.6,
//         endTime: 55,
//         text: "but because of his work, it’s hard to do. ",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3.3, label: "2", color: "red" },
//       { time: 5.3, label: "3", color: "red" },
//       { time: 7.5, label: "4", color: "red" },
//       { time: 10.8, label: "5", color: "red" },
//       { time: 14.8, label: "6", color: "red" },
//       { time: 18, label: "7", color: "red" },
//       { time: 20.8, label: "8", color: "red" },
//       { time: 23, label: "9", color: "red" },
//       { time: 26.7, label: "10", color: "red" },
//       { time: 31.3, label: "11", color: "red" },
//       { time: 37.6, label: "12", color: "red" },
//       { time: 47.4, label: "13", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What is Leo's favorite food?",
//         options: ["Pasta", "Pizza", "Burgers", "Sandwiches"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What toppings does Leo like on his pizza?",
//         options: [
//           "Cheese and pepperoni",
//           "Cheese and tomatoes",
//           "Mushrooms and ham",
//           "Vegetables only",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "Where does Leo buy fresh dough?",
//         options: [
//           "From the supermarket",
//           "From the bakery where he works",
//           "From his neighbor",
//           "He makes it himself",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo's mother make every Sunday?",
//         options: ["Chocolate cake", "Apple pie", "Cookies", "Bread"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "Which meal does Leo's cat Ginger really like?",
//         options: ["Pizza", "Apple pie", "Lasagna", "Sandwiches"],
//         correctAnswer: 2,
//         referenceTime: 0,
//       },
//     ],
//   },
//   {
//     id: "4",
//     title: "Leo's Family",
//     audio: Leosfamily,
//     subtitles: [
//       { startTime: 0.1, endTime: 3.4, text: "4. Leo’s Family" },
//       {
//         startTime: 3.4,
//         endTime: 6.2,
//         text: "Now, let’s talk about Leo’s family. ",
//       },
//       {
//         startTime: 6.6,
//         endTime: 8.8,
//         text: "Leo has a small and loving family. ",
//       },
//       {
//         startTime: 9,
//         endTime: 12.6,
//         text: "He lives alone with his cat, but his parents live in a town nearby. ",
//       },
//       {
//         startTime: 13,
//         endTime: 18.3,
//         text: "His mother, Anna, is a teacher, and his father, Mark, is an engineer. ",
//       },
//       { startTime: 18.6, endTime: 21, text: "Leo visits them every weekend. " },
//       {
//         startTime: 21.3,
//         endTime: 24,
//         text: "He also has an older sister named Mia.",
//       },
//       {
//         startTime: 24.4,
//         endTime: 27.2,
//         text: "Mia is a doctor and lives in a big city, ",
//       },
//       {
//         startTime: 27.4,
//         endTime: 30,
//         text: "so Leo doesn't see her very often",
//       },
//       {
//         startTime: 30.3,
//         endTime: 32.6,
//         text: "but they talk on the phone every week. ",
//       },
//       {
//         startTime: 32.9,
//         endTime: 35.4,
//         text: "Leo loves his family very much. ",
//       },
//       {
//         startTime: 35.8,
//         endTime: 40.2,
//         text: "They always support each other and have fun when they are together. ",
//       },
//       {
//         startTime: 41,
//         endTime: 44,
//         text: "Sometimes, they go on a trip together,",
//       },
//       {
//         startTime: 44.2,
//         endTime: 47.2,
//         text: "visiting the nature and camping on a lake. ",
//       },
//       {
//         startTime: 47.6,
//         endTime: 51,
//         text: "Leo has a very good relationship with his dad,",
//       },
//       {
//         startTime: 51.2,
//         endTime: 57,
//         text: "they often go fishing together, and sometimes even watch football live. ",
//       },
//       {
//         startTime: 57.8,
//         endTime: 61,
//         text: "And what about Leo’s personal life? ",
//       },
//       {
//         startTime: 62,
//         endTime: 66.5,
//         text: "Well, Leo is currently looking for a girlfriend,",
//       },
//       {
//         startTime: 66.9,
//         endTime: 70.5,
//         text: "he wants to build a strong and happy family, ",
//       },
//       {
//         startTime: 70.9,
//         endTime: 76,
//         text: "and we hope he will find a girl of his dreams, of course!",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3.2, label: "2", color: "red" },
//       { time: 6.4, label: "3", color: "red" },
//       { time: 8.7, label: "4", color: "red" },
//       { time: 13.1, label: "5", color: "red" },
//       { time: 18.5, label: "6", color: "red" },
//       { time: 21.2, label: "7", color: "red" },
//       { time: 24.4, label: "8", color: "red" },
//       { time: 32.7, label: "9", color: "red" },
//       { time: 35.6, label: "10", color: "red" },
//       { time: 41, label: "11", color: "red" },
//       { time: 47.5, label: "12", color: "red" },
//       { time: 57.8, label: "13", color: "red" },
//       { time: 61.6, label: "14", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What is Leo's mother's job?",
//         options: ["Doctor", "Teacher", "Engineer", "Nurse"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What is Leo's father's name?",
//         options: ["Mike", "Mark", "Matt", "Max"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What is Leo's sister's name and profession?",
//         options: [
//           "Anna, teacher",
//           "Mia, doctor",
//           "Lisa, engineer",
//           "Sara, nurse",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "How often does Leo visit his parents?",
//         options: ["Every day", "Every weekend", "Once a month", "Twice a week"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo do with his father?",
//         options: [
//           "Play tennis and cook",
//           "Go fishing and watch football",
//           "Go shopping and travel",
//           "Play games and read",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//     ],
//   },
//   {
//     id: "5",
//     title: "Leo's Clothes",
//     audio: Leosclothes,
//     subtitles: [
//       { startTime: 0.1, endTime: 3, text: "5. Leo’s Clothes" },
//       {
//         startTime: 3.5,
//         endTime: 6,
//         text: "Leo isn’t a person who follows the current trends",
//       },
//       {
//         startTime: 6.5,
//         endTime: 10,
//         text: "or what is popular to and fashionable to wear.",
//       },
//       {
//         startTime: 10.5,
//         endTime: 12.5,
//         text: "He likes to wear comfortable clothes.",
//       },
//       {
//         startTime: 13.3,
//         endTime: 15,
//         text: "When he is not working at the bakery,",
//       },
//       {
//         startTime: 15.4,
//         endTime: 18,
//         text: "he usually wears jeans and a T-shirt.",
//       },
//       {
//         startTime: 18.4,
//         endTime: 21.1,
//         text: "His favorite T-shirt is a blue one,",
//       },
//       {
//         startTime: 21.4,
//         endTime: 23.3,
//         text: "without any pictures or prints.",
//       },
//       {
//         startTime: 23.8,
//         endTime: 28.5,
//         text: "In winter, he wears a warm woolen sweater that his grandmother made for him.",
//       },
//       { startTime: 28.8, endTime: 30, text: "It's very cozy!" },
//       {
//         startTime: 30.6,
//         endTime: 33.6,
//         text: "And when he is at home, he likes wearing the shorts ",
//       },
//       {
//         startTime: 33.7,
//         endTime: 39.5,
//         text: "and sometimes pyjamas – which is very childish, but still, cozy. ",
//       },
//       {
//         startTime: 39.9,
//         endTime: 42.6,
//         text: "For work, he has his bakery uniform:",
//       },
//       {
//         startTime: 42.8,
//         endTime: 47,
//         text: "a white shirt, black trousers, and his special apron.",
//       },
//       {
//         startTime: 47.4,
//         endTime: 50,
//         text: "Leo thinks it's important to be neat and tidy, ",
//       },
//       {
//         startTime: 50.3,
//         endTime: 54.2,
//         text: "but comfort is most important for his everyday outfits. ",
//       },
//       {
//         startTime: 54.5,
//         endTime: 58,
//         text: "He doesn't like shopping for clothes very much.",
//       },
//       {
//         startTime: 58.5,
//         endTime: 61.6,
//         text: "He thinks that men shouldn’t waste money on clothes ",
//       },
//       {
//         startTime: 61.8,
//         endTime: 67.6,
//         text: "because only women love buying different clothes of different styles.",
//       },
//       { startTime: 68, endTime: 69.4, text: "Well, Leo " },
//       {
//         startTime: 69.8,
//         endTime: 73.2,
//         text: "– maybe that is why you don’t have a girlfriend?",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3.4, label: "2", color: "red" },
//       { time: 10.4, label: "3", color: "red" },
//       { time: 13.2, label: "4", color: "red" },
//       { time: 18.3, label: "5", color: "red" },
//       { time: 23.7, label: "6", color: "red" },
//       { time: 28.9, label: "7", color: "red" },
//       { time: 30.6, label: "8", color: "red" },
//       { time: 39.8, label: "9", color: "red" },
//       { time: 47.5, label: "10", color: "red" },
//       { time: 54.5, label: "11", color: "red" },
//       { time: 58.3, label: "12", color: "red" },
//       { time: 67.8, label: "13", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What does Leo usually wear when he's not working?",
//         options: [
//           "Suits and ties",
//           "Jeans and a T-shirt",
//           "Shorts and sandals",
//           "Sweaters and pants",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What color is Leo's favorite T-shirt?",
//         options: ["Red", "Blue", "Green", "Black"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "Who made Leo's warm woolen sweater?",
//         options: [
//           "His mother",
//           "His grandmother",
//           "His sister",
//           "He bought it",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo wear for work?",
//         options: [
//           "Casual clothes",
//           "White shirt, black trousers, and apron",
//           "Uniform with logo",
//           "Just an apron",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo think about clothes shopping?",
//         options: [
//           "He loves it",
//           "He doesn't like it very much",
//           "He does it often",
//           "He thinks it's fun",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//     ],
//   },
//   {
//     id: "6",
//     title: "A day at the Beach",
//     audio: Adayatthebeach,
//     subtitles: [
//       { startTime: 0.1, endTime: 3, text: "6. A day at the beach." },
//       {
//         startTime: 3.2,
//         endTime: 6.8,
//         text: "Now, let’s go deep inside Leo’s memory ",
//       },
//       {
//         startTime: 7,
//         endTime: 10.4,
//         text: "and follow his remarkable story about a day at the beach.",
//       },
//       {
//         startTime: 10.6,
//         endTime: 13.7,
//         text: "Leo remembers a special day from his childhood. ",
//       },
//       { startTime: 14.5, endTime: 16, text: "When he was ten years old, " },
//       { startTime: 16.4, endTime: 18, text: "his family went to the beach." },
//       { startTime: 18.4, endTime: 20.3, text: "It was a very sunny day. " },
//       {
//         startTime: 20.6,
//         endTime: 25.1,
//         text: "Leo played in the sand and built a big castle with his sister, Mia.  ",
//       },
//       {
//         startTime: 25.6,
//         endTime: 28.4,
//         text: "Then, his father decided to teach Leo",
//       },
//       { startTime: 28.5, endTime: 30, text: "how to swim in the sea." },
//       {
//         startTime: 30.8,
//         endTime: 32.8,
//         text: "Suddenly, when they were swimming ",
//       },
//       { startTime: 33.2, endTime: 35, text: " – they saw a shark!" },
//       {
//         startTime: 35.6,
//         endTime: 38.4,
//         text: "Everybody started to swim quickly to the shore,",
//       },
//       {
//         startTime: 38.7,
//         endTime: 42.8,
//         text: "and because of the stress – Leo quickly started to swim ",
//       },
//       {
//         startTime: 43.1,
//         endTime: 46,
//         text: "– even though he couldn’t do it before!",
//       },
//       {
//         startTime: 46.5,
//         endTime: 50.2,
//         text: "I guess, Leo was so scared that he taught himself ",
//       },
//       {
//         startTime: 50.3,
//         endTime: 53,
//         text: "how to swim – thanks to the shark. ",
//       },
//       {
//         startTime: 53.7,
//         endTime: 56.5,
//         text: "Leo’s dad still remembers this moment ",
//       },
//       {
//         startTime: 56.8,
//         endTime: 61.4,
//         text: "and sometimes reminds of this moment to Leo.",
//       },
//       {
//         startTime: 62,
//         endTime: 66.7,
//         text: "He still thinks about that scary day at the beach.",
//       },
//       { startTime: 67, endTime: 72, text: "And now Leo can swim very well," },
//       {
//         startTime: 72.3,
//         endTime: 78,
//         text: "one time he even crossed the river while swimming!",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3, label: "2", color: "red" },
//       { time: 11, label: "3", color: "red" },
//       { time: 14.4, label: "4", color: "red" },
//       { time: 18.4, label: "5", color: "red" },
//       { time: 20.6, label: "6", color: "red" },
//       { time: 25.5, label: "7", color: "red" },
//       { time: 30.8, label: "8", color: "red" },
//       { time: 35.3, label: "9", color: "red" },
//       { time: 46.5, label: "10", color: "red" },
//       { time: 53.7, label: "11", color: "red" },
//       { time: 62, label: "12", color: "red" },
//       { time: 67.4, label: "13", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "How old was Leo when his family went to the beach?",
//         options: [
//           "Eight years old",
//           "Ten years old",
//           "Twelve years old",
//           "Nine years old",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What did Leo build on the beach with his sister?",
//         options: ["A sand house", "A big castle", "A sand sculpture", "A fort"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What did Leo's father want to teach him?",
//         options: [
//           "How to surf",
//           "How to swim in the sea",
//           "How to fish",
//           "How to sail",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What did they see while swimming?",
//         options: ["A dolphin", "A shark", "A whale", "A big fish"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "How did Leo learn to swim?",
//         options: [
//           "His father taught him slowly",
//           "He was scared by the shark and learned quickly",
//           "He took swimming lessons",
//           "His sister helped him",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//     ],
//   },

//   {
//     id: "7",
//     title: "A country Leo wants to visit",
//     audio: Acountry,
//     subtitles: [
//       { startTime: 0.1, endTime: 4, text: "7. A Country Leo Wants to Visit" },
//       {
//         startTime: 4.3,
//         endTime: 7,
//         text: "Well, if you followed Leo’s story ",
//       },
//       {
//         startTime: 7.2,
//         endTime: 10.3,
//         text: "– you know he doesn’t like spending money very much.",
//       },
//       {
//         startTime: 10.6,
//         endTime: 13.3,
//         text: "But he has many places he would love to visit.",
//       },
//       {
//         startTime: 14,
//         endTime: 16.6,
//         text: "He dreams of visiting Italy one day. ",
//       },
//       {
//         startTime: 17.1,
//         endTime: 21.3,
//         text: "He has seen many pictures of Italy in books and on television. ",
//       },
//       {
//         startTime: 21.9,
//         endTime: 24.4,
//         text: "He wants to see the old buildings in Rome ",
//       },
//       {
//         startTime: 24.6,
//         endTime: 26.7,
//         text: "and ride a gondola in Venice. ",
//       },
//       {
//         startTime: 27.3,
//         endTime: 31.5,
//         text: "Leo loves Italian food, especially pizza and pasta,",
//       },
//       {
//         startTime: 31.8,
//         endTime: 35.3,
//         text: "so he wants to try authentic Italian dishes. ",
//       },
//       {
//         startTime: 36,
//         endTime: 38.6,
//         text: "He imagines walking through sunny streets, ",
//       },
//       { startTime: 38.8, endTime: 40.8, text: "eating delicious gelato," },
//       {
//         startTime: 41.1,
//         endTime: 43.4,
//         text: "and listening to Italian music.",
//       },
//       {
//         startTime: 44.2,
//         endTime: 47.2,
//         text: "He is saving a little money each month for his trip.",
//       },
//       {
//         startTime: 47.5,
//         endTime: 50.6,
//         text: "He hopes his dream will come true soon. ",
//       },
//       {
//         startTime: 51.4,
//         endTime: 55,
//         text: "One of his friends offered Leo to travel with him to France,",
//       },
//       { startTime: 55.3, endTime: 58, text: "but Leo says he hates France." },
//       {
//         startTime: 58.4,
//         endTime: 63.6,
//         text: "He says it is a dirty and very dangerous country.",
//       },
//       {
//         startTime: 64,
//         endTime: 67.8,
//         text: "We don’t know why Leo hates France so much, ",
//       },
//       {
//         startTime: 68.2,
//         endTime: 74,
//         text: "maybe it is because he has a French car which breaks every month. ",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 4, label: "2", color: "red" },
//       { time: 10.6, label: "3", color: "red" },
//       { time: 14, label: "4", color: "red" },
//       { time: 17, label: "5", color: "red" },
//       { time: 21.6, label: "6", color: "red" },
//       { time: 27.2, label: "7", color: "red" },
//       { time: 35.7, label: "8", color: "red" },
//       { time: 44, label: "9", color: "red" },
//       { time: 47.4, label: "10", color: "red" },
//       { time: 51.3, label: "11", color: "red" },
//       { time: 58.4, label: "12", color: "red" },
//       { time: 63.7, label: "13", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "Which country does Leo dream of visiting?",
//         options: ["France", "Italy", "Spain", "Germany"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo want to see in Rome?",
//         options: [
//           "Museums",
//           "The old buildings",
//           "Modern architecture",
//           "Shopping centers",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo want to do in Venice?",
//         options: [
//           "Take photos",
//           "Ride a gondola",
//           "Visit churches",
//           "Go shopping",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "How does Leo save money for his trip?",
//         options: [
//           "He works overtime",
//           "He saves a little each month",
//           "He borrows from family",
//           "He doesn't save money",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What does Leo say about France?",
//         options: [
//           "He loves it",
//           "He hates it",
//           "He wants to visit it",
//           "He's been there",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//     ],
//   },
//   {
//     id: "8",
//     title: "Leo's hobbies",
//     audio: Leoshobbies,
//     subtitles: [
//       { startTime: 0.1, endTime: 2.5, text: "8. Leo’s hobbies " },
//       {
//         startTime: 2.7,
//         endTime: 7.2,
//         text: "Now let’s look into Leo’s hobbies and free time activities.",
//       },
//       { startTime: 7.6, endTime: 10, text: "Leo is a big fan of sports" },
//       {
//         startTime: 10.2,
//         endTime: 13.5,
//         text: "– he likes watching and playing different kinds of sports. ",
//       },
//       {
//         startTime: 14,
//         endTime: 16.8,
//         text: "He and his family are very sporty people. ",
//       },
//       {
//         startTime: 17.2,
//         endTime: 21.6,
//         text: "As we said before, Leo and his father Mark love football ",
//       },
//       {
//         startTime: 21.9,
//         endTime: 24.5,
//         text: "– their favorite team is Manchester United. ",
//       },
//       {
//         startTime: 25.3,
//         endTime: 29.9,
//         text: "Leo even owns a real T-Shirt of Manchester United’s attacker Ronaldo ",
//       },
//       {
//         startTime: 30,
//         endTime: 33.3,
//         text: "which his sister gifted him on his birthday.",
//       },
//       { startTime: 34, endTime: 35.6, text: "Every day after work " },
//       {
//         startTime: 36,
//         endTime: 38.6,
//         text: "– Leo goes to play football on the sports field ",
//       },
//       { startTime: 38.8, endTime: 41, text: "in Neverland Sports Center. " },
//       {
//         startTime: 41.4,
//         endTime: 45.7,
//         text: "He says it helps him to relax after a stressful day",
//       },
//       { startTime: 46.3, endTime: 48.2, text: "– and play with his friends." },
//       {
//         startTime: 49,
//         endTime: 52.3,
//         text: "Another hobby that Leo likes doing in his free time",
//       },
//       {
//         startTime: 52.5,
//         endTime: 56,
//         text: "is watching TV series about crime and drama. ",
//       },
//       {
//         startTime: 56.7,
//         endTime: 59.6,
//         text: "He’s watching Breaking Bad at the moment ",
//       },
//       { startTime: 60, endTime: 62, text: "– his favorite one." },
//       {
//         startTime: 62.3,
//         endTime: 65.2,
//         text: "He says that watching shows with friends ",
//       },
//       {
//         startTime: 65.5,
//         endTime: 69,
//         text: "and talking about them is very fun. ",
//       },
//       {
//         startTime: 69.7,
//         endTime: 73.3,
//         text: "He has a big collection of DVD discs ",
//       },
//       {
//         startTime: 73.6,
//         endTime: 78,
//         text: "with many classic movies of 70s and 80s.",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 2.8, label: "2", color: "red" },
//       { time: 7.7, label: "3", color: "red" },
//       { time: 13.8, label: "4", color: "red" },
//       { time: 17.3, label: "5", color: "red" },
//       { time: 25, label: "6", color: "red" },
//       { time: 33.8, label: "7", color: "red" },
//       { time: 41.7, label: "8", color: "red" },
//       { time: 49, label: "9", color: "red" },
//       { time: 56.5, label: "10", color: "red" },
//       { time: 62.2, label: "11", color: "red" },
//       { time: 69.8, label: "12", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What is Leo a big fan of?",
//         options: ["Music", "Sports", "Movies", "Books"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What is Leo and his father's favorite football team?",
//         options: ["Liverpool", "Manchester United", "Arsenal", "Chelsea"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "Who gave Leo the Manchester United T-shirt?",
//         options: ["His father", "His sister", "His friend", "His mother"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "Where does Leo play football after work?",
//         options: [
//           "At home",
//           "Neverland Sports Center",
//           "In the park",
//           "At school",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What TV series is Leo watching at the moment?",
//         options: ["Friends", "Breaking Bad", "Game of Thrones", "The Office"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//     ],
//   },
//   {
//     id: "9",
//     title: "Meeting a friend",
//     audio: Meetingafriend,
//     subtitles: [
//       { startTime: 0.1, endTime: 4, text: "9. Meeting a Friend" },
//       {
//         startTime: 4.3,
//         endTime: 7.5,
//         text: "Yesterday, Leo met his friend Sam for coffee. ",
//       },
//       {
//         startTime: 8,
//         endTime: 10.4,
//         text: "Sam is Leo’s old friend from school. ",
//       },
//       {
//         startTime: 10.8,
//         endTime: 13.4,
//         text: "They met at a small cafe near the park.",
//       },
//       {
//         startTime: 13.7,
//         endTime: 16.4,
//         text: "They talked for a long time about many things ",
//       },
//       {
//         startTime: 16.7,
//         endTime: 20.3,
//         text: "– their jobs, their hobbies, and their plans for the future.",
//       },
//       {
//         startTime: 20.8,
//         endTime: 24.3,
//         text: "Leo told Sam about his dream to visit Italy. ",
//       },
//       {
//         startTime: 24.7,
//         endTime: 27.3,
//         text: "Sam said it was a great idea. ",
//       },
//       { startTime: 27.8, endTime: 28.8, text: "They laughed a lot " },
//       {
//         startTime: 29,
//         endTime: 32.3,
//         text: "and remembered funny stories from their school days. ",
//       },
//       {
//         startTime: 32.6,
//         endTime: 36.5,
//         text: "For example, when Sam and Leo ran from school for a lunch break ",
//       },
//       { startTime: 36.8, endTime: 39.5, text: "and ate pizza at Leo’s home. " },
//       {
//         startTime: 40,
//         endTime: 42.6,
//         text: "Leo always feels good after talking to Sam. ",
//       },
//       {
//         startTime: 43.3,
//         endTime: 46.2,
//         text: "Good friends are very important to him.",
//       },
//       {
//         startTime: 46.6,
//         endTime: 50.2,
//         text: "Sam is an engineer in an international company now, ",
//       },
//       {
//         startTime: 50.5,
//         endTime: 54.3,
//         text: "and he is going to go to England for a work trip for 2 months. ",
//       },
//       {
//         startTime: 54.7,
//         endTime: 58,
//         text: "Leo will miss his friend very much. ",
//       },
//       {
//         startTime: 58.8,
//         endTime: 60.8,
//         text: "When they finished their coffee, ",
//       },
//       {
//         startTime: 61.1,
//         endTime: 64.4,
//         text: "they said goodbye and went home.  ",
//       },
//       { startTime: 65, endTime: 67, text: "And on the way home," },
//       { startTime: 67.5, endTime: 71, text: "Leo saw something very sad…" },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 4.2, label: "2", color: "red" },
//       { time: 7.9, label: "3", color: "red" },
//       { time: 10.8, label: "4", color: "red" },
//       { time: 13.8, label: "5", color: "red" },
//       { time: 20.9, label: "6", color: "red" },
//       { time: 24.6, label: "7", color: "red" },
//       { time: 27.8, label: "8", color: "red" },
//       { time: 32.5, label: "9", color: "red" },
//       { time: 39.7, label: "10", color: "red" },
//       { time: 43.4, label: "11", color: "red" },
//       { time: 46.6, label: "12", color: "red" },
//       { time: 54.7, label: "13", color: "red" },
//       { time: 58.7, label: "14", color: "red" },
//       { time: 65, label: "15", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What is the name of Leo's friend from school?",
//         options: ["Tom", "Sam", "Jim", "Bob"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "Where did Leo and Sam meet?",
//         options: [
//           "At Leo's house",
//           "At a small cafe near the park",
//           "At the sports center",
//           "At work",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What did Leo tell Sam about?",
//         options: [
//           "His work problems",
//           "His dream to visit Italy",
//           "His new hobby",
//           "His cat",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What is Sam's job now?",
//         options: [
//           "Teacher",
//           "Engineer in an international company",
//           "Doctor",
//           "Shop assistant",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "Where is Sam going for a work trip?",
//         options: ["France", "England", "Italy", "Germany"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//     ],
//   },
//   {
//     id: "10",
//     title: "The Lost Kitten",
//     audio: TheLostKitten,
//     subtitles: [
//       { startTime: 0.1, endTime: 2.7, text: "10. The Lost Kitten" },
//       {
//         startTime: 3,
//         endTime: 7,
//         text: "Yesterday, as Leo was walking home from meeting his friend Sam, ",
//       },
//       { startTime: 7.3, endTime: 9.2, text: "he heard a small meow. " },
//       { startTime: 9.5, endTime: 11, text: "He looked around and saw a tiny," },
//       {
//         startTime: 11.3,
//         endTime: 13.5,
//         text: "scared kitten hiding under a car. ",
//       },
//       { startTime: 13.8, endTime: 15.5, text: "It was all alone. " },
//       {
//         startTime: 16.2,
//         endTime: 18,
//         text: "Leo gently picked up the kitten. ",
//       },
//       { startTime: 18.3, endTime: 20, text: "It was very thin and cold. " },
//       {
//         startTime: 20.4,
//         endTime: 23.2,
//         text: "He took it home, gave it some warm milk, ",
//       },
//       {
//         startTime: 23.5,
//         endTime: 26.2,
//         text: "and made a soft bed for it in a box. ",
//       },
//       {
//         startTime: 26.7,
//         endTime: 29.7,
//         text: "His sister Mia gave Leo the medicine ",
//       },
//       {
//         startTime: 29.8,
//         endTime: 33,
//         text: "for the kitten because Mia is a veterinarian.",
//       },
//       {
//         startTime: 33.5,
//         endTime: 37.3,
//         text: "The next day, he put up posters around his neighborhood",
//       },
//       { startTime: 37.5, endTime: 39, text: "– to find the owners." },
//       {
//         startTime: 39.2,
//         endTime: 44,
//         text: "He also posted a photo of a kitten online on his social media profile.",
//       },
//       {
//         startTime: 44.3,
//         endTime: 48.4,
//         text: "A few days later, a little girl and her mother came to his door. ",
//       },
//       { startTime: 49.1, endTime: 50.4, text: "It was their kitten!" },
//       { startTime: 51, endTime: 52.8, text: "They were so happy. " },
//       {
//         startTime: 53.1,
//         endTime: 57,
//         text: "Leo felt wonderful helping the kitten find its home. ",
//       },
//       {
//         startTime: 57.5,
//         endTime: 61,
//         text: "Now, Leo wants to have his own cat at home.",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3, label: "2", color: "red" },
//       { time: 9.5, label: "3", color: "red" },
//       { time: 14, label: "4", color: "red" },
//       { time: 16, label: "5", color: "red" },
//       { time: 18.1, label: "6", color: "red" },
//       { time: 20.4, label: "7", color: "red" },
//       { time: 26.8, label: "8", color: "red" },
//       { time: 33.7, label: "9", color: "red" },
//       { time: 39.2, label: "10", color: "red" },
//       { time: 44.5, label: "11", color: "red" },
//       { time: 48.8, label: "12", color: "red" },
//       { time: 50.9, label: "13", color: "red" },
//       { time: 52.9, label: "14", color: "red" },
//       { time: 57.4, label: "15", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "Where did Leo find the kitten?",
//         options: [
//           "In a box",
//           "Hiding under a car",
//           "In the park",
//           "On the street",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "What did Leo give the kitten when he took it home?",
//         options: ["Cat food", "Warm milk", "Water", "Cookies"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "Who gave Leo medicine for the kitten?",
//         options: ["His mother", "His sister Mia", "A doctor", "A neighbor"],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "How did Leo try to find the kitten's owners?",
//         options: [
//           "He asked neighbors",
//           "He put up posters and posted online",
//           "He called the police",
//           "He went to the vet",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//       {
//         question: "Who came to get the kitten?",
//         options: [
//           "An old man",
//           "A little girl and her mother",
//           "A young couple",
//           "Another cat owner",
//         ],
//         correctAnswer: 1,
//         referenceTime: 0,
//       },
//     ],
//   },
// ];

// // Helper function to get a specific track
// export const getAudioTrack = (id: string): AudioTrack | undefined => {
//   return audioTracks.find((track) => track.id === id);
// };


//Easy level Audios
// import Leoslife from "../../assets/1. Leo/altLeo/1/1. Meet Leo.mp3";
// import Leosmornings from "../../assets/1. Leo/altLeo/2/2. Leo's Mornings.mp3";
// import Leosfavoritefood from "../../assets/1. Leo/altLeo/3/3. Leo's Favorite Food.mp3";
// import Leosfamily from "../../assets/1. Leo/altLeo/4/4. Leo's family.mp3";
// import Leosclothes from "../../assets/1. Leo/altLeo/5/5. Leo's Clothes.mp3";
// import Adayatthebeach from "../../assets/1. Leo/altLeo/6/6. A day at the beach.mp3";
// import Acountry from "../../assets/1. Leo/altLeo/7/7. A country Leo wants to visit.mp3";
// import Leoshobbies from "../../assets/1. Leo/altLeo/8/8. Leo's Hobbies.mp3";
// import Meetingafriend from "../../assets/1. Leo/altLeo/9/9. Meeting A Friend.mp3";
// import TheLostKitten from "../../assets/1. Leo/altLeo/10/10. The Lost Kitten.mp3";

// import q1_1fast from "../../assets/1. Leo/quiz/1.leo's life/q1-fast.mp3";
// import q1_1slow from "../../assets/1. Leo/quiz/1.leo's life/q1-slow.mp3";
// import q1_2fast from "../../assets/1. Leo/quiz/1.leo's life/q2-fast.mp3";
// import q1_2slow from "../../assets/1. Leo/quiz/1.leo's life/q2-slow.mp3";
// import q1_3fast from "../../assets/1. Leo/quiz/1.leo's life/q3-fast.mp3";
// import q1_3slow from "../../assets/1. Leo/quiz/1.leo's life/q3-slow.mp3";
// import q1_4fast from "../../assets/1. Leo/quiz/1.leo's life/q4-fast.mp3";
// import q1_4slow from "../../assets/1. Leo/quiz/1.leo's life/q4-slow.mp3";
// import q1_5fast from "../../assets/1. Leo/quiz/1.leo's life/q5-fast.mp3";
// import q1_5slow from "../../assets/1. Leo/quiz/1.leo's life/q5-slow.mp3";

// import q2_1fast from "../../assets/1. Leo/quiz/2. leo's mornings/q1fast.mp3";
// import q2_1slow from "../../assets/1. Leo/quiz/2. leo's mornings/q1slow.mp3";
// import q2_2fast from "../../assets/1. Leo/quiz/2. leo's mornings/q2fast.mp3";
// import q2_2slow from "../../assets/1. Leo/quiz/2. leo's mornings/q2slow.mp3";
// import q2_3fast from "../../assets/1. Leo/quiz/2. leo's mornings/q3fast.mp3";
// import q2_3slow from "../../assets/1. Leo/quiz/2. leo's mornings/q3slow.mp3";
// import q2_4fast from "../../assets/1. Leo/quiz/2. leo's mornings/q4fast.mp3";
// import q2_4slow from "../../assets/1. Leo/quiz/2. leo's mornings/q4slow.mp3";
// import q2_5fast from "../../assets/1. Leo/quiz/2. leo's mornings/q5fast.mp3";
// import q2_5slow from "../../assets/1. Leo/quiz/2. leo's mornings/q5slow.mp3";

// import q3_1fast from "../../assets/1. Leo/quiz/3. leo's favorite food/q1fast.mp3";
// import q3_1slow from "../../assets/1. Leo/quiz/3. leo's favorite food/q1slow.mp3";
// import q3_2fast from "../../assets/1. Leo/quiz/3. leo's favorite food/q2fast.mp3";
// import q3_2slow from "../../assets/1. Leo/quiz/3. leo's favorite food/q2slow.mp3";
// import q3_3fast from "../../assets/1. Leo/quiz/3. leo's favorite food/q3fast.mp3";
// import q3_3slow from "../../assets/1. Leo/quiz/3. leo's favorite food/q3slow.mp3";
// import q3_4fast from "../../assets/1. Leo/quiz/3. leo's favorite food/q4fast.mp3";
// import q3_4slow from "../../assets/1. Leo/quiz/3. leo's favorite food/q4slow.mp3";
// import q3_5fast from "../../assets/1. Leo/quiz/3. leo's favorite food/q5fast.mp3";
// import q3_5slow from "../../assets/1. Leo/quiz/3. leo's favorite food/q5slow.mp3";

// import q4_1fast from "../../assets/1. Leo/quiz/4. leo's family/q1fast.mp3";
// import q4_1slow from "../../assets/1. Leo/quiz/4. leo's family/q1slow.mp3";
// import q4_2fast from "../../assets/1. Leo/quiz/4. leo's family/q2fast.mp3";
// import q4_2slow from "../../assets/1. Leo/quiz/4. leo's family/q2slow.mp3";
// import q4_3fast from "../../assets/1. Leo/quiz/4. leo's family/q3fast.mp3";
// import q4_3slow from "../../assets/1. Leo/quiz/4. leo's family/q3slow.mp3";
// import q4_4fast from "../../assets/1. Leo/quiz/4. leo's family/q4fast.mp3";
// import q4_4slow from "../../assets/1. Leo/quiz/4. leo's family/q4slow.mp3";
// import q4_5fast from "../../assets/1. Leo/quiz/4. leo's family/q5fast.mp3";
// import q4_5slow from "../../assets/1. Leo/quiz/4. leo's family/q5slow.mp3";

// import q5_1fast from "../../assets/1. Leo/quiz/5. leo's clothes/q1fast.mp3";
// import q5_1slow from "../../assets/1. Leo/quiz/5. leo's clothes/q1slow.mp3";
// import q5_2fast from "../../assets/1. Leo/quiz/5. leo's clothes/q2fast.mp3";
// import q5_2slow from "../../assets/1. Leo/quiz/5. leo's clothes/q2slow.mp3";
// import q5_3fast from "../../assets/1. Leo/quiz/5. leo's clothes/q3fast.mp3";
// import q5_3slow from "../../assets/1. Leo/quiz/5. leo's clothes/q3slow.mp3";
// import q5_4fast from "../../assets/1. Leo/quiz/5. leo's clothes/q4fast.mp3";
// import q5_4slow from "../../assets/1. Leo/quiz/5. leo's clothes/q4slow.mp3";
// import q5_5fast from "../../assets/1. Leo/quiz/5. leo's clothes/q5fast.mp3";
// import q5_5slow from "../../assets/1. Leo/quiz/5. leo's clothes/q5slow.mp3";

// import q6_1fast from "../../assets/1. Leo/quiz/6. a day at the beach/q1fast.mp3";
// import q6_1slow from "../../assets/1. Leo/quiz/6. a day at the beach/q1slow.mp3";
// import q6_2fast from "../../assets/1. Leo/quiz/6. a day at the beach/q2fast.mp3";
// import q6_2slow from "../../assets/1. Leo/quiz/6. a day at the beach/q2slow.mp3";
// import q6_3fast from "../../assets/1. Leo/quiz/6. a day at the beach/q3fast.mp3";
// import q6_3slow from "../../assets/1. Leo/quiz/6. a day at the beach/q3slow.mp3";
// import q6_4fast from "../../assets/1. Leo/quiz/6. a day at the beach/q4fast.mp3";
// import q6_4slow from "../../assets/1. Leo/quiz/6. a day at the beach/q4slow.mp3";
// import q6_5fast from "../../assets/1. Leo/quiz/6. a day at the beach/q5fast.mp3";
// import q6_5slow from "../../assets/1. Leo/quiz/6. a day at the beach/q5slow.mp3";

// import q7_1fast from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q1fast.mp3";
// import q7_1slow from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q1slow.mp3";
// import q7_2fast from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q2fast.mp3";
// import q7_2slow from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q2slow.mp3";
// import q7_3fast from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q3fast.mp3";
// import q7_3slow from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q3slow.mp3";
// import q7_4fast from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q4fast.mp3";
// import q7_4slow from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q4slow.mp3";
// import q7_5fast from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q5fast.mp3";
// import q7_5slow from "../../assets/1. Leo/quiz/7. a country that Leo wants to visit/q5slow.mp3";

// import q8_1fast from "../../assets/1. Leo/quiz/8. leo's hobbies/q1fast.mp3";
// import q8_1slow from "../../assets/1. Leo/quiz/8. leo's hobbies/q1slow.mp3";
// import q8_2fast from "../../assets/1. Leo/quiz/8. leo's hobbies/q2fast.mp3";
// import q8_2slow from "../../assets/1. Leo/quiz/8. leo's hobbies/q2slow.mp3";
// import q8_3fast from "../../assets/1. Leo/quiz/8. leo's hobbies/q3fast.mp3";
// import q8_3slow from "../../assets/1. Leo/quiz/8. leo's hobbies/q3slow.mp3";
// import q8_4fast from "../../assets/1. Leo/quiz/8. leo's hobbies/q4fast.mp3";
// import q8_4slow from "../../assets/1. Leo/quiz/8. leo's hobbies/q4slow.mp3";
// import q8_5fast from "../../assets/1. Leo/quiz/8. leo's hobbies/q5fast.mp3";
// import q8_5slow from "../../assets/1. Leo/quiz/8. leo's hobbies/q5slow.mp3";

// import q9_1fast from "../../assets/1. Leo/quiz/9. meeting a friend/q1fast.mp3";
// import q9_1slow from "../../assets/1. Leo/quiz/9. meeting a friend/q1slow.mp3";
// import q9_2fast from "../../assets/1. Leo/quiz/9. meeting a friend/q2fast.mp3";
// import q9_2slow from "../../assets/1. Leo/quiz/9. meeting a friend/q2slow.mp3";
// import q9_3fast from "../../assets/1. Leo/quiz/9. meeting a friend/q3fast.mp3";
// import q9_3slow from "../../assets/1. Leo/quiz/9. meeting a friend/q3slow.mp3";
// import q9_4fast from "../../assets/1. Leo/quiz/9. meeting a friend/q4fast.mp3";
// import q9_4slow from "../../assets/1. Leo/quiz/9. meeting a friend/q4slow.mp3";
// import q9_5fast from "../../assets/1. Leo/quiz/9. meeting a friend/q5fast.mp3";
// import q9_5slow from "../../assets/1. Leo/quiz/9. meeting a friend/q5slow.mp3";

// import q10_1fast from "../../assets/1. Leo/quiz/10. the lost kitten/q1fast.mp3";
// import q10_1slow from "../../assets/1. Leo/quiz/10. the lost kitten/q1slow.mp3";
// import q10_2fast from "../../assets/1. Leo/quiz/10. the lost kitten/q2fast.mp3";
// import q10_2slow from "../../assets/1. Leo/quiz/10. the lost kitten/q2slow.mp3";
// import q10_3fast from "../../assets/1. Leo/quiz/10. the lost kitten/q3fast.mp3";
// import q10_3slow from "../../assets/1. Leo/quiz/10. the lost kitten/q3slow.mp3";
// import q10_4fast from "../../assets/1. Leo/quiz/10. the lost kitten/q4fast.mp3";
// import q10_4slow from "../../assets/1. Leo/quiz/10. the lost kitten/q4slow.mp3";
// import q10_5fast from "../../assets/1. Leo/quiz/10. the lost kitten/q5fast.mp3";
// import q10_5slow from "../../assets/1. Leo/quiz/10. the lost kitten/q5slow.mp3";

// import { AudioTrack } from "../../types";

// export const audioTracks: AudioTrack[] = [
//   {
//     id: "1",
//     title: "Leo's Life",
//     audio: Leoslife,
//     subtitles: [
//       { startTime: 0.1, endTime: 1, text: "Meet Leo." },
//       { startTime: 1.3, endTime: 3.3, text: "Leo is a happy young man." },
//       { startTime: 4, endTime: 5.5, text: "He is 26 years old." },
//       {
//         startTime: 6.2,
//         endTime: 9,
//         text: "He lives in a small flat with his cat, Ginger.",
//       },
//       { startTime: 9.8, endTime: 11.2, text: "He works at a local shop." },
//       {
//         startTime: 11.8,
//         endTime: 15.5,
//         text: "He loves his job because he meets many friendly people every day.",
//       },
//       {
//         startTime: 16.2,
//         endTime: 24.5,
//         text: "Leo enjoys simple things, like walking in the park, listening to music, and drinking warm tea in the evening. ",
//       },
//       {
//         startTime: 25.2,
//         endTime: 29,
//         text: "He always has a smile on his face and likes to help others.",
//       },
//       { startTime: 29.6, endTime: 32, text: "People say Leo is very kind." },
//       {
//         startTime: 32.6,
//         endTime: 36,
//         text: "He has a lot of friends and he sees them every weekend.",
//       },
//       {
//         startTime: 36.7,
//         endTime: 41.5,
//         text: "The story of Leo starts in a small town named Neverland, ",
//       },
//       {
//         startTime: 41.8,
//         endTime: 45.7,
//         text: "where he was born and lives today.",
//       },
//       { startTime: 46, endTime: 48, text: "And here is his story…" },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 1.5, label: "2", color: "red" },
//       { time: 4, label: "3", color: "red" },
//       { time: 6.1, label: "4", color: "red" },
//       { time: 9.7, label: "5", color: "red" },
//       { time: 11.8, label: "6", color: "red" },
//       { time: 16, label: "7", color: "red" },
//       { time: 24.8, label: "8", color: "red" },
//       { time: 29.4, label: "9", color: "red" },
//       { time: 32.5, label: "10", color: "red" },
//       { time: 36.6, label: "11", color: "red" },
//       { time: 45.8, label: "12", color: "red" },
//     ],
//     quiz: [
//   {
//     question: "How old is Leo?",
//     options: ["25 years old", "28 years old", "26 years old", "24 years old"],
//     correctAnswer: 2,
//     referenceTime: 4,
//     audio: { fast: q1_1fast, slow: q1_1slow },
//   },
//   {
//     question: "What is the name of Leo's cat?",
//     options: ["Ginger", "Tiger", "Fluffy", "Shadow"],
//     correctAnswer: 0,
//     referenceTime: 6.2,
//     audio: { fast: q1_2fast, slow: q1_2slow },
//   },
//   {
//     question: "Where does Leo work?",
//     options: ["At a bank", "At a school", "At a restaurant", "At a local shop"],
//     correctAnswer: 3,
//     referenceTime: 9.8,
//     audio: { fast: q1_3fast, slow: q1_3slow },
//   },
//   {
//     question: "What is the name of the town where Leo lives?",
//     options: ["Wonderland", "Dreamland", "Neverland", "Fairyland"],
//     correctAnswer: 2,
//     referenceTime: 36.7,
//     audio: { fast: q1_4fast, slow: q1_4slow },
//   },
//   {
//     question: "What does Leo enjoy doing in his free time?",
//     options: [
//       "Reading books",
//       "Walking in the park and listening to music",
//       "Playing video games",
//       "Watching movies",
//     ],
//     correctAnswer: 1,
//     referenceTime: 16.2,
//     audio: { fast: q1_5fast, slow: q1_5slow },
//   },
// ],
//   },
//   {
//     id: "2",
//     title: "Leo's Mornings",
//     audio: Leosmornings,
//     subtitles: [
//       { startTime: 0.1, endTime: 2.7, text: "2. Leo's mornings." },
//       {
//         startTime: 3,
//         endTime: 6.2,
//         text: "Every morning, Leo wakes up at six o'clock. ",
//       },
//       {
//         startTime: 6.6,
//         endTime: 10.8,
//         text: "First, he gets out of bed, goes to the kitchen and makes a cup of tea. ",
//       },
//       {
//         startTime: 11.2,
//         endTime: 15,
//         text: "While his tea cools down, he feeds Ginger, his cat. ",
//       },
//       {
//         startTime: 15.4,
//         endTime: 19.8,
//         text: "After that, Leo eats breakfast, usually toast with jam.",
//       },
//       {
//         startTime: 20.3,
//         endTime: 24.3,
//         text: "Then, he brushes his teeth and gets dressed for work at the shop. ",
//       },
//       { startTime: 24.7, endTime: 27, text: "He wears a shirt and trousers." },
//       {
//         startTime: 27.6,
//         endTime: 31,
//         text: "Before he leaves, he always says goodbye to Ginger.",
//       },
//       {
//         startTime: 31.6,
//         endTime: 35.4,
//         text: "He enjoys his quiet mornings before the busy day starts",
//       },
//       {
//         startTime: 36,
//         endTime: 39.7,
//         text: "But, one day, the morning didn't go as planned.",
//       },
//       {
//         startTime: 40.3,
//         endTime: 45,
//         text: "On one summer Monday morning he woke up late and he didn't have breakfast. ",
//       },
//       {
//         startTime: 45.6,
//         endTime: 51,
//         text: "Then, he forgot to feed his cat, Ginger, and even didn't wear his lucky socks. ",
//       },
//       {
//         startTime: 51.4,
//         endTime: 56.2,
//         text: "The car didn't start, so he had to walk to the bus stop.",
//       },
//       {
//         startTime: 56.7,
//         endTime: 64.1,
//         text: "At work, the boss told him that he was very upset about the progress he had at work.",
//       },
//       {
//         startTime: 64.5,
//         endTime: 72.1,
//         text: "At the end of the day, he came back home and watched his favorite TV show about animals.",
//       },
//       { startTime: 72.5, endTime: 74.5, text: "He wanted to relax." },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3, label: "2", color: "red" },
//       { time: 6.5, label: "3", color: "red" },
//       { time: 11.1, label: "4", color: "red" },
//       { time: 15.5, label: "5", color: "red" },
//       { time: 20.1, label: "6", color: "red" },
//       { time: 24.5, label: "7", color: "red" },
//       { time: 27.5, label: "8", color: "red" },
//       { time: 31.6, label: "9", color: "red" },
//       { time: 35.5, label: "10", color: "red" },
//       { time: 40, label: "11", color: "red" },
//       { time: 45, label: "12", color: "red" },
//       { time: 51.7, label: "13", color: "red" },
//       { time: 56.5, label: "14", color: "red" },
//       { time: 64.3, label: "15", color: "red" },
//       { time: 72.4, label: "16", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What time does Leo wake up every morning?",
//         options: [
//           "Seven o'clock",
//           "Five o'clock",
//           "Six o'clock",
//           "Eight o'clock",
//         ],
//         correctAnswer: 2,
//         referenceTime: 3,
//         audio: { fast: q2_1fast, slow: q2_1slow },
//       },
//       {
//         question: "What does Leo do first when he wakes up?",
//         options: [
//           "Feeds his cat",
//           "Makes a cup of tea",
//           "Takes a shower",
//           "Brushes his teeth",
//         ],
//         correctAnswer: 1,
//         referenceTime: 6.6,
//         audio: { fast: q2_2fast, slow: q2_2slow },
//       },
//       {
//         question: "What does Leo usually eat for breakfast?",
//         options: [
//           "Pancakes",
//           "Cereal with milk",
//           "Eggs and bacon",
//           "Toast with jam",
//         ],
//         correctAnswer: 3,
//         referenceTime: 15.4,
//         audio: { fast: q2_3fast, slow: q2_3slow },
//       },
//       {
//         question: "What happened on the bad morning?",
//         options: [
//           "He overslept and missed breakfast",
//           "He forgot his keys",
//           "He got sick",
//           "His car broke down",
//         ],
//         correctAnswer: 0,
//         referenceTime: 40.3,
//         audio: { fast: q2_4fast, slow: q2_4slow },
//       },
//       {
//         question: "How did Leo get to work on the bad day?",
//         options: [
//           "He called a taxi",
//           "He drove his car",
//           "He walked to the bus stop",
//           "His friend gave him a ride",
//         ],
//         correctAnswer: 2,
//         referenceTime: 51.4,
//         audio: { fast: q2_5fast, slow: q2_5slow },
//       },
//     ],
//   },
//   {
//     id: "3",
//     title: "Leo's Favorite Food",
//     audio: Leosfavoritefood,
//     subtitles: [
//       { startTime: 0.1, endTime: 3.2, text: "3. Leo's favorite food." },
//       { startTime: 3.5, endTime: 4.8, text: "Leo loves to eat." },
//       { startTime: 5.1, endTime: 7, text: "His favorite food is pizza." },
//       {
//         startTime: 7.4,
//         endTime: 10.3,
//         text: "He likes pizza with lots of cheese and tomatoes.",
//       },
//       {
//         startTime: 10.8,
//         endTime: 14.4,
//         text: "Sometimes, on his day off, he makes pizza at home. ",
//       },
//       {
//         startTime: 14.8,
//         endTime: 17.7,
//         text: "He buys fresh dough from the bakery where he works.",
//       },
//       {
//         startTime: 18,
//         endTime: 20.4,
//         text: "He also likes his mother's apple pie.",
//       },
//       { startTime: 20.8, endTime: 22.5, text: "She makes it every Sunday." },
//       {
//         startTime: 23.2,
//         endTime: 26.2,
//         text: "Leo thinks his mother is the best cook in the world.",
//       },
//       {
//         startTime: 26.7,
//         endTime: 31,
//         text: "He also enjoys simple snacks like apples and bananas.",
//       },
//       {
//         startTime: 31.5,
//         endTime: 37,
//         text: "He says eating good food makes him feel happy and full of energy for the day.",
//       },
//       {
//         startTime: 37.7,
//         endTime: 42,
//         text: "Sometimes, when he is at home – he makes lasagna –",
//       },
//       {
//         startTime: 42.8,
//         endTime: 46.7,
//         text: "– his cat Ginger really likes this meal.",
//       },
//       { startTime: 47.5, endTime: 50, text: "He is trying to eat healthily," },
//       {
//         startTime: 50.6,
//         endTime: 55,
//         text: "but because of his work, it's hard to do. ",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3.3, label: "2", color: "red" },
//       { time: 5.3, label: "3", color: "red" },
//       { time: 7.5, label: "4", color: "red" },
//       { time: 10.8, label: "5", color: "red" },
//       { time: 14.8, label: "6", color: "red" },
//       { time: 18, label: "7", color: "red" },
//       { time: 20.8, label: "8", color: "red" },
//       { time: 23, label: "9", color: "red" },
//       { time: 26.7, label: "10", color: "red" },
//       { time: 31.3, label: "11", color: "red" },
//       { time: 37.6, label: "12", color: "red" },
//       { time: 47.4, label: "13", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What is Leo's favorite food?",
//         options: ["Burgers", "Pizza", "Pasta", "Sandwiches"],
//         correctAnswer: 1,
//         referenceTime: 5.1,
//         audio: { fast: q3_1fast, slow: q3_1slow },
//       },
//       {
//         question: "What toppings does Leo like on his pizza?",
//         options: [
//           "Vegetables only",
//           "Mushrooms and ham",
//           "Cheese and tomatoes",
//           "Cheese and pepperoni",
//         ],
//         correctAnswer: 2,
//         referenceTime: 7.4,
//         audio: { fast: q3_2fast, slow: q3_2slow },
//       },
//       {
//         question: "Where does Leo buy fresh dough?",
//         options: [
//           "He makes it himself",
//           "From his neighbor",
//           "From the supermarket",
//           "From the bakery where he works",
//         ],
//         correctAnswer: 3,
//         referenceTime: 14.8,
//         audio: { fast: q3_3fast, slow: q3_3slow },
//       },
//       {
//         question: "What does Leo's mother make every Sunday?",
//         options: ["Apple pie", "Bread", "Chocolate cake", "Cookies"],
//         correctAnswer: 0,
//         referenceTime: 18,
//         audio: { fast: q3_4fast, slow: q3_4slow },
//       },
//       {
//         question: "Which meal does Leo's cat Ginger really like?",
//         options: ["Apple pie", "Sandwiches", "Lasagna", "Pizza"],
//         correctAnswer: 2,
//         referenceTime: 37.7,
//         audio: { fast: q3_5fast, slow: q3_5slow },
//       },
//     ],
//   },
//   {
//     id: "4",
//     title: "Leo's Family",
//     audio: Leosfamily,
//     subtitles: [
//       { startTime: 0.1, endTime: 3.4, text: "4. Leo's Family" },
//       {
//         startTime: 3.4,
//         endTime: 6.2,
//         text: "Now, let's talk about Leo's family. ",
//       },
//       {
//         startTime: 6.6,
//         endTime: 8.8,
//         text: "Leo has a small and loving family. ",
//       },
//       {
//         startTime: 9,
//         endTime: 12.6,
//         text: "He lives alone with his cat, but his parents live in a town nearby. ",
//       },
//       {
//         startTime: 13,
//         endTime: 18.3,
//         text: "His mother, Anna, is a teacher, and his father, Mark, is an engineer. ",
//       },
//       { startTime: 18.6, endTime: 21, text: "Leo visits them every weekend. " },
//       {
//         startTime: 21.3,
//         endTime: 24,
//         text: "He also has an older sister named Mia.",
//       },
//       {
//         startTime: 24.4,
//         endTime: 27.2,
//         text: "Mia is a doctor and lives in a big city, ",
//       },
//       {
//         startTime: 27.4,
//         endTime: 30,
//         text: "so Leo doesn't see her very often",
//       },
//       {
//         startTime: 30.3,
//         endTime: 32.6,
//         text: "but they talk on the phone every week. ",
//       },
//       {
//         startTime: 32.9,
//         endTime: 35.4,
//         text: "Leo loves his family very much. ",
//       },
//       {
//         startTime: 35.8,
//         endTime: 40.2,
//         text: "They always support each other and have fun when they are together. ",
//       },
//       {
//         startTime: 41,
//         endTime: 44,
//         text: "Sometimes, they go on a trip together,",
//       },
//       {
//         startTime: 44.2,
//         endTime: 47.2,
//         text: "visiting the nature and camping on a lake. ",
//       },
//       {
//         startTime: 47.6,
//         endTime: 51,
//         text: "Leo has a very good relationship with his dad,",
//       },
//       {
//         startTime: 51.2,
//         endTime: 57,
//         text: "they often go fishing together, and sometimes even watch football live. ",
//       },
//       {
//         startTime: 57.8,
//         endTime: 61,
//         text: "And what about Leo's personal life? ",
//       },
//       {
//         startTime: 62,
//         endTime: 66.5,
//         text: "Well, Leo is currently looking for a girlfriend,",
//       },
//       {
//         startTime: 66.9,
//         endTime: 70.5,
//         text: "he wants to build a strong and happy family, ",
//       },
//       {
//         startTime: 70.9,
//         endTime: 76,
//         text: "and we hope he will find a girl of his dreams, of course!",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3.2, label: "2", color: "red" },
//       { time: 6.4, label: "3", color: "red" },
//       { time: 8.7, label: "4", color: "red" },
//       { time: 13.1, label: "5", color: "red" },
//       { time: 18.5, label: "6", color: "red" },
//       { time: 21.2, label: "7", color: "red" },
//       { time: 24.4, label: "8", color: "red" },
//       { time: 32.7, label: "9", color: "red" },
//       { time: 35.6, label: "10", color: "red" },
//       { time: 41, label: "11", color: "red" },
//       { time: 47.5, label: "12", color: "red" },
//       { time: 57.8, label: "13", color: "red" },
//       { time: 61.6, label: "14", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What is Leo's mother's job?",
//         options: ["Nurse", "Engineer", "Teacher", "Doctor"],
//         correctAnswer: 2,
//         referenceTime: 13,
//         audio: { fast: q4_1fast, slow: q4_1slow },
//       },
//       {
//         question: "What is Leo's father's name?",
//         options: ["Mark", "Mike", "Matt", "Max"],
//         correctAnswer: 0,
//         referenceTime: 13,
//         audio: { fast: q4_2fast, slow: q4_2slow },
//       },
//       {
//         question: "What is Leo's sister's name and profession?",
//         options: [
//           "Sara, nurse",
//           "Anna, teacher",
//           "Mia, doctor",
//           "Lisa, engineer",
//         ],
//         correctAnswer: 2,
//         referenceTime: 21.3,
//         audio: { fast: q4_3fast, slow: q4_3slow },
//       },
//       {
//         question: "How often does Leo visit his parents?",
//         options: ["Twice a week", "Once a month", "Every weekend", "Every day"],
//         correctAnswer: 2,
//         referenceTime: 18.6,
//         audio: { fast: q4_4fast, slow: q4_4slow },
//       },
//       {
//         question: "What does Leo do with his father?",
//         options: [
//           "Go shopping and travel",
//           "Play games and read",
//           "Play tennis and cook",
//           "Go fishing and watch football",
//         ],
//         correctAnswer: 3,
//         referenceTime: 47.6,
//         audio: { fast: q4_5fast, slow: q4_5slow },
//       },
//     ],
//   },
//   {
//     id: "5",
//     title: "Leo's Clothes",
//     audio: Leosclothes,
//     subtitles: [
//       { startTime: 0.1, endTime: 3, text: "5. Leo's Clothes" },
//       {
//         startTime: 3.5,
//         endTime: 6,
//         text: "Leo isn't a person who follows the current trends",
//       },
//       {
//         startTime: 6.5,
//         endTime: 10,
//         text: "or what is popular to and fashionable to wear.",
//       },
//       {
//         startTime: 10.5,
//         endTime: 12.5,
//         text: "He likes to wear comfortable clothes.",
//       },
//       {
//         startTime: 13.3,
//         endTime: 15,
//         text: "When he is not working at the bakery,",
//       },
//       {
//         startTime: 15.4,
//         endTime: 18,
//         text: "he usually wears jeans and a T-shirt.",
//       },
//       {
//         startTime: 18.4,
//         endTime: 21.1,
//         text: "His favorite T-shirt is a blue one,",
//       },
//       {
//         startTime: 21.4,
//         endTime: 23.3,
//         text: "without any pictures or prints.",
//       },
//       {
//         startTime: 23.8,
//         endTime: 28.5,
//         text: "In winter, he wears a warm woolen sweater that his grandmother made for him.",
//       },
//       { startTime: 28.8, endTime: 30, text: "It's very cozy!" },
//       {
//         startTime: 30.6,
//         endTime: 33.6,
//         text: "And when he is at home, he likes wearing the shorts ",
//       },
//       {
//         startTime: 33.7,
//         endTime: 39.5,
//         text: "and sometimes pyjamas – which is very childish, but still, cozy. ",
//       },
//       {
//         startTime: 39.9,
//         endTime: 42.6,
//         text: "For work, he has his bakery uniform:",
//       },
//       {
//         startTime: 42.8,
//         endTime: 47,
//         text: "a white shirt, black trousers, and his special apron.",
//       },
//       {
//         startTime: 47.4,
//         endTime: 50,
//         text: "Leo thinks it's important to be neat and tidy, ",
//       },
//       {
//         startTime: 50.3,
//         endTime: 54.2,
//         text: "but comfort is most important for his everyday outfits. ",
//       },
//       {
//         startTime: 54.5,
//         endTime: 58,
//         text: "He doesn't like shopping for clothes very much.",
//       },
//       {
//         startTime: 58.5,
//         endTime: 61.6,
//         text: "He thinks that men shouldn't waste money on clothes ",
//       },
//       {
//         startTime: 61.8,
//         endTime: 67.6,
//         text: "because only women love buying different clothes of different styles.",
//       },
//       { startTime: 68, endTime: 69.4, text: "Well, Leo " },
//       {
//         startTime: 69.8,
//         endTime: 73.2,
//         text: "– maybe that is why you don't have a girlfriend?",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3.4, label: "2", color: "red" },
//       { time: 10.4, label: "3", color: "red" },
//       { time: 13.2, label: "4", color: "red" },
//       { time: 18.3, label: "5", color: "red" },
//       { time: 23.7, label: "6", color: "red" },
//       { time: 28.9, label: "7", color: "red" },
//       { time: 30.6, label: "8", color: "red" },
//       { time: 39.8, label: "9", color: "red" },
//       { time: 47.5, label: "10", color: "red" },
//       { time: 54.5, label: "11", color: "red" },
//       { time: 58.3, label: "12", color: "red" },
//       { time: 67.8, label: "13", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What does Leo usually wear when he's not working?",
//         options: [
//           "Shorts and sandals",
//           "Jeans and a T-shirt",
//           "Sweaters and pants",
//           "Suits and ties",
//         ],
//         correctAnswer: 1,
//         referenceTime: 13.3,
//         audio: { fast: q5_1fast, slow: q5_1slow },
//       },
//       {
//         question: "What color is Leo's favorite T-shirt?",
//         options: ["Green", "Red", "Blue", "Black"],
//         correctAnswer: 2,
//         referenceTime: 18.4,
//         audio: { fast: q5_2fast, slow: q5_2slow },
//       },
//       {
//         question: "Who made Leo's warm woolen sweater?",
//         options: [
//           "He bought it",
//           "His grandmother",
//           "His sister",
//           "His mother",
//         ],
//         correctAnswer: 1,
//         referenceTime: 23.8,
//         audio: { fast: q5_3fast, slow: q5_3slow },
//       },
//       {
//         question: "What does Leo wear for work?",
//         options: [
//           "Just an apron",
//           "Casual clothes",
//           "White shirt, black trousers, and apron",
//           "Uniform with logo",
//         ],
//         correctAnswer: 2,
//         referenceTime: 39.9,
//         audio: { fast: q5_4fast, slow: q5_4slow },
//       },
//       {
//         question: "What does Leo think about clothes shopping?",
//         options: [
//           "He thinks it's fun",
//           "He does it often",
//           "He loves it",
//           "He doesn't like it very much",
//         ],
//         correctAnswer: 3,
//         referenceTime: 54.5,
//         audio: { fast: q5_5fast, slow: q5_5slow },
//       },
//     ],
//   },
//   {
//     id: "6",
//     title: "A day at the Beach",
//     audio: Adayatthebeach,
//     subtitles: [
//       { startTime: 0.1, endTime: 3, text: "6. A day at the beach." },
//       {
//         startTime: 3.2,
//         endTime: 6.8,
//         text: "Now, let's go deep inside Leo's memory ",
//       },
//       {
//         startTime: 7,
//         endTime: 10.4,
//         text: "and follow his remarkable story about a day at the beach.",
//       },
//       {
//         startTime: 10.6,
//         endTime: 13.7,
//         text: "Leo remembers a special day from his childhood. ",
//       },
//       { startTime: 14.5, endTime: 16, text: "When he was ten years old, " },
//       { startTime: 16.4, endTime: 18, text: "his family went to the beach." },
//       { startTime: 18.4, endTime: 20.3, text: "It was a very sunny day. " },
//       {
//         startTime: 20.6,
//         endTime: 25.1,
//         text: "Leo played in the sand and built a big castle with his sister, Mia.  ",
//       },
//       {
//         startTime: 25.6,
//         endTime: 28.4,
//         text: "Then, his father decided to teach Leo",
//       },
//       { startTime: 28.5, endTime: 30, text: "how to swim in the sea." },
//       {
//         startTime: 30.8,
//         endTime: 32.8,
//         text: "Suddenly, when they were swimming ",
//       },
//       { startTime: 33.2, endTime: 35, text: " – they saw a shark!" },
//       {
//         startTime: 35.6,
//         endTime: 38.4,
//         text: "Everybody started to swim quickly to the shore,",
//       },
//       {
//         startTime: 38.7,
//         endTime: 42.8,
//         text: "and because of the stress – Leo quickly started to swim ",
//       },
//       {
//         startTime: 43.1,
//         endTime: 46,
//         text: "– even though he couldn't do it before!",
//       },
//       {
//         startTime: 46.5,
//         endTime: 50.2,
//         text: "I guess, Leo was so scared that he taught himself ",
//       },
//       {
//         startTime: 50.3,
//         endTime: 53,
//         text: "how to swim – thanks to the shark. ",
//       },
//       {
//         startTime: 53.7,
//         endTime: 56.5,
//         text: "Leo's dad still remembers this moment ",
//       },
//       {
//         startTime: 56.8,
//         endTime: 61.4,
//         text: "and sometimes reminds of this moment to Leo.",
//       },
//       {
//         startTime: 62,
//         endTime: 66.7,
//         text: "He still thinks about that scary day at the beach.",
//       },
//       { startTime: 67, endTime: 72, text: "And now Leo can swim very well," },
//       {
//         startTime: 72.3,
//         endTime: 78,
//         text: "one time he even crossed the river while swimming!",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3, label: "2", color: "red" },
//       { time: 11, label: "3", color: "red" },
//       { time: 14.4, label: "4", color: "red" },
//       { time: 18.4, label: "5", color: "red" },
//       { time: 20.6, label: "6", color: "red" },
//       { time: 25.5, label: "7", color: "red" },
//       { time: 30.8, label: "8", color: "red" },
//       { time: 35.3, label: "9", color: "red" },
//       { time: 46.5, label: "10", color: "red" },
//       { time: 53.7, label: "11", color: "red" },
//       { time: 62, label: "12", color: "red" },
//       { time: 67.4, label: "13", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "How old was Leo when his family went to the beach?",
//         options: [
//           "Ten years old",
//           "Eight years old",
//           "Twelve years old",
//           "Nine years old",
//         ],
//         correctAnswer: 0,
//         referenceTime: 14.5,
//         audio: { fast: q6_1fast, slow: q6_1slow },
//       },
//       {
//         question: "What did Leo build on the beach with his sister?",
//         options: ["A sand house", "A fort", "A big castle", "A sand sculpture"],
//         correctAnswer: 2,
//         referenceTime: 20.6,
//         audio: { fast: q6_2fast, slow: q6_2slow },
//       },
//       {
//         question: "What did Leo's father want to teach him?",
//         options: [
//           "How to fish",
//           "How to swim in the sea",
//           "How to surf",
//           "How to sail",
//         ],
//         correctAnswer: 1,
//         referenceTime: 28.5,
//         audio: { fast: q6_3fast, slow: q6_3slow },
//       },
//       {
//         question: "What did they see while swimming?",
//         options: ["A big fish", "A whale", "A shark", "A dolphin"],
//         correctAnswer: 2,
//         referenceTime: 33.2,
//         audio: { fast: q6_4fast, slow:q6_4slow },
//       },
//       {
//         question: "How did Leo learn to swim?",
//         options: [
//           "He took swimming lessons",
//           "His sister helped him",
//           "He was scared by the shark and learned quickly",
//           "His father taught him slowly",
//         ],
//         correctAnswer: 2,
//         referenceTime: 46.5,
//         audio: { fast: q6_5fast, slow: q6_5slow },
//       },
//     ],
//   },

//   {
//     id: "7",
//     title: "A country that Leo wants to visit",
//     audio: Acountry,
//     subtitles: [
//       { startTime: 0.1, endTime: 4, text: "7. A Country Leo Wants to Visit" },
//       {
//         startTime: 4.3,
//         endTime: 7,
//         text: "Well, if you followed Leo's story ",
//       },
//       {
//         startTime: 7.2,
//         endTime: 10.3,
//         text: "– you know he doesn't like spending money very much.",
//       },
//       {
//         startTime: 10.6,
//         endTime: 13.3,
//         text: "But he has many places he would love to visit.",
//       },
//       {
//         startTime: 14,
//         endTime: 16.6,
//         text: "He dreams of visiting Italy one day. ",
//       },
//       {
//         startTime: 17.1,
//         endTime: 21.3,
//         text: "He has seen many pictures of Italy in books and on television. ",
//       },
//       {
//         startTime: 21.9,
//         endTime: 24.4,
//         text: "He wants to see the old buildings in Rome ",
//       },
//       {
//         startTime: 24.6,
//         endTime: 26.7,
//         text: "and ride a gondola in Venice. ",
//       },
//       {
//         startTime: 27.3,
//         endTime: 31.5,
//         text: "Leo loves Italian food, especially pizza and pasta,",
//       },
//       {
//         startTime: 31.8,
//         endTime: 35.3,
//         text: "so he wants to try authentic Italian dishes. ",
//       },
//       {
//         startTime: 36,
//         endTime: 38.6,
//         text: "He imagines walking through sunny streets, ",
//       },
//       { startTime: 38.8, endTime: 40.8, text: "eating delicious gelato," },
//       {
//         startTime: 41.1,
//         endTime: 43.4,
//         text: "and listening to Italian music.",
//       },
//       {
//         startTime: 44.2,
//         endTime: 47.2,
//         text: "He is saving a little money each month for his trip.",
//       },
//       {
//         startTime: 47.5,
//         endTime: 50.6,
//         text: "He hopes his dream will come true soon. ",
//       },
//       {
//         startTime: 51.4,
//         endTime: 55,
//         text: "One of his friends offered Leo to travel with him to France,",
//       },
//       { startTime: 55.3, endTime: 58, text: "but Leo says he hates France." },
//       {
//         startTime: 58.4,
//         endTime: 63.6,
//         text: "He says it is a dirty and very dangerous country.",
//       },
//       {
//         startTime: 64,
//         endTime: 67.8,
//         text: "We don't know why Leo hates France so much, ",
//       },
//       {
//         startTime: 68.2,
//         endTime: 74,
//         text: "maybe it is because he has a French car which breaks every month. ",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 4, label: "2", color: "red" },
//       { time: 10.6, label: "3", color: "red" },
//       { time: 14, label: "4", color: "red" },
//       { time: 17, label: "5", color: "red" },
//       { time: 21.6, label: "6", color: "red" },
//       { time: 27.2, label: "7", color: "red" },
//       { time: 35.7, label: "8", color: "red" },
//       { time: 44, label: "9", color: "red" },
//       { time: 47.4, label: "10", color: "red" },
//       { time: 51.3, label: "11", color: "red" },
//       { time: 58.4, label: "12", color: "red" },
//       { time: 63.7, label: "13", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "Which country does Leo dream of visiting?",
//         options: ["Spain", "Italy", "Germany", "France"],
//         correctAnswer: 1,
//         referenceTime: 14,
//         audio: { fast: q7_1fast, slow: q7_1slow },
//       },
//       {
//         question: "What does Leo want to see in Rome?",
//         options: [
//           "Shopping centers",
//           "The old buildings",
//           "Modern architecture",
//           "Museums",
//         ],
//         correctAnswer: 1,
//         referenceTime: 21.9,
//         audio: { fast: q7_2fast, slow: q7_2slow },
//       },
//       {
//         question: "What does Leo want to do in Venice?",
//         options: [
//           "Go shopping",
//           "Ride a gondola",
//           "Visit churches",
//           "Take photos",
//         ],
//         correctAnswer: 1,
//         referenceTime: 24.6,
//         audio: { fast: q7_3fast, slow: q7_3slow },
//       },
//       {
//         question: "How does Leo save money for his trip?",
//         options: [
//           "He doesn't save money",
//           "He saves a little each month",
//           "He works overtime",
//           "He borrows from family",
//         ],
//         correctAnswer: 1,
//         referenceTime: 44.2,
//         audio: { fast: q7_4fast, slow: q7_4slow },
//       },
//       {
//         question: "What does Leo say about France?",
//         options: [
//           "He wants to visit it",
//           "He loves it",
//           "He hates it",
//           "He's been there",
//         ],
//         correctAnswer: 2,
//         referenceTime: 55.3,
//         audio: { fast: q7_5fast, slow: q7_5slow },
//       },
//     ],
//   },
//   {
//     id: "8",
//     title: "Leo's hobbies",
//     audio: Leoshobbies,
//     subtitles: [
//       { startTime: 0.1, endTime: 2.5, text: "8. Leo’s hobbies " },
//       {
//         startTime: 2.7,
//         endTime: 7.2,
//         text: "Now let’s look into Leo’s hobbies and free time activities.",
//       },
//       { startTime: 7.6, endTime: 10, text: "Leo is a big fan of sports" },
//       {
//         startTime: 10.2,
//         endTime: 13.5,
//         text: "– he likes watching and playing different kinds of sports. ",
//       },
//       {
//         startTime: 14,
//         endTime: 16.8,
//         text: "He and his family are very sporty people. ",
//       },
//       {
//         startTime: 17.2,
//         endTime: 21.6,
//         text: "As we said before, Leo and his father Mark love football ",
//       },
//       {
//         startTime: 21.9,
//         endTime: 24.5,
//         text: "– their favorite team is Manchester United. ",
//       },
//       {
//         startTime: 25.3,
//         endTime: 29.9,
//         text: "Leo even owns a real T-Shirt of Manchester United’s attacker Ronaldo ",
//       },
//       {
//         startTime: 30,
//         endTime: 33.3,
//         text: "which his sister gifted him on his birthday.",
//       },
//       { startTime: 34, endTime: 35.6, text: "Every day after work " },
//       {
//         startTime: 36,
//         endTime: 38.6,
//         text: "– Leo goes to play football on the sports field ",
//       },
//       { startTime: 38.8, endTime: 41, text: "in Neverland Sports Center. " },
//       {
//         startTime: 41.4,
//         endTime: 45.7,
//         text: "He says it helps him to relax after a stressful day",
//       },
//       { startTime: 46.3, endTime: 48.2, text: "– and play with his friends." },
//       {
//         startTime: 49,
//         endTime: 52.3,
//         text: "Another hobby that Leo likes doing in his free time",
//       },
//       {
//         startTime: 52.5,
//         endTime: 56,
//         text: "is watching TV series about crime and drama. ",
//       },
//       {
//         startTime: 56.7,
//         endTime: 59.6,
//         text: "He’s watching Breaking Bad at the moment ",
//       },
//       { startTime: 60, endTime: 62, text: "– his favorite one." },
//       {
//         startTime: 62.3,
//         endTime: 65.2,
//         text: "He says that watching shows with friends ",
//       },
//       {
//         startTime: 65.5,
//         endTime: 69,
//         text: "and talking about them is very fun. ",
//       },
//       {
//         startTime: 69.7,
//         endTime: 73.3,
//         text: "He has a big collection of DVD discs ",
//       },
//       {
//         startTime: 73.6,
//         endTime: 78,
//         text: "with many classic movies of 70s and 80s.",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 2.8, label: "2", color: "red" },
//       { time: 7.7, label: "3", color: "red" },
//       { time: 13.8, label: "4", color: "red" },
//       { time: 17.3, label: "5", color: "red" },
//       { time: 25, label: "6", color: "red" },
//       { time: 33.8, label: "7", color: "red" },
//       { time: 41.7, label: "8", color: "red" },
//       { time: 49, label: "9", color: "red" },
//       { time: 56.5, label: "10", color: "red" },
//       { time: 62.2, label: "11", color: "red" },
//       { time: 69.8, label: "12", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What is Leo a big fan of?",
//         options: ["Music", "Sports", "Movies", "Books"],
//         correctAnswer: 1,
//         referenceTime: 7.7,
//         audio: { fast: q8_1fast, slow: q8_1slow },
//       },
//       {
//         question: "What is Leo and his father's favorite football team?",
//         options: ["Manchester United", "Liverpool", "Arsenal", "Chelsea"],
//         correctAnswer: 0,
//         referenceTime: 17.3,
//         audio: { fast: q8_2fast, slow: q8_2slow },
//       },
//       {
//         question: "Who gave Leo the Manchester United T-shirt?",
//         options: ["His friend", "His father", "His sister", "His mother"],
//         correctAnswer: 2,
//         referenceTime: 33.8,
//         audio: { fast: q8_3fast, slow: q8_3slow },
//       },
//       {
//         question: "Where does Leo play football after work?",
//         options: [
//           "In the park",
//           "At home",
//           "Neverland Sports Center",
//           "At school",
//         ],
//         correctAnswer: 2,
//         referenceTime: 41.7,
//         audio: { fast: q8_4fast, slow: q8_4slow },
//       },
//       {
//         question: "What TV series is Leo watching at the moment?",
//         options: ["Breaking Bad", "Friends", "Game of Thrones", "The Office"],
//         correctAnswer: 0,
//         referenceTime: 56.5,
//         audio: { fast: q8_5fast, slow: q8_5slow },
//       },
//     ],
//   },
//   {
//     id: "9",
//     title: "Meeting a friend",
//     audio: Meetingafriend,
//     subtitles: [
//       { startTime: 0.1, endTime: 4, text: "9. Meeting a Friend" },
//       {
//         startTime: 4.3,
//         endTime: 7.5,
//         text: "Yesterday, Leo met his friend Sam for coffee. ",
//       },
//       {
//         startTime: 8,
//         endTime: 10.4,
//         text: "Sam is Leo’s old friend from school. ",
//       },
//       {
//         startTime: 10.8,
//         endTime: 13.4,
//         text: "They met at a small cafe near the park.",
//       },
//       {
//         startTime: 13.7,
//         endTime: 16.4,
//         text: "They talked for a long time about many things ",
//       },
//       {
//         startTime: 16.7,
//         endTime: 20.3,
//         text: "– their jobs, their hobbies, and their plans for the future.",
//       },
//       {
//         startTime: 20.8,
//         endTime: 24.3,
//         text: "Leo told Sam about his dream to visit Italy. ",
//       },
//       {
//         startTime: 24.7,
//         endTime: 27.3,
//         text: "Sam said it was a great idea. ",
//       },
//       { startTime: 27.8, endTime: 28.8, text: "They laughed a lot " },
//       {
//         startTime: 29,
//         endTime: 32.3,
//         text: "and remembered funny stories from their school days. ",
//       },
//       {
//         startTime: 32.6,
//         endTime: 36.5,
//         text: "For example, when Sam and Leo ran from school for a lunch break ",
//       },
//       { startTime: 36.8, endTime: 39.5, text: "and ate pizza at Leo’s home. " },
//       {
//         startTime: 40,
//         endTime: 42.6,
//         text: "Leo always feels good after talking to Sam. ",
//       },
//       {
//         startTime: 43.3,
//         endTime: 46.2,
//         text: "Good friends are very important to him.",
//       },
//       {
//         startTime: 46.6,
//         endTime: 50.2,
//         text: "Sam is an engineer in an international company now, ",
//       },
//       {
//         startTime: 50.5,
//         endTime: 54.3,
//         text: "and he is going to go to England for a work trip for 2 months. ",
//       },
//       {
//         startTime: 54.7,
//         endTime: 58,
//         text: "Leo will miss his friend very much. ",
//       },
//       {
//         startTime: 58.8,
//         endTime: 60.8,
//         text: "When they finished their coffee, ",
//       },
//       {
//         startTime: 61.1,
//         endTime: 64.4,
//         text: "they said goodbye and went home.  ",
//       },
//       { startTime: 65, endTime: 67, text: "And on the way home," },
//       { startTime: 67.5, endTime: 71, text: "Leo saw something very sad…" },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 4.2, label: "2", color: "red" },
//       { time: 7.9, label: "3", color: "red" },
//       { time: 10.8, label: "4", color: "red" },
//       { time: 13.8, label: "5", color: "red" },
//       { time: 20.9, label: "6", color: "red" },
//       { time: 24.6, label: "7", color: "red" },
//       { time: 27.8, label: "8", color: "red" },
//       { time: 32.5, label: "9", color: "red" },
//       { time: 39.7, label: "10", color: "red" },
//       { time: 43.4, label: "11", color: "red" },
//       { time: 46.6, label: "12", color: "red" },
//       { time: 54.7, label: "13", color: "red" },
//       { time: 58.7, label: "14", color: "red" },
//       { time: 65, label: "15", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "What is the name of Leo's friend from school?",
//         options: ["Tom", "Jim", "Sam", "Bob"],
//         correctAnswer: 2,
//         referenceTime: 4.2,
//         audio: { fast: q9_1fast, slow: q9_1slow },
//       },
//       {
//         question: "Where did Leo and Sam meet?",
//         options: [
//           "At the sports center",
//           "At a small cafe near the park",
//           "At Leo's house",
//           "At work",
//         ],
//         correctAnswer: 1,
//         referenceTime: 10.8,
//         audio: { fast: q9_2fast, slow: q9_2slow },
//       },
//       {
//         question: "What did Leo tell Sam about?",
//         options: [
//           "His cat",
//           "His dream to visit Italy",
//           "His work problems",
//           "His new hobby",
//         ],
//         correctAnswer: 1,
//         referenceTime: 20.9,
//         audio: { fast: q9_3fast, slow: q9_3slow },
//       },
//       {
//         question: "What is Sam's job now?",
//         options: [
//           "Teacher",
//           "Doctor",
//           "Engineer in an international company",
//           "Shop assistant",
//         ],
//         correctAnswer: 2,
//         referenceTime: 46.6,
//         audio: { fast: q9_4fast, slow: q9_4slow },
//       },
//       {
//         question: "Where is Sam going for a work trip?",
//         options: ["France", "Italy", "England", "Germany"],
//         correctAnswer: 2,
//         referenceTime: 54.7,
//         audio: { fast: q9_5fast, slow: q9_5slow },
//       },
//     ],
//   },
//   {
//     id: "10",
//     title: "The Lost Kitten",
//     audio: TheLostKitten,
//     subtitles: [
//       { startTime: 0.1, endTime: 2.7, text: "10. The Lost Kitten" },
//       {
//         startTime: 3,
//         endTime: 7,
//         text: "Yesterday, as Leo was walking home from meeting his friend Sam, ",
//       },
//       { startTime: 7.3, endTime: 9.2, text: "he heard a small meow. " },
//       { startTime: 9.5, endTime: 11, text: "He looked around and saw a tiny," },
//       {
//         startTime: 11.3,
//         endTime: 13.5,
//         text: "scared kitten hiding under a car. ",
//       },
//       { startTime: 13.8, endTime: 15.5, text: "It was all alone. " },
//       {
//         startTime: 16.2,
//         endTime: 18,
//         text: "Leo gently picked up the kitten. ",
//       },
//       { startTime: 18.3, endTime: 20, text: "It was very thin and cold. " },
//       {
//         startTime: 20.4,
//         endTime: 23.2,
//         text: "He took it home, gave it some warm milk, ",
//       },
//       {
//         startTime: 23.5,
//         endTime: 26.2,
//         text: "and made a soft bed for it in a box. ",
//       },
//       {
//         startTime: 26.7,
//         endTime: 29.7,
//         text: "His sister Mia gave Leo the medicine ",
//       },
//       {
//         startTime: 29.8,
//         endTime: 33,
//         text: "for the kitten because Mia is a veterinarian.",
//       },
//       {
//         startTime: 33.5,
//         endTime: 37.3,
//         text: "The next day, he put up posters around his neighborhood",
//       },
//       { startTime: 37.5, endTime: 39, text: "– to find the owners." },
//       {
//         startTime: 39.2,
//         endTime: 44,
//         text: "He also posted a photo of a kitten online on his social media profile.",
//       },
//       {
//         startTime: 44.3,
//         endTime: 48.4,
//         text: "A few days later, a little girl and her mother came to his door. ",
//       },
//       { startTime: 49.1, endTime: 50.4, text: "It was their kitten!" },
//       { startTime: 51, endTime: 52.8, text: "They were so happy. " },
//       {
//         startTime: 53.1,
//         endTime: 57,
//         text: "Leo felt wonderful helping the kitten find its home. ",
//       },
//       {
//         startTime: 57.5,
//         endTime: 61,
//         text: "Now, Leo wants to have his own cat at home.",
//       },
//     ],
//     timeMarkers: [
//       { time: 0.1, label: "1", color: "red" },
//       { time: 3, label: "2", color: "red" },
//       { time: 9.5, label: "3", color: "red" },
//       { time: 14, label: "4", color: "red" },
//       { time: 16, label: "5", color: "red" },
//       { time: 18.1, label: "6", color: "red" },
//       { time: 20.4, label: "7", color: "red" },
//       { time: 26.8, label: "8", color: "red" },
//       { time: 33.7, label: "9", color: "red" },
//       { time: 39.2, label: "10", color: "red" },
//       { time: 44.5, label: "11", color: "red" },
//       { time: 48.8, label: "12", color: "red" },
//       { time: 50.9, label: "13", color: "red" },
//       { time: 52.9, label: "14", color: "red" },
//       { time: 57.4, label: "15", color: "red" },
//     ],
//     quiz: [
//       {
//         question: "Where did Leo find the kitten?",
//         options: [
//           "Hiding under a car",
//           "In a box",
//           "In the park",
//           "On the street",
//         ],
//         correctAnswer: 0,
//         referenceTime: 9.5,
//         audio: { fast: q10_1fast, slow: q10_1slow },
//       },
//       {
//         question: "What did Leo give the kitten when he took it home?",
//         options: ["Water", "Cat food", "Warm milk", "Cookies"],
//         correctAnswer: 2,
//         referenceTime: 20.4,
//         audio: { fast: q10_2fast, slow: q10_2slow },
//       },
//       {
//         question: "Who gave Leo medicine for the kitten?",
//         options: ["A neighbor", "His mother", "His sister Mia", "A doctor"],
//         correctAnswer: 2,
//         referenceTime: 26.8,
//         audio: { fast: q10_3fast, slow: q10_3slow },
//       },
//       {
//         question: "How did Leo try to find the kitten's owners?",
//         options: [
//           "He called the police",
//           "He went to the vet",
//           "He put up posters and posted online",
//           "He asked neighbors",
//         ],
//         correctAnswer: 2,
//         referenceTime: 33.7,
//         audio: { fast: q10_4fast, slow: q10_4slow },
//       },
//       {
//         question: "Who came to get the kitten?",
//         options: [
//           "A little girl and her mother",
//           "An old man",
//           "Another cat owner",
//           "A young couple",
//         ],
//         correctAnswer: 0,
//         referenceTime: 48.8,
//         audio: { fast: q10_5fast, slow: q10_5slow },
//       },
//     ],
//   },
// ];

// // Change the type definition
// export interface VocabEntry {
//   word: string;
//   definition: string;
//   audioKey?: string; // English filename without extension, used when word is non-Latin
// }

// export const trackFolderMap: Record<string, string> = {
//   "1":  "1.leo's life",
//   "2":  "2. leo's mornings",
//   "3":  "3. leo's favorite food",
//   "4":  "4. leo's family",
//   "5":  "5. leo's clothes",
//   "6":  "6. a day at the beach",
//   "7":  "7. a country that Leo wants to visit",
//   "8":  "8. leo's hobbies",
//   "9":  "9. meeting a friend",
//   "10": "10. the lost kitten",
// };

// export const trackVocabulary: Record<string, VocabEntry[]> = {
//   1: [
//     { word: "квартира",        definition: "набор комнат для проживания на одном этаже здания",  audioKey: "flat"          },
//     { word: "местный магазин", definition: "небольшой магазин в районе",                         audioKey: "local shop"    },
//     { word: "дружелюбный",     definition: "добрый и приятный в общении",                        audioKey: "friendly"      },
//     { word: "простые вещи",    definition: "обычные, несложные занятия или предметы",             audioKey: "simple things" },
//     { word: "добрый",          definition: "заботливый и мягкий по отношению к другим",          audioKey: "kind"          },
//     { word: "выходные",        definition: "суббота и воскресенье",                              audioKey: "weekend"       },
//   ],
//   2: [
//     { word: "распорядок",        definition: "привычный способ делать дела в определённом порядке",         audioKey: "routine"       },
//     { word: "тост с джемом",     definition: "поджаренный хлеб, намазанный фруктовым джемом",               audioKey: "toast with jam"},
//     { word: "одевается",         definition: "надевает одежду",                                             audioKey: "gets dressed"  },
//     { word: "счастливые носки",  definition: "носки, которые, по мнению владельца, приносят удачу",         audioKey: "lucky socks"   },
//     { word: "автобусная остановка", definition: "место, где автобусы останавливаются для посадки и высадки",audioKey: "bus stop"      },
//     { word: "расслабиться",      definition: "отдохнуть и перестать беспокоиться",                          audioKey: "relax"         },
//   ],
//   3: [
//     { word: "пицца",             definition: "круглая плоская основа из теста с томатами, сыром и начинкой", audioKey: "pizza"        },
//     { word: "тесто",             definition: "густая смесь муки и воды для выпечки хлеба или пиццы",         audioKey: "dough"        },
//     { word: "пекарня",           definition: "магазин, где выпекают и продают хлеб и выпечку",               audioKey: "bakery"       },
//     { word: "яблочный пирог",    definition: "выпечка с начинкой из варёных яблок",                          audioKey: "apple pie"    },
//     { word: "лазанья",           definition: "итальянское блюдо из слоёв пасты, мясного соуса и сыра",       audioKey: "lasagna"      },
//     { word: "правильно питаться",definition: "выбирать продукты, полезные для организма",                    audioKey: "eat healthily"},
//   ],
//   "4": [
//     { word: "любящая семья",     definition: "семья, члены которой глубоко заботятся друг о друге",          audioKey: "loving family" },
//     { word: "инженер",           definition: "человек, который проектирует или строит машины и сооружения",  audioKey: "engineer"      },
//     { word: "поблизости",        definition: "недалеко; на небольшом расстоянии",                            audioKey: "nearby"        },
//     { word: "отношения",         definition: "то, как двое людей связаны или относятся друг к другу",        audioKey: "relationship"  },
//     { word: "рыбалка",           definition: "занятие по ловле рыбы",                                        audioKey: "fishing"       },
//     { word: "девушка",           definition: "девушка или женщина, с которой кто-то состоит в романтических отношениях", audioKey: "girlfriend"},
//   ],
//   "5": [
//     { word: "тренды",            definition: "наиболее популярные стили в определённое время",               audioKey: "trends"           },
//     { word: "модный",            definition: "следующий последним тенденциям моды",                          audioKey: "fashionable"      },
//     { word: "удобный",           definition: "создающий ощущение физического комфорта; не тесный и не жёсткий", audioKey: "comfortable"   },
//     { word: "шерстяной свитер",  definition: "тёплый джемпер из шерстяной ткани",                           audioKey: "woolen sweater"   },
//     { word: "фартук",            definition: "защитная одежда, надеваемая поверх одежды во время готовки",   audioKey: "apron"            },
//     { word: "аккуратный и опрятный", definition: "чистый и ухоженный на вид",                               audioKey: "neat and tidy"    },
//   ],
//   "6": [
//     { word: "детство",           definition: "период жизни, когда вы ребёнок",                               audioKey: "childhood"         },
//     { word: "замок из песка",    definition: "модель замка, построенная из песка на пляже",                  audioKey: "sand castle"       },
//     { word: "берег",             definition: "суша вдоль края моря или озера",                               audioKey: "shore"             },
//     { word: "напуганный",        definition: "испытывающий страх или тревогу",                               audioKey: "scared"            },
//     { word: "научил себя сам",   definition: "освоил что-то без чьей-либо помощи",                          audioKey: "taught himself"    },
//     { word: "переплыл реку",     definition: "переправился с одного берега реки на другой",                  audioKey: "crossed the river" },
//   ],
//   "7": [
//     { word: "гондола",           definition: "длинная плоскодонная лодка, используемая в Венеции",           audioKey: "gondola"          },
//     { word: "настоящий",         definition: "реальный и оригинальный, не копия",                            audioKey: "authentic"        },
//     { word: "джелато",           definition: "итальянское мороженое",                                        audioKey: "gelato"           },
//     { word: "копить деньги",     definition: "откладывать деньги для будущих целей",                         audioKey: "saving money"     },
//     { word: "мечта сбылась",     definition: "то, чего очень хотелось и что действительно произошло",        audioKey: "dream come true"  },
//     { word: "опасный",           definition: "способный причинить вред или травму",                          audioKey: "dangerous"        },
//   ],
//   "8": [
//     { word: "спортивное поле",   definition: "открытая площадка для занятий спортом",                        audioKey: "sports field"     },
//     { word: "напряжённый",       definition: "вызывающий сильное беспокойство или усталость",                audioKey: "stressful"        },
//     { word: "сериал",            definition: "набор телевизионных эпизодов с продолжающейся историей",       audioKey: "TV series"        },
//     { word: "криминал и драма",  definition: "жанр историй о преступлениях и эмоциональных событиях",        audioKey: "crime and drama"  },
//     { word: "коллекция DVD",     definition: "набор дисков с записями фильмов или передач",                  audioKey: "DVD collection"   },
//     { word: "классические фильмы", definition: "фильмы, широко признанные высококачественными и непреходящими", audioKey: "classic movies"},
//   ],
//   "9": [
//     { word: "старый друг",       definition: "человек, которого вы знаете уже долгое время",                 audioKey: "old friend"            },
//     { word: "кафе",              definition: "небольшое заведение, где можно купить напитки и лёгкие блюда", audioKey: "cafe"                  },
//     { word: "планы на будущее",  definition: "идеи или решения о том, что делать в дальнейшей жизни",        audioKey: "plans for the future"  },
//     { word: "рабочая поездка",   definition: "путешествие по работе, а не в отпуск",                         audioKey: "work trip"             },
//     { word: "скучать",           definition: "чувствовать грусть из-за того, что кого-то нет рядом",         audioKey: "miss"                  },
//     { word: "попрощался",        definition: "произнёс слова прощания при расставании",                      audioKey: "said goodbye"          },
//   ],
//   "10": [
//     { word: "мяу",               definition: "звук, который издаёт кошка",                                   audioKey: "meow"         },
//     { word: "бережно",           definition: "осторожно и мягко, без усилий",                                audioKey: "gently"       },
//     { word: "ветеринар",         definition: "врач, который лечит животных",                                  audioKey: "veterinarian" },
//     { word: "постеры",           definition: "большие печатные объявления, размещаемые в общественных местах",audioKey: "posters"      },
//     { word: "район",             definition: "территория вокруг вашего дома; местное сообщество",            audioKey: "neighborhood" },
//     { word: "социальные сети",   definition: "сайты и приложения, где люди делятся контентом и общаются",    audioKey: "social media" },
//   ],
// };

// // Helper function to get a specific track
// export const getAudioTrack = (id: string): AudioTrack | undefined => {
//   return audioTracks.find((track) => track.id === id);
// };



//waveformplayer.tsx - monolith code


// import React, { useEffect, useRef, useState, useCallback } from "react";
// import WaveSurfer from "wavesurfer.js";
// import { FaVolumeHigh } from "react-icons/fa6";
// import { FaVolumeMute } from "react-icons/fa";
// import { IoPause, IoPlay, IoRepeat, IoArrowForward } from "react-icons/io5";
// import { MdReplay } from "react-icons/md";
// import { WaveformPlayerProps } from "../../types";
// import { useAppSelector, useAppDispatch } from "../../hooks/hooks";
// import VoiceSwitcher from "./VoiceSwitcher/VoiceSwitcher";
// import { VocabChip } from "./Vocabulary/VocabChip";
// import {
//   setCurrentMarkerIndex,
//   setIsPlaying,
//   setVolume,
//   setIsMuted,
//   setPlaybackRate,
//   // setSubtitlesVisible,
//   setCurrentTime,
//   setDurationSeconds,
//   setDuration,
//   setActiveSubtitle,
// } from "../../store/playerslice";
// import { trackVocabulary } from "../../modules/audiodata/audioData";

// const formatTime = (time: number) => {
//   if (!isFinite(time)) return "0:00";
//   const minutes = Math.floor(time / 60);
//   const seconds = Math.floor(time % 60);
//   return `${minutes}:${seconds.toString().padStart(2, "0")}`;
// };

// interface WaveSurferRef {
//   current: WaveSurfer | null;
// }

// // ─── speed sequence per repeat count ──────────────────────────────────
// // repeatCount 1 → play once  at x1.0
// // repeatCount 2 → play twice: x0.8, then x1.0
// // repeatCount 3 → play three: x0.5, x0.8, then x1.0
// const SPEED_SEQUENCES: Record<number, number[]> = {
//   1: [1.0],
//   2: [0.8, 1.0],
//   3: [0.5, 0.8, 1.0],
// };

// const WaveformPlayer: React.FC<WaveformPlayerProps> = React.memo(
//   ({
//     audioUrl,
//     trackId,
//     subtitles,
//     timeMarkers,
//     onAudioComplete,
//     onWavesurferMount,
//   }) => {
//     const waveformRef = useRef<HTMLDivElement>(null);
//     const wavesurfer: WaveSurferRef = useRef(null);
//     const playbackRates: number[] = [0.5, 0.8, 1.0];

//     const [isInitialized, setIsInitialized] = useState(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const previousAudioUrl = useRef<string | null>(null);
//     const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//     const [repeatCount, setRepeatCount] = useState(2);
//     const [isControlledMode, setIsControlledMode] = useState(false);

//     const currentRepeatRef = useRef(0);
//     const isSegmentTransitioningRef = useRef(false);

//     const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);

//     const dispatch = useAppDispatch();

//     const {
//       currentMarkerIndex,
//       isPlaying,
//       volume,
//       isMuted,
//       playbackRate,
//       subtitlesVisible,
//       currentTime,
//       durationSeconds,
//       duration,
//       activeSubtitle,
//     } = useAppSelector((state) => state.player);

//     const currentVocabulary = trackVocabulary[trackId] ?? [];

//     const currentMarkerIndexRef = useRef(currentMarkerIndex);
//     useEffect(() => {
//       currentMarkerIndexRef.current = currentMarkerIndex;
//     }, [currentMarkerIndex]);

//     const repeatCountRef = useRef(repeatCount);
//     useEffect(() => {
//       repeatCountRef.current = repeatCount;
//     }, [repeatCount]);

//     const isControlledModeRef = useRef(isControlledMode);
//     useEffect(() => {
//       isControlledModeRef.current = isControlledMode;
//     }, [isControlledMode]);

//     const durationSecondsRef = useRef(durationSeconds);
//     useEffect(() => {
//       durationSecondsRef.current = durationSeconds;
//     }, [durationSeconds]);

//     const timeMarkersRef = useRef(timeMarkers);
//     useEffect(() => {
//       timeMarkersRef.current = timeMarkers;
//     }, [timeMarkers]);

//     // ─── At the top of the file, add this helper ──────────────────────────────────
//     const vocabAudioRef = useRef<HTMLAudioElement | null>(null);

//     const playVocabWord = useCallback(
//       (word: string) => {
//         // Normalise: lowercase, replace spaces with underscores (adjust if your
//         // filenames use a different convention)
//         const fileName = word.toLowerCase().replace(/\s+/g, "_");

//         // Stop any previously playing vocab audio
//         if (vocabAudioRef.current) {
//           vocabAudioRef.current.pause();
//           vocabAudioRef.current.currentTime = 0;
//         }

//         // Build the path — Vite resolves /src/assets at build time via imports,
//         // but for dynamic paths we use the public folder OR a dynamic import map.
//         // Easiest zero-config approach: put vocab audio in /public/vocab/{trackId}/
//         // and reference them with a plain URL string.
//         const audio = new Audio(`/vocab/${trackId}/${fileName}.mp3`);
//         vocabAudioRef.current = audio;
//         audio.play().catch((err) => console.warn("Vocab audio error:", err));
//       },
//       [trackId],
//     );

//     // ─── NEW: ref so the rAF loop reads the live playbackRate ──────────────────
//     const playbackRateRef = useRef(playbackRate);
//     useEffect(() => {
//       playbackRateRef.current = playbackRate;
//     }, [playbackRate]);

//     // ─── Helpers ────────────────────────────────────────────────────────────────

//     const getSegmentBounds = useCallback(
//       (markerIndex: number): { start: number; end: number } => {
//         const markers = timeMarkersRef.current;
//         const dur = durationSecondsRef.current;

//         if (!markers?.length || markerIndex < 0) {
//           return { start: 0, end: dur || Infinity };
//         }

//         const currentMarker = markers[markerIndex];
//         const nextMarker = markers[markerIndex + 1];

//         const start =
//           typeof currentMarker === "object"
//             ? currentMarker.time
//             : currentMarker;
//         const end = nextMarker
//           ? typeof nextMarker === "object"
//             ? nextMarker.time
//             : nextMarker
//           : dur || Infinity;

//         return { start, end };
//       },
//       [],
//     );

//     const updateActiveSubtitle = useCallback(
//       (currentTimeValue: number) => {
//         if (!subtitles?.length) {
//           dispatch(setActiveSubtitle(""));
//           return;
//         }
//         const currentSubtitle = subtitles.find(
//           (sub) =>
//             currentTimeValue >= sub.startTime &&
//             currentTimeValue <= sub.endTime,
//         );
//         dispatch(
//           setActiveSubtitle(currentSubtitle ? currentSubtitle.text : ""),
//         );
//       },
//       [subtitles, dispatch],
//     );

//     const onAudioCompleteRef = useRef(onAudioComplete);
//     useEffect(() => {
//       onAudioCompleteRef.current = onAudioComplete;
//     }, [onAudioComplete]);

//     // ─── NEW: apply a speed to both WaveSurfer and Redux ──────────────────────
//     const applySpeed = useCallback(
//       (rate: number) => {
//         dispatch(setPlaybackRate(rate));
//         playbackRateRef.current = rate;
//         wavesurfer.current?.setPlaybackRate(rate);
//       },
//       [dispatch],
//     );

//     // ─── Segment playback engine (rAF loop) ──────────────────────────────────

//     const isPlayingRef = useRef(false);
//     const rafRef = useRef<number | null>(null);

//     useEffect(() => {
//       isPlayingRef.current = isPlaying;
//     }, [isPlaying]);

//     useEffect(() => {
//       if (!isInitialized) return;

//       const instance = wavesurfer.current;
//       if (!instance) return;

//       let isCancelled = false;

//       const tick = () => {
//         if (isCancelled) return;

//         if (isPlayingRef.current && instance) {
//           const now = instance.getCurrentTime();
//           dispatch(setCurrentTime(formatTime(now)));
//           updateActiveSubtitle(now);

//           if (
//             timeMarkersRef.current?.length &&
//             !isSegmentTransitioningRef.current
//           ) {
//             const idx = currentMarkerIndexRef.current;
//             const { end } = getSegmentBounds(idx);

//             if (now >= end - 0.05) {
//               isSegmentTransitioningRef.current = true;
//               instance.pause();

//               currentRepeatRef.current += 1;

//               if (currentRepeatRef.current < repeatCountRef.current) {
//                 // ── NEW: advance to next speed in the sequence ──────────────
//                 // e.g. repeatCount=3, plays 0→x0.5, 1→x0.8, 2→x1.0
//                 // currentRepeatRef is already incremented above, so it points
//                 // to the *next* play index.
//                 const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
//                 const nextSpeed = seq[currentRepeatRef.current] ?? 1.0;
//                 dispatch(setPlaybackRate(nextSpeed));
//                 playbackRateRef.current = nextSpeed;
//                 // ─────────────────────────────────────────────────────────────

//                 // Repeat same segment after 1 second
//                 setTimeout(() => {
//                   if (isCancelled || !wavesurfer.current) return;
//                   // Apply speed right before resuming so WaveSurfer is ready
//                   wavesurfer.current.setPlaybackRate(nextSpeed);
//                   const { start } = getSegmentBounds(
//                     currentMarkerIndexRef.current,
//                   );
//                   wavesurfer.current.setTime(start);
//                   setTimeout(() => {
//                     if (isCancelled || !wavesurfer.current) return;
//                     isSegmentTransitioningRef.current = false;
//                     isPlayingRef.current = true;
//                     wavesurfer.current.play();
//                   }, 50);
//                 }, 1000);
//               } else {
//                 // All repeats done — reset speed to x1.0 for the next segment
//                 currentRepeatRef.current = 0;

//                 // ── NEW: always reset to x1.0 between segments ──────────────
//                 dispatch(setPlaybackRate(1.0));
//                 playbackRateRef.current = 1.0;
//                 // ─────────────────────────────────────────────────────────────

//                 const nextIdx = idx + 1;
//                 const markers = timeMarkersRef.current;

//                 if (nextIdx < markers.length) {
//                   if (isControlledModeRef.current) {
//                     const nextMarker = markers[nextIdx];
//                     const nextTime =
//                       typeof nextMarker === "object"
//                         ? nextMarker.time
//                         : nextMarker;

//                     setTimeout(() => {
//                       if (isCancelled || !wavesurfer.current) return;
//                       dispatch(setCurrentMarkerIndex(nextIdx));
//                       wavesurfer.current.setTime(nextTime);
//                       isSegmentTransitioningRef.current = false;
//                       isPlayingRef.current = false;
//                       dispatch(setIsPlaying(false));
//                     }, 200);
//                   } else {
//                     // ── NEW: set speed for the first play of the next segment ─
//                     const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [
//                       1.0,
//                     ];
//                     const firstSpeed = seq[0] ?? 1.0;
//                     dispatch(setPlaybackRate(firstSpeed));
//                     playbackRateRef.current = firstSpeed;
//                     // ──────────────────────────────────────────────────────────

//                     setTimeout(() => {
//                       if (isCancelled || !wavesurfer.current) return;
//                       const nextMarker = markers[nextIdx];
//                       const nextTime =
//                         typeof nextMarker === "object"
//                           ? nextMarker.time
//                           : nextMarker;
//                       dispatch(setCurrentMarkerIndex(nextIdx));
//                       wavesurfer.current.setTime(nextTime);
//                       wavesurfer.current.setPlaybackRate(firstSpeed); // apply to instance
//                       setTimeout(() => {
//                         if (isCancelled || !wavesurfer.current) return;
//                         isSegmentTransitioningRef.current = false;
//                         isPlayingRef.current = true;
//                         wavesurfer.current.play();
//                       }, 50);
//                     }, 1000);
//                   }
//                 } else {
//                   // Last segment finished
//                   isSegmentTransitioningRef.current = false;
//                   isPlayingRef.current = false;
//                   dispatch(setIsPlaying(false));
//                   onAudioCompleteRef.current?.(); // fires when last segment completes
//                 }
//               }
//             }
//           }
//         }

//         rafRef.current = requestAnimationFrame(tick);
//       };

//       rafRef.current = requestAnimationFrame(tick);

//       return () => {
//         isCancelled = true;
//         if (rafRef.current !== null) {
//           cancelAnimationFrame(rafRef.current);
//           rafRef.current = null;
//         }
//       };
//     }, [isInitialized, getSegmentBounds, updateActiveSubtitle, dispatch]);

//     // ─── Audio URL change ────────────────────────────────────────────────────────

//     useEffect(() => {
//       if (previousAudioUrl.current !== audioUrl) {
//         setIsLoading(true);
//         setIsInitialized(false);

//         dispatch(setCurrentMarkerIndex(0));
//         dispatch(setIsPlaying(false));
//         dispatch(setCurrentTime("0:00"));
//         dispatch(setDuration("0:00"));
//         dispatch(setDurationSeconds(0));
//         dispatch(setActiveSubtitle(""));

//         previousAudioUrl.current = audioUrl;
//       }
//     }, [audioUrl, dispatch]);

//     // ─── WaveSurfer initialisation ───────────────────────────────────────────────

//     useEffect(() => {
//       if (!waveformRef.current || !audioUrl) return;

//       if (wavesurfer.current) {
//         wavesurfer.current.pause();
//         wavesurfer.current.destroy();
//         wavesurfer.current = null;
//         dispatch(setIsPlaying(false));
//       }

//       setIsLoading(true);
//       setIsInitialized(false);

//       wavesurfer.current = WaveSurfer.create({
//         container: waveformRef.current,
//         waveColor: "rgb(26, 26, 26)",
//         progressColor: "rgb(0, 209, 70)",
//         cursorColor: "#008206ff",
//         barWidth: 3,
//         barRadius: 2,
//         cursorWidth: 3,
//         height: 30,
//         barGap: 2,
//         normalize: true,
//         fillParent: true,
//         mediaControls: false,
//         hideScrollbar: true,
//         interact: true,
//       });

//       const instance = wavesurfer.current;

//       instance.on("ready", () => {
//         instance.setVolume(isMuted ? 0 : volume);
//         instance.setPlaybackRate(playbackRate);

//         const totalDuration = instance.getDuration();
//         dispatch(setDurationSeconds(totalDuration));
//         dispatch(setDuration(formatTime(totalDuration)));

//         setIsInitialized(true);
//         requestAnimationFrame(() => setIsLoading(false));

//         if (onWavesurferMount) onWavesurferMount(instance);
//       });

//       instance.on("play", () => dispatch(setIsPlaying(true)));
//       instance.on("pause", () => dispatch(setIsPlaying(false)));
//       instance.on("finish", () => {
//         dispatch(setIsPlaying(false));
//         // Fires when there are NO time markers — free continuous playback
//         onAudioCompleteRef.current?.();
//       });
//       instance.on("error", (error) => {
//         console.error("WaveSurfer error:", error);
//         dispatch(setIsPlaying(false));
//       });

//       const handlePointerMove = (e: PointerEvent) => {
//         const hover = waveformRef.current?.querySelector(
//           "#hover",
//         ) as HTMLElement;
//         if (hover) hover.style.width = `${e.offsetX}px`;
//       };
//       waveformRef.current.addEventListener("pointermove", handlePointerMove);

//       instance.load(audioUrl);

//       return () => {
//         if (intervalRef.current) clearTimeout(intervalRef.current);
//         waveformRef.current?.removeEventListener(
//           "pointermove",
//           handlePointerMove,
//         );
//         if (instance) {
//           instance.unAll();
//           instance.destroy();
//         }
//         setIsInitialized(false);
//       };
//     }, [audioUrl]);

//     // ─── Controls ────────────────────────────────────────────────────────────────

//     const handlePlayPause = useCallback(() => {
//       if (!wavesurfer.current || !isInitialized) return;

//       try {
//         if (isPlaying) {
//           wavesurfer.current.pause();
//         } else {
//           if (timeMarkersRef.current?.length) {
//             const current = wavesurfer.current.getCurrentTime();
//             const { start, end } = getSegmentBounds(
//               currentMarkerIndexRef.current,
//             );

//             if (current < start || current >= end - 0.05) {
//               wavesurfer.current.setTime(start);
//             }
//           }
//           isSegmentTransitioningRef.current = false;

//           // ── NEW: on manual play, reset to the first speed of the sequence ──
//           currentRepeatRef.current = 0;
//           const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
//           const firstSpeed = seq[0] ?? 1.0;
//           applySpeed(firstSpeed);
//           wavesurfer.current.setPlaybackRate(firstSpeed);
//           // ───────────────────────────────────────────────────────────────────

//           wavesurfer.current.play();
//         }
//       } catch (error) {
//         console.error("Playback error:", error);
//         dispatch(setIsPlaying(false));
//       }
//     }, [isPlaying, isInitialized, getSegmentBounds, applySpeed, dispatch]);

//     const goToNextSentence = useCallback(() => {
//       if (
//         !timeMarkersRef.current?.length ||
//         currentMarkerIndexRef.current >= timeMarkersRef.current.length - 1 ||
//         !wavesurfer.current
//       )
//         return;

//       const nextIdx = currentMarkerIndexRef.current + 1;
//       const nextMarker = timeMarkersRef.current[nextIdx];
//       const nextTime =
//         typeof nextMarker === "object" ? nextMarker.time : nextMarker;

//       // ── NEW: reset to first speed when skipping forward ────────────────────
//       currentRepeatRef.current = 0;
//       isSegmentTransitioningRef.current = false;
//       const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
//       const firstSpeed = seq[0] ?? 1.0;
//       applySpeed(firstSpeed);
//       wavesurfer.current.setPlaybackRate(firstSpeed);
//       // ───────────────────────────────────────────────────────────────────────

//       dispatch(setCurrentMarkerIndex(nextIdx));
//       wavesurfer.current.setTime(nextTime);
//       wavesurfer.current.play();
//     }, [applySpeed, dispatch]);

//     const replayCurrentSentence = useCallback(() => {
//       if (!timeMarkersRef.current?.length || !wavesurfer.current) return;

//       const { start } = getSegmentBounds(currentMarkerIndexRef.current);

//       // ── NEW: reset to first speed on replay ────────────────────────────────
//       currentRepeatRef.current = 0;
//       isSegmentTransitioningRef.current = false;
//       const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
//       const firstSpeed = seq[0] ?? 1.0;
//       applySpeed(firstSpeed);
//       wavesurfer.current.setPlaybackRate(firstSpeed);
//       // ───────────────────────────────────────────────────────────────────────

//       wavesurfer.current.setTime(start);
//       setTimeout(() => wavesurfer.current?.play(), 10);
//     }, [getSegmentBounds, applySpeed]);

//     const handleMuteToggle = useCallback(() => {
//       const newMuted = !isMuted;
//       dispatch(setIsMuted(newMuted));
//       wavesurfer.current?.setVolume(newMuted ? 0 : volume);
//     }, [isMuted, volume, dispatch]);

//     // ── MODIFIED: changePlaybackRate still works as a manual override ──────────
//     // If user manually picks a speed, we honour it but also reset the repeat
//     // counter so the sequence restarts cleanly from the chosen speed.
//     const changePlaybackRate = useCallback(
//       (rate: number) => {
//         applySpeed(rate);
//         currentRepeatRef.current = 0;
//         isSegmentTransitioningRef.current = false;
//         wavesurfer.current?.setPlaybackRate(rate);
//       },
//       [applySpeed],
//     );

//     // const toggleSubtitles = useCallback(() => {
//     //   dispatch(setSubtitlesVisible(!subtitlesVisible));
//     // }, [subtitlesVisible, dispatch]);

//     // ── MODIFIED: when repeatCount changes, immediately jump to its first speed
//     const handleSetRepeatCount = useCallback(
//       (count: number) => {
//         setRepeatCount(count);
//         currentRepeatRef.current = 0;
//         isSegmentTransitioningRef.current = false;

//         // Auto-select the first speed for the chosen repeat count
//         const seq = SPEED_SEQUENCES[count] ?? [1.0];
//         const firstSpeed = seq[0] ?? 1.0;
//         applySpeed(firstSpeed);
//         if (wavesurfer.current) {
//           wavesurfer.current.setPlaybackRate(firstSpeed);
//         }
//       },
//       [applySpeed],
//     );

//     const toggleControlledMode = useCallback(() => {
//       setIsControlledMode((prev) => !prev);
//     }, []);

//     const handleMarkerClick = useCallback(
//       async (time: number) => {
//         if (!wavesurfer.current) return;
//         try {
//           const markers = timeMarkersRef.current;
//           const dur = durationSecondsRef.current;

//           const markerIndex = markers.findIndex((marker, index) => {
//             const markerTime =
//               typeof marker === "object" ? marker.time : marker;
//             const nextMarker = markers[index + 1];
//             const nextTime = nextMarker
//               ? typeof nextMarker === "object"
//                 ? nextMarker.time
//                 : nextMarker
//               : dur;
//             return time >= markerTime && time < nextTime;
//           });

//           if (markerIndex >= 0) dispatch(setCurrentMarkerIndex(markerIndex));

//           // ── NEW: reset to first speed on marker click ──────────────────────
//           currentRepeatRef.current = 0;
//           isSegmentTransitioningRef.current = false;
//           const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
//           const firstSpeed = seq[0] ?? 1.0;
//           applySpeed(firstSpeed);
//           wavesurfer.current.setPlaybackRate(firstSpeed);
//           // ───────────────────────────────────────────────────────────────────

//           wavesurfer.current.seekTo(time / dur);
//           await new Promise((r) => setTimeout(r, 50));
//           await wavesurfer.current.play();
//           dispatch(setIsPlaying(true));
//         } catch (error) {
//           console.error("handleMarkerClick error:", error);
//           dispatch(setIsPlaying(false));
//         }
//       },
//       [applySpeed, dispatch],
//     );

//     // ─── Click-outside for speed dropdown ────────────────────────────────────

//     useEffect(() => {
//       const handleClickOutside = (event: MouseEvent) => {
//         if (
//           event.target instanceof Element &&
//           !event.target.closest(".speed-dropdown")
//         ) {
//           setIsSpeedDropdownOpen(false);
//         }
//       };
//       document.addEventListener("mousedown", handleClickOutside);
//       return () =>
//         document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     // ─── Keyboard shortcuts ───────────────────────────────────────────────────

//     useEffect(() => {
//       const handleKeyPress = (e: KeyboardEvent) => {
//         switch (e.code) {
//           case "Space":
//             e.preventDefault();
//             handlePlayPause();
//             break;
//           case "ArrowRight":
//             goToNextSentence();
//             break;
//           case "KeyR":
//             replayCurrentSentence();
//             break;
//         }
//       };
//       window.addEventListener("keydown", handleKeyPress);
//       return () => window.removeEventListener("keydown", handleKeyPress);
//     }, [handlePlayPause, goToNextSentence, replayCurrentSentence]);

//     // ─── Render markers ──────────────────────────────────────────────────────

//     const renderTimeMarkers = useCallback(() => {
//       if (durationSeconds === 0) return null;
//       return (
//         <div className="absolute top-0 left-0 right-0 h-full bottom-0">
//           {timeMarkers.map((marker, index) => {
//             const position = (marker.time / durationSeconds) * 100;
//             return (
//               <div
//                 key={index}
//                 className="absolute top-0 bottom-0 w-0.5 md:w-[2px] cursor-pointer transition-opacity duration-300 z-10 hover:opacity-80"
//                 style={{
//                   left: `${position}%`,
//                   backgroundColor: marker.color || "red",
//                 }}
//                 onClick={() => handleMarkerClick(marker.time)}
//                 title={`Jump to ${marker.label}`}
//               >
//                 <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/75 text-white px-1.5 py-0.5 md:px-[6px] md:py-0.5 rounded text-[11px] md:text-[11px] whitespace-nowrap">
//                   {marker.label}
//                 </span>
//               </div>
//             );
//           })}
//         </div>
//       );
//     }, [durationSeconds, timeMarkers, handleMarkerClick]);

//     // ─── JSX ─────────────────────────────────────────

//     return (
//       <div className="waveform-overlay">
//         {isLoading && (
//           <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
//             <div className="flex flex-col items-center gap-2">
//               <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
//               <span className="text-white text-sm">Loading audio...</span>
//             </div>
//           </div>
//         )}

//         <div
//           ref={waveformRef}
//           className="w-full bg-white/60 h-[30px] sm:h-[30px] md:h-8 mx-auto rounded-lg overflow-visible relative px-0.5 group"
//         >
//           <div
//             id="hover"
//             className="absolute left-0 top-0 z-10 pointer-events-none h-[30px] sm:h-[20px] md:h-8 w-0 mix-blend-overlay bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
//           />
//           <div
//             id="time"
//             className="absolute z-[11] bottom-[5px] left-[5px] text-[11px] md:text-[10px] bg-black/75 px-1.5 py-0.5 md:px-1 md:py-[1px] text-[#ddd] rounded-[3px] pointer-events-none"
//           >
//             {currentTime}
//           </div>
//           <div
//             id="duration"
//             className="absolute z-[11] bottom-[5px] right-[5px] text-[11px] md:text-[10px] bg-black/75 px-1.5 py-0.5 md:px-1 md:py-[1px] text-[#ddd] rounded-[3px] pointer-events-none"
//           >
//             {duration}
//           </div>
//           {isInitialized && !isLoading && timeMarkers && renderTimeMarkers()}
//         </div>

//         <div
//           className={`relative w-full bg-[#212121ff] mt-5 md:mt-2.5 p-1.5 h-[70px] md:h-10 text-white font-mono rounded z-10 flex items-center justify-center ${
//             subtitlesVisible ? "flex" : "hidden"
//           }`}
//         >
//           <p className="text-sm sm:text-base md:text-xl text-white tracking-[0px] font-medium font-['Montserrat']">
//             {activeSubtitle}
//           </p>
//         </div>

//         <div className="max-w-[1100px] bg-white/60 mx-auto p-[35px] rounded-2xl md:p-5 sm:p-4 flex flex-col justify-between items-center gap-5 md:gap-4 sm:gap-3 mt-[15px]">
//           <div className="flex items-center justify-evenly w-full gap-5 md:gap-3 sm:gap-2.5">
//             <div className="flex items-center gap-[15px] md:gap-3 sm:gap-2.5">
//               {/* <button
//                 className="bg-black/90 text-white border-2 border-[#ddd] rounded-full w-8 h-8 md:w-8 md:h-8 sm:w-11 sm:h-11 flex items-center justify-center cursor-pointer text-black transition-all duration-200 hover:bg-[#05df3bff] hover:text-white hover:border-green-500 active:scale-95"
//                 onClick={replayCurrentSentence}
//                 title="Replay current segment"
//               >
//                 <IoRepeat className="text-[20px] md:text-[22px] sm:text-[20px]" />
//               </button> */}

//               {[3, 2, 1].map((count) => (
//                 <button
//                   key={count}
//                   className={`border-2 rounded-full w-10 h-10 md:w-12 md:h-12 sm:w-11 sm:h-11 flex items-center justify-center cursor-pointer text-xs font-medium font-['Montserrat'] transition-all duration-200 active:scale-95
//                   ${
//                     repeatCount === count
//                       ? "bg-[#05df3bff] text-black border-green-500"
//                       : "bg-black/90 text-white/90 border-[#ddd] text-black hover:bg-[#05df3bff] hover:text-white hover:border-green-500"
//                   }`}
//                   onClick={() => handleSetRepeatCount(count)}
//                   title={`Repeat each segment ${count} time${count > 1 ? "s" : ""}`}
//                 >
//                   x{count}
//                 </button>
//               ))}

//               {/* <button
//                 className="bg-black/90 border-2 border-[#ddd] rounded-full w-10 h-10 md:w-8 md:h-8 sm:w-11 sm:h-11 flex items-center justify-center cursor-pointer text-black transition-all duration-200 hover:bg-[#05df3bff] hover:text-white hover:border-green-500 active:scale-95"
//                 onClick={goToNextSentence}
//                 title="Skip to next segment"
//               >
//                 <IoArrowForward className="text-[20px] text-white md:text-[22px] sm:text-[20px]" />
//               </button> */}
//             </div>

//             <div className="flex items-center gap-[15px] md:gap-3 sm:gap-2.5">
//               {playbackRates.map((speed) => (
//                 <button
//                   key={speed}
//                   className={`border-2 text-white rounded-full w-10 h-10 md:w-12 md:h-12 sm:w-11 sm:h-11 flex items-center justify-center cursor-pointer text-xs font-medium font-['Montserrat'] transition-all duration-200 active:scale-95
//                   ${
//                     playbackRate === speed
//                       ? "bg-[#05df3bff] text-black border-green-500"
//                       : "bg-black/90 border-[#ddd] text-black hover:bg-[#05df3bff] hover:text-white hover:border-green-500"
//                   }`}
//                   onClick={() => changePlaybackRate(speed)}
//                 >
//                   x{speed}
//                 </button>
//               ))}
//             </div>
//           </div>
//           {/* <button
//                 className={`${
//                   subtitlesVisible
//                     ? "bg-[#05df3bff] text-black border-[#05df3bff] hover:bg-[#05df3bff]"
//                     : "bg-white/90 text-black border-white/90 hover:bg-white/80"
//                 } px-2 py-1 md:px-5 md:py-2.5 sm:px-4 sm:py-2 rounded cursor-pointer text-xs md:text-[11px] sm:text-[10px] transition-all duration-200 ease-in-out flex items-center justify-center gap-[5px] tracking-wider font-semibold font-['Montserrat'] border-2 active:scale-95 w-[50px]`}
//                 onClick={toggleSubtitles}
//               >
//                 CC
//               </button> */}
//           <div className="flex items-center w-full">
//             {/* LEFT — VoiceSwitcher anchored to the left */}
//             <div className="flex-1 flex justify-start">
//               <VoiceSwitcher />
//             </div>

//             {/* CENTRE — Play/Pause + Controlled mode */}
//             <div className="flex items-center gap-5 md:gap-4 sm:gap-3">
//               <button
//                 className="p-3 md:p-2 sm:p-1 border-none bg-black/90 text-white rounded-full cursor-pointer hover:bg-black/50 transition-all duration-200 active:scale-95 flex items-center justify-center flex-shrink-0"
//                 onClick={handlePlayPause}
//                 title="Play / Pause (continuous)"
//               >
//                 {isPlaying ? (
//                   <IoPause className="text-whtite text-[28px] md:text-[32px] sm:text-[30px] w-[50px] h-[50px] md:w-[60px] md:h-[60px] sm:w-[55px] sm:h-[55px]" />
//                 ) : (
//                   <IoPlay className="text-white text-[28px] md:text-[32px] sm:text-[30px] w-[50px] h-[50px] md:w-[60px] md:h-[60px] sm:w-[55px] sm:h-[55px]" />
//                 )}
//               </button>

//               <button
//                 className={`p-3 md:p-2 text-white sm:p-1 border-2 rounded-full cursor-pointer transition-all duration-200 active:scale-95 flex items-center justify-center flex-shrink-0
//         ${
//           isControlledMode
//             ? "bg-[#05df3bff] border-green-500 hover:bg-[#04c934]"
//             : "bg-black/90 border-[#ddd] hover:bg-black/50"
//         }`}
//                 onClick={toggleControlledMode}
//                 title={
//                   isControlledMode
//                     ? "Controlled mode ON — stops after each segment"
//                     : "Controlled mode OFF — plays continuously"
//                 }
//               >
//                 {isPlaying && !isControlledMode ? (
//                   <MdReplay className="text-white text-[28px] md:text-[32px] sm:text-[30px] w-[30px] h-[30px] md:w-[30px] md:h-[30px] sm:w-[35px] sm:h-[35px]" />
//                 ) : (
//                   <MdReplay
//                     className={`text-[28px] text-white md:text-[32px] sm:text-[30px] w-[30px] h-[30px] md:w-[30px] md:h-[30px] sm:w-[35px] sm:h-[35px] ${isControlledMode ? "text-white" : "text-black"}`}
//                   />
//                 )}
//               </button>
//             </div>

//             {/* RIGHT — balancing spacer */}
//             <div className="flex-1" />
//           </div>

//           <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 w-full justify-center">
//             <div
//               className="cursor-pointer text-black/90 flex items-center hover:text-white transition-colors duration-200"
//               onClick={handleMuteToggle}
//             >
//               {isMuted ? (
//                 <FaVolumeMute className="text-[18px color-black/90 sm:text-[22px] md:text-[30px]" />
//               ) : (
//                 <FaVolumeHigh className="text-[18px] sm:text-[22px] md:text-[30px]" />
//               )}
//             </div>

//             <div className="flex flex-col items-center gap-0.5">
//               <input
//                 type="range"
//                 list="volume-ticks"
//                 min="0"
//                 max="10"
//                 step="1"
//                 value={isMuted ? 0 : Math.round(volume * 10)}
//                 onChange={(e) => {
//                   const stepped = parseInt(e.target.value, 10);
//                   const normalized = stepped / 10;
//                   dispatch(setVolume(normalized));
//                   dispatch(setIsMuted(stepped === 0));
//                   wavesurfer.current?.setVolume(normalized);
//                 }}
//                 className="w-[120px] sm:w-[140px] md:w-[220px] h-[3px] bg-black/90 rounded-[3px] outline-none cursor-pointer appearance-none
//       [&::-webkit-slider-thumb]:appearance-none
//       [&::-webkit-slider-thumb]:w-4
//       [&::-webkit-slider-thumb]:h-4
//       [&::-webkit-slider-thumb]:w-4
//       [&::-webkit-slider-thumb]:h-4
//       [&::-webkit-slider-thumb]:bg-white
//       [&::-webkit-slider-thumb]:rounded-full
//       [&::-webkit-slider-thumb]:cursor-pointer
//       [&::-webkit-slider-thumb]:transition-all
//       [&::-webkit-slider-thumb]:duration-200
//       [&::-webkit-slider-thumb]:hover:bg-[#05df3bff]
//       [&::-webkit-slider-thumb]:hover:scale-110
//       [&::-moz-range-thumb]:w-4
//       [&::-moz-range-thumb]:h-4
//       [&::-moz-range-thumb]:bg-white
//       [&::-moz-range-thumb]:rounded-full
//       [&::-moz-range-thumb]:cursor-pointer
//       [&::-moz-range-thumb]:border-none
//       [&::-moz-range-thumb]:transition-all
//       [&::-moz-range-thumb]:duration-200
//       [&::-moz-range-thumb]:hover:bg-[#05df3bff]
//       [&::-moz-range-thumb]:hover:scale-110"
//               />

//               <div className="flex justify-between w-[120px] sm:w-[140px] md:w-[220px] px-[2px]">
//                 {Array.from({ length: 11 }, (_, i) => (
//                   <div key={i} className="flex flex-col items-center gap-[2px]">
//                     <div className="w-[1px] h-[5px] bg-white/40" />
//                     <span className="text-black/80 text-[8px] sm:text-[9px] md:text-[10px] font-['Montserrat'] leading-none select-none">
//                       {i}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         {currentVocabulary.length > 0 && (
//           <div className="max-w-[1100px] mx-auto px-5 pb-6 mt-2">
//             <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold font-['Montserrat'] mb-3">
//               Key Vocabulary
//             </p>
//             <div className="flex flex-wrap gap-2">
//               {currentVocabulary.map(({ word, audioKey }) => (
//                 <VocabChip
//                   key={word}
//                   word={word}
//                   // definition={definition}
//                   audioKey={audioKey}
//                   onPlay={playVocabWord}
//                   volume={isMuted ? 0 : volume}
//                 />
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   },
// );

// WaveformPlayer.displayName = "WaveformPlayer";

// export default WaveformPlayer;



// import React from 'react';
// import { IoPause, IoPlay, IoRepeat, IoArrowForward } from "react-icons/io5";
// import {
//   ControlsContainer,
//   Button,
//   PlayModeContainer,
//   PlayModeToggle,
//   NavigationControls,
//   NavButton,
//   SubtitlesButton
// } from '../../../styledComponents';
// import { VolumeControl } from './VolumeControl';
// import { SpeedControl } from './SpeedControl';

// interface PlayerControlsProps {
//   isPlaying: boolean;
//   isPlayMode: boolean;
//   subtitlesVisible: boolean;
//   handlePlayPause: () => void;
//   togglePlayMode: () => void;
//   replayCurrentSentence: () => void;
//   goToNextSentence: () => void;
//   toggleSubtitles: () => void;
// }

// export const PlayerControls: React.FC<PlayerControlsProps> = React.memo(({
//   isPlaying,
//   isPlayMode,
//   subtitlesVisible,
//   handlePlayPause,
//   togglePlayMode,
//   replayCurrentSentence,
//   goToNextSentence,
//   toggleSubtitles
// }) => {
//   return (
//     <ControlsContainer>
//       <PlayModeContainer>
//         <PlayModeToggle $active={isPlayMode} onClick={togglePlayMode}>
//           Sentence Mode: {isPlayMode ? "ON" : "OFF"}
//         </PlayModeToggle>
//         <NavigationControls>
//           <NavButton disabled={!isPlayMode} onClick={replayCurrentSentence}>
//             <IoRepeat style={{ fontSize: "24px" }} />
//           </NavButton>
//           <NavButton disabled={!isPlayMode} onClick={goToNextSentence}>
//             <IoArrowForward style={{ fontSize: "24px" }} />
//           </NavButton>
//         </NavigationControls>
//       </PlayModeContainer>

//       <Button onClick={handlePlayPause}>
//         {isPlaying ? (
//           <IoPause style={{ fontSize: "30px", width: "60px", height: "60px", borderRadius: "30px" }} />
//         ) : (
//           <IoPlay style={{ fontSize: "30px", width: "60px", height: "60px", borderRadius: "30px" }} />
//         )}
//       </Button>

//       <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
//         <VolumeControl />
//         <SpeedControl />
//       </div>

//       <SubtitlesButton onClick={toggleSubtitles} $active={subtitlesVisible}>
//         CC
//       </SubtitlesButton>
//     </ControlsContainer>
//   );
// });

// PlayerControls.displayName = 'PlayerControls';


// import React, { useCallback } from 'react';
// import { FaVolumeHigh, FaVolumeXmark } from "react-icons/fa6";
// import { VolumeControl as VolumeContainer, VolumeIcon, VolumeSlider } from '../../../styledComponents';
// import { useAppSelector, useAppDispatch } from '../../../hooks/hooks';
// import { setVolume, setIsMuted } from '../../../store/playerslice';

// export const VolumeControl: React.FC = React.memo(() => {
//   const dispatch = useAppDispatch();
//   const { volume, isMuted } = useAppSelector((state) => state.player);

//   const handleMuteToggle = useCallback(() => {
//     const newMutedState = !isMuted;
//     dispatch(setIsMuted(newMutedState));
//   }, [isMuted, dispatch]);

//   const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     const newVolume = parseFloat(e.target.value);
//     dispatch(setVolume(newVolume));
//     dispatch(setIsMuted(newVolume === 0));
//   }, [dispatch]);

//   return (
//     <VolumeContainer>
//       <VolumeIcon onClick={handleMuteToggle}>
//         {isMuted ? <FaVolumeXmark size={24} /> : <FaVolumeHigh size={24} />}
//       </VolumeIcon>
//       <VolumeSlider
//         type="range"
//         min="0"
//         max="1"
//         step="0.01"
//         value={isMuted ? 0 : volume}
//         onChange={handleVolumeChange}
//       />
//     </VolumeContainer>
//   );
// });

// VolumeControl.displayName = 'VolumeControl';