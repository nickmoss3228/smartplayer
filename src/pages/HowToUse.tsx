import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoPause,
  IoPlay,
  IoChevronBack,
  IoChevronForward,
  IoVolumeHigh,
  IoVolumeMute,
} from "react-icons/io5";
import { MdReplay } from "react-icons/md";

// ─── Constants ──────────────────────────────────────────────────────────────
const PLAYBACK_RATES = [0.5, 0.75, 1];
const MARKER_POSITIONS = [0, 27, 54, 79]; // % along the bar
const SEGMENT_LABELS = ["Intro", "Part 1", "Part 2", "Part 3"];
const TOTAL_SECONDS = 180;

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;

// ─── Tiny local Toggle (mirrors your ToggleSwitch visually) ─────────────────
const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <div className="flex flex-col items-center gap-1">
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
        checked ? "bg-[#05df3bff]" : "bg-gray-400"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
    <span className="whitespace-nowrap font-['Montserrat'] text-[9px] font-semibold uppercase tracking-widest text-black/50">
      {label}
    </span>
  </div>
);

// ─── Collapsible section ─────────────────────────────────────────────────────
const Collapse: React.FC<{
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm">
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/10"
    >
      <span className="text-lg font-semibold text-white">{title}</span>
      <span
        className={`text-white/60 transition-transform duration-200 ${
          open ? "rotate-180" : ""
        }`}
      >
        ▾
      </span>
    </button>
    {open && (
      <div className="space-y-2 border-t border-white/10 px-6 pb-5 pt-4 text-sm leading-relaxed text-white/80">
        {children}
      </div>
    )}
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
const HowToUse: React.FC = () => {
  const navigate = useNavigate();

  // Demo player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [isStep, setIsStep] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0); // 0–100 %
  const [activeSeg, setActiveSeg] = useState(0);
  const [openSections, setOpenSections] = useState<number[]>([0]);

  // Derive active segment from progress
  useEffect(() => {
    const idx = [...MARKER_POSITIONS]
      .reverse()
      .findIndex((m) => progress >= m);
    if (idx !== -1) setActiveSeg(MARKER_POSITIONS.length - 1 - idx);
  }, [progress]);

  // Animate the fake progress bar
  useEffect(() => {
    if (!isPlaying) return;
    const TICK = 80; // ms
    const step = 0.35 * speed; // faster speed → bigger step

    const id = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        if (isStep) {
          const next = MARKER_POSITIONS.find((m) => m > prev);
          if (next !== undefined && prev + step >= next) {
            setIsPlaying(false);
            return next;
          }
        }
        return Math.min(100, prev + step);
      });
    }, TICK);

    return () => clearInterval(id);
  }, [isPlaying, isStep, speed]);

  const currentSec = Math.round((progress / 100) * TOTAL_SECONDS);
  const canPrev = activeSeg > 0;
  const canNext = activeSeg < MARKER_POSITIONS.length - 1;

  const jumpTo = (idx: number) => {
    setProgress(MARKER_POSITIONS[idx]);
    setActiveSeg(idx);
  };

  const toggleSection = (i: number) =>
    setOpenSections((prev) =>
      prev.includes(i) ? prev.filter((s) => s !== i) : [...prev, i]
    );

  const label =
    "whitespace-nowrap font-['Montserrat'] text-[9px] font-semibold uppercase tracking-widest text-black/50";
  const dimmed = !isEnhanced
    ? "pointer-events-none cursor-not-allowed select-none opacity-40"
    : "";

  // ── Shared button style factories ──
  const roundBtn = (active: boolean) =>
    `border-2 rounded-full w-10 h-10 flex items-center justify-center cursor-pointer
     text-xs font-medium font-['Montserrat'] transition-all duration-200 active:scale-95
     ${
       active
         ? "bg-[#05df3bff] text-black border-green-500"
         : "bg-black/90 text-white/90 border-[#ddd] hover:bg-[#05df3bff] hover:text-white hover:border-green-500"
     }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-red-400 to-blue-700 pb-20 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-10">

        {/* ── Back ── */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
        >
          <IoChevronBack className="h-4 w-4" />
          Back
        </button>

        {/* ── Header ── */}
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
            How to Use the Player
          </h1>
          <p className="mx-auto max-w-xl text-lg text-white/80">
            No audio needed — click every button to get familiar with the
            controls before your first lesson.
          </p>
        </div>

        {/* ════════════════════ INTERACTIVE DEMO ════════════════════ */}
        <div className="space-y-6 rounded-2xl border border-white/20 bg-white/15 p-6 backdrop-blur-sm sm:p-8">

          {/* Track info */}
          <div className="text-center">
            <p className="font-['Montserrat'] text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Interactive Demo · No audio
            </p>
            <h2 className="text-2xl font-bold text-white">
              Sample Listening Track
            </h2>
            <p className="mt-0.5 text-xs text-white/40">Level 1 – Beginner</p>
          </div>

          {/* ── Fake progress / waveform bar ── */}
          <div className="relative pb-7 pt-1">
            {/* Clickable bar */}
            <div
              className="relative h-8 w-full cursor-pointer overflow-visible rounded-lg bg-white/60 px-0.5"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setProgress(
                  Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))
                );
              }}
            >
              {/* Fill */}
              <div
                className="pointer-events-none absolute left-0 top-0 h-full rounded-l-lg bg-green-400/50 transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />

              {/* Segment markers */}
              {MARKER_POSITIONS.map((pos, i) => (
                <React.Fragment key={i}>
                  <div
                    className={`absolute top-0 z-10 h-full w-[3px] -translate-x-1/2 cursor-pointer transition-colors ${
                      activeSeg === i
                        ? "bg-green-500/90"
                        : "bg-black/25 hover:bg-black/50"
                    }`}
                    style={{ left: `${pos}%` }}
                    title={SEGMENT_LABELS[i]}
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpTo(i);
                    }}
                  />
                  {/* Label below bar */}
                  <span
                    className="pointer-events-none absolute top-9 -translate-x-1/2 whitespace-nowrap text-[9px] text-white/50"
                    style={{ left: `${pos}%` }}
                  >
                    {SEGMENT_LABELS[i]}
                  </span>
                </React.Fragment>
              ))}
            </div>

            {/* Timestamps */}
            <span className="absolute bottom-0 left-0 text-[10px] text-white/60">
              {fmt(currentSec)}
            </span>
            <span className="absolute bottom-0 right-0 text-[10px] text-white/60">
              {fmt(TOTAL_SECONDS)}
            </span>
          </div>

          {/* ── Controls card — exact desktop layout ── */}
          <div className="rounded-2xl bg-white/60 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4 w-full">

              {/* Repeat */}
              <div className={`flex flex-col items-center gap-1 ${dimmed}`}>
                <div className="flex items-center gap-2">
                  {[3, 2, 1].map((n) => (
                    <button
                      key={n}
                      className={roundBtn(repeatCount === n)}
                      onClick={() => setRepeatCount(n)}
                      title={`Repeat each segment ${n} time${n > 1 ? "s" : ""}`}
                    >
                      x{n}
                    </button>
                  ))}
                </div>
                <span className={label}>Repeat</span>
              </div>

              {/* Play + Step */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-3">
                  {/* Play / Pause */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      className="flex cursor-pointer items-center justify-center rounded-full border-none bg-black/90 p-2 text-white transition-all duration-200 hover:bg-black/50 active:scale-95"
                      onClick={() => setIsPlaying((p) => !p)}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <IoPause className="h-[50px] w-[50px] text-white" />
                      ) : (
                        <IoPlay className="h-[50px] w-[50px] text-white" />
                      )}
                    </button>
                    <span className={label}>{isPlaying ? "Pause" : "Play"}</span>
                  </div>

                  {/* Step */}
                  <div className={`flex flex-col items-center gap-1 ${dimmed}`}>
                    <button
                      className={`flex cursor-pointer items-center justify-center rounded-full border-2 p-2 transition-all duration-200 active:scale-95 ${
                        isStep
                          ? "border-green-500 bg-[#05df3bff] hover:bg-[#04c934]"
                          : "border-[#ddd] bg-black/90 hover:bg-black/50"
                      }`}
                      onClick={() => setIsStep((s) => !s)}
                      title={isStep ? "Step ON — pauses after each segment" : "Step OFF"}
                    >
                      <MdReplay className="h-[30px] w-[30px] text-white" />
                    </button>
                    <span className={label}>Step</span>
                  </div>
                </div>
              </div>

              {/* Speed */}
              <div className={`flex flex-col items-center gap-1 ${dimmed}`}>
                <div className="flex items-center gap-2">
                  {PLAYBACK_RATES.map((r) => (
                    <button
                      key={r}
                      className={roundBtn(speed === r)}
                      onClick={() => setSpeed(r)}
                    >
                      x{r}
                    </button>
                  ))}
                </div>
                <span className={label}>Speed</span>
              </div>

              {/* Enhanced toggle */}
              <div className="flex min-w-[80px] flex-col items-center gap-1">
                <Toggle
                  checked={isEnhanced}
                  onChange={() => setIsEnhanced((e) => !e)}
                  label={isEnhanced ? "Enhanced" : "Free Play"}
                />
              </div>
            </div>

            {/* Volume */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setIsMuted((m) => !m)}
                className="text-black/50 transition-colors hover:text-black"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <IoVolumeMute className="h-5 w-5" />
                ) : (
                  <IoVolumeHigh className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setIsMuted(false);
                }}
                className="w-28 accent-green-500"
              />
              <span className="w-8 text-right text-xs text-black/40">
                {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>

          {/* Segment Prev / Next */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => jumpTo(activeSeg - 1)}
              disabled={!canPrev}
              aria-label="Previous segment"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow transition hover:bg-white/30 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <IoChevronBack className="h-5 w-5" />
            </button>
            <span className="text-xs font-medium text-white/60">
              Segment {activeSeg + 1} / {MARKER_POSITIONS.length} —{" "}
              <span className="text-white">{SEGMENT_LABELS[activeSeg]}</span>
            </span>
            <button
              onClick={() => jumpTo(activeSeg + 1)}
              disabled={!canNext}
              aria-label="Next segment"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow transition hover:bg-white/30 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <IoChevronForward className="h-5 w-5" />
            </button>
          </div>

          {/* Live status badges */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Mode",
                value: isEnhanced ? "Enhanced" : "Free Play",
                active: isEnhanced,
              },
              { label: "Speed", value: `×${speed}`, active: isEnhanced },
              { label: "Repeat", value: `×${repeatCount}`, active: isEnhanced },
              {
                label: "Step",
                value: isStep ? "On ✓" : "Off",
                active: isStep && isEnhanced,
              },
            ].map(({ label: l, value, active }) => (
              <div key={l} className="rounded-xl bg-white/10 p-3 text-center">
                <p className="font-['Montserrat'] text-[9px] font-semibold uppercase tracking-widest text-white/40">
                  {l}
                </p>
                <p
                  className={`text-lg font-bold transition-colors duration-300 ${
                    active ? "text-green-400" : "text-white/25"
                  }`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Contextual nudge */}
          {!isEnhanced && (
            <p className="animate-pulse text-center text-sm text-white/50">
              💡 Toggle{" "}
              <strong className="text-white">Enhanced Mode</strong> to unlock
              Speed &amp; Repeat!
            </p>
          )}
          {isEnhanced && (
            <p className="text-center text-sm text-green-300">
              ✅ <strong>Enhanced Mode is ON</strong> — Speed and Repeat are
              now active. Try them!
            </p>
          )}
        </div>

        {/* ════════════════════ FEATURE GUIDE ════════════════════ */}
        <div className="space-y-3">
          <h2 className="mb-6 text-center text-2xl font-bold text-white">
            Feature Guide
          </h2>

          {[
            {
              title: "🔀 Enhanced Mode vs Free Play",
              body: (
                <>
                  <p>
                    <strong className="text-white">Enhanced Mode</strong> is the
                    core learning mode. Toggle it with the switch at the
                    bottom-right of the player.
                  </p>
                  <p>
                    When{" "}
                    <span className="font-semibold text-green-400">ON</span>,
                    the <strong className="text-white">Speed</strong> and{" "}
                    <strong className="text-white">Repeat</strong> controls
                    unlock, and the player pauses between segments so you can
                    absorb each chunk.
                  </p>
                  <p>
                    <strong className="text-white">Free Play</strong> lets the
                    audio run straight through — great for a relaxed first
                    listen or reviewing familiar tracks.
                  </p>
                </>
              ),
            },
            {
              title: "⏩ Playback Speed",
              body: (
                <>
                  <p>
                    Three speed presets unlock in Enhanced Mode:
                  </p>
                  <ul className="ml-3 list-inside list-disc space-y-1 text-white/70">
                    <li>
                      <strong className="text-white">×0.5</strong> — half
                      speed, great for dense or fast passages
                    </li>
                    <li>
                      <strong className="text-white">×0.75</strong> — a
                      comfortable learning pace
                    </li>
                    <li>
                      <strong className="text-white">×1</strong> — natural
                      speed
                    </li>
                  </ul>
                  <p>
                    The selected speed lights up in{" "}
                    <span className="font-semibold text-green-400">green</span>.
                  </p>
                </>
              ),
            },
            {
              title: "🔁 Repeat per Segment",
              body: (
                <>
                  <p>
                    The <strong className="text-white">Repeat</strong> buttons
                    control how many times each segment plays before the player
                    advances to the next one (Enhanced Mode required):
                  </p>
                  <ul className="ml-3 list-inside list-disc space-y-1 text-white/70">
                    <li>
                      <strong className="text-white">×1</strong> — plays once,
                      then moves on
                    </li>
                    <li>
                      <strong className="text-white">×2</strong> — natural
                      listen-then-repeat rhythm
                    </li>
                    <li>
                      <strong className="text-white">×3</strong> — drills hard
                      sentences until they sink in
                    </li>
                  </ul>
                </>
              ),
            },
            {
              title: "⏹ Step Mode",
              body: (
                <>
                  <p>
                    The <strong className="text-white">Step</strong> button
                    (the replay icon next to Play) pauses the audio
                    automatically at the end of every segment.
                  </p>
                  <p>
                    When{" "}
                    <span className="font-semibold text-green-400">green</span>
                    , Step is active. After each segment completes, press Play
                    again — or the{" "}
                    <strong className="text-white">→ Next</strong> arrow — to
                    continue. Perfect for shadowing or taking notes sentence by
                    sentence.
                  </p>
                </>
              ),
            },
            {
              title: "📍 Segment Markers",
              body: (
                <>
                  <p>
                    The vertical lines on the progress bar are{" "}
                    <strong className="text-white">segment markers</strong>{" "}
                    that divide the audio into meaningful chunks.
                  </p>
                  <p>
                    Click any marker to jump directly to that segment. Use the{" "}
                    <strong className="text-white">← / →</strong> arrows to
                    step through them, or click anywhere on the bar to seek
                    freely.
                  </p>
                </>
              ),
            },
            {
              title: "📝 The Quiz",
              body: (
                <>
                  <p>
                    After listening to the{" "}
                    <em>entire</em> audio track, a{" "}
                    <strong className="text-white">Take the Quiz →</strong>{" "}
                    button unlocks below the player.
                  </p>
                  <p>
                    You must listen all the way through at least once — no
                    skipping to the end! The quiz tests what you actually heard.
                  </p>
                </>
              ),
            },
          ].map((s, i) => (
            <Collapse
              key={i}
              title={s.title}
              open={openSections.includes(i)}
              onToggle={() => toggleSection(i)}
            >
              {s.body}
            </Collapse>
          ))}
        </div>

        {/* ── Quick-start ── */}
        <div className="rounded-2xl border border-white/20 bg-white/15 p-6 backdrop-blur-sm sm:p-8">
          <h3 className="mb-5 text-center text-xl font-bold text-white">
            ⚡ Quick-Start Guide
          </h3>
          <ol className="mx-auto max-w-lg space-y-3">
            {[
              ["Press Play", "to hear the track at normal speed first."],
              ["Toggle Enhanced Mode ON", "with the switch at the bottom-right."],
              ["Set Speed to ×0.75", "if the audio moves too fast for you."],
              ["Set Repeat to ×2 or ×3", "to drill a segment automatically."],
              ["Enable Step", "to pause and absorb each chunk before continuing."],
              ["Listen to the full track,", "then unlock and take the Quiz!"],
            ].map(([bold, rest], i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-green-400/30 bg-green-400/20 text-sm font-bold text-green-300">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm text-white/80">
                  <strong className="text-white">{bold}</strong> {rest}
                </p>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </div>
  );
};

export default HowToUse;