import { Link } from 'react-router';
import { useState, useEffect } from 'react';

const Levels = () => {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isVisible,  setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const levels = [
    {
      id: 'easy', 
      title: 'Easy',
      subtitle: 'Easy Mode',
      features: ['Clear Audio', 'Simple Vocabulary', 'Guided Experience'],
      color: 'green',
      gradient: 'from-green-500 to-emerald-600',
      glowColor: 'shadow-green-500/50'
    },
    {
      id: 'medium',
      title: 'Medium',  
      subtitle: 'Medium Mode',
      features: ['Moderate Pace', 'Mixed Themes', 'Balanced Challenge'],
      color: 'yellow',
      gradient: 'from-yellow-500 to-orange-600',
      glowColor: 'shadow-yellow-500/50'
    },
    {
      id: 'hard',
      title: 'Hard',
      subtitle: 'Hard Mode',
      features: ['Complex Stories', 'Fast Pace', 'Expert Level'],
      color: 'red',
      gradient: 'from-red-500 to-purple-600',
      glowColor: 'shadow-red-100/10'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className={`text-center mb-12 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <h1 className="text-6xl font-bold text-white mb-4 tracking-wider">
            SELECT <span className="text-green-400">DIFFICULTY</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Choose your path.
          </p>
        </div>

        {/* Level Selection */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full">
          {levels.map((level, index) => (
            <div
              key={level.id}
              className={`transform transition-all duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              <Link to={`/levels/${level.id}`}>
                <div
                  onMouseEnter={() => setSelectedLevel(level.id)}
                  onMouseLeave={() => setSelectedLevel(null)}
                  className={`
                    relative group cursor-pointer
                    bg-gray-800/50 backdrop-blur-sm border border-gray-700
                    rounded-2xl p-8 hover:scale-105 transition-all duration-300
                    ${selectedLevel === level.id ? `${level.glowColor} shadow-2xl scale-105` : 'shadow-xl'}
                  `}
                >
                  {/* Level Badge */}
                  <div className={`
                    absolute -top-4 left-1/2 transform -translate-x-1/2
                    px-6 py-2 bg-gradient-to-r ${level.gradient} rounded-full
                    text-white font-bold text-sm tracking-wide
                  `}>
                    LEVEL {index + 1}
                  </div>

                  {/* Title */}
                  <div className="text-center mt-6 mb-6">
                    <h3 className="text-3xl font-bold text-white mb-2 tracking-wider">
                      {level.title}
                    </h3>
                    {/* <p className="text-gray-400 text-lg">{level.subtitle}</p> */}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {level.features.map((feature, i) => (
                      <div key={i} className="flex items-center text-gray-300">
                        <div className={`w-2 h-2 bg-gradient-to-r ${level.gradient} rounded-full mr-3`}></div>
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className={`
                    w-full py-4 bg-gradient-to-r ${level.gradient}
                    text-white font-bold text-center rounded-xl
                    transform group-hover:scale-105 transition-all duration-300
                    group-hover:shadow-lg
                  `}>
                    Go to the Challenge
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Levels;


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