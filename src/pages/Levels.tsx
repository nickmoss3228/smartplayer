import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const Levels = () => {
  const [selectedLevel, setSelectedLevel] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const levels = [
{
      id: 'hard',
      title: t('levels.hard'),
      subtitle: t('levels.hardSubtitle'),
      color: 'purple',
      accent: 'from-red-600 to-purple-600',
      border: 'border-purple-500/30',
      selectedBorder: 'border-purple-500',
      selectedShadow: 'shadow-purple-200',
      hover: 'hover:border-purple-400',
    },
    {
      id: 'medium',
      title: t('levels.medium'),
      subtitle: t('levels.mediumSubtitle'),
      color: 'orange',
      accent: 'from-yellow-600 to-orange-600',
      border: 'border-orange-500/30',
      selectedBorder: 'border-orange-500',
      selectedShadow: 'shadow-orange-200',
      hover: 'hover:border-orange-400',
    },
    
        {
      id: 'easy',
      title: t('levels.easy'),
      subtitle: t('levels.easySubtitle'),
      color: 'green',
      accent: 'from-green-600 to-emerald-600',
      border: 'border-green-500/30',
      selectedBorder: 'border-green-500',
      selectedShadow: 'shadow-green-200',
      hover: 'hover:border-green-400',
    },
  ];

  return (
    <div className="min-h-screen pt-20 sm:pt-30 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 relative">
      <div className="relative mt-10 z-10 h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">

        {/* Header */}
        <div className={`text-center mb-8 sm:mb-12 md:mb-16 px-4 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <h1 className="text-2xl sm:text-4xl md:text-[44px] font-semibold text-gray-900 mb-2 sm:mb-3 tracking-tight leading-tight">
            {t('levels.selectProficiency')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {t('levels.proficiencyLevel')}
            </span>
          </h1>
          {/* <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto font-light">
            {t('levels.chooseAppropriate')}
          </p> */}
        </div>

        {/* Level Circles */}
        <div className="flex flex-col sm:flex-row-reverse items-center justify-center gap-8 sm:gap-10 md:gap-14 w-full max-w-4xl">
          {levels.map((level, index) => (
            <div
              key={level.id}
              className={`transform transition-all duration-700 flex flex-col items-center gap-3 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Circle */}
              <button
                onClick={() => setSelectedLevel(level.id)}
                className={`
                  w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52
                  rounded-full border-4 transition-all duration-300
                  flex flex-col items-center justify-center
                  bg-white cursor-pointer
                  ${selectedLevel === level.id
                    ? `${level.selectedBorder} shadow-xl ${level.selectedShadow} scale-105`
                    : `${level.border} ${level.hover} shadow-md`
                  }
                `}
              >
                {/* Gradient dot indicator */}
                {/* <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${level.accent} mb-2`}></div> */}

                {/* <span className="text-xs sm:text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  {t('levels.level')} {index + 1}
                </span> */}

                <h3 className="text-l sm:text-2xl font-semibold text-gray-900 text-center px-2">
                  {level.title}
                </h3>
{/* 
                <p className="text-xs text-gray-500 font-light mt-1 text-center px-4">
                  {level.subtitle}
                </p> */}

                {/* Selected ring accent line at bottom of circle
                {selectedLevel === level.id && (
                  <div className={`absolute bottom-0 w-1/2 h-1 bg-gradient-to-r ${level.accent} rounded-full mt-2`} />
                )} */}
              </button>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div className={`mt-10 sm:mt-12 md:mt-16 transform transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          {selectedLevel ? (
            <Link to={`/levels/${selectedLevel}`}>
              <button
                className={`
                  px-10 sm:px-14  cursor-pointer  py-3 sm:py-4 rounded-lg font-medium text-white text-sm sm:text-base
                  bg-gradient-to-r ${levels.find(l => l.id === selectedLevel)?.accent}
                  shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl
                `}
              >
                {t('levels.continue')}
              </button>
            </Link>
          ) : (
            <button
              disabled
              className="px-10 sm:px-14 py-3 sm:py-4 rounded-lg font-medium text-gray-400 text-sm sm:text-base
                bg-gray-100 border border-gray-200 cursor-not-allowed shadow-sm"
            >
              {t('levels.continue')}
            </button>
          )}
        </div>

        {/* Additional Info */}
        <div className={`mt-6 sm:mt-8 text-center px-4 transform transition-all duration-1000 delay-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <p className="text-xs sm:text-sm text-gray-500">
            {t('levels.notSure')}
          </p>
        </div>

      </div>
    </div>
  );
};

export default Levels;