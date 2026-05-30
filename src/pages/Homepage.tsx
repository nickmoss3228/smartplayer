import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import '../App.css';
import { useTranslation } from 'react-i18next';

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
        className={`relative z-10 min-h-screen flex flex-col md:flex-row
          transition-all duration-1000 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >

        {/* ── LEFT PANEL ── */}
<div
  className="flex-1 flex flex-col justify-between
    p-8
    sm:p-12
    md:py-16 md:pr-16 md:pl-32
    lg:py-20 lg:pr-20 lg:pl-40
    mt-12
    border-b md:border-b-0 md:border-r border-gray-200"
>
          <div>
            <p className="text-[9px] tracking-[0.6em] uppercase text-gray-400 mb-12 sm:mb-16">
              {t('homepage.eyebrow')}
            </p>

            <h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl
                font-black text-black leading-none tracking-tighter mb-6"
            >
              The<br />Infinity<br />Player
            </h1>

            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-12">
              {t('homepage.tagline')}
            </p>
          </div>

          {/* Buttons anchored to bottom of left panel */}
          <div className="flex flex-col gap-3 max-w-xs">
            <Link to="/levels">
              <button
                className="w-full py-4 bg-black text-white
                  font-bold text-sm tracking-[0.2em] uppercase
                  hover:bg-gray-800 transition-colors cursor-pointer"
              >
                {t('homepage.startFree')}
              </button>
            </Link>
            <Link to="/how-to-use">
              <button
                className="w-full py-4 border border-gray-300 text-black
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
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 md:p-16 lg:p-20">

          <p className="text-[9px] tracking-[0.6em] uppercase text-gray-400 mb-10">
            {t('homepage.howItWorks')}
          </p>

          {/* Steps list */}
          <div>
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex gap-6 py-6
                  ${i < steps.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="flex-shrink-0 text-[9px] tracking-[0.3em] text-gray-300 font-bold pt-0.5">
                  {s.num}
                </span>
                <div>
                  <h3 className="font-bold text-black text-base mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* "No subtitles" badge */}
          <div className="mt-10 flex items-center gap-3 border border-gray-200 px-4 py-3 self-start">
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