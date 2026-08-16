import { Link } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '../App.css';
import { useTranslation } from 'react-i18next';
import WhyCloudsSection from '../components/Homepage/WhyClouds/WhyCloudsSection';
import BrandMark from '../components/Brand/BrandMark';
import Slogan from '../components/Brand/Slogan';

const Homepage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const guideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToGuide = () => {
    guideRef.current?.scrollIntoView({
      // A user who asked the OS for less motion gets a jump, not a glide.
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  // Three steps, not the four this section used to carry. The two that were
  // dropped ("no subtitles", "use only your ears") explained *why* the app
  // works the way it does — a job the WhyClouds section directly above now
  // owns interactively, and that /how-to-use owns at full length. What's left
  // is the only thing neither of those covers: the loop a student actually
  // moves through. Keeping the redundant pair here made the page argue with
  // itself twice on one screen.
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
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden">
      <div
        className={`transition-opacity duration-1000 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — the hero. Sized to exactly one screen.

            `pt-13` reserves the navbar's height. Layout.tsx renders <Navbar />
            on every route except the Player, and it is `fixed top-0 h-13` at
            z-50 — it floats over this section rather than pushing it down, so
            without the padding the eyebrow line lands underneath it. The two
            numbers must move together: if Navbar's `h-13` changes, change this.
            Combined with `min-h-svh` and border-box sizing, the content area
            below the padding is exactly the region a phone can actually see.

            `min-h-svh` (small viewport height), not `min-h-screen`/`100vh`:
            on mobile Safari and Chrome, `100vh` means the viewport with the
            browser chrome *retracted*, so a `100vh` hero is taller than what
            you can actually see on load and the call-to-action sits below the
            fold until you scroll. `svh` is the height with the chrome shown —
            the guaranteed-visible box. It's `min-h` rather than `h` on
            purpose: on a very short phone in landscape the content should
            push the section taller instead of being clipped.
           ══════════════════════════════════════════════════════════════════ */}
        {/* `isolate` (isolation: isolate) creates a stacking context on the
            section without needing a z-index of its own. That's what lets the
            watermark below sit at `-z-10`: a negative z-index child paints
            beneath its stacking context's background, so without `isolate`
            here it would sink past this section entirely and disappear behind
            the page wrapper's `bg-white`. With it, "behind everything in the
            hero, in front of the page" is expressible in one class — and no
            content block needs a z-index at all. */}
        <section className="relative isolate min-h-svh pt-13 flex flex-col overflow-hidden">

          {/* ── Milk-splash watermark — sits behind everything ──
                White fill on a white page, so only the outline reads. The stroke
                is non-scaling (see BrandMark), which keeps it an even line at this
                size instead of a ~40px black band.

                It is blurred on purpose: a crisp outline this large competes with
                the hero text for attention. The blur pushes it back into the page
                so it reads as atmosphere rather than as a second graphic. Because
                blur eats thin lines, strokeWidth is heavier here than it would be
                for a sharp mark — the two numbers move together.

                Scoped to this section rather than the whole page: it centers on
                its containing block, so leaving it on the page wrapper would park
                it on the seam between the hero and the guide once the page grew
                past one screen. */}
          <div
            className="absolute inset-0 -z-10 flex items-center justify-center
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

          {/* ── HEADER: eyebrow + title, full width, above the clouds so the
                questions get the visual spotlight right below it ── */}
          {/* Breathing room *below* the navbar — the navbar's own 52px is
              already reserved by `pt-13` on the section, so these are purely
              aesthetic. (The old values were measured from the top of the
              page rather than from under the navbar, which is why `sm:pt-6`
              read as smaller than the mobile value instead of larger.) */}
          <div className="px-8 sm:px-12 md:px-20 lg:px-32 pt-6 sm:pt-8 md:pt-10 text-center">
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

          {/* The clouds absorb whatever vertical space is left over, so the
              hero stays visually balanced from a 667px phone up to a 1440px
              desktop without a per-breakpoint padding table. `min-h-0` is
              required: a flex child's default `min-height: auto` refuses to
              shrink below its content, which would push the buttons off a
              short screen — the one thing this layout must never do. */}
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <WhyCloudsSection />
          </div>

          {/* ── CALL TO ACTION ── */}
          <div className="flex flex-col items-center px-8 sm:px-12 md:px-16 pb-4">
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
          </div>

          {/* ── SCROLL CUE ──
                Load-bearing, not decoration. A section sized to exactly one
                screen gives the browser no clipped content peeking over the
                fold, which is the usual signal that scrolling is worthwhile —
                without a cue here the guide below is effectively invisible.
                It's a real button so it works by keyboard and tap, not only
                by scroll gesture. */}
          <div className="flex justify-center pb-5 sm:pb-6">
            <button
              type="button"
              onClick={scrollToGuide}
              className="group flex flex-col items-center gap-1.5
                text-gray-400 hover:text-black transition-colors cursor-pointer
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-gray-400 focus-visible:ring-offset-4 rounded"
            >
              <span className="text-[9px] tracking-[0.4em] uppercase font-bold">
                {t('homepage.howItWorks')}
              </span>
              <motion.svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                animate={shouldReduceMotion ? { y: 0 } : { y: [0, 4, 0] }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                }
              >
                <path d="M6 9l6 6 6-6" />
              </motion.svg>
            </button>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — the guide. Deliberately below the fold.

            This is the short version on purpose. The clouds above answer
            "why does it work like this", /how-to-use answers "show me
            everything", and this row answers only "what happens when I
            press start" — then hands off to the full page rather than
            competing with it.
           ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={guideRef}
          id="how-it-works"
          // scroll-mt-13 matches the navbar height for the same reason the
          // hero needs pt-13: scrollIntoView({block:'start'}) aligns this
          // section's top with the *viewport* top, which sits behind the
          // fixed navbar. Without it the scroll cue parks the section label
          // partly underneath the bar.
          className="relative flex flex-col items-center scroll-mt-13
            px-8 sm:px-12 md:px-16 py-16 sm:py-20"
        >
          <p className="text-center text-[9px] tracking-[0.6em] uppercase text-gray-400 mb-8 sm:mb-10">
            {t('homepage.howItWorks')}
          </p>

          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="text-center sm:text-left sm:border-l sm:border-gray-100 sm:pl-5 sm:first:border-l-0 sm:first:pl-0"
                >
                  <span className="text-[9px] tracking-[0.3em] text-gray-300 font-bold">
                    {s.num}
                  </span>
                  <h3 className="font-bold text-black text-sm mt-1 mb-1">{s.title}</h3>
                  <p className="text-xs text-gray-500 leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* "No subtitles" badge */}
          <div className="mt-12 sm:mt-14 flex items-center gap-3 border border-gray-200 px-4 py-1.5">
            <div className="w-2 h-2 bg-black rounded-full flex-shrink-0" />
            <p className="text-[9px] tracking-[0.3em] uppercase text-gray-500 font-bold">
              {t('homepage.badge')}
            </p>
          </div>

          {/* Hand-off to the long version, so the two never duplicate. */}
          <Link
            to="/how-to-use"
            className="mt-6 text-sm text-gray-400 underline underline-offset-4
              hover:text-black transition-colors"
          >
            {t('homepage.guideMore')}
          </Link>
        </section>
      </div>
    </div>
  );
};

export default Homepage;
