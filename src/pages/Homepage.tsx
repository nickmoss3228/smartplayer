import { Link } from 'react-router';
import { useState, useEffect } from 'react';

const Homepage = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-red-400 to-blue-400 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-ping"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center">
          {/* Main title with staggered animation */}
          <div className="overflow-hidden mb-8">
            <h1 className={`text-6xl md:text-8xl font-bold text-white mb-4 transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}>
              <span className="bg-white from-red-600 via-blue-500 to-green-500 bg-clip-text text-transparent">
                Haila
              </span>
            </h1>
          </div>

          {/* Subtitle with delay */}
          <div className="overflow-hidden mb-12">
            <p className={`text-xl md:text-2xl text-gray-100 max-w-2xl mx-auto leading-relaxed transform transition-all duration-1000 ease-out delay-300 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}>
              Immerse yourself in captivating stories that challenge your mind and spark your imagination
            </p>
          </div>

          {/* CTA Button with hover effects */}
          <div className={`transform transition-all duration-1000 ease-out delay-500 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}>
            <Link to="/signup" className="group inline-block">
              <button className="relative px-8 py-4 mr-4 bg-gradient-to-r from-red-500 to-blue-500 text-white font-bold rounded-full text-lg shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-purple-500/25 overflow-hidden cursor-pointer">
                <span className="relative z-10">Start Your Journey - Sign Up.</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </Link>

             <Link to="/login" className="group inline-block">
              <button className="relative px-8 py-4 bg-gradient-to-r from-red-500 to-blue-500 text-white font-bold rounded-full text-lg shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-purple-500/25 overflow-hidden cursor-pointer">
                <span className="relative z-10">Have an account? Log in.</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;


// import { Link } from 'react-router';
// import { useState, useEffect } from 'react';

// const Homepage = () => {
//   const [isVisible, setIsVisible] = useState(false);

//   useEffect(() => {
//     setIsVisible(true);
//   }, []);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-red-500 to-blue-600 relative overflow-hidden">
//       {/* Animated background elements */}
//       <div className="absolute inset-0">
//         <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
//         <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
//         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-ping"></div>
//       </div>

//       <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
//         <div className="max-w-4xl w-full text-center">
//           {/* Main title with staggered animation */}
//           <div className="overflow-hidden mb-8">
//             <h1 className={`text-6xl md:text-8xl font-bold text-white mb-4 transform transition-all duration-1000 ease-out ${
//               isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
//             }`}>
//               <span className="bg-white from-red-600 via-blue-500 to-green-500 bg-clip-text text-transparent">
//                 Haila
//               </span>
//             </h1>
//           </div>

//           {/* Subtitle with delay */}
//           <div className="overflow-hidden mb-12">
//             <p className={`text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed transform transition-all duration-1000 ease-out delay-300 ${
//               isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
//             }`}>
//               Immerse yourself in captivating stories that challenge your mind and spark your imagination
//             </p>
//           </div>

//           {/* CTA Button with hover effects */}
//           <div className={`transform transition-all duration-1000 ease-out delay-500 ${
//             isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
//           }`}>
//             <Link to="/levels" className="group inline-block">
//               <button className="relative px-8 py-4 bg-gradient-to-r from-red-600 to-blue-600 text-white font-bold rounded-full text-lg shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-purple-500/25 overflow-hidden cursor-pointer">
//                 <span className="relative z-10">Start Your Journey</span>
//                 <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//               </button>
//             </Link>
//           </div>

//           {/* Feature cards */}
//           <div className={`grid md:grid-cols-3 gap-6 mt-16 transform transition-all duration-1000 ease-out delay-700 ${
//             isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
//           }`}>
//             {[
//               { title: "Interactive Stories", desc: "Engage with dynamic narratives" },
//               { title: "Multiple Levels", desc: "From easy to challenging" },
//               { title: "Immersive Experience", desc: "Audio-visual storytelling" }
//             ].map((feature, index) => (
//               <div key={index} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
//                 <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
//                 <p className="text-gray-300">{feature.desc}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Homepage;