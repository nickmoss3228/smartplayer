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
            p-8 sm:p-12 md:p-16 lg:p-20 mt-12
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
            <Link to="/signup">
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


// OPTION 1 — EDITORIAL / PRINT MAGAZINE

// const HomepageV1 = () => {
//   const [isVisible, setIsVisible] = useState(false);
//   const { t } = useTranslation();
//   useEffect(() => { setIsVisible(true); }, []);

//   const steps = [
//     {
//       num: '01',
//       title: 'Listen',
//       desc: "A story plays. No subtitles appear — ever. Your ears are the only tool you have.",
//     },
//     {
//       num: '02',
//       title: 'Replay & Slow Down',
//       desc: "Missed something? Repeat any sentence or reduce speed. But you can't read along.",
//     },
//     {
//       num: '03',
//       title: 'Quiz & Unlock',
//       desc: 'Answer comprehension questions. Pass, and the next story unlocks automatically.',
//     },
//   ];

//   return (
//     <div className="min-h-screen bg-white">
//       <div
//         className={`max-w-6xl mx-auto px-6 sm:px-12 py-20 sm:py-32
//           transition-all duration-1000 ease-out
//           ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
//       >
//         {/* Eyebrow */}
//         <p className="text-[9px] tracking-[0.6em] uppercase text-gray-400 text-center mb-8">
//           English Listening Training
//         </p>

//         {/* Giant title */}
//         <h1 className="text-6xl sm:text-8xl md:text-[9rem] font-black text-black text-center
//           leading-none tracking-tighter mb-10">
//           The Infinity<br />Player
//         </h1>

//         {/* Top rule — full width */}
//         <div className="border-t border-black mb-0" />

//         {/* Step columns */}
//         {/* Desktop: 3 cols with vertical rules | Mobile: stacked with bottom borders */}
//         <div className="grid grid-cols-1 md:grid-cols-3">
//           {steps.map((s, i) => (
//             <div
//               key={i}
//               className={`py-8 px-6 md:px-10
//                 border-b md:border-b-0
//                 ${i < 2 ? 'md:border-r' : ''}
//                 border-gray-300
//                 last:border-b-0`}
//             >
//               <span className="block text-[9px] tracking-[0.5em] uppercase text-gray-300 mb-4">
//                 Step {s.num}
//               </span>
//               <h3 className="text-lg font-black text-black uppercase tracking-wider mb-3">
//                 {s.title}
//               </h3>
//               <p className="text-sm text-gray-500 leading-loose">{s.desc}</p>
//             </div>
//           ))}
//         </div>

//         {/* Bottom rule */}
//         <div className="border-t border-black mb-10" />

//         {/* The "no cheating" manifesto line */}
//         <p className="text-center text-[9px] tracking-[0.6em] uppercase text-gray-400 mb-10">
//           No subtitles &nbsp;·&nbsp; No translations &nbsp;·&nbsp; Ears only
//         </p>

//         {/* Buttons */}
//         {/* Mobile: stacked full-width | Desktop: inline, auto-width */}
//         <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
//           <Link to="/signup" className="w-full sm:w-auto">
//             <button className="w-full sm:w-auto px-12 py-4 bg-black text-white
//               font-bold text-sm tracking-[0.2em] uppercase
//               hover:bg-gray-800 transition-colors">
//               Start Listening
//             </button>
//           </Link>
//           <Link to="/how-to-use" className="w-full sm:w-auto">
//             <button className="w-full sm:w-auto px-12 py-4 border border-gray-400 text-black
//               font-bold text-sm tracking-[0.2em] uppercase
//               hover:border-black transition-colors">
//               How It Works
//             </button>
//           </Link>
//         </div>

//         <p className="text-center mt-6 text-sm text-gray-400">
//           Already a listener?{' '}
//           <Link to="/login" className="text-black font-semibold underline underline-offset-4
//             hover:opacity-60 transition-opacity">
//             Sign in
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// };



// OPTION 3 — OVERSIZED GRAPHIC / ∞ WATERMARK

// const HomepageV3 = () => {
//   const [isVisible, setIsVisible] = useState(false);
//   const { t } = useTranslation();
//   useEffect(() => { setIsVisible(true); }, []);

//   const flow = ['Listen', 'Replay / Slow', 'Quiz', 'Unlock'];

//   return (
//     <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">

//       {/* Giant decorative ∞ — purely structural, no color */}
//       <div
//         className="absolute inset-0 flex items-center justify-center
//           pointer-events-none select-none"
//         aria-hidden="true"
//       >
//         <span
//           className="text-[55vw] font-black leading-none"
//           style={{ color: '#f3f3f3' }}
//         >
//           ∞
//         </span>
//       </div>

//       {/* Foreground content */}
//       <div
//         className={`relative z-10 w-full max-w-xl mx-auto px-6 text-center
//           transition-all duration-1000 ease-out
//           ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
//       >
//         {/* Label */}
//         <p className="text-[9px] tracking-[0.6em] uppercase text-gray-400 mb-8">
//           No subtitles. Just listening.
//         </p>

//         {/* Title */}
//         <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-black
//           leading-tight tracking-tighter mb-8">
//           The<br />Infinity<br />Player
//         </h1>

//         {/* Tagline */}
//         <p className="text-sm text-gray-500 mb-10 max-w-sm mx-auto leading-relaxed">
//           Real stories. Real people. Train your English by listening —
//           no subtitles, no transcripts, ever.
//         </p>

//         {/* Flow diagram — horizontal on sm+, vertical on mobile */}
//         <div className="flex flex-col sm:flex-row items-center justify-center gap-0 mb-12">
//           {flow.map((label, i) => (
//             <div key={i} className="flex flex-col sm:flex-row items-center">
//               <span
//                 className="px-4 py-2 border border-gray-900 text-[10px] font-black
//                   uppercase tracking-[0.2em] bg-white"
//               >
//                 {label}
//               </span>
//               {i < flow.length - 1 && (
//                 <span
//                   className="text-gray-400 text-xs my-1 sm:my-0 sm:mx-1
//                     block sm:rotate-0 rotate-0"
//                 >
//                   {/* Arrow rotates on mobile via flex direction */}
//                   <span className="sm:hidden">↓</span>
//                   <span className="hidden sm:inline">→</span>
//                 </span>
//               )}
//             </div>
//           ))}
//         </div>

//         {/* CTA buttons */}
//         <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
//           <Link to="/signup" className="w-full sm:w-auto">
//             <button
//               className="w-full sm:w-auto px-10 py-5 bg-black text-white
//                 font-black text-base tracking-wide
//                 hover:opacity-75 transition-opacity"
//             >
//               Begin →
//             </button>
//           </Link>
//           <Link to="/login" className="w-full sm:w-auto">
//             <button
//               className="w-full sm:w-auto px-10 py-5 bg-white border border-gray-300
//                 text-black font-bold text-base
//                 hover:border-black transition-colors"
//             >
//               Log In
//             </button>
//           </Link>
//         </div>

//         <Link to="/how-to-use">
//           <p className="text-xs text-gray-400 underline underline-offset-4
//             hover:text-black transition-colors cursor-pointer">
//             How does it work?
//           </p>
//         </Link>
//       </div>
//     </div>
//   );
// };