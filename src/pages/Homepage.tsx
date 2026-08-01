import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import '../App.css';
import { useTranslation } from 'react-i18next';
import WhyCloudsSection from '../components/Homepage/WhyClouds/WhyCloudsSection';

const Homepage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Steps live inside the component so t() is available
  const steps = [
    {
      num: '01',
      title: t('homepage.step1Title'),
      desc: t('homepage.step1Desc'),
    },
    {
      num: '02',
      title: t('homepage.step2Title'),
      desc: t('homepage.step2Desc'),
    },
    {
      num: '03',
      title: t('homepage.step3Title'),
      desc: t('homepage.step3Desc'),
    },
    {
      num: '04',
      title: t('homepage.step4Title'),
      desc: t('homepage.step4Desc'),
    },
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">

      {/* ── ∞ Watermark — sits behind everything ── */}
    <div
      className="absolute inset-0 flex items-center justify-center
        pointer-events-none select-none"
      aria-hidden="true"
    >
      <span
        className="text-[80vw] md:text-[60vw] font-black leading-none"
        style={{ color: '#f5f5f5' }}
      >
        ∞
      </span>
    </div>


      <div
        className={`relative z-10 min-h-screen flex flex-col
          transition-all duration-1000 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >

        {/* ── HEADER: eyebrow + title, full width, above the clouds so the
              questions get the visual spotlight right below it ── */}
        <div className="px-8 sm:px-12 md:px-20 lg:px-32 pt-18 sm:pt-6 md:pt-18 text-center">
          <p className="text-[9px] tracking-[0.6em] uppercase text-gray-400 mb-3 sm:mb-4">
            {t('homepage.eyebrow')}
          </p>

          {/* Stacks on mobile (where 3 short lines read better) but flows as
              one line at md+ so the huge hero title doesn't dominate the
              page height now that the clouds are meant to be the centerpiece. */}
          <h1
            className="text-4xl sm:text-6xl md:text-6xl lg:text-7xl
              font-black text-black leading-none tracking-tighter"
          >
            <span className="block md:inline">The</span>{' '}
            <span className="block md:inline">Infinity</span>{' '}
            <span className="block md:inline">Player</span>
          </h1>
        </div>

        <WhyCloudsSection />

        {/* ── Everything below the clouds stays in one centered column
              instead of a left/right split, and "how it works" runs as a
              compact horizontal row (rather than a tall vertical list) so
              the whole page has a shot at fitting without a scrollbar on
              typical desktop viewports ── */}
        <div className="flex flex-col items-center px-8 sm:px-12 md:px-16 pt-2 pb-6 sm:pt-2 sm:pb-4">

          <div className="flex flex-col gap-2 w-full max-w-xs md:gap-3">
            <Link to="/levels">
              <button
                className="w-full py-3 bg-black text-white
                  font-bold text-sm tracking-[0.2em] uppercase
                  hover:bg-gray-800 transition-colors cursor-pointer"
              >
                {t('homepage.startFree')}
              </button>
            </Link>
            <Link to="/how-to-use">
              <button
                className="w-full py-3 border border-gray-300 text-black
                  font-bold text-sm tracking-[0.2em] uppercase
                  hover:border-black transition-colors cursor-pointer"
              >
                {t('homepage.button3')}
              </button>
            </Link>
            <Link to="/login">
              <p
                className="text-center text-sm text-gray-400 mt-1
                  underline underline-offset-4
                  hover:text-black transition-colors cursor-pointer"
              >
                {t('homepage.account')}
              </p>
            </Link>
          </div>

          {/* "How it works" — compact horizontal row on sm+, stacked on mobile */}
          <div className="w-full max-w-4xl mt-6 sm:mt-4 pt-6">
            <p className="text-center text-[9px] tracking-[0.6em] uppercase text-gray-400 mb-2 sm:mb-3">
              {t('homepage.howItWorks')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="text-center md:text-left md:border-l md:border-gray-100 md:pl-4 md:first:border-l-0 md:first:pl-0"
                >
                  <span className="text-[9px] tracking-[0.3em] text-gray-300 font-bold">{s.num}</span>
                  <h3 className="font-bold text-black text-sm mt-1 mb-1">{s.title}</h3>
                  <p className="text-xs text-gray-500 leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* "No subtitles" badge */}
          <div className="mt-3 sm:mt-2 flex items-center gap-3 border border-gray-200 px-4 py-1.5">
            <div className="w-2 h-2 bg-black rounded-full flex-shrink-0" />
            <p className="text-[9px] tracking-[0.3em] uppercase text-gray-500 font-bold">
              {t('homepage.badge')}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Homepage;