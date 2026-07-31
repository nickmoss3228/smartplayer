import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoChevronDown } from "react-icons/io5";
import { useTranslation } from "react-i18next";

// ─── Scroll Reveal ────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-revealed");
        }),
      { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Photo Placeholder ────────────────────────────────────────────────────────
const PhotoPlaceholder: React.FC<{
  label: string;
  aspect: string;
  note: string;
}> = ({ label, aspect, note }) => (
  <div
    className="w-full overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50"
    style={{ aspectRatio: aspect }}
  >
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <svg
        className="h-10 w-10 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p className="text-center font-['Montserrat'] text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <p className="text-center text-[11px] text-gray-400">{note}</p>
    </div>
  </div>
);

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ num: string; label: string }> = ({
  num,
  label,
}) => (
  <div data-reveal className="mb-6 flex items-center gap-3">
    <span className="font-['Montserrat'] text-[10px] font-bold uppercase tracking-[0.25em] text-green-600">
      {num}
    </span>
    <div className="h-px w-12 bg-green-500/40" />
    <span className="font-['Montserrat'] text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">
      {label}
    </span>
  </div>
);

// ─── Speed Badge Row ──────────────────────────────────────────────────────────
const SpeedBadges: React.FC = () => (
  <div className="flex flex-wrap gap-2">
    {["0.5×", "0.8×", "1.0×"].map((s) => (
      <span
        key={s}
        className="rounded-lg bg-gray-100 px-3 py-1 font-mono text-sm font-bold text-gray-700"
      >
        {s}
      </span>
    ))}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const HowToUse: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  useScrollReveal();

  const timelineItems = [
    {
      icon: "👤",
      title: t("howToUse.s05.item1.title"),
      text: t("howToUse.s05.item1.text"),
    },
    {
      icon: "📊",
      title: t("howToUse.s05.item2.title"),
      text: t("howToUse.s05.item2.text"),
    },
    {
      icon: "🎙️",
      title: t("howToUse.s05.item3.title"),
      text: t("howToUse.s05.item3.text"),
    },
  ];

  const tags = [
    t("howToUse.hero.tag1"),
    t("howToUse.hero.tag2"),
    t("howToUse.hero.tag3"),
    t("howToUse.hero.tag4"),
  ];

  return (
    <>
      <style>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.8s cubic-bezier(.16,1,.3,1),
                      transform 0.8s cubic-bezier(.16,1,.3,1);
        }
        [data-reveal].is-revealed { opacity: 1; transform: none; }
        [data-reveal][data-delay="1"] { transition-delay: 0.10s; }
        [data-reveal][data-delay="2"] { transition-delay: 0.20s; }
        [data-reveal][data-delay="3"] { transition-delay: 0.30s; }
        [data-reveal][data-delay="4"] { transition-delay: 0.40s; }
        [data-reveal][data-delay="5"] { transition-delay: 0.50s; }
      `}</style>

      <div className="min-h-screen bg-gray-100 text-gray-900">

        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section className="relative flex min-h-screen flex-col overflow-hidden bg-gray-100 px-4 sm:px-6">
          {/* Subtle glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-400/10 blur-[120px]" />
          </div>

          {/* ── Back button — inline at top, scrolls with page ── */}
         
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:text-gray-900"
            >
              <IoChevronBack className="h-4 w-4" />
              {t("howToUse.back")}
            </button>
          

          {/* ── Centred hero content ── */}
          {/* ── Centred hero content ── */}
<div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
  <span
    data-reveal
    className="mb-6 inline-block rounded-full border border-green-500/40 bg-green-50 px-4 py-1.5 font-['Montserrat'] text-[10px] font-bold uppercase tracking-[0.3em] text-green-600"
  >
    {t("howToUse.badge")}
  </span>

  {/* ── Back button lives here now, anchored left of the heading ── */}
  <div
    data-reveal
    data-delay="1"
    className="relative mb-6 flex w-full items-center justify-center"
  >
    <button
      onClick={() => navigate(-1)}
      className="absolute left-100 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:text-gray-900"
    >
      <IoChevronBack className="h-4 w-4" />
      {t("howToUse.back")}
    </button>

    <h1 className="text-6xl font-black leading-[0.9] tracking-tight text-gray-900 sm:text-8xl">
      {t("howToUse.hero.title1")}
      <br />
      <span className="text-green-500">{t("howToUse.hero.title2")}</span>
    </h1>
  </div>

  <p
    data-reveal
    data-delay="2"
    className="mb-10 max-w-xl text-lg leading-relaxed text-gray-500 sm:text-xl"
  >
    {t("howToUse.hero.subtitle")}
  </p>

  <div
    data-reveal
    data-delay="3"
    className="flex flex-wrap justify-center gap-3"
  >
    {tags.map((tag) => (
      <span
        key={tag}
        className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-500"
      >
        {tag}
      </span>
    ))}
  </div>
</div>

          {/* Scroll cue */}
          <div className="relative z-10 flex animate-bounce flex-col items-center gap-2 pb-8 text-gray-400">
            <span className="font-['Montserrat'] text-[9px] uppercase tracking-widest">
              {t("howToUse.scroll")}
            </span>
            <IoChevronDown className="h-5 w-5" />
          </div>
        </section>

        {/* ═══════════════════════ SECTIONS ═══════════════════════ */}
        <div className="mx-auto max-w-4xl space-y-28 px-4 pb-32 pt-16 sm:px-6">

          {/* ── 01 · PHILOSOPHY ─────────────────────────────────── */}
          <section>
            <SectionLabel num="01" label={t("howToUse.s01.label")} />
            <h2
              data-reveal
              className="mb-10 text-4xl font-black leading-tight text-gray-900 sm:text-5xl"
            >
              {t("howToUse.s01.title")}
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <div
                data-reveal
                data-delay="1"
                className="rounded-2xl border border-green-200 bg-green-50 p-7"
              >
                <p className="mb-3 text-2xl">🎯</p>
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {t("howToUse.s01.card1.title")}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {t("howToUse.s01.card1.text")}
                </p>
              </div>

              <div
                data-reveal
                data-delay="2"
                className="rounded-2xl border border-gray-200 bg-white p-7"
              >
                <p className="mb-3 text-2xl">🚫</p>
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {t("howToUse.s01.card2.title")}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {t("howToUse.s01.card2.text")}
                </p>
              </div>

              <div
                data-reveal
                data-delay="3"
                className="rounded-2xl border border-gray-200 bg-white p-7 sm:col-span-2"
              >
                <p className="mb-3 text-2xl">✨</p>
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {t("howToUse.s01.card3.title")}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {t("howToUse.s01.card3.text")}
                </p>
              </div>
            </div>
          </section>

          {/* ── 02 · THE PLAYER ──────────────────────────────────── */}
          <section>
            <SectionLabel num="02" label={t("howToUse.s02.label")} />
            <h2
              data-reveal
              className="mb-10 text-4xl font-black leading-tight text-gray-900 sm:text-5xl"
            >
              {t("howToUse.s02.title")}
            </h2>

            {/* Free Play */}
            <div
              data-reveal
              data-delay="1"
              className="mb-5 rounded-2xl border border-gray-200 bg-white p-7"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
                  🎵
                </span>
                <div className="flex-1">
                  <h3 className="mb-1.5 text-lg font-bold text-gray-900">
                    {t("howToUse.s02.freePlay.title")}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-gray-600">
                    {t("howToUse.s02.freePlay.text")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">
                      {t("howToUse.s02.speedLabel")}
                    </span>
                    <SpeedBadges />
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Mode */}
            <div
              data-reveal
              data-delay="2"
              className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-7"
            >
              <div className="mb-6 flex items-start gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-100 text-xl">
                  ⚡
                </span>
                <div>
                  <h3 className="mb-1.5 text-lg font-bold text-green-700">
                    {t("howToUse.s02.enhanced.title")}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {t("howToUse.s02.enhanced.text")}
                  </p>
                </div>
              </div>

              {/* Repetition grid */}
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    {
                      key: "rep3",
                      label: t("howToUse.s02.enhanced.rep3"),
                      speeds: ["0.5×", "0.8×", "1.0×"],
                      accent: true,
                    },
                    {
                      key: "rep2",
                      label: t("howToUse.s02.enhanced.rep2"),
                      speeds: ["0.8×", "1.0×"],
                      accent: false,
                    },
                    {
                      key: "rep1",
                      label: t("howToUse.s02.enhanced.rep1"),
                      speeds: ["1.0×"],
                      accent: false,
                    },
                  ] as const
                ).map(({ key, label, speeds, accent }) => (
                  <div
                    key={key}
                    className={`rounded-xl p-4 ${
                      accent
                        ? "border border-green-300/60 bg-green-100"
                        : "border border-gray-200 bg-white"
                    }`}
                  >
                    <p
                      className={`mb-3 font-['Montserrat'] text-[10px] font-bold uppercase tracking-widest ${
                        accent ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {speeds.map((s) => (
                        <span
                          key={s}
                          className="rounded-lg bg-gray-100 px-3 py-1 font-mono text-sm font-bold text-gray-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Manual speed control */}
              <div className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="text-xs font-semibold text-gray-800">
                    🎚️ {t("howToUse.s02.enhanced.speedNote.label")}
                  </p>
                  <SpeedBadges />
                </div>
                <p className="text-xs leading-relaxed text-gray-500">
                  {t("howToUse.s02.enhanced.speedNote.text")}
                </p>
              </div>

              {/* Pause note */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs leading-relaxed text-gray-600">
                  <span className="font-semibold text-gray-800">
                    💡 {t("howToUse.s02.enhanced.pauseNote.label")}{" "}
                  </span>
                  {t("howToUse.s02.enhanced.pauseNote.text")}
                </p>
              </div>
            </div>

            {/* Player screenshot */}
            <div data-reveal data-delay="3">
              <PhotoPlaceholder
                label={t("howToUse.photos.player.label")}
                aspect="16/9"
                note="1280 × 720 px · PNG or WebP"
              />
            </div>
          </section>

          {/* ── 03 · VOCABULARY ──────────────────────────────────── */}
          <section>
            <SectionLabel num="03" label={t("howToUse.s03.label")} />
            <h2
              data-reveal
              className="mb-10 text-4xl font-black leading-tight text-gray-900 sm:text-5xl"
            >
              {t("howToUse.s03.titleLine1")}
              <br className="hidden sm:block" />
              {t("howToUse.s03.titleLine2")}
            </h2>

            {/* Two columns: text cards left, landscape screenshot right */}
            <div className="grid items-start gap-8 lg:grid-cols-2">
              <div className="space-y-5">
                <div
                  data-reveal
                  data-delay="1"
                  className="rounded-2xl border border-gray-200 bg-white p-7"
                >
                  <p className="mb-3 text-2xl">📚</p>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">
                    {t("howToUse.s03.card1.title")}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {t("howToUse.s03.card1.text")}
                  </p>
                </div>

                <div
                  data-reveal
                  data-delay="2"
                  className="rounded-2xl border border-gray-200 bg-white p-7"
                >
                  <p className="mb-3 text-2xl">🔊</p>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">
                    {t("howToUse.s03.card2.title")}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {t("howToUse.s03.card2.text")}
                  </p>
                </div>

                <div
                  data-reveal
                  data-delay="3"
                  className="rounded-2xl border border-green-200 bg-green-50 p-5"
                >
                  <p className="text-xs leading-relaxed text-gray-700">
                    <span className="font-semibold text-green-700">
                      {t("howToUse.s03.belief.label")}{" "}
                    </span>
                    {t("howToUse.s03.belief.text")}
                  </p>
                </div>
              </div>

              {/* Landscape screenshot — matches card column height on desktop */}
              <div data-reveal data-delay="4" className="lg:sticky lg:top-8">
                <PhotoPlaceholder
                  label={t("howToUse.photos.vocab.label")}
                  aspect="16/9"
                  note="1280 × 720 px · PNG or WebP"
                />
              </div>
            </div>
          </section>

          {/* ── 04 · ENGAGEMENT ──────────────────────────────────── */}
          <section>
            <SectionLabel num="04" label={t("howToUse.s04.label")} />
            <h2
              data-reveal
              className="mb-10 text-4xl font-black leading-tight text-gray-900 sm:text-5xl"
            >
              {t("howToUse.s04.title")}
            </h2>

            <div
              data-reveal
              data-delay="1"
              className="mb-8 rounded-2xl border border-gray-200 bg-white p-7"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
                  🏆
                </span>
                <div>
                  <h3 className="mb-1.5 text-lg font-bold text-gray-900">
                    {t("howToUse.s04.gamification.title")}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {t("howToUse.s04.gamification.text")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div data-reveal data-delay="2" className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-7">
                  <p className="mb-3 text-2xl">🎨</p>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">
                    {t("howToUse.s04.comics.title")}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {t("howToUse.s04.comics.text")}
                  </p>
                </div>
                <PhotoPlaceholder
                  label={t("howToUse.photos.comics.label")}
                  aspect="16/9"
                  note="1280 × 720 px · PNG or WebP"
                />
              </div>

              <div data-reveal data-delay="3" className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-7">
                  <p className="mb-3 text-2xl">❓</p>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">
                    {t("howToUse.s04.quiz.title")}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {t("howToUse.s04.quiz.text")}
                  </p>
                </div>
                <PhotoPlaceholder
                  label={t("howToUse.photos.quiz.label")}
                  aspect="16/9"
                  note="1280 × 720 px · PNG or WebP"
                />
              </div>
            </div>
          </section>

          {/* ── 05 · STORY DESIGN ──────────────────────────────────── */}
          <section>
            <SectionLabel num="05" label={t("howToUse.s05.label")} />
            <h2
              data-reveal
              className="mb-12 text-4xl font-black leading-tight text-gray-900 sm:text-5xl"
            >
              {t("howToUse.s05.title")}
            </h2>

            <div>
              {timelineItems.map(({ icon, title, text }, i) => (
                <div
                  key={title}
                  data-reveal
                  data-delay={String(i + 1)}
                  className="flex gap-5"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-2xl">
                      {icon}
                    </div>
                    {i < timelineItems.length - 1 && (
                      <div className="my-3 w-px flex-1 bg-green-200" />
                    )}
                  </div>
                  <div className={`flex-1 ${i < timelineItems.length - 1 ? "pb-8" : ""}`}>
                    <h3 className="mb-2 mt-2 text-lg font-bold text-gray-900">
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 py-12 text-center">
          <p className="font-['Montserrat'] text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
            {t("howToUse.footer")}
          </p>
        </div>
      </div>
    </>
  );
};

export default HowToUse;