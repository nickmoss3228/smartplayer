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
      id: 'easy', 
      title: t('levels.easy'),
      subtitle: t('levels.easySubtitle'),
      features: [
        t('levels.easyFeature1'),
        t('levels.easyFeature2'),
        t('levels.easyFeature3')
      ],
      color: 'green',
      accent: 'from-green-600 to-emerald-600',
      border: 'border-green-500/30',
      hover: 'hover:border-green-400'
    },
    {
      id: 'medium',
      title: t('levels.medium'),  
      subtitle: t('levels.mediumSubtitle'),
      features: [
        t('levels.mediumFeature1'),
        t('levels.mediumFeature2'),
        t('levels.mediumFeature3')
      ],
      color: 'orange',
      accent: 'from-yellow-600 to-orange-600',
      border: 'border-orange-500/30',
      hover: 'hover:border-orange-400'
    },
    {
      id: 'hard',
      title: t('levels.hard'),
      subtitle: t('levels.hardSubtitle'),
      features: [
        t('levels.hardFeature1'),
        t('levels.hardFeature2'),
        t('levels.hardFeature3')
      ],
      color: 'purple',
      accent: 'from-red-600 to-purple-600',
      border: 'border-purple-500/30',
      hover: 'hover:border-purple-400'
    }
  ];

  return (
    <div className="min-h-screen pt-20 sm:pt-30 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 relative">
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className={`text-center mb-8 sm:mb-12 md:mb-16 px-4 transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 mb-2 sm:mb-3 tracking-tight leading-tight">
            {t('levels.selectProficiency')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{t('levels.proficiencyLevel')}</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto font-light">
            {t('levels.chooseAppropriate')}
          </p>
        </div>

        {/* Level Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-6xl w-full">
          {levels.map((level, index) => (
            <div
              key={level.id}
              className={`transform transition-all duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <Link to={`/levels/${level.id}`}>
                <div
                  onMouseEnter={() => setSelectedLevel(level.id)}
                  onMouseLeave={() => setSelectedLevel('')}
                  className={`
                    relative group cursor-pointer h-full
                    bg-white border-2 ${level.border} ${level.hover}
                    rounded-lg p-5 sm:p-6 md:p-8 transition-all duration-300
                    ${selectedLevel === level.id ? 'shadow-xl border-opacity-100 -translate-y-2' : 'shadow-md'}
                    aspect-square sm:aspect-auto flex flex-col
                  `}
                >
                  {/* Level Indicator */}
                  <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6">
                    <span className="text-s sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {t('levels.level')} {index + 1}
                    </span>
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r ${level.accent}`}></div>
                  </div>

                  {/* Title */}
                  <div className="mb-4 sm:mb-5 md:mb-6">
                    <h3 className="text-2xl sm:text-2xl font-semibold text-gray-900 mb-1">
                      {level.title} 
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 font-light">{level.subtitle}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4 mb-5 sm:mb-6 md:mb-8 flex-grow">
                    {level.features.map((feature, i) => (
                      <div key={i} className="flex items-start text-gray-700">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 mt-0.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs sm:text-sm leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Area */}
                  <div className={`
                    w-full py-2.5 sm:py-3 px-4 sm:px-6 bg-gradient-to-r ${level.accent}
                    text-white font-medium text-center rounded-md text-xs sm:text-sm
                    transform transition-all duration-300
                    ${selectedLevel === level.id ? 'shadow-lg scale-105' : 'opacity-90'}
                  `}>
                    {t('levels.proceedToAssessment')}
                  </div>

                  {/* Subtle hover indicator */}
                  <div className={`
                    absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${level.accent} rounded-t-lg
                    transform origin-left transition-transform duration-300
                    ${selectedLevel === level.id ? 'scale-x-100' : 'scale-x-0'}
                  `}></div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className={`mt-8 sm:mt-10 md:mt-12 text-center px-4 transform transition-all duration-1000 delay-500 ${
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