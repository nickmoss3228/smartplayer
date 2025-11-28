import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import '../App.css'
import { useTranslation } from 'react-i18next';

const Homepage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const {t} = useTranslation();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen pt-16 bg-gray-50 relative overflow-hidden">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-7xl w-full text-center">
          {/* Main title */}
          <div className="overflow-hidden mb-4 sm:mb-6">
            <h1 className={`text-5xl sm:text-6xl md:text-7xl lg:text-9xl font-bold text-black mb-4 sm:mb-6 leading-tight transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}>
              The Infinity Player
            </h1>
          </div>

          {/* Subtitle */}
          <div className="font-montserrat overflow-hidden mb-10 sm:mb-12 md:mb-16">
            <p className={`text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 max-w-2xl mx-auto leading-relaxed px-4 transform transition-all duration-1000 ease-out delay-300 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}>
              {t('homepage.landing')}
            </p>
          </div>

          {/* Buttons section with glass effect */}
          <div className={`transform transition-all duration-1000 ease-out delay-500 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}>
            {/* Top buttons - stacked on mobile, side by side on larger screens */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 px-4">
              <Link to="/signup" className="group w-full sm:w-auto">
                <button className="cursor-pointer w-full sm:w-auto relative px-8 py-4 bg-black text-white font-semibold rounded-2xl text-base sm:text-lg shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl backdrop-blur-lg">
                  {t('homepage.button1')}
                </button>
              </Link>
              <Link to="/how-to-use" className="group w-full sm:w-auto">
                <button className="cursor-pointer w-full sm:w-auto relative px-8 py-4 bg-black text-white font-semibold rounded-2xl text-base sm:text-lg shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl backdrop-blur-lg">
                  {t('homepage.button3')}
                </button>
              </Link>
            </div>

            {/* Divider text */}
            <p className="text-gray-500 mb-6 text-sm">{t('homepage.account')}</p>

            {/* Login Button with glass effect */}
            <div className="px-4">
              <Link to="/login" className="group inline-block w-full sm:w-auto">
                <button className="cursor-pointer w-full sm:w-auto relative px-8 py-4 bg-white/60 backdrop-blur-md border-2 border-gray-200 text-black font-semibold rounded-2xl text-base sm:text-lg shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:border-blue-300">
                  {t('homepage.button2')}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;