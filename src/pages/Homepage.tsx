import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import '../App.css';
import { useTranslation } from 'react-i18next';
import WhyCloudsSection from '../components/Homepage/WhyClouds/WhyCloudsSection';
import BrandMark from '../components/Brand/BrandMark';
import Slogan from '../components/Brand/Slogan';

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

      {/* ── Milk-splash watermark — sits behind everything ──
            White fill on a white page, so only the outline reads. The stroke
            is non-scaling (see BrandMark), which keeps it an even line at this
            size instead of a ~40px black band.

            It is blurred on purpose: a crisp outline this large competes with
            the hero text for attention. The blur pushes it back into the page
            so it reads as atmosphere rather than as a second graphic. Because
            blur eats thin lines, strokeWidth is heavier here than it would be
            for a sharp mark — the two numbers move together. */}
    <div
      className="absolute inset-0 flex items-center justify-center
        pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* transform: translateZ(0) promotes this to its own composited layer so
          the blur is rasterized once instead of being repainted as the page
          scrolls. Cloud.tsx documents a real iPhone 12 report of blur-induced
          jank; that one was per-frame and had to be dropped entirely, this one
          is static and only needs to not repaint. */}
      <BrandMark
        variant="splash"
        strokeWidth={6}
        className="w-[80vw] md:w-[55vw] h-auto"
        style={{
          color: '#111111',
          filter: 'blur(7px)',
          opacity: 0.5,
          transform: 'translateZ(0)',
        }}
      />
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

          {/* One word now, so it no longer needs the stack-on-mobile split the
              three-word "The Infinity Player" title used to require. */}
          <h1
            className="text-5xl sm:text-7xl md:text-7xl lg:text-8xl
              font-black text-black leading-none tracking-tighter lowercase"
          >
            {t('brand')}
          </h1>

          <Slogan
            className="mt-3 sm:mt-4 text-base sm:text-xl md:text-2xl
              font-medium text-gray-500 lowercase tracking-tight"
          />
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